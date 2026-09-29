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
import { ThemeBanner } from './ThemeBanner';

/** Staggered entrance for the lobby cards. */
const card = (i: number) => ({
  initial: { opacity: 0, y: 28, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { type: 'spring' as const, stiffness: 320, damping: 26, delay: 0.05 + i * 0.07 },
});

/**
 * Lobby: see this game's theme, invite friends (code / link / QR), upload your photos, see
 * who's here and ready, tweak the settings (host) and start the game.
 */
export function LobbyScreen({ view }: { view: RoomView }) {
  const t = useT();
  const isHost = view.hostId === view.meId;
  const host = view.players.find((p) => p.id === view.hostId);
  const { theme, photosPerPlayer } = view.settings;

  // The crown was handed over to us (not when the screen opens with it).
  const prevHost = useRef(view.hostId);
  useEffect(() => {
    if (prevHost.current !== view.hostId && view.hostId === view.meId) {
      sfx.play('success');
      toast(t('lobby.players.youAreHost'), 'success', { emoji: '👑' });
    }
    prevHost.current = view.hostId;
  }, [view.hostId, view.meId, t]);

  // The host switched theme: it changes what everyone has to upload, so tell the others.
  const prevTheme = useRef(theme);
  useEffect(() => {
    if (prevTheme.current !== theme && !isHost) {
      sfx.play('pop');
      toast(t('lobby.banner.changed', { theme: t(`common.theme.${theme}.name`) }), 'info', { emoji: t(`common.theme.${theme}.emoji`) });
    }
    prevTheme.current = theme;
  }, [theme, isHost, t]);

  return (
    <>
      <ScreenShell width="xl" className="pb-48!">
        <ScreenTitle className="mb-4">{t('lobby.title')}</ScreenTitle>
        <motion.div {...card(0)}>
          <ThemeBanner theme={theme} photosPerPlayer={photosPerPlayer} isHost={isHost} />
        </motion.div>
        <div className="grid items-start gap-5 md:grid-cols-2 md:gap-6">
          <div className="flex min-w-0 flex-col gap-5 md:gap-6">
            <motion.div {...card(1)}>
              <InviteCard code={view.code} playerCount={view.players.length} />
            </motion.div>
            <motion.div {...card(2)}>
              <PhotoSlots myPhotos={view.myPhotos} theme={theme} photosPerPlayer={photosPerPlayer} />
            </motion.div>
          </div>
          <div className="flex min-w-0 flex-col gap-5 md:gap-6">
            <motion.div {...card(3)}>
              <PlayersCard view={view} />
            </motion.div>
            <motion.div {...card(4)}>
              <SettingsCard settings={view.settings} isHost={isHost} hostName={host?.name ?? t('common.host')} />
            </motion.div>
          </div>
        </div>
      </ScreenShell>
      <StartBar view={view} />
    </>
  );
}
