import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import App from './App';


const theme = createTheme({
	palette: {
		mode: 'dark',
		primary: {
			main: '#2196f3',
			light: '#4dabf5',
			dark: '#1769aa',
		},
		secondary: {
			main: '#f50057',
			light: '#f73378',
			dark: '#ab003c',
		},
		background: {
			default: '#0a1929',
			paper: '#1a2027',
		},
	},
	typography: {
		fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
		h4: {
			fontWeight: 600,
			letterSpacing: '0.02em',
		},
	},
	components: {
		MuiButton: {
			styleOverrides: {
				root: {
					borderRadius: 8,
					textTransform: 'none',
					padding: '10px 20px',
					transition: 'all 0.3s ease-in-out',
					'&:hover': {
						transform: 'translateY(-2px)',
						boxShadow: '0 5px 15px rgba(0,0,0,0.3)',
					},
				},
			},
		},
		MuiPaper: {
			styleOverrides: {
				root: {
					borderRadius: 12,
					transition: 'all 0.3s ease-in-out',
					'&:hover': {
						transform: 'translateY(-2px)',
						boxShadow: '0 8px 20px rgba(0,0,0,0.2)',
					},
				},
			},
		},
	},
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
	<React.StrictMode>
		<ThemeProvider theme={theme}>
			<CssBaseline />
			<BrowserRouter>
				<App />
			</BrowserRouter>
		</ThemeProvider>
	</React.StrictMode>
);