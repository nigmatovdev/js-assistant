import { useState, useMemo }   from 'react';
import Dialog                  from '@mui/material/Dialog';
import DialogTitle             from '@mui/material/DialogTitle';
import DialogContent           from '@mui/material/DialogContent';
import TextField               from '@mui/material/TextField';
import List                    from '@mui/material/List';
import ListItem                from '@mui/material/ListItem';
import ListItemButton          from '@mui/material/ListItemButton';
import ListItemText            from '@mui/material/ListItemText';
import Typography              from '@mui/material/Typography';
import ChatBubbleOutlineIcon   from '@mui/icons-material/ChatBubbleOutline';
import { useSessionStore }     from '../../store/sessionStore';

interface SearchDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function SearchDialog({ open, onClose }: SearchDialogProps) {
  const [query, setQuery] = useState('');
  const { sessions, setActive } = useSessionStore();

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? sessions.filter(s => (s.title ?? '').toLowerCase().includes(q))
      : sessions;
  }, [query, sessions]);

  const pick = (id: string) => { setActive(id); onClose(); setQuery(''); };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Chatda qidirish</DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <TextField
          autoFocus
          fullWidth
          size="small"
          placeholder="Mavzu yoki kalit so'z…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          sx={{ mb: 1 }}
        />
        <List dense disablePadding>
          {results.map(s => (
            <ListItem key={s.id} disablePadding>
              <ListItemButton onClick={() => pick(s.id)} sx={{ borderRadius: 2 }}>
                <ChatBubbleOutlineIcon sx={{ mr: 1.5, fontSize: 16, color: 'text.secondary' }} />
                <ListItemText
                  primary={s.title ?? 'Nomsiz suhbat'}
                  secondary={`${s.message_count} ta xabar`}
                />
              </ListItemButton>
            </ListItem>
          ))}
          {results.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>
              Hech narsa topilmadi
            </Typography>
          )}
        </List>
      </DialogContent>
    </Dialog>
  );
}
