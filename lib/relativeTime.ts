/** Returns a human-readable relative time string in Russian. */
export function relativeTime(date: Date | { toDate(): Date } | null | undefined): string {
  if (!date) return '';
  const d = date instanceof Date ? date : date.toDate();
  const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);

  if (diffSec < 60) return 'только что';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} мин назад`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} ч назад`;
  if (diffSec < 7 * 86400) return `${Math.floor(diffSec / 86400)} д назад`;
  if (diffSec < 30 * 86400) return `${Math.floor(diffSec / (7 * 86400))} нед назад`;
  return d.toLocaleDateString('ru', { day: 'numeric', month: 'long' });
}
