import { motion } from 'motion/react';
import { useState } from 'react';
import { useI18n, type Lang } from '../i18n';
import { navigate, roomLink } from '../lib/router';
import { sfx, useMuted } from '../lib/sfx';
import { api, useRoom } from '../lib/store';
import { copyText, cn } from '../lib/util';
import { Icon } from './Icon';
import { Logo } from './Logo';
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

/** "FR | EN" pill: the active language is lit, a tap switches to the other one. */
function LangPill({ lang, onSwitch, label }: { lang: Lang; onSwitch: () => void; label: string }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.92 }}
      onClick={onSwitch}
      aria-label={label}
      title={label}
      className={cn('relative flex h-11 items-center gap-0.5 rounded-2xl p-1 font-mono text-[11px] font-bold tracking-[0.08em] transition-colors', CHROME)}
    >
      {(['fr', 'en'] as const).map((l) => (
        <span key={l} className={cn('relative flex h-full w-8 items-center justify-center rounded-xl', l === lang ? 'text-ink' : 'text-cream/55')}>
          {l === lang && (
            <motion.span
              layoutId="lang-pill"
              className="absolute inset-0 rounded-xl bg-cream"
              transition={{ type: 'spring', stiffness: 600, damping: 36 }}
            />
          )}
          <span className="relative">{l.toUpperCase()}</span>
        </span>
      ))}
    </motion.button>
  );
}

/** Fixed header: room code (tap to copy the invite link), sound, language and leave. */
export function TopBar() {
  const { t, lang, setLang } = useI18n();
  const muted = useMuted();
  const view = useRoom();
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
            className="group flex h-11 items-center gap-2.5 rounded-2xl border-2 border-white/15 bg-ink/85 pr-2.5 pl-3 shadow-[inset_0_-12px_20px_-14px_rgb(255_122_26_/_0.45)] backdrop-blur transition-colors hover:border-stamp/50"
          >
            <span className="label-mono text-cream/55" aria-hidden>
              {t('common.room')}
            </span>
            <span className="text-stamp font-stamp14 text-[1.05rem] leading-none tracking-[0.1em]" aria-hidden>
              {view.code}
            </span>
            <Icon name="link" className="size-4 text-cream/45 transition-colors group-hover:text-cream" />
          </motion.button>
        ) : (
          <button type="button" onClick={() => navigate('/')} className="flex h-11 items-center px-2" aria-label={t('common.backHome')}>
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
            <Icon name={muted ? 'sound-off' : 'sound-on'} className="size-5.5" />
          </IconButton>
          <LangPill lang={lang} label={t('common.language')} onSwitch={() => setLang(lang === 'fr' ? 'en' : 'fr')} />
          {view && (
            <IconButton label={t('common.leaveRoom')} onClick={() => setConfirmLeave(true)}>
              <Icon name="leave" className="size-5.5" />
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
