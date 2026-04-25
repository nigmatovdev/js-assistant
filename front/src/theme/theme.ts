import { createTheme } from '@mui/material/styles';

const shared = {
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: '"Inter", "Roboto", sans-serif',
    h3: { fontWeight: 800, letterSpacing: -1 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 600 },
    button: { textTransform: 'none' as const, fontWeight: 600 },
  },
};

export const lightTheme = createTheme({
  ...shared,
  palette: {
    mode: 'light',
    primary:    { main: '#2563EB', dark: '#1D4ED8', light: '#60A5FA', contrastText: '#fff' },
    secondary:  { main: '#7C3AED', contrastText: '#fff' },
    background: { default: '#F1F5F9', paper: '#FFFFFF' },
    text:       { primary: '#0F172A', secondary: '#475569' },
    divider:    'rgba(0,0,0,0.07)',
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 10 },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 8 },
      },
    },
  },
});

export const darkTheme = createTheme({
  ...shared,
  palette: {
    mode: 'dark',
    primary:    { main: '#60A5FA', dark: '#3B82F6', light: '#93C5FD', contrastText: '#0F172A' },
    secondary:  { main: '#A78BFA', contrastText: '#0F172A' },
    background: { default: '#0F1117', paper: '#1E2130' },
    text:       { primary: '#F1F5F9', secondary: '#94A3B8' },
    divider:    'rgba(255,255,255,0.07)',
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 10 },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 8 },
      },
    },
  },
});
