import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { PHOTO_KINDS, THEMES } from '../../shared/protocol';
import { Avatar, PlayerChip } from '../components/Avatar';
import { AvatarPicker } from '../components/AvatarPicker';
import { LightLeak } from '../components/Background';
import { Button, type ButtonVariant } from '../components/Button';
import { Card } from '../components/Card';
import { CutoutText } from '../components/CutoutText';
import { DymoLabel } from '../components/DymoLabel';
import { Flash, flashScreen } from '../components/Flash';
import { Icon, ICON_NAMES, type IconName } from '../components/Icon';
import { IconBadge, type IconBadgeTone } from '../components/IconBadge';
import { KindTag } from '../components/KindTag';
import { ScreenTitle } from '../components/Layout';
import { Lightbox } from '../components/Lightbox';
import { Logo } from '../components/Logo';
import { Annotation, Highlight, MarkerArrow, MarkerCheck, MarkerCircle, MarkerCross, MarkerUnderline } from '../components/Marker';
import { ConfirmDialog, Modal } from '../components/Modal';
import { KraftCard, NotebookCard, Paper, PostIt } from '../components/Paper';
import { Polaroid } from '../components/Polaroid';
import { ReactionBar } from '../components/Reactions';
import { RoundButton } from '../components/RoundButton';
import { RubberStamp } from '../components/RubberStamp';
import { SelfiePrint } from '../components/SelfiePrint';
import { Spinner } from '../components/Spinner';
import { Stamp } from '../components/Stamp';
import { StarBurst } from '../components/StarBurst';
import { Tape, type TapeTone } from '../components/Tape';
import { ThemeArt } from '../components/ThemeArt';
import { TimerRing } from '../components/TimerRing';
import { toast } from '../components/Toast';
import { PaperStrip, TornPaper, type PaperSurface } from '../components/TornPaper';
import { useT } from '../i18n';
import { burst } from '../lib/confetti';
import { sfx } from '../lib/sfx';
import { serverNow } from '../lib/time';
import { ExitNotice } from '../screens/RoomScreen';
import { fakePlayers, fakePortrait, fakeView } from './fixtures';
import { MOCK_PLAYERS, MockHome, MockReveal, MockVoting, RoundTicks } from './foundationMocks';
import { MOCK_PHOTOS } from './mockPhotos';
import type { PreviewRegistry } from './PreviewApp';

/**
 * Dev-only gallery of the shared building blocks ("Scrapbook / zine" foundation):
 * /__preview/foundation/all (everything) or one page: logo, type, paper, marks, stamps,
 * buttons, avatars, timer, prints, icons, kinds, themes, toasts, modal, lightbox, reactions,
 * exit-*, and the three mockups rebuilt from components: mock-home, mock-voting, mock-reveal.
 * Add ?lang=fr to check the French labels.
 */

