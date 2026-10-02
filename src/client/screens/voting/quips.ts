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
