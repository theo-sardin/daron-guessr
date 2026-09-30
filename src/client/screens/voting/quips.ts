import { BODY_PARTS, type PhotoKind } from '../../../shared/protocol';
import type { QuipGroup } from '../../i18n/strings/voting';

const BODY = new Set<PhotoKind>(BODY_PARTS);

/** Faces (family, friends, pets) share the quips; the other kinds get their own. */
export function quipGroup(kind: PhotoKind): QuipGroup {
  if (BODY.has(kind)) return 'body';
  switch (kind) {
    case 'kid':
    case 'pick':
    case 'roll':
    case 'crush':
    case 'me':
      return kind;
    default:
      return 'people';
  }
}

/** A small stable number from a string (picks the caption / note of a photo). */
export function hashOf(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
