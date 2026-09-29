import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { MAX_NAME_LENGTH, sanitizeName, type PublicPlayer } from '../../../shared/protocol';
import { Avatar } from '../../components/Avatar';
import { AvatarPicker } from '../../components/AvatarPicker';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { toast } from '../../components/Toast';
import { useT } from '../../i18n';
import { errorText } from '../../lib/errors';
import { saveProfile } from '../../lib/session';
import { sfx } from '../../lib/sfx';
import { api } from '../../lib/store';

/** Edit your own nickname and avatar (lobby only). */
export function ProfileModal({ open, me, onClose }: { open: boolean; me: PublicPlayer; onClose: () => void }) {
  const t = useT();
  const [name, setName] = useState(me.name);
  const [avatar, setAvatar] = useState(me.avatar);
  const [saving, setSaving] = useState(false);
  const [shake, setShake] = useState(0);
  const savingRef = useRef(false);

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
            key={avatar}
            initial={{ scale: 0.6, rotate: -15 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 14 }}
          >
            <Avatar player={{ ...me, avatar, name }} size="lg" crown={false} dimOffline={false} />
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
