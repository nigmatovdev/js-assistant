import Drawer               from '@mui/material/Drawer';
import Box                   from '@mui/material/Box';
import List                  from '@mui/material/List';
import ListItem              from '@mui/material/ListItem';
import ListItemButton        from '@mui/material/ListItemButton';
import ListItemText          from '@mui/material/ListItemText';
import IconButton            from '@mui/material/IconButton';
import Typography            from '@mui/material/Typography';
import Divider               from '@mui/material/Divider';
import Button                from '@mui/material/Button';
import Tooltip               from '@mui/material/Tooltip';
import Chip                  from '@mui/material/Chip';
import { useTheme, useMediaQuery } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import DeleteOutlineIcon     from '@mui/icons-material/DeleteOutline';
import AddCommentIcon        from '@mui/icons-material/AddComment';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import GavelIcon             from '@mui/icons-material/Gavel';
import SearchIcon            from '@mui/icons-material/Search';
import SettingsIcon          from '@mui/icons-material/Settings';
import WifiIcon              from '@mui/icons-material/Wifi';
import WifiOffIcon           from '@mui/icons-material/WifiOff';
import { useSessionStore }   from '../../store/sessionStore';
import { useChatStore }      from '../../store/chatStore';
import { useModelStore, LOCAL_MODELS, API_MODELS } from '../../store/modelStore';
import { formatDate }        from '../../utils/formatDate';

const SIDEBAR_WIDTH = 282;

interface SidebarProps {
  open:           boolean;
  onClose:        () => void;
  onSearchOpen:   () => void;
  onOpenSettings: () => void;
}

