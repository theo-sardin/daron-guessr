import { motion } from 'motion/react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { PhotoResult, ResultsView, RoomView } from '../../../shared/protocol';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { flashScreen } from '../../components/Flash';
import { Icon, type IconName } from '../../components/Icon';
import { IconBadge } from '../../components/IconBadge';
import { BottomBar, ScreenShell, ScreenTitle } from '../../components/Layout';
import { Lightbox } from '../../components/Lightbox';
import { toast } from '../../components/Toast';
import { useI18n } from '../../i18n';
import { emojiRain, fireworks, sideCannons } from '../../lib/confetti';
import { errorText } from '../../lib/errors';
import { navigate } from '../../lib/router';
import { sfx } from '../../lib/sfx';
import { api, playersById } from '../../lib/store';
import { copyText, vibrate } from '../../lib/util';
import { Awards } from './Awards';
import { awardFlavor, gameFlavor, gameKey, joinNames, markCelebrated, playerOr, podiumGroups, seedOf, sortedRanking, wasCelebrated } from './helpers';
import { MyGame } from './MyGame';
import { PhotoWall } from './PhotoWall';
import { Podium, podiumTimeline } from './Podium';
import { RankingList } from './RankingList';

const EMPTY: ResultsView = { photos: [], ranking: [], awards: [] };

function Section({ icon, title, sub, children }: { icon: IconName; title: string; sub?: string; children: ReactNode }) {
  return (
    <section className="mt-12">
      <motion.header
        className="mb-4"
        initial={{ opacity: 0, y: 16, rotate: -2 }}
        whileInView={{ opacity: 1, y: 0, rotate: 0 }}
        viewport={{ once: true, amount: 0.8 }}
        transition={{ type: 'spring', stiffness: 400, damping: 22 }}
      >
        <h2 className="text-outline-sm flex items-center gap-3 font-display text-3xl leading-tight text-cream">
          <IconBadge name={icon} tone="cream" size="md" tilt={-6} />
          {title}
        </h2>
        {sub && <p className="mt-1 font-semibold text-grape-200">{sub}</p>}
      </motion.header>
      {children}
    </section>
  );
}

