/**
 * Custom Quiz Creator Component
 * 
 * PURPOSE:
 * This component allows logged-in users to create their own custom quizzes
 * with questions, multiple-choice options, and explanations. These quizzes
 * can be private or shared with other users.
 * 
 * KEY FEATURES:
 * - Custom quiz creation with multiple questions
 * - Multiple-choice option configuration
 * - Optional explanations for each answer
 * - Public/private quiz setting
 * - User-friendly form validation
 * 
 * INPUTS:
 * - Quiz title and description
 * - Questions, answer options, and correct answers
 * - Optional explanations for answers
 * - Public/private setting
 * 
 * OUTPUTS:
 * - Saved custom quiz in the database
 * - Success/error feedback to the user
 * 
 * TECHNICAL DETAILS:
 * - Requires user authentication (only available to logged-in users)
 * - Implements form validation to ensure complete quiz data
 * - Communicates with backend API to save quiz data
 * - Displayed as a modal dialog within the main application
 */
import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  Paper,
  Radio,
  RadioGroup,
  Switch,
  TextField,
  Typography,
  Alert,
  Grid
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Share as ShareIcon
} from '@mui/icons-material';
import axios from 'axios';

const CustomQuizCreator = ({ userId, open, onClose, onQuizCreated }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  
  const [questions, setQuestions] = useState([
    {
      question: '',
      options: ['', '', '', ''],
      answer: '',
      explanation: ''
    }
  ]);

  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      {
        question: '',
        options: ['', '', '', ''],
        answer: '',
        explanation: ''
      }
    ]);
  };

  const handleRemoveQuestion = (index) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((_, i) => i !== index));
    }
  };

  const handleQuestionChange = (index, field, value) => {
    const updatedQuestions = [...questions];
    updatedQuestions[index][field] = value;
    setQuestions(updatedQuestions);
  };

  const handleOptionChange = (questionIndex, optionIndex, value) => {
    const updatedQuestions = [...questions];
    updatedQuestions[questionIndex].options[optionIndex] = value;
    setQuestions(updatedQuestions);
  };
  
  const handleAnswerChange = (questionIndex, value) => {
    const updatedQuestions = [...questions];
    updatedQuestions[questionIndex].answer = value;
    setQuestions(updatedQuestions);
  };

  const validateQuiz = () => {
    if (!title.trim()) {
      setError('Quiz title is required');
      return false;
    }
    
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question.trim()) {
        setError(`Question ${i + 1} is empty`);
        return false;
      }
      
      if (q.options.some(option => !option.trim())) {
        setError(`All options for question ${i + 1} are required`);
        return false;
      }
      
      if (!q.answer.trim()) {
        setError(`Answer for question ${i + 1} is required`);
        return false;
      }
    }
    
    return true;
  };

  const handleSaveQuiz = async () => {
    if (!validateQuiz()) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const formattedQuestions = questions.map(q => ({
        question: q.question,
        options: q.options,
        answer: q.answer,
        explanation: q.explanation
      }));
      
      const response = await axios.post('http://localhost:5000/api/custom-quiz/create', {
        user_id: userId,
        title,
        description,
        questions: formattedQuestions,
        is_public: isPublic
      });
      
      if (response.data.success) {
        setSuccess(true);
        setTimeout(() => {
          if (onQuizCreated) onQuizCreated(response.data.quiz_id);
          onClose();
        }, 1500);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save quiz');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={loading ? null : onClose} 
      maxWidth="md" 
      fullWidth
      scroll="paper"
    >
      <DialogTitle>
        <Typography variant="h5" component="div" sx={{ fontWeight: 'bold' }}>
          Create Custom Quiz
        </Typography>
      </DialogTitle>
      
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Quiz created successfully!
          </Alert>
        )}
        
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            label="Quiz Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            margin="normal"
            variant="outlined"
          />
          
          <TextField
            fullWidth
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            margin="normal"
            variant="outlined"
            multiline
            rows={2}
          />
          
          <FormControlLabel
            control={
              <Switch
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                color="primary"
              />
            }
            label="Make this quiz public (visible to all users)"
            sx={{ mt: 1 }}
          />
        </Box>
        
        <Divider sx={{ my: 3 }} />
        
        <Box>
          <Typography variant="h6" gutterBottom>
            Questions
          </Typography>
          
          {questions.map((question, qIndex) => (
            <Paper 
              key={qIndex} 
              elevation={2} 
              sx={{ 
                p: 2, 
                mb: 3,
                position: 'relative',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <IconButton 
                size="small" 
                color="error"
                onClick={() => handleRemoveQuestion(qIndex)}
                sx={{ position: 'absolute', top: 10, right: 10 }}
                disabled={questions.length === 1}
              >
                <DeleteIcon />
              </IconButton>
              
              <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                Question {qIndex + 1}
              </Typography>
              
              <TextField
                fullWidth
                label="Question"
                value={question.question}
                onChange={(e) => handleQuestionChange(qIndex, 'question', e.target.value)}
                required
                margin="normal"
                variant="outlined"
              />
              
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Options:
                </Typography>
                
                {question.options.map((option, oIndex) => (
                  <Grid container spacing={2} key={oIndex} alignItems="center">
                    <Grid item xs={1}>
                      <Radio
                        checked={question.answer === String.fromCharCode(65 + oIndex) + ")"}
                        onChange={() => handleAnswerChange(qIndex, String.fromCharCode(65 + oIndex) + ")")}
                        value={String.fromCharCode(65 + oIndex) + ")"}
                        name={`question-${qIndex}-answer`}
                      />
                    </Grid>
                    <Grid item xs={11}>
                      <TextField
                        fullWidth
                        label={`Option ${String.fromCharCode(65 + oIndex)}`}
                        value={option}
                        onChange={(e) => handleOptionChange(qIndex, oIndex, e.target.value)}
                        required
                        margin="dense"
                        variant="outlined"
                        size="small"
                      />
                    </Grid>
                  </Grid>
                ))}
              </Box>
              
              <TextField
                fullWidth
                label="Explanation (Optional)"
                value={question.explanation}
                onChange={(e) => handleQuestionChange(qIndex, 'explanation', e.target.value)}
                margin="normal"
                variant="outlined"
                multiline
                rows={2}
              />
            </Paper>
          ))}
          
          <Button
            startIcon={<AddIcon />}
            onClick={handleAddQuestion}
            variant="outlined"
            sx={{ mt: 1 }}
          >
            Add Question
          </Button>
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSaveQuiz}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={24} /> : <SaveIcon />}
        >
          {loading ? 'Saving...' : 'Save Quiz'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CustomQuizCreator; 