import { AnimatePresence, motion } from 'motion/react';
import type { PublicPlayer } from '../../../shared/protocol';
import { Annotation, MarkerCircle } from '../../components/Marker';
import { RubberStamp } from '../../components/RubberStamp';
import { SelfiePrint } from '../../components/SelfiePrint';
import { StarBurst } from '../../components/StarBurst';
import { useI18n } from '../../i18n';
import { cn } from '../../lib/util';

/*
 * The mode-specific decorations of the reveal (see SCENE in kinds.ts), drawn around the photo
 * in the scrapbook language. Everything here is positioned inside PhotoStage's box
 * (`relative`, ~358×300 on a phone, 480×380 from md): the photo sits in the middle, and from
 * the owner reveal on, slides left to make room for the owner's print on the right.
 */

const INK = 'var(--color-ink)';
const RED = 'var(--color-red)';
const BLUE = 'var(--color-blue)';

/** The owner's print next to the photo (their selfie, or their avatar on paper): two sizes. */
export function Companion({ owner, caption, delay = 0.35, className }: { owner: PublicPlayer; caption?: string; delay?: number; className?: string }) {
  return (
    <div className={cn('pointer-events-none absolute top-[120px] right-1 z-[4] md:top-[150px] md:right-2', className)}>
      <span className="block md:hidden">
        <SelfiePrint player={owner} size={118} tilt={5} caption={caption} tape="yellow" animate={delay} />
      </span>
      <span className="hidden md:block">
        <SelfiePrint player={owner} size={148} tilt={5} caption={caption} tape="yellow" animate={delay} />
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ album (parents) */

/** The album page the photo is mounted on: it turns in like a page when the photo arrives. */
export function AlbumPage() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-3 top-1 bottom-3 [perspective:1100px] md:inset-x-6">
      {/* The page underneath (already turned). */}
      <div className="absolute inset-0 rotate-[1.5deg] rounded-[3px] bg-[#2b2520] shadow-paper" />
      <motion.div
        className="absolute inset-0 rounded-[3px] bg-[#342c26] shadow-paper"
        style={{
          originX: 0,
          backgroundImage: 'radial-gradient(rgb(255 255 255 / 0.05) 1px, transparent 1.2px)',
          backgroundSize: '5px 5px',
        }}
        initial={{ rotateY: -150, opacity: 0.6 }}
        animate={{ rotateY: 0, opacity: 1 }}
        transition={{ duration: 0.75, ease: [0.3, 0.6, 0.25, 1] }}
      >
        {/* Spiral binding holes along the spine. */}
        <div className="absolute inset-y-4 left-2 flex flex-col justify-between">
          {Array.from({ length: 9 }, (_, i) => (
            <span key={i} className="block size-2.5 rounded-full bg-paper shadow-[inset_0_1px_2px_rgb(0_0_0/0.5)]" />
          ))}
        </div>
      </motion.div>
    </div>
  );
}

/** Black photo corners holding a print on an album page. */
export function PhotoCorners() {
  const corner = 'absolute size-6 bg-ink shadow-[0_1px_1px_rgb(0_0_0/0.3)]';
  return (
    <span aria-hidden className="pointer-events-none absolute -inset-1.5 z-[3]">
      <span className={cn(corner, 'top-0 left-0 [clip-path:polygon(0_0,100%_0,0_100%)]')} />
      <span className={cn(corner, 'top-0 right-0 [clip-path:polygon(0_0,100%_0,100%_100%)]')} />
      <span className={cn(corner, 'bottom-0 left-0 [clip-path:polygon(0_0,100%_100%,0_100%)]')} />
      <span className={cn(corner, 'right-0 bottom-0 [clip-path:polygon(100%_0,100%_100%,0_100%)]')} />
    </span>
  );
}

/**
 * The hand-drawn "family resemblance" meter: a ballpoint gauge whose red needle swings to the
 * share of players who recognised the owner (a resemblance everybody saw = 100%).
 */
