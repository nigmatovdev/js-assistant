import { useState }       from 'react';
import Box                from '@mui/material/Box';
import Paper              from '@mui/material/Paper';
import Typography         from '@mui/material/Typography';
import Avatar             from '@mui/material/Avatar';
import Chip               from '@mui/material/Chip';
import Collapse           from '@mui/material/Collapse';
import IconButton         from '@mui/material/IconButton';
import Tooltip            from '@mui/material/Tooltip';
import { useTheme }       from '@mui/material';
import ExpandMoreIcon     from '@mui/icons-material/ExpandMore';
import PersonIcon         from '@mui/icons-material/Person';
import SmartToyIcon       from '@mui/icons-material/SmartToy';
import ArticleIcon        from '@mui/icons-material/Article';
import WifiIcon           from '@mui/icons-material/Wifi';
import WifiOffIcon        from '@mui/icons-material/WifiOff';
import AutoAwesomeIcon    from '@mui/icons-material/AutoAwesome';
import TimerOutlinedIcon  from '@mui/icons-material/TimerOutlined';
import ContentCopyIcon    from '@mui/icons-material/ContentCopy';
import CheckIcon          from '@mui/icons-material/Check';
import FlareIcon          from '@mui/icons-material/Flare';
import ReactMarkdown      from 'react-markdown';
import type { Message }   from '../../types';

interface Props {
  message:     Message;
  isStreaming?: boolean;
}