function Section({ id, n, title, children, note }: { id: string; n: string; title: string; children: ReactNode; note?: ReactNode }) {
  return (
    <section id={id} className="mb-16">
      <p className="label-type mb-1.5">
        n°{n} · {id}
      </p>
      <h2 className="font-display text-[2rem] leading-none">{title}</h2>
      {note && <p className="text-pen mt-1.5 max-w-prose -rotate-[0.6deg] text-[1.2rem]">{note}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

const Label = ({ children }: { children: ReactNode }) => <span className="label-type block">{children}</span>;

/* ------------------------------------------------------------------ type */

function TypeSpecimen() {
  return (
    <div className="space-y-5">
      <p className="font-display text-[2.6rem] leading-[0.95]">C'est le daron de qui&nbsp;?</p>
      <p className="font-wide text-2xl uppercase">La daronne de</p>
      <p className="text-[1.05rem] font-medium text-ink-soft">
        Archivo for everything you read: balance les photos de tes darons, puis devine à qui est chaque photo.
      </p>
      <div className="flex flex-wrap items-end gap-6">
        <span className="font-num text-[4rem]">14</span>
        <Stamp label="photo" size="xl">
          3/8
        </Stamp>
        <Stamp label="score" size="lg">
          1250
        </Stamp>
      </div>
      <p className="text-marker text-[1.6rem]">ces lunettes !!</p>
      <p className="text-pen text-[1.8rem]">Maman, Noël 94 — on attend Karim…</p>
      <p className="font-brush text-[1.7rem] text-blue">Caveat Brush, pour crier au stylo</p>
      <p className="flex gap-6">
        <span className="label-type">salon n° · photo · les votes</span>
        <span className="font-mono text-sm font-bold">Courier Prime</span>
      </p>
      <p className="text-[1.3rem] font-semibold">
        Devine <Highlight>à qui c'est.</Highlight> <Highlight tone="pink">Grillée</Highlight> <Highlight tone="mint">bien joué</Highlight>
      </p>
    </div>
  );
}

function Cutouts() {
  const names = ['Julie!', 'Daronne', 'Théo', 'Maximilien', 'Chloé & Inès', 'Karim 🔥', 'Jean-Christophe!', 'MAXIMILIENNE', 'Anne-Charlotte M.'];
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-6">
        {(['xs', 'sm', 'md', 'lg', 'xl'] as const).map((s) => (
          <div key={s}>
            <CutoutText text="Paul" size={s} />
            <Label>{s}</Label>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
        {names.map((n) => (
          <CutoutText key={n} text={n} size="md" />
        ))}
      </div>
      <div>
        <Label>same text, other seeds</Label>
        <div className="mt-1 flex flex-wrap gap-5">
          {[0, 1, 2, 3].map((s) => (
            <CutoutText key={s} text="Grillé" seed={s} size="sm" />
          ))}
        </div>
      </div>
      <div>
        <Label>never overflows: size is a maximum, the longest word sets the scale (16-letter names, xl / 60px)</Label>
        <div className="mt-2 space-y-3">
          <CutoutText text="Jean-Christophe!" size="xl" as="h3" />
          <CutoutText text="MAXIMILIENNE" size="lg" seed={3} />
          {/* The reveal headline: the name next to its avatar in a flex row. */}
          <div className="flex items-center justify-center gap-2">
            <CutoutText text="Jean-Christophe!" size={60} seed={1} animate as="h3" />
            <Avatar player={MOCK_PLAYERS.julie} size="lg" crown={false} tilt={10} className="ml-2" />
          </div>
          <div className="flex items-center justify-center gap-2">
            <CutoutText text="Julie!" size={60} seed={1} as="h3" />
            <Avatar player={MOCK_PLAYERS.julie} size="lg" crown={false} tilt={10} className="ml-2" />
          </div>
        </div>
      </div>
      <div className="max-w-[340px]">
        <Label>fit: one line, shrinks to the width (340px box)</Label>
        <CutoutText text="Jean-Christophe" size="lg" fit className="mt-2" />
        <CutoutText text="Léa" size="lg" fit className="mt-2" />
      </div>
      <div>
        <Label>animate (slapped on one by one)</Label>
        <Replay>{(k) => <CutoutText key={k} text="La daronne !" size="lg" animate as="h3" />}</Replay>
      </div>
    </div>
  );
}

/** Re-mounts its content on click (to replay entrance animations). */
function Replay({ children }: { children: (key: number) => ReactNode }) {
  const [k, setK] = useState(0);
  return (
    <div className="mt-2 flex flex-wrap items-center gap-5">
      {children(k)}
      <Button size="sm" variant="outline" icon={<Icon name="refresh" className="size-4" />} onClick={() => setK((n) => n + 1)}>
        replay
      </Button>
    </div>
  );
}

/* ----------------------------------------------------------------- paper */

function Papers() {
  const surfaces: PaperSurface[] = ['sheet', 'grain', 'notebook', 'grid', 'kraft', 'postit', 'pink', 'mint', 'sky', 'lilac', 'ink', 'red'];
  const tapes: TapeTone[] = ['cream', 'yellow', 'red', 'blue', 'pink', 'mint'];
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {surfaces.map((s, i) => (
          <TornPaper key={s} surface={s} edges={['b', 'tb', 'r', 'tblr'][i % 4]} tilt={i % 2 ? 1.5 : -1.5} className="flex h-24 items-end p-3 pl-7 font-extrabold">
            {s}
          </TornPaper>
        ))}
      </div>
      <div>
        <Label>cards: NotebookCard · KraftCard · PostIt · Paper (tape, tilt, slap)</Label>
        <ol className="mt-3 grid max-w-[420px] grid-cols-3 gap-2">
          <li>
            <NotebookCard tilt={-2.4} tape slap={0.1} margin={14} className="flex h-[114px] flex-col py-2.5 pr-2">
              <span className="font-display text-[40px] leading-[0.85] text-red">1</span>
              <span className="mt-auto text-[14.5px] leading-[1.02] font-extrabold">Balance tes photos</span>
              <span className="text-pen mt-0.5 text-[15px]">même les pires</span>
            </NotebookCard>
          </li>
          <li>
            <KraftCard tilt={1.6} tape="yellow" slap={0.2} className="flex h-[114px] flex-col p-2.5">
              <span className="font-display text-[40px] leading-[0.85]">2</span>
              <span className="mt-auto text-[14.5px] leading-[1.02] font-extrabold">Devine à qui c'est</span>
              <span className="text-pen mt-0.5 text-[15px] text-blue-dark">20 sec chrono</span>
            </KraftCard>
          </li>
          <li>
            <PostIt tilt={-1.2} tape slap={0.3} className="flex h-[114px] flex-col p-2.5">
              <span className="font-display text-[40px] leading-[0.85] text-blue">3</span>
              <span className="mt-auto text-[14.5px] leading-[1.02] font-extrabold">Grille tes potes</span>
              <span className="text-pen mt-0.5 text-[15px]">sans pitié</span>
            </PostIt>
          </li>
        </ol>
        <div className="mt-6 grid max-w-[640px] gap-5 sm:grid-cols-2">
          <Paper surface="grain" tape="pink" tilt={1} className="p-5">
            <p className="font-display text-xl">Paper (sheet)</p>
            <p className="mt-1 text-ink-soft">A clean-cut sheet with a paper shadow. torn=false by default.</p>
          </Paper>
          <Card tone="notebook">
            <p className="font-display text-xl">Card tone="notebook"</p>
            <p className="mt-1 text-ink-soft">Legacy Card API: cream, white, sun, pink, mint, sky, lilac, glass + notebook, kraft, grid, ink.</p>
          </Card>
        </div>
      </div>
      <div className="relative h-56 overflow-hidden">
        <Label>PaperStrip (halftone, torn on 4 sides) behind a print</Label>
        <PaperStrip tone="blue" tilt={-4} className="-inset-x-8 top-16 h-28" />
        <PaperStrip tone="yellow" tilt={3} className="top-24 left-[55%] h-24 w-[60%]" />
        <Polaroid src={MOCK_PHOTOS.dad} caption="Palavas, 89" tilt={5} tape className="absolute top-8 left-6 w-36" />
      </div>
      <div className="flex flex-wrap items-center gap-6">
        {tapes.map((t, i) => (
          <span key={t} className="flex flex-col items-center gap-2">
            <Tape tone={t} rotate={i % 2 ? 4 : -5} className="relative" />
            <Label>{t}</Label>
          </span>
        ))}
        <Replay>{(k) => <Tape key={k} tone="yellow" width={120} height={28} rotate={-3} animate className="relative" />}</Replay>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- marks */

function Marks() {
  const [on, setOn] = useState(true);
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-10">
        <MarkerCircle show={on} sound>
          <span className="block bg-yellow px-4 py-3 text-xl font-extrabold shadow-paper-sm">Paul</span>
        </MarkerCircle>
        <MarkerCircle show={on} tone="blue" pad={6}>
          <Avatar player={MOCK_PLAYERS.julie} size="lg" crown={false} />
        </MarkerCircle>
        <span className="font-display text-3xl">
          de{' '}
          <MarkerUnderline show={on} double className="font-marker text-[40px] font-normal text-red">
            qui ?
          </MarkerUnderline>
        </span>
        <span className="text-2xl font-bold">
          <MarkerUnderline show={on} tone="blue">
            souligné
          </MarkerUnderline>
        </span>
        <MarkerCross show={on}>
          <span className="text-2xl font-extrabold">Marie</span>
        </MarkerCross>
        <MarkerCheck key={String(on)} />
        <Button size="sm" variant="outline" onClick={() => setOn((o) => !o)}>
          {on ? 'hide marks' : 'draw marks'}
        </Button>
      </div>
      <div className="relative h-44 max-w-[420px]">
        <Annotation className="absolute top-2 right-0 w-[120px]" rotate={6}>
          ces lunettes&nbsp;!!
        </Annotation>
        <MarkerArrow key={String(on)} from={[88, 20]} to={[20, 80]} bend={-0.28} className="top-10 left-[140px] h-24 w-32" />
        <Annotation font="pen" rotate={-4} size={24} className="absolute top-24 left-0">
          ← Julie qui bluffe
        </Annotation>
        <Annotation font="brush" rotate={3} size={26} className="absolute top-2 left-0">
          au stylo feutre
        </Annotation>
        <MarkerArrow from={[5, 50]} to={[95, 45]} bend={0.15} tone="blue" className="bottom-2 left-4 h-8 w-40" />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- stamps */

function Stamps() {
  return (
    <div className="space-y-8">
      <div className="relative flex flex-wrap items-center gap-8">
        <Replay>
          {(k) => (
            <RubberStamp key={k} top animate>
              Grillée&nbsp;!
            </RubberStamp>
          )}
        </Replay>
        <RubberStamp tone="blue" size="md" tilt={6}>
          Incognito
        </RubberStamp>
        <RubberStamp tone="ink" size="sm" tilt={-4} top="★">
          Validé
        </RubberStamp>
        <RubberStamp size="xs" tilt={3}>
          Hôte
        </RubberStamp>
        <div className="relative w-44">
          <Polaroid src={MOCK_PHOTOS.mom} tilt={2} className="w-44" />
          <RubberStamp backing size="md" className="absolute top-24 -left-4">
            Grillée&nbsp;!
          </RubberStamp>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-6">
        <StarBurst>
          <span className="text-[21px]">100%</span>
          <span className="mt-0.5 text-[10.5px]">GÊNANT</span>
        </StarBurst>
        <StarBurst tone="red" size={72} tilt={-10} spikes={12} seed={3}>
          <span className="text-[18px]">+300</span>
        </StarBurst>
        <StarBurst tone="pink" size={64} tilt={8} spikes={16} seed={9}>
          <span className="text-[13px]">NEW</span>
        </StarBurst>
        <StarBurst tone="mint" size={96} tilt={-4} animate>
          <span className="text-[15px]">BIEN</span>
          <span className="text-[15px]">JOUÉ</span>
        </StarBurst>
      </div>
      <div className="flex flex-wrap items-center gap-5">
        <DymoLabel text="BKXZ" size="lg" tilt={-2} spacing={0.24} />
        <DymoLabel text="GUESSR" tone="red" size="md" tilt={-3} spacing={0.22} />
        <DymoLabel text="Salon 4" tone="blue" size="sm" tilt={2} />
        <DymoLabel text="ABCDEFGHJKLMN" size="sm" />
        <DymoLabel text="PQRSTUVWXYZ" size="sm" />
      </div>
      <div className="flex flex-wrap items-end gap-8">
        <div>
          <Stamp label="photo" size="xl">
            3/8
          </Stamp>
          <RoundTicks />
        </div>
        <Stamp label="score" size="lg">
          +300
        </Stamp>
        <Stamp label="votes" size="2xl">
          3
        </Stamp>
        <Stamp variant="mono" label="code" size="md">
          BKXZ
        </Stamp>
        <Stamp plate label="hud" size="md">
          7/8
        </Stamp>
        <span className="flex flex-wrap items-end gap-3">
          {(['xs', 'sm', 'md', 'lg', 'xl', '2xl'] as const).map((s) => (
            <Stamp key={s} size={s}>
              42
            </Stamp>
          ))}
        </span>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- buttons */

function Buttons() {
  const variants: ButtonVariant[] = ['primary', 'secondary', 'outline', 'sun', 'mint', 'sky', 'danger', 'ghost'];
  return (
    <div className="max-w-[640px] space-y-6">
      <div className="flex flex-col gap-6">
        <Button size="xl" block tape>
          Créer un salon
        </Button>
        <Button variant="secondary" size="lg" block>
          J'ai déjà un code
        </Button>
      </div>
      <div className="flex flex-wrap gap-5">
        {variants.map((v) => (
          <Button key={v} variant={v}>
            {v}
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-5">
        {(['sm', 'md', 'lg', 'xl'] as const).map((s) => (
          <Button key={s} size={s}>
            {s}
          </Button>
        ))}
        <Button size="lg" arrow>
          Go
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-5">
        <Button size="sm" variant="outline" icon={<Icon name="arrow-left" className="size-4" />}>
          Retour
        </Button>
        <Button size="md" variant="sky" icon={<Icon name="link" className="size-5" />}>
          Copier le lien
        </Button>
        <Button size="lg" variant="sun" icon={<Icon name="upload" className="size-5" />}>
          Ajouter une photo
        </Button>
        <Button size="md" loading>
          Loading
        </Button>
        <Button size="md" variant="secondary" disabled>
          Disabled
        </Button>
      </div>
      <div className="space-y-4">
        <Label>states: loading keeps its colors; disabled is a pencil outline (label 7.9:1)</Label>
        <div className="flex flex-wrap items-center gap-5">
          <Button size="lg" loading>
            Photo suivante
          </Button>
          <Button size="lg" disabled>
            Photo suivante
          </Button>
          <Button size="md" variant="sun" loading>
            Envoyer
          </Button>
          <Button size="md" variant="outline" disabled>
            Outline
          </Button>
          <Button size="md" variant="ghost" disabled>
            Ghost
          </Button>
        </div>
        <Label>arrows: `arrow` is the only forward arrow; old arrow-right icons are converted (see the console)</Label>
        <div className="flex flex-col gap-5">
          <Button size="lg" block icon={<Icon name="arrow-right" className="size-6" weight="bold" />}>
            icon=arrow-right → hand arrow
          </Button>
          <Button block size="lg">
            <span className="inline-flex items-center gap-2">
              Next photo (arrow in children)
              <Icon name="arrow-right" className="size-6" />
            </span>
          </Button>
          <div className="flex gap-3">
            <Button size="md" variant="secondary" arrow className="flex-1">
              Passer
            </Button>
            <Button size="md" variant="sun" iconEnd={<Icon name="trophy" className="size-5" />} className="flex-1">
              Résultats
            </Button>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <RoundButton label="Son" tilt={-4}>
          <Icon name="sound-on" fill="currentColor" className="size-6" />
        </RoundButton>
        <RoundButton label="Quitter" tone="red" tilt={5}>
          <Icon name="leave" className="size-6" />
        </RoundButton>
        <RoundButton label="Partager" tone="blue" tilt={-2}>
          <Icon name="share" className="size-6" />
        </RoundButton>
        <RoundButton label="Fermer" filled>
          <Icon name="x" className="size-5" weight="bold" />
        </RoundButton>
        <RoundButton label="QR" size={56} tilt={3}>
          <Icon name="qr" className="size-7" />
        </RoundButton>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- avatars */

function Avatars() {
  const players = useMemo(() => fakePlayers(8, { offline: [4] }), []);
  const [pick, setPick] = useState('🐯');
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-5 pt-5">
        {(['xs', 'sm', 'md', 'lg', 'xl', '2xl'] as const).map((s, i) => (
          <Avatar key={s} player={players[0]} size={s} tilt={i % 2 ? 4 : -4} />
        ))}
        <Avatar player={MOCK_PLAYERS.julie} size="lg" highlight />
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        {players.map((p, i) => (
          <PlayerChip key={p.id} player={p} isMe={i === 1} />
        ))}
      </div>
      <div>
        <Label>selfie: the profile picture in the disc, the emoji on the rim (opt-in)</Label>
        <div className="mt-3 flex flex-wrap items-end gap-5">
          {(['sm', 'md', 'lg', 'xl'] as const).map((s, i) => (
            <Avatar key={s} player={withSelfie} size={s} selfie tilt={i % 2 ? 3 : -3} />
          ))}
          <PlayerChip player={withSelfie} size="md" selfie />
        </div>
      </div>
      <div>
        <Label>SelfiePrint: a face next to a photo, for comparison</Label>
        <div className="relative mt-4 flex items-start gap-4">
          <Polaroid src={MOCK_PHOTOS.mom} caption="Noël 94" tilt={-2} tape className="w-44" />
          <div className="flex flex-col gap-5 pt-3">
            <SelfiePrint player={withSelfie} size={92} tilt={5} animate={0.2} />
            <SelfiePrint player={MOCK_PLAYERS.julie} size={76} tilt={-4} tape="yellow" />
          </div>
          <Annotation font="pen" rotate={-6} size={22} className="absolute -bottom-9 left-6 w-32">
            même nez !
          </Annotation>
        </div>
      </div>
      <Card tone="cream" className="max-w-md">
        <AvatarPicker value={pick} onChange={setPick} color="#3ddc97" />
      </Card>
    </div>
  );
}

/** A player with a selfie (a fake portrait as the profile picture). */
const withSelfie = { ...MOCK_PLAYERS.paul, selfieUrl: fakePortrait(21, 'brother') };

function Timers() {
  const [base] = useState(() => serverNow());
  return (
    <div className="flex flex-wrap items-center gap-6">
      <TimerRing startsAt={base - 6_000} endsAt={base + 14_000} size={86} ticking={false} />
      <TimerRing startsAt={base - 30_000} endsAt={base + 90_000} size={80} ticking={false} />
      <TimerRing startsAt={base - 80_000} endsAt={base + 40_000} ticking={false} />
      <TimerRing startsAt={base - 16_000} endsAt={base + 4_000} ticking={false} size={72} />
      <TimerRing startsAt={base} endsAt={null} ticking={false} />
      <TimerRing startsAt={base - 10_000} endsAt={base + 99_000} size={48} ticking={false} />
    </div>
  );
}

/* ---------------------------------------------------------------- prints */

function Prints() {
  const [shot, setShot] = useState(0);
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start gap-8 pt-3">
        <Polaroid src={MOCK_PHOTOS.mom} caption="Noël 94" tilt={-2.5} tape className="w-60" onOpen={() => setOpen(MOCK_PHOTOS.mom)} />
        <Polaroid src={fakePortrait(8, 'daron')} caption="Whose dad is this?" tilt={2} tape="yellow" className="w-48" />
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Polaroid src={fakePortrait(5, 'kid')} caption="le petit 😂" tilt={-1} className="w-40" imageClassName="aspect-[4/5] w-full" />
            <Flash trigger={shot} />
          </div>
          <Button size="sm" variant="outline" icon={<Icon name="flash" className="size-4" />} onClick={() => setShot((n) => n + 1)}>
            Flash the print
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-5">
        {[11, 12, 13, 14, 15].map((n, i) => (
          <Polaroid
            key={n}
            src={fakePortrait(n, (['grandpa', 'sister', 'daron', 'grandma', 'brother'] as const)[i])}
            caption={['Papi', 'Sœur', 'Papa', 'Mamie', 'Frérot'][i]}
            tilt={i % 2 ? 2 : -2}
            className="w-28"
            captionClassName="text-[1.15rem]"
          />
        ))}
      </div>
      <Lightbox src={open} caption="Noël 94" onClose={() => setOpen(null)} />
    </div>
  );
}

/* ----------------------------------------------------------------- icons */

function IconsGrid() {
  return (
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
      {ICON_NAMES.map((n) => (
        <div key={n} className="flex flex-col items-center gap-1.5 bg-sheet px-1 pt-3 pb-2 shadow-paper-sm">
          <Icon name={n} className="size-7" />
          <span className="max-w-full truncate font-type text-[10px]">{n}</span>
        </div>
      ))}
    </div>
  );
}

function IconWeights() {
  const names: IconName[] = ['camera', 'sound-on', 'leave', 'ballot', 'scissors', 'users'];
  const sizes = [14, 16, 20, 24, 32, 44, 56];
  return (
    <div className="mt-4 overflow-x-auto">
      {names.map((n) => (
        <div key={n} className="flex items-center gap-4">
          {sizes.map((s) => (
            <span key={s} className="flex items-center justify-center" style={{ width: 60, height: 62 }}>
              <Icon name={n} style={{ width: s, height: s }} fill={n === 'sound-on' ? 'currentColor' : undefined} />
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

function Badges() {
  const tones: Array<[IconBadgeTone, IconName]> = [
    ['sun', 'camera'],
    ['pink', 'heart'],
    ['mint', 'check'],
    ['sky', 'users'],
    ['tangerine', 'trophy'],
    ['lilac', 'mask'],
    ['danger', 'alert'],
    ['cream', 'crown'],
    ['kraft', 'scissors'],
    ['blue', 'pin'],
    ['ink', 'stamp'],
  ];
  return (
    <div className="mt-5 space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        {tones.map(([tone, n], i) => (
          <IconBadge key={tone} name={n} tone={tone} size="lg" tilt={i % 2 ? 3 : -3} />
        ))}
      </div>
      <div className="flex flex-wrap items-end gap-3">
        {(['xs', 'sm', 'md', 'lg', 'xl'] as const).map((s) => (
          <IconBadge key={s} name="ballot" tone="mint" size={s} />
        ))}
      </div>
    </div>
  );
}

function Kinds() {
  return (
    <div className="space-y-4">
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <div key={size} className="flex flex-wrap items-center gap-x-2.5 gap-y-3">
          <span className="label-type w-6">{size}</span>
          {PHOTO_KINDS.map((k, i) => (
            <KindTag key={k} kind={k} size={size} tilt={i % 3 === 0 ? -2 : i % 3 === 1 ? 1.5 : 0} />
          ))}
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-3">
        <span className="label-type">tone=fill</span>
        <KindTag kind="daronne" tone="fill" size="lg" tilt={-3} />
        <KindTag kind="grandpa" tone="fill" />
        <KindTag kind="kid" icon="star" tilt={-2} />
      </div>
    </div>
  );
}

function Themes() {
  const t = useT();
  const sizes = ['size-24', 'size-16', 'size-12', 'size-10', 'size-7'] as const;
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {THEMES.map((th) => (
          <div key={th}>
            <span className="font-display text-lg">{t(`common.theme.${th}.name`)}</span>
            <div className="flex flex-wrap items-center gap-3">
              {sizes.map((sz) => (
                <ThemeArt key={sz} theme={th} className={sz} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* --------------------------------------------------- toasts, modal, misc */

const fireToasts = (durationMs = 60_000) => {
  toast('Lien copié !', 'success', { icon: 'link', durationMs });
  toast('Photo ajoutée. Belle trouvaille.', 'info', { icon: 'camera', durationMs });
  toast("Ce fichier n'est pas une image", 'error', { durationMs });
};

function Moments({ auto }: { auto?: boolean }) {
  const [leak, setLeak] = useState(false);
  const [modal, setModal] = useState(false);
  const [confirm, setConfirm] = useState(false);
  useEffect(() => {
    if (!auto) return;
    const id = window.setTimeout(() => fireToasts(), 300);
    return () => window.clearTimeout(id);
  }, [auto]);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4">
        <Button size="sm" variant="outline" icon={<Icon name="info" className="size-4" />} onClick={() => fireToasts(4000)}>
          Toasts
        </Button>
        <Button size="sm" variant="outline" onClick={() => toast('Paul a rejoint', 'info', { emoji: '🦊' })}>
          Emoji toast
        </Button>
        <Button size="sm" variant="outline" onClick={() => setModal(true)}>
          Modal
        </Button>
        <Button size="sm" variant="outline" onClick={() => setConfirm(true)}>
          Confirm
        </Button>
        <Button size="sm" variant="sun" icon={<Icon name="flash" className="size-4" />} onClick={() => flashScreen()}>
          Flash
        </Button>
        <Button size="sm" variant="mint" onClick={() => burst()}>
          Confetti
        </Button>
        <Button size="sm" variant="danger" onClick={() => setLeak((l) => !l)}>
          {leak ? 'Stop the sun stain' : 'Sun stain'}
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {(['tape', 'stamp', 'marker', 'paper', 'pop', 'shutter'] as const).map((s) => (
          <Button key={s} size="sm" variant="ghost" sound={false} onClick={() => sfx.play(s)}>
            ♪ {s}
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-6">
        <Spinner className="size-5" />
        <Spinner className="size-8 text-blue" />
        <Spinner className="size-12 text-red" />
        <TornPaper surface="red" edges="tblr" amp={2.5} tilt={-1.5} className="flex items-center gap-2.5 px-5 py-2.5 font-bold text-white">
          <Spinner className="size-5" /> Connexion perdue — on se reconnecte…
        </TornPaper>
      </div>
      <LightLeak active={leak} />
      <ModalDemo open={modal} onClose={() => setModal(false)} />
      <ConfirmDialog
        open={confirm}
        title="Quitter le salon ?"
        body="Tes photos seront retirées."
        confirmLabel="Quitter"
        danger
        onCancel={() => setConfirm(false)}
        onConfirm={() => setConfirm(false)}
      />
    </div>
  );
}

function ModalDemo({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [pick, setPick] = useState('🦊');
  return (
    <Modal open={open} onClose={onClose} title="Ton profil">
      <p className="mb-4 text-ink-soft">Choisis ta tête pour la partie.</p>
      <AvatarPicker value={pick} onChange={setPick} />
      <div className="mt-6">
        <Button block size="lg" onClick={onClose}>
          C'est moi
        </Button>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------ everything */

function Everything() {
  return (
    <main className="mx-auto max-w-5xl px-4 pt-24 pb-28">
      <div className="mb-16 flex justify-center pt-4">
        <Logo size="lg" />
      </div>
      <Section id="logo" n="01" title="Logo" note="tap the big one to replay">
        <div className="flex flex-wrap items-center gap-12 px-4 py-6">
          <Logo size="md" />
          <Logo size="sm" />
        </div>
      </Section>
      <Section id="type" n="02" title="Typographie">
        <TypeSpecimen />
        <div className="mt-6">
          <ScreenTitle sub="ScreenTitle with a sub line">Le lobby</ScreenTitle>
          <ScreenTitle cutout cutoutSize="md">
            Résultats
          </ScreenTitle>
        </div>
      </Section>
      <Section id="cutout" n="03" title="Lettres découpées" note="deterministic per string: same name, same letters everywhere">
        <Cutouts />
      </Section>
      <Section id="paper" n="04" title="Papiers, déchirures, scotch">
        <Papers />
      </Section>
      <Section id="marks" n="05" title="Feutre & stylo" note="strokes draw themselves when they appear">
        <Marks />
      </Section>
      <Section id="stamps" n="06" title="Tampons, étoiles, Dymo, chiffres">
        <Stamps />
      </Section>
      <Section id="buttons" n="07" title="Boutons">
        <Buttons />
      </Section>
      <Section id="avatars" n="08" title="Avatars">
        <Avatars />
      </Section>
      <Section id="timer" n="09" title="Chrono">
        <Timers />
      </Section>
      <Section id="prints" n="10" title="Polaroids" note="tap the first one: lightbox">
        <Prints />
      </Section>
      <Section id="icons" n="11" title={`Icônes (${ICON_NAMES.length})`}>
        <IconsGrid />
        <IconWeights />
        <Badges />
      </Section>
      <Section id="kinds" n="12" title="Étiquettes de type">
        <Kinds />
      </Section>
      <Section id="themes" n="13" title="Thèmes">
        <Themes />
      </Section>
      <Section id="moments" n="14" title="Toasts, modales, sons">
        <Moments />
      </Section>
    </main>
  );
}

const lobbyView = () => fakeView(fakePlayers(5));
/** A room in play (the top bar drops the language tab). */
const playView = () => fakeView(fakePlayers(5), 0, { phase: 'voting' });
const page = (children: ReactNode) => <main className="mx-auto max-w-5xl px-4 pt-24 pb-24">{children}</main>;

const foundationPreviews: PreviewRegistry = {
  all: { view: lobbyView, chrome: false, render: () => <Everything /> },
  logo: {
    render: () =>
      page(
        <div className="flex flex-col items-center gap-14 pt-6">
          <Logo size="lg" />
          <Logo size="md" />
          <Logo size="sm" />
        </div>,
      ),
  },
  type: {
    render: () =>
      page(
        <>
          <TypeSpecimen />
          <div className="mt-10">
            <Cutouts />
          </div>
        </>,
      ),
  },
  paper: { render: () => page(<Papers />) },
  marks: { render: () => page(<Marks />) },
  stamps: { render: () => page(<Stamps />) },
  buttons: { view: lobbyView, chrome: false, render: () => page(<Buttons />) },
  avatars: { render: () => page(<Avatars />) },
  timer: { render: () => page(<Timers />) },
  prints: { render: () => page(<Prints />) },
  icons: {
    render: () =>
      page(
        <>
          <IconsGrid />
          <IconWeights />
          <Badges />
        </>,
      ),
  },
  kinds: { render: () => page(<Kinds />) },
  themes: { render: () => page(<Themes />) },
  toasts: { view: lobbyView, chrome: false, render: () => page(<Moments auto />) },
  modal: {
    render: () => {
      const Open = () => <ModalDemo open onClose={() => undefined} />;
      return page(<Open />);
    },
  },
  confirm: {
    render: () =>
      page(<ConfirmDialog open title="Quitter le salon ?" body="Tes photos seront retirées." confirmLabel="Quitter" danger onCancel={() => undefined} onConfirm={() => undefined} />),
  },
  lightbox: { render: () => page(<Lightbox src={MOCK_PHOTOS.mom} caption="Maman, Noël 94" onClose={() => undefined} />) },
  reactions: {
    view: lobbyView,
    chrome: false,
    render: () =>
      page(
        <>
          <p className="text-pen text-2xl">the tray, open</p>
          <ReactionBar defaultOpen />
        </>,
      ),
  },
  'exit-kicked': { render: () => <ExitNotice code="BKXZ" reason="kicked" /> },
  'exit-replaced': { render: () => <ExitNotice code="BKXZ" reason="replaced" /> },
  'exit-gone': { render: () => <ExitNotice code="BKXZ" reason="room-gone" /> },
  'mock-home': { render: () => <MockHome /> },
  'mock-voting': { view: playView, render: () => <MockVoting /> },
  'mock-reveal': { view: playView, chrome: false, render: () => <MockReveal /> },
};

export default foundationPreviews;
