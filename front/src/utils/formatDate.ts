export function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffH = (now.getTime() - d.getTime()) / 3_600_000;
  if (diffH < 24) return d.toLocaleTimeString('uz', { hour: '2-digit', minute: '2-digit' });
  if (diffH < 48) return 'Kecha';
  return d.toLocaleDateString('uz', { day: 'numeric', month: 'short' });
}
