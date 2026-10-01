import type { PhotoKind } from '../../../shared/protocol';

/**
 * How the reveal copy talks about a photo's subject. Captions and the owner's mood lines are
 * written once per group, and the exact noun ("your sister", "le papi de Paul") is interpolated:
 * - `relM` / `relF`: male / female relatives (EN him/her, FR agreement: reconnu / reconnue).
 * - `other`: friend, partner, pet — no family wording, and FR phrasings that need no agreement.
 * - `kid`: the owner themself as a child. `me`: the owner themself, any age.
 * - `pick`: a picture the owner chose. `roll`: the last photo of their camera roll.
 * - `crush`: their teen crush. `body`: one of their body parts (FR: no agreement needed).
 */
export type CaptionGroup = 'relM' | 'relF' | 'other' | 'kid' | 'me' | 'pick' | 'roll' | 'crush' | 'body';

export const CAPTION_GROUP: Record<PhotoKind, CaptionGroup> = {
  daron: 'relM',
  brother: 'relM',
  grandpa: 'relM',
  daronne: 'relF',
  sister: 'relF',
  grandma: 'relF',
  friend: 'other',
  partner: 'other',
  pet: 'other',
  kid: 'kid',
  me: 'me',
  pick: 'pick',
  roll: 'roll',
  crush: 'crush',
  hand: 'body',
  foot: 'body',
  ear: 'body',
  eye: 'body',
  nose: 'body',
  smile: 'body',
  knee: 'body',
  elbow: 'body',
  navel: 'body',
  hair: 'body',
};

/**
 * The mode-specific reveal scene, chosen by the photo's kind:
 * - `album` (parents): the photo arrives on an album page turning, then the owner's print
 *   lands next to it with a hand-drawn "family resemblance" meter.
 * - `tree` (the rest of the family, friends, pets): a family-tree doodle links the photo to the owner.
 * - `glowup` (kid, me): "then vs now" split with the owner's print and a GLOW-UP star.
 * - `board` (pick, roll): a detective cork board, red string from the photo to every suspect,
 *   then the culprit circled.
 * - `poster` (crush): a teen-magazine poster pinned with hearts.
 * - `lens` (body parts): a magnifying glass zooms out onto the whole person.
 */
export type Scene = 'album' | 'tree' | 'glowup' | 'board' | 'poster' | 'lens';

export const SCENE: Record<PhotoKind, Scene> = {
  daron: 'album',
  daronne: 'album',
  brother: 'tree',
  sister: 'tree',
  grandpa: 'tree',
  grandma: 'tree',
  friend: 'tree',
  partner: 'tree',
  pet: 'tree',
  kid: 'glowup',
  me: 'glowup',
  pick: 'board',
  roll: 'board',
  crush: 'poster',
  hand: 'lens',
  foot: 'lens',
  ear: 'lens',
  eye: 'lens',
  nose: 'lens',
  smile: 'lens',
  knee: 'lens',
  elbow: 'lens',
  navel: 'lens',
  hair: 'lens',
};
