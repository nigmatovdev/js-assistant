import Dialog          from '@mui/material/Dialog';
import Box              from '@mui/material/Box';
import Typography       from '@mui/material/Typography';
import IconButton       from '@mui/material/IconButton';
import Divider          from '@mui/material/Divider';
import MenuItem         from '@mui/material/MenuItem';
import Select           from '@mui/material/Select';
import CloseIcon        from '@mui/icons-material/Close';
import SettingsIcon     from '@mui/icons-material/Settings';
import WifiIcon         from '@mui/icons-material/Wifi';
import WifiOffIcon      from '@mui/icons-material/WifiOff';
import AutoAwesomeIcon  from '@mui/icons-material/AutoAwesome';
import FlareIcon        from '@mui/icons-material/Flare';
import {
  useModelStore,
  LOCAL_MODELS,
  API_MODELS,
  OPENAI_MODELS,
  GEMINI_MODELS,
  type Provider,
} from '../../store/modelStore';

interface Props {
  open:    boolean;
  onClose: () => void;
}

const PROVIDER_OPTIONS: Array<{
  value:  Provider;
  Icon:   React.ComponentType<{ sx?: object }>;
  label:  string;
  color:  string;
}> = [
  { value: 'local',  Icon: WifiOffIcon,    label: 'Offline',    color: '#9e9e9e' },
  { value: 'api',    Icon: WifiIcon,        label: 'OpenRouter', color: '#22c55e' },
  { value: 'openai', Icon: AutoAwesomeIcon, label: 'GPT-4o',     color: '#5B8CFF' },
  { value: 'gemini', Icon: FlareIcon,       label: 'Gemini',     color: '#ED6C02' },
];

export default function SettingsModal({ open, onClose }: Props) {
  const {
    provider, localModelId, apiModelId, openaiModelId, geminiModelId,
    setProvider, setLocalModel, setApiModel, setOpenaiModel, setGeminiModel,
  } = useModelStore();

  const models =
    provider === 'local'  ? LOCAL_MODELS  :
    provider === 'openai' ? OPENAI_MODELS :
    provider === 'gemini' ? GEMINI_MODELS :
    API_MODELS;

  const currentId =
    provider === 'local'  ? localModelId  :
    provider === 'openai' ? openaiModelId :
    provider === 'gemini' ? geminiModelId :
    apiModelId;

  const setModel =
    provider === 'local'  ? setLocalModel  :
    provider === 'openai' ? setOpenaiModel :
    provider === 'gemini' ? setGeminiModel :
    setApiModel;

  const activeOption = PROVIDER_OPTIONS.find(o => o.value === provider)!;
  const statusLabel  =
    provider === 'local'  ? `Ollama — ${models.find(m => m.id === currentId)?.label ?? currentId}`      :
    provider === 'openai' ? `OpenAI — ${models.find(m => m.id === currentId)?.label ?? currentId}`      :
    provider === 'gemini' ? `Gemini — ${models.find(m => m.id === currentId)?.label ?? currentId}`      :
                            `OpenRouter — ${models.find(m => m.id === currentId)?.label ?? currentId}`;

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
      <Box sx={{ display: 'flex', alignItems: 'center', px: 2.5, py: 1.75, gap: 1, bgcolor: 'background.paper' }}>
        <SettingsIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
        <Typography variant="subtitle1" fontWeight={700} sx={{ flex: 1 }}>
          Sozlamalar
        </Typography>
        <IconButton
          size="small" onClick={onClose}
          sx={{ color: 'text.secondary', borderRadius: '8px', p: 0.5, '&:hover': { bgcolor: 'action.hover' } }}
        >
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>

      <Divider />

      {/* Body */}
      <Box sx={{ px: 2.5, py: 2, display: 'flex', flexDirection: 'column', gap: 2.5 }}>

        {/* Provider grid — 2×2 */}
        <Box>
          <Typography variant="caption" color="text.disabled" fontWeight={600}
            sx={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.67rem', display: 'block', mb: 1 }}>
            Rejim
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.75 }}>
            {PROVIDER_OPTIONS.map(({ value, Icon, label, color }) => {
              const isSelected = provider === value;
              return (
                <Box
                  key={value}
                  onClick={() => setProvider(value)}
                  sx={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: 0.75, py: 1, px: 1.25, borderRadius: '10px', cursor: 'pointer',
                    border: '1.5px solid',
                    borderColor: isSelected ? color : 'divider',
                    bgcolor: isSelected ? `${color}18` : 'transparent',
                    color: isSelected ? color : 'text.secondary',
                    fontWeight: isSelected ? 600 : 400,
                    transition: 'all 0.15s ease',
                    userSelect: 'none',
                    '&:hover': { borderColor: color, color: color, bgcolor: `${color}0c` },
                  }}
                >
                  <Icon sx={{ fontSize: 15 }} />
                  <Typography variant="body2" sx={{ fontSize: '0.78rem', fontWeight: 'inherit', color: 'inherit' }}>
                    {label}
                  </Typography>
                </Box>
              );
            })}
          </Box>
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
            display: 'flex', alignItems: 'center', gap: 1,
            px: 1.5, py: 1, borderRadius: 2,
            bgcolor: `${activeOption.color}0e`,
          }}
        >
          <activeOption.Icon sx={{ fontSize: 15, color: activeOption.color }} />
          <Typography variant="caption" sx={{ fontSize: '0.75rem', color: activeOption.color }}>
            {statusLabel}
          </Typography>
        </Box>
      </Box>
    </Dialog>
  );
}
