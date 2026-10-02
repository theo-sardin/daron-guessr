import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useId, useRef, useState } from 'react';
import { MAX_NAME_LENGTH, sanitizeName, type PublicPlayer } from '../../../shared/protocol';
import { Avatar } from '../../components/Avatar';
import { AvatarPicker } from '../../components/AvatarPicker';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { Spinner } from '../../components/Spinner';
import { toast } from '../../components/Toast';
import { useT } from '../../i18n';
import { errorText } from '../../lib/errors';
import { saveProfile } from '../../lib/session';
import { sfx } from '../../lib/sfx';
import { api } from '../../lib/store';
import { useSelfie } from './selfie';

/**
 * Edit your own nickname, avatar and selfie (lobby only). The name and avatar are saved with
 * the Save button; the selfie is uploaded / removed right away (it is its own little action).
 */
export function ProfileModal({ open, me, onClose }: { open: boolean; me: PublicPlayer; onClose: () => void }) {
  const t = useT();
  const [name, setName] = useState(me.name);
  const [avatar, setAvatar] = useState(me.avatar);
  const [saving, setSaving] = useState(false);
  const [shake, setShake] = useState(0);
  const savingRef = useRef(false);
  const selfie = useSelfie();
  const hasSelfie = Boolean(me.selfieUrl);
  const selfieTitleId = useId();

  // Start from the current identity every time the modal opens.
  useEffect(() => {
    if (open) {
      setName(me.name);
      setAvatar(me.avatar);
    }
  }, [open]); // only when it opens: keep what the player is typing otherwise

  const save = async () => {
    if (savingRef.current) return;
    const clean = sanitizeName(name);
    if (!clean) {
      setShake((n) => n + 1);
      sfx.play('fail');
      toast(errorText(t, 'INVALID_NAME'), 'error');
      return;
    }
    const patch: { name?: string; avatar?: string } = {};
    if (clean !== me.name) patch.name = clean;
    if (avatar !== me.avatar) patch.avatar = avatar;
    if (!patch.name && !patch.avatar) {
      onClose();
      return;
    }
    savingRef.current = true;
    setSaving(true);
    const res = await api.updatePlayer(patch);
    savingRef.current = false;
    setSaving(false);
    if (!res.ok) {
      setShake((n) => n + 1);
      sfx.play('fail');
      toast(errorText(t, res.error), 'error');
      return;
    }
    saveProfile({ name: clean, avatar });
    sfx.play('success');
    toast(t('lobby.profile.saved'), 'success', { emoji: avatar });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={t('lobby.profile.title')} className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
        className="flex flex-col gap-4"
      >
        <div className="flex items-center gap-3">
          <motion.span
            key={`${avatar}${me.selfieUrl ?? ''}`}
            className="relative"
            initial={{ scale: 0.6, rotate: -15 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 14 }}
          >
            <Avatar player={{ ...me, avatar, name }} size="lg" crown={false} dimOffline={false} selfie />
            {selfie.busy && (
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-grape-950/55" aria-hidden>
                <Spinner className="size-7 text-sun" />
              </span>
            )}
          </motion.span>
          <label className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="text-sm font-extrabold text-ink-soft">{t('lobby.profile.name')}</span>
            <motion.input
              key={shake}
              animate={shake ? { x: [0, -8, 8, -5, 5, 0] } : undefined}
              transition={{ duration: 0.35 }}
              value={name}
              // Count code points like the server does, so an emoji is never cut in half.
              onChange={(e) => setName(Array.from(e.target.value).slice(0, MAX_NAME_LENGTH).join(''))}
              placeholder={t('lobby.profile.namePlaceholder')}
              autoComplete="nickname"
              enterKeyHint="done"
              className="h-12 w-full min-w-0 rounded-2xl border-3 border-ink bg-white px-3 text-lg font-extrabold text-ink shadow-pop-sm outline-none placeholder:text-ink/35 focus:border-pink"
            />
          </label>
        </div>
        {/* Selfie: the face shown next to the photos, so people can compare. */}
        <section className="rounded-2xl border-2 border-ink bg-white p-3" aria-labelledby={selfieTitleId}>
          <p id={selfieTitleId} className="flex flex-wrap items-center gap-x-2 gap-y-1 font-display text-lg leading-tight">
            <span>
              <span aria-hidden>🤳 </span>
              {t('lobby.profile.selfie')}
            </span>
            {!hasSelfie && (
              <span className="rounded-full border-2 border-ink/25 bg-cream px-2 py-px font-sans text-xs font-extrabold text-ink-soft">
                {t('lobby.profile.noSelfie')}
              </span>
            )}
          </p>
          <p className="mt-1 text-sm leading-snug text-ink-soft">{t('lobby.profile.selfieHelp')}</p>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={hasSelfie ? 'has' : 'none'}
              className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <Button
                size="sm"
                variant="sun"
                loading={selfie.busy === 'upload'}
                disabled={selfie.busy !== null}
                icon={<span aria-hidden>📸</span>}
                onClick={selfie.take}
                aria-label={hasSelfie ? undefined : t('lobby.profile.addSelfie')}
              >
                {hasSelfie ? t('lobby.profile.changeSelfie') : t('lobby.profile.takeSelfie')}
              </Button>
              {hasSelfie && (
                <motion.button
                  type="button"
                  onClick={() => {
                    sfx.play('click');
                    void selfie.remove();
                  }}
                  disabled={selfie.busy !== null}
                  whileTap={{ scale: 0.94, y: 2 }}
                  aria-label={t('lobby.profile.removeSelfie')}
                  title={t('lobby.profile.removeSelfie')}
                  className="flex size-9 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-danger shadow-pop-sm disabled:opacity-50"
                >
                  {selfie.busy === 'remove' ? <Spinner className="size-4 text-white" /> : <span aria-hidden>🗑️</span>}
                </motion.button>
              )}
              <button
                type="button"
                onClick={selfie.pick}
                disabled={selfie.busy !== null}
                className="h-11 px-1.5 text-sm font-extrabold text-ink-soft underline decoration-2 underline-offset-4 transition-colors hover:text-ink disabled:opacity-50"
              >
                {t('lobby.profile.pickSelfie')}
              </button>
            </motion.div>
          </AnimatePresence>
        </section>

        <div>
          <p className="mb-2 text-sm font-extrabold text-ink-soft">{t('lobby.profile.avatar')}</p>
          <AvatarPicker value={avatar} onChange={setAvatar} color={me.color} />
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" block onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" block loading={saving}>
            {t('lobby.profile.save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
