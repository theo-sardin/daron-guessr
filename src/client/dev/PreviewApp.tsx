import { useEffect, useState, type ReactNode } from 'react';
import type { RoomView } from '../../shared/protocol';
import { ReactionBar, ReactionsLayer } from '../components/Reactions';
import { __devSetState } from '../lib/store';
import { recordServerTime } from '../lib/time';

/**
 * Dev-only gallery: /__preview lists every screen variant; /__preview/<screen>/<variant>
 * renders one with fake data (no server needed). Each screen folder exports its variants
 * from `preview.tsx`, loaded on demand (a screen that fails to load only breaks its own
 * variants, and the index says so).
 */
export interface PreviewSpec {
  /** Built lazily so timestamps are relative to "now" when the page opens. */
  view?: () => RoomView;
  render: (view: RoomView | null) => ReactNode;
  /** Show the reaction button/layer like in a real room (default true when a view is given). */
  chrome?: boolean;
}
export type PreviewRegistry = Record<string, PreviewSpec>;

const LOADERS: Record<string, () => Promise<{ default: PreviewRegistry }>> = {
  home: () => import('../screens/home/preview'),
  lobby: () => import('../screens/lobby/preview'),
  voting: () => import('../screens/voting/preview'),
  reveal: () => import('../screens/reveal/preview'),
  results: () => import('../screens/results/preview'),
};

type Loaded = Record<string, PreviewRegistry | Error>;

async function load(names: string[]): Promise<Loaded> {
  const entries = await Promise.all(
    names.map(async (name) => {
      try {
        return [name, (await LOADERS[name]()).default] as const;
      } catch (e) {
        return [name, e instanceof Error ? e : new Error(String(e))] as const;
      }
    }),
  );
  return Object.fromEntries(entries);
}

/**
 * Content that runs past the window: lists the outermost elements whose box passes the window's
 * edges (not aria-hidden, not fixed). `window.__overflow()` returns them; a badge shows the
 * count. ?lint=0 hides it.
 */
function findOverflow(): string[] {
  const W = document.documentElement.clientWidth;
  const root = document.getElementById('root');
  if (!root) return [];
  const out: string[] = [];
  const visit = (el: Element) => {
    if (el.getAttribute('aria-hidden') === 'true') return;
    const cs = getComputedStyle(el);
    if (cs.position === 'fixed' || cs.display === 'none') return;
    const r = el.getBoundingClientRect();
    if (r.width > 0 && (r.right > W + 1 || r.left < -1)) {
      out.push(`${el.tagName.toLowerCase()}.${String((el as HTMLElement).className).trim().split(/\s+/).slice(0, 4).join('.')} [${Math.round(r.left)}, ${Math.round(r.right)}] "${(el.textContent ?? '').trim().slice(0, 30)}"`);
      return;
    }
    if (cs.overflowX !== 'visible') return;
    for (const c of el.children) visit(c);
  };
  for (const c of root.children) visit(c);
  return out;
}

function OverflowLint() {
  const [over, setOver] = useState<string[]>([]);
  const off = new URLSearchParams(window.location.search).get('lint') === '0';
  useEffect(() => {
    if (off) return;
    (window as unknown as { __overflow: () => string[] }).__overflow = findOverflow;
    const check = () => {
      const found = findOverflow();
      setOver(found);
      if (found.length) console.warn(`[preview] ${found.length} element(s) run past the window:\n${found.join('\n')}`);
    };
    const id = window.setTimeout(check, 2500);
    window.addEventListener('resize', check);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener('resize', check);
    };
  }, [off]);
  if (off) return null;
  return (
    <>
      {over.length > 0 && (
        <div className="fixed bottom-2 left-2 z-[200] bg-[#ff1fce] px-2 py-1 font-mono text-xs font-bold text-white" title={over.join('\n')}>
          overflow: {over.length} (console)
        </div>
      )}
    </>
  );
}

export function PreviewApp() {
  const [, screen, variant] = window.location.pathname.replace(/\/+$/, '').split('/').slice(1);
  const single = Boolean(screen && variant && screen in LOADERS);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  useEffect(() => {
    void load(single ? [screen] : Object.keys(LOADERS)).then(setLoaded);
  }, [single, screen]);
  const reg = single && loaded ? loaded[screen] : undefined;
  const spec = reg && !(reg instanceof Error) ? reg[variant] : undefined;
  const [view, setView] = useState<RoomView | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!spec) return;
    const v = spec.view?.() ?? null;
    if (v) {
      recordServerTime(v.serverNow);
      __devSetState({ view: v, session: { code: v.code, playerId: v.meId, token: 'preview' }, status: 'connected' });
    }
    setView(v);
    setReady(true);
  }, [spec]);

  if (!loaded) return null;
  if (reg instanceof Error) {
    return (
      <main className="mx-auto max-w-xl px-4 pt-20 pb-10">
        <h1 className="mb-2 font-display text-3xl text-danger">{screen}: failed to load</h1>
        <pre className="text-sm whitespace-pre-wrap">{String(reg.message)}</pre>
      </main>
    );
  }
  if (!spec) {
    return (
      <main className="mx-auto max-w-xl px-4 pt-20 pb-10">
        <OverflowLint />
        <h1 className="mb-4 font-display text-4xl text-sun">Previews</h1>
        {Object.entries(loaded).map(([name, r]) => (
          <section key={name} className="mb-4">
            <h2 className="font-display text-2xl">{name}</h2>
            {r instanceof Error && <p className="text-danger">failed to load: {r.message}</p>}
            <ul className="ml-4 list-disc">
              {Object.keys(r instanceof Error ? {} : r).map((v) => (
                <li key={v}>
                  <a className="text-sky underline" href={`/__preview/${name}/${v}`}>
                    {v}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>
    );
  }

  if (!ready) return null;
  const chrome = spec.chrome ?? Boolean(view);
  return (
    <>
      <OverflowLint />
      {spec.render(view)}
      {chrome && (
        <>
          <ReactionsLayer />
          <ReactionBar />
        </>
      )}
    </>
  );
}
