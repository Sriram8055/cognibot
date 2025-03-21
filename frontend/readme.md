
# How to Clone and Run the Cognibot Project

## Cloning the Repository
1. Open a terminal/command prompt
2. Clone the repository:
   ```
   git clone https://github.com/Sriram8055/cognibot.git
   ```
3. Navigate to the project directory:
   ```
   cd cognibot
   ```

## Setting Up and Running the Backend

1. Create a Python virtual environment:
   ```
   python -m venv venv
   ```

2. Activate the virtual environment:
   - Windows:
     ```
     venv\Scripts\activate
     ```
   - MacOS/Linux:
     ```
     source venv/bin/activate
     ```

3. Install backend dependencies:
   ```
   pip install -r requirements.txt
   ```

4. Create a `.env` file in the backend directory with necessary environment variables (similar to the existing one)

5. Navigate to the backend directory:
   ```
   cd backend
   ```

6. Run the Flask application:
   ```
   python app.py
   ```

## Setting Up and Running the Frontend

1. Navigate to the frontend directory:
   ```
   cd frontend
   ```

2. Install Node.js dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the frontend directory with necessary environment variables (if needed)

4. Start the React development server:
   ```
   npm start
   ```

## Verifying Everything is Working

1. The backend should be running on http://localhost:5000 (or check console output for the actual URL)
2. The frontend should be running on http://localhost:3000 (or check console output for the actual URL)
3. Open your browser and navigate to the frontend URL

## Alternative Setup Using Batch Files

For Windows users, you can also use the included batch files:
1. Run `install_dependencies.bat` to set up dependencies
2. Backend and frontend need to be started separately as described above
