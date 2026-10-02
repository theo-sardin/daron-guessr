import { motion } from 'motion/react';
import type { CSSProperties } from 'react';
import type { PhotoKind } from '../../../shared/protocol';
import { useT } from '../../i18n';
import { cn } from '../../lib/util';

/** The question as text: French "?" / "!" stay glued to the previous word (no orphan on a new line). */
export function useQuestion(kind: PhotoKind): string {
  const t = useT();
  return t(`common.whose.${kind}`).replace(/ ([?!:;])/g, ' $1');
}

/** Split the question around the kind's word ("Whose | mom | is this?"), when it is in there. */
function split(question: string, word: string): [string, string, string] | null {
  if (!word) return null;
  const re = new RegExp(`(?<![\\p{L}])${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}])`, 'iu');
  const m = re.exec(question);
  if (!m) return null;
  return [question.slice(0, m.index), m[0], question.slice(m.index + m[0].length)];
}

/** The big outlined "Whose mom is this?", the kind's word painted yellow. */
export function Question({ kind, className }: { kind: PhotoKind; className?: string }) {
  const t = useT();
  const question = useQuestion(kind);
  const parts = split(question, t(`voting.highlight.${kind}`));
  return (
    <motion.h2
      // Phone: shrink long questions ("C'est le crush d'ado de qui ?") so they stay on one line.
      style={{ '--q-em': question.length * 0.45 } as CSSProperties}
      className={cn(
        'text-outline px-1 text-center font-display text-[length:clamp(1.25rem,min(8.4vw,calc((100vw_-_2.75rem)/var(--q-em))),2rem)] leading-[1.05] text-balance text-cream sm:text-4xl lg:text-5xl',
        className,
      )}
      initial={{ scale: 0.7, opacity: 0, rotate: -3 }}
      animate={{ scale: 1, opacity: 1, rotate: 0 }}
      exit={{ scale: 0.8, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 420, damping: 18 }}
    >
      {parts ? (
        <>
          {parts[0]}
          <span className="text-sun">{parts[1]}</span>
          {parts[2]}
        </>
      ) : (
        question
      )}
    </motion.h2>
  );
}
