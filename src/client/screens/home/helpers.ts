import { useAnimate } from 'motion/react';
import { useCallback, useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { normalizeRoomCode, ROOM_CODE_LENGTH } from '../../../shared/protocol';
import { loadProfile, saveProfile } from '../../lib/session';
import { getState } from '../../lib/store';
import { vibrate } from '../../lib/util';

/**
 * Pulls a room code out of whatever was typed or pasted: a bare code ("abcd"), a spaced
 * one ("A B C D") or a full invite link ("https://host/ABCD?lang=fr").
 */
export function extractCode(text: string): string {
  const trimmed = text.trim();
  const fromLink = trimmed.match(/\/([A-Za-z]{4})\/?(?:[?#].*)?$/);
  if (fromLink) return normalizeRoomCode(fromLink[1]);
  return normalizeRoomCode(trimmed);
}

export const isCompleteCode = (code: string) => code.length === ROOM_CODE_LENGTH;

/**
 * Resolves once the socket is connected (or after `timeoutMs`). A phone that just opened
 * the page may tap "Create" before the socket finished connecting: waiting a moment beats
 * an instant "connection problem" toast.
 */
export function waitForConnection(timeoutMs = 4000): Promise<void> {
  return new Promise((resolve) => {
    if (getState().status === 'connected') {
      resolve();
      return;
    }
    const start = Date.now();
    const id = window.setInterval(() => {
      if (getState().status === 'connected' || Date.now() - start > timeoutMs) {
        window.clearInterval(id);
        resolve();
      }
    }, 100);
  });
}

/** True on devices with a mouse / trackpad (where autofocus does not pop a keyboard). */
export function hasFinePointer(): boolean {
  return typeof window !== 'undefined' && Boolean(window.matchMedia?.('(hover: hover) and (pointer: fine)').matches);
}

export function isWideScreen(): boolean {
  return typeof window !== 'undefined' && Boolean(window.matchMedia?.('(min-width: 1024px)').matches);
}

/**
 * A form field that can be flagged with an error message: the field shakes, the phone
 * buzzes and the message shows until the value changes.
 */
export function useFieldError<T extends HTMLElement = HTMLDivElement>() {
  const [scope, animate] = useAnimate<T>();
  const [error, setError] = useState<string | null>(null);
  const flag = useCallback(
    (message: string) => {
      setError(message);
      vibrate([30, 40, 30]);
      if (scope.current) void animate(scope.current, { x: [0, -12, 11, -8, 7, -4, 3, 0] }, { duration: 0.45, ease: 'easeOut' });
    },
    [animate, scope],
  );
  const clear = useCallback(() => setError(null), []);
  return { scope, error, flag, clear };
}

/** Name + avatar, loaded from and saved to the device so returning players skip the form. */
export function useProfileState() {
  const [initial] = useState(loadProfile);
  const [name, setName] = useState(initial.name);
  const [avatar, setAvatar] = useState(initial.avatar);
  const first = useRef(true);
  useEffect(() => {
    // Do not write on mount: a random avatar only becomes "yours" once you touch the form.
    if (first.current) {
      first.current = false;
      return;
    }
    saveProfile({ name, avatar });
  }, [name, avatar]);
  return { name, setName, avatar, setAvatar };
}

/** Center of an element as a fraction of the viewport (for confetti origins). */
export function viewportOrigin(el: Element | null): { x: number; y: number } | undefined {
  if (!el) return undefined;
  const r = el.getBoundingClientRect();
  return { x: (r.left + r.width / 2) / window.innerWidth, y: (r.top + r.height / 2) / window.innerHeight };
}

/** Forces color emoji fonts (some systems otherwise pick a monochrome glyph from the text font). */
export const EMOJI_FONT: CSSProperties = {
  fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Twemoji Mozilla", sans-serif',
};

/**
 * Focuses the name field on mount on desktop only (on phones it would pop the keyboard over
 * the hero), without scrolling: a banner above the form must stay in view.
 */
export function useDesktopAutoFocus(ref: RefObject<HTMLInputElement | null>, enabled = true) {
  useEffect(() => {
    if (!enabled || !hasFinePointer()) return;
    ref.current?.focus({ preventScroll: true });
    // Mount only: re-focusing later would steal focus from whatever the player is doing.
  }, []);
}
