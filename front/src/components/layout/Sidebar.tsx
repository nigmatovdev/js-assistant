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
import { useSessionStore }   from '../../store/sessionStore';
import { formatDate }        from '../../utils/formatDate';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const { sessions, activeId, setActive, deleteSession, createSession } = useSessionStore();

  const handleNew = async () => { await createSession(); onClose(); };

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

      {/* New chat */}
      <Box sx={{ px: 2, py: 1.5 }}>
        <Button
          fullWidth
          variant="outlined"
          startIcon={<AddCommentIcon />}
          onClick={handleNew}
          sx={{ borderRadius: 3, py: 0.9, fontWeight: 600 }}
        >
          Yangi suhbat
        </Button>
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
              // Reveal delete button on row hover
              '&:hover .delete-btn': { opacity: 1 },
            }}
          >
            {/* Session button takes most of the row */}
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

            {/* Delete — outside ListItemButton so clicks don't conflict */}
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
