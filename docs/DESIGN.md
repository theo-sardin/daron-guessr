# Daron Guessr — design

"Daron" / "daronne" is French slang for dad / mom. In the original game everyone in a room
uploads a photo of each parent, then the group guesses, photo by photo, whose parent is
whose. When creating a room, the host picks that or another **theme** — the game mode
(siblings and friends, childhood photos, "who picked this picture?", the last photo of your
camera roll, your teen crush, a photo of yourself, body parts, or anything goes) — and how
many photos each player brings (1 to 3). Any mode can be played **blurry**: the photo starts
heavily blurred and sharpens during the round, and guessing early earns a speed bonus.
At the end every photo is revealed with its vote breakdown, and a recap hands out scores
and awards.

## Game flow

1. **Home** — pick a nickname and an avatar emoji, then *Create a room* or *Join* with a
   4-letter code (links look like `https://host/ABCD`, which pre-fills the code). Creating
   a room starts by choosing the **game mode** (the theme, see *Themes, kinds and photos per
   player*): a mandatory step, sent with `room:create` as `settings: { theme,
   photosPerPlayer?, blur? }` (`RoomSetup`). The room starts with that theme,
   `THEME_DEFAULT_PHOTOS[theme]` photos per player unless `photosPerPlayer` is given, and
   blur set to `THEME_DEFAULT_BLUR[theme]` unless `blur` is given; any invalid value is
   refused with `BAD_REQUEST` and no room is created. Without `settings` (older clients,
   bots) the room starts with `DEFAULT_SETTINGS`.
2. **Lobby** — players join with the code / link / QR code. Each player fills up to
   `photosPerPlayer` photo slots and labels each photo with a kind the theme allows (see
   *Themes, kinds and photos per player*). Only you ever see your own photos in the lobby.
   The host adjusts the settings (seconds per photo, anonymous votes on/off, blur on/off,
   and can still change the game mode and photos per player picked when creating the room)
   and starts
   once at least `MIN_PHOTO_OWNERS` (3) players have at least one photo in an active slot.
   Players without photos can still play: they just guess. The host can kick players in
   the lobby. Anyone can also add an optional **selfie** (see *Selfies*), at any time.
3. **Voting** — the server shuffles every photo in an active slot (avoiding two photos of
   the same owner back to back when possible). One photo at a time, everyone votes for whose
   photo it is; the question follows the photo's kind ("Whose daronne is this?", "Whose
   sister is this?", "Who is this as a kid?", "Who picked this picture?", "Whose camera roll
   is this from?", "Whose teen crush is this?", "Who is this?", "Whose ear is this?").
   Candidates are the players that have photos in the game, minus the voter.
   - The **owner votes too**, as a decoy ("vote for someone else to throw them off"), so
     the "who has voted" indicators never give the owner away. Decoy votes never count.
   - Votes can be changed until the round closes.
   - The round closes when the timer runs out, or `ALL_VOTED_GRACE_MS` after every
     connected player has voted, or when the host skips. With no timer (`voteSeconds = 0`)
     only the last two apply. If no one is connected the round waits.
   - The first round starts `GAME_INTRO_MS` after the game starts (3-2-1 intro), the next
     ones `ROUND_GAP_MS` after the previous one closed.
   - With **blur** on, the photo starts heavily blurred and sharpens in steps, fully sharp
     for the end of the round; a correct vote earns a speed bonus (see *Blur and speed
     bonus*).
4. **Reveal** — same order as voting. For each photo: the photo, animated vote bars
   (counts only, or who voted for whom when anonymous votes are off), a drum roll, then
   the owner is revealed with confetti and a caption that fits the result (everybody got
   it / nobody did / everybody picked the same wrong person…). Each player privately sees
   whether they got it right. The host moves to the next photo. Scores in the player list
   only include fully revealed photos — and with anonymous votes on, they stay at 0 for the
   whole reveal (each player only sees their own points go up), since score changes would
   tell everybody who guessed each photo right. Final scores appear in the results.
5. **Results** — podium + full ranking, awards (Sherlock, Needs glasses, Carbon copy,
   Master of disguise, Doppelgänger, Most confusing photo, Biggest mix-up, and Eagle eye in
   blur games), and a wall of
   every photo with its owner and how many people got it. The host can start a new round
   (back to the lobby, same players and settings, photos/votes/scores cleared).

