import { useState }            from 'react';
import Dialog                  from '@mui/material/Dialog';
import Box                     from '@mui/material/Box';
import TextField               from '@mui/material/TextField';
import List                    from '@mui/material/List';
import ListItemButton          from '@mui/material/ListItemButton';
import ListItemText            from '@mui/material/ListItemText';
import Typography              from '@mui/material/Typography';
import Divider                 from '@mui/material/Divider';
import IconButton              from '@mui/material/IconButton';
import Tooltip                 from '@mui/material/Tooltip';
import SearchIcon              from '@mui/icons-material/Search';
import CloseIcon               from '@mui/icons-material/Close';
import ChatBubbleOutlineIcon   from '@mui/icons-material/ChatBubbleOutline';
import { useSessionStore }     from '../../store/sessionStore';
import { formatDate }          from '../../utils/formatDate';

interface Props {
  open:    boolean;
  onClose: () => void;
}

export default function SessionSearchModal({ open, onClose }: Props) {
  const { sessions, activeId, setActive } = useSessionStore();
  const [query, setQuery] = useState('');

  const trimmed   = query.trim();
  const displayed = trimmed
    ? sessions.filter(s => (s.title ?? '').toLowerCase().includes(trimmed.toLowerCase()))
    : sessions;

  const handleSelect = (id: string) => {
    setActive(id);
    setQuery('');
    onClose();
  };

  const handleClose = () => {
    setQuery('');
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      sx={{
        '& .MuiDialog-container': { alignItems: 'flex-start', pt: '11%' },
        '& .MuiDialog-paper': {
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 24px 80px rgba(0,0,0,0.22)',
        },
      }}
    >
      {/* Search bar */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          px: 1.5,
          py: 0.85,
          gap: 0.75,
          bgcolor: 'background.paper',
        }}
      >
        <SearchIcon sx={{ color: 'text.disabled', fontSize: 20, flexShrink: 0, ml: 0.5 }} />

        <TextField
          autoFocus
          fullWidth
          variant="standard"
          placeholder="Suhbat nomini kiriting…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Escape' && handleClose()}
          InputProps={{ disableUnderline: true }}
          sx={{
            flex: 1,
            '& .MuiInputBase-root': { fontSize: '0.97rem', py: 0.5 },
            '& .MuiInputBase-input::placeholder': { color: 'text.disabled', opacity: 1 },
          }}
        />

        <Tooltip title="Yopish (Esc)">
          <IconButton
            size="small"
            onClick={handleClose}
            sx={{
              flexShrink: 0,
              color: 'text.secondary',
              borderRadius: '8px',
              p: 0.5,
              '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
            }}
          >
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Sessions list — always visible */}
      {sessions.length > 0 && (
        <>
          <Divider />
          <Box sx={{
            maxHeight: 360, overflowY: 'auto',
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(128,128,128,0.2) transparent',
            '&::-webkit-scrollbar': { width: '4px' },
            '&::-webkit-scrollbar-track': { background: 'transparent' },
            '&::-webkit-scrollbar-thumb': { borderRadius: '4px', bgcolor: 'rgba(128,128,128,0.2)' },
            '&::-webkit-scrollbar-thumb:hover': { bgcolor: 'rgba(128,128,128,0.4)' },
          }}>
            {trimmed && displayed.length === 0 ? (
              <Box sx={{ px: 3, py: 3.5, textAlign: 'center' }}>
                <Typography variant="body2" color="text.disabled">Topilmadi</Typography>
              </Box>
            ) : (
              <>
                {!trimmed && (
                  <Box sx={{ px: 2, pt: 1.25, pb: 0.5 }}>
                    <Typography variant="caption" color="text.disabled" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.68rem' }}>
                      So'nggi suhbatlar
                    </Typography>
                  </Box>
                )}
                <List dense disablePadding>
                  {displayed.map(s => (
                    <ListItemButton
                      key={s.id}
                      selected={s.id === activeId}
                      onClick={() => handleSelect(s.id)}
                      sx={{
                        px: 2, py: 1,
                        '&.Mui-selected': { bgcolor: 'primary.main', color: 'primary.contrastText' },
                        '&.Mui-selected:hover': { bgcolor: 'primary.dark' },
                      }}
                    >
                      <ChatBubbleOutlineIcon
                        sx={{ mr: 1.5, fontSize: 15, flexShrink: 0, color: s.id === activeId ? 'inherit' : 'text.secondary' }}
                      />
                      <ListItemText
                        primary={s.title ?? 'Nomsiz suhbat'}
                        secondary={formatDate(s.updated_at)}
                        primaryTypographyProps={{ noWrap: true, fontSize: 13.5 }}
                        secondaryTypographyProps={{ fontSize: 11 }}
                      />
                    </ListItemButton>
                  ))}
                </List>
              </>
            )}
          </Box>
        </>
      )}
    </Dialog>
  );
}
