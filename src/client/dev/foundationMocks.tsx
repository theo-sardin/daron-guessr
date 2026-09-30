import { useState, type CSSProperties } from 'react';
import type { PublicPlayer } from '../../shared/protocol';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { CutoutText } from '../components/CutoutText';
import { Logo } from '../components/Logo';
import { Annotation, Highlight, MarkerArrow, MarkerCheck, MarkerCircle, MarkerUnderline } from '../components/Marker';
import { KraftCard, NotebookCard, PostIt } from '../components/Paper';
import { Polaroid } from '../components/Polaroid';
import { RubberStamp } from '../components/RubberStamp';
import { Stamp } from '../components/Stamp';
import { StarBurst } from '../components/StarBurst';
import { TimerRing } from '../components/TimerRing';
import { PaperStrip, TornPaper } from '../components/TornPaper';
import { serverNow } from '../lib/time';
import { cn } from '../lib/util';
import { MOCK_PHOTOS } from './mockPhotos';

/*
 * Dev-only: the three scrapbook mockups (home, voting, reveal) rebuilt from the foundation
 * components, to compare with the reference PNGs and as a starting point for the screens.
 * /__preview/foundation/mock-home, /mock-voting, /mock-reveal
 */

const P = (id: string, name: string, avatar: string, color: string, extra: Partial<PublicPlayer> = {}): PublicPlayer => ({
  id,
  name,
  avatar,
  color,
  connected: true,
  isHost: false,
  ready: true,
  score: 0,
  ...extra,
});

export const MOCK_PLAYERS = {
  marie: P('p1', 'Marie', '🐼', '#ff4fa3'),
  paul: P('p2', 'Paul', '🦊', '#fffdf6'),
  julie: P('p3', 'Julie', '🐸', '#3ddc97'),
  karim: P('p4', 'Karim', '🐙', '#b388ff'),
  momo: P('p5', 'Momo', '🐯', '#ffd23f', { isHost: true }),
};

/* ------------------------------------------------------------------ home */

export function MockHome() {
  const [name] = useState('Momo');
  return (
    <main className="mx-auto w-full max-w-[430px] overflow-x-hidden px-4 pt-[calc(max(0.5rem,env(safe-area-inset-top))_+_4rem)] pb-10">
      {/* Masthead */}
      <div className="mr-[88px] flex items-center border-t-[2.5px] border-b border-ink py-1 font-type text-[11.5px]">
        <b className="mr-2 font-sans text-[11px] font-black tracking-[0.06em] [font-stretch:120%]">N°01</b> le zine des albums de famille
      </div>

      <section className="relative -mx-4 h-[300px]">
        <PaperStrip tone="blue" tilt={-5} className="-inset-x-8 top-[64px] h-[150px]" seed="home" />
        <Annotation rotate={-8} size={17} delay={0.9} className="absolute top-[4px] left-[14px] z-20 whitespace-nowrap">
          c'est qui ce bébé ?!
        </Annotation>
        <Polaroid src={MOCK_PHOTOS.baby} caption="bébé ?? 97" tilt={-9} tape className="absolute top-[30px] -left-[4px] z-[2] w-[124px] p-[7px]! pb-1!" captionClassName="text-[17px]" />
        <Polaroid src={MOCK_PHOTOS.mom} caption="Noël 94" tilt={2.5} tape="yellow" className="absolute top-[10px] left-[130px] z-[1] w-[130px] p-[7px]! pb-1!" captionClassName="text-[17px]" />
        <Polaroid src={MOCK_PHOTOS.dad} caption="Palavas, 89" tilt={8} tape className="absolute top-[34px] left-[272px] z-[2] w-[120px] p-[7px]! pb-1!" captionClassName="text-[17px]" />
        <StarBurst size={86} tilt={12} animate={0.7} className="absolute -top-[40px] right-[8px] z-30">
          <span className="text-[21px]">100%</span>
          <span className="mt-0.5 text-[10.5px] tracking-[0.02em]">GÊNANT</span>
        </StarBurst>
        <div className="absolute inset-x-0 top-[184px] z-20 flex justify-center">
          <Logo size="lg" />
        </div>
      </section>

      <p className="mt-1 text-center leading-none">
        <span className="block text-[16.5px] font-semibold text-ink-soft">Darons, potes, toi bébé…</span>
        <span className="mt-2 block font-display text-[27px] [font-stretch:112%]">
          Devine <Highlight delay={0.6}>à qui c'est.</Highlight>
        </span>
      </p>

      <ol className="mt-6 grid grid-cols-3 gap-2">
        <li>
          <NotebookCard tilt={-2.4} tape slap={0.2} className="flex h-[114px] flex-col py-2.5 pr-2 pl-6 [--margin:14px]">
            <span className="font-display text-[40px] leading-[0.85] text-red">1</span>
            <span className="mt-auto text-[14.5px] leading-[1.02] font-extrabold">Balance tes photos</span>
            <span className="text-pen mt-0.5 text-[15px]">même les pires</span>
          </NotebookCard>
        </li>
        <li>
          <KraftCard tilt={1.6} tape="yellow" slap={0.3} className="flex h-[114px] flex-col px-2.5 py-2.5" wrapperClassName="translate-y-1">
            <span className="font-display text-[40px] leading-[0.85]">2</span>
            <span className="mt-auto text-[14.5px] leading-[1.02] font-extrabold">Devine à qui c'est</span>
            <span className="text-pen mt-0.5 text-[15px] text-blue-dark">20 sec chrono</span>
          </KraftCard>
        </li>
        <li>
          <PostIt tilt={-1.2} tape slap={0.4} className="flex h-[114px] flex-col px-2.5 py-2.5">
            <span className="font-display text-[40px] leading-[0.85] text-blue">3</span>
            <span className="mt-auto text-[14.5px] leading-[1.02] font-extrabold">Grille tes potes</span>
            <span className="text-pen mt-0.5 text-[15px]">sans pitié</span>
          </PostIt>
        </li>
      </ol>

      <div className="mt-7 flex items-center gap-3">
        <span className="relative">
          <Avatar player={MOCK_PLAYERS.momo} size="xl" crown={false} tilt={-6} />
        </span>
        <div className="flex-1 rotate-[1.2deg] rounded-[13px] bg-red px-1.5 pb-2 shadow-paper">
          <span className="flex h-[33px] items-baseline justify-center gap-2 pt-1.5 text-white">
            <b className="font-wide text-[19px] [font-stretch:125%]">SALUT !</b>
            <i className="text-hand text-[20px] not-italic">moi c'est…</i>
          </span>
          <span className="flex h-[50px] items-center justify-center rounded-[7px] bg-sheet">
            <span className="-rotate-2 font-marker text-[30px]">{name}</span>
            <span className="ml-1 inline-block h-7 w-[2.5px] -rotate-2 bg-blue" />
          </span>
        </div>
      </div>

      <div className="mt-9 flex flex-col gap-5">
        <Button size="xl" block tape>
          Créer un salon
        </Button>
        <Button variant="secondary" size="md" block className="text-[17px]">
          <span className="flex items-center gap-2.5">
            J'ai déjà un code
            <span className="inline-flex gap-[3px]">
              {[0, 1, 2, 3].map((i) => (
                <i key={i} className="h-[21px] w-[17px] rounded-[3px] border-2 border-ink bg-white/35" />
              ))}
            </span>
          </span>
        </Button>
      </div>
    </main>
  );
}

