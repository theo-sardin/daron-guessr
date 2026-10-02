import { AnimatePresence, motion } from 'motion/react';
import type { ReactNode } from 'react';
import type { PublicPlayer } from '../../../shared/protocol';
import { Avatar } from '../../components/Avatar';
import { useI18n } from '../../i18n';
import { cn } from '../../lib/util';

/*
 * The mode-specific touches of the reveal (see SCENE in kinds.ts), in the same sticker
 * language as the rest of the game: bright shapes, thick ink outlines, hard shadows, emojis,
 * springs. One signature element per scene, kept away from the photo itself.
 *
 * PhotoCard positions them: the companion (the owner's face) and the scene's sticker hang on
 * the photo's right edge (`SIDE`), the board's suspects and the hearts on the whole stage.
 */

/** Right of the photo, overlapping its edge a little: the owner's face and, above it, the scene's sticker. */
export const SIDE = 'absolute left-[calc(100%-0.75rem)] w-[7.5rem] md:left-[calc(100%-1rem)] md:w-[9.5rem]';

/* ------------------------------------------------------------------ the owner's face */

/** Spinning sunburst in the owner's color behind a revealed face (the OG reveal flourish). */
function Sunburst({ color, className }: { color: string; className?: string }) {
  return (
    <motion.div
      aria-hidden
      className={cn('pointer-events-none absolute top-1/2 left-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-80', className)}
      style={{
        background: `repeating-conic-gradient(${color} 0deg 12deg, transparent 12deg 30deg)`,
        maskImage: 'radial-gradient(circle, black 35%, transparent 70%)',
        WebkitMaskImage: 'radial-gradient(circle, black 35%, transparent 70%)',
      }}
      animate={{ rotate: 360 }}
      transition={{ duration: 9, repeat: Infinity, ease: 'linear' }}
    />
  );
}

/**
 * The owner's face slid next to the photo once revealed, to compare ("he has his dad's
 * nose!"): a mini polaroid with their selfie, or their emoji avatar on their color when they
 * have none. `label` replaces the name under it by a sticker (then-vs-now); `lens` lands a
 * 🔍 on the face (body parts).
 */
export function Companion({ owner, label, lens, delay = 0.3 }: { owner: PublicPlayer; label?: string; lens?: boolean; delay?: number }) {
  const face = owner.selfieUrl ?? null;
  return (
    <motion.div
      aria-hidden
      className={cn(SIDE, 'pointer-events-none top-[24%] z-[3]')}
      initial={{ opacity: 0, x: -70, rotate: -24, scale: 0.4 }}
      animate={{ opacity: 1, x: 0, rotate: 7, scale: 1 }}
      transition={{ type: 'spring', stiffness: 320, damping: 17, delay }}
    >
      <Sunburst color={owner.color} className="size-[175%]" />
      <figure className="relative m-0 rounded-md border-3 border-ink bg-white p-1.5 pb-1 text-ink shadow-pop">
        <span className="absolute -top-2.5 left-1/2 h-5 w-14 -translate-x-1/2 rotate-[4deg] rounded-sm bg-sun/80 shadow-sm" />
        <div className="relative aspect-square overflow-hidden rounded-sm" style={{ backgroundColor: owner.color }}>
          {face ? (
            <img src={face} alt="" draggable={false} className="size-full object-cover" />
          ) : (
            <span className="flex size-full items-center justify-center text-6xl leading-none select-none md:text-7xl">{owner.avatar}</span>
          )}
          {lens && <LensOnFace delay={delay + 0.35} />}
        </div>
        {label ? (
          <div className="flex justify-center pt-1 pb-0.5">
            <SceneTag tone="mint" tilt={3} delay={delay + 0.45}>
              {label}
            </SceneTag>
          </div>
        ) : (
          <figcaption className="truncate px-0.5 pt-0.5 text-center font-display text-base leading-tight md:text-lg">{owner.name}</figcaption>
        )}
      </figure>
      {/* Their avatar sticker on the corner, so the face is tied to the player everyone knows. */}
      {face && (
        <motion.span
          className="absolute -right-3 -bottom-3 flex size-9 items-center justify-center rounded-full border-2 border-ink text-lg leading-none shadow-pop-sm md:size-10 md:text-xl"
          style={{ backgroundColor: owner.color }}
          initial={{ scale: 0, rotate: -60 }}
          animate={{ scale: 1, rotate: -10 }}
          transition={{ type: 'spring', stiffness: 520, damping: 14, delay: delay + 0.3 }}
        >
          {owner.avatar}
        </motion.span>
      )}
    </motion.div>
  );
}