Anyone can send floating emoji reactions at any time.

### Themes, kinds and photos per player

Every photo has a **kind** (`PhotoKind`): what it shows, relative to the player who
uploaded it. The kind drives the voting question and every caption about the photo. Most
kinds are a relative (`daron`, `daronne`, `brother`, `sister`, `grandpa`, `grandma`,
`friend`, `partner`, `pet`); the others are about the player themself: `kid` (the player as
a child), `pick` (any picture the player chose: a meme, a place, a dish…), `roll` (the LAST
photo in the player's camera roll, no cheating), `crush` (the celebrity the player had a
crush on as a teen), `me` (a photo of the player, any age) and the body parts (`BODY_PARTS`:
`hand`, `foot`, `ear`, `eye`, `nose`, `smile`, `knee`, `elbow`, `navel`, `hair` — a fixed,
safe-for-work list; in that mode each player picks, per slot, which part the photo shows).
For all of those the "owner" to guess is simply the player, so the engine treats every kind
the same way.

The host's **theme** (`Settings.theme`, the "game mode") is chosen when creating the room
and can be changed in the lobby. It decides which kinds players may use (`THEME_KINDS`) and
the default number of photos (`THEME_DEFAULT_PHOTOS`) and whether blur is on by default
(`THEME_DEFAULT_BLUR`):

| Theme | Name in the UI (EN / FR) | Allowed kinds | Default photos | Blur | Default kind per slot |
| --- | --- | --- | --- | --- | --- |
| `parents` (default) | Parents / Darons | daron, daronne | 2 | off | daron, daronne, daron |
| `family` | Friends & family / Famille & potes | sister, brother, daron, daronne, grandpa, grandma, friend, partner, pet | 2 | off | sister, brother, friend |
| `childhood` | Mini me / Version mini | kid | 1 | off | kid |
| `pick` | Who picked it? / Qui a choisi ? | pick | 1 | off | pick |
| `roll` | Camera-roll roulette / Pellicule roulette | roll | 1 | off | roll |
| `crush` | Teen crush / Crush d'ado | crush | 1 | off | crush |
| `whois` | Who's that? / Qui est-ce ? | me | 1 | **on** | me |
| `body` | Body parts / Morceaux choisis | the 10 body parts | 2 | off | hand, ear, knee |
| `mix` | Anything goes / Tout est permis | all 24 kinds | 2 | off | daron, daronne, kid |

`Settings.photosPerPlayer` (1, 2 or 3) is the number of **active** slots: slots
`0 .. photosPerPlayer - 1`. Rules, all enforced by the server:

- `photo:upload` and `photo:setKind` need an active slot and a kind the theme allows
  (`BAD_REQUEST` otherwise). `photo:remove` works on any slot.
- Lowering `photosPerPlayer` never deletes anything: photos in inactive slots are kept (and
  still listed in the owner's `myPhotos`, so the UI can offer to bring them back), but they
  do not count for readiness (`PublicPlayer.ready`) or for `MIN_PHOTO_OWNERS`, and they are
  never played.
- Switching to another theme relabels every uploaded photo whose kind the new theme does
  not allow to `defaultKindForSlot(theme, slot)`, and resets `photosPerPlayer` and `blur`
  to the theme's defaults — unless the same `host:settings` update also sets them. Sending
  the current theme again changes nothing. An update with any invalid field is rejected as
  a whole.
- Settings survive `host:playAgain`; photos do not.

### Selfies (profile pictures)

Each player may add one optional selfie, "for comparison": the UI shows it next to the photos
(on the vote buttons while voting — "he has his dad's nose!" — and side by side with the photo
at the reveal). Unlike game photos, selfies are **public**: every viewer gets every player's
`PublicPlayer.selfieUrl`, in every phase (absent when the player has none).

- `player:selfie` `{ mime, data }` sets or replaces the caller's selfie, in any phase (people
  may add one late); `player:removeSelfie` deletes it (ok when there is none). Only for the
  calling player.
