import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { MAX_NAME_LENGTH, sanitizeName, type PublicPlayer } from '../../../shared/protocol';
import { Avatar } from '../../components/Avatar';
import { AvatarPicker } from '../../components/AvatarPicker';
import { Button } from '../../components/Button';
import { Icon } from '../../components/Icon';
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
        className="flex flex-col gap-5"
      >
        <div className="flex items-center gap-3">
          <motion.span
            key={`${avatar}${me.selfieUrl ?? ''}`}
            className="relative"
            initial={{ scale: 0.6, rotate: -15 }}
            animate={{ scale: 1, rotate: -3 }}
            transition={{ type: 'spring', stiffness: 500, damping: 14 }}
          >
            <Avatar player={{ ...me, avatar, name }} size="lg" crown={false} dimOffline={false} selfie />
            {selfie.busy && (
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-ink/45" aria-hidden>
                <Spinner className="size-7 text-sheet" />
              </span>
            )}
          </motion.span>
          {/* A "HELLO my name is" sticker: red paper, the name written on the white band. */}
          <label className="paper-red flex min-w-0 flex-1 -rotate-1 flex-col gap-1 rounded-[3px] px-2 pt-1.5 pb-2 shadow-paper-sm">
            <span className="font-wide text-[0.8rem] tracking-[0.06em] text-white uppercase">{t('lobby.profile.name')}</span>
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
              className="h-12 w-full min-w-0 rounded-[2px] bg-sheet px-3 font-marker text-[1.35rem] text-ink outline-none placeholder:text-ink-faint focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-yellow"
            />
          </label>
        </div>

        {/* Selfie: the face shown next to the photos, so people can compare. */}
        <section className="paper-notebook relative -mx-1 rounded-[2px] pt-2.5 pr-3 pb-3 pl-[35px] shadow-paper-sm" aria-labelledby="lobby-selfie-title">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p id="lobby-selfie-title" className="font-heavy text-lg leading-tight">
                {t('lobby.profile.selfie')}
                {!hasSelfie && <span className="text-pen ml-2 text-base font-bold">{t('lobby.profile.noSelfie')}</span>}
              </p>
              <p className="mt-0.5 text-sm leading-snug text-ink-soft">{t('lobby.profile.selfieHelp')}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <AnimatePresence mode="popLayout" initial={false}>
              {hasSelfie ? (
                <motion.span key="has" className="flex flex-wrap gap-2" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <Button
                    size="sm"
                    variant="sun"
                    loading={selfie.busy === 'upload'}
                    disabled={selfie.busy !== null}
                    icon={<Icon name="camera" className="size-4.5" />}
                    onClick={selfie.take}
                  >
                    {t('lobby.profile.changeSelfie')}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    loading={selfie.busy === 'remove'}
                    disabled={selfie.busy !== null}
                    icon={<Icon name="trash" className="size-4.5" />}
                    onClick={() => void selfie.remove()}
                    className="text-red-ink"
                  >
                    {t('lobby.profile.removeSelfie')}
                  </Button>
                </motion.span>
              ) : (
                <motion.span key="none" className="flex flex-wrap items-center gap-x-2 gap-y-1" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <Button
                    size="sm"
                    variant="sun"
                    loading={selfie.busy === 'upload'}
                    disabled={selfie.busy !== null}
                    icon={<Icon name="camera" className="size-4.5" />}
                    onClick={selfie.take}
                    aria-label={t('lobby.profile.addSelfie')}
                  >
                    {t('lobby.profile.takeSelfie')}
                  </Button>
                  <button
                    type="button"
                    onClick={selfie.pick}
                    disabled={selfie.busy !== null}
                    className="text-pen h-11 px-1 text-[1.15rem] underline decoration-2 underline-offset-4 hover:decoration-wavy disabled:opacity-50"
                  >
                    {t('lobby.profile.pickSelfie')}
                  </button>
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </section>

        <div>
          <p className="label-type mb-2 text-sm">{t('lobby.profile.avatar')}</p>
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
