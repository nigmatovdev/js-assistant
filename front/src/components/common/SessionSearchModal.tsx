import { useState, useEffect, useCallback } from 'react';
import Dialog                  from '@mui/material/Dialog';
import Box                     from '@mui/material/Box';
import TextField               from '@mui/material/TextField';
import List                    from '@mui/material/List';
import ListItemButton          from '@mui/material/ListItemButton';
import Typography              from '@mui/material/Typography';
import Divider                 from '@mui/material/Divider';
import IconButton              from '@mui/material/IconButton';
import Tooltip                 from '@mui/material/Tooltip';
import CircularProgress        from '@mui/material/CircularProgress';
import SearchIcon              from '@mui/icons-material/Search';
import CloseIcon               from '@mui/icons-material/Close';
import ChatBubbleOutlineIcon   from '@mui/icons-material/ChatBubbleOutline';
import PersonIcon              from '@mui/icons-material/Person';
import SmartToyIcon            from '@mui/icons-material/SmartToy';
import { useTheme }            from '@mui/material';
import { useSessionStore }     from '../../store/sessionStore';
import { searchSessions }      from '../../api/sessions';
import { formatDate }          from '../../utils/formatDate';
import type { Session, SessionSearchResult } from '../../types';

interface Props {
  open:    boolean;
  onClose: () => void;
}

const escRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const parts = text.split(new RegExp(`(${escRe(query)})`, 'gi'));
  return (
    <>
      {parts.map((p, i) =>
        p.toLowerCase() === query.toLowerCase()
          ? <strong key={i} style={{ fontWeight: 700 }}>{p}</strong>
          : <span key={i}>{p}</span>
      )}
    </>
  );
}

interface ResultRowProps {
  id:       string;
  title:    string | null;
  date:     string;
  isActive: boolean;
  match:    { role: 'user' | 'assistant'; snippet: string } | null;
  query:    string;
  onClick:  () => void;
}

function ResultRow({ id, title, date, isActive, match, query, onClick }: ResultRowProps) {
  const theme  = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <ListItemButton
      selected={isActive}
      onClick={onClick}
      sx={{
        px: 2, py: 1.1, flexDirection: 'column', alignItems: 'flex-start', gap: 0.4,
        '&.Mui-selected': {
          bgcolor: isDark ? 'rgba(91,140,255,0.15)' : 'rgba(91,140,255,0.1)',
          '&:hover': { bgcolor: isDark ? 'rgba(91,140,255,0.2)' : 'rgba(91,140,255,0.14)' },
        },
        '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' },
      }}
    >
      {/* Title row */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
        <ChatBubbleOutlineIcon sx={{ fontSize: 13, flexShrink: 0, color: isActive ? 'primary.main' : 'text.disabled' }} />
        <Typography variant="body2" noWrap sx={{ flex: 1, fontSize: '0.865rem', fontWeight: isActive ? 600 : 400, color: isActive ? 'primary.main' : 'text.primary' }}>
          <Highlight text={title ?? 'Nomsiz suhbat'} query={query} />
        </Typography>
        <Typography variant="caption" sx={{ fontSize: '0.68rem', color: 'text.disabled', flexShrink: 0 }}>
          {formatDate(date)}
        </Typography>
      </Box>

      {/* Message snippet */}
      {match && (
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75, pl: 2.75, width: '100%' }}>
          {match.role === 'user'
            ? <PersonIcon   sx={{ fontSize: 11, mt: '2px', flexShrink: 0, color: 'text.disabled' }} />
            : <SmartToyIcon sx={{ fontSize: 11, mt: '2px', flexShrink: 0, color: 'text.disabled' }} />
          }
          <Typography variant="caption" sx={{
            fontSize: '0.75rem', color: 'text.secondary', lineHeight: 1.55,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            '& strong': { color: 'primary.main', fontWeight: 700 },
          }}>
            <Highlight text={match.snippet} query={query} />
          </Typography>
        </Box>
      )}
    </ListItemButton>
  );
}

