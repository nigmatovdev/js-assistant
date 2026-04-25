import Drawer                  from '@mui/material/Drawer';
import List                    from '@mui/material/List';
import ListItem                from '@mui/material/ListItem';
import ListItemButton          from '@mui/material/ListItemButton';
import ListItemText            from '@mui/material/ListItemText';
import ListItemSecondaryAction from '@mui/material/ListItemSecondaryAction';
import IconButton              from '@mui/material/IconButton';
import Typography              from '@mui/material/Typography';
import Box                     from '@mui/material/Box';
import Divider                 from '@mui/material/Divider';
import Button                  from '@mui/material/Button';
import Avatar                  from '@mui/material/Avatar';
import DeleteOutlineIcon       from '@mui/icons-material/DeleteOutline';
import AddCommentIcon          from '@mui/icons-material/AddComment';
import ChatBubbleOutlineIcon   from '@mui/icons-material/ChatBubbleOutline';
import GavelIcon               from '@mui/icons-material/Gavel';
import { useSessionStore }     from '../../store/sessionStore';
import { formatDate }          from '../../utils/formatDate';

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
      PaperProps={{
        sx: {
          width: 300,
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'background.paper',
        },
      }}
    >
      {/* Header */}
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
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.75)' }}>
            Suhbat tarixi
          </Typography>
        </Box>
      </Box>

      {/* New Chat Button */}
      <Box sx={{ px: 2, py: 1.5 }}>
        <Button
          fullWidth
          variant="outlined"
          startIcon={<AddCommentIcon />}
          onClick={handleNew}
          sx={{ borderRadius: 2.5, py: 1 }}
        >
          Yangi suhbat
        </Button>
      </Box>

      <Divider />

      {/* Session list */}
      <List dense disablePadding sx={{ flex: 1, overflowY: 'auto', py: 1 }}>
        {sessions.length === 0 && (
          <Box sx={{ px: 3, py: 4, textAlign: 'center' }}>
            <ChatBubbleOutlineIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
            <Typography variant="body2" color="text.disabled">
              Hali suhbat yo'q
            </Typography>
          </Box>
        )}

        {sessions.map(s => (
          <ListItem key={s.id} disablePadding sx={{ px: 1 }}>
            <ListItemButton
              selected={s.id === activeId}
              onClick={() => { setActive(s.id); onClose(); }}
              sx={{
                borderRadius: 2.5,
                pr: 5,
                py: 1,
                '&.Mui-selected': {
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  '&:hover': { bgcolor: 'primary.dark' },
                },
              }}
            >
              <ChatBubbleOutlineIcon
                sx={{
                  mr: 1.5, fontSize: 16, flexShrink: 0,
                  color: s.id === activeId ? 'inherit' : 'text.secondary',
                }}
              />
              <ListItemText
                primary={s.title ?? 'Nomsiz suhbat'}
                secondary={s.id !== activeId ? formatDate(s.updated_at) : undefined}
                primaryTypographyProps={{ noWrap: true, fontSize: 13.5, fontWeight: s.id === activeId ? 600 : 400 }}
                secondaryTypographyProps={{ fontSize: 11, mt: 0.25 }}
              />
            </ListItemButton>
            <ListItemSecondaryAction sx={{ right: 8 }}>
              <IconButton
                edge="end"
                size="small"
                onClick={() => deleteSession(s.id)}
                sx={{ opacity: 0.4, '&:hover': { opacity: 1, color: 'error.main' } }}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>

      <Divider />
      <Box sx={{ px: 2.5, py: 1.5 }}>
        <Typography variant="caption" color="text.disabled">
          Jami {sessions.length} ta suhbat
        </Typography>
      </Box>
    </Drawer>
  );
}
