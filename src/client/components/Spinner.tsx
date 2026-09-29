import { useT } from '../i18n';
import { cn } from '../lib/util';

export function Spinner({ className }: { className?: string }) {
  const t = useT();
  return (
    <span
      role="status"
      aria-label={t('common.loading')}
      className={cn('inline-block size-6 animate-spin rounded-full border-3 border-current border-t-transparent', className)}
    />
  );
}
