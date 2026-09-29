import { motion } from 'motion/react';
import { useState } from 'react';
import { useI18n, type Lang } from '../i18n';
import { navigate, roomLink } from '../lib/router';
import { sfx, useMuted } from '../lib/sfx';
import { api, useRoom } from '../lib/store';
import { copyText, cn } from '../lib/util';
import { Icon } from './Icon';
import { Logo, useHeroLogoVisible } from './Logo';
import { ConfirmDialog } from './Modal';
import { toast } from './Toast';

const CHROME = 'border-2 border-white/15 bg-white/8 text-cream backdrop-blur hover:bg-white/15 hover:border-white/25';

function IconButton({ label, onClick, children, className }: { label: string; onClick: () => void; children: React.ReactNode; className?: string }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.88 }}
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn('flex size-11 items-center justify-center rounded-2xl transition-colors', CHROME, className)}
    >
      {children}
    </motion.button>
  );
}

/**
 * "FR | EN" segmented control: two real buttons, each sets its own language (tapping the lit
 * one does nothing). The pill is 44px tall and each half ~40px wide, padding included.
 */
function LangSwitch({ lang, setLang, label }: { lang: Lang; setLang: (l: Lang) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="flex h-11 items-center gap-0.5 rounded-2xl border-2 border-white/15 bg-white/8 p-1 text-cream backdrop-blur">
      {(['fr', 'en'] as const).map((l) => (
        <motion.button
          key={l}
          type="button"
          lang={l}
          whileTap={{ scale: 0.9 }}
          onClick={() => l !== lang && setLang(l)}
          aria-pressed={l === lang}
          aria-label={l === 'fr' ? 'Français' : 'English'}
          className={cn(
            'relative flex h-full w-9 items-center justify-center rounded-xl font-mono text-[11px] font-bold tracking-[0.08em] transition-colors',
            l === lang ? 'text-ink' : 'text-cream/55 hover:text-cream',
          )}
        >
          {l === lang && (
            <motion.span layoutId="lang-pill" className="absolute inset-0 rounded-xl bg-cream" transition={{ type: 'spring', stiffness: 600, damping: 36 }} />
          )}
          <span className="relative">{l.toUpperCase()}</span>
        </motion.button>
      ))}
    </div>
  );
}

/** Fixed header: room code (tap to copy the invite link), sound, language and leave. */
export function TopBar() {
  const { t, lang, setLang } = useI18n();
  const muted = useMuted();
  const view = useRoom();
  const heroLogo = useHeroLogoVisible();
  const [confirmLeave, setConfirmLeave] = useState(false);

  const copyCode = async () => {
    if (!view) return;
    if (await copyText(roomLink(view.code))) toast(t('common.copied'), 'success', { icon: 'link' });
  };

  return (
    <header className="safe-top fixed inset-x-0 top-0 z-50 bg-gradient-to-b from-grape-950/90 to-transparent">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-3">
        {view ? (
          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={copyCode}
            title={t('common.copyLink')}
            aria-label={`${t('common.roomCode')} ${view.code.split('').join(' ')}. ${t('common.copyLink')}`}
            className="group flex h-11 shrink-0 items-center gap-2.5 rounded-2xl border-2 border-white/15 bg-ink/85 pr-2.5 pl-3 shadow-[inset_0_-12px_20px_-14px_rgb(255_122_26_/_0.45)] backdrop-blur transition-colors hover:border-stamp/50"
          >
            <span className="label-mono hidden text-cream/55 min-[350px]:inline" aria-hidden>
              {t('common.room')}
            </span>
            {/* Space Mono, not DSEG14: this is the one string people read aloud and type. */}
            <span className="text-stamp -mr-[0.18em] font-mono text-[1.2rem] leading-none font-bold tracking-[0.18em]" aria-hidden>
              {view.code}
            </span>
            <span className="hidden text-cream/45 transition-colors group-hover:text-cream min-[380px]:block">
              <Icon name="link" className="block size-4" />
            </span>
          </motion.button>
        ) : (
          // Hidden (not unmounted) while Home's big logo is on screen: one wordmark above the fold.
          <button
            type="button"
            onClick={() => navigate('/')}
            className={cn('flex h-11 items-center px-2 transition-opacity duration-300', heroLogo && 'pointer-events-none opacity-0')}
            aria-label={t('common.backHome')}
            aria-hidden={heroLogo || undefined}
            tabIndex={heroLogo ? -1 : undefined}
          >
            <Logo size="sm" />
          </button>
        )}
        <div className="ml-auto flex items-center gap-2">
          <IconButton
            label={muted ? t('common.soundOff') : t('common.soundOn')}
            onClick={() => {
              sfx.setMuted(!muted);
              if (muted) sfx.play('pop');
            }}
          >
            <Icon name={muted ? 'sound-off' : 'sound-on'} className="size-6" />
          </IconButton>
          <LangSwitch lang={lang} setLang={setLang} label={t('common.language')} />
          {view && (
            <IconButton label={t('common.leaveRoom')} onClick={() => setConfirmLeave(true)}>
              <Icon name="leave" className="size-6" />
            </IconButton>
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
