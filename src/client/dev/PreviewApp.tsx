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
