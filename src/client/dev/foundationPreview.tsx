import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { PHOTO_KINDS, THEMES } from '../../shared/protocol';
import { Avatar, PlayerChip } from '../components/Avatar';
import { Button, type ButtonVariant } from '../components/Button';
import { Card } from '../components/Card';
import { Flash, flashScreen } from '../components/Flash';
import { Icon, ICON_NAMES } from '../components/Icon';
import { KindTag } from '../components/KindTag';
import { Logo } from '../components/Logo';
import { Polaroid } from '../components/Polaroid';
import { Spinner } from '../components/Spinner';
import { Stamp } from '../components/Stamp';
import { ThemeArt, themeColor } from '../components/ThemeArt';
import { TimerRing } from '../components/TimerRing';
import { toast } from '../components/Toast';
import { Viewfinder } from '../components/Viewfinder';
import { useT } from '../i18n';
import { ExitNotice } from '../screens/RoomScreen';
import { serverNow } from '../lib/time';
import { fakePlayers, fakePortrait, fakeView } from './fixtures';
import type { PreviewRegistry } from './PreviewApp';

/**
 * Dev-only gallery of the shared building blocks ("Photo lab" foundation):
 * /__preview/foundation/all (everything), /icons, /kinds, /type, /exit-*.
 * Add ?lang=fr to check the French labels.
 */

function Section({ id, label, title, children, dark }: { id: string; label: string; title: string; children: ReactNode; dark?: boolean }) {
  return (
    <section id={id} className="mb-12">
      <p className="label-mono mb-1 text-stamp">{label}</p>
      <h2 className={`mb-4 font-display text-3xl leading-none ${dark ? 'text-ink' : 'text-cream'}`}>{title}</h2>
      {children}
    </section>
  );
}

function IconsGrid() {
  return (
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
      {ICON_NAMES.map((n) => (
        <div key={n} className="flex flex-col items-center gap-1.5 rounded-2xl border-2 border-ink bg-cream px-1 pt-3 pb-2 text-ink">
          <Icon name={n} className="size-7" />
          <span className="max-w-full truncate font-mono text-[9px] font-bold">{n}</span>
        </div>
      ))}
    </div>
  );
}

function IconsOnDark() {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl border-2 border-white/10 bg-grape-950/60 p-3 text-cream">
      {ICON_NAMES.map((n) => (
        <Icon key={n} name={n} className="size-5" />
      ))}
    </div>
  );
}

function IconsTwoTone() {
  const samples = [
    ['crown', 'var(--color-sun)'],
    ['star', 'var(--color-sun)'],
    ['heart', 'var(--color-pink)'],
    ['camera', 'var(--color-sky)'],
    ['trophy', 'var(--color-sun)'],
    ['medal', 'var(--color-tangerine)'],
    ['ghost', '#fff'],
    ['mask', 'var(--color-lilac)'],
    ['hand', 'var(--color-sun)'],
    ['flash', 'var(--color-sun)'],
    ['ballot', 'var(--color-mint)'],
    ['dice', '#fff'],
    ['sparkle', 'var(--color-sun)'],
    ['lock', 'var(--color-mint)'],
    ['image', 'var(--color-sky)'],
    ['users', 'var(--color-pink)'],
  ] as const;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {samples.map(([n, fill]) => (
        <span key={n} className="flex size-14 items-center justify-center rounded-2xl border-3 border-ink bg-cream text-ink shadow-pop-sm">
          <Icon name={n} fill={fill} className="size-9" strokeWidth={2} />
        </span>
      ))}
    </div>
  );
}

function Kinds() {
  return (
    <div className="space-y-4">
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <div key={size} className="flex flex-wrap items-center gap-x-2.5 gap-y-3">
          <span className="label-mono w-6 text-cream/50">{size}</span>
          {PHOTO_KINDS.map((k) => (
            <KindTag key={k} kind={k} size={size} />
          ))}
        </div>
      ))}
      <Card tone="cream" className="flex flex-wrap items-center gap-3">
        <span className="label-mono text-ink/50">on cream, tilted</span>
        <KindTag kind="sister" tilt={-4} />
        <KindTag kind="daron" size="lg" tilt={3} />
        <KindTag kind="kid" icon="star" tilt={-2} />
        <KindTag kind="pick" icon="image" size="sm" />
      </Card>
    </div>
  );
}

