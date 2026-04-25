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
import DeleteIcon              from '@mui/icons-material/Delete';
import ChatBubbleOutlineIcon   from '@mui/icons-material/ChatBubbleOutline';
import AddIcon                 from '@mui/icons-material/Add';
import Button                  from '@mui/material/Button';
import { useSessionStore }     from '../../store/sessionStore';
import { formatDate }          from '../../utils/formatDate';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const { sessions, activeId, setActive, deleteSession, createSession } = useSessionStore();

  const handleNew = async () => {
    await createSession();
    onClose();
  };

  return (
    <Drawer
      anchor="left"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: 300, display: 'flex', flexDirection: 'column' } }}
    >
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" fontWeight={700}>Suhbat tarixi</Typography>
        <Button size="small" startIcon={<AddIcon />} onClick={handleNew} variant="outlined">
          Yangi
        </Button>
      </Box>
      <Divider />

      <List dense sx={{ flex: 1, overflowY: 'auto', py: 1 }}>
        {sessions.length === 0 && (
          <ListItem>
            <ListItemText secondary="Hali suhbat yo'q" />
          </ListItem>
        )}
        {sessions.map(s => (
          <ListItem key={s.id} disablePadding sx={{ px: 1 }}>
            <ListItemButton
              selected={s.id === activeId}
              onClick={() => { setActive(s.id); onClose(); }}
              sx={{ borderRadius: 2, pr: 5 }}
            >
              <ChatBubbleOutlineIcon sx={{ mr: 1.5, fontSize: 16, color: 'text.secondary', flexShrink: 0 }} />
              <ListItemText
                primary={s.title ?? 'Nomsiz suhbat'}
                secondary={formatDate(s.updated_at)}
                primaryTypographyProps={{ noWrap: true, fontSize: 14 }}
                secondaryTypographyProps={{ fontSize: 11 }}
              />
            </ListItemButton>
            <ListItemSecondaryAction>
              <IconButton
                edge="end"
                size="small"
                onClick={() => deleteSession(s.id)}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>
    </Drawer>
  );
}