export default function SessionSearchModal({ open, onClose }: Props) {
  const { sessions, activeId, setActive } = useSessionStore();
  const [query,      setQuery]     = useState('');
  const [results,    setResults]   = useState<SessionSearchResult[]>([]);
  const [searching,  setSearching] = useState(false);

  const trimmed = query.trim();

  useEffect(() => {
    if (!trimmed) { setResults([]); setSearching(false); return; }
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const data = await searchSessions(trimmed);
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 220);
    return () => clearTimeout(timer);
  }, [trimmed]);

  const handleSelect = useCallback((id: string) => {
    setActive(id);
    setQuery('');
    onClose();
  }, [setActive, onClose]);

  const handleClose = () => {
    setQuery('');
    onClose();
  };

  const noQuery       = !trimmed;
  const displayList   = noQuery ? sessions : results;
  const noResults     = !noQuery && !searching && results.length === 0;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      sx={{
        '& .MuiDialog-container': { alignItems: 'flex-start', pt: '11%' },
        '& .MuiDialog-paper': { borderRadius: '14px', overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.24)' },
      }}
    >
      {/* Search bar */}
      <Box sx={{ display: 'flex', alignItems: 'center', px: 1.5, py: 0.85, gap: 0.75, bgcolor: 'background.paper' }}>
        {searching
          ? <CircularProgress size={18} sx={{ flexShrink: 0, ml: 0.5, color: 'primary.main' }} />
          : <SearchIcon sx={{ color: 'text.disabled', fontSize: 20, flexShrink: 0, ml: 0.5 }} />
        }
        <TextField
          autoFocus fullWidth variant="standard"
          placeholder="Sarlavha yoki xabar matnini qidirish…"
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
          <IconButton size="small" onClick={handleClose} sx={{ flexShrink: 0, color: 'text.secondary', borderRadius: '8px', p: 0.5, '&:hover': { bgcolor: 'action.hover', color: 'text.primary' } }}>
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      </Box>

      {sessions.length > 0 && (
        <>
          <Divider />
          <Box sx={{
            maxHeight: 400, overflowY: 'auto',
            scrollbarWidth: 'thin', scrollbarColor: 'rgba(128,128,128,0.2) transparent',
            '&::-webkit-scrollbar': { width: '4px' },
            '&::-webkit-scrollbar-thumb': { borderRadius: '4px', bgcolor: 'rgba(128,128,128,0.2)' },
          }}>
            {/* Section label */}
            <Box sx={{ px: 2, pt: 1.25, pb: 0.5 }}>
              <Typography variant="caption" color="text.disabled" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.68rem' }}>
                {noQuery ? 'So\'nggi suhbatlar' : `Natijalar${results.length ? ` · ${results.length}` : ''}`}
              </Typography>
            </Box>

            {noResults ? (
              <Box sx={{ px: 3, py: 3.5, textAlign: 'center' }}>
                <Typography variant="body2" color="text.disabled">Topilmadi</Typography>
              </Box>
            ) : (
              <List dense disablePadding>
                {noQuery
                  ? (displayList as Session[]).map(s => (
                      <ResultRow
                        key={s.id}
                        id={s.id}
                        title={s.title}
                        date={s.updated_at}
                        isActive={s.id === activeId}
                        match={null}
                        query=""
                        onClick={() => handleSelect(s.id)}
                      />
                    ))
                  : (displayList as SessionSearchResult[]).map(r => (
                      <ResultRow
                        key={r.id}
                        id={r.id}
                        title={r.title}
                        date={r.updated_at}
                        isActive={r.id === activeId}
                        match={r.match}
                        query={trimmed}
                        onClick={() => handleSelect(r.id)}
                      />
                    ))
                }
              </List>
            )}
          </Box>
        </>
      )}
    </Dialog>
  );
}