/* ---------------------------------------------------------------- voting */

const TICKS: Array<{ c?: string; r: number; now?: boolean }> = [
  { c: '#E7B04C', r: -4 },
  { c: '#4FA9D6', r: 3 },
  { c: '#8C9DD0', r: -2, now: true },
  { r: 0 },
  { r: 0 },
  { r: 0 },
  { r: 0 },
  { r: 0 },
];

/** The round's contact sheet: one tiny print per photo, dashed slots for the ones to come. */
export function RoundTicks() {
  return (
    <div className="mt-2 flex gap-1">
      {TICKS.map((t, i) =>
        t.c ? (
          <i
            key={i}
            className={cn('block h-[15px] w-[13px] bg-white px-[1.5px] pt-[1.5px] pb-1 shadow-[0_1px_2px_rgb(40_25_10/0.3)]', t.now && 'outline-2 outline-offset-1 outline-red')}
            style={{ rotate: `${t.r}deg` }}
          >
            <span className="block size-full" style={{ background: t.c }} />
          </i>
        ) : (
          <i key={i} className="block h-[15px] w-[13px] border-[1.5px] border-dashed border-ink/35" />
        ),
      )}
    </div>
  );
}

function Candidate({ player, tilt, selected }: { player: PublicPlayer; tilt: number; selected?: boolean }) {
  return (
    <div className={cn('relative', selected && 'z-10')} style={{ rotate: `${tilt}deg` }}>
      <MarkerCircle show={!!selected} pad={11} className="block w-full" sound={false}>
        <TornPaper
          surface={selected ? 'postit' : 'sheet'}
          edges="tb"
          amp={1.5}
          lift
          className="flex h-[62px] items-center gap-2.5 pr-3 pl-2 text-[21px] font-extrabold tracking-[-0.01em]"
        >
          <Avatar player={player} size="sm" crown={false} className="scale-[1.17]" />
          <span className="ml-1">{player.name}</span>
        </TornPaper>
      </MarkerCircle>
      {selected && <MarkerCheck delay={0.3} className="absolute top-1/2 right-2.5 z-20 -mt-[15px]" />}
    </div>
  );
}