export function ResemblanceMeter({ value, delay = 0.6 }: { value: number; delay?: number }) {
  const { t } = useI18n();
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  const angle = -90 + pct * 1.8;
  return (
    <motion.div
      className="pointer-events-none absolute top-0 right-0 z-[5] flex w-[140px] flex-col items-center md:top-1 md:right-1 md:w-[176px]"
      initial={{ opacity: 0, scale: 0.6, rotate: -12 }}
      animate={{ opacity: 1, scale: 1, rotate: -3 }}
      transition={{ type: 'spring', stiffness: 420, damping: 18, delay }}
    >
      <Annotation font="pen" size={20} rotate={-2} delay={delay + 0.1} className="whitespace-nowrap md:text-[24px]!">
        {t('reveal.scene.resemblance')}
      </Annotation>
      <div className="flex w-full items-end justify-center gap-1">
        <svg viewBox="0 0 120 66" className="w-[86px] overflow-visible md:w-[108px]" aria-hidden>
          {/* Wobbly ballpoint arc and ticks. */}
          <motion.path
            d="M8 60 C 9 28, 34 7, 60 7 C 87 6, 111 28, 112 60"
            fill="none"
            stroke={BLUE}
            strokeWidth="4"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, delay: delay + 0.15 }}
          />
          {[-72, -36, 0, 36, 72].map((a) => (
            <line key={a} x1="60" y1="17" x2="60" y2="26" stroke={BLUE} strokeWidth="3" strokeLinecap="round" transform={`rotate(${a} 60 60)`} />
          ))}
          <motion.g
            style={{ originX: '60px', originY: '60px' }}
            initial={{ rotate: -90 }}
            animate={{ rotate: [-90, Math.min(90, angle + 25), angle - 8, angle] }}
            transition={{ duration: 1.1, times: [0, 0.55, 0.8, 1], delay: delay + 0.45, ease: 'easeOut' }}
          >
            <path d="M60 60 L60 16" stroke={RED} strokeWidth="5" strokeLinecap="round" />
          </motion.g>
          <circle cx="60" cy="60" r="6.5" fill={INK} />
        </svg>
        <motion.span
          className="font-display text-[22px] leading-none md:text-[28px]"
          initial={{ opacity: 0, scale: 1.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: delay + 1.2, type: 'spring', stiffness: 500, damping: 18 }}
        >
          {pct}%
        </motion.span>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ glow-up (kid, me) */

/** "THEN → NOW": a red arrow from the photo to the owner's print, and a GLOW-UP star. */
export function GlowUp({ delay = 0.45 }: { delay?: number }) {
  const { t } = useI18n();
  return (
    <>
      <svg viewBox="0 0 70 40" className="pointer-events-none absolute top-[150px] left-[58%] z-[6] w-[58px] overflow-visible md:top-[190px] md:left-[59%] md:w-[70px]" aria-hidden>
        <motion.path
          d="M4 30 C 20 6, 44 4, 62 16 M50 6 L63 17 L48 24"
          fill="none"
          stroke={RED}
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.45, delay: delay + 0.2 }}
        />
      </svg>
      <div className="pointer-events-none absolute top-0 right-0 z-[6] md:top-1 md:right-2">
        <span className="block md:hidden">
          <StarBurst tone="pink" size={96} tilt={10} spikes={16} animate={delay + 0.6}>
            <span className="font-display text-[19px] leading-[0.95]">{t('reveal.scene.glowUp')}</span>
          </StarBurst>
        </span>
        <span className="hidden md:block">
          <StarBurst tone="pink" size={118} tilt={10} spikes={16} animate={delay + 0.6}>
            <span className="font-display text-[23px] leading-[0.95]">{t('reveal.scene.glowUp')}</span>
          </StarBurst>
        </span>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ family tree */

