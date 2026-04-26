import Drawer                from '@mui/material/Drawer';
import List                  from '@mui/material/List';
import ListItem              from '@mui/material/ListItem';
import ListItemButton        from '@mui/material/ListItemButton';
import ListItemText          from '@mui/material/ListItemText';
import IconButton            from '@mui/material/IconButton';
import Typography            from '@mui/material/Typography';
import Box                   from '@mui/material/Box';
import Divider               from '@mui/material/Divider';
import Button                from '@mui/material/Button';
import Avatar                from '@mui/material/Avatar';
import Tooltip               from '@mui/material/Tooltip';
import DeleteOutlineIcon     from '@mui/icons-material/DeleteOutline';
import AddCommentIcon        from '@mui/icons-material/AddComment';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import GavelIcon             from '@mui/icons-material/Gavel';
import SearchIcon            from '@mui/icons-material/Search';
import { useSessionStore }   from '../../store/sessionStore';
import { useChatStore }      from '../../store/chatStore';
import { formatDate }        from '../../utils/formatDate';

interface SidebarProps {
  open:         boolean;
  onClose:      () => void;
  onSearchOpen: () => void;
}

const btnSx = {
  borderRadius: 2.5,
  py: 0.85,
  fontWeight: 600,
  fontSize: '0.875rem',
  justifyContent: 'flex-start',
  px: 1.75,
  textTransform: 'none' as const,
};

export default function Sidebar({ open, onClose, onSearchOpen }: SidebarProps) {
  const { sessions, activeId, setActive, deleteSession, clearActive } = useSessionStore();
  const { clearMessages } = useChatStore();

  const handleNew = () => {
    clearActive();
    clearMessages();
    onClose();
  };

  const handleSearch = () => {
    onSearchOpen();
    onClose();
  };

  return (
    <Drawer
      anchor="left"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: 290, display: 'flex', flexDirection: 'column', bgcolor: 'background.paper' } }}
    >
      {/* Gradient header */}
      <Box
        sx={{
          px: 2.5, py: 2,
          background: 'linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)',
          display: 'flex', alignItems: 'center', gap: 1.5,
        }}
      >
        <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 36, height: 36 }}>
          <GavelIcon sx={{ fontSize: 20, color: '#fff' }} />
        </Avatar>
        <Box>
          <Typography variant="subtitle1" fontWeight={700} color="#fff">JK AI</Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>Suhbat tarixi</Typography>
        </Box>
      </Box>

      {/* Actions — same style */}
      <Box sx={{ px: 2, pt: 1.5, pb: 1, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        <Tooltip title="Ctrl+Shift+O" placement="right">
          <Button
            fullWidth
            variant="outlined"
            color="primary"
            startIcon={<AddCommentIcon sx={{ fontSize: '18px !important' }} />}
            onClick={handleNew}
            sx={btnSx}
          >
            Yangi suhbat
          </Button>
        </Tooltip>

        <Tooltip title="Ctrl+Shift+F" placement="right">
          <Button
            fullWidth
            variant="outlined"
            color="inherit"
            startIcon={<SearchIcon sx={{ fontSize: '18px !important' }} />}
            onClick={handleSearch}
            sx={{ ...btnSx, borderColor: 'divider', color: 'text.secondary', '&:hover': { borderColor: 'text.primary', color: 'text.primary' } }}
          >
            Suhbat qidirish
          </Button>
        </Tooltip>
      </Box>

      <Divider />

      {/* Session list */}
      <List dense disablePadding sx={{ flex: 1, overflowY: 'auto', py: 0.5 }}>
        {sessions.length === 0 && (
          <Box sx={{ px: 3, py: 5, textAlign: 'center' }}>
            <ChatBubbleOutlineIcon sx={{ fontSize: 38, color: 'text.disabled', mb: 1, display: 'block', mx: 'auto' }} />
            <Typography variant="body2" color="text.disabled">Hali suhbat yo'q</Typography>
          </Box>
        )}

        {sessions.map(s => (
          <ListItem
            key={s.id}
            disablePadding
            sx={{
              px: 1, py: 0.25,
              '&:hover .delete-btn': { opacity: 1 },
            }}
          >
            <ListItemButton
              selected={s.id === activeId}
              onClick={() => { setActive(s.id); onClose(); }}
              sx={{
                borderRadius: 2.5,
                flex: 1,
                pr: 1,
                py: 0.85,
                '&.Mui-selected': {
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  '&:hover': { bgcolor: 'primary.dark' },
                },
              }}
            >
              <ChatBubbleOutlineIcon
                sx={{
                  mr: 1.25, fontSize: 15, flexShrink: 0,
                  color: s.id === activeId ? 'inherit' : 'text.secondary',
                }}
              />
              <ListItemText
                primary={s.title ?? 'Nomsiz suhbat'}
                secondary={s.id !== activeId ? formatDate(s.updated_at) : undefined}
                primaryTypographyProps={{ noWrap: true, fontSize: 13.5, fontWeight: s.id === activeId ? 600 : 400 }}
                secondaryTypographyProps={{ fontSize: 11, mt: 0.2 }}
              />
            </ListItemButton>

            <Tooltip title="O'chirish">
              <IconButton
                className="delete-btn"
                size="small"
                onClick={() => deleteSession(s.id)}
                sx={{
                  opacity: 0,
                  transition: 'opacity 0.15s',
                  color: 'text.secondary',
                  flexShrink: 0,
                  '&:hover': { color: 'error.main', bgcolor: 'error.lighter' },
                }}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </ListItem>
        ))}
      </List>

      <Divider />
      <Box sx={{ px: 2.5, py: 1.25 }}>
        <Typography variant="caption" color="text.disabled">
          Jami {sessions.length} ta suhbat
        </Typography>
      </Box>
    </Drawer>
  );
}
