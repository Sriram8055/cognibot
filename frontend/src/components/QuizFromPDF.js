/**
 * Quiz From PDF Component
 * 
 * PURPOSE:
 * This component allows users to generate interactive quizzes from PDF documents.
 * It extracts content from the uploaded PDF and creates multiple-choice questions
 * to test the user's knowledge of the material.
 * 
 * KEY FEATURES:
 * - PDF document upload
 * - Configurable quiz options (number of questions, timer, adaptive difficulty)
 * - Interactive quiz-taking interface
 * - Detailed results and performance feedback
 * - Text-to-speech support for accessibility
 * - Notes feature for saving thoughts on specific questions
 * 
 * INPUTS:
 * - PDF file (uploaded by user)
 * - Quiz configuration (number of questions, use of timer, etc.)
 * - User answers to quiz questions
 * 
 * OUTPUTS:
 * - Generated quiz with multiple-choice questions
 * - Real-time feedback during quiz-taking
 * - Detailed score report and explanation
 * - Exportable results for later review
 * 
 * TECHNICAL DETAILS:
 * - Uses AI to analyze PDF content and generate relevant questions
 * - Implements timing functionality for timed quizzes
 * - Supports accessibility features like text-to-speech
 * - Tracks user performance for adaptive question difficulty (when logged in)
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Button,
  Container,
  Paper,
  Typography,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  CircularProgress,
  Alert,
  Switch,
  TextField,
  useTheme,
  useMediaQuery,
  Fade,
  Grow,
  GlobalStyles,
  LinearProgress,
  Card,
  CardContent,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  NoteAdd,
  Download,
  CloudUpload,
  Timer,
  VolumeUp,
  CheckCircleOutline,
  Cancel,
  Save
} from '@mui/icons-material';
import axios from 'axios';

/**
 * QuizFromPDF component allows users to generate and take quizzes from uploaded PDF files
 * 
 * @param {Object} props - Component props
 * @param {Object} props.user - Current user information
 * @returns {JSX.Element} QuizFromPDF component
 */
