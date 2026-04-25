import AppBar        from '@mui/material/AppBar';
import Toolbar       from '@mui/material/Toolbar';
import Typography    from '@mui/material/Typography';
import IconButton    from '@mui/material/IconButton';
import Tooltip       from '@mui/material/Tooltip';
import Box           from '@mui/material/Box';
import HistoryIcon   from '@mui/icons-material/History';
import AddIcon       from '@mui/icons-material/Add';
import SearchIcon    from '@mui/icons-material/Search';
import SettingsIcon  from '@mui/icons-material/Settings';
import DarkModeIcon  from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import GavelIcon     from '@mui/icons-material/Gavel';

interface TopBarProps {
  darkMode: boolean;
  onToggleTheme: () => void;
  onOpenHistory: () => void;
  onNewChat: () => void;
  onOpenSearch: () => void;
}

export default function TopBar({
  darkMode,
  onToggleTheme,
  onOpenHistory,
  onNewChat,
  onOpenSearch,
}: TopBarProps) {
  return (
    <AppBar
      position="static"
      elevation={0}
      sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper', color: 'text.primary' }}
    >
      <Toolbar>
        <GavelIcon sx={{ mr: 1, color: 'primary.main' }} />
        <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: 0.5, flexGrow: 1 }}>
          JK AI
        </Typography>

        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="Tarix">
            <IconButton onClick={onOpenHistory} color="inherit">
              <HistoryIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Yangi chat">
            <IconButton onClick={onNewChat} color="inherit">
              <AddIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Chatda qidirish">
            <IconButton onClick={onOpenSearch} color="inherit">
              <SearchIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Sozlamalar">
            <IconButton color="inherit" disabled>
              <SettingsIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title={darkMode ? "Yorug' rejim" : "Qorong'u rejim"}>
            <IconButton onClick={onToggleTheme} color="inherit">
              {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Tooltip>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
