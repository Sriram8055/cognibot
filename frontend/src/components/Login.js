/**
 * Login Component
 * 
 * PURPOSE:
 * This component handles user authentication for the application.
 * It provides a simple username-based login system where existing users
 * can log in, and new usernames automatically create new accounts.
 * 
 * KEY FEATURES:
 * - Simple username-based authentication
 * - Automatic account creation for new usernames
 * - Error handling for login failures
 * - Modal dialog design for integration in the main app
 * 
 * INPUTS:
 * - Username (entered by the user)
 * 
 * OUTPUTS:
 * - Authentication result (success/failure)
 * - User data on successful login
 * 
 * TECHNICAL DETAILS:
 * - Communicates with backend API for authentication
 * - Stores user data in localStorage for persistent login
 * - Displayed as a modal dialog within the main application
 * - Provides loading state feedback during authentication
 */
import React, { useState } from 'react';
import { 
  Box, 
  TextField, 
  Button, 
  Typography, 
  Paper, 
  Alert, 
  CircularProgress, 
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import axios from 'axios';

const Login = ({ onLogin, open, onClose }) => {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Username is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.post('http://localhost:5000/api/user/login', { username });
      
      if (response.data.success) {
        localStorage.setItem('user', JSON.stringify({
          id: response.data.user_id,
          username: response.data.username,
        }));
        
        onLogin({
          id: response.data.user_id,
          username: response.data.username,
        });
        
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={loading ? null : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Typography variant="h5" component="div" sx={{ fontWeight: 'bold' }}>
          Sign In to QuizBot
        </Typography>
      </DialogTitle>
      
      <DialogContent>
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <TextField
            margin="normal"
            required
            fullWidth
            id="username"
            label="Username"
            name="username"
            autoComplete="username"
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
          />
          
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Enter a username to sign in. If the username doesn't exist, a new account will be created.
          </Typography>
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading || !username.trim()}
          endIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? 'Signing In...' : 'Sign In'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default Login; 