function Themes() {
  const t = useT();
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {THEMES.map((th, i) => (
        <Card key={th} tone="cream" className="flex flex-col items-center gap-2 px-3 py-4 text-center" style={{ rotate: `${(i % 2 ? 1 : -1) * 1.5}deg` }}>
          <ThemeArt theme={th} className="size-20" />
          <span className="font-display text-lg leading-tight">{t(`common.theme.${th}.name`)}</span>
        </Card>
      ))}
      <Card tone="cream" className="col-span-2 flex items-center justify-around gap-2 px-3 sm:col-span-5">
        {THEMES.map((th) => (
          <span key={th} className="flex items-center gap-2">
            <ThemeArt theme={th} className="size-10" />
          </span>
        ))}
        {THEMES.map((th) => (
          <span key={`${th}-s`} className="hidden sm:inline">
            <ThemeArt theme={th} className="size-7" />
          </span>
        ))}
      </Card>
      <div className="col-span-2 flex flex-wrap gap-3 sm:col-span-5">
        {THEMES.map((th) => (
          <span
            key={th}
            className="flex items-center gap-3 rounded-[var(--radius-blob)] border-3 border-ink py-2 pr-4 pl-2 text-ink shadow-pop"
            style={{ backgroundColor: themeColor(th) }}
          >
            <ThemeArt theme={th} className="size-12" />
            <span className="font-display text-lg">{t(`common.theme.${th}.name`)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function Stamps() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-6">
        <Stamp label="PHOTO" size="lg">
          {'03/08'}
        </Stamp>
        <Stamp variant="seg14" label="ROOM" size="lg">
          BKXZ
        </Stamp>
        <Stamp label="SCORE" size="lg" ghost>
          {'1250'}
        </Stamp>
        <Stamp size="md">{"'98 12 24"}</Stamp>
        <Stamp variant="mono" label="mono" size="md">
          {'12 PTS'}
        </Stamp>
      </div>
      <div className="flex flex-col gap-2">
        <span className="label-mono text-cream/50">room code alphabet (seg14)</span>
        {['ABCDEFGH', 'JKLMNPQR', 'STUVWXYZ'].map((row) => (
          <span key={row} className="flex items-end gap-5">
            <Stamp variant="seg14" size="md">
              {row}
            </Stamp>
            <Stamp variant="seg14" size="sm">
              {row}
            </Stamp>
          </span>
        ))}
      </div>
      <div className="flex flex-wrap items-end gap-3">
        {(['xs', 'sm', 'md', 'lg', 'xl', '2xl'] as const).map((s) => (
          <Stamp key={s} size={s}>
            {'42'}
          </Stamp>
        ))}
      </div>
      <Card tone="cream" className="flex flex-wrap items-end gap-4">
        <Stamp plate label="ROOM" variant="seg14" size="lg">
          BKXZ
        </Stamp>
        <Stamp plate label="ROUND" size="md" ghost>
          {'03/08'}
        </Stamp>
        <Stamp plate size="md">
          {'+300'}
        </Stamp>
        <Stamp glow={false} label="printed" size="md">
          {"'98 12 24"}
        </Stamp>
      </Card>
    </div>
  );
}

function Viewfinders() {
  return (
    <div className="flex flex-wrap items-center gap-10 px-3 py-4">
      <Viewfinder color="var(--color-cream)" snap>
        <Card tone="sun" className="w-40 text-center font-display text-xl">
          Snap
        </Card>
      </Viewfinder>
      <Viewfinder color="var(--color-sun)" hunt length={14} thickness={3}>
        <Stamp variant="seg14" size="xl">
          BKXZ
        </Stamp>
      </Viewfinder>
      <Viewfinder color="var(--color-pink)" length={24} thickness={5} gap={12}>
        <span className="flex size-24 items-center justify-center">
          <Icon name="camera" className="size-12 text-cream" />
        </span>
      </Viewfinder>
    </div>
  );
}

function Buttons() {
  const variants: ButtonVariant[] = ['primary', 'secondary', 'sun', 'mint', 'sky', 'danger', 'ghost'];
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {variants.map((v) => (
          <Button key={v} variant={v}>
            {v}
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" variant="secondary" icon={<Icon name="arrow-left" className="size-4" />}>
          Back
        </Button>
        <Button size="md" variant="sky" icon={<Icon name="link" className="size-5" />}>
          Copy link
        </Button>
        <Button size="lg" variant="sun" icon={<Icon name="upload" className="size-5" />}>
          Add a photo
        </Button>
        <Button size="md" loading>
          Loading
        </Button>
      </div>
      <Button size="xl" block icon={<Icon name="camera" className="size-7" />}>
        Create a room
      </Button>
    </div>
  );
}

function Avatars() {
  const players = useMemo(() => fakePlayers(6, { offline: [4] }), []);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-5 pt-4">
        {(['xs', 'sm', 'md', 'lg', 'xl', '2xl'] as const).map((s) => (
          <Avatar key={s} player={players[0]} size={s} />
        ))}
      </div>
      <Card tone="cream" className="flex flex-wrap gap-4">
        {players.map((p, i) => (
          <PlayerChip key={p.id} player={p} isMe={i === 1} />
        ))}
      </Card>
    </div>
  );
}

function Timers() {
  const [base] = useState(() => serverNow());
  return (
    <div className="flex flex-wrap items-center gap-5">
      <TimerRing startsAt={base - 30_000} endsAt={base + 90_000} size={80} ticking={false} />
      <TimerRing startsAt={base - 80_000} endsAt={base + 40_000} ticking={false} />
      <TimerRing startsAt={base - 100_000} endsAt={base + 20_000} ticking={false} />
      <TimerRing startsAt={base} endsAt={null} ticking={false} />
      <TimerRing startsAt={base - 10_000} endsAt={base + 99_000} size={48} ticking={false} />
    </div>
  );
}

function Prints() {
  const [shot, setShot] = useState(0);
  return (
    <div className="flex flex-wrap items-start gap-6 pt-3">
      <Polaroid src={fakePortrait(3, 'daronne')} caption="Mom, summer '98" tilt={-3} className="w-44" />
      <Polaroid src={fakePortrait(8, 'daron')} caption="Whose dad is this?" tilt={2} viewfinder dateStamp="'98 12 24" className="w-52" />
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <Polaroid src={fakePortrait(5, 'kid')} caption="le petit 😂" tilt={-1} className="w-40" imageClassName="aspect-[4/5] w-full" />
          <Flash trigger={shot} />
        </div>
        <Button size="sm" variant="secondary" icon={<Icon name="flash" className="size-4" />} onClick={() => setShot((n) => n + 1)}>
          Flash the print
        </Button>
      </div>
    </div>
  );
}

function Spinners() {
  return (
    <div className="flex flex-wrap items-center gap-6">
      <Spinner className="size-4 text-cream" />
      <Spinner className="size-6 text-sun" />
      <Spinner className="size-10 text-sun" />
      <Spinner className="size-16 text-pink" />
      <span className="flex items-center gap-2 rounded-full border-3 border-ink bg-danger px-4 py-2 font-bold text-white shadow-pop-sm">
        <Spinner className="size-4" /> Connection lost
      </span>
      <Card tone="cream" padded={false} className="flex size-24 items-center justify-center">
        <Spinner className="size-10 text-ink" />
      </Card>
    </div>
  );
}

function Toasts() {
  const fire = () => {
    toast('Copied!', 'success', { icon: 'link', durationMs: 60_000 });
    toast('Photo uploaded. Nice one.', 'success', { icon: 'camera', durationMs: 60_000 });
    toast('That file is not a picture', 'error', { durationMs: 60_000 });
  };
  useEffect(() => {
    const id = window.setTimeout(fire, 300);
    return () => window.clearTimeout(id);
  }, []);
  return (
    <div className="flex flex-wrap gap-3">
      <Button size="sm" variant="secondary" icon={<Icon name="info" className="size-4" />} onClick={fire}>
        Fire toasts
      </Button>
      <Button size="sm" variant="secondary" onClick={() => toast('Paul joined', 'info', { emoji: '🦊' })}>
        Emoji toast (legacy)
      </Button>
      <Button size="sm" variant="sun" icon={<Icon name="flash" className="size-4" />} onClick={() => flashScreen()}>
        Screen flash
      </Button>
    </div>
  );
}

function TypeSpecimen() {
  return (
    <div className="space-y-4">
      <p className="text-outline font-display text-5xl leading-[0.95] text-cream">Whose dad is this?</p>
      <p className="text-outline font-display text-4xl leading-[0.95] text-sun">C'est la daronne de qui ?</p>
      <Card tone="cream" className="space-y-2">
        <p className="font-display text-2xl leading-tight">Gather the gang</p>
        <p className="font-semibold text-ink-soft">
          Bricolage Grotesque for everything you read: upload photos of your parents, then guess whose daron is whose.
        </p>
        <p className="text-hand text-3xl">Paul, summer '98 — so much hair</p>
        <div className="flex items-end gap-4">
          <span className="label-mono text-ink/60">ROOM · PHOTO · SCORE</span>
        </div>
      </Card>
    </div>
  );
}

function Everything() {
  return (
    <main className="mx-auto max-w-5xl px-4 pt-24 pb-24">
      <div className="mb-14 flex justify-center pt-4">
        <Logo size="lg" />
      </div>
      <Section id="logo" label="01 · wordmark" title="Logo sizes">
        <div className="flex flex-wrap items-center gap-12 px-4 py-6">
          <Logo size="md" />
          <Logo size="sm" />
        </div>
      </Section>
      <Section id="type" label="02 · type" title="Typography">
        <TypeSpecimen />
      </Section>
      <Section id="icons" label="03 · icons" title={`Icons (${ICON_NAMES.length})`}>
        <IconsGrid />
        <IconsOnDark />
        <IconsTwoTone />
      </Section>
      <Section id="kinds" label="04 · kind tags" title="Photo kinds">
        <Kinds />
      </Section>
      <Section id="themes" label="05 · theme art" title="Themes">
        <Themes />
      </Section>
      <Section id="stamps" label="06 · date stamps" title="Stamps">
        <Stamps />
      </Section>
      <Section id="viewfinder" label="07 · viewfinder" title="Viewfinder">
        <Viewfinders />
      </Section>
      <Section id="buttons" label="08 · buttons" title="Buttons">
        <Buttons />
      </Section>
      <Section id="avatars" label="09 · avatars" title="Avatars & crown">
        <Avatars />
      </Section>
      <Section id="timer" label="10 · timer" title="Timer ring">
        <Timers />
      </Section>
      <Section id="prints" label="11 · prints" title="Polaroid">
        <Prints />
      </Section>
      <Section id="spinner" label="12 · loading" title="Aperture spinner">
        <Spinners />
      </Section>
      <Section id="toasts" label="13 · toasts & flash" title="Toasts">
        <Toasts />
      </Section>
    </main>
  );
}

const lobbyView = () => fakeView(fakePlayers(5));

const page = (children: ReactNode) => <main className="mx-auto max-w-5xl px-4 pt-24 pb-16">{children}</main>;

const foundationPreviews: PreviewRegistry = {
  all: { view: lobbyView, chrome: false, render: () => <Everything /> },
  icons: {
    view: lobbyView,
    chrome: false,
    render: () =>
      page(
        <>
          <IconsGrid />
          <IconsOnDark />
          <IconsTwoTone />
        </>,
      ),
  },
  kinds: { view: lobbyView, chrome: false, render: () => page(<Kinds />) },
  themes: { view: lobbyView, chrome: false, render: () => page(<Themes />) },
  type: {
    render: () =>
      page(
        <>
          <div className="mb-12 flex justify-center">
            <Logo size="lg" />
          </div>
          <TypeSpecimen />
          <div className="mt-8">
            <Stamps />
          </div>
        </>,
      ),
  },
  'exit-kicked': { render: () => <ExitNotice code="BKXZ" reason="kicked" /> },
  'exit-replaced': { render: () => <ExitNotice code="BKXZ" reason="replaced" /> },
  'exit-gone': { render: () => <ExitNotice code="BKXZ" reason="room-gone" /> },
};

export default foundationPreviews;
