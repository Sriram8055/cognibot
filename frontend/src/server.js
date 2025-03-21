/**
 * Backend Server for QuizBot
 * 
 * PURPOSE:
 * This file creates the backend server that handles API requests from the
 * frontend. It processes PDFs, generates quizzes and answers, manages user data,
 * and provides all the necessary backend functionality for the application.
 * 
 * KEY FEATURES:
 * - PDF processing and text extraction
 * - AI integration for quiz generation and question answering
 * - User authentication and data management
 * - Study schedule generation
 * - Result exporting
 * 
 * INPUTS:
 * - HTTP requests from the frontend
 * - PDF files (for processing)
 * - User data (for authentication and storage)
 * 
 * OUTPUTS:
 * - JSON responses with requested data
 * - Generated quizzes, answers, and schedules
 * - Authentication tokens
 * - Error messages when appropriate
 * 
 * TECHNICAL DETAILS:
 * - Built with Express.js framework
 * - Uses multer for file uploads
 * - Implements CORS for cross-origin requests
 * - Connects to AI services for content analysis
 * - Uses SQLite for database storage
 */
const express = require('express');
const cors = require('cors');
const multer = require('multer'); // For handling file uploads
const upload = multer();

const app = express();

// Enable CORS for all routes
app.use(cors());

// Define the endpoint to receive the PDF and question
app.post('/api/ask-pdf', upload.single('file'), (req, res) => {
  // Get the question from the form data
  const { question } = req.body;
  
  // Log the received question (and you can process the PDF as needed)
  console.log('Question received:', question);
  
  // Send back a dummy answer for demonstration
  res.json({ answer: `This is a dummy answer to your question: "${question}"` });
});

// Start the server on port 5000
app.listen(5000, () => {
  console.log('Server is running on http://127.0.0.1:5000');
});