const QuizFromPDF = ({ user }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [file, setFile] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [score, setScore] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [questionNotes, setQuestionNotes] = useState({}); // Changed to an object to store notes per question
  const [notes, setNotes] = useState(''); // Current editing notes
  const [darkMode, setDarkMode] = useState(false);
  
  // New state variables
  const [timePerQuestion, setTimePerQuestion] = useState(60); // seconds
  const [useTimer, setUseTimer] = useState(true);
  const [currentTimerValue, setCurrentTimerValue] = useState(timePerQuestion);
  const [timer, setTimer] = useState(null);
  const [activeQuestion, setActiveQuestion] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [quizStartTime, setQuizStartTime] = useState(null);
  const [enableAudio, setEnableAudio] = useState(false);
  const [adaptiveQuiz, setAdaptiveQuiz] = useState(false);
  const [difficulty, setDifficulty] = useState(null);
  const [numQuestions, setNumQuestions] = useState(5);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [currentNoteQuestion, setCurrentNoteQuestion] = useState(null);

  // Refs for smooth scrolling
  const quizSectionRef = useRef(null);
  const scoreSectionRef = useRef(null);
  const uploadSectionRef = useRef(null);

  /**
   * Effect hook to handle the timer functionality
   * Initializes and controls the timer for each question
   */
  useEffect(() => {
    if (quiz && useTimer && activeQuestion !== null) {
      // Clear any existing timer
      if (timer) clearInterval(timer);
      
      // Reset timer for current question
      setCurrentTimerValue(timePerQuestion);
      
      // Set new timer
      const newTimer = setInterval(() => {
        setCurrentTimerValue(prev => {
          if (prev <= 1) {
            // Time's up, move to next question or submit
            clearInterval(newTimer);
            if (activeQuestion < quiz.length - 1) {
              setActiveQuestion(prev => prev + 1);
            } else {
              handleSubmit();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      setTimer(newTimer);
      
      // Cleanup timer on unmount
      return () => {
        if (newTimer) clearInterval(newTimer);
      };
    }
  }, [quiz, activeQuestion, useTimer]);

  /**
   * Effect hook to handle text-to-speech for questions
   * Speaks the current question text if audio is enabled
   */
  useEffect(() => {
    if (quiz && enableAudio && activeQuestion !== null) {
      const question = quiz[activeQuestion].question;
      
      if ('speechSynthesis' in window) {
        // Cancel any ongoing speech
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(question);
        window.speechSynthesis.speak(utterance);
      }
    }
    
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [quiz, activeQuestion, enableAudio]);

  /**
   * Effect hook to scroll to the quiz section after quiz generation
   */
  useEffect(() => {
    if (quiz && quizSectionRef.current) {
      quizSectionRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  }, [quiz]);

  /**
   * Effect hook to scroll to the score section after quiz submission
   */
  useEffect(() => {
    if (score && scoreSectionRef.current) {
      scoreSectionRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [score]);

  /**
   * Effect hook to scroll to the upload section when an error occurs
   */
  useEffect(() => {
    if (error && uploadSectionRef.current) {
      uploadSectionRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [error]);

  /**
   * Exports quiz results as a CSV file
   * @async
   */
  const handleExport = async () => {
    try {
      const response = await axios.post('http://localhost:5000/api/export-results', {
        results: quiz.map((q, i) => ({
          question: q.question,
          userAnswer: answers[i],
          correctAnswer: q.answer
        }))
      });
      
      const blob = new Blob([response.data.csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'quiz-results.csv';
      a.click();
    } catch (err) {
      setError('Failed to export results');
    }
  };

  /**
   * Opens the notes dialog for a specific question
   * @param {number} questionIndex - Index of the question to add notes to
   */
  const handleOpenNotesDialog = (questionIndex) => {
    setCurrentNoteQuestion(questionIndex);
    // Load existing notes for this question if they exist
    setNotes(questionNotes[questionIndex] || '');
    setNotesDialogOpen(true);
  };

  /**
   * Saves notes for the current question to the server
   * @async
   */
  const handleSaveNotes = async () => {
    if (!user || !user.id) {
      alert('Please login to save notes');
      return;
    }
    
    try {
      await axios.post('http://localhost:5000/api/save-notes', {
        user_id: user.id,
        notes: notes,
        quiz_id: null,
        question_id: currentNoteQuestion
      });
      
      // Update the notes in state
      setQuestionNotes(prev => ({
        ...prev,
        [currentNoteQuestion]: notes
      }));
      
      setNotesDialogOpen(false);
      alert('Notes saved successfully!');
    } catch (err) {
      setError('Failed to save notes');
    }
  };

  /**
   * Handles file upload from the input field
   * @param {Event} event - The file input change event
   */
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    setFile(file);
    setQuiz(null);
    setScore(null);
    setError(null);
    setAnswers({});
    setActiveQuestion(0);
  };

  /**
   * Generates a quiz from the uploaded PDF file
   * @async
   */
  const handleGenerateQuiz = async () => {
    if (!file) {
      setError('Please select a PDF file first');
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('num_questions', numQuestions);
    
    if (user && user.id) {
      formData.append('user_id', user.id);
    }
    
    formData.append('adaptive', adaptiveQuiz.toString());

    try {
      const response = await axios.post('http://localhost:5000/api/upload-pdf', formData);
      setQuiz(response.data.quiz);
      setDifficulty(response.data.difficulty);
      setActiveQuestion(0);
      setQuizStartTime(Date.now());
      
      // Reset answers
      setAnswers({});
    } catch (err) {
      setError(err.response?.data?.error || 'Error generating quiz');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Updates the answer for a specific question
   * @param {number} questionIndex - Index of the question being answered
   * @param {string} value - The selected answer value
   */
  const handleAnswerChange = (questionIndex, value) => {
    setAnswers(prev => ({
      ...prev,
      [questionIndex]: value
    }));
  };

  /**
   * Submits the quiz and calculates the score
   * @async
   */
  const handleSubmit = async () => {
    if (!quiz) return;
    
    // Stop the timer
    if (timer) clearInterval(timer);
    setTimer(null);

    let correct = 0;
    quiz.forEach((question, index) => {
      // Normalize both answers to handle different formats
      const userAnswer = answers[index]?.trim() || '';
      const correctAnswer = question.answer?.trim() || '';
      
      // Check if user answer matches the full correct answer or just the letter
      if (userAnswer === correctAnswer || 
          userAnswer === correctAnswer.substring(0, 3) ||  // Handle "A) Option" format
          userAnswer === correctAnswer.charAt(0) ||        // Handle "A" format
          (correctAnswer.includes(userAnswer) && userAnswer.length > 3)) {  // Handle when user selects full option text
        correct++;
      }
    });

    const percentage = (correct / quiz.length) * 100;
    const quizTimeInSeconds = Math.floor((Date.now() - quizStartTime) / 1000);
    
    setScore({ 
      correct, 
      total: quiz.length, 
      percentage,
      timeInSeconds: quizTimeInSeconds
    });
    
    // Submit quiz results to the server if user is logged in
    if (user && user.id) {
      try {
        await axios.post('http://localhost:5000/api/quiz/submit', {
          user_id: user.id,
          score: correct,
          total_questions: quiz.length,
          quiz_topic: 'PDF Quiz',
          time_taken: quizTimeInSeconds
        });
      } catch (err) {
        console.error('Failed to submit quiz results:', err);
      }
    }
  };

  /**
   * Navigates to the next question or submits if on the last question
   */
  const handleNextQuestion = () => {
    if (activeQuestion < quiz.length - 1) {
      setActiveQuestion(prev => prev + 1);
    } else {
      handleSubmit();
    }
  };

  /**
   * Navigates to the previous question
   */
  const handlePrevQuestion = () => {
    if (activeQuestion > 0) {
      setActiveQuestion(prev => prev - 1);
    }
  };

  /**
   * Formats seconds into a readable time string (MM:SS)
   * @param {number} seconds - Time in seconds
   * @returns {string} Formatted time string
   */
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  /**
   * Determines the color of the timer based on remaining time
   * @returns {string} Material UI color name (success, warning, or error)
   */
  const getTimerColor = () => {
    const percentage = (currentTimerValue / timePerQuestion) * 100;
    if (percentage > 60) return 'success';
    if (percentage > 30) return 'warning';
    return 'error';
  };

  /**
   * Uses text-to-speech to read the provided text aloud
   * @param {string} text - Text to be spoken
   */
  const speakText = (text) => {
    if (enableAudio && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <Box sx={{ pb: 5 }}>
      <Paper elevation={3} sx={{ p: { xs: 2, sm: 3 }, mb: 4 }} ref={uploadSectionRef}>
        <Typography variant="h5" gutterBottom>
          Generate a Quiz from PDF
        </Typography>
        
        <Typography variant="body2" color="text.secondary" paragraph>
          Upload a PDF document and we'll generate a quiz to test your knowledge.
        </Typography>
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
          <FormControl component="fieldset">
            <FormControlLabel
              control={
                <Switch
                  checked={adaptiveQuiz}
                  onChange={(e) => setAdaptiveQuiz(e.target.checked)}
                  disabled={!user || !user.id}
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography>Adaptive Quiz</Typography>
                  <Typography variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
                    {!user || !user.id ? "(Login required)" : "(Adjusts difficulty based on your performance)"}
                  </Typography>
                </Box>
              }
            />
          </FormControl>
          
          <FormControl component="fieldset">
            <FormControlLabel
              control={
                <Switch
                  checked={useTimer}
                  onChange={(e) => setUseTimer(e.target.checked)}
                />
              }
              label="Use Timer"
            />
            
            {useTimer && (
              <Box sx={{ display: 'flex', alignItems: 'center', ml: 3, mt: 1 }}>
                <Typography variant="body2" sx={{ mr: 2 }}>
                  Seconds per question:
                </Typography>
                <TextField
                  type="number"
                  size="small"
                  value={timePerQuestion}
                  onChange={(e) => setTimePerQuestion(Math.max(10, parseInt(e.target.value) || 60))}
                  inputProps={{ min: 10 }}
                  sx={{ width: 80 }}
                />
              </Box>
            )}
          </FormControl>
          
          <FormControl component="fieldset">
            <FormControlLabel
              control={
                <Switch
                  checked={enableAudio}
                  onChange={(e) => setEnableAudio(e.target.checked)}
                />
              }
              label="Text-to-Speech"
            />
          </FormControl>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2">
              Number of questions:
            </Typography>
            <TextField
              type="number"
              size="small"
              value={numQuestions}
              onChange={(e) => setNumQuestions(Math.max(1, parseInt(e.target.value) || 5))}
              inputProps={{ min: 1, max: 20 }}
              sx={{ width: 80 }}
            />
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            component="label"
            startIcon={<CloudUpload />}
            sx={{ position: 'relative', overflow: 'hidden' }}
          >
            Upload PDF
            <input
              type="file"
              accept=".pdf"
              hidden
              onChange={handleFileUpload}
              onClick={(e) => e.target.value = null}
            />
          </Button>
          
          {file && (
            <Typography variant="body2" sx={{ alignSelf: 'center' }}>
              {file.name}
            </Typography>
          )}
          
          <Button
            variant="contained"
            color="primary"
            onClick={handleGenerateQuiz}
            disabled={!file || loading}
            sx={{ ml: 'auto' }}
          >
            {loading ? <CircularProgress size={24} /> : 'Generate Quiz'}
          </Button>
        </Box>
        
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </Paper>
      
      {quiz && (
        <Box ref={quizSectionRef}>
          <Paper elevation={3} sx={{ p: { xs: 2, sm: 3 }, mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h5" gutterBottom>
                Quiz
              </Typography>
              
              {difficulty && (
                <Chip 
                  label={`Difficulty: ${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}`}
                  color={
                    difficulty === 'easy' ? 'success' : 
                    difficulty === 'medium' ? 'warning' : 
                    'error'
                  }
                  size="small"
                />
              )}
            </Box>
            
            {useTimer && (
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Timer color={getTimerColor()} />
                  <Typography variant="body2">
                    Time Remaining: {formatTime(currentTimerValue)}
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={(currentTimerValue / timePerQuestion) * 100}
                  color={getTimerColor()}
                />
              </Box>
            )}
            
            {quiz.map((question, index) => (
              <Fade in={activeQuestion === index} key={index}>
                <Box sx={{ display: activeQuestion === index ? 'block' : 'none' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Typography variant="h6" gutterBottom>
                      {question.question}
                    </Typography>
                    
                    <Box>
                      {enableAudio && (
                        <IconButton onClick={() => speakText(question.question)} size="small">
                          <VolumeUp />
                        </IconButton>
                      )}
                      
                      <IconButton 
                        onClick={() => handleOpenNotesDialog(index)} 
                        size="small"
                        color="primary"
                      >
                        <NoteAdd />
                      </IconButton>
                    </Box>
                  </Box>
                  
                  <FormControl component="fieldset" sx={{ width: '100%', my: 2 }}>
                    <RadioGroup
                      value={answers[index] || ''}
                      onChange={(e) => handleAnswerChange(index, e.target.value)}
                    >
                      {question.options.map((option, optIndex) => (
                        <FormControlLabel
                          key={optIndex}
                          value={option}
                          control={<Radio />}
                          label={
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Typography>{option}</Typography>
                              {enableAudio && (
                                <IconButton 
                                  onClick={(e) => {
                                    e.preventDefault();
                                    speakText(option);
                                  }} 
                                  size="small"
                                  sx={{ ml: 1 }}
                                >
                                  <VolumeUp fontSize="small" />
                                </IconButton>
                              )}
                            </Box>
                          }
                          sx={{
                            mb: 1,
                            p: 1,
                            borderRadius: 1,
                            width: '100%',
                            transition: 'background-color 0.2s',
                            '&:hover': {
                              backgroundColor: 'action.hover',
                            }
                          }}
                        />
                      ))}
                    </RadioGroup>
                  </FormControl>
                </Box>
              </Fade>
            ))}
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
              <Button 
                variant="outlined" 
                onClick={handlePrevQuestion}
                disabled={activeQuestion === 0}
              >
                Previous
              </Button>
              
              <Typography variant="body2" sx={{ alignSelf: 'center' }}>
                Question {activeQuestion + 1} of {quiz.length}
              </Typography>
              
              {activeQuestion < quiz.length - 1 ? (
                <Button 
                  variant="contained" 
                  onClick={handleNextQuestion}
                  color="primary"
                >
                  Next
                </Button>
              ) : (
                <Button 
                  variant="contained" 
                  onClick={handleSubmit}
                  color="secondary"
                >
                  Submit Quiz
                </Button>
              )}
            </Box>
          </Paper>
        </Box>
      )}
      
      {score && (
        <Box ref={scoreSectionRef}>
          <Paper elevation={3} sx={{ p: { xs: 2, sm: 3 }, mb: 4 }}>
            <Typography variant="h5" gutterBottom>
              Quiz Results
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 2, mb: 3 }}>
              <Card sx={{ flex: 1 }}>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Score
                  </Typography>
                  <Typography variant="h4">
                    {score.correct}/{score.total}
                  </Typography>
                </CardContent>
              </Card>
              
              <Card sx={{ flex: 1 }}>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Percentage
                  </Typography>
                  <Typography variant="h4">
                    {score.percentage.toFixed(1)}%
                  </Typography>
                </CardContent>
              </Card>
              
              <Card sx={{ flex: 1 }}>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Time Taken
                  </Typography>
                  <Typography variant="h4">
                    {Math.floor(score.timeInSeconds / 60)}m {score.timeInSeconds % 60}s
                  </Typography>
                </CardContent>
              </Card>
            </Box>
            
            <Button
              variant="outlined"
              onClick={() => setShowFeedback(!showFeedback)}
              sx={{ mb: 2 }}
            >
              {showFeedback ? 'Hide Detailed Feedback' : 'Show Detailed Feedback'}
            </Button>
            
            {showFeedback && (
              <Box>
                {quiz.map((question, index) => {
                  // Normalize both answers
                  const userAnswer = answers[index]?.trim() || '';
                  const correctAnswer = question.answer?.trim() || '';
                  
                  // Check using the same algorithm as in handleSubmit
                  const isCorrect = userAnswer === correctAnswer || 
                    userAnswer === correctAnswer.substring(0, 3) || 
                    userAnswer === correctAnswer.charAt(0) ||
                    (correctAnswer.includes(userAnswer) && userAnswer.length > 3);
                  
                  return (
                    <Paper 
                      key={index} 
                      elevation={1} 
                      sx={{ 
                        p: 2, 
                        mb: 2,
                        borderLeft: '4px solid',
                        borderColor: isCorrect ? 'success.main' : 'error.main'
                      }}
                    >
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                        {isCorrect ? 
                          <CheckCircleOutline color="success" /> : 
                          <Cancel color="error" />
                        }
                        <Box>
                          <Typography variant="subtitle1" gutterBottom>
                            {question.question}
                          </Typography>
                          
                          <Typography variant="body2">
                            Your answer: {answers[index] || 'Not answered'}
                          </Typography>
                          
                          <Typography variant="body2">
                            Correct answer: {question.answer}
                          </Typography>
                          
                          {question.explanation && (
                            <Box sx={{ mt: 1, p: 1, bgcolor: 'background.default', borderRadius: 1 }}>
                              <Typography variant="body2" fontWeight="bold">
                                Explanation:
                              </Typography>
                              <Typography variant="body2">
                                {question.explanation}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      </Box>
                    </Paper>
                  );
                })}
              </Box>
            )}
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
              <Button
                variant="outlined"
                startIcon={<Download />}
                onClick={handleExport}
              >
                Export Results
              </Button>
              
              <Button
                variant="contained"
                onClick={() => {
                  setQuiz(null);
                  setScore(null);
                  setAnswers({});
                }}
              >
                Take Another Quiz
              </Button>
            </Box>
          </Paper>
        </Box>
      )}
      
      {/* Notes Dialog */}
      <Dialog 
        open={notesDialogOpen} 
        onClose={() => setNotesDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Notes</DialogTitle>
        <DialogContent>
          {currentNoteQuestion !== null && quiz && (
            <Typography variant="subtitle2" gutterBottom>
              Question: {quiz[currentNoteQuestion].question}
            </Typography>
          )}
          <TextField
            autoFocus
            margin="dense"
            id="notes"
            label="Your Notes"
            multiline
            rows={4}
            fullWidth
            variant="outlined"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNotesDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveNotes} variant="contained" startIcon={<Save />}>
            Save Notes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default QuizFromPDF;