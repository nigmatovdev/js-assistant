import { createTheme } from '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Palette {
    glass: { bg: string; strongBg: string; border: string; glow: string; shadow: string };
  }
  interface PaletteOptions {
    glass?: { bg: string; strongBg: string; border: string; glow: string; shadow: string };
  }
}

const shape   = { borderRadius: 16 };
const typography = {
  fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  h5: { fontWeight: 700, letterSpacing: -0.5 },
  h6: { fontWeight: 600 },
  button: { textTransform: 'none' as const, fontWeight: 600 },
};

export const lightTheme = createTheme({
  shape,
  typography,
  palette: {
    mode: 'light',
    primary:    { main: '#5B8CFF', dark: '#3B6EE0', light: '#93B4FF', contrastText: '#fff' },
    secondary:  { main: '#7C4DFF', contrastText: '#fff' },
    background: { default: '#EEF2FF', paper: 'rgba(255,255,255,0.82)' },
    text:       { primary: '#111827', secondary: '#4B5563' },
    divider:    'rgba(0,0,0,0.06)',
    glass: {
      bg:       'rgba(255,255,255,0.62)',
      strongBg: 'rgba(255,255,255,0.88)',
      border:   'rgba(255,255,255,0.72)',
      glow:     'rgba(91,140,255,0.18)',
      shadow:   '0 8px 32px rgba(91,140,255,0.1), 0 1px 0 rgba(255,255,255,0.8) inset',
    },
  },
  components: {
    MuiPaper:  { styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiButton: { styleOverrides: { root: { borderRadius: 12 } } },
    MuiChip:   { styleOverrides: { root: { borderRadius: 10 } } },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          background: 'rgba(255,255,255,0.88)',
          border: '1px solid rgba(255,255,255,0.6)',
          borderRadius: '20px',
          boxShadow: '0 24px 80px rgba(0,0,0,0.18)',
        },
      },
    },
  },
});

export const darkTheme = createTheme({
  shape,
  typography,
  palette: {
    mode: 'dark',
    primary:    { main: '#5B8CFF', dark: '#4070E0', light: '#93B4FF', contrastText: '#fff' },
    secondary:  { main: '#9C6BFF', contrastText: '#fff' },
    background: { default: '#08090D', paper: 'rgba(18,20,30,0.78)' },
    text:       { primary: '#F5F7FA', secondary: '#A8B0C2' },
    divider:    'rgba(255,255,255,0.07)',
    glass: {
      bg:       'rgba(18,20,30,0.68)',
      strongBg: 'rgba(14,16,26,0.90)',
      border:   'rgba(255,255,255,0.08)',
      glow:     'rgba(124,77,255,0.28)',
      shadow:   '0 8px 32px rgba(0,0,0,0.55), 0 1px 0 rgba(255,255,255,0.06) inset',
    },
  },
  components: {
    MuiPaper:  { styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiButton: { styleOverrides: { root: { borderRadius: 12 } } },
    MuiChip:   { styleOverrides: { root: { borderRadius: 10 } } },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          background: 'rgba(14,16,26,0.90)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '20px',
          boxShadow: '0 24px 80px rgba(0,0,0,0.55)',
        },
      },
    },
  },
});