export function MockVoting() {
  const [base] = useState(() => serverNow());
  const { marie, paul, julie, karim, momo } = MOCK_PLAYERS;
  return (
    <main className="mx-auto w-full max-w-[430px] overflow-x-hidden px-4 pt-[calc(max(0.5rem,env(safe-area-inset-top))_+_4.75rem)] pb-32">
      <div className="flex items-end justify-between">
        <div>
          <Stamp label="photo" size="xl" ariaLabel="Photo 3 sur 8">
            3/8
          </Stamp>
          <RoundTicks />
        </div>
        <TimerRing startsAt={base - 6_000} endsAt={base + 14_000} size={86} ticking={false} className="-mr-1" />
      </div>

      <h1 className="mt-3 font-display text-[30px] leading-none [font-stretch:108%]">
        <span className="flex items-end gap-2.5">
          C'est la <CutoutText text="Daronne" size={33} seed={2} />
        </span>
        <span className="mt-1 flex items-baseline gap-2.5">
          de
          <MarkerUnderline double delay={0.4} className="font-marker text-[40px] leading-[0.9] font-normal tracking-normal text-red">
            qui ?
          </MarkerUnderline>
        </span>
      </h1>

      <section className="relative -mx-4 mt-1 h-[302px]">
        <PaperStrip tone="blue" tilt={4} className="-inset-x-8 top-[140px] h-[126px]" seed="vote" />
        <Polaroid src={MOCK_PHOTOS.mom} caption="Noël 94" tilt={-2.5} tape className="absolute top-[14px] left-[24px] z-[2] w-[248px] p-[10px]!" captionClassName="text-[24px] mt-2" />
        <Annotation rotate={6} delay={0.8} className="absolute top-[28px] left-[276px] z-10 w-[110px]">
          ces lunettes&nbsp;!!
        </Annotation>
        <MarkerArrow from={[87, 17]} to={[17, 78]} bend={-0.28} delay={1.2} className="top-[58px] left-[168px] z-10 h-[80px] w-[120px]" />
      </section>

      <div className="mt-1.5 grid grid-cols-2 gap-3">
        <Candidate player={marie} tilt={-1.2} />
        <Candidate player={paul} tilt={1} selected />
        <Candidate player={julie} tilt={0.8} />
        <Candidate player={karim} tilt={-1} />
      </div>

      <div className="mt-6 flex items-center gap-2.5 pr-20">
        <div className="flex">
          {[marie, paul, julie, momo].map((p, i) => (
            <Avatar key={p.id} player={p} size="xs" crown={false} tilt={[-6, 4, -3, 5][i]} className="-mr-2 scale-[1.07]" />
          ))}
          <span className="-mr-2 flex size-[30px] items-center justify-center rounded-full border-2 border-dashed border-ink/40 text-[13px] font-extrabold text-ink-soft">?</span>
        </div>
        <div className="ml-3 leading-none">
          <span className="font-display text-[22px] [font-stretch:110%]">4/5</span> <span className="text-[16px] font-bold">ont voté</span>
          <em className="text-pen mt-0.5 block text-[17px] not-italic">on attend Karim…</em>
        </div>
      </div>
    </main>
  );
}

/* ---------------------------------------------------------------- reveal */

const CONFETTI: Array<CSSProperties & { sq?: boolean }> = [
  { background: 'var(--color-red)', width: 14, height: 7, left: 4, top: 6, rotate: '34deg', sq: true },
  { background: 'var(--color-blue)', width: 10, height: 10, left: 26, top: 40 },
  { background: 'var(--color-yellow)', width: 7, height: 7, left: 8, top: 78 },
  { background: 'var(--color-pink)', width: 9, height: 9, left: 40, top: 112 },
  { background: 'var(--color-ink)', width: 18, height: 5, left: 2, top: 126, rotate: '51deg', sq: true },
  { background: 'var(--color-mint)', width: 18, height: 5, left: 60, top: 2, rotate: '9deg', sq: true },
  { background: 'var(--color-blue)', width: 18, height: 5, right: 16, top: 34, rotate: '-25deg', sq: true },
  { background: 'var(--color-yellow)', width: 18, height: 5, right: 28, top: 70, rotate: '-40deg', sq: true },
  { background: 'var(--color-pink)', width: 10, height: 10, right: 10, top: 98 },
  { background: 'var(--color-ink)', width: 7, height: 7, right: 60, top: 120 },
  { background: 'var(--color-mint)', width: 8, height: 8, right: 10, top: 6 },
  { background: 'var(--color-yellow)', width: 8, height: 8, right: 20, top: 150 },
];