/** A doodled branch from the photo to the owner's print, leaves, and the relation written on it. */
export function TreeDoodle({ relation, delay = 0.4 }: { relation: string; delay?: number }) {
  const leaves: Array<[number, number, number]> = [
    [30, 38, -30],
    [52, 34, 25],
    [74, 38, -20],
    [118, 52, 40],
    [112, 78, -35],
  ];
  return (
    <div className="pointer-events-none absolute top-[6px] right-1 z-[3] h-[112px] w-[160px] md:top-[18px] md:right-2 md:h-[132px] md:w-[200px]">
      <svg viewBox="0 0 160 112" className="absolute inset-0 size-full overflow-visible" aria-hidden>
        <motion.path
          d="M-4 70 C 20 66, 30 46, 60 44 C 90 42, 108 40, 118 52 C 126 62, 116 84, 112 110"
          fill="none"
          stroke="#5a3a1c"
          strokeWidth="4.5"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.7, delay, ease: 'easeInOut' }}
        />
        {leaves.map(([x, y, r], i) => (
          <motion.ellipse
            key={i}
            cx={x}
            cy={y}
            rx="7"
            ry="3.6"
            fill="var(--color-mint)"
            stroke={INK}
            strokeWidth="1.6"
            transform={`rotate(${r} ${x} ${y})`}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{ originX: `${x}px`, originY: `${y}px` }}
            transition={{ type: 'spring', stiffness: 500, damping: 14, delay: delay + 0.4 + i * 0.07 }}
          />
        ))}
        <motion.circle cx="-4" cy="70" r="5" fill={RED} stroke={INK} strokeWidth="1.6" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay }} />
      </svg>
      <Annotation font="pen" size={23} rotate={-6} delay={delay + 0.5} className="absolute top-[2px] left-[26%] whitespace-nowrap md:top-[6px]">
        {relation}
      </Annotation>
    </div>
  );
}

/* ------------------------------------------------------------------ teen-magazine poster (crush) */

const HEART = 'M12 21 C 5 15, 1 11, 2.5 6.5 C 4 2, 9.5 1.5, 12 5.5 C 14.5 1.5, 20 2, 21.5 6.5 C 23 11, 19 15, 12 21 Z';
const HEARTS: Array<{ cls: string; size: number; rotate: number; fill: string }> = [
  { cls: 'top-[6px] left-[6%]', size: 34, rotate: -18, fill: 'var(--color-pink)' },
  { cls: 'top-[150px] left-[1%]', size: 26, rotate: 12, fill: 'var(--color-red)' },
  { cls: 'top-[232px] left-[10%] md:top-[300px]', size: 30, rotate: -8, fill: 'var(--color-pink)' },
  { cls: 'top-[14px] right-[30%] md:right-[33%]', size: 22, rotate: 20, fill: 'var(--color-red)' },
  { cls: 'top-[70px] right-[6%]', size: 32, rotate: 14, fill: 'var(--color-pink)' },
  { cls: 'top-[262px] right-[4%] md:top-[330px]', size: 24, rotate: -14, fill: 'var(--color-red)' },
];

/** Hearts popping around the poster, beating softly. */
export function Hearts({ delay = 0.5 }: { delay?: number }) {
  return (
    <>
      {HEARTS.map((h, i) => (
        <motion.svg
          key={i}
          viewBox="0 0 24 24"
          className={cn('pointer-events-none absolute z-[6] overflow-visible', h.cls)}
          style={{ width: h.size, height: h.size, rotate: h.rotate }}
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.3, 1, 1.12, 1] }}
          transition={{ duration: 1.4, times: [0, 0.2, 0.35, 0.55, 0.7], delay: delay + i * 0.09 }}
          aria-hidden
        >
          <path d={HEART} fill={h.fill} stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
        </motion.svg>
      ))}
    </>
  );
}

