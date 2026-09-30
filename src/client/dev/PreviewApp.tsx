import { useEffect, useState, type ReactNode } from 'react';
import type { RoomView } from '../../shared/protocol';
import { ReactionBar, ReactionsLayer } from '../components/Reactions';
import homePreviews from '../screens/home/preview';
import foundationPreviews from './foundationPreview';
import lobbyPreviews from '../screens/lobby/preview';
import resultsPreviews from '../screens/results/preview';
import revealPreviews from '../screens/reveal/preview';
import votingPreviews from '../screens/voting/preview';
import { __devSetState } from '../lib/store';
import { recordServerTime } from '../lib/time';

/**
 * Dev-only gallery: /__preview lists every screen variant; /__preview/<screen>/<variant>
 * renders one with fake data (no server needed). Each screen folder exports its variants
 * from `preview.tsx`.
 */
export interface PreviewSpec {
  /** Built lazily so timestamps are relative to "now" when the page opens. */
  view?: () => RoomView;
  render: (view: RoomView | null) => ReactNode;
  /** Show the reaction button/layer like in a real room (default true when a view is given). */
  chrome?: boolean;
}
export type PreviewRegistry = Record<string, PreviewSpec>;

const REGISTRY: Record<string, PreviewRegistry> = {
  foundation: foundationPreviews,
  home: homePreviews,
  lobby: lobbyPreviews,
  voting: votingPreviews,
  reveal: revealPreviews,
  results: resultsPreviews,
};

/**
 * Dev-only lint: legacy classes from the dark "Photo lab" theme get a dashed magenta outline in
 * every preview, so screens migrating to the paper world never ship one (see the migration
 * table in index.css), and content running past the window gets a badge. ?lint=0 hides both.
 */
const LEGACY_LINT = `
[class*="text-cream"], [class*="text-sun"], [class*="grape-"], [class*="font-stamp7"],
.text-outline, .text-outline-sm, .text-stamp, .text-stamp-flat, .text-stamp-print {
  outline: 2px dashed #ff1fce !important;
  outline-offset: 1px;
}`;

/**
 * Content that runs past the window. #root clips sideways overflow (decorative paper may bleed),
 * so documentElement.scrollWidth no longer reveals a real overflow: this lists the outermost
 * non-decorative elements whose box passes the window's edges (not aria-hidden, not inside
 * another clipping box, not fixed). `window.__overflow()` returns them; a badge shows the count.
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

function LegacyLint() {
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
      <style>{LEGACY_LINT}</style>
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
  const spec = screen && variant ? REGISTRY[screen]?.[variant] : undefined;
  const [view, setView] = useState<RoomView | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const v = spec?.view?.() ?? null;
    if (v) {
      recordServerTime(v.serverNow);
      __devSetState({ view: v, session: { code: v.code, playerId: v.meId, token: 'preview' }, status: 'connected' });
    }
    setView(v);
    setReady(true);
  }, [spec]);

  if (!spec) {
    return (
      <main className="mx-auto max-w-xl px-4 pt-20 pb-10">
        <LegacyLint />
        <h1 className="mb-4 font-display text-4xl">Previews</h1>
        {Object.entries(REGISTRY).map(([name, reg]) => (
          <section key={name} className="mb-4">
            <h2 className="font-display text-2xl">{name}</h2>
            <ul className="ml-4 list-disc">
              {Object.keys(reg).map((v) => (
                <li key={v}>
                  <a className="font-semibold text-blue underline" href={`/__preview/${name}/${v}`}>
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
      <LegacyLint />
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
