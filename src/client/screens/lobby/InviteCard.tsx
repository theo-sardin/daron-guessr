import { AnimatePresence, motion } from 'motion/react';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { MIN_PHOTO_OWNERS } from '../../../shared/protocol';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { toast } from '../../components/Toast';
import { useT } from '../../i18n';
import { roomLink } from '../../lib/router';
import { sfx } from '../../lib/sfx';
import { cn, copyText, vibrate } from '../../lib/util';

const TILE_COLORS = ['bg-pink text-white', 'bg-sun text-ink', 'bg-mint text-ink', 'bg-sky text-ink'];
const TILE_TILTS = [-6, 4, -3, 5];
/** Three buttons (share sheet available): tighter, and tighter still on a 320px phone. */
const COMPACT = 'min-w-0 flex-1 gap-1.5! px-3! text-sm! @max-[18rem]:px-2.5!';

/** Copies the invite link and says so. Shared by the invite card and the empty seat tile. */
export function useCopyInvite(code: string) {
  const t = useT();
  return async () => {
    vibrate(10);
    if (await copyText(roomLink(code))) {
      sfx.play('pop');
      toast(t('common.copied'), 'success', { emoji: '🔗' });
    } else {
      toast(t('lobby.invite.copyFailed', { code }), 'error');
    }
  };
}

