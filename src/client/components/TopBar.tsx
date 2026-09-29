import { motion } from 'motion/react';
import { useState } from 'react';
import { useI18n } from '../i18n';
import { navigate, roomLink } from '../lib/router';
import { sfx, useMuted } from '../lib/sfx';
import { api, useRoom } from '../lib/store';
import { copyText, cn } from '../lib/util';
import { ConfirmDialog } from './Modal';
import { toast } from './Toast';

function IconButton({ label, onClick, children, className }: { label: string; onClick: () => void; children: React.ReactNode; className?: string }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.88 }}
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        'flex h-10 min-w-10 items-center justify-center rounded-xl border-2 border-white/20 bg-white/10 px-2 font-display text-sm text-cream backdrop-blur hover:bg-white/20',
        className,
      )}
    >
      {children}
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
    if (await copyText(roomLink(view.code))) toast(t('common.copied'), 'success', { emoji: '🔗' });
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
            className="flex h-10 items-center gap-2 rounded-xl border-2 border-ink bg-sun px-3 font-display text-ink shadow-pop-sm"
          >
            <span className="text-xs tracking-wider opacity-70">{t('common.room').toUpperCase()}</span>
            <span className="text-lg tracking-[0.18em]">{view.code}</span>
          </motion.button>
        ) : (
          <button type="button" onClick={() => navigate('/')} className="font-display text-xl text-sun text-outline-sm">
            DARON GUESSR
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
            <span className="text-lg">{muted ? '🔇' : '🔊'}</span>
          </IconButton>
          <IconButton label={t('common.language')} onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')}>
            {lang === 'fr' ? '🇫🇷 FR' : '🇬🇧 EN'}
          </IconButton>
          {view && (
            <IconButton label={t('common.leaveRoom')} onClick={() => setConfirmLeave(true)}>
              <span className="text-lg">🚪</span>
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
