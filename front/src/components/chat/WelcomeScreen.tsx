import { useMemo }       from 'react';
import Box               from '@mui/material/Box';
import Typography        from '@mui/material/Typography';
import Card              from '@mui/material/Card';
import CardActionArea    from '@mui/material/CardActionArea';
import CardContent       from '@mui/material/CardContent';
import Avatar            from '@mui/material/Avatar';
import { motion }        from 'framer-motion';
import GavelIcon              from '@mui/icons-material/Gavel';
import AccountBalanceIcon     from '@mui/icons-material/AccountBalance';
import BalanceIcon            from '@mui/icons-material/Balance';
import PolicyIcon             from '@mui/icons-material/Policy';
import SecurityIcon           from '@mui/icons-material/Security';
import PersonOffIcon          from '@mui/icons-material/PersonOff';
import LocalPoliceIcon        from '@mui/icons-material/LocalPolice';
import DirectionsCarIcon      from '@mui/icons-material/DirectionsCar';
import MoneyOffIcon           from '@mui/icons-material/MoneyOff';
import ArrowForwardIcon       from '@mui/icons-material/ArrowForward';

const ALL_SUGGESTIONS = [
  {
    icon:     <AccountBalanceIcon />,
    color:    '#2563EB',
    label:    'Mulk jinoyatlari',
    question: "O'g'irlik qilganda qanday jazo ko'zda tutilgan va u qanday omillarga bog'liq?",
  },
  {
    icon:     <PolicyIcon />,
    color:    '#7C3AED',
    label:    'Korrupsiya',
    question: 'Mansabdor shaxs tomonidan pora olish uchun jinoyat kodeksida qanday jazo belgilangan?',
  },
  {
    icon:     <BalanceIcon />,
    color:    '#0891B2',
    label:    'Shaxsga qarshi',
    question: "Qasddan odam o'ldirish jinoyati uchun maksimal jazo qancha va qachon qo'llaniladi?",
  },
  {
    icon:     <SecurityIcon />,
    color:    '#059669',
    label:    'Davlat xavfsizligi',
    question: "Davlat sirini oshkor qilish jinoyati uchun jinoyat kodeksida qanday jazolar nazarda tutilgan?",
  },
  {
    icon:     <PersonOffIcon />,
    color:    '#DC2626',
    label:    'Tana jarohati',
    question: "Qasddan og'ir tan jarohati yetkazish uchun jazo nima va og'irlashtiruvchi holatlar qanday?",
  },
  {
    icon:     <LocalPoliceIcon />,
    color:    '#D97706',
    label:    'Huquq-tartibot',
    question: "Huquq-tartibot organlariga qarshilik ko'rsatish yoki hujum qilish uchun qanday jazo belgilangan?",
  },
  {
    icon:     <DirectionsCarIcon />,
    color:    '#0284C7',
    label:    'Transport jinoyatlari',
    question: "Yo'l harakati qoidalarini buzib, odamning halok bo'lishiga sabab bo'lish uchun jazo nima?",
  },
  {
    icon:     <MoneyOffIcon />,
    color:    '#9333EA',
    label:    'Firibgarlik',
    question: "Katta miqdorda aldov yo'li bilan mulk o'zlashtirish (firibgarlik) uchun kodeksda qanday jazo ko'rsatilgan?",
  },
  {
    icon:     <AccountBalanceIcon />,
    color:    '#0F766E',
    label:    'Pul yuvish',
    question: "Jinoyat yo'li bilan olingan daromadlarni qonuniylashtirish (pul yuvish) uchun jazo nima?",
  },
];

function pickRandom<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

interface WelcomeScreenProps {
  onSuggest: (question: string) => void;
}

export default function WelcomeScreen({ onSuggest }: WelcomeScreenProps) {
  // Pick 3 random suggestions once per mount
  const suggestions = useMemo(() => pickRandom(ALL_SUGGESTIONS, 3), []);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100%',
        px: { xs: 2, sm: 4 },
        py: 5,
        maxWidth: 740,
        mx: 'auto',
        width: '100%',
      }}
    >
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: -18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        style={{ textAlign: 'center', marginBottom: 44 }}
      >
        <Box
          sx={{
            width: 76, height: 76, borderRadius: 4,
            background: 'linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            mx: 'auto', mb: 3,
            boxShadow: '0 16px 48px rgba(37,99,235,0.32)',
          }}
        >
          <GavelIcon sx={{ fontSize: 38, color: '#fff' }} />
        </Box>

        <Typography
          variant="h4"
          sx={{
            fontWeight: 800,
            mb: 1,
            background: 'linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          JK AI
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 400, mx: 'auto', lineHeight: 1.7 }}>
          O'zbekiston Jinoyat Kodeksi bo'yicha savollaringizni bering — tezkor va aniq javob oling
        </Typography>
      </motion.div>

      {/* Suggestion cards */}
      <Box sx={{ width: '100%' }}>
        <Typography
          variant="overline"
          color="text.disabled"
          sx={{ display: 'block', textAlign: 'center', mb: 2, letterSpacing: 2, fontSize: '0.68rem' }}
        >
          Namuna savollar
        </Typography>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
            gap: 2,
          }}
        >
          {suggestions.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.38, delay: 0.12 + i * 0.09 }}
            >
              <Card
                elevation={0}
                sx={{
                  height: '100%',
                  border: 1.5,
                  borderColor: 'divider',
                  borderRadius: 4,
                  transition: 'all 0.22s ease',
                  '&:hover': {
                    borderColor: s.color,
                    transform: 'translateY(-3px)',
                    boxShadow: `0 12px 40px ${s.color}20`,
                  },
                }}
              >
                <CardActionArea
                  onClick={() => onSuggest(s.question)}
                  sx={{ height: '100%', borderRadius: 4 }}
                >
                  <CardContent sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                      <Avatar
                        sx={{
                          bgcolor: `${s.color}15`,
                          color: s.color,
                          width: 38, height: 38,
                        }}
                      >
                        {s.icon}
                      </Avatar>
                      <Typography
                        variant="caption"
                        fontWeight={700}
                        sx={{ color: s.color, textTransform: 'uppercase', letterSpacing: 0.6, fontSize: '0.64rem' }}
                      >
                        {s.label}
                      </Typography>
                    </Box>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ lineHeight: 1.65, flex: 1, fontSize: '0.85rem' }}
                    >
                      {s.question}
                    </Typography>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: s.color }}>
                      <Typography variant="caption" fontWeight={600} sx={{ fontSize: '0.75rem' }}>
                        So'rash
                      </Typography>
                      <ArrowForwardIcon sx={{ fontSize: 13 }} />
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
