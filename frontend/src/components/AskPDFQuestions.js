/**
 * Ask PDF Questions Component
 * 
 * PURPOSE:
 * This component provides a chat-like interface where users can upload PDF documents
 * and ask questions about the content. It uses AI to analyze the PDF and generate
 * answers specific to questions about the document.
 * 
 * KEY FEATURES:
 * - PDF document upload
 * - Chat-style question and answer interface
 * - Markdown support for formatted responses
 * - Integration with Study Schedule Generator
 * - Chat history with clear visual distinction between user and AI messages
 * 
 * INPUTS:
 * - PDF file (uploaded by user)
 * - User questions about the PDF content
 * 
 * OUTPUTS:
 * - AI-generated answers based on PDF content
 * - Visual chat history with timestamp
 * - Options to clear chat or navigate to Study Schedule Generator
 * 
 * TECHNICAL DETAILS:
 * - Uses a backend API to process PDFs and generate answers
 * - Implements a chat-like UI with user and bot message bubbles
 * - Supports markdown formatting in AI responses
 * - Provides visual feedback during processing (typing indicator)
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Button,
  // Container,
  Typography,
  TextField,
  CircularProgress,
  Alert,
  Paper,
  Avatar,
  List,
  ListItem,
  // Divider,
  IconButton,
  InputAdornment,
  Chip,
  useTheme,
  alpha,
  ThemeProvider,
  createTheme
} from '@mui/material';
import {
  Send,
  // AttachFile,
  SmartToy,
  Person,
  ClearAll,
  Link as LinkIcon,
  ArrowDownward,
  School as SchoolIcon
} from '@mui/icons-material';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { useNavigate } from 'react-router-dom';

// Create a custom dark theme
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#4DABF5',
      light: '#81D4FA',
      dark: '#2196F3',
    },
    secondary: {
      main: '#9c27b0',
      light: '#D1C4E9',
      dark: '#7B1FA2',
    },
    background: {
      default: '#0A1929',
      paper: '#0A1929',
    },
    text: {
      primary: '#F2F2F2',
      secondary: '#B2BAC2',
    },
    error: {
      main: '#f44336'
    },
    info: {
      main: '#29b6f6'
    },
    success: {
      main: '#66bb6a'
    }
  },
  typography: {
    fontFamily: "'Inter', 'Roboto', 'Helvetica', 'Arial', sans-serif",
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
    body1: {
      lineHeight: 1.6,
    }
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 500,
        },
        outlined: {
          borderWidth: 1.5,
        }
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderWidth: 1.5,
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
        },
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        '*::-webkit-scrollbar': {
          width: '8px',
          height: '8px',
        },
        '*::-webkit-scrollbar-track': {
          background: 'rgba(0, 0, 0, 0.1)',
        },
        '*::-webkit-scrollbar-thumb': {
          backgroundColor: 'rgba(77, 171, 245, 0.3)',
          borderRadius: '8px',
          '&:hover': {
            backgroundColor: 'rgba(77, 171, 245, 0.5)',
          },
        },
      },
    },
  },
});

/**
 * Component that allows users to upload a PDF and ask questions about it in a chatbot-like interface
 * @returns {JSX.Element} AskPDFQuestions component
 */