/** A small Lilita sticker (then / now labels). */
export function SceneTag({
  children,
  tone = 'sun',
  tilt = -6,
  delay = 0,
  className,
}: {
  children: ReactNode;
  tone?: 'sun' | 'mint' | 'pink' | 'sky';
  tilt?: number;
  delay?: number;
  className?: string;
}) {
  const bg = { sun: 'bg-sun text-ink', mint: 'bg-mint text-ink', pink: 'bg-pink text-white', sky: 'bg-sky text-ink' }[tone];
  return (
    <motion.span
      className={cn('inline-block rounded-lg border-2 border-ink px-1.5 py-0.5 font-display text-sm leading-none whitespace-nowrap uppercase shadow-pop-sm', bg, className)}
      initial={{ scale: 0, rotate: tilt - 30 }}
      animate={{ scale: 1, rotate: tilt }}
      transition={{ type: 'spring', stiffness: 520, damping: 15, delay }}
    >
      {children}
    </motion.span>
  );
}

/** The sticker slot above the owner's face. */
function TopSlot({ children, delay, tilt }: { children: ReactNode; delay: number; tilt: number }) {
  return (
    <motion.div
      aria-hidden
      className={cn(SIDE, 'pointer-events-none -top-3 z-[4] flex justify-center md:top-2')}
      initial={{ opacity: 0, scale: 0, rotate: tilt - 30 }}
      animate={{ opacity: 1, scale: 1, rotate: tilt }}
      transition={{ type: 'spring', stiffness: 460, damping: 14, delay }}
    >
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ album (parents) */

const GAUGE = { cx: 32, cy: 32, r: 24 };
/** A point of the gauge's half circle, p from 0 (left) to 1 (right). */
function arcPoint(p: number): string {
  const a = Math.PI * (1 - p);
  return `${(GAUGE.cx + GAUGE.r * Math.cos(a)).toFixed(2)} ${(GAUGE.cy - GAUGE.r * Math.sin(a)).toFixed(2)}`;
}
const arc = (from: number, to: number) => `M${arcPoint(from)} A${GAUGE.r} ${GAUGE.r} 0 0 1 ${arcPoint(to)}`;

/**
 * "Family resemblance" gauge sticker: the needle swings to the share of players who
 * recognised the owner (everybody = 100%). No votes: it hesitates and shows "?".
 */
export function ResemblanceGauge({ value, delay = 0.55 }: { value: number | null; delay?: number }) {
  const { t } = useI18n();
  const pct = value === null ? null : Math.round(Math.max(0, Math.min(1, value)) * 100);
  const angle = pct === null ? 0 : -90 + pct * 1.8;
  return (
    <TopSlot delay={delay} tilt={-5}>
      <div className="sticker flex flex-col items-center rounded-2xl px-2 pt-1 pb-1.5 md:px-3">
        <span className="text-[10px] leading-tight font-extrabold tracking-wide whitespace-nowrap text-ink-soft uppercase md:text-[11px]">
          🧬 {t('reveal.scene.resemblance')}
        </span>
        <div className="flex items-end gap-1">
          <svg viewBox="0 0 64 38" className="w-12 overflow-visible md:w-16" aria-hidden>
            <path d={arc(0, 1)} fill="none" stroke="var(--color-ink)" strokeWidth="12" strokeLinecap="round" />
            <path d={arc(0, 1 / 3)} fill="none" stroke="var(--color-pink)" strokeWidth="6.5" strokeLinecap="round" />
            <path d={arc(1 / 3, 2 / 3)} fill="none" stroke="var(--color-sun)" strokeWidth="6.5" />
            <path d={arc(2 / 3, 1)} fill="none" stroke="var(--color-mint)" strokeWidth="6.5" strokeLinecap="round" />
            <motion.g
              // Pivot at the needle's base (the transform box is the needle's own box).
              style={{ originX: 0.5, originY: 1 }}
              initial={{ rotate: -90 }}
              animate={{ rotate: pct === null ? [-90, 40, -40, 20, 0] : [-90, Math.min(90, angle + 25), angle - 8, angle] }}
              transition={{ duration: 1.1, times: pct === null ? [0, 0.4, 0.6, 0.8, 1] : [0, 0.55, 0.8, 1], delay: delay + 0.3, ease: 'easeOut' }}
            >
              <line x1={GAUGE.cx} y1={GAUGE.cy} x2={GAUGE.cx} y2={GAUGE.cy - 21} stroke="var(--color-ink)" strokeWidth="4" strokeLinecap="round" />
            </motion.g>
            <circle cx={GAUGE.cx} cy={GAUGE.cy} r="5" fill="var(--color-ink)" />
          </svg>
          <motion.span
            className="font-display text-2xl leading-none md:text-3xl"
            initial={{ opacity: 0, scale: 1.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: delay + 1.1, type: 'spring', stiffness: 500, damping: 16 }}
          >
            {pct === null ? '?' : `${pct}%`}
          </motion.span>
        </div>
      </div>
    </TopSlot>
  );
}

/* ------------------------------------------------------------------ glow-up (kid, me) */

/** ✨ GLOW-UP ✨ badge above the "now" face. */
export function GlowUpBadge({ delay = 0.6 }: { delay?: number }) {
  const { t } = useI18n();
  return (
    <TopSlot delay={delay} tilt={6}>
      <motion.span
        className="block rounded-2xl border-3 border-ink bg-pink px-2.5 py-1 font-display text-lg leading-none whitespace-nowrap text-white shadow-pop-sm md:text-xl"
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 1.2, repeat: Infinity, delay: delay + 0.6 }}
      >
        {t('reveal.scene.glowUp')}
      </motion.span>
    </TopSlot>
  );
}

