from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import PyPDF2
import openai
import pandas as pd
import json
import os
from dotenv import load_dotenv
import sqlite3
from datetime import datetime
import csv
from io import StringIO
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings

# Load environment variables
load_dotenv()

"""
Study Schedule Generator Backend API

This Flask application serves as the backend for the Study Schedule Generator tool.
It provides various API endpoints for PDF processing, quiz generation, and study schedule creation.

The application uses:
- Flask: Web framework for creating the API endpoints
- PyPDF2: For extracting text from PDF files
- OpenAI/SambaNova: For language model integration to analyze content
- SQLite: For database storage of user data and quiz results

Main functionalities:
1. PDF text extraction and analysis
2. Study schedule generation based on PDF content
3. Quiz generation from PDF content
4. User account management
5. Custom quiz creation and management
"""

# Database setup
def get_db_connection():
    """
    Creates and returns a connection to the SQLite database.
    
    The application uses SQLite to store user information, quiz attempts,
    and other persistent data without requiring a separate database server.
    
    Returns:
        sqlite3.Connection: A connection to the quizbot database with row factory 
                           set to sqlite3.Row for dictionary-like access to rows
    """
    conn = sqlite3.connect('quizbot.db')
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """
    Initializes the database by creating necessary tables if they don't exist.
    
    This function is called when the application starts to ensure all required
    database tables are available. It creates:
    - users: For storing basic user information
    - quiz_attempts: For tracking quiz scores and performance
    - user_notes: For storing user-created notes on specific questions
    - custom_quizzes: For storing user-created custom quiz content
    
    No parameters or return values.
    """
    conn = get_db_connection()
    conn.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    
    conn.execute('''
    CREATE TABLE IF NOT EXISTS quiz_attempts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        score INTEGER NOT NULL,
        total_questions INTEGER NOT NULL,
        quiz_topic TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        time_taken INTEGER,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )
    ''')
    
    conn.execute('''
    CREATE TABLE IF NOT EXISTS user_notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        note_content TEXT NOT NULL,
        quiz_id INTEGER,
        question_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (quiz_id) REFERENCES quiz_attempts (id)
    )
    ''')
    
    conn.execute('''
    CREATE TABLE IF NOT EXISTS custom_quizzes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        questions TEXT NOT NULL,  -- JSON format
        is_public BOOLEAN DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )
    ''')
    
    conn.commit()
    conn.close()

# Initialize the database
init_db()

app = Flask(__name__)
CORS(app)
embeddings = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2",
    model_kwargs={"token": os.getenv("HUGGINGFACE_TOKEN")}
)

def extract_text_from_pdf(pdf_file):
    """
    Extracts text content from a PDF file for analysis.
    
    This is a core function that processes uploaded PDF files and
    extracts their text content for further processing by LLMs.
    
    Args:
        pdf_file: The uploaded PDF file object
        
    Returns:
        str: The extracted text content from all pages of the PDF
    """
    pdf_reader = PyPDF2.PdfReader(pdf_file)
    text = ""
    for page in pdf_reader.pages:
        text += page.extract_text()
    return text

def llm_func(query, context, model="Meta-Llama-3.1-8B-Instruct"):
    """
    Uses a large language model to answer questions based on provided text.
    
    This function sends the user's question along with relevant context to
    the Llama model via SambaNova's API and returns its response.
    
    Args:
        query (str): The user's question to answer
        context (str): The relevant text extracted from the PDF
        model (str): The specific language model to use
        
    Returns:
        str: The AI-generated answer to the question based on the context
    """
    client = openai.OpenAI(
        api_key=os.getenv("SAMBANOVA_API_KEY"),
        base_url="https://api.sambanova.ai/v1",
    )
    
    prompt = f"""
    Answer the following question based on the provided context. If the answer cannot be found in the context, say "I cannot find the answer in the provided text."
    
    Context: {context}
    
    Question: {query}
    """
    
    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": "You are a helpful assistant that answers questions based on provided context."},
            {"role": "user", "content": prompt}
        ],
        max_tokens=500,
        temperature=0.5,
        top_p=0.1
    )
    
    return response.choices[0].message.content

