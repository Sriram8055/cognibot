/**
 * Dashboard Component
 * 
 * PURPOSE:
 * This component provides users with visualization and analytics of their
 * quiz performance over time. It displays statistics, charts, and historical
 * data about the user's learning progress.
 * 
 * KEY FEATURES:
 * - Overview of quiz performance metrics
 * - History of completed quizzes
 * - Topic-based performance analysis
 * - Visual charts and graphs for data visualization
 * - Tabbed interface for different views
 * 
 * INPUTS:
 * - User ID (from authentication)
 * - Quiz history data (from backend API)
 * 
 * OUTPUTS:
 * - Performance statistics (total quizzes, average score, etc.)
 * - Performance trend charts
 * - Quiz history table
 * - Topic performance breakdown
 * 
 * TECHNICAL DETAILS:
 * - Requires user authentication (only available to logged-in users)
 * - Uses Recharts library for data visualization
 * - Fetches performance data from the backend API
 * - Implements tabbed navigation for different analysis views
 */
import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  CircularProgress, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Card,
  CardContent,
  Divider,
  Tabs,
  Tab,
  Alert
} from '@mui/material';
import { 
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot 
} from '@mui/lab';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import axios from 'axios';

const Dashboard = ({ userId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quizHistory, setQuizHistory] = useState([]);
  const [performance, setPerformance] = useState(null);
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    if (!userId) {
      setError('Please login to view your dashboard');
      setLoading(false);
      return;
    }

    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch quiz history
        const historyResponse = await axios.get(`http://localhost:5000/api/quiz/history?user_id=${userId}`);
        
        // Fetch performance metrics
        const performanceResponse = await axios.get(`http://localhost:5000/api/quiz/performance?user_id=${userId}`);
        
        setQuizHistory(historyResponse.data.history || []);
        setPerformance(performanceResponse.data || null);
        
        setLoading(false);
      } catch (err) {
        setError('Failed to load dashboard data. Please try again later.');
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [userId]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
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
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!performance || quizHistory.length === 0) {
    return (
      <Box sx={{ mt: 2 }}>
        <Alert severity="info">
          You haven't taken any quizzes yet. Complete a quiz to see your performance data.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h4" gutterBottom align="center" sx={{ mb: 4 }}>
        Your Learning Dashboard
      </Typography>

      <Tabs value={tabValue} onChange={handleTabChange} centered sx={{ mb: 3 }}>
        <Tab label="Overview" />
        <Tab label="History" />
        <Tab label="Topic Analysis" />
      </Tabs>

      {/* Overview Tab */}
      <Box role="tabpanel" hidden={tabValue !== 0}>
        {tabValue === 0 && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Card elevation={3}>
                <CardContent>
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    Total Quizzes
                  </Typography>
                  <Typography variant="h3">
                    {performance.overall.total_quizzes}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card elevation={3}>
                <CardContent>
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    Average Score
                  </Typography>
                  <Typography variant="h3">
                    {performance.overall.avg_score ? performance.overall.avg_score.toFixed(1) + '%' : 'N/A'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card elevation={3}>
                <CardContent>
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    Total Correct Answers
                  </Typography>
                  <Typography variant="h3">
                    {performance.overall.total_correct} / {performance.overall.total_questions}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Paper elevation={3} sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Performance Trend
                </Typography>
                <Box sx={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={performance.trend.slice().reverse()}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tick={false}
                        label={{ value: 'Recent Quizzes', position: 'insideBottom', offset: -5 }}
                      />
                      <YAxis 
                        domain={[0, 100]}
                        label={{ value: 'Score (%)', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip 
                        formatter={(value) => [`${value.toFixed(1)}%`, 'Score']}
                        labelFormatter={(label) => `Quiz on ${new Date(label).toLocaleDateString()}`}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="percentage" 
                        name="Score" 
                        stroke="#8884d8" 
                        activeDot={{ r: 8 }} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        )}
      </Box>

      {/* History Tab */}
      <Box role="tabpanel" hidden={tabValue !== 1}>
        {tabValue === 1 && (
          <Paper elevation={3}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Topic</TableCell>
                    <TableCell>Score</TableCell>
                    <TableCell>Time Taken</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {quizHistory.map((quiz) => (
                    <TableRow key={quiz.id}>
                      <TableCell>
                        {new Date(quiz.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{quiz.quiz_topic || 'General'}</TableCell>
                      <TableCell>
                        {quiz.score}/{quiz.total_questions} ({quiz.percentage.toFixed(1)}%)
                      </TableCell>
                      <TableCell>
                        {quiz.time_taken ? `${Math.floor(quiz.time_taken / 60)}m ${quiz.time_taken % 60}s` : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}
      </Box>

      {/* Topic Analysis Tab */}
      <Box role="tabpanel" hidden={tabValue !== 2}>
        {tabValue === 2 && (
          <Paper elevation={3} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Topic Performance
            </Typography>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={performance.topics}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="topic" 
                    tick={{ angle: -45, textAnchor: 'end' }}
                    height={70}
                  />
                  <YAxis 
                    domain={[0, 100]}
                    label={{ value: 'Average Score (%)', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip formatter={(value) => [`${value.toFixed(1)}%`, 'Average Score']} />
                  <Legend />
                  <Bar dataKey="avg_score" name="Average Score" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        )}
      </Box>
    </Box>
  );
};

export default Dashboard; 