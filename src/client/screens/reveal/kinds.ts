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
 * The mode-specific touch of the reveal, chosen by the photo's kind (one signature sticker
 * each, see scenes.tsx). Except on the board, the owner's face slides in next to the photo.
 * - `album` (parents): a "family resemblance" gauge, needle on the share of right guesses.
 * - `tree` (the rest of the family, friends, pets): a sticker naming the link to the owner.
 * - `glowup` (kid, me): "then" photo vs "now" face, with a ✨ GLOW-UP ✨ badge.
 * - `board` (pick, roll): the most voted suspects pinned around the photo with red string,
 *   then the culprit gets the badge.
 * - `poster` (crush): a teen-magazine title over the photo and hearts popping around.
 * - `lens` (body parts): a 🔍 zooms in on the detail, then flies to the owner's face.
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