def llm_func1(query, text, num_questions, difficulty=None):
    """
    Generates a quiz with multiple-choice questions from input text.
    
    Args:
        query (str): The initial prompt for quiz generation
        text (str): The text content to generate questions from
        num_questions (int): Number of questions to generate
        difficulty (str, optional): Difficulty level - 'easy', 'medium', or 'difficult'
        
    Returns:
        str: Generated quiz content with questions, options, answers, and explanations
    """
    client = openai.OpenAI(
        api_key=os.getenv("SAMBANOVA_API_KEY"),
        base_url="https://api.sambanova.ai/v1",
    )
    
    difficulty_prompt = ""
    if difficulty:
        difficulty_prompt = f"Make sure the questions are at {difficulty} difficulty level."
    
    prompt = f"{query}\n\n{text}\n\n{difficulty_prompt}\nPlease generate {num_questions} questions."
    
    response = client.chat.completions.create(
        model="Meta-Llama-3.1-8B-Instruct",
        messages=[
            {"role": "system", "content": """
                You are a helpful assistant who generates quizzes from input text.
                Ensure questions, options, and answers are accurate, unique, and formatted as requested.
                Format the output like this example:
                
                1. Question: What is the capital of France?
                   Options:
                   A) Berlin
                   B) Madrid
                   C) Paris
                   D) Rome
                   Correct Answer: C) Paris
                   Explanation: Paris is the capital and largest city of France.
            """},
            {"role": "user", "content": prompt}
        ],
        max_tokens=1500,
        temperature=0.1,
        top_p=0.1
    )
    
    return response.choices[0].message.content

def create_faiss_index(text):
    """
    Creates a FAISS vector index from text for similarity search.
    
    Args:
        text (str): The text to create the index from
        
    Returns:
        FAISS: A FAISS index for semantic search
    """
    # Split text into chunks
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    texts = text_splitter.split_text(text)
    
    # Create FAISS index
    faiss_index = FAISS.from_texts(texts, embeddings)
    return faiss_index

def generate_study_schedule(total_lessons, hours_per_day, study_days):
    """
    Generates a study schedule based on lessons, hours, and days available.
    
    Args:
        total_lessons (int): Total number of lessons to study
        hours_per_day (float): Available hours per day
        study_days (int): Number of days available for study
        
    Returns:
        list: A list of dictionaries containing the study schedule
    """
    lessons_per_day = total_lessons // study_days
    extra_lessons = total_lessons % study_days
    schedule = []

    for day in range(1, study_days + 1):
        lessons_today = lessons_per_day + (1 if day <= extra_lessons else 0)
        schedule.append({
            "Day": f"Day {day}",
            "Lessons to study": lessons_today,
            "Time (hours)": round(hours_per_day * lessons_today / (lessons_per_day + 1e-9), 2),
        })
    return schedule

def generate_pdf_summary(text):
    """
    Generates a concise summary of the provided text using LLM.
    
    Args:
        text (str): The text to summarize
        
    Returns:
        str: A concise summary of the text
    """
    client = openai.OpenAI(
        api_key=os.getenv("SAMBANOVA_API_KEY"),
        base_url="https://api.sambanova.ai/v1",
    )
    
    response = client.chat.completions.create(
        model="Meta-Llama-3.1-8B-Instruct",
        messages=[
            {"role": "system", "content": "Generate a concise summary of the following text."},
            {"role": "user", "content": text}
        ],
        max_tokens=300,
        temperature=0.3
    )
    return response.choices[0].message.content

def create_flashcards(text):
    """
    Creates a set of flashcards from the provided text.
    
    Args:
        text (str): The text to create flashcards from
        
    Returns:
        str: Generated flashcards with questions and answers
    """
    client = openai.OpenAI(
        api_key=os.getenv("SAMBANOVA_API_KEY"),
        base_url="https://api.sambanova.ai/v1",
    )
    
    response = client.chat.completions.create(
        model="Meta-Llama-3.1-8B-Instruct",
        messages=[
            {"role": "system", "content": "Create flashcards with question on front and answer on back."},
            {"role": "user", "content": f"Create 5 flashcards from: {text}"}
        ],
        max_tokens=500,
        temperature=0.3
    )
    return response.choices[0].message.content