/** The magazine masthead stuck across the top of the poster, with push pins. */
export function PosterMasthead({ delay = 0.2 }: { delay?: number }) {
  const { t } = useI18n();
  return (
    <motion.div
      className="pointer-events-none absolute -top-3 -inset-x-4 z-[5] flex justify-center"
      initial={{ y: -40, opacity: 0, rotate: -12 }}
      animate={{ y: 0, opacity: 1, rotate: -5 }}
      transition={{ type: 'spring', stiffness: 380, damping: 16, delay }}
    >
      <span className="font-wide paper-red relative block px-3 pt-1.5 pb-1 text-[19px] leading-none whitespace-nowrap text-white uppercase shadow-paper-sm md:text-[23px]">
        {t('reveal.scene.poster')}
        <span className="absolute -top-1.5 left-1.5 size-3.5 rounded-full border-2 border-ink bg-yellow" />
        <span className="absolute -top-1.5 right-1.5 size-3.5 rounded-full border-2 border-ink bg-blue" />
      </span>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ magnifying glass (body parts) */

/** An ink magnifying glass: a ring with a glassy shine and a handle. */
export function Magnifier({ size = 92, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={cn('overflow-visible', className)} aria-hidden>
      <line x1="64" y1="64" x2="94" y2="94" stroke={INK} strokeWidth="11" strokeLinecap="round" />
      <line x1="66" y1="66" x2="92" y2="92" stroke="#7a4b24" strokeWidth="6" strokeLinecap="round" />
      <circle cx="40" cy="40" r="32" fill="rgb(169 200 242 / 0.22)" stroke={INK} strokeWidth="7" />
      <path d="M22 30 A 20 20 0 0 1 36 18" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity="0.85" />
    </svg>
  );
}

/**
 * Anatomy-sketch callout: dashed ballpoint lines from the magnifier hovering over the owner's
 * print to the photo, like a detail view in a textbook.
 */
export function LensCallout({ delay = 0.5 }: { delay?: number }) {
  return (
    <>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 z-[5] size-full" aria-hidden>
        {[
          [78, 54, 61, 10],
          [78, 54, 61, 84],
        ].map(([x1, y1, x2, y2], i) => (
          <motion.line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={BLUE}
            strokeWidth="2.2"
            strokeDasharray="5 5"
            vectorEffect="non-scaling-stroke"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.45, delay: delay + 0.35 + i * 0.12 }}
          />
        ))}
      </svg>
      <motion.div
        className="pointer-events-none absolute top-[132px] right-[42px] z-[6] md:top-[172px] md:right-[58px]"
        initial={{ x: -150, y: -40, scale: 1.6, rotate: -30, opacity: 0 }}
        animate={{ x: 0, y: 0, scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 160, damping: 16, delay }}
      >
        <Magnifier size={70} />
      </motion.div>
    </>
  );
}

/* ------------------------------------------------------------------ detective board (pick, roll) */

/** Cork board with a wooden frame, behind the photo and the suspects. */
export function CorkBoard() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 bottom-1 rounded-[6px] border-[7px] border-[#8a5a2b] shadow-paper md:inset-x-2"
      style={{
        backgroundColor: '#c99c63',
        backgroundImage:
          'radial-gradient(rgb(110 66 24 / 0.35) 1px, transparent 1.4px), radial-gradient(rgb(255 240 210 / 0.22) 1px, transparent 1.5px)',
        backgroundSize: '6px 6px, 9px 9px',
        backgroundPosition: '0 0, 3px 4px',
        boxShadow: 'inset 0 0 0 2px #6b4320, inset 0 0 18px rgb(60 30 5 / 0.35), var(--shadow-paper)',
      }}
    />
  );
}

