import { animate, motion, useMotionValue, useTransform } from 'motion/react';
import { useEffect } from 'react';
import { useI18n } from '../../i18n';

/**
 * A number that counts up from 0 to `to` once `start` is true (after `delay` seconds).
 * Formatted with the current language's digit grouping, unless `plain` (for date stamps:
 * the seven-segment font has no thin space).
 */
export function CountUp({
  to,
  start = true,
  delay = 0,
  duration = 1.3,
  plain = false,
  className,
}: {
  to: number;
  start?: boolean;
  delay?: number;
  duration?: number;
  plain?: boolean;
  className?: string;
}) {
  const { lang } = useI18n();
  const value = useMotionValue(0);
  const text = useTransform(value, (v) => (plain ? String(Math.round(v)) : Math.round(v).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US')));

  useEffect(() => {
    if (!start) return;
    const controls = animate(value, to, { duration: to === 0 ? 0 : duration, delay, ease: [0.16, 1, 0.3, 1] });
    return () => controls.stop();
  }, [to, start, delay, duration, value]);

  return <motion.span className={className}>{text}</motion.span>;
}
