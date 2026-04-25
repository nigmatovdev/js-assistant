import AppBar          from '@mui/material/AppBar';
import Toolbar          from '@mui/material/Toolbar';
import Typography       from '@mui/material/Typography';
import IconButton       from '@mui/material/IconButton';
import Tooltip          from '@mui/material/Tooltip';
import Box              from '@mui/material/Box';
import Divider          from '@mui/material/Divider';
import HistoryIcon      from '@mui/icons-material/History';
import AddCommentIcon   from '@mui/icons-material/AddComment';
import SearchIcon       from '@mui/icons-material/Search';
import DarkModeIcon     from '@mui/icons-material/DarkMode';
import LightModeIcon    from '@mui/icons-material/LightMode';
import GavelIcon        from '@mui/icons-material/Gavel';

interface TopBarProps {
  darkMode: boolean;
  onToggleTheme: () => void;
  onOpenHistory: () => void;
  onNewChat: () => void;
  onOpenSearch: () => void;
}

export default function TopBar({ darkMode, onToggleTheme, onOpenHistory, onNewChat, onOpenSearch }: TopBarProps) {
  return (
    <AppBar
      position="static"
      elevation={0}
      sx={{
        bgcolor: 'background.paper',
        color: 'text.primary',
        borderBottom: 1,
        borderColor: 'divider',
      }}
    >
      <Toolbar sx={{ gap: 1, minHeight: { xs: 56, sm: 64 } }}>
        {/* Logo */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexGrow: 1 }}>
          <Box
            sx={{
              width: 36, height: 36, borderRadius: 2.5,
              background: 'linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <GavelIcon sx={{ fontSize: 20, color: '#fff' }} />
          </Box>
          <Box>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 800,
                fontSize: '1.1rem',
                lineHeight: 1.1,
                background: 'linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              JK AI
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1, display: 'block', fontSize: '0.65rem' }}>
              Jinoyat Kodeksi Yordamchi
            </Typography>
          </Box>
        </Box>

        {/* Actions */}
        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

        <Tooltip title="Suhbat tarixi">
          <IconButton onClick={onOpenHistory} size="medium" sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main', bgcolor: 'action.hover' } }}>
            <HistoryIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title="Yangi chat">
          <IconButton onClick={onNewChat} size="medium" sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main', bgcolor: 'action.hover' } }}>
            <AddCommentIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title="Chatda qidirish">
          <IconButton onClick={onOpenSearch} size="medium" sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main', bgcolor: 'action.hover' } }}>
            <SearchIcon />
          </IconButton>
        </Tooltip>

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

        <Tooltip title={darkMode ? "Yorug' rejim" : "Qorong'u rejim"}>
          <IconButton
            onClick={onToggleTheme}
            size="medium"
            sx={{
              color: 'text.secondary',
              bgcolor: 'action.hover',
              border: 1,
              borderColor: 'divider',
              '&:hover': { color: 'primary.main' },
            }}
          >
            {darkMode ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
      </Toolbar>
    </AppBar>
  );
}