function VoteRow({ player, voters, count, win, note }: { player: PublicPlayer; voters: PublicPlayer[]; count: number; win?: boolean; note?: React.ReactNode }) {
  return (
    <div className="relative grid h-[50px] grid-cols-[40px_64px_1fr_58px] items-center">
      {win && <span aria-hidden className="absolute -inset-x-2 top-1 bottom-[3px] -z-10 -rotate-[0.8deg] -skew-x-6 rounded-[4px_10px_5px_12px] bg-yellow" />}
      <Avatar player={player} size="sm" crown={false} tilt={-4} />
      <span className="pl-1.5 text-[18px] font-extrabold tracking-[-0.01em]">{player.name}</span>
      <div className="relative h-8">
        <TornPaper
          surface={win ? 'red' : 'kraft'}
          edges="r"
          amp={3}
          fiber={false}
          lift
          className="flex h-8 items-center pl-1"
          wrapperStyle={{ width: `${Math.max(36, (count / 3) * 100)}%` }}
        >
          {voters.map((v) => (
            <Avatar key={v.id} player={v} size="xs" crown={false} className="-mr-1.5 scale-[0.86]" />
          ))}
        </TornPaper>
        {note}
      </div>
      <span className={cn('text-right leading-[0.85]', win && 'text-red')}>
        <Stamp size="md" className="items-end!" valueClassName="text-[30px]!">
          {count}
        </Stamp>
        <small className="mt-0.5 block text-[11px] font-bold opacity-80">{count > 1 ? 'votes' : 'vote'}</small>
      </span>
    </div>
  );
}

export function MockReveal() {
  const { marie, paul, julie, karim, momo } = MOCK_PLAYERS;
  return (
    <main className="mx-auto w-full max-w-[430px] overflow-x-hidden px-4 pt-[calc(max(0.5rem,env(safe-area-inset-top))_+_4.5rem)] pb-12">
      <div className="relative text-center">
        <div aria-hidden className="pointer-events-none absolute -inset-x-4 -top-2 h-40">
          {CONFETTI.map(({ sq, ...c }, i) => (
            <i key={i} className={cn('absolute block shadow-[0_1px_1px_rgb(0_0_0/0.15)]', sq ? 'rounded-[1px]' : 'rounded-full')} style={c} />
          ))}
        </div>
        <p className="font-wide text-[24px] tracking-[0.02em] uppercase">La daronne de</p>
        <div className="mt-1.5 flex items-center justify-center gap-2">
          <CutoutText text="Julie!" size={60} seed={1} animate as="h1" />
          <Avatar player={julie} size="lg" crown={false} tilt={10} className="ml-2" />
        </div>
      </div>

      <section className="relative -mx-4 mt-1.5 h-[276px]">
        <PaperStrip tone="yellow" tilt={-4} className="-inset-x-8 top-[70px] h-[118px]" seed="reveal" />
        <Polaroid src={MOCK_PHOTOS.mom} caption="Maman, Noël 94" tilt={3} tape className="absolute top-[12px] left-[78px] z-[2] w-[216px]" captionClassName="text-[22px] mt-2" />
        <RubberStamp top backing animate={0.3} className="absolute top-[132px] left-[146px] z-10">
          Grillée&nbsp;!
        </RubberStamp>
      </section>

      <section className="mt-1.5">
        <h3 className="label-type mb-2 flex items-center gap-2 text-[12px] after:h-px after:flex-1 after:bg-ink/50">les votes</h3>
        <VoteRow player={paul} voters={[marie, karim, momo]} count={3} />
        <VoteRow
          player={julie}
          voters={[paul]}
          count={1}
          win
          note={
            <Annotation rotate={-4} size={17} delay={0.6} className="absolute top-[6px] left-[92px] whitespace-nowrap">
              ← la bonne !
            </Annotation>
          }
        />
        <VoteRow
          player={marie}
          voters={[julie]}
          count={1}
          note={
            <Annotation font="pen" rotate={-3} size={19} delay={0.9} className="absolute top-[4px] left-[98px] whitespace-nowrap">
              ← Julie qui bluffe
            </Annotation>
          }
        />
      </section>

      <NotebookCard torn="lb" tape="yellow" tilt={-1.4} wrapperClassName="mx-1 mt-4" className="py-3 pr-4 pl-9 [--line:24px] [--margin:24px]">
        <p className="text-pen text-[24px] leading-[1.02]">
          Tout le monde a voté Paul… mais c'est la daronne de{' '}
          <MarkerUnderline delay={1.1} className="text-red">
            Julie
          </MarkerUnderline>{' '}
          <span className="emoji text-[20px]">👀</span>
        </p>
      </NotebookCard>

      <div className="mt-7">
        <Button size="xl" block tape>
          Photo suivante
        </Button>
      </div>
    </main>
  );
}
