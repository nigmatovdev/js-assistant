import { useMemo }      from 'react';
import Box              from '@mui/material/Box';
import Typography       from '@mui/material/Typography';
import Card             from '@mui/material/Card';
import CardActionArea   from '@mui/material/CardActionArea';
import CardContent      from '@mui/material/CardContent';
import Avatar           from '@mui/material/Avatar';
import { useTheme }     from '@mui/material';
import { motion }       from 'framer-motion';
import AccountBalanceIcon   from '@mui/icons-material/AccountBalance';
import BalanceIcon          from '@mui/icons-material/Balance';
import PolicyIcon           from '@mui/icons-material/Policy';
import SecurityIcon         from '@mui/icons-material/Security';
import PersonOffIcon        from '@mui/icons-material/PersonOff';
import LocalPoliceIcon      from '@mui/icons-material/LocalPolice';
import ArrowForwardIcon     from '@mui/icons-material/ArrowForward';
import MoneyOffIcon         from '@mui/icons-material/MoneyOff';
import DirectionsCarIcon    from '@mui/icons-material/DirectionsCar';

const SUGGESTIONS = [
  { icon: <AccountBalanceIcon />, color: '#5B8CFF', label: 'Mulk jinoyatlari',
    question: "O'g'irlik qilganda qanday jazo ko'zda tutilgan va u qanday omillarga bog'liq?" },
  { icon: <PolicyIcon />,         color: '#9C6BFF', label: 'Korrupsiya',
    question: 'Mansabdor shaxs tomonidan pora olish uchun jinoyat kodeksida qanday jazo belgilangan?' },
  { icon: <BalanceIcon />,        color: '#0891B2', label: 'Shaxsga qarshi',
    question: "Qasddan odam o'ldirish jinoyati uchun maksimal jazo qancha va qachon qo'llaniladi?" },
  { icon: <SecurityIcon />,       color: '#059669', label: 'Davlat xavfsizligi',
    question: "Davlat sirini oshkor qilish jinoyati uchun jinoyat kodeksida qanday jazolar nazarda tutilgan?" },
  { icon: <PersonOffIcon />,      color: '#DC2626', label: 'Tana jarohati',
    question: "Qasddan og'ir tan jarohati yetkazish uchun jazo nima va og'irlashtiruvchi holatlar qanday?" },
  { icon: <LocalPoliceIcon />,    color: '#D97706', label: 'Huquq-tartibot',
    question: "Huquq-tartibot organlariga qarshilik ko'rsatish yoki hujum qilish uchun qanday jazo belgilangan?" },
  { icon: <DirectionsCarIcon />,  color: '#0284C7', label: 'Transport jinoyatlari',
    question: "Yo'l harakati qoidalarini buzib, odamning halok bo'lishiga sabab bo'lish uchun jazo nima?" },
  { icon: <MoneyOffIcon />,       color: '#9333EA', label: 'Firibgarlik',
    question: "Katta miqdorda aldov yo'li bilan mulk o'zlashtirish (firibgarlik) uchun kodeksda qanday jazo ko'rsatilgan?" },
  { icon: <AccountBalanceIcon />, color: '#0F766E', label: 'Pul yuvish',
    question: "Jinoyat yo'li bilan olingan daromadlarni qonuniylashtirish (pul yuvish) uchun jazo nima?" },
];

interface WelcomeScreenProps {
  onSuggest: (question: string) => void;
}

export default function WelcomeScreen({ onSuggest }: WelcomeScreenProps) {
  const theme       = useTheme();
  const isDark      = theme.palette.mode === 'dark';
  const suggestions = useMemo(() => [...SUGGESTIONS].sort(() => Math.random() - 0.5).slice(0, 3), []);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', px: { xs: 2, sm: 4 }, maxWidth: 780, mx: 'auto', width: '100%' }}>

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        style={{ textAlign: 'center', marginBottom: 32 }}
      >
        <Typography variant="h5" sx={{
          fontWeight: 800, mb: 1.25, letterSpacing: -0.5,
          background: 'linear-gradient(135deg, #5B8CFF 20%, #9C6BFF 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          JK AI Yordamchisi
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 440, mx: 'auto', lineHeight: 1.82, fontSize: '0.94rem' }}>
          O'zbekiston Jinoyat Kodeksi bo'yicha sun'iy intellekt yordamchisi —
          jinoyat turlari, jazolar va huquqiy normalar haqida tezkor va ishonchli javob oling
        </Typography>
      </motion.div>

      {/* Suggestion cards */}
      <Box sx={{ width: '100%' }}>
        <Typography variant="overline" color="text.disabled" sx={{
          display: 'block', textAlign: 'center', mb: 2.5,
          letterSpacing: 2, fontSize: '0.66rem',
        }}>
          Namuna savollar
        </Typography>

        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
          gap: 1.5,
        }}>
          {suggestions.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.38, delay: 0.14 + i * 0.055, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -4, transition: { duration: 0.22 } }}
            >
              <Card elevation={0} sx={{
                height: '100%',
                backdropFilter: 'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
                bgcolor: isDark ? 'rgba(20,22,36,0.68)' : 'rgba(255,255,255,0.72)',
                border: '1px solid',
                borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.82)',
                borderRadius: '16px',
                boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.32)' : '0 4px 24px rgba(0,0,0,0.06)',
                transition: 'border-color 0.25s, box-shadow 0.25s',
                '&:hover': {
                  borderColor: s.color + '55',
                  boxShadow: `0 10px 36px ${s.color}22`,
                },
              }}>
                <CardActionArea onClick={() => onSuggest(s.question)} sx={{ height: '100%', borderRadius: '16px' }}>
                  <CardContent sx={{ p: 2.25, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                      <Avatar sx={{ bgcolor: s.color + '18', color: s.color, width: 36, height: 36, borderRadius: '10px' }}>
                        {s.icon}
                      </Avatar>
                      <Typography variant="caption" fontWeight={700} sx={{
                        color: s.color, textTransform: 'uppercase', letterSpacing: 0.7, fontSize: '0.62rem',
                      }}>
                        {s.label}
                      </Typography>
                    </Box>

                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.66, flex: 1, fontSize: '0.83rem' }}>
                      {s.question}
                    </Typography>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: s.color }}>
                      <Typography variant="caption" fontWeight={600} sx={{ fontSize: '0.72rem' }}>So'rash</Typography>
                      <ArrowForwardIcon sx={{ fontSize: 12 }} />
                    </Box>
                  </CardContent>
                </CardActionArea>
              </Card>
            </motion.div>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