function canShare(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

function isWide(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(min-width: 768px)').matches;
}

/** Room code "ticket": giant code, copy / share buttons and a QR code for people in the same room. */
export function InviteCard({ code, playerCount }: { code: string; playerCount: number }) {
  const t = useT();
  const copyInvite = useCopyInvite(code);
  // The QR takes a lot of room on a phone: collapsed by default there.
  const [qrOpen, setQrOpen] = useState(isWide);
  const [qr, setQr] = useState<string | null>(null);
  const [shareable] = useState(canShare);

  useEffect(() => {
    if (!qrOpen || qr) return;
    let alive = true;
    QRCode.toString(roomLink(code), {
      type: 'svg',
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#1b1036', light: '#fff8ec' },
    })
      .then((svg) => {
        if (alive) setQr(`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`);
      })
      .catch(() => {
        // A QR code is a nice-to-have: the code and link are right there.
      });
    return () => {
      alive = false;
    };
  }, [qrOpen, qr, code]);

  const share = async () => {
    try {
      await navigator.share({ title: t('common.appName'), text: t('common.shareText', { code }), url: roomLink(code) });
    } catch (err) {
      // The user closing the share sheet is not an error; anything else falls back to copying.
      if (!(err instanceof DOMException && err.name === 'AbortError')) await copyInvite();
    }
  };

  return (
    <Card tone="cream" className="@container relative overflow-hidden p-4 sm:p-5">
      {/* Ticket punches */}
      <span className="absolute top-1/2 -left-3 size-6 -translate-y-1/2 rounded-full border-3 border-ink bg-grape-900" aria-hidden />
      <span className="absolute top-1/2 -right-3 size-6 -translate-y-1/2 rounded-full border-3 border-ink bg-grape-900" aria-hidden />

      {/* Phone: code, buttons, then the QR below. Wide + QR open: code and buttons on the left, QR on the right. */}
      <div className={cn('grid justify-items-center', qrOpen && 'md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-x-3')}>
        <div className="flex min-w-0 flex-col items-center md:col-start-1 md:row-start-1">
          <p className="font-display text-sm tracking-[0.2em] text-ink-soft uppercase">{t('lobby.invite.label')}</p>
          <motion.button
            type="button"
            onClick={copyInvite}
            whileTap={{ scale: 0.94 }}
            title={t('lobby.invite.tapToCopy')}
            aria-label={`${t('lobby.invite.label')} ${code.split('').join(' ')}. ${t('lobby.invite.tapToCopy')}`}
            className="my-1.5 flex gap-2 rounded-2xl p-1"
          >
            {code.split('').map((ch, i) => (
              <motion.span
                key={`${ch}${i}`}
                className={cn(
                  'flex h-16 w-13 items-center justify-center rounded-2xl border-3 border-ink font-display text-5xl shadow-pop',
                  !qrOpen && 'sm:h-18 sm:w-15 sm:text-6xl',
                  TILE_COLORS[i % TILE_COLORS.length],
                )}
                initial={{ y: -40, scale: 0.4, rotate: 0, opacity: 0 }}
                animate={{ y: 0, scale: 1, rotate: TILE_TILTS[i % TILE_TILTS.length], opacity: 1 }}
                whileHover={{ y: -4, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 520, damping: 14, delay: 0.15 + i * 0.08 }}
              >
                {ch}
              </motion.span>
            ))}
          </motion.button>
          <p className="text-center text-xs font-bold text-ink-soft/80">{t('lobby.invite.tapToCopy')}</p>
        </div>

        {/* Phones with a share sheet get three compact buttons that fit on one row. */}
        <div className="mt-3 flex w-full flex-wrap justify-center gap-2 md:col-start-1 md:row-start-2">
          {shareable && (
            <Button size="md" variant="mint" className={COMPACT} icon={<span aria-hidden>📤</span>} onClick={share}>
              {t('lobby.invite.share')}
            </Button>
          )}
          <Button
            size="md"
            variant="sky"
            className={cn(shareable && cn(COMPACT, '@max-[18rem]:flex-none'))}
            icon={<span aria-hidden>🔗</span>}
            onClick={copyInvite}
            sound={false}
            aria-label={t('common.copyLink')}
          >
            {/* With the share sheet on a 320px phone: Share keeps its label, copy and QR become emoji buttons. */}
            {shareable ? <span className="@max-[18rem]:sr-only">{t('common.copy')}</span> : t('lobby.invite.copyLink')}
          </Button>
          <Button
            size="md"
            variant="secondary"
            className={cn(shareable && COMPACT, shareable && 'flex-none')}
            aria-expanded={qrOpen}
            aria-label={qrOpen ? t('lobby.invite.hideQr') : t('lobby.invite.showQr')}
            icon={<span aria-hidden>{qrOpen ? '🙈' : '📱'}</span>}
            onClick={() => setQrOpen((o) => !o)}
          >
            {shareable ? (
              <span className="@max-[18rem]:sr-only">{qrOpen ? t('lobby.invite.hideQrShort') : t('lobby.invite.qrShort')}</span>
            ) : qrOpen ? (
              t('lobby.invite.hideQr')
            ) : (
              t('lobby.invite.showQr')
            )}
          </Button>
        </div>

        <AnimatePresence initial={false}>
          {qrOpen && (
            <motion.div
              key="qr"
              className="overflow-hidden md:col-start-2 md:row-span-2 md:row-start-1"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            >
              {/* Padding keeps the 👋 sticker inside the clipped (height-animated) box. */}
              <div className="flex flex-col items-center px-4 pt-5 pb-1 md:px-2 md:pt-4">
                <motion.div
                  className="relative mb-2 rounded-2xl border-3 border-ink bg-cream p-2 shadow-pop-sm"
                  initial={{ rotate: -8, scale: 0.7 }}
                  animate={{ rotate: 2, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 14 }}
                >
                  {qr ? (
                    <img src={qr} alt={t('lobby.invite.qrAlt', { code })} className="size-44 [image-rendering:pixelated] md:size-36" />
                  ) : (
                    <div className="size-44 animate-pulse rounded-lg bg-grape-200/50 md:size-36" />
                  )}
                  <span className="absolute -top-4 -right-4 rotate-12 text-3xl drop-shadow" aria-hidden>
                    👋
                  </span>
                </motion.div>
                <p className="max-w-48 text-center font-display text-base leading-tight text-ink">{t('lobby.invite.scan')}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {playerCount < MIN_PHOTO_OWNERS && (
          <p className="mt-3 text-center text-sm font-bold text-pink-dark md:col-span-full">
            {t('lobby.invite.needPlayers', { n: MIN_PHOTO_OWNERS })}
          </p>
        )}
      </div>
    </Card>
  );
}