function SidebarContent({ onClose, onSearchOpen, onOpenSettings }: Omit<SidebarProps, 'open'>) {
  const theme  = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const { sessions, activeId, setActive, deleteSession, clearActive } = useSessionStore();
  const { clearMessages }                         = useChatStore();
  const { provider, localModelId, apiModelId }    = useModelStore();
  const models     = provider === 'local' ? LOCAL_MODELS : API_MODELS;
  const currentId  = provider === 'local' ? localModelId : apiModelId;
  const modelLabel = models.find(m => m.id === currentId)?.label ?? currentId;

  const handleNew    = () => { clearActive(); clearMessages(); onClose(); };
  const handleSearch = () => { onSearchOpen(); onClose(); };

  const borderColor  = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
  const hoverBg      = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';

  return (
    <>
      {/* Gradient header */}
      <Box sx={{
        px: 2.5, py: 2.25, flexShrink: 0,
        background: 'linear-gradient(135deg, #3B6EE0 0%, #7C4DFF 100%)',
        display: 'flex', alignItems: 'center', gap: 1.5,
      }}>
        <Box sx={{
          width: 38, height: 38, borderRadius: '12px',
          bgcolor: 'rgba(255,255,255,0.18)',
          backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '1px solid rgba(255,255,255,0.25)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
        }}>
          <GavelIcon sx={{ fontSize: 20, color: '#fff' }} />
        </Box>
        <Box>
          <Typography variant="subtitle1" fontWeight={800} color="#fff" sx={{ letterSpacing: -0.5, lineHeight: 1.1 }}>
            JK AI
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.71rem' }}>
            Suhbat tarixi
          </Typography>
        </Box>
      </Box>

      {/* Actions */}
      <Box sx={{ px: 1.5, pt: 1.5, pb: 1, display: 'flex', flexDirection: 'column', gap: 0.75, flexShrink: 0 }}>
        <Tooltip title="Ctrl+Shift+O" placement="right">
          <Button
            fullWidth
            variant="contained"
            startIcon={<AddCommentIcon sx={{ fontSize: '17px !important' }} />}
            onClick={handleNew}
            sx={{
              borderRadius: '12px', py: 0.9, fontSize: '0.875rem', fontWeight: 600,
              justifyContent: 'flex-start', px: 1.75, textTransform: 'none',
              background: 'linear-gradient(135deg, #5B8CFF 0%, #7C4DFF 100%)',
              boxShadow: '0 4px 16px rgba(91,140,255,0.3)',
              '&:hover': {
                background: 'linear-gradient(135deg, #4070E0 0%, #6B3AEA 100%)',
                boxShadow: '0 6px 20px rgba(91,140,255,0.42)',
                transform: 'translateY(-1px)',
              },
              transition: 'all 0.2s cubic-bezier(0.22,1,0.36,1)',
            }}
          >
            Yangi suhbat
          </Button>
        </Tooltip>

        <Tooltip title="Ctrl+Shift+F" placement="right">
          <Button
            fullWidth variant="outlined"
            startIcon={<SearchIcon sx={{ fontSize: '17px !important' }} />}
            onClick={handleSearch}
            sx={{
              borderRadius: '12px', py: 0.9, fontSize: '0.875rem', fontWeight: 500,
              justifyContent: 'flex-start', px: 1.75, textTransform: 'none',
              borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)',
              color: 'text.secondary',
              '&:hover': { borderColor: 'primary.main', color: 'primary.main', bgcolor: isDark ? 'rgba(91,140,255,0.08)' : 'rgba(91,140,255,0.06)' },
              transition: 'all 0.2s ease',
            }}
          >
            Suhbat qidirish
          </Button>
        </Tooltip>
      </Box>

      <Divider sx={{ borderColor, mx: 1.5 }} />

      {/* Session list */}
      <List dense disablePadding sx={{
        flex: 1, overflowY: 'auto', py: 0.5, px: 0.5,
        scrollbarWidth: 'thin',
        scrollbarColor: isDark ? 'rgba(255,255,255,0.09) transparent' : 'rgba(0,0,0,0.09) transparent',
        '&::-webkit-scrollbar': { width: '4px' },
        '&::-webkit-scrollbar-thumb': { borderRadius: '4px', bgcolor: isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.09)' },
      }}>
        {sessions.length === 0 && (
          <Box sx={{ px: 3, py: 5, textAlign: 'center' }}>
            <ChatBubbleOutlineIcon sx={{ fontSize: 36, color: 'text.disabled', mb: 1.5, display: 'block', mx: 'auto', opacity: 0.4 }} />
            <Typography variant="body2" color="text.disabled" sx={{ fontSize: '0.8rem' }}>
              Hali suhbat yo'q
            </Typography>
          </Box>
        )}

        <AnimatePresence initial={false}>
          {sessions.map((s, idx) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, x: -14 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -14 }}
              transition={{ duration: 0.18, delay: Math.min(idx * 0.018, 0.12) }}
            >
              <ListItem
                disablePadding
                sx={{ px: 0.5, py: 0.2, '&:hover .del-btn': { opacity: 1 } }}
              >
                <ListItemButton
                  selected={s.id === activeId}
                  onClick={() => { setActive(s.id); onClose(); }}
                  sx={{
                    borderRadius: '12px', pr: 1, py: 0.9,
                    position: 'relative', overflow: 'hidden',
                    transition: 'all 0.18s cubic-bezier(0.22,1,0.36,1)',
                    '&.Mui-selected': {
                      background: isDark
                        ? 'linear-gradient(135deg, rgba(91,140,255,0.18) 0%, rgba(124,77,255,0.13) 100%)'
                        : 'linear-gradient(135deg, rgba(91,140,255,0.12) 0%, rgba(124,77,255,0.08) 100%)',
                      boxShadow: '0 0 0 1px rgba(91,140,255,0.22)',
                      '&:hover': {
                        background: isDark
                          ? 'linear-gradient(135deg, rgba(91,140,255,0.23) 0%, rgba(124,77,255,0.18) 100%)'
                          : 'linear-gradient(135deg, rgba(91,140,255,0.17) 0%, rgba(124,77,255,0.12) 100%)',
                      },
                      '&::before': {
                        content: '""', position: 'absolute',
                        left: 0, top: '22%', bottom: '22%', width: 3,
                        borderRadius: '0 2px 2px 0',
                        background: 'linear-gradient(to bottom, #5B8CFF, #7C4DFF)',
                      },
                    },
                    '&:hover': { bgcolor: hoverBg },
                  }}
                >
                  <ChatBubbleOutlineIcon sx={{
                    mr: 1.25, fontSize: 13.5, flexShrink: 0,
                    color: s.id === activeId ? 'primary.main' : 'text.disabled',
                  }} />
                  <ListItemText
                    primary={s.title ?? 'Nomsiz suhbat'}
                    secondary={s.id !== activeId ? formatDate(s.updated_at) : undefined}
                    primaryTypographyProps={{
                      noWrap: true, fontSize: 13,
                      fontWeight: s.id === activeId ? 600 : 400,
                      color: s.id === activeId ? 'text.primary' : 'text.secondary',
                    }}
                    secondaryTypographyProps={{ fontSize: '0.67rem', mt: 0.2 }}
                  />
                </ListItemButton>

                <Tooltip title="O'chirish">
                  <IconButton
                    className="del-btn"
                    size="small"
                    onClick={() => deleteSession(s.id)}
                    sx={{
                      opacity: 0, transition: 'opacity 0.15s',
                      color: 'text.disabled', flexShrink: 0, ml: 0.5,
                      borderRadius: '8px',
                      '&:hover': { color: 'error.main', bgcolor: 'rgba(220,38,38,0.1)' },
                    }}
                  >
                    <DeleteOutlineIcon sx={{ fontSize: 15 }} />
                  </IconButton>
                </Tooltip>
              </ListItem>
            </motion.div>
          ))}
        </AnimatePresence>
      </List>

      <Divider sx={{ borderColor, mx: 1.5 }} />

      {/* Footer */}
      <Box sx={{ px: 1.5, py: 1.25, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Chip
          size="small"
          icon={provider === 'api'
            ? <WifiIcon sx={{ fontSize: '12px !important' }} />
            : <WifiOffIcon sx={{ fontSize: '12px !important' }} />
          }
          label={modelLabel}
          onClick={() => { onOpenSettings(); onClose(); }}
          sx={{
            flex: 1, fontSize: '0.7rem', height: 26, cursor: 'pointer',
            bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
            border: '1px solid',
            borderColor: provider === 'api' ? 'rgba(34,197,94,0.3)' : borderColor,
            color: provider === 'api' ? 'success.main' : 'text.secondary',
            '& .MuiChip-icon': { color: 'inherit' },
            '&:hover': { bgcolor: 'rgba(91,140,255,0.1)', borderColor: 'primary.main', color: 'primary.main' },
            transition: 'all 0.2s',
          }}
        />
        <Tooltip title="Sozlamalar">
          <IconButton
            size="small"
            onClick={() => { onOpenSettings(); onClose(); }}
            sx={{
              color: 'text.secondary', borderRadius: '10px', width: 30, height: 30,
              border: '1px solid', borderColor,
              '&:hover': { color: 'primary.main', borderColor: 'primary.main', bgcolor: 'rgba(91,140,255,0.1)' },
              transition: 'all 0.2s',
            }}
          >
            <SettingsIcon sx={{ fontSize: 15 }} />
          </IconButton>
        </Tooltip>
      </Box>
      <Box sx={{ px: 2, pb: 1.25 }}>
        <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.67rem' }}>
          {sessions.length} ta suhbat
        </Typography>
      </Box>
    </>
  );
}