/* ------------------------------------------------------------------ family tree */

/** The link between the photo and its owner ("🌳 sis", "🐾 fur baby"), on a mint sticker. */
export function RelationSticker({ text, delay = 0.55 }: { text: string; delay?: number }) {
  return (
    <TopSlot delay={delay} tilt={-4}>
      <span className="relative block rounded-full border-3 border-ink bg-mint px-3 py-1 font-display text-lg leading-none whitespace-nowrap text-ink shadow-pop-sm md:text-xl">
        {text}
        {/* A dotted branch down to the face. */}
        <span className="absolute top-full left-1/2 h-4 border-l-3 border-dotted border-ink" />
      </span>
    </TopSlot>
  );
}

/* ------------------------------------------------------------------ teen-magazine poster (crush) */

/** The magazine title stuck above the crush's face. */
export function PosterTitle({ delay = 0.45 }: { delay?: number }) {
  const { t } = useI18n();
  return (
    <TopSlot delay={delay} tilt={-7}>
      <span className="relative block rounded-xl border-3 border-ink bg-pink px-2.5 pt-1 pb-0.5 text-center font-display leading-none text-white shadow-pop-sm">
        <span className="block text-[10px] tracking-[0.2em] text-sun uppercase md:text-xs">N°1 💘</span>
        <span className="text-outline-sm block text-xl whitespace-nowrap uppercase md:text-2xl">{t('reveal.scene.poster')}</span>
      </span>
    </TopSlot>
  );
}

const HEARTS: Array<{ cls: string; emoji: string; size: string; rotate: number }> = [
  { cls: 'top-[34%] left-[-1%]', emoji: '💖', size: 'text-3xl', rotate: -16 },
  { cls: 'top-[68%] left-[1%]', emoji: '💘', size: 'text-2xl', rotate: 12 },
  { cls: 'bottom-[-6%] left-[22%]', emoji: '💕', size: 'text-2xl', rotate: -8 },
  { cls: 'top-[30%] right-[-2%]', emoji: '💗', size: 'text-2xl', rotate: 14 },
  { cls: 'bottom-[-4%] right-[8%]', emoji: '💖', size: 'text-3xl', rotate: -12 },
];

