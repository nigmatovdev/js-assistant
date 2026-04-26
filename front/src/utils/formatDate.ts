const MONTHS = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
  'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr',
];

export function formatDate(iso: string): string {
  if (!iso) return '';
  // Force UTC interpretation — backend stores UTC without 'Z' suffix
  const normalized = iso.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(iso) ? iso : iso + 'Z';
  const utc = new Date(normalized);
  // Convert UTC → Asia/Tashkent (UTC+5) via Intl
  const local = new Date(utc.toLocaleString('en-US', { timeZone: 'Asia/Tashkent' }));
  const day   = local.getDate();
  const month = MONTHS[local.getMonth()];
  const year  = local.getFullYear();
  const hh    = String(local.getHours()).padStart(2, '0');
  const mm    = String(local.getMinutes()).padStart(2, '0');
  return `${day} ${month} ${year}, ${hh}:${mm}`;
}