export default function MessageBubble({ message, isStreaming = false }: Props) {
  const theme  = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isUser = message.role === 'user';
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [copied,      setCopied]      = useState(false);
  const hasSources = !isUser && (message.sources?.length ?? 0) > 0;

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: isUser ? 'row-reverse' : 'row',
      alignItems: 'flex-start',
      gap: 1.5, mb: 3,
    }}>
      {/* Avatar */}
      <Avatar sx={{
        width: 34, height: 34, mt: 0.25, flexShrink: 0,
        ...(isUser ? {
          background: 'linear-gradient(135deg, #5B8CFF 0%, #7C4DFF 100%)',
          boxShadow: '0 4px 14px rgba(91,140,255,0.38)',
        } : {
          bgcolor: isDark ? 'rgba(18,20,32,0.88)' : 'rgba(255,255,255,0.9)',
          border: '1px solid',
          borderColor: isDark ? 'rgba(91,140,255,0.28)' : 'rgba(91,140,255,0.22)',
          color: 'primary.main',
          boxShadow: isDark ? '0 0 0 4px rgba(91,140,255,0.07)' : '0 4px 12px rgba(91,140,255,0.1)',
        }),
      }}>
        {isUser
          ? <PersonIcon sx={{ fontSize: 17, color: '#fff' }} />
          : <SmartToyIcon sx={{ fontSize: 17 }} />
        }
      </Avatar>

      {/* Content column */}
      <Box sx={{ maxWidth: '78%', minWidth: 80, '&:hover .msg-copy-btn': { opacity: 1 } }}>

        {/* User bubble */}
        {isUser && (
          <Box sx={{
            px: 2.25, py: 1.6,
            background: 'linear-gradient(135deg, #5B8CFF 0%, #7C4DFF 100%)',
            borderRadius: '18px 4px 18px 18px',
            boxShadow: '0 4px 20px rgba(91,140,255,0.32)',
          }}>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.72, color: '#fff', fontSize: '0.92rem' }}>
              {message.content}
            </Typography>
          </Box>
        )}

        {/* Assistant bubble */}
        {!isUser && (
          <Paper elevation={0} sx={{
            px: 2.25, py: 1.6,
            position: 'relative',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            bgcolor: isDark ? 'rgba(20,22,36,0.78)' : 'rgba(255,255,255,0.78)',
            border: '1px solid',
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.78)',
            borderRadius: '4px 18px 18px 18px',
            boxShadow: isDark
              ? '0 4px 24px rgba(0,0,0,0.38), 0 1px 0 rgba(255,255,255,0.05) inset'
              : '0 4px 24px rgba(91,140,255,0.07), 0 1px 0 rgba(255,255,255,0.9) inset',
          }}>
            {/* Copy button — upper-right corner, shown on hover */}
            {!isStreaming && (
              <Tooltip title={copied ? 'Nusxalandi!' : 'Nusxalash'}>
                <IconButton
                  className="msg-copy-btn"
                  size="small"
                  onClick={handleCopy}
                  sx={{
                    position: 'absolute', top: 15, right: 15,
                    p: 0.45, opacity: 0, transition: 'opacity 0.15s, background 0.15s',
                    color: 'text.disabled', borderRadius: '7px',
                    bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                    '&:hover': { color: 'primary.main', bgcolor: isDark ? 'rgba(91,140,255,0.15)' : 'rgba(91,140,255,0.1)' },
                  }}
                >
                  {copied
                    ? <CheckIcon sx={{ fontSize: 12 }} />
                    : <ContentCopyIcon sx={{ fontSize: 12 }} />
                  }
                </IconButton>
              </Tooltip>
            )}
            <Box sx={{
              fontSize: '0.9rem',
              '& p':        { margin: 0, lineHeight: 1.82 },
              '& p + p':    { marginTop: '0.65em' },
              '& ul, & ol': { pl: 2.5, my: 0.5 },
              '& li':       { mb: 0.5, lineHeight: 1.75 },
              '& strong':   { fontWeight: 700 },
              '& em':       { fontStyle: 'italic' },
              '& code': {
                bgcolor: isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.06)',
                px: 0.75, py: 0.2, borderRadius: '6px',
                fontSize: '0.82em',
                fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                border: '1px solid',
                borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)',
              },
              '& pre': {
                bgcolor: isDark ? 'rgba(0,0,0,0.42)' : 'rgba(0,0,0,0.04)',
                p: 1.75, borderRadius: '12px', overflow: 'auto', my: 1.25,
                border: '1px solid',
                borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)',
              },
              '& pre code': { bgcolor: 'transparent', p: 0, border: 'none', fontSize: '0.84em' },
              '& h1, & h2, & h3': { fontWeight: 700, mt: 1.5, mb: 0.75 },
              '& blockquote': {
                borderLeft: '3px solid',
                borderColor: 'primary.main',
                pl: 1.5, ml: 0, my: 1, py: 0.5,
                color: 'text.secondary',
                bgcolor: isDark ? 'rgba(91,140,255,0.05)' : 'rgba(91,140,255,0.04)',
                borderRadius: '0 8px 8px 0',
              },
            }}>
              <ReactMarkdown>{message.content}</ReactMarkdown>
              {isStreaming && (
                <Box component="span" sx={{
                  display: 'inline-block',
                  width: '2px', height: '0.85em',
                  bgcolor: 'primary.main',
                  ml: '3px', borderRadius: '1px',
                  verticalAlign: 'text-bottom',
                  boxShadow: '0 0 8px rgba(91,140,255,0.65)',
                  animation: 'jkCursor 0.85s step-end infinite',
                  '@keyframes jkCursor': {
                    '0%, 100%': { opacity: 1 },
                    '50%':      { opacity: 0 },
                  },
                }} />
              )}
            </Box>
          </Paper>
        )}

        {/* Sources */}
        {hasSources && (
          <Box sx={{ mt: 0.75 }}>
            <Box
              role="button" tabIndex={0}
              onClick={() => setSourcesOpen(o => !o)}
              onKeyDown={e => e.key === 'Enter' && setSourcesOpen(o => !o)}
              sx={{
                display: 'inline-flex', alignItems: 'center', gap: 0.5,
                cursor: 'pointer', borderRadius: '8px', px: 0.75, py: 0.3,
                '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' },
              }}
            >
              <ArticleIcon sx={{ fontSize: 12, color: 'text.disabled' }} />
              <Typography variant="caption" color="text.disabled" fontWeight={500} sx={{ fontSize: '0.7rem' }}>
                {message.sources!.length} ta manba
              </Typography>
              <ExpandMoreIcon sx={{
                fontSize: 14, color: 'text.disabled',
                transform: sourcesOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.22s',
              }} />
            </Box>

            <Collapse in={sourcesOpen}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6, mt: 0.5 }}>
                {message.sources!.map(src => (
                  <Chip
                    key={src.id}
                    size="small"
                    icon={<ArticleIcon />}
                    label={`${src.metadata.modda}-modda`}
                    title={`${src.metadata.title} · ${(src.score * 100).toFixed(0)}% o'xshashlik`}
                    variant="outlined"
                    sx={{
                      fontSize: '0.7rem', height: 22,
                      bgcolor: isDark ? 'rgba(91,140,255,0.09)' : 'rgba(91,140,255,0.07)',
                      borderColor: 'rgba(91,140,255,0.22)', color: 'primary.main',
                      '& .MuiChip-icon': { fontSize: '13px !important', color: 'inherit' },
                    }}
                  />
                ))}
              </Box>
            </Collapse>
          </Box>
        )}

        {/* Response meta */}
        {!isUser && message.meta && (
          <Box sx={{ mt: 0.75, display: 'flex', alignItems: 'center', gap: 1, pl: 0.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
              <TimerOutlinedIcon sx={{ fontSize: 11, color: 'text.disabled' }} />
              <Typography variant="caption" sx={{ fontSize: '0.67rem', color: 'text.disabled' }}>
                {message.meta.elapsed_ms < 1000
                  ? `${message.meta.elapsed_ms}ms`
                  : `${(message.meta.elapsed_ms / 1000).toFixed(1)}s`}
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ fontSize: '0.67rem', color: 'text.disabled' }}>·</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
              {message.meta.provider === 'openai' ? <AutoAwesomeIcon sx={{ fontSize: 11, color: 'primary.main' }} />
               : message.meta.provider === 'gemini' ? <FlareIcon     sx={{ fontSize: 11, color: 'warning.main' }} />
               : message.meta.provider === 'api'    ? <WifiIcon      sx={{ fontSize: 11, color: 'success.main' }} />
               :                                      <WifiOffIcon   sx={{ fontSize: 11, color: 'text.disabled' }} />
              }
              <Typography variant="caption" sx={{
                fontSize: '0.67rem',
                color: message.meta.provider === 'openai' ? 'primary.main'
                     : message.meta.provider === 'gemini' ? 'warning.main'
                     : message.meta.provider === 'api'    ? 'success.main'
                     :                                      'text.disabled',
              }}>
                {message.meta.provider === 'openai' ? 'GPT-4o'
                 : message.meta.provider === 'gemini' ? 'Gemini'
                 : message.meta.provider === 'api'    ? 'Online'
                 :                                      'Offline'}
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ fontSize: '0.67rem', color: 'text.disabled' }}>·</Typography>
            <Typography variant="caption" sx={{ fontSize: '0.67rem', color: 'text.disabled' }}>
              {message.meta.modelLabel}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