/** Hearts popping around the poster, then beating softly. */
export function Hearts({ delay = 0.5 }: { delay?: number }) {
  return (
    <>
      {HEARTS.map((h, i) => (
        <motion.span
          key={i}
          aria-hidden
          className={cn('pointer-events-none absolute z-[5] leading-none drop-shadow-[0_3px_0_rgba(27,16,54,0.6)]', h.cls, h.size)}
          style={{ rotate: h.rotate }}
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.35, 1, 1.15, 1] }}
          transition={{ duration: 1.3, times: [0, 0.2, 0.35, 0.55, 0.7], delay: delay + i * 0.1, repeat: Infinity, repeatDelay: 1.4 }}
        >
          {h.emoji}
        </motion.span>
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ magnifying glass (body parts) */

const LENS_SHADOW = 'drop-shadow-[0_4px_0_rgba(27,16,54,0.7)]';

/**
 * The 🔍 resting on the body-part photo until the reveal: it creeps to the middle and grows
 * during the drum roll (while the photo zooms in), then leaves for the owner's face.
 */
export function PhotoLens({ zoom, drumrollS }: { zoom: boolean; drumrollS: number }) {
  return (
    <motion.span
      key="lens"
      aria-hidden
      className={cn('pointer-events-none absolute -right-3 bottom-[18%] z-[5] text-5xl leading-none md:text-6xl', LENS_SHADOW)}
      initial={{ opacity: 0, scale: 0.4, rotate: 40 }}
      animate={zoom ? { opacity: 1, scale: 1.35, rotate: -8, x: '-120%', y: '-60%' } : { opacity: 1, scale: 1, rotate: 0, x: 0, y: 0 }}
      exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
      transition={zoom ? { duration: drumrollS * 0.8, ease: 'easeInOut' } : { type: 'spring', stiffness: 320, damping: 16, delay: 0.5 }}
    >
      🔍
    </motion.span>
  );
}

/** The 🔍 flying from the photo onto the owner's face once revealed. */
function LensOnFace({ delay }: { delay: number }) {
  return (
    <motion.span
      className={cn('absolute right-[-6%] bottom-[-8%] text-5xl leading-none md:text-6xl', LENS_SHADOW)}
      initial={{ opacity: 0, x: -150, y: 10, scale: 1.4, rotate: -30 }}
      animate={{ opacity: 1, x: 0, y: 0, scale: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 170, damping: 15, delay }}
    >
      🔍
    </motion.span>
  );
}

/* ------------------------------------------------------------------ detective board (pick, roll) */

/**
 * Where suspects get pinned: their position, their 📌 (in % of the stage) and what their red
 * string ties to (the photo's pin for the top ones, the suspect above for the bottom ones),
 * so the strings run around the photo instead of across it.
 */
const SLOTS: Array<{ cls: string; pin: [number, number]; from: number; tilt: number }> = [
  { cls: 'top-[3%] left-[1%]', pin: [10, 4], from: -1, tilt: -8 },
  { cls: 'top-[3%] right-[1%]', pin: [90, 4], from: -1, tilt: 7 },
  { cls: 'top-[52%] left-[1%]', pin: [10, 53], from: 0, tilt: 6 },
  { cls: 'top-[52%] right-[1%]', pin: [90, 53], from: 1, tilt: -6 },
];
export const MAX_SUSPECTS = SLOTS.length;
/** The photo's pin (on its tape), in % of the stage. */
const PHOTO_PIN: [number, number] = [50, 1];

export interface Suspect {
  player: PublicPlayer;
  votes: number;
}

/**
 * The most voted suspects pinned around the photo with red string (thicker with more votes)
 * and their vote count. At the reveal the culprit (the owner) grows, glows and gets the badge;
 * the others fade.
 */
export function SuspectBoard({ suspects, culpritId }: { suspects: Suspect[]; culpritId: string | null }) {
  const { t } = useI18n();
  return (
    <>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 z-[3] size-full overflow-visible" aria-hidden>
        <AnimatePresence>
          {suspects.map((s, i) => {
            const slot = SLOTS[i];
            const [x1, y1] = slot.from < 0 ? PHOTO_PIN : SLOTS[slot.from].pin;
            const tied = culpritId === s.player.id || (slot.from >= 0 && culpritId === suspects[slot.from]?.player.id);
            return (
              <motion.line
                key={s.player.id}
                x1={x1}
                y1={y1}
                stroke="var(--color-danger-dark)"
                strokeWidth={2.5 + Math.min(4, s.votes) * 0.8}
                strokeDasharray="7 5"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                initial={{ x2: x1, y2: y1 }}
                animate={{ x2: slot.pin[0], y2: slot.pin[1], opacity: culpritId && !tied ? 0.3 : 1 }}
                transition={{
                  x2: { duration: 0.4, delay: 0.15 + i * 0.12, ease: 'easeOut' },
                  y2: { duration: 0.4, delay: 0.15 + i * 0.12, ease: 'easeOut' },
                  opacity: { duration: 0.3 },
                }}
              />
            );
          })}
        </AnimatePresence>
      </svg>
      <motion.span
        aria-hidden
        className="pointer-events-none absolute top-[-3%] left-1/2 z-[4] -translate-x-1/2 text-2xl leading-none"
        initial={{ scale: 0, y: -20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 15 }}
      >
        📌
      </motion.span>
      {suspects.map((s, i) => {
        const slot = SLOTS[i];
        const culprit = culpritId === s.player.id;
        const cleared = culpritId !== null && !culprit;
        return (
          <motion.div
            key={s.player.id}
            aria-hidden
            className={cn('pointer-events-none absolute z-[4] flex flex-col items-center', slot.cls)}
            initial={{ scale: 0, opacity: 0, rotate: slot.tilt + 30 }}
            animate={{
              scale: culprit ? 1.15 : 1,
              opacity: cleared ? 0.4 : 1,
              rotate: slot.tilt,
              filter: cleared ? 'grayscale(0.85)' : 'grayscale(0)',
            }}
            transition={{ type: 'spring', stiffness: 460, damping: 16, delay: culprit ? 0.15 : i * 0.12 }}
          >
            <span className="relative">
              <Avatar player={s.player} size="lg" crown={false} dimOffline={false} selfie highlight={culprit} />
              <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-lg leading-none">📌</span>
              {s.votes > 0 && (
                <span className="absolute -bottom-1 -left-2 rounded-full border-2 border-ink bg-cream px-1.5 text-xs leading-tight font-black text-ink shadow-pop-sm">
                  ×{s.votes}
                </span>
              )}
            </span>
            {culprit && (
              <motion.span
                className="-mt-1.5 rounded-lg border-2 border-ink bg-danger px-1.5 py-0.5 font-display text-xs leading-none whitespace-nowrap text-white uppercase shadow-pop-sm md:text-sm"
                initial={{ scale: 0, rotate: -40 }}
                animate={{ scale: 1, rotate: -8 }}
                transition={{ type: 'spring', stiffness: 560, damping: 14, delay: 0.45 }}
              >
                🔍 {t('reveal.scene.culprit')}
              </motion.span>
            )}
          </motion.div>
        );
      })}
    </>
  );
}

/* ------------------------------------------------------------------ blur games */

/**
 * The blurred photo, wiped clean at the reveal by a pink eraser sticker. `wipe`: the reveal
 * happens on screen (someone joining later just gets the sharp photo).
 */
export function BlurWipe({ src, revealed, wipe }: { src: string; revealed: boolean; wipe: boolean }) {
  const play = revealed && wipe;
  return (
    <>
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
        initial={false}
        animate={{ clipPath: revealed ? 'inset(0 0 0 100%)' : 'inset(0 0 0 0%)' }}
        transition={{ duration: play ? 0.75 : 0, ease: 'easeInOut', delay: play ? 0.1 : 0 }}
      >
        <img src={src} alt="" draggable={false} className="size-full scale-110 object-cover blur-[12px]" />
      </motion.div>
      {play && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute -top-2 -bottom-2 w-6 rounded-lg border-3 border-ink bg-pink shadow-pop-sm"
          initial={{ left: '-8%', opacity: 1, rotate: 8 }}
          animate={{ left: '100%', opacity: [1, 1, 0], rotate: [8, -6, 8] }}
          transition={{ duration: 0.8, ease: 'easeInOut', delay: 0.08 }}
        />
      )}
    </>
  );
}
