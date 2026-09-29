import { motion } from 'motion/react';
import { useEffect, useRef } from 'react';
import type { RoomView } from '../../../shared/protocol';
import { ScreenShell, ScreenTitle } from '../../components/Layout';
import { toast } from '../../components/Toast';
import { useT } from '../../i18n';
import { sfx } from '../../lib/sfx';
import { InviteCard } from './InviteCard';
import { PhotoSlots } from './PhotoSlots';
import { PlayersCard } from './PlayersCard';
import { SettingsCard } from './SettingsCard';
import { StartBar } from './StartBar';

/** Staggered entrance for the lobby cards. */
const card = (i: number) => ({
  initial: { opacity: 0, y: 28, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { type: 'spring' as const, stiffness: 320, damping: 26, delay: 0.05 + i * 0.07 },
});

/**
 * Lobby: invite friends (code / link / QR), upload your parents' photos, see who's here
 * and ready, tweak the settings (host) and start the game.
 */
export function LobbyScreen({ view }: { view: RoomView }) {
  const t = useT();
  const isHost = view.hostId === view.meId;
  const host = view.players.find((p) => p.id === view.hostId);

  // The crown was handed over to us (not when the screen opens with it).
  const prevHost = useRef(view.hostId);
  useEffect(() => {
    if (prevHost.current !== view.hostId && view.hostId === view.meId) {
      sfx.play('success');
      toast(t('lobby.players.youAreHost'), 'success', { emoji: '👑' });
    }
    prevHost.current = view.hostId;
  }, [view.hostId, view.meId, t]);

  return (
    <>
      <ScreenShell width="xl" className="pb-48!">
        <ScreenTitle sub={t('lobby.subtitle')}>{t('lobby.title')}</ScreenTitle>
        <div className="grid items-start gap-5 md:grid-cols-2 md:gap-6">
          <div className="flex min-w-0 flex-col gap-5 md:gap-6">
            <motion.div {...card(0)}>
              <InviteCard code={view.code} playerCount={view.players.length} />
            </motion.div>
            <motion.div {...card(1)}>
              <PhotoSlots myPhotos={view.myPhotos} />
            </motion.div>
          </div>
          <div className="flex min-w-0 flex-col gap-5 md:gap-6">
            <motion.div {...card(2)}>
              <PlayersCard view={view} />
            </motion.div>
            <motion.div {...card(3)}>
              <SettingsCard settings={view.settings} isHost={isHost} hostName={host?.name ?? t('common.host')} />
            </motion.div>
          </div>
        </div>
      </ScreenShell>
      <StartBar view={view} />
    </>
  );
}
