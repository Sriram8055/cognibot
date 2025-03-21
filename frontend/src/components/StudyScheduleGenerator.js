/**
 * Study Schedule Generator Component
 * 
 * PURPOSE:
 * This component allows users to upload PDF documents and generate personalized
 * study schedules based on the content. It uses AI (Llama model) to analyze the PDF
 * and create a day-by-day study plan tailored to the user's available time.
 * 
 * KEY FEATURES:
 * - PDF document upload
 * - Study duration and daily hours configuration
 * - AI-powered schedule generation
 * - Downloadable and copyable schedule results
 * - Detailed day-by-day breakdown of topics and activities
 * 
 * INPUTS:
 * - PDF file (uploaded by user)
 * - Study duration in days (default: 14)
 * - Hours available per day (default: 2)
 * 
 * OUTPUTS:
 * - Personalized study schedule with daily topics and activities
 * - Option to download the schedule as a text file
 * - Option to copy the schedule to clipboard
 * 
 * TECHNICAL DETAILS:
 * - Communicates with backend API to process PDFs and generate schedules
 * - Uses the Llama model through SambaNova's API for content analysis
 * - Implements error handling and fallback generation for reliability
 */
import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  TextField,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  ThemeProvider,
  createTheme,
  alpha,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  useTheme
} from '@mui/material';
import {
  CalendarMonth,
  Schedule,
  Assignment,
  EventNote,
  AccessTime,
  BookmarkBorder,
  Description,
  ExpandMore,
  ContentCopy,
  Download,
  Info,
  SchoolOutlined
} from '@mui/icons-material';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

/**
 * Custom theme configuration for the Study Schedule Generator
 * 
 * Creates a dark theme with blue accents to match the PDF Chat Assistant.
 * Includes custom styling for buttons, text fields, scrollbars, and other UI elements.
 */
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
      paper: '#0F2942',
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
 * StudyScheduleGenerator Component
 * 
 * The main component that handles the study schedule generation workflow.
 * 
 * Props:
 *   selectedFile - Optional PDF file passed from another component
 * 
 * State:
 *   file - The PDF file to analyze
 *   studyDuration - Number of days for the study schedule
 *   hoursPerDay - Hours available for studying each day
 *   schedule - The generated schedule data
 *   loading - Whether a request is in progress
 *   error - Any error message to display
 *   copied - Whether the schedule was copied to clipboard
 *   generatingNew - Whether the user is creating a new schedule
 */
