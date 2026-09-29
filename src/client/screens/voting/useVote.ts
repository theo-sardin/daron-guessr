import { useCallback, useEffect, useRef, useState } from 'react';
import type { VotingView } from '../../../shared/protocol';
import { toast } from '../../components/Toast';
import { useT } from '../../i18n';
import { errorText } from '../../lib/errors';
import { api } from '../../lib/store';

interface Choice {
  round: number;
  id: string;
}

/**
 * Optimistic vote selection. The tapped candidate shows as selected right away; the
 * server's `myVote` takes over once it agrees (or when a request fails). At most one
 * request is in flight: taps made meanwhile are coalesced and only the latest is sent,
 * so hammering the grid never floods the server or reorders votes.
 */
export function useVote(v: VotingView) {
  const t = useT();
  const [pending, setPending] = useState<Choice | null>(null);
  const inFlight = useRef(false);
  const queued = useRef<Choice | null>(null);
  const latest = useRef({ round: v.round, myVote: v.myVote });
  useEffect(() => {
    latest.current = { round: v.round, myVote: v.myVote };
  }, [v.round, v.myVote]);

  const selected = pending && pending.round === v.round ? pending.id : v.myVote;

  // The server caught up with our choice (or the round moved on): drop the optimistic value.
  useEffect(() => {
    if (!pending) return;
    if (pending.round !== v.round || (v.myVote === pending.id && !inFlight.current && !queued.current)) setPending(null);
  }, [pending, v.round, v.myVote]);

  const send = useCallback(
    async (choice: Choice): Promise<void> => {
      inFlight.current = true;
      const res = await api.vote(choice.round, choice.id);
      inFlight.current = false;
      const next = queued.current;
      queued.current = null;
      const current = latest.current.round;
      const roundOver = current !== choice.round;
      if (next && next.round === current && (next.round !== choice.round || next.id !== choice.id)) {
        // A newer tap (for the round still open) arrived while this one was travelling: it wins.
        return send(next);
      }
      if (!res.ok) {
        setPending((p) => (p && p.round === choice.round && p.id === choice.id ? null : p));
        // A vote that bounced because the round just moved on is not worth a toast.
        if (!roundOver) toast(errorText(t, res.error), 'error');
        return;
      }
      // Success: the effect above clears `pending` once the view reflects it; if the view
      // already did (state arrived before the ack), clear it now.
      const { round, myVote } = latest.current;
      if (round === choice.round && myVote === choice.id) {
        setPending((p) => (p && p.round === choice.round && p.id === choice.id ? null : p));
      }
    },
    [t],
  );

  /** Returns true when the tap changed the selection. */
  const choose = useCallback(
    (id: string): boolean => {
      if (id === selected) return false;
      const choice = { round: v.round, id };
      setPending(choice);
      if (inFlight.current) queued.current = choice;
      else void send(choice);
      return true;
    },
    [selected, v.round, send],
  );

  return { selected, choose };
}
