/**
 * QuizBot Application - Main Component
 * 
 * PURPOSE:
 * This file serves as the primary entry point for the QuizBot application.
 * It sets up the overall layout, navigation, and routing between different components.
 * 
 * KEY FEATURES:
 * - Navigation bar with links to different sections (Quiz, Ask Questions, Study Planner)
 * - User authentication (login/logout) system
 * - Responsive layout that works on both mobile and desktop
 * - Routing between different features
 * 
 * INPUTS:
 * - User interaction (clicks, navigation)
 * - User authentication data (from localStorage)
 * 
 * OUTPUTS:
 * - Rendered application interface
 * - Navigation between different features
 * - User authentication state
 */
import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { 
	Box, 
	AppBar, 
	Toolbar, 
	Button, 
	Container, 
	Typography, 
	Fade, 
	IconButton, 
	useTheme, 
	useMediaQuery, 
	Menu,
	MenuItem,
	Avatar,
	Divider,
	Tooltip,
	List,
	ListItem,
	ListItemIcon,
	ListItemText,
	Drawer,
	Badge
} from '@mui/material';
import {
	Menu as MenuIcon,
	Quiz as QuizIcon,
	QuestionAnswer as QuestionAnswerIcon,
	Dashboard as DashboardIcon,
	Add as AddIcon,
	Person as PersonIcon,
	Logout as LogoutIcon,
	Login as LoginIcon,
	Create as CreateIcon,
	School as SchoolIcon
} from '@mui/icons-material';

// Import application components
import QuizFromPDF from './components/QuizFromPDF';
import AskPDFQuestions from './components/AskPDFQuestions';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import CustomQuizCreator from './components/CustomQuizCreator';
import CustomQuizList from './components/CustomQuizList';
import StudyScheduleGenerator from './components/StudyScheduleGenerator';

/**
 * Main App Component
 * 
 * This component manages:
 * - User authentication state
 * - Navigation between different features
 * - Responsive layout (mobile/desktop)
 * - Modal dialogs for login and quiz creation
 * 
 * @returns {JSX.Element} The rendered application
 */