export function ResultsScreen({ view }: { view: RoomView }) {
  const { t, tpick } = useI18n();
  const res = view.results ?? EMPTY;
  const meId = view.meId;
  const players = useMemo(() => playersById(view), [view]);
  const ranking = useMemo(() => sortedRanking(res.ranking), [res.ranking]);
  const groups = useMemo(() => podiumGroups(ranking), [ranking]);
  const timeline = useMemo(() => podiumTimeline(groups.length), [groups.length]);
  const photosById = useMemo(() => new Map(res.photos.map((p) => [p.photo.id, p])), [res.photos]);
  const photos = useMemo(() => [...res.photos].sort((a, b) => a.index - b.index), [res.photos]);
  // Copy follows what the photos show (parents, baby pics, picked pictures…).
  const flavor = gameFlavor(res.photos, view.settings.theme);
  const key = gameKey(view.code, res);

  const winners = groups[0]?.entries ?? [];
  const topScore = winners[0]?.score ?? 0;
  const winnerPlayers = winners.map((e) => playerOr(players, e.playerId));
  const meEntry = ranking.find((r) => r.playerId === meId);
  const isHost = view.hostId === meId;
  const host = players.get(view.hostId);

  // Colors are read when the confetti fires, so player updates never restart the timeline.
  const colorsRef = useRef<string[]>([]);
  colorsRef.current = [...winnerPlayers.map((p) => p.color), '#ffd23f', '#ffffff'];
  const nobodyRef = useRef(false);
  nobodyRef.current = topScore === 0;

  const [podiumDone, setPodiumDone] = useState(false);

  // Podium show: drum roll, pops as players land, then fanfare + fireworks for the winner.
  // Only once per game on this tab: a reload or a late remount stays quiet.
  useEffect(() => {
    const timers: number[] = [];
    const at = (seconds: number, fn: () => void) => timers.push(window.setTimeout(fn, Math.max(0, seconds * 1000)));
    at(timeline.celebrateAt + 0.5, () => setPodiumDone(true));
    if (!wasCelebrated(key)) {
      at(timeline.celebrateAt - 2.05, () => {
        markCelebrated(key);
        sfx.play('drumroll');
      });
      for (let g = 1; g < timeline.avatarAt.length; g++) at(timeline.avatarAt[g] + 0.25, () => sfx.play('pop'));
      at(timeline.celebrateAt, () => {
        markCelebrated(key);
        if (nobodyRef.current) {
          sfx.play('fail');
          emojiRain('🙈', 36);
          return;
        }
        // The winner's photo is taken: flash, then the fanfare.
        flashScreen();
        sfx.play('fanfare');
        // Browsers block (and log) vibration before the first user gesture.
        if (navigator.userActivation?.hasBeenActive) vibrate([40, 60, 40]);
        fireworks(3200, colorsRef.current);
        sideCannons(2200, colorsRef.current);
      });
    }
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [key, timeline]);

  const seed = key;
  const winnerLine =
    topScore === 0
      ? tpick('results.winner.nobody', seedOf(seed, 'w'))
      : winners.length > 1
        ? tpick('results.winner.tie', seedOf(seed, 'w'), {
            names: joinNames(
              winnerPlayers.map((p) => p.name),
              t('results.and'),
            ),
          })
        : winners[0]?.playerId === meId
          ? tpick(`results.winner.me.${flavor}`, seedOf(seed, 'w'))
          : tpick(`results.winner.one.${flavor}`, seedOf(seed, 'w'), { name: winnerPlayers[0]?.name ?? '' });

  // Lightbox
  const [zoom, setZoom] = useState<PhotoResult | null>(null);
  const zoomCaption = zoom
    ? t('results.wall.lightbox', {
        caption: t(`common.possessive.${zoom.photo.kind}`, { name: playerOr(players, zoom.ownerId).name }),
        correct: zoom.correctVotes,
        total: zoom.totalVotes,
      })
    : undefined;

  // Actions
  const [busy, setBusy] = useState<null | 'again' | 'leave'>(null);
  const [sharing, setSharing] = useState(false);

  const playAgain = async () => {
    if (busy) return;
    setBusy('again');
    const r = await api.playAgain();
    if (!r.ok) {
      toast(errorText(t, r.error), 'error');
      setBusy(null);
    } else {
      // The lobby replaces this screen; unlock anyway if the new state is slow to arrive.
      window.setTimeout(() => setBusy(null), 5000);
    }
  };

  const leave = async () => {
    if (busy) return;
    setBusy('leave');
    await api.leave();
    navigate('/');
  };

  const share = async () => {
    if (sharing || !meEntry) return;
    setSharing(true);
    try {
      const vars = { rank: meEntry.rank, correct: meEntry.correct, guesses: meEntry.guesses };
      const text = meEntry.rank === 1 && meEntry.score > 0 ? t('results.share.first', vars) : t('results.share.other', vars);
      const url = window.location.origin;
      if (typeof navigator.share === 'function') {
        try {
          await navigator.share({ title: t('common.appName'), text, url });
          return;
        } catch (e) {
          if (e instanceof DOMException && e.name === 'AbortError') return;
          // Share sheet unavailable: fall back to copying.
        }
      }
      if (await copyText(`${text} ${url}`)) toast(t('results.share.copied'), 'success', { icon: 'copy' });
      else toast(t('results.share.failed'), 'error');
    } finally {
      setSharing(false);
    }
  };

  const myPhotos = photos.filter((p) => p.ownerId === meId);
  const me = players.get(meId);

  return (
    <>
      <ScreenShell width="lg">
        <ScreenTitle className="mb-0">{t('results.title')}</ScreenTitle>
        <div className="flex min-h-12 items-start justify-center px-2">
          <motion.p
            className="mt-2 max-w-md -rotate-2 rounded-2xl border-3 border-ink bg-pink px-4 py-1.5 text-center font-display text-lg leading-snug text-white shadow-pop-sm sm:text-xl"
            initial={{ opacity: 0, scale: 0.3, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 14, delay: timeline.crownAt + 0.2 }}
          >
            {winnerLine}
          </motion.p>
        </div>

        <div className="mt-2">
          <Podium groups={groups} players={players} meId={meId} timeline={timeline} />
        </div>

        <Section icon="medal" title={t('results.ranking.title')}>
          <RankingList ranking={ranking} players={players} meId={meId} ready={podiumDone} />
        </Section>

        <Section icon="trophy" title={t('results.awards.title')} sub={t('results.awards.subtitle')}>
          <Awards
            awards={res.awards}
            players={players}
            photos={photosById}
            meId={meId}
            seed={seed}
            flavor={flavor}
            ready={podiumDone}
            onOpenPhoto={setZoom}
          />
        </Section>

        {meEntry && me && (
          <Section icon="user" title={t('results.mine.title')}>
            <MyGame
              me={meEntry}
              player={me}
              ranking={ranking}
              photos={myPhotos}
              awards={res.awards}
              seed={seed}
              flavor={flavor}
              awardFlavor={(a) => awardFlavor(a, res.photos, flavor)}
              onShare={share}
              sharing={sharing}
              onOpenPhoto={setZoom}
            />
          </Section>
        )}

        {photos.length > 0 && (
          <Section icon="images" title={t(`results.wall.title.${flavor}`)} sub={t('results.wall.subtitle')}>
            <PhotoWall photos={photos} players={players} meId={meId} onOpen={setZoom} />
          </Section>
        )}
      </ScreenShell>

      <BottomBar>
        {isHost ? (
          <Button
            size="lg"
            className="min-w-0 flex-1"
            onClick={playAgain}
            loading={busy === 'again'}
            disabled={busy !== null}
            icon={<Icon name="refresh" weight="bold" className="size-6" />}
          >
            {t('results.bar.playAgain')}
          </Button>
        ) : (
          <div className="flex h-14 min-w-0 flex-1 items-center gap-2 rounded-2xl border-3 border-white/20 bg-grape-800/80 px-3 backdrop-blur">
            {host && <Avatar player={host} size="xs" crown={false} />}
            <span className="animate-pulse-soft line-clamp-2 text-sm leading-tight font-bold break-words text-grape-200">
              {t('results.bar.waiting', { host: host?.name ?? t('common.host') })}
            </span>
          </div>
        )}
        {meEntry && (
          <Button
            variant="sky"
            size="lg"
            className="w-14 shrink-0 px-0!"
            onClick={share}
            loading={sharing}
            aria-label={t('results.bar.share')}
            title={t('results.bar.share')}
            icon={<Icon name="share" weight="bold" className="size-6" />}
          />
        )}
        <Button
          variant="ghost"
          size="lg"
          className="shrink-0 px-4!"
          onClick={leave}
          loading={busy === 'leave'}
          disabled={busy !== null}
          icon={<Icon name="leave" weight="bold" className="size-5" />}
        >
          {/* Icon only on very narrow phones: the name stays for screen readers. */}
          <span className="max-[359px]:sr-only">{t('common.leave')}</span>
        </Button>
      </BottomBar>

      <Lightbox src={zoom?.photo.url ?? null} caption={zoomCaption} onClose={() => setZoom(null)} />
    </>
  );
}
