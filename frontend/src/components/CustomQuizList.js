import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Paper, 
  Button, 
  CircularProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { Delete as DeleteIcon, PlayArrow as PlayArrowIcon } from '@mui/icons-material';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const CustomQuizList = ({ userId }) => {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [quizToDelete, setQuizToDelete] = useState(null);
  
  const navigate = useNavigate();

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        setLoading(true);
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
        const response = await axios.get(`${apiUrl}/api/custom-quizzes/user/${userId}`);
        setQuizzes(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching custom quizzes:', err);
        setError('Failed to load your custom quizzes. Please try again later.');
        setLoading(false);
      }
    };

    if (userId) {
      fetchQuizzes();
    }
  }, [userId]);

  const handleDeleteClick = (quiz) => {
    setQuizToDelete(quiz);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      await axios.delete(`${apiUrl}/api/custom-quizzes/${quizToDelete.id}`);
      setQuizzes(quizzes.filter(quiz => quiz.id !== quizToDelete.id));
      setDeleteConfirmOpen(false);
    } catch (err) {
      console.error('Error deleting quiz:', err);
      setError('Failed to delete the quiz. Please try again later.');
    }
  };

  const handleStartQuiz = (quizId) => {
    navigate(`/custom-quiz/${quizId}`);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ mt: 4 }}>
        <Typography color="error" align="center">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        My Custom Quizzes
      </Typography>
      
      {quizzes.length === 0 ? (
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="body1" gutterBottom>
            You haven't created any custom quizzes yet.
          </Typography>
          <Button 
            variant="contained" 
            color="primary" 
            sx={{ mt: 2 }}
            onClick={() => navigate('/custom-quiz-creator')}
          >
            Create Your First Quiz
          </Button>
        </Box>
      ) : (
        <Grid container spacing={3} sx={{ mt: 2 }}>
          {quizzes.map((quiz) => (
            <Grid item xs={12} sm={6} md={4} key={quiz.id}>
              <Paper sx={{ 
                p: 3, 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                borderRadius: 2,
                transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-5px)',
                  boxShadow: 4
                }
              }}>
                <Typography variant="h6" component="h2" gutterBottom>
                  {quiz.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {quiz.questions?.length || 0} questions
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                  Created: {new Date(quiz.createdAt).toLocaleDateString()}
                </Typography>
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  mt: 2
                }}>
                  <IconButton 
                    color="error" 
                    onClick={() => handleDeleteClick(quiz)}
                    size="small"
                  >
                    <DeleteIcon />
                  </IconButton>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<PlayArrowIcon />}
                    onClick={() => handleStartQuiz(quiz.id)}
                    size="small"
                  >
                    Start Quiz
                  </Button>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
      >
        <DialogTitle>Delete Quiz</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{quizToDelete?.title}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error">Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CustomQuizList; 