export default function Sidebar({ open, onClose, onSearchOpen, onOpenSettings }: SidebarProps) {
  const theme    = useTheme();
  const isDark   = theme.palette.mode === 'dark';
  const isDesktop = useMediaQuery('(min-width:900px)');

  const glassSx = {
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    bgcolor: isDark ? 'rgba(10,11,20,0.82)' : 'rgba(248,250,255,0.78)',
    borderRight: '1px solid',
    borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
  };

  if (isDesktop) {
    return (
      <Box sx={{
        width: open ? SIDEBAR_WIDTH : 0,
        transition: 'width 0.28s cubic-bezier(0.22, 1, 0.36, 1)',
        overflow: 'hidden', flexShrink: 0, height: '100%', zIndex: 10,
      }}>
        <Box sx={{
          width: SIDEBAR_WIDTH, height: '100%',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          ...glassSx,
        }}>
          <SidebarContent onClose={onClose} onSearchOpen={onSearchOpen} onOpenSettings={onOpenSettings} />
        </Box>
      </Box>
    );
  }

  return (
    <Drawer
      anchor="left"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: SIDEBAR_WIDTH, display: 'flex', flexDirection: 'column', ...glassSx } }}
    >
      <SidebarContent onClose={onClose} onSearchOpen={onSearchOpen} onOpenSettings={onOpenSettings} />
    </Drawer>
  );
}