def generate_study_schedule_from_pdf(pdf_text, duration_days, hours_per_day):
    """
    Generates a personalized study schedule based on PDF content using AI.
    
    This is the core function for the study planner feature. It analyzes 
    the PDF content using the Llama model and creates a day-by-day study
    plan tailored to the user's available time.
    
    Process:
    1. Sends the PDF text to the Llama model with specific instructions
    2. Parses the model's response into a structured schedule format
    3. Provides a fallback schedule if the model fails
    
    Args:
        pdf_text (str): The text content extracted from the PDF
        duration_days (int): Number of days the user plans to study
        hours_per_day (float): Hours available per day for studying
        
    Returns:
        list: A list of dictionaries, each containing a daily study plan with:
              - day: The day number
              - topics: Topics to study that day
              - activities: Suggested learning activities
              - duration: Time allocation for that day
    """
    try:
        # Initialize the AI client to connect to SambaNova's API
        client = openai.OpenAI(
            api_key=os.getenv("SAMBANOVA_API_KEY"),
            base_url="https://api.sambanova.ai/v1",
        )
        
        # Prepare a detailed prompt for the AI model
        # This tells the model exactly what kind of schedule we want
        prompt = f"""
        Create a {duration_days}-day study schedule for the following content, with approximately {hours_per_day} hours of study per day.
        The schedule should:
        1. Break down the content logically across the days
        2. Include specific topics to cover each day
        3. Suggest learning activities (reading, note-taking, practice problems, etc.)
        4. Specify approximate duration for each day's study

        Format each day of the schedule as:
        Day 1:
        - Topics: [list main topics/concepts to study]
        - Activities: [list specific learning activities]
        - Duration: [specify time duration]

        Continue this format for all days. Be specific about the content from the PDF.

        Content to schedule:
        {pdf_text[:8000]}  # Limit content to avoid token limits
        """
        
        try:
            # Send the prompt to the AI model and get its response
            response = client.chat.completions.create(
                model="Meta-Llama-3.1-8B-Instruct",
                messages=[
                    {"role": "system", "content": "You are an expert study planner who creates effective learning schedules tailored to content and time constraints."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=3000,
                temperature=0.7  # Controls creativity/randomness of output
            )
            
            # Extract the text from the model's response
            schedule_text = response.choices[0].message.content
            print("LLM Response received, length:", len(schedule_text))
        except Exception as e:
            # If the API call fails, use a fallback schedule
            print(f"Error in LLM API call: {str(e)}")
            return generate_fallback_schedule(duration_days, hours_per_day)
        
        # Parse the AI's response into a structured format
        schedule = []
        current_day = {}
        
        # Process the response line by line
        for line in schedule_text.split('\n'):
            line = line.strip()
            if not line:
                continue
                
            # Start a new day when we see "Day X:"
            if line.startswith('Day '):
                # Save the previous day if it exists
                if current_day and 'topics' in current_day:
                    schedule.append(current_day)
                # Start a new day entry
                current_day = {'day': line.split(':')[0].strip()}
            # Extract topics, activities, and duration information
            elif line.startswith('- Topics:') or line.startswith('Topics:') and current_day:
                current_day['topics'] = line.replace('- Topics:', '').replace('Topics:', '').strip()
            elif line.startswith('- Activities:') or line.startswith('Activities:') and current_day:
                current_day['activities'] = line.replace('- Activities:', '').replace('Activities:', '').strip()
            elif line.startswith('- Duration:') or line.startswith('Duration:') and current_day:
                current_day['duration'] = line.replace('- Duration:', '').replace('Duration:', '').strip()
        
        # Don't forget to add the last day
        if current_day and 'topics' in current_day:
            schedule.append(current_day)
        
        # If we couldn't parse a valid schedule, use the fallback
        if not schedule:
            print("Failed to parse schedule from LLM response")
            return generate_fallback_schedule(duration_days, hours_per_day)
            
        return schedule
    except Exception as e:
        # Catch any other errors and use the fallback
        print(f"Error in generate_study_schedule_from_pdf: {str(e)}")
        return generate_fallback_schedule(duration_days, hours_per_day)

def generate_fallback_schedule(duration_days, hours_per_day):
    """
    Creates a simple generic study schedule when the AI-based generation fails.
    
    This function ensures users always get a study schedule, even if there are
    problems with the AI model or the PDF processing.
    
    Args:
        duration_days (int): Number of days available for studying
        hours_per_day (float): Hours available per day for studying
        
    Returns:
        list: A list of dictionaries with a basic study schedule
    """
    # Create a simple day-by-day schedule
    schedule = []
    for i in range(1, duration_days + 1):
        schedule.append({
            'day': f'Day {i}',
            'topics': f'Study session {i}: Review PDF materials',
            'activities': 'Read chapters, take notes, review key concepts',
            'duration': f'{hours_per_day} hours'
        })
    return schedule

@app.route('/api/upload-pdf', methods=['POST'])
def upload_pdf():
    """
    Endpoint to upload a PDF and generate a quiz from it.
    
    Request form data:
        file: The PDF file
        num_questions (int): Number of questions to generate
        user_id (optional): ID of the current user
        adaptive (optional): Whether to adapt difficulty based on user performance
        
    Returns:
        JSON: Quiz data with questions, options, answers, and explanations
    """
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    num_questions = int(request.form.get('num_questions', 5))
    user_id = request.form.get('user_id')
    adaptive = request.form.get('adaptive', 'false').lower() == 'true'
    
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    try:
        text = extract_text_from_pdf(file)
        
        # Determine difficulty based on user's past performance if adaptive is enabled
        difficulty = None
        if adaptive and user_id:
            try:
                conn = get_db_connection()
                cursor = conn.cursor()
                
                # Get average score from past quizzes
                cursor.execute('''
                SELECT AVG(score * 100.0 / total_questions) as avg_score
                FROM quiz_attempts
                WHERE user_id = ?
                ORDER BY created_at DESC
                LIMIT 5
                ''', (user_id,))
                
                result = cursor.fetchone()
                if result and result['avg_score'] is not None:
                    avg_score = result['avg_score']
                    
                    # Adjust difficulty based on performance
                    if avg_score > 80:
                        difficulty = 'difficult'
                    elif avg_score < 50:
                        difficulty = 'easy'
                    else:
                        difficulty = 'medium'
                
                conn.close()
            except Exception as e:
                # If there's an error determining difficulty, proceed without adaptation
                print(f"Error determining difficulty: {str(e)}")
        
        quiz_query = "Generate a quiz from the following text."
        quiz_response = llm_func1(quiz_query, text, num_questions=num_questions, difficulty=difficulty)
        
        quiz_data = []
        current_question = {}
        
        for line in quiz_response.split('\n'):
            line = line.strip()
            if not line:
                continue
                
            if line.startswith(('1.', '2.', '3.', '4.', '5.', '6.', '7.', '8.', '9.', '10.')) and 'Question:' in line:
                if current_question and 'question' in current_question:
                    quiz_data.append(current_question)
                current_question = {'question': line.split('Question:')[1].strip(), 'options': [], 'explanation': ''}
            elif line.startswith(('A)', 'B)', 'C)', 'D)', 'E)')) and current_question:
                current_question['options'].append(line.strip())
            elif line.startswith('Correct Answer:') and current_question:
                current_question['answer'] = line.replace('Correct Answer:', '').strip()
            elif line.startswith('Explanation:') and current_question:
                current_question['explanation'] = line.replace('Explanation:', '').strip()
        
        # Add the last question
        if current_question and 'question' in current_question:
            quiz_data.append(current_question)
        
        return jsonify({
            'quiz': quiz_data,
            'difficulty': difficulty,
            'adaptive': adaptive
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/ask-pdf', methods=['POST'])
def ask_pdf():
    """
    Endpoint to ask questions about a PDF document.
    
    Request form data:
        file: The PDF file
        question (str): The question to ask about the document
        
    Returns:
        JSON: The answer to the question based on the PDF content
    """
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    question = request.form.get('question')
    
    if not question:
        return jsonify({'error': 'No question provided'}), 400
    
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    try:
        # Extract text from PDF
        text = extract_text_from_pdf(file)
        
        # Create FAISS index
        faiss_index = create_faiss_index(text)
        
        # Perform similarity search
        docs = faiss_index.similarity_search(question, k=3)
        context = "\n".join([doc.page_content for doc in docs])
        
        # Use LLM to get answer
        answer = llm_func(question, context)
        return jsonify({'answer': answer})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/generate-schedule', methods=['POST'])
def generate_schedule():
    """
    Endpoint to generate a study schedule.
    
    Request JSON:
        total_lessons (int): Total number of lessons to study
        hours_per_day (float): Available hours per day
        study_days (int): Number of days available for study
        
    Returns:
        JSON: A list of dictionaries containing the study schedule
    """
    data = request.json
    total_lessons = data.get('total_lessons', 10)
    hours_per_day = data.get('hours_per_day', 2.0)
    study_days = data.get('study_days', 5)
    
    try:
        schedule = []
        lessons_per_day = total_lessons // study_days
        extra_lessons = total_lessons % study_days
        
        for day in range(1, study_days + 1):
            lessons_today = lessons_per_day + (1 if day <= extra_lessons else 0)
            schedule.append({
                "day": f"Day {day}",
                "lessons": lessons_today,
                "hours": round(hours_per_day * lessons_today / (lessons_per_day + 1e-9), 2)
            })
        
        return jsonify({'schedule': schedule})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/summary', methods=['POST'])
def get_summary():
    """
    Endpoint to generate a summary of a PDF document.
    
    Request form data:
        file: The PDF file
        
    Returns:
        JSON: A summary of the PDF content
    """
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    text = extract_text_from_pdf(file)
    summary = generate_pdf_summary(text)
    return jsonify({'summary': summary})

@app.route('/api/flashcards', methods=['POST'])
def get_flashcards():
    """
    Endpoint to generate flashcards from a PDF document.
    
    Request form data:
        file: The PDF file
        
    Returns:
        JSON: Generated flashcards from the PDF content
    """
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    text = extract_text_from_pdf(file)
    flashcards = create_flashcards(text)
    return jsonify({'flashcards': flashcards})

@app.route('/api/export-results', methods=['POST'])
def export_results():
    """
    Endpoint to export quiz results as CSV.
    
    Request JSON:
        results (list): List of question-answer pairs
        
    Returns:
        JSON: CSV content as a string
    """
    data = request.json
    results = data.get('results', [])
    
    if not results:
        return jsonify({'error': 'No results provided'}), 400
    
    try:
        csv_file = StringIO()
        writer = csv.writer(csv_file)
        writer.writerow(['Question', 'Your Answer', 'Correct Answer', 'Result'])
        
        for result in results:
            # Get answers and normalize them for comparison
            user_answer = result.get('userAnswer', '').strip() if result.get('userAnswer') else ''
            correct_answer = result.get('correctAnswer', '').strip() if result.get('correctAnswer') else ''
            
            # Check if the answer is correct using the same logic as the frontend
            is_correct = (user_answer == correct_answer or
                         user_answer == correct_answer[0:3] or
                         user_answer == correct_answer[0] or
                         (correct_answer and user_answer and correct_answer.find(user_answer) >= 0 and len(user_answer) > 3))
            
            writer.writerow([
                result.get('question', ''),
                result.get('userAnswer', ''),
                result.get('correctAnswer', ''),
                'Correct' if is_correct else 'Incorrect'
            ])
        
        csv_content = csv_file.getvalue()
        return jsonify({'csv': csv_content})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/save-notes', methods=['POST'])
def save_user_notes():
    """
    Endpoint to save user notes for a quiz question.
    
    Request JSON:
        user_id (int): User identifier
        notes (str): Note content
        quiz_id (optional): Quiz identifier
        question_id (optional): Question identifier
        
    Returns:
        JSON: Success status and note ID
    """
    data = request.json
    user_id = data.get('user_id')
    note_content = data.get('notes')
    quiz_id = data.get('quiz_id')
    question_id = data.get('question_id')
    
    if not all([user_id, note_content]):
        return jsonify({'error': 'Missing required fields'}), 400
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
        INSERT INTO user_notes (user_id, note_content, quiz_id, question_id)
        VALUES (?, ?, ?, ?)
        ''', (user_id, note_content, quiz_id, question_id))
        
        conn.commit()
        note_id = cursor.lastrowid
        
        conn.close()
        return jsonify({'success': True, 'note_id': note_id})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/user/register', methods=['POST'])
def register_user():
    """
    Endpoint to register a new user.
    
    Request JSON:
        username (str): Username for the new user
        
    Returns:
        JSON: Success status, user ID, and username
    """
    data = request.json
    username = data.get('username')
    
    if not username:
        return jsonify({'error': 'Username is required'}), 400
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if user exists
        cursor.execute('SELECT id FROM users WHERE username = ?', (username,))
        if cursor.fetchone():
            return jsonify({'error': 'Username already exists'}), 409
        
        # Create new user
        cursor.execute('INSERT INTO users (username) VALUES (?)', (username,))
        conn.commit()
        user_id = cursor.lastrowid
        
        conn.close()
        return jsonify({'success': True, 'user_id': user_id, 'username': username})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/user/login', methods=['POST'])
def login_user():
    """
    Endpoint to login a user or auto-register if the user doesn't exist.
    
    Request JSON:
        username (str): Username to log in with
        
    Returns:
        JSON: Success status, user ID, and username
    """
    data = request.json
    username = data.get('username')
    
    if not username:
        return jsonify({'error': 'Username is required'}), 400
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Find user
        cursor.execute('SELECT id FROM users WHERE username = ?', (username,))
        user = cursor.fetchone()
        
        if not user:
            # Auto-register if user doesn't exist
            cursor.execute('INSERT INTO users (username) VALUES (?)', (username,))
            conn.commit()
            user_id = cursor.lastrowid
        else:
            user_id = user['id']
        
        conn.close()
        return jsonify({'success': True, 'user_id': user_id, 'username': username})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/quiz/submit', methods=['POST'])
def submit_quiz():
    """
    Endpoint to submit a completed quiz and save results.
    
    Request JSON:
        user_id (int): User identifier
        score (int): Number of correct answers
        total_questions (int): Total number of questions
        quiz_topic (str, optional): Topic of the quiz
        time_taken (int, optional): Time taken to complete the quiz in seconds
        
    Returns:
        JSON: Success status, attempt ID, and performance metrics
    """
    data = request.json
    user_id = data.get('user_id')
    score = data.get('score')
    total_questions = data.get('total_questions')
    quiz_topic = data.get('quiz_topic', 'General')
    time_taken = data.get('time_taken')  # In seconds
    
    if not all([user_id, score is not None, total_questions]):
        return jsonify({'error': 'Missing required fields'}), 400
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
        INSERT INTO quiz_attempts (user_id, score, total_questions, quiz_topic, time_taken)
        VALUES (?, ?, ?, ?, ?)
        ''', (user_id, score, total_questions, quiz_topic, time_taken))
        
        conn.commit()
        attempt_id = cursor.lastrowid
        
        conn.close()
        return jsonify({
            'success': True, 
            'attempt_id': attempt_id,
            'performance': {'score': score, 'total': total_questions, 'percentage': (score/total_questions)*100}
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/quiz/history', methods=['GET'])
def get_quiz_history():
    """
    Endpoint to retrieve a user's quiz history.
    
    Request query parameters:
        user_id (int): User identifier
        
    Returns:
        JSON: List of quiz attempts with scores and other details
    """
    user_id = request.args.get('user_id')
    
    if not user_id:
        return jsonify({'error': 'User ID is required'}), 400
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
        SELECT id, score, total_questions, quiz_topic, created_at, time_taken
        FROM quiz_attempts
        WHERE user_id = ?
        ORDER BY created_at DESC
        ''', (user_id,))
        
        attempts = []
        for row in cursor.fetchall():
            attempts.append({
                'id': row['id'],
                'score': row['score'],
                'total_questions': row['total_questions'],
                'percentage': (row['score'] / row['total_questions']) * 100,
                'quiz_topic': row['quiz_topic'],
                'created_at': row['created_at'],
                'time_taken': row['time_taken']
            })
        
        conn.close()
        return jsonify({'success': True, 'history': attempts})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/quiz/performance', methods=['GET'])
def get_performance_metrics():
    """
    Endpoint to get performance metrics for a user.
    
    Request query parameters:
        user_id (int): User identifier
        
    Returns:
        JSON: Performance metrics including overall stats, topic breakdown, and trend data
    """
    user_id = request.args.get('user_id')
    
    if not user_id:
        return jsonify({'error': 'User ID is required'}), 400
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get overall statistics
        cursor.execute('''
        SELECT 
            COUNT(*) as total_quizzes,
            AVG(score * 100.0 / total_questions) as avg_score,
            SUM(score) as total_correct,
            SUM(total_questions) as total_questions
        FROM quiz_attempts
        WHERE user_id = ?
        ''', (user_id,))
        
        overall = cursor.fetchone()
        
        # Get topic-wise performance
        cursor.execute('''
        SELECT 
            quiz_topic,
            COUNT(*) as attempts,
            AVG(score * 100.0 / total_questions) as avg_score
        FROM quiz_attempts
        WHERE user_id = ? AND quiz_topic IS NOT NULL
        GROUP BY quiz_topic
        ORDER BY avg_score DESC
        ''', (user_id,))
        
        topics = []
        for row in cursor.fetchall():
            topics.append({
                'topic': row['quiz_topic'],
                'attempts': row['attempts'],
                'avg_score': row['avg_score']
            })
        
        # Get recent performance trend
        cursor.execute('''
        SELECT 
            created_at,
            score * 100.0 / total_questions as percentage
        FROM quiz_attempts
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 10
        ''', (user_id,))
        
        trend = []
        for row in cursor.fetchall():
            trend.append({
                'date': row['created_at'],
                'percentage': row['percentage']
            })
        
        conn.close()
        
        return jsonify({
            'success': True,
            'overall': {
                'total_quizzes': overall['total_quizzes'],
                'avg_score': overall['avg_score'],
                'total_correct': overall['total_correct'],
                'total_questions': overall['total_questions']
            },
            'topics': topics,
            'trend': trend
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/custom-quiz/create', methods=['POST'])
def create_custom_quiz():
    """
    Endpoint to create a custom quiz.
    
    Request JSON:
        user_id (int): User identifier
        title (str): Quiz title
        description (str, optional): Quiz description
        questions (list): List of question objects with options, answers, and explanations
        is_public (bool, optional): Whether the quiz should be publicly accessible
        
    Returns:
        JSON: Success status and quiz ID
    """
    data = request.json
    user_id = data.get('user_id')
    title = data.get('title')
    description = data.get('description', '')
    questions = data.get('questions')
    is_public = data.get('is_public', False)
    
    if not all([user_id, title, questions]):
        return jsonify({'error': 'Missing required fields'}), 400
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
        INSERT INTO custom_quizzes (user_id, title, description, questions, is_public)
        VALUES (?, ?, ?, ?, ?)
        ''', (user_id, title, description, json.dumps(questions), is_public))
        
        conn.commit()
        quiz_id = cursor.lastrowid
        
        conn.close()
        return jsonify({'success': True, 'quiz_id': quiz_id})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/custom-quiz/list', methods=['GET'])
def list_custom_quizzes():
    """
    Endpoint to list available custom quizzes.
    
    Request query parameters:
        user_id (int, optional): User identifier to filter quizzes
        include_public (bool, optional): Whether to include public quizzes
        
    Returns:
        JSON: List of custom quizzes
    """
    user_id = request.args.get('user_id')
    include_public = request.args.get('include_public', 'true').lower() == 'true'
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        if user_id and include_public:
            cursor.execute('''
            SELECT id, user_id, title, description, created_at, is_public
            FROM custom_quizzes
            WHERE user_id = ? OR is_public = 1
            ORDER BY created_at DESC
            ''', (user_id,))
        elif user_id:
            cursor.execute('''
            SELECT id, user_id, title, description, created_at, is_public
            FROM custom_quizzes
            WHERE user_id = ?
            ORDER BY created_at DESC
            ''', (user_id,))
        else:
            cursor.execute('''
            SELECT id, user_id, title, description, created_at, is_public
            FROM custom_quizzes
            WHERE is_public = 1
            ORDER BY created_at DESC
            ''')
        
        quizzes = []
        for row in cursor.fetchall():
            quizzes.append({
                'id': row['id'],
                'user_id': row['user_id'],
                'title': row['title'],
                'description': row['description'],
                'created_at': row['created_at'],
                'is_public': bool(row['is_public'])
            })
        
        conn.close()
        return jsonify({'success': True, 'quizzes': quizzes})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/custom-quiz/<int:quiz_id>', methods=['GET'])
def get_custom_quiz(quiz_id):
    """
    Endpoint to get a specific custom quiz by ID.
    
    Path parameters:
        quiz_id (int): Quiz identifier
        
    Returns:
        JSON: Quiz details including questions, options, and answers
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
        SELECT id, user_id, title, description, questions, is_public
        FROM custom_quizzes
        WHERE id = ?
        ''', (quiz_id,))
        
        quiz = cursor.fetchone()
        
        if not quiz:
            return jsonify({'error': 'Quiz not found'}), 404
        
        conn.close()
        
        return jsonify({
            'success': True,
            'quiz': {
                'id': quiz['id'],
                'user_id': quiz['user_id'],
                'title': quiz['title'],
                'description': quiz['description'],
                'questions': json.loads(quiz['questions']),
                'is_public': bool(quiz['is_public'])
            }
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/custom-quizzes/user/<int:user_id>', methods=['GET'])
def get_user_custom_quizzes(user_id):
    """
    Get all custom quizzes created by a specific user
    
    Args:
        user_id (int): ID of the user
        
    Returns:
        JSON: List of custom quizzes
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get all quizzes created by the user
        cursor.execute(
            "SELECT * FROM custom_quizzes WHERE user_id = ? ORDER BY created_at DESC",
            (user_id,)
        )
        
        quizzes = cursor.fetchall()
        
        # Format the response
        result = []
        for quiz in quizzes:
            result.append({
                'id': quiz['id'],
                'title': quiz['title'],
                'description': quiz['description'],
                'questions': json.loads(quiz['questions']),
                'is_public': bool(quiz['is_public']),
                'createdAt': quiz['created_at']
            })
            
        conn.close()
        return jsonify(result)
    
    except Exception as e:
        print(f"Error getting user custom quizzes: {str(e)}")
        return jsonify({'error': 'Failed to get user quizzes'}), 500

@app.route('/api/custom-quizzes/<int:quiz_id>', methods=['DELETE'])
def delete_custom_quiz(quiz_id):
    """
    Delete a custom quiz by ID
    
    Args:
        quiz_id (int): ID of the quiz to delete
        
    Returns:
        JSON: Success message
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if quiz exists
        cursor.execute("SELECT * FROM custom_quizzes WHERE id = ?", (quiz_id,))
        quiz = cursor.fetchone()
        
        if not quiz:
            conn.close()
            return jsonify({'error': 'Quiz not found'}), 404
        
        # Delete the quiz
        cursor.execute("DELETE FROM custom_quizzes WHERE id = ?", (quiz_id,))
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': 'Quiz deleted successfully'})
    
    except Exception as e:
        print(f"Error deleting custom quiz: {str(e)}")
        return jsonify({'error': 'Failed to delete quiz'}), 500

@app.route('/api/generate-study-schedule', methods=['POST'])
def generate_schedule_endpoint():
    """
    API endpoint that handles study schedule generation requests.
    
    This function:
    1. Receives the uploaded PDF and schedule parameters from the frontend
    2. Validates the input data
    3. Extracts text from the PDF
    4. Generates a study schedule using the AI model
    5. Returns the schedule as JSON to the frontend
    
    Request form data:
        file: The uploaded PDF file
        duration_days (int): Number of days available for studying (default: 14)
        hours_per_day (float): Hours available per day (default: 2.0)
        
    Returns:
        JSON: The generated study schedule with daily topics, activities, and durations
              along with metadata about the request
    """
    # Check if a file was uploaded
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    
    # Validate the schedule parameters
    try:
        duration_days = int(request.form.get('duration_days', 14))
        hours_per_day = float(request.form.get('hours_per_day', 2))
    except ValueError as e:
        print(f"Invalid parameters: {str(e)}")
        return jsonify({'error': 'Invalid parameters. Please provide valid numbers for duration and hours.'}), 400
    
    # Verify that a file was actually selected
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    try:
        # Log the request details for debugging
        print(f"Processing file: {file.filename} for {duration_days} days, {hours_per_day} hours per day")
        
        # Extract text from the PDF
        pdf_text = extract_text_from_pdf(file)
        
        # Check if we successfully extracted text
        if not pdf_text.strip():
            return jsonify({'error': 'Could not extract text from the PDF file'}), 400
            
        # Generate the study schedule
        print(f"Extracted {len(pdf_text)} characters from PDF. Generating schedule...")
        schedule = generate_study_schedule_from_pdf(pdf_text, duration_days, hours_per_day)
        
        # Log success and return the schedule
        print(f"Schedule generated with {len(schedule)} days")
        return jsonify({
            'schedule': schedule,
            'file_name': file.filename,
            'duration_days': duration_days,
            'hours_per_day': hours_per_day
        })
    except Exception as e:
        # Handle any errors that occur during processing
        print(f"Error in generate_schedule_endpoint: {str(e)}")
        return jsonify({'error': f'An error occurred: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
