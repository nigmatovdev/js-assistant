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
              width: 34, height: 34, borderRadius: 2,
              background: 'linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(37,99,235,0.35)',
            }}
          >
            <GavelIcon sx={{ fontSize: 18, color: '#fff' }} />
          </Box>
          <Box>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 800,
                lineHeight: 1.1,
                letterSpacing: -0.3,
                background: 'linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              JK AI
            </Typography>
            <Typography variant="caption" color="text.disabled" sx={{ lineHeight: 1, fontSize: '0.6rem', display: 'block' }}>
              Jinoyat Kodeksi
            </Typography>
          </Box>
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