const StudyScheduleGenerator = ({ selectedFile }) => {
  const [file, setFile] = useState(selectedFile || null);
  const [studyDuration, setStudyDuration] = useState(14); // default 14 days
  const [hoursPerDay, setHoursPerDay] = useState(2); // default 2 hours per day
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [generatingNew, setGeneratingNew] = useState(false);
  const navigate = useNavigate();
  const theme = useTheme();

  /**
   * Effect hook to check for a PDF passed from another component
   * 
   * If the user navigated from another component (like AskPDFQuestions)
   * with a PDF file, this retrieves that file from storage.
   */
  useEffect(() => {
    const checkForPassedPDF = async () => {
      try {
        // Check for PDF metadata stored in localStorage
        const pdfMetadata = localStorage.getItem('pdfForSchedule');
        if (pdfMetadata) {
          const metadata = JSON.parse(pdfMetadata);
          
          // Retrieve the file data from sessionStorage
          const fileData = sessionStorage.getItem('pdfFileData');
          if (fileData) {
            // Reconstruct the File object from stored data
            const response = await fetch(fileData);
            const blob = await response.blob();
            const pdfFile = new File([blob], metadata.name, { 
              type: metadata.type,
              lastModified: metadata.lastModified
            });
            
            setFile(pdfFile);
            
            // Clean up storage after retrieving the file
            sessionStorage.removeItem('pdfFileData');
            localStorage.removeItem('pdfForSchedule');
          }
        }
      } catch (err) {
        console.error('Error retrieving PDF file:', err);
      }
    };
    
    checkForPassedPDF();
  }, []);

  /**
   * Effect hook to update file when selectedFile prop changes
   */
  useEffect(() => {
    if (selectedFile) {
      setFile(selectedFile);
    }
  }, [selectedFile]);

  /**
   * Handles PDF file upload from the user
   * 
   * Updates the file state and resets schedule and error states
   * when a user selects a file through the file input.
   * 
   * @param {Event} event - The file input change event
   */
  const handleFileUpload = (event) => {
    const uploadedFile = event.target.files[0];
    if (uploadedFile) {
      setFile(uploadedFile);
      setSchedule(null);
      setError(null);
    }
  };

  /**
   * Generates a study schedule based on the uploaded PDF
   * 
   * This is the main function that:
   * 1. Prepares the PDF and parameters
   * 2. Sends them to the backend API
   * 3. Handles the response or any errors
   * 4. Updates the component state accordingly
   */
  const generateSchedule = async () => {
    if (!file) {
      setError('Please upload a PDF document first');
      return;
    }

    setLoading(true);
    setError(null);
    setSchedule(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('duration_days', studyDuration);
    formData.append('hours_per_day', hoursPerDay);

    try {
      // Get the API URL (from environment variable or use default)
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      
      console.log(`Generating schedule for ${studyDuration} days with ${hoursPerDay} hours per day`);
      
      const response = await axios.post(
        `${apiUrl}/api/generate-study-schedule`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Accept': 'application/json'
          },
          timeout: 600000 // 10 minutes timeout (AI processing can be slow)
        }
      );

      console.log('API response received:', response.data);
      
      if (response.data?.schedule && Array.isArray(response.data.schedule) && response.data.schedule.length > 0) {
        setSchedule(response.data.schedule);
      } else {
        console.error('Invalid schedule data:', response.data);
        throw new Error('Invalid schedule data received from server');
      }
    } catch (err) {
      console.error('Error generating study schedule:', err);
      let errorMessage = 'Failed to generate study schedule.';
      
      if (err.code === 'ECONNABORTED') {
        errorMessage = 'Request timed out. The server is taking too long to respond. Please try again or reduce the study duration.';
      } else if (err.response) {
        errorMessage = err.response.data?.error || 'Server error: ' + err.response.status;
      } else if (err.request) {
        errorMessage = 'No response from server. Please check if the backend is running.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
      setGeneratingNew(false);
    }
  };

  /**
   * Copies the generated schedule to the clipboard
   * 
   * Formats the schedule as text and uses the clipboard API to copy it,
   * then shows a brief confirmation message.
   */
  const copyToClipboard = () => {
    if (schedule) {
      let scheduleText = "STUDY SCHEDULE\n\n";
      
      schedule.forEach((day, index) => {
        scheduleText += `Day ${index + 1}:\n`;
        scheduleText += `Topics: ${day.topics}\n`;
        scheduleText += `Activities: ${day.activities}\n`;
        scheduleText += `Duration: ${day.duration}\n\n`;
      });
      
      navigator.clipboard.writeText(scheduleText);
      setCopied(true);
      
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    }
  };

  /**
   * Downloads the schedule as a text file
   * 
   * Creates a text file from the schedule data and triggers
   * a download in the browser.
   */
  const downloadSchedule = () => {
    if (schedule) {
      let scheduleText = "STUDY SCHEDULE\n\n";
      
      schedule.forEach((day, index) => {
        scheduleText += `Day ${index + 1}:\n`;
        scheduleText += `Topics: ${day.topics}\n`;
        scheduleText += `Activities: ${day.activities}\n`;
        scheduleText += `Duration: ${day.duration}\n\n`;
      });
      
      const blob = new Blob([scheduleText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      
      a.href = url;
      a.download = `study_schedule_${new Date().toISOString().slice(0, 10)}.txt`;
      document.body.appendChild(a);
      a.click();
      
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }
  };

  /**
   * Resets the component to generate a new schedule
   * 
   * Clears the current schedule and sets the component state
   * to allow creating a new schedule with the same PDF.
   */
  const handleGenerateNew = () => {
    setGeneratingNew(true);
    setSchedule(null);
  };
  
  /**
   * Renders a single day of the study schedule
   * 
   * Creates an expandable accordion component for each day that shows
   * the topics, activities, and duration.
   * 
   * @param {Object} day - The day's schedule data
   * @param {number} index - The index of the day (0-based)
   * @returns {JSX.Element} - The rendered day component
   */
  const renderDaySchedule = (day, index) => {
    return (
      <Accordion 
        key={index} 
        sx={{ 
          mb: 1.5,
          borderRadius: '8px !important',
          overflow: 'hidden',
          bgcolor: alpha(theme.palette.background.paper, 0.6),
          '&:before': {
            display: 'none',
          },
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandMore />}
          sx={{
            bgcolor: alpha(theme.palette.primary.dark, index % 2 === 0 ? 0.1 : 0.15),
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            <Box 
              sx={{ 
                bgcolor: theme.palette.primary.main, 
                color: 'white',
                borderRadius: '50%',
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mr: 2,
                fontWeight: 'bold',
              }}
            >
              {index + 1}
            </Box>
            <Typography variant="subtitle1" fontWeight="medium">
              Day {index + 1}: {day.topics.split(',')[0]}...
            </Typography>
            <Chip 
              size="small" 
              label={day.duration} 
              color="primary" 
              variant="outlined"
              icon={<AccessTime fontSize="small" />}
              sx={{ ml: 'auto' }}
            />
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ pt: 1 }}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                <EventNote fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
                Topics:
              </Typography>
              <Typography variant="body1" paragraph>
                {day.topics}
              </Typography>
            </Box>
            
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                <Assignment fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
                Activities:
              </Typography>
              <Typography variant="body1">
                {day.activities}
              </Typography>
            </Box>
          </Box>
        </AccordionDetails>
      </Accordion>
    );
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
                letterSpacing: '0.5px',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <SchoolOutlined sx={{ mr: 1 }} /> Study Schedule Generator
            </Typography>
            
            <Box>
              <Button 
                variant="outlined" 
                component="label" 
                size="small"
                sx={{ mr: 1 }}
              >
                {file ? 'Change PDF' : 'Upload PDF'}
                <input
                  accept="application/pdf"
                  style={{ display: 'none' }}
                  id="pdf-upload-schedule"
                  type="file"
                  onChange={handleFileUpload}
                />
              </Button>
              
              {schedule && (
                <Button 
                  variant="outlined" 
                  color="primary" 
                  size="small"
                  onClick={handleGenerateNew}
                >
                  New Schedule
                </Button>
              )}
            </Box>
          </Box>
          
          {file && !generatingNew && (
            <Box sx={{ 
              px: { xs: 1.5, sm: 2.5 },
              py: 1,
              borderBottom: '1px solid',
              borderColor: 'divider',
              bgcolor: alpha(theme.palette.primary.dark, 0.05)
            }}>
              <Chip 
                label={`PDF: ${file.name}`} 
                size="small" 
                color="primary" 
                variant="outlined"
                icon={<Description fontSize="small" />}
              />
            </Box>
          )}
          
          <Box 
            sx={{ 
              flexGrow: 1, 
              overflow: 'auto',
              p: { xs: 1.5, sm: 2.5 },
              height: 'calc(100vh - 250px)',
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
          >
            {(schedule === null || generatingNew) ? (
              <Box>
                <Typography variant="h6" color="primary.light" gutterBottom sx={{ mb: 3 }}>
                  Generate a personalized study schedule
                </Typography>
                
                {!file ? (
                  <Paper
                    elevation={0}
                    sx={{
                      p: 3,
                      borderRadius: 2,
                      border: '1px dashed',
                      borderColor: 'divider',
                      bgcolor: alpha(theme.palette.background.paper, 0.4),
                      textAlign: 'center',
                      mb: 3
                    }}
                  >
                    <BookmarkBorder sx={{ fontSize: 48, color: 'primary.main', opacity: 0.7, mb: 2 }} />
                    <Typography variant="body1" paragraph>
                      Please upload a PDF document containing the study material
                    </Typography>
                    <Button
                      variant="outlined"
                      component="label"
                    >
                      Upload PDF
                      <input
                        accept="application/pdf"
                        style={{ display: 'none' }}
                        type="file"
                        onChange={handleFileUpload}
                      />
                    </Button>
                  </Paper>
                ) : (
                  <Paper
                    elevation={0}
                    sx={{
                      p: 3,
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: alpha(theme.palette.primary.main, 0.2),
                      bgcolor: alpha(theme.palette.background.paper, 0.4),
                      mb: 3
                    }}
                  >
                    <Typography variant="subtitle1" sx={{ mb: 2 }}>
                      Configure your study schedule:
                    </Typography>
                    
                    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mb: 3 }}>
                      <TextField
                        label="Study Duration (days)"
                        type="number"
                        value={studyDuration}
                        onChange={(e) => setStudyDuration(Math.max(1, parseInt(e.target.value) || 1))}
                        fullWidth
                        size="small"
                        InputProps={{
                          inputProps: { min: 1, max: 90 },
                          startAdornment: (
                            <CalendarMonth color="primary" sx={{ mr: 1, opacity: 0.7 }} fontSize="small" />
                          ),
                        }}
                      />
                      
                      <TextField
                        label="Hours Per Day"
                        type="number"
                        value={hoursPerDay}
                        onChange={(e) => setHoursPerDay(Math.max(0.5, parseFloat(e.target.value) || 0.5))}
                        fullWidth
                        size="small"
                        InputProps={{
                          inputProps: { min: 0.5, max: 12, step: 0.5 },
                          startAdornment: (
                            <Schedule color="primary" sx={{ mr: 1, opacity: 0.7 }} fontSize="small" />
                          ),
                        }}
                      />
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={generateSchedule}
                        disabled={loading}
                        sx={{ minWidth: 200 }}
                      >
                        {loading ? <CircularProgress size={24} color="inherit" /> : 'Generate Schedule'}
                      </Button>
                    </Box>
                  </Paper>
                )}
                
                {error && (
                  <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
                    {error}
                  </Alert>
                )}
                
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: alpha(theme.palette.info.main, 0.2),
                    bgcolor: alpha(theme.palette.info.main, 0.05),
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                    <Info color="info" sx={{ mr: 2, mt: 0.5 }} />
                    <Box>
                      <Typography variant="subtitle2" color="info.light" gutterBottom>
                        How does this work?
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        This tool analyzes your PDF document using AI to create a personalized study schedule.
                        The schedule is tailored to your available study time and organizes the content
                        in a logical progression to optimize your learning experience.
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              </Box>
            ) : (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6" color="primary.light">
                    Your {studyDuration}-Day Study Schedule
                  </Typography>
                  
                  <Box>
                    <Tooltip title={copied ? "Copied!" : "Copy to clipboard"}>
                      <IconButton onClick={copyToClipboard} color={copied ? "success" : "default"}>
                        <ContentCopy />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Download as text file">
                      <IconButton onClick={downloadSchedule} color="primary">
                        <Download />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
                
                <Box sx={{ mb: 3 }}>
                  {schedule.map((day, index) => renderDaySchedule(day, index))}
                </Box>
              </Box>
            )}
          </Box>
        </Paper>
      </Box>
    </ThemeProvider>
  );
};

export default StudyScheduleGenerator; 