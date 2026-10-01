import { motion } from 'motion/react';
import { useState } from 'react';
import { useI18n, type Lang } from '../i18n';
import { navigate, roomLink } from '../lib/router';
import { sfx, useMuted } from '../lib/sfx';
import { api, useRoom } from '../lib/store';
import { copyText, cn } from '../lib/util';
import { PaperTexture } from './Background';
import { DymoLabel } from './DymoLabel';
import { Icon } from './Icon';
import { Logo, useHeroLogoVisible } from './Logo';
import { MarkerCircle } from './Marker';
import { ConfirmDialog } from './Modal';
import { RoundButton } from './RoundButton';
import { Tape } from './Tape';
import { toast } from './Toast';
import { TornPaper } from './TornPaper';

/** Typewriter label over the room code (kept here: the top bar is the only place it is used). */
const ROOM_NO: Record<Lang, string> = { fr: 'salon n°', en: 'room no.' };

/**
 * "FR EN" typed on a post-it tab stuck to the bar: two real buttons (44px each), the current
 * language circled in red marker (tapping it does nothing, the loop moves to the new one).
 */
function LangSwitch({ lang, setLang, label, className }: { lang: Lang; setLang: (l: Lang) => void; label: string; className?: string }) {
  return (
    <div role="group" aria-label={label} className={cn('relative shrink-0', className)} style={{ rotate: '2.5deg' }}>
      <TornPaper surface="postit" edges="b" amp={2} step={5} seed="lang-tab" lift="sm" className="flex h-11 items-center">
        {(['fr', 'en'] as const).map((l) => (
          <motion.button
            key={l}
            type="button"
            lang={l}
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              if (l === lang) return;
              sfx.play('marker');
              setLang(l);
            }}
            aria-pressed={l === lang}
            aria-label={l === 'fr' ? 'Français' : 'English'}
            className={cn('flex h-11 w-11 items-center justify-center text-[13px] font-black tracking-[0.06em] transition-colors', l === lang ? 'text-ink' : 'text-ink-soft hover:text-ink')}
          >
            <MarkerCircle show={l === lang} pad={4} strokeWidth={2.4} seed={`lang-${l}`} className="px-0.5">
              {l.toUpperCase()}
            </MarkerCircle>
          </motion.button>
        ))}
      </TornPaper>
      <Tape width={26} height={11} rotate={-8} className="-top-1.5 left-1/2 -translate-x-1/2" />
    </div>
  );
}

/**
 * Fixed header: "salon n°" + the room code on a Dymo label (tap to copy the link), sound,
 * language, leave. The language tab only shows before the game (home, and the lobby from
 * 360px): during play the bar keeps to the code, sound and leave.
 */
export function TopBar() {
  const { t, lang, setLang } = useI18n();
  const muted = useMuted();
  const view = useRoom();
  const heroLogo = useHeroLogoVisible();
  const [confirmLeave, setConfirmLeave] = useState(false);

  const copyCode = async () => {
    if (!view) return;
    sfx.play('tape');
    if (await copyText(roomLink(view.code))) toast(t('common.copied'), 'success', { icon: 'link' });
  };

  return (
    <header className="safe-top fixed inset-x-0 top-0 z-50">
      {/* The page's own paper, fading out at the bottom so content slides under it softly. */}
      <PaperTexture className="absolute inset-0 -bottom-3 [mask-image:linear-gradient(to_bottom,black_72%,transparent)]" />
      <div className="relative mx-auto flex h-16 max-w-5xl items-center gap-2 px-4">
        {view ? (
          <motion.button
            type="button"
            whileTap={{ scale: 0.95, rotate: -3 }}
            onClick={copyCode}
            title={t('common.copyLink')}
            aria-label={`${t('common.roomCode')} ${view.code.split('').join(' ')}. ${t('common.copyLink')}`}
            className="group flex min-h-11 shrink-0 flex-col items-start gap-[3px]"
          >
            <span className="label-type ml-0.5 flex items-center gap-1 text-[11px]" aria-hidden>
              {ROOM_NO[lang]}
              <Icon name="link" className="size-3 opacity-0 transition-opacity group-hover:opacity-70" />
            </span>
            <DymoLabel text={view.code} size={20} tilt={-2} spacing={0.24} />
          </motion.button>
        ) : (
          // Hidden (not unmounted) while Home's big logo is on screen: one wordmark above the fold.
          <button
            type="button"
            onClick={() => navigate('/')}
            className={cn('-ml-1 flex h-12 items-center pt-1 pl-1 transition-opacity duration-300', heroLogo && 'pointer-events-none opacity-0')}
            aria-label={t('common.backHome')}
            aria-hidden={heroLogo || undefined}
            tabIndex={heroLogo ? -1 : undefined}
          >
            <Logo size="sm" />
          </button>
        )}
        <div className="ml-auto flex items-center gap-2">
          <RoundButton
            label={muted ? t('common.soundOff') : t('common.soundOn')}
            tilt={-4}
            sound={false}
            onClick={() => {
              sfx.setMuted(!muted);
              if (muted) sfx.play('pop');
            }}
          >
            <Icon name={muted ? 'sound-off' : 'sound-on'} fill="currentColor" className="size-6" />
          </RoundButton>
          {(!view || view.phase === 'lobby') && (
            <LangSwitch lang={lang} setLang={setLang} label={t('common.language')} className={view ? 'max-[359px]:hidden' : undefined} />
          )}
          {view && (
            <RoundButton label={t('common.leaveRoom')} tone="red" tilt={5} onClick={() => setConfirmLeave(true)}>
              <Icon name="leave" className="size-6" />
            </RoundButton>
          )}
        </div>
      </div>
      <ConfirmDialog
        open={confirmLeave}
        title={t('common.leaveConfirmTitle')}
        body={view?.phase === 'lobby' ? t('common.leaveConfirmLobby') : t('common.leaveConfirmGame')}
        confirmLabel={t('common.leave')}
        danger
        onCancel={() => setConfirmLeave(false)}
        onConfirm={async () => {
          setConfirmLeave(false);
          await api.leave();
          navigate('/');
        }}
      />
    </header>
  );
}
