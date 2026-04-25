import { useState }     from 'react';
import Box              from '@mui/material/Box';
import Paper            from '@mui/material/Paper';
import Typography       from '@mui/material/Typography';
import Avatar           from '@mui/material/Avatar';
import Chip             from '@mui/material/Chip';
import Collapse         from '@mui/material/Collapse';
import IconButton       from '@mui/material/IconButton';
import ExpandMoreIcon   from '@mui/icons-material/ExpandMore';
import PersonIcon       from '@mui/icons-material/Person';
import SmartToyIcon     from '@mui/icons-material/SmartToy';
import ArticleIcon      from '@mui/icons-material/Article';
import ReactMarkdown    from 'react-markdown';
import type { Message } from '../../types';

interface Props {
  message: Message;
  isStreaming?: boolean;
}

export default function MessageBubble({ message, isStreaming = false }: Props) {
  const isUser = message.role === 'user';
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const hasSources = !isUser && (message.sources?.length ?? 0) > 0;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: isUser ? 'row-reverse' : 'row',
        alignItems: 'flex-start',
        gap: 1.5,
        mb: 3,
      }}
    >
      {/* Avatar */}
      <Avatar
        sx={{
          width: 34, height: 34, mt: 0.25, flexShrink: 0,
          ...(isUser
            ? { background: 'linear-gradient(135deg, #2563EB, #7C3AED)' }
            : { bgcolor: 'background.paper', border: 1, borderColor: 'divider', color: 'primary.main' }
          ),
        }}
      >
        {isUser
          ? <PersonIcon sx={{ fontSize: 18, color: '#fff' }} />
          : <SmartToyIcon sx={{ fontSize: 18 }} />}
      </Avatar>

      <Box sx={{ maxWidth: '78%', minWidth: 80 }}>
        {/* Bubble */}
        <Paper
          elevation={isUser ? 0 : 1}
          sx={{
            px: 2.5, py: 1.75,
            ...(isUser
              ? {
                  background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                  color: '#fff',
                  borderRadius: '18px 4px 18px 18px',
                  boxShadow: '0 4px 20px rgba(37, 99, 235, 0.25)',
                }
              : {
                  bgcolor: 'background.paper',
                  color: 'text.primary',
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: '4px 18px 18px 18px',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                }
            ),
          }}
        >
          {isUser ? (
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
              {message.content}
            </Typography>
          ) : (
            <Box
              sx={{
                fontSize: '0.9rem',
                '& p':        { margin: 0, lineHeight: 1.8 },
                '& p + p':    { marginTop: '0.65em' },
                '& ul, & ol': { pl: 2.5, my: 0.5 },
                '& li':       { mb: 0.5, lineHeight: 1.7 },
                '& strong':   { fontWeight: 700 },
                '& em':       { fontStyle: 'italic' },
                '& code': {
                  bgcolor: 'action.selected',
                  px: 0.75, py: 0.2,
                  borderRadius: 1,
                  fontSize: '0.82em',
                  fontFamily: '"JetBrains Mono", monospace',
                },
                '& pre': {
                  bgcolor: 'action.selected',
                  p: 1.5, borderRadius: 1.5,
                  overflow: 'auto', my: 1,
                },
                '& pre code': { bgcolor: 'transparent', p: 0 },
                '& h1, & h2, & h3': { fontWeight: 700, mt: 1, mb: 0.5 },
                '& blockquote': {
                  borderLeft: '3px solid',
                  borderColor: 'primary.main',
                  pl: 1.5, ml: 0, my: 1,
                  color: 'text.secondary',
                },
              }}
            >
              <ReactMarkdown>
                {message.content + (isStreaming ? ' ▊' : '')}
              </ReactMarkdown>
            </Box>
          )}
        </Paper>

        {/* Sources */}
        {hasSources && (
          <Box sx={{ mt: 1 }}>
            <Box
              role="button"
              tabIndex={0}
              onClick={() => setSourcesOpen(o => !o)}
              onKeyDown={e => e.key === 'Enter' && setSourcesOpen(o => !o)}
              sx={{
                display: 'inline-flex', alignItems: 'center', gap: 0.5,
                cursor: 'pointer', borderRadius: 1, px: 0.5,
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <ArticleIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary" fontWeight={500}>
                {message.sources!.length} ta manba
              </Typography>
              <IconButton size="small" sx={{ p: 0.2 }} disableRipple>
                <ExpandMoreIcon
                  sx={{
                    fontSize: 15,
                    color: 'text.secondary',
                    transform: sourcesOpen ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.22s',
                  }}
                />
              </IconButton>
            </Box>

            <Collapse in={sourcesOpen}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 0.75 }}>
                {message.sources!.map(src => (
                  <Chip
                    key={src.id}
                    size="small"
                    icon={<ArticleIcon />}
                    label={`${src.metadata.modda}-modda`}
                    title={`${src.metadata.title} · ${(src.score * 100).toFixed(0)}% o'xshashlik`}
                    variant="outlined"
                    sx={{ fontSize: '0.72rem' }}
                  />
                ))}
              </Box>
            </Collapse>
          </Box>
        )}
      </Box>
    </Box>
  );
}