/** Where suspects get pinned: their print's position and, in % of the stage, the pin the string ties to. */
const SLOTS: Array<{ cls: string; pin: [number, number]; tilt: number }> = [
  { cls: 'top-[14px] left-[10px] md:left-[24px]', pin: [11, 7], tilt: -6 },
  { cls: 'top-[14px] right-[10px] md:right-[24px]', pin: [89, 7], tilt: 5 },
  { cls: 'top-[150px] left-[12px] md:top-[192px] md:left-[30px]', pin: [11, 52], tilt: 4 },
  { cls: 'top-[150px] right-[12px] md:top-[192px] md:right-[30px]', pin: [89, 52], tilt: -5 },
];
export const MAX_SUSPECTS = SLOTS.length;
/** The photo's push pin (top center of the print), in % of the stage. */
const PHOTO_PIN: [number, number] = [50, 6];

export interface Suspect {
  player: PublicPlayer;
  votes: number;
}

/**
 * The suspects pinned around the photo, a red string from the photo to each of them (thicker
 * with more votes) and the vote count on a tag. At the reveal, the culprit gets circled and
 * stamped, the others fade.
 */
export function SuspectBoard({ suspects, culpritId, live }: { suspects: Suspect[]; culpritId: string | null; live: boolean }) {
  const { t } = useI18n();
  return (
    <>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 z-[4] size-full" aria-hidden>
        <AnimatePresence>
          {suspects.map((s, i) => {
            const slot = SLOTS[i];
            const culprit = culpritId === s.player.id;
            return (
              <motion.line
                key={s.player.id}
                x1={PHOTO_PIN[0]}
                y1={PHOTO_PIN[1]}
                x2={slot.pin[0]}
                y2={slot.pin[1]}
                stroke="#c4161c"
                strokeWidth={1.6 + Math.min(4, s.votes) * 0.9}
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1, opacity: culpritId && !culprit ? 0.35 : 1 }}
                transition={{ pathLength: { duration: 0.45, delay: 0.15 + i * 0.12 }, opacity: { duration: 0.3 } }}
                style={{ filter: 'drop-shadow(0 1px 0 rgb(0 0 0 / 0.35))' }}
              />
            );
          })}
        </AnimatePresence>
      </svg>
      {suspects.map((s, i) => {
        const slot = SLOTS[i];
        const culprit = culpritId === s.player.id;
        const cleared = culpritId !== null && !culprit;
        return (
          <motion.div
            key={s.player.id}
            className={cn('pointer-events-none absolute z-[5]', slot.cls)}
            initial={{ scale: 1.4, opacity: 0, rotate: slot.tilt + 10 }}
            animate={{ scale: 1, opacity: cleared ? 0.55 : 1, rotate: slot.tilt, filter: cleared ? 'grayscale(0.8)' : 'grayscale(0)' }}
            transition={{ type: 'spring', stiffness: 480, damping: 20, delay: i * 0.12 }}
          >
            <MarkerCircle show={culprit} pad={7} delay={0.35} sound={live} seed={s.player.id}>
              <span className="block md:hidden">
                <SelfiePrint player={s.player} size={62} tilt={0} tape={false} />
              </span>
              <span className="hidden md:block">
                <SelfiePrint player={s.player} size={76} tilt={0} tape={false} />
              </span>
            </MarkerCircle>
            {/* Push pin. */}
            <span aria-hidden className="absolute -top-1.5 left-1/2 z-10 size-3.5 -translate-x-1/2 rounded-full border-2 border-ink bg-red shadow-[0_2px_0_rgb(0_0_0/0.3)]" />
            {s.votes > 0 && (
              <span className="absolute -bottom-2 -left-2 z-10 rounded-[2px] bg-sheet px-1 font-display text-[13px] leading-[1.25] text-red-ink shadow-paper-sm">
                ×{s.votes}
              </span>
            )}
            {culprit && (
              <RubberStamp size="xs" tilt={-14} backing animate={0.55} sound={live} className="absolute -right-4 -bottom-3 z-20">
                {t('reveal.scene.culprit')}
              </RubberStamp>
            )}
          </motion.div>
        );
      })}
    </>
  );
}
