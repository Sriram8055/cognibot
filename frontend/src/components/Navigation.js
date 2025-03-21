import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';

function Navigation() {
	const navigate = useNavigate();

	return (
		<AppBar position="static">
			<Toolbar>
				<Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
					QuizBot
				</Typography>
				<Box>
					<Button color="inherit" onClick={() => navigate('/')}>
						Study Schedule
					</Button>
					<Button color="inherit" onClick={() => navigate('/quiz')}>
						Quiz from PDF
					</Button>
					<Button color="inherit" onClick={() => navigate('/ask')}>
						Ask PDF Questions
					</Button>
				</Box>
			</Toolbar>
		</AppBar>
	);
}

export default Navigation;