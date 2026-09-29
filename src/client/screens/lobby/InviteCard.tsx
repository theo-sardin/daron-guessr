import { AnimatePresence, motion } from 'motion/react';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { MIN_PHOTO_OWNERS } from '../../../shared/protocol';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Icon } from '../../components/Icon';
import { Stamp } from '../../components/Stamp';
import { toast } from '../../components/Toast';
import { Viewfinder } from '../../components/Viewfinder';
import { useT } from '../../i18n';
import { roomLink } from '../../lib/router';
import { sfx } from '../../lib/sfx';
import { cn, copyText, vibrate } from '../../lib/util';

/** Buttons share the row equally, never narrower than their label (the row wraps instead). */
const EVEN = 'min-w-fit flex-1';
/** Three buttons (share sheet available): tighter, and tighter still on a 320px phone. */
const COMPACT = 'gap-1.5! px-3! text-sm! @max-[18rem]:px-2.5!';

/** Copies the invite link and says so. Shared by the invite card and the empty seat tile. */
export function useCopyInvite(code: string) {
  const t = useT();
  return async () => {
    vibrate(10);
    if (await copyText(roomLink(code))) {
      sfx.play('pop');
      toast(t('common.copied'), 'success', { icon: 'link' });
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

/** Room code "ticket": the code as a big date-stamp on a camera LCD, copy / share buttons and a QR code for people in the same room. */
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

  const buttonIcon = 'size-5';

  return (
    <Card tone="cream" className="@container relative overflow-hidden p-4 sm:p-5">
      {/* Ticket punches */}
      <span className="absolute top-1/2 -left-3 size-6 -translate-y-1/2 rounded-full border-3 border-ink bg-grape-900" aria-hidden />
      <span className="absolute top-1/2 -right-3 size-6 -translate-y-1/2 rounded-full border-3 border-ink bg-grape-900" aria-hidden />

      {/* Phone: code, buttons, then the QR below. Wide + QR open: code on the left, QR on the right, buttons across. */}
      <div className={cn('grid grid-cols-[minmax(0,1fr)] justify-items-center', qrOpen && 'md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-x-4')}>
        <div className="flex w-full min-w-0 flex-col items-center md:col-start-1 md:row-start-1">
          {/* The code on the camera's little LCD, framed like the subject in the viewfinder. */}
          <motion.button
            type="button"
            onClick={copyInvite}
            whileTap={{ scale: 0.96 }}
            whileHover={{ y: -2 }}
            title={t('lobby.invite.tapToCopy')}
            aria-label={`${t('lobby.invite.label')} ${code.split('').join(' ')}. ${t('lobby.invite.tapToCopy')}`}
            className="group relative flex w-full max-w-[19rem] flex-col items-center rounded-2xl border-3 border-ink bg-ink px-5 pt-3 pb-4 shadow-pop-sm"
          >
            <span className="flex w-full items-center justify-between text-cream/60">
              <span className="label-mono">{t('lobby.invite.label')}</span>
              <Icon name="copy" className="size-4 transition-colors group-hover:text-cream" />
            </span>
            <Viewfinder color="var(--color-cream)" length={16} thickness={3} gap={10} snap={0.2} className="mt-4 mb-2 px-2 py-1">
              <motion.span
                className="block"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0.35, 1] }}
                transition={{ duration: 0.5, delay: 0.35, times: [0, 0.3, 0.55, 1] }}
              >
                <Stamp variant="mono" size="2xl" valueClassName={cn('text-[3.5rem] sm:text-6xl', qrOpen && 'md:text-5xl')}>
                  {code}
                </Stamp>
              </motion.span>
            </Viewfinder>
          </motion.button>
          <p className="mt-2.5 max-w-[19rem] text-center text-xs leading-snug font-bold text-ink-soft">
            <Icon name="hand" className="mr-1 inline-block size-4 -translate-y-px align-middle" />
            {t('lobby.invite.tapToCopy')}
          </p>
        </div>

        {/* Phones with a share sheet get three compact buttons that fit on one row. */}
        {/* They wrap (full-width rows) only where even the compact labels can't fit, e.g. French at 320px. */}
        <div className="mt-3 flex w-full flex-wrap justify-center gap-2 md:col-span-full md:row-start-2">
          {shareable && (
            <Button size="md" variant="sun" className={cn(EVEN, COMPACT)} icon={<Icon name="share" className={buttonIcon} />} onClick={share}>
              {t('lobby.invite.share')}
            </Button>
          )}
          <Button
            size="md"
            variant={shareable ? 'secondary' : 'sun'}
            className={cn(EVEN, shareable && cn(COMPACT, '@max-[18rem]:flex-none'))}
            icon={<Icon name="link" className={buttonIcon} />}
            onClick={copyInvite}
            sound={false}
            aria-label={t('common.copyLink')}
          >
            {/* With the share sheet on a 320px phone: Share keeps its label, copy and QR become icons. */}
            {shareable ? <span className="@max-[18rem]:sr-only">{t('common.copy')}</span> : t('lobby.invite.copyLink')}
          </Button>
          <Button
            size="md"
            variant="secondary"
            className={cn(shareable ? cn(COMPACT, 'flex-none') : EVEN)}
            aria-expanded={qrOpen}
            aria-label={qrOpen ? t('lobby.invite.hideQr') : t('lobby.invite.showQr')}
            icon={<Icon name={qrOpen ? 'eye-off' : 'qr'} className={buttonIcon} />}
            onClick={() => setQrOpen((o) => !o)}
          >
            {shareable ? (
              <span className="@max-[18rem]:sr-only">{qrOpen ? t('lobby.invite.hideQrShort') : t('lobby.invite.qrShort')}</span>
            ) : qrOpen
                ? t('lobby.invite.hideQr')
                : t('lobby.invite.showQr')}
          </Button>
        </div>

        <AnimatePresence initial={false}>
          {qrOpen && (
            <motion.div
              key="qr"
              className="overflow-hidden md:col-start-2 md:row-start-1"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            >
              {/* Padding keeps the scan brackets inside the clipped (height-animated) box. */}
              <div className="flex flex-col items-center px-4 pt-6 pb-1 md:px-3 md:pt-4">
                {/* A scanner target: the brackets keep hunting for focus. */}
                <Viewfinder color="var(--color-ink)" length={20} thickness={3.5} gap={9} snap hunt className="mb-4">
                  <motion.div
                    className="rounded-xl border-3 border-ink bg-cream p-1.5"
                    initial={{ scale: 0.7 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 16 }}
                  >
                    {qr ? (
                      <img src={qr} alt={t('lobby.invite.qrAlt', { code })} className="size-40 [image-rendering:pixelated] md:size-32" />
                    ) : (
                      <div className="size-40 animate-pulse rounded-lg bg-grape-200/50 md:size-32" />
                    )}
                  </motion.div>
                </Viewfinder>
                <p className="max-w-48 text-center font-display text-base leading-tight text-ink">{t('lobby.invite.scan')}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {playerCount < MIN_PHOTO_OWNERS && (
          <p className="mt-3 max-w-[19rem] text-center text-sm leading-snug font-bold text-pink-dark md:col-span-full md:max-w-none">
            {/* Inline, so it hugs the first line whatever the wrapping. */}
            <Icon name="users" className="mr-1.5 inline-block size-4.5 -translate-y-px align-middle" />
            {t('lobby.invite.needPlayers', { n: MIN_PHOTO_OWNERS })}
          </p>
        )}
      </div>
    </Card>
  );
}
