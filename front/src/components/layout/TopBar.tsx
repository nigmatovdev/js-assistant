import AppBar        from '@mui/material/AppBar';
import Toolbar        from '@mui/material/Toolbar';
import Typography     from '@mui/material/Typography';
import IconButton     from '@mui/material/IconButton';
import Tooltip        from '@mui/material/Tooltip';
import Box            from '@mui/material/Box';
import MenuIcon       from '@mui/icons-material/Menu';
import DarkModeIcon   from '@mui/icons-material/DarkMode';
import LightModeIcon  from '@mui/icons-material/LightMode';
import GavelIcon      from '@mui/icons-material/Gavel';

interface TopBarProps {
  darkMode:        boolean;
  onToggleTheme:   () => void;
  onToggleSidebar: () => void;
}

export default function TopBar({ darkMode, onToggleTheme, onToggleSidebar }: TopBarProps) {
  return (
    <AppBar
      position="static"
      elevation={0}
      sx={{
        bgcolor: 'background.paper',
        color:   'text.primary',
        borderBottom: 1,
        borderColor:  'divider',
      }}
    >
      <Toolbar sx={{ minHeight: { xs: 56, sm: 60 }, position: 'relative' }}>

        {/* LEFT: sidebar toggle */}
        <Tooltip title="Menyu">
          <IconButton
            onClick={onToggleSidebar}
            size="small"
            edge="start"
            sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main', bgcolor: 'action.hover' } }}
          >
            <MenuIcon />
          </IconButton>
        </Tooltip>

        {/* CENTER: logo — truly centred regardless of side widths */}
        <Box
          sx={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: 1.25,
            pointerEvents: 'none',
          }}
        >
          <Box
            sx={{
              width: 44, height: 44, borderRadius: 3,
              background: 'linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 18px rgba(37,99,235,0.4)',
            }}
          >
            <GavelIcon sx={{ fontSize: 24, color: '#fff' }} />
          </Box>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 800,
              letterSpacing: -0.5,
              background: 'linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            JK AI
          </Typography>
        </Box>

        {/* RIGHT: theme toggle */}
        <Box sx={{ flex: 1 }} />
        <Tooltip title={darkMode ? "Yorug' rejim" : "Qorong'u rejim"}>
          <IconButton
            onClick={onToggleTheme}
            size="small"
            sx={{
              borderRadius: 3,
              border: 1,
              borderColor: 'divider',
              bgcolor: 'action.hover',
              color: 'text.secondary',
              px: 1.25,
              '&:hover': { borderColor: 'primary.main', color: 'primary.main' },
            }}
          >
            {darkMode ? <LightModeIcon sx={{ fontSize: 16 }} /> : <DarkModeIcon sx={{ fontSize: 16 }} />}
          </IconButton>
        </Tooltip>

      </Toolbar>
    </AppBar>
  );
}