const AskPDFQuestions = () => {
  const [file, setFile] = useState(null);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [pdfUploaded, setPdfUploaded] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const chatContainerRef = useRef(null);
  const theme = useTheme();
  const navigate = useNavigate();

  // Check if should show scroll down button
  const handleChatScroll = () => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
      setShowScrollButton(scrollHeight - scrollTop - clientHeight > 100);
    }
  };

  // Scroll to bottom of chat when history changes
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory]);

  // Add scroll event listener
  useEffect(() => {
    const chatContainer = chatContainerRef.current;
    if (chatContainer) {
      chatContainer.addEventListener('scroll', handleChatScroll);
      return () => chatContainer.removeEventListener('scroll', handleChatScroll);
    }
  }, []);

  /**
   * Handles file upload and adds a system message
   * @param {Event} event - File input change event
   */
  const handleFileUpload = (event) => {
    const uploadedFile = event.target.files[0];
    if (uploadedFile) {
      setFile(uploadedFile);
      setPdfUploaded(true);
      setError(null);
      
      // Add a system message when a new file is uploaded
      const timestamp = new Date().toLocaleTimeString();
      setChatHistory(prev => [
        ...prev,
        {
          type: 'system',
          content: `PDF "${uploadedFile.name}" has been uploaded. You can now ask questions about it.`,
          timestamp
        }
      ]);
    }
  };

  /**
   * Handles question submission and updates chat history
   */
  const handleQuestionSubmit = async () => {
    if (!file || !question.trim()) {
      setError(!file ? 'Please upload a PDF first' : 'Please enter a question');
      return;
    }

    setLoading(true);
    setError(null);
    
    // Add user question to chat history
    const userTimestamp = new Date().toLocaleTimeString();
    const userQuestion = question;
    
    setChatHistory(prev => [
      ...prev,
      {
        type: 'user',
        content: userQuestion,
        timestamp: userTimestamp
      }
    ]);
    
    // Clear the input field
    setQuestion('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('question', userQuestion);

    try {
      // Add typing indicator
      setChatHistory(prev => [
        ...prev,
        {
          type: 'typing',
          content: '',
          timestamp: new Date().toLocaleTimeString()
        }
      ]);

      // Try to use environment variable for API URL with fallback
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      
      const response = await axios.post(
        `${apiUrl}/api/ask-pdf`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Accept': 'application/json'
          },
          timeout: 180000 // 3 minutes timeout
        }
      );

      // Remove typing indicator
      setChatHistory(prev => prev.filter(msg => msg.type !== 'typing'));

      // Add bot response to chat history
      const botTimestamp = new Date().toLocaleTimeString();
      
      if (response.data?.answer) {
        setChatHistory(prev => [
          ...prev,
          {
            type: 'bot',
            content: response.data.answer,
            timestamp: botTimestamp
          }
        ]);
      } else {
        setChatHistory(prev => [
          ...prev,
          {
            type: 'bot',
            content: 'I couldn\'t find an answer to your question in the document. The PDF may not contain information about this topic, or the content might need to be processed differently.',
            timestamp: botTimestamp
          }
        ]);
      }
    } catch (err) {
      console.error('Error details:', err);
      
      // Remove typing indicator
      setChatHistory(prev => prev.filter(msg => msg.type !== 'typing'));
      
      // Add error message to chat history
      const errorTimestamp = new Date().toLocaleTimeString();
      setChatHistory(prev => [
        ...prev,
        {
          type: 'error',
          content: err.response?.data?.error || 'Failed to get a response. Please ensure the backend server is running.',
          timestamp: errorTimestamp
        }
      ]);
      
      setError(
        err.response?.data?.error ||
          'Failed to connect. Ensure the backend is running and CORS is enabled.'
      );
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Clears the chat history
   */
  const handleClearChat = () => {
    setChatHistory([]);
  };
  
  /**
   * Handles Enter key press to submit question
   * @param {Event} e - Keyboard event
   */
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleQuestionSubmit();
    }
  };

  /**
   * Scrolls to the bottom of the chat
   */
  const scrollToBottom = () => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  /**
   * Navigates to the study schedule generator with the current PDF
   */
  const handleGenerateStudySchedule = () => {
    if (file) {
      // We use localStorage to pass the file reference temporarily
      localStorage.setItem('pdfForSchedule', JSON.stringify({
        name: file.name,
        lastModified: file.lastModified,
        size: file.size,
        type: file.type
      }));
      
      // Also store the actual file in sessionStorage (only works for small files)
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          sessionStorage.setItem('pdfFileData', e.target.result);
          navigate('/study-planner');
        } catch (err) {
          console.error('Error storing PDF data:', err);
          // If storage fails (e.g., file too large), just navigate without the data
          navigate('/study-planner');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  /**
   * Renders a chat message based on type
   * @param {Object} message - Message object with type, content and timestamp
   * @param {number} index - Index in the chat history array
   * @returns {JSX.Element} Rendered chat message
   */
  const renderChatMessage = (message, index) => {
    switch (message.type) {
      case 'user':
        return (
          <ListItem 
            key={index} 
            sx={{ 
              justifyContent: 'flex-end', 
              mb: 1.5,
              py: 0.5,
              px: { xs: 1, sm: 2 },
            }}
          >
            <Box sx={{ 
              maxWidth: { xs: '85%', md: '75%' }, 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'flex-end' 
            }}>
              <Paper 
                elevation={0} 
                sx={{ 
                  p: 2, 
                  bgcolor: 'primary.dark', 
                  color: 'white', 
                  borderRadius: '16px 16px 4px 16px',
                }}
              >
                <Typography variant="body1">{message.content}</Typography>
              </Paper>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, mr: 1 }}>
                {message.timestamp}
              </Typography>
            </Box>
            <Avatar sx={{ 
              bgcolor: 'primary.main', 
              ml: 1,
              width: 36,
              height: 36,
            }}>
              <Person fontSize="small" />
            </Avatar>
          </ListItem>
        );
        
      case 'bot':
        return (
          <ListItem 
            key={index} 
            sx={{ 
              justifyContent: 'flex-start', 
              mb: 1.5,
              py: 0.5,
              px: { xs: 1, sm: 2 },
              backgroundColor: index % 2 === 0 ? 'transparent' : alpha(theme.palette.background.default, 0.5),
            }}
          >
            <Avatar sx={{ 
              bgcolor: 'secondary.main', 
              mr: 1,
              width: 36,
              height: 36,
            }}>
              <SmartToy fontSize="small" />
            </Avatar>
            <Box sx={{ maxWidth: { xs: '85%', md: '75%' }, display: 'flex', flexDirection: 'column' }}>
              <Paper 
                elevation={0} 
                sx={{ 
                  p: 2,
                  bgcolor: alpha(theme.palette.background.paper, 0.85),
                  borderRadius: '16px 16px 16px 4px',
                  border: '1px solid',
                  borderColor: alpha(theme.palette.secondary.main, 0.2),
                }}
              >
                <Box sx={{ 
                  color: 'text.primary',
                  '& a': {
                    color: 'primary.main',
                    textDecoration: 'none',
                    '&:hover': {
                      textDecoration: 'underline',
                    }
                  },
                  '& code': {
                    bgcolor: alpha(theme.palette.primary.dark, 0.1),
                    color: 'primary.light',
                    p: 0.5,
                    borderRadius: 1,
                    fontFamily: 'monospace',
                  }
                }}>
                  <ReactMarkdown>
                    {message.content}
                  </ReactMarkdown>
                </Box>
              </Paper>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, ml: 1 }}>
                {message.timestamp}
              </Typography>
            </Box>
          </ListItem>
        );
        
      case 'system':
        return (
          <ListItem key={index} sx={{ justifyContent: 'center', my: 1.5, px: { xs: 1, sm: 2 } }}>
            <Chip 
              label={message.content} 
              variant="outlined" 
              color="info"
              size="small"
              icon={<LinkIcon />}
              sx={{ 
                py: 1,
                fontWeight: 500,
                bgcolor: alpha(theme.palette.info.main, 0.08),
                borderColor: alpha(theme.palette.info.main, 0.3),
                '& .MuiChip-icon': { 
                  color: theme.palette.info.main 
                }
              }}
            />
          </ListItem>
        );
        
      case 'error':
        return (
          <ListItem key={index} sx={{ justifyContent: 'center', my: 1, px: { xs: 1, sm: 2 } }}>
            <Alert 
              severity="error" 
              sx={{ 
                width: '100%', 
                borderRadius: 2,
              }}
            >
              {message.content}
            </Alert>
          </ListItem>
        );
      
      case 'typing':
        return (
          <ListItem key={index} sx={{ justifyContent: 'flex-start', mb: 1.5, px: { xs: 1, sm: 2 } }}>
            <Avatar sx={{ 
              bgcolor: 'secondary.main', 
              mr: 1,
              width: 36,
              height: 36,
            }}>
              <SmartToy fontSize="small" />
            </Avatar>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                p: 2,
                bgcolor: alpha(theme.palette.background.paper, 0.7),
                borderRadius: '16px 16px 16px 4px',
                border: '1px solid',
                borderColor: alpha(theme.palette.secondary.main, 0.2),
              }}>
                <Typography sx={{ mr: 1, fontWeight: 500 }}>Thinking</Typography>
                <Box sx={{ display: 'flex' }}>
                  <Box
                    sx={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      bgcolor: 'primary.main',
                      mx: 0.3,
                    }}
                  />
                  <Box
                    sx={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      bgcolor: 'primary.main',
                      mx: 0.3,
                    }}
                  />
                  <Box
                    sx={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      bgcolor: 'primary.main',
                      mx: 0.3,
                    }}
                  />
                </Box>
              </Box>
            </Box>
          </ListItem>
        );
        
      default:
        return null;
    }
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <Box sx={{ 
        bgcolor: 'background.default',
        display: 'flex',
        flexDirection: 'column',
        py: 2,
        px: 3,
        height: 'calc(100vh - 64px)',
        overflow: 'hidden',
      }}>
        <Paper 
          elevation={1} 
          sx={{ 
            flexGrow: 1,
            display: 'flex', 
            flexDirection: 'column',
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'rgba(194, 224, 255, 0.08)',
            height: '100%',
            overflow: 'hidden',
            bgcolor: 'background.default',
          }}
        >
          {/* Header */}
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            p: { xs: 1.5, sm: 2 },
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}>
            <Typography 
              variant="h5" 
              fontWeight="bold" 
              sx={{ 
                color: 'primary.main',
                letterSpacing: '0.5px'
              }}
            >
              PDF Chat Assistant
            </Typography>
            
            <Box>
              <Button 
                variant="outlined" 
                component="label" 
                startIcon={<LinkIcon />}
                size="small"
                sx={{ 
                  mr: 1,
                }}
              >
                {pdfUploaded ? 'Change PDF' : 'Upload PDF'}
                <input
                  ref={fileInputRef}
                  accept="application/pdf"
                  style={{ display: 'none' }}
                  id="pdf-upload"
                  type="file"
                  onChange={handleFileUpload}
                />
              </Button>
              
              {file && (
                <Button 
                  variant="outlined" 
                  color="secondary" 
                  size="small"
                  startIcon={<SchoolIcon />}
                  onClick={handleGenerateStudySchedule}
                  sx={{ mr: 1 }}
                >
                  Generate Study Schedule
                </Button>
              )}
              
              {chatHistory.length > 0 && (
                <Button 
                  variant="outlined" 
                  color="error" 
                  size="small"
                  startIcon={<ClearAll />}
                  onClick={handleClearChat}
                >
                  Clear Chat
                </Button>
              )}
            </Box>
          </Box>
          
          {file && (
            <Box sx={{ 
              px: { xs: 1.5, sm: 2.5 },
              py: 1,
              borderBottom: '1px solid',
              borderColor: 'divider',
              bgcolor: alpha(theme.palette.primary.dark, 0.05)
            }}>
              <Chip 
                label={`Active PDF: ${file.name}`} 
                size="small" 
                color="primary" 
                variant="outlined"
                icon={<LinkIcon fontSize="small" />}
              />
            </Box>
          )}
          
          {/* Chat message area */}
          <Box 
            ref={chatContainerRef}
            sx={{ 
              flexGrow: 1, 
              overflow: 'auto', 
              position: 'relative',
              height: 'calc(100vh - 250px)',
              bgcolor: 'background.default',
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(77, 171, 245, 0.3) rgba(0, 0, 0, 0.1)',
              '&::-webkit-scrollbar': {
                width: '8px',
                height: '8px',
              },
              '&::-webkit-scrollbar-track': {
                background: 'rgba(0, 0, 0, 0.1)',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: 'rgba(77, 171, 245, 0.3)',
                borderRadius: '8px',
                '&:hover': {
                  backgroundColor: 'rgba(77, 171, 245, 0.5)',
                },
              },
            }}
            onScroll={handleChatScroll}
          >
            {chatHistory.length === 0 ? (
              <Box sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'center', 
                alignItems: 'center',
                p: { xs: 2, sm: 5 },
              }}>
                <SmartToy sx={{ fontSize: 80, color: 'primary.main', mb: 3, opacity: 0.7 }} />
                <Typography 
                  variant="h5" 
                  color="primary.light" 
                  gutterBottom 
                  fontWeight="medium"
                >
                  Welcome to PDF Chat Assistant
                </Typography>
                <Typography 
                  variant="body1" 
                  color="text.secondary" 
                  align="center" 
                  sx={{ maxWidth: 600 }}
                >
                  Upload a PDF document and ask questions about its content. The assistant will analyze 
                  the document and provide answers based on the information within.
                </Typography>
              </Box>
            ) : (
              <List sx={{ width: '100%', p: 0, my: 0 }}>
                {chatHistory.map((message, index) => renderChatMessage(message, index))}
              </List>
            )}
            <div ref={chatEndRef} />
            
            {/* Scroll to bottom button */}
            {showScrollButton && (
              <IconButton
                color="primary"
                size="small"
                onClick={scrollToBottom}
                sx={{
                  position: 'absolute',
                  bottom: 16,
                  right: 16,
                  bgcolor: 'background.paper',
                  border: '1px solid',
                  borderColor: alpha(theme.palette.primary.main, 0.3),
                }}
              >
                <ArrowDownward />
              </IconButton>
            )}
          </Box>
          
          {/* Input area */}
          <Box sx={{ 
            p: { xs: 1.5, sm: 2 }, 
            borderTop: '1px solid', 
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}>
            <TextField
              fullWidth
              placeholder={file ? "Ask a question about your PDF..." : "Upload a PDF first to ask questions"}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={!file || loading}
              multiline
              maxRows={3}
              variant="outlined"
              InputProps={{
                sx: {
                  borderRadius: 3,
                  bgcolor: alpha(theme.palette.background.default, 0.7),
                },
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton 
                      edge="end" 
                      color="primary"
                      disabled={!file || !question.trim() || loading}
                      onClick={handleQuestionSubmit}
                    >
                      {loading ? (
                        <CircularProgress 
                          size={24} 
                        />
                      ) : (
                        <Send />
                      )}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Box>
        </Paper>
      </Box>
    </ThemeProvider>
  );
};

export default AskPDFQuestions;
