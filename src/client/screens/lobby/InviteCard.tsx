import { AnimatePresence, motion } from 'motion/react';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { MIN_PHOTO_OWNERS } from '../../../shared/protocol';
import { Button } from '../../components/Button';
import { DymoLabel } from '../../components/DymoLabel';
import { Icon } from '../../components/Icon';
import { KraftCard } from '../../components/Paper';
import { Tape } from '../../components/Tape';
import { toast } from '../../components/Toast';
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

/** The invite, on kraft paper: "salon n°" + the room code on a red Dymo label (tap to copy), copy / share buttons and a QR code for people in the same room. */
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
      color: { dark: '#17130f', light: '#fffdf6' },
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
  const spaced = code.split('').join(' ');

  return (
    <KraftCard tape tilt={-0.6} seed={`invite-${code}`} className="@container relative p-4 pb-6 sm:p-5 sm:pb-7">
      {/* Phone: code, buttons, then the QR below. Wide + QR open: code on the left, QR on the right, buttons across. */}
      <div className={cn('grid grid-cols-[minmax(0,1fr)] justify-items-center', qrOpen && 'md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-x-4')}>
        <div className="flex w-full min-w-0 flex-col items-center md:col-start-1 md:row-start-1">
          {/* "salon n°" typed above the code, punched on a red Dymo label: tap to copy the link. */}
          <motion.button
            type="button"
            onClick={copyInvite}
            whileTap={{ scale: 0.95, rotate: 1 }}
            whileHover={{ y: -2 }}
            title={t('lobby.invite.tapToCopy')}
            aria-label={`${t('lobby.invite.label')} ${spaced}. ${t('lobby.invite.tapToCopy')}`}
            className="group relative flex flex-col items-start px-2 pt-1 pb-2"
          >
            <span className="label-type mb-1.5 text-[0.9rem]" aria-hidden>
              {t('lobby.invite.roomNo')}
            </span>
            <DymoLabel text={code} tone="red" size={qrOpen ? 38 : 44} tilt={-2.5} spacing={0.3} animate={0.25} />
            <span className="text-pen absolute -right-3 -bottom-5 flex rotate-[-6deg] items-center gap-1 text-[1.15rem] whitespace-nowrap" aria-hidden>
              <svg viewBox="0 0 30 20" className="size-6 -scale-x-100 rotate-[200deg] overflow-visible" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                <path d="M2 16 C 10 4, 20 2, 28 6" />
                <path d="M22 1 L28 6 L21 10" />
              </svg>
              {t('lobby.invite.copyHint')}
            </span>
          </motion.button>
        </div>

        {/* Phones with a share sheet get three compact buttons that fit on one row. */}
        {/* They wrap (full-width rows) only where even the compact labels can't fit, e.g. French at 320px. */}
        <div className="mt-7 flex w-full flex-wrap justify-center gap-2 md:col-span-full md:row-start-2">
          {shareable && (
            <Button size="md" variant="sun" className={cn(EVEN, COMPACT)} icon={<Icon name="share" className={buttonIcon} />} onClick={share}>
              {t('lobby.invite.share')}
            </Button>
          )}
          <Button
            size="md"
            variant={shareable ? 'outline' : 'sun'}
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
            variant="outline"
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
              {/* Padding keeps the tape and the tilt inside the clipped (height-animated) box. */}
              <div className="flex flex-col items-center px-4 pt-7 pb-1 md:px-3 md:pt-5">
                {/* The QR printed on a scrap of white paper, taped on the kraft. */}
                <motion.div
                  className="relative bg-sheet p-2 shadow-paper-sm"
                  initial={{ scale: 0.7, rotate: -8 }}
                  animate={{ scale: 1, rotate: 2 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 16 }}
                >
                  <Tape width={52} height={18} rotate={-5} className="-top-2.5 left-1/2 -translate-x-1/2" />
                  {qr ? (
                    <img src={qr} alt={t('lobby.invite.qrAlt', { code })} className="size-40 [image-rendering:pixelated] md:size-32" />
                  ) : (
                    <div className="size-40 animate-pulse bg-paper-dark md:size-32" />
                  )}
                </motion.div>
                <p className="text-pen mt-3 max-w-52 -rotate-2 text-center text-[1.3rem] leading-none">{t('lobby.invite.scan')}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {playerCount < MIN_PHOTO_OWNERS && (
          <p className="text-marker mt-4 max-w-[20rem] -rotate-1 text-center text-[1.05rem] leading-tight md:col-span-full md:max-w-none">
            {t('lobby.invite.needPlayers', { n: MIN_PHOTO_OWNERS })}
          </p>
        )}
      </div>
    </KraftCard>
  );
}