function App() {
	// State management for various UI elements and user data
	const [mobileOpen, setMobileOpen] = useState(false);          // Controls mobile drawer open/close
	const [user, setUser] = useState(null);                       // Stores logged-in user information
	const [loginOpen, setLoginOpen] = useState(false);            // Controls login dialog visibility
	const [createQuizOpen, setCreateQuizOpen] = useState(false);  // Controls quiz creation dialog visibility
	const [anchorEl, setAnchorEl] = useState(null);               // For user dropdown menu
	
	// MUI hooks for responsive design
	const theme = useTheme();
	const isMobile = useMediaQuery(theme.breakpoints.down('sm'));  // Check if device is mobile
	const location = useLocation();  // For highlighting active navigation link
	
	/**
	 * Check for existing user in localStorage on component mount
	 * This allows the user to remain logged in across page refreshes
	 */
	useEffect(() => {
		const storedUser = localStorage.getItem('user');
		if (storedUser) {
			try {
				setUser(JSON.parse(storedUser));
			} catch (err) {
				console.error('Error parsing stored user data:', err);
				localStorage.removeItem('user');
			}
		}
	}, []);
	
	/**
	 * Toggles the mobile navigation drawer open/closed
	 */
	const handleDrawerToggle = () => {
		setMobileOpen(!mobileOpen);
	};
	
	/**
	 * Opens the user account menu
	 * @param {Event} event - The click event
	 */
	const handleUserMenuOpen = (event) => {
		setAnchorEl(event.currentTarget);
	};
	
	/**
	 * Closes the user account menu
	 */
	const handleUserMenuClose = () => {
		setAnchorEl(null);
	};
	
	/**
	 * Handles successful user login
	 * @param {Object} userData - User data returned from login API
	 */
	const handleLogin = (userData) => {
		setUser(userData);
		setLoginOpen(false);
	};
	
	/**
	 * Handles user logout
	 * Clears user data from state and localStorage
	 */
	const handleLogout = () => {
		setUser(null);
		localStorage.removeItem('user');
		handleUserMenuClose();
	};
	
	/**
	 * Navigation items configuration
	 * Each item defines a route in the application with its path, label, and icon
	 */
	const navItems = [
		{ path: '/', label: 'Quiz', icon: <QuizIcon /> },
		{ path: '/ask', label: 'Ask Questions', icon: <QuestionAnswerIcon /> },
		{ path: '/study-planner', label: 'Study Planner', icon: <SchoolIcon /> },
		{ path: '/dashboard', label: 'Dashboard', icon: <DashboardIcon />, requiredLogin: true }
	];
	
	// Filter navigation items based on login status (don't show login-required items to users who aren't logged in)
	const filteredNavItems = navItems.filter(item => !item.requiredLogin || (item.requiredLogin && user));
	
	/**
	 * Content for the mobile navigation drawer
	 * Contains navigation links and user login/logout options
	 */
	const drawerContent = (
		<Box sx={{ width: 250, pt: 5 }}>
			{/* Navigation Links */}
			<List>
				{filteredNavItems.map((item) => (
					<ListItem
						button
						key={item.path}
						component={Link}
						to={item.path}
						selected={location.pathname === item.path}
						onClick={handleDrawerToggle}
					>
						<ListItemIcon>{item.icon}</ListItemIcon>
						<ListItemText primary={item.label} />
					</ListItem>
				))}
			</List>
			<Divider />
			{/* User Options */}
			<List>
				{user ? (
					<>
						<ListItem>
							<ListItemIcon><PersonIcon /></ListItemIcon>
							<ListItemText primary={user.username} />
						</ListItem>
						<ListItem button onClick={handleLogout}>
							<ListItemIcon><LogoutIcon /></ListItemIcon>
							<ListItemText primary="Logout" />
						</ListItem>
					</>
				) : (
					<ListItem button onClick={() => setLoginOpen(true)}>
						<ListItemIcon><LoginIcon /></ListItemIcon>
						<ListItemText primary="Login" />
					</ListItem>
				)}
			</List>
		</Box>
	);

	return (
		<Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
			{/* App Header/Navigation Bar */}
			<AppBar position="fixed" elevation={0} sx={{ 
				background: 'rgba(26, 32, 39, 0.8)',
				backdropFilter: 'blur(10px)',
			}}>
				<Container maxWidth="lg">
					<Toolbar sx={{ justifyContent: 'space-between' }}>
						{/* Application Logo/Title */}
						<Typography variant="h6" component="div" sx={{ 
							flexGrow: 0,
							fontWeight: 700,
							background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
							WebkitBackgroundClip: 'text',
							WebkitTextFillColor: 'transparent'
						}}>
							QuizBot
						</Typography>

						{/* Mobile: Show Menu Icon, Desktop: Show Navigation Links */}
						{isMobile ? (
							<IconButton
								color="inherit"
								aria-label="open drawer"
								edge="start"
								onClick={handleDrawerToggle}
							>
								<MenuIcon />
							</IconButton>
						) : (
							<Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
								{/* Navigation Links */}
								{filteredNavItems.map((item) => (
									<Button
										key={item.path}
										component={Link}
										to={item.path}
										color="inherit"
										startIcon={item.icon}
										sx={{
											position: 'relative',
											'&::after': {
												content: '""',
												position: 'absolute',
												bottom: 0,
												left: 0,
												width: location.pathname === item.path ? '100%' : '0%',
												height: '2px',
												backgroundColor: 'primary.main',
												transition: 'width 0.3s ease-in-out',
											},
											'&:hover::after': {
												width: '100%',
											},
										}}
									>
										{item.label}
									</Button>
								))}
								
								{/* User Actions: Create Quiz + Account Menu (when logged in) or Login Button */}
								{user ? (
									<>
										<Tooltip title="Create Quiz">
											<IconButton 
												color="inherit"
												onClick={() => setCreateQuizOpen(true)}
											>
												<AddIcon />
											</IconButton>
										</Tooltip>
										
										<Box>
											<Tooltip title="Account settings">
												<IconButton
													onClick={handleUserMenuOpen}
													size="small"
													sx={{ ml: 1 }}
													aria-controls={Boolean(anchorEl) ? 'account-menu' : undefined}
													aria-haspopup="true"
													aria-expanded={Boolean(anchorEl) ? 'true' : undefined}
												>
													<Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
														{user.username ? user.username.charAt(0).toUpperCase() : 'U'}
													</Avatar>
												</IconButton>
											</Tooltip>
											{/* User Account Dropdown Menu */}
											<Menu
												anchorEl={anchorEl}
												id="account-menu"
												open={Boolean(anchorEl)}
												onClose={handleUserMenuClose}
												PaperProps={{
													elevation: 0,
													sx: {
														overflow: 'visible',
														filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
														mt: 1.5,
														'& .MuiAvatar-root': {
															width: 32,
															height: 32,
															ml: -0.5,
															mr: 1,
														},
														'&:before': {
															content: '""',
															display: 'block',
															position: 'absolute',
															top: 0,
															right: 14,
															width: 10,
															height: 10,
															bgcolor: 'background.paper',
															transform: 'translateY(-50%) rotate(45deg)',
															zIndex: 0,
														},
													},
												}}
												transformOrigin={{ horizontal: 'right', vertical: 'top' }}
												anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
											>
												<MenuItem component={Link} to="/dashboard" onClick={handleUserMenuClose}>
													<ListItemIcon>
														<DashboardIcon fontSize="small" />
													</ListItemIcon>
													My Dashboard
												</MenuItem>
												<Divider />
												<MenuItem onClick={handleLogout}>
													<ListItemIcon>
														<LogoutIcon fontSize="small" />
													</ListItemIcon>
													Logout
												</MenuItem>
											</Menu>
										</Box>
									</>
								) : (
									<Button 
										variant="outlined" 
										color="inherit" 
										onClick={() => setLoginOpen(true)}
										startIcon={<LoginIcon />}
									>
										Login
									</Button>
								)}
							</Box>
						)}
					</Toolbar>
				</Container>
			</AppBar>
			
			{/* Mobile Navigation Drawer - only visible on small screens */}
			<Drawer
				variant="temporary"
				open={mobileOpen}
				onClose={handleDrawerToggle}
				ModalProps={{
					keepMounted: true, // Better mobile performance
				}}
				sx={{
					display: { xs: 'block', sm: 'none' }, // Only show on mobile
					'& .MuiDrawer-paper': { boxSizing: 'border-box', width: 250 },
				}}
			>
				{drawerContent}
			</Drawer>

			{/* Main Content Area */}
			<Box component="main" sx={{ 
				flexGrow: 1, 
				pt: { xs: 8, sm: 10 }, // Padding top to accommodate fixed AppBar
				pb: 4,
				background: theme.palette.background.default
			}}>
				<Container maxWidth="lg">
					<Fade in timeout={1000}>
						<Box>
							{/* Route Configuration - Maps URLs to Components */}
							<Routes>
								<Route path="/" element={<QuizFromPDF user={user} />} />
								<Route path="/ask" element={<AskPDFQuestions />} />
								<Route path="/study-planner" element={<StudyScheduleGenerator />} />
								<Route 
									path="/dashboard" 
									element={user ? <Dashboard userId={user.id} /> : <Login onLogin={handleLogin} open={true} onClose={() => {}} />} 
								/>
								<Route 
									path="/custom-quizzes" 
									element={user ? <CustomQuizList userId={user.id} /> : <Login onLogin={handleLogin} open={true} onClose={() => {}} />} 
								/>
							</Routes>
						</Box>
					</Fade>
				</Container>
			</Box>
			
			{/* Global Modals */}
			{/* Login Dialog */}
			<Login 
				onLogin={handleLogin} 
				open={loginOpen} 
				onClose={() => setLoginOpen(false)} 
			/>
			
			{/* Create Quiz Dialog - only available when logged in */}
			{user && (
				<CustomQuizCreator 
					userId={user.id}
					open={createQuizOpen}
					onClose={() => setCreateQuizOpen(false)}
				/>
			)}
		</Box>
	);
}

export default App;