- Stored like photos: in memory, checked by header (`image.ts`), at most `MAX_PHOTO_BYTES`,
  counted in the per-room and server-wide photo byte caps and in the upload rate limits (per
  socket and bytes per IP, shared with `photo:upload`). Its id is random and unrelated to game
  photo ids; it is served by `/photos/:code/:id` like a photo. Replacing it gives a new URL
  and deletes the old image.
- A selfie is never a game photo: it lives on the player, not in the room's photos, so it is
  never played and never counts for readiness, candidates or `MIN_PHOTO_OWNERS`.
- It goes away with the player (lobby leave, kick, lobby disconnect timeout) and with the room.
  It is **kept** by `host:playAgain`: it is a profile picture, not a game photo. A `room:leave`
  during a game only disconnects the player (their seat and photos stay for the game), but the
  selfie is deleted right away: leaving on purpose means "take my face away". A player who
  merely disconnects keeps it until dropped from the next lobby or until the room goes away.

### Blur and speed bonus

`Settings.blur` (a host setting, available in every mode, on by default only in *Who's
that?*) turns every round into a "sharpening" round:

- **Steps.** A round is split into `BLUR_VARIANT_WIDTHS.length + 1` (5) equal steps:
  `stepMs = roundMs / 5`, with `roundMs = voteSeconds * 1000`, or `BLUR_NO_TIMER_ROUND_MS`
  (20 s) without a timer. Step `i` starts at `startsAt + i * stepMs` (step 0 also covers the
  intro and the gap before the round). Steps 0-3 are low-resolution copies of the photo, the
  last step is the full photo, so the photo is fully sharp for the last fifth of the round
  (without a timer it stays sharp until everybody voted or the host skips).
