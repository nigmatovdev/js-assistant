import Dialog        from '@mui/material/Dialog';
import Box            from '@mui/material/Box';
import Typography     from '@mui/material/Typography';
import IconButton     from '@mui/material/IconButton';
import Divider        from '@mui/material/Divider';
import ToggleButton   from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import MenuItem       from '@mui/material/MenuItem';
import Select         from '@mui/material/Select';
import CloseIcon      from '@mui/icons-material/Close';
import SettingsIcon   from '@mui/icons-material/Settings';
import WifiIcon       from '@mui/icons-material/Wifi';
import WifiOffIcon    from '@mui/icons-material/WifiOff';
import {
  useModelStore,
  LOCAL_MODELS,
  API_MODELS,
  type Provider,
} from '../../store/modelStore';

interface Props {
  open:    boolean;
  onClose: () => void;
}

export default function SettingsModal({ open, onClose }: Props) {
  const { provider, localModelId, apiModelId, setProvider, setLocalModel, setApiModel } =
    useModelStore();

  const models      = provider === 'local' ? LOCAL_MODELS : API_MODELS;
  const currentId   = provider === 'local' ? localModelId : apiModelId;
  const setModel    = provider === 'local' ? setLocalModel : setApiModel;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      sx={{
        '& .MuiDialog-container': { alignItems: 'flex-start', pt: '10%' },
        '& .MuiDialog-paper': {
          borderRadius: '14px',
          overflow: 'hidden',
          boxShadow: '0 24px 80px rgba(0,0,0,0.22)',
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          px: 2.5,
          py: 1.75,
          gap: 1,
          bgcolor: 'background.paper',
        }}
      >
        <SettingsIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
        <Typography variant="subtitle1" fontWeight={700} sx={{ flex: 1 }}>
          Sozlamalar
        </Typography>
        <IconButton
          size="small"
          onClick={onClose}
          sx={{ color: 'text.secondary', borderRadius: '8px', p: 0.5, '&:hover': { bgcolor: 'action.hover' } }}
        >
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>

      <Divider />

      {/* Body */}
      <Box sx={{ px: 2.5, py: 2, display: 'flex', flexDirection: 'column', gap: 2.5 }}>

        {/* Provider toggle */}
        <Box>
          <Typography variant="caption" color="text.disabled" fontWeight={600}
            sx={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.67rem', display: 'block', mb: 1 }}>
            Rejim
          </Typography>
          <ToggleButtonGroup
            value={provider}
            exclusive
            onChange={(_, val) => { if (val) setProvider(val as Provider); }}
            size="small"
            fullWidth
            sx={{ '& .MuiToggleButton-root': { textTransform: 'none', fontSize: '0.82rem', py: 0.85, gap: 0.75, flex: 1 } }}
          >
            <ToggleButton value="local">
              <WifiOffIcon sx={{ fontSize: 16 }} />
              Offline — Local LLM
            </ToggleButton>
            <ToggleButton value="api">
              <WifiIcon sx={{ fontSize: 16 }} />
              Online — OpenRouter
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* Model selector */}
        <Box>
          <Typography variant="caption" color="text.disabled" fontWeight={600}
            sx={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.67rem', display: 'block', mb: 1 }}>
            Model
          </Typography>
          <Select
            size="small"
            value={models.some(m => m.id === currentId) ? currentId : models[0].id}
            onChange={e => setModel(e.target.value)}
            fullWidth
            renderValue={(val) => models.find(m => m.id === val)?.label ?? String(val)}
            sx={{
              fontSize: '0.82rem',
              borderRadius: '10px',
              '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'text.secondary' },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.main' },
            }}
          >
            {models.map(m => (
              <MenuItem key={m.id} value={m.id}>
                <Box>
                  <Typography variant="body2" sx={{ fontSize: '0.82rem', fontWeight: 500, lineHeight: 1.3 }}>
                    {m.label}
                  </Typography>
                  <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.7rem' }}>
                    {m.desc}
                  </Typography>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </Box>

        {/* Status indicator */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 1.5,
            py: 1,
            borderRadius: 2,
            bgcolor: provider === 'api' ? 'success.lighter' : 'action.hover',
          }}
        >
          {provider === 'api'
            ? <WifiIcon sx={{ fontSize: 15, color: 'success.main' }} />
            : <WifiOffIcon sx={{ fontSize: 15, color: 'text.disabled' }} />
          }
          <Typography variant="caption" color={provider === 'api' ? 'success.main' : 'text.disabled'} sx={{ fontSize: '0.75rem' }}>
            {provider === 'api'
              ? `OpenRouter — ${models.find(m => m.id === currentId)?.label ?? currentId}`
              : `Ollama — ${models.find(m => m.id === currentId)?.label ?? currentId}`
            }
          </Typography>
        </Box>
      </Box>
    </Dialog>
  );
}
