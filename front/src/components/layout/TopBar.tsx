import AppBar       from '@mui/material/AppBar';
import Toolbar       from '@mui/material/Toolbar';
import Typography    from '@mui/material/Typography';
import IconButton    from '@mui/material/IconButton';
import Tooltip       from '@mui/material/Tooltip';
import Box           from '@mui/material/Box';
import { useTheme, useMediaQuery } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import MenuIcon        from '@mui/icons-material/Menu';
import DarkModeIcon    from '@mui/icons-material/DarkMode';
import LightModeIcon   from '@mui/icons-material/LightMode';
import GavelIcon       from '@mui/icons-material/Gavel';
import AddCommentIcon  from '@mui/icons-material/AddComment';
import { useSessionStore } from '../../store/sessionStore';

interface TopBarProps {
  darkMode:        boolean;
  onToggleTheme:   () => void;
  onToggleSidebar: () => void;
  onNewChat:       () => void;
}

export default function TopBar({ darkMode, onToggleTheme, onToggleSidebar, onNewChat }: TopBarProps) {
  const theme      = useTheme();
  const isDark     = theme.palette.mode === 'dark';
  const isDesktop  = useMediaQuery('(min-width:900px)');
  const { sessions, activeId } = useSessionStore();
  const activeSession = sessions.find(s => s.id === activeId);

  const btnSx = {
    color: 'text.secondary', borderRadius: '10px', border: '1px solid',
    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    '&:hover': { color: 'primary.main', borderColor: 'primary.main', bgcolor: isDark ? 'rgba(91,140,255,0.1)' : 'rgba(91,140,255,0.07)' },
    transition: 'all 0.2s',
  };

  return (
    <AppBar
      position="static"
      elevation={0}
      sx={{
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        bgcolor: isDark ? 'rgba(8,9,13,0.72)' : 'rgba(238,242,255,0.78)',
        color: 'text.primary',
        borderBottom: '1px solid',
        borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
      }}
    >
      <Toolbar sx={{ minHeight: { xs: 56, sm: 58 }, position: 'relative', gap: 0.75 }}>

        {/* Left: sidebar toggle — always visible */}
        <Tooltip title="Menyu">
          <IconButton onClick={onToggleSidebar} size="small" edge="start" sx={btnSx}>
            <MenuIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Tooltip>

        {/* Centered: logo or session title */}
        <Box sx={{
          position: 'absolute', left: '50%', transform: 'translateX(-50%)',
          display: 'flex', alignItems: 'center', gap: 1.25, pointerEvents: 'none',
        }}>
          <AnimatePresence mode="wait">
            {activeSession ? (
              <motion.div
                key="title"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                <Typography
                  variant="body2" fontWeight={600} noWrap
                  sx={{ maxWidth: { xs: 160, sm: 300 }, fontSize: '0.88rem', color: 'text.primary' }}
                >
                  {activeSession.title ?? 'Nomsiz suhbat'}
                </Typography>
              </motion.div>
            ) : (
              <motion.div
                key="logo"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                style={{ display: 'flex', alignItems: 'center', gap: 10 }}
              >
                <Box sx={{
                  width: 32, height: 32, borderRadius: '10px',
                  background: 'linear-gradient(135deg, #5B8CFF 0%, #7C4DFF 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 14px rgba(91,140,255,0.38)',
                }}>
                  <GavelIcon sx={{ fontSize: 17, color: '#fff' }} />
                </Box>
                <Typography variant="h6" sx={{
                  fontWeight: 800, letterSpacing: -0.5, fontSize: '1.05rem',
                  background: 'linear-gradient(135deg, #5B8CFF 0%, #7C4DFF 100%)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>
                  JK AI
                </Typography>
              </motion.div>
            )}
          </AnimatePresence>
        </Box>

        {/* Right side actions */}
        <Box sx={{ flex: 1 }} />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          {/* <Tooltip title="Yangi suhbat (Ctrl+Shift+O)">
            <IconButton onClick={onNewChat} size="small" sx={btnSx}>
              <AddCommentIcon sx={{ fontSize: 17 }} />
            </IconButton>
          </Tooltip> */}

          <Tooltip title={darkMode ? "Yorug' rejim" : "Qorong'u rejim"}>
            <IconButton
              onClick={onToggleTheme} size="small"
              sx={{ ...btnSx, bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', px: 1.25 }}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={darkMode ? 'dark' : 'light'}
                  initial={{ rotate: -25, opacity: 0, scale: 0.7 }}
                  animate={{ rotate: 0, opacity: 1, scale: 1 }}
                  exit={{ rotate: 25, opacity: 0, scale: 0.7 }}
                  transition={{ duration: 0.25 }}
                >
                  {darkMode
                    ? <LightModeIcon sx={{ fontSize: 16 }} />
                    : <DarkModeIcon  sx={{ fontSize: 16 }} />
                  }
                </motion.div>
              </AnimatePresence>
            </IconButton>
          </Tooltip>
        </Box>

      </Toolbar>
    </AppBar>
  );
}