- **Variants (anti-cheat).** A CSS blur over the full photo would be trivially undone with
  the dev tools, so the uploader's browser also sends small JPEG copies of the photo, one per
  `BLUR_VARIANT_WIDTHS` entry (12 / 24 / 48 / 96 px on the longest edge), as `photo:upload`
  `variants`. The server checks each one (exactly 4 or none, image header, at most
  `MAX_BLUR_VARIANT_BYTES`, longest edge at most its width + 2 px), stores them with the photo
  under random ids unrelated to the photo id, counts them in the byte quotas and deletes them
  with the photo. During a blurred round `VotingView.photo.url` points to the current step's
  variant (`photo.id` is the first variant's id, stable for the round) and the client scales
  it up and softens it; the full photo URL is handed out only at the last step, or once the
  round is over (reveal, results). Photos uploaded without variants (an older client, or a
  browser that could not make them) fall back to the full URL, blurred by the client
  (`blur.fromVariant` is false).
- **Re-sent at every step.** `VotingView.blur = { step, steps, nextStepAt, fromVariant }`.
  The engine's `nextWakeAt` includes the next step boundary and `tick` reports a change when
  a step starts, so every player gets a fresh view (with the sharper URL) at each step.
- **Speed bonus.** The engine records, with each vote, the step at which the voter last
  *changed* their vote (confirming the same pick keeps the earlier step). A correct vote
  scores `POINTS_PER_CORRECT + BLUR_BONUS_BY_STEP[step]`: +100 / +75 / +50 / +25 / +0.

### Scoring

`POINTS_PER_CORRECT` (100) per correct guess, plus the blur speed bonus in blur games (see
above). Decoy votes score nothing. `RankingEntry.bonus` is the bonus part of the score, and
each `PhotoResult.myPoints` tells the viewer what they earned on that photo (absent for its
owner). Public scores follow the same rules as before (bonus included).

### Awards (computed server side, only included when meaningful)

- **sherlock** — most correct guesses (needs >= 1 correct). Ties: all tied players.
- **needsGlasses** — fewest correct guesses, among players that cast >= 1 real vote; only
  if it is a different set of players than sherlock.
- **carbonCopy** — player whose photos got the highest share of correct votes (value = %,
  needs >= 1 vote on their photos, value > 0).
- **masterOfDisguise** — lowest share of correct votes on their photos; only if different
  from carbonCopy.
- **doppelganger** — player that received the most wrong votes (people thought other
  people's photos were theirs), needs >= 2.
- **mostConfusing** — photo whose votes were spread over the most distinct candidates
  (tie-break: fewest correct votes), needs >= 3 distinct candidates.
- **biggestMixup** — (photo, wrong candidate) pair with the most votes, needs >= 2 votes
  and more votes than the correct owner received on that photo.
- **eagleEye** — blur games only: the most speed-bonus points (value = bonus points, needs
  > 0). Ties: all tied players.

## Architecture

Single Node process, no database: rooms live in memory.

- `src/shared/protocol.ts` — constants, types, socket event contract. **The source of
  truth.**
- `src/server/` — Express + Socket.IO.
  - `game.ts`: pure game engine (room state machine, no I/O, time injected) — unit tested.
  - `views.ts`: builds the per-player `RoomView` (the anonymity boundary) — unit tested.
  - `rooms.ts`: room registry, codes, cleanup of idle rooms.
  - `socket.ts`: event handlers, payload validation (zod), acks, rate limits, timers,
    broadcasting per-player views. Abuse limits (everything lives in memory): per socket
    (events, reactions, uploads), per client IP (connections, room creation, room-code
    lookups, uploaded bytes) and per room / server-wide photo byte caps (48 MiB per room:
    1 MiB per image on average for 12 players x (3 slots + 1 selfie), while the client's JPEGs are
    usually 100-400 KB). Selfies and blur variants count in the upload limits and byte caps
    like photos. A replacement (photo in the same slot with its variants, new selfie) is
    checked by how much it grows memory, so one that is not bigger is never refused by a byte
    cap. The Socket.IO decoder accepts at most 5 binary attachments per packet (a photo and
    its 4 variants) and caps their total size, so a half-sent packet cannot pin much memory.
  - Blur timing lives in the engine too: `blurStepAt` / `blurStepStartsAt`, the step of each
    vote, `nextWakeAt` waking at step boundaries (the no-timer round length is a `Timing`
    knob, `blurNoTimerRoundMs`, so tests can run blurred rounds fast).
  - `image.ts`: uploads (photos and selfies) are checked by their header (PNG / JPEG / WebP),
    not by the declared mime; dimensions above 4096 px per side are refused. Blur variants
    (`inspectVariant`) must also fit their step's width (+ 2 px).
  - `index.ts`: HTTP server, `/photos/:code/:photoId` (game photos, blur variants and selfies), `/api/health`,
    static client in production with SPA fallback.
- `src/client/` — React 19 + Vite + Tailwind v4 + Motion (`motion/react`) +
  canvas-confetti. Mobile first.
  - Photos are resized / re-encoded in the browser (max 1080px, JPEG), which also strips
    EXIF metadata, then sent as binary over the socket, with their blur variants
    (`makeBlurVariants`: 12 / 24 / 48 / 96 px JPEGs; if they cannot be made, or the server
    refuses them, the photo goes alone).
  - Sessions (`{code, playerId, token}`) are kept in `sessionStorage` (so several tabs can
    be several players) and mirrored in `localStorage` (so a phone that killed the tab can
    come back: that rejoin uses `takeover: false`).
  - Strings live in `src/client/i18n/strings/*.ts`, English + French.

## Anonymity rules (enforced in `views.ts`)

- Before a photo is revealed, no view contains its owner.
- A player's view never contains another player's photos in the lobby, and photos in
  inactive slots are never shown to anyone but their owner.
- During voting, a view only contains the viewer's own vote; others appear only as
  "has voted" (owner decoys included).
- `voters` in a `PhotoResult` is null when `anonymousVotes` is on, and public scores
  (`PublicPlayer.score`) stay at 0 until the results.
- Photo ids are random and unrelated to owners; photo URLs are only handed out once
  the photo is shown.
- Blurred rounds: before the last blur step, the voted photo is only referred to by the
  ids of its low-resolution variants (also random and unrelated to the photo id), and only
  the current step's variant (plus the first one, used as the round's photo id) — so no
  client can load the sharp photo, or a sharper step, ahead of time.
- Selfies are the exception, on purpose: they are profile pictures, public to the whole room
  in every phase. Their ids are random and unrelated to game photo ids, and a selfie is never
  played, so they give no game photo away.
