/**
 * Navigation items configuration
 * Each item defines a route in the application with its path, label, and icon
 */
const navItems = [
    { path: '/', label: 'Quiz', icon: <QuizIcon /> },
    { path: '/ask', label: 'Ask Questions', icon: <QuestionAnswerIcon /> },
    { path: '/study-planner', label: 'Study Planner', icon: <SchoolIcon /> },
    { path: '/dashboard', label: 'Dashboard', icon: <DashboardIcon />, requiredLogin: true },
    { path: '/custom-quizzes', label: 'Custom Quizzes', icon: <CreateIcon />, requiredLogin: true }
]; 