import { motion } from 'motion/react';
import type { PhotoKind } from '../../../shared/protocol';
import { CutoutText } from '../../components/CutoutText';
import { MarkerUnderline } from '../../components/Marker';
import { useT } from '../../i18n';
import { cn } from '../../lib/util';

/** The "who" word of the question, scribbled in red marker ("de QUI ?", "WHOSE mom…"). */
const WHO = /(?<![\p{L}])(qui|whose|who)(?![\p{L}])(\s*[?!])?/iu;

type Part = { type: 'text' | 'cutout' | 'marker'; text: string };

/** Split the question into plain text, the kind's word (ransom letters) and the "who" word (marker). */
function split(question: string, word: string): Part[] {
  const parts: Part[] = [{ type: 'text', text: question }];
  const carve = (re: RegExp, type: Part['type']) => {
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (p.type !== 'text') continue;
      const m = re.exec(p.text);
      if (!m || m.index === undefined) continue;
      const before = p.text.slice(0, m.index);
      const after = p.text.slice(m.index + m[0].length);
      parts.splice(i, 1, ...[{ type: 'text' as const, text: before }, { type, text: m[0] }, { type: 'text' as const, text: after }].filter((x) => x.text));
      return;
    }
  };
  if (word) carve(new RegExp(`(?<![\\p{L}])${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}])`, 'iu'), 'cutout');
  carve(WHO, 'marker');
  return parts;
}

/**
 * "C'est la [DARONNE] de QUI ?": bold Archivo, the kind's word in ransom-note letters and the
 * "who" in red marker, underlined twice. Screen readers get the plain question.
 */
export function Question({ kind, photoId, className }: { kind: PhotoKind; photoId: string; className?: string }) {
  const t = useT();
  // Keep "?" / "!" glued to the previous word (no orphan punctuation on a new line).
  const question = t(`common.whose.${kind}`).replace(/ ([?!:;])/g, ' $1');
  const parts = split(question, t(`voting.cutout.${kind}`));
  return (
    <motion.h2
      key={photoId}
      className={cn('font-display text-[length:clamp(1.55rem,7.6vw,1.9rem)] leading-[1.28] tracking-[-0.02em] text-ink sm:text-[2.2rem] lg:text-[2.6rem]', className)}
      initial={{ opacity: 0, y: 10, rotate: -1.5 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 420, damping: 22 }}
    >
      <span className="sr-only">{question}</span>
      <span aria-hidden>
        {parts.map((p, i) =>
          p.type === 'text' ? (
            <span key={i} className="whitespace-pre-wrap">
              {p.text}
            </span>
          ) : p.type === 'cutout' ? (
            <CutoutText key={i} text={p.text} size={36} seed={kind} animate={0.1} className="mx-[0.04em] align-[-0.12em]" />
          ) : (
            <MarkerUnderline
              key={i}
              double
              delay={0.45}
              className="font-marker text-[1.3em] leading-[0.9] font-normal tracking-normal whitespace-nowrap text-red-ink"
            >
              {p.text}
            </MarkerUnderline>
          ),
        )}
      </span>
    </motion.h2>
  );
}
