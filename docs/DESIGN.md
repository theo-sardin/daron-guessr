# Daron Guessr — design

"Daron" / "daronne" is French slang for dad / mom. Everyone in a room uploads a photo of
each parent, then the group guesses, photo by photo, whose parent is whose. At the end every
photo is revealed with its vote breakdown, and a recap hands out scores and awards.

## Game flow

1. **Home** — pick a nickname and an avatar emoji, then *Create a room* or *Join* with a
   4-letter code (links look like `https://host/ABCD`, which pre-fills the code).
2. **Lobby** — players join with the code / link / QR code. Each player fills two photo
   slots (default labels: slot 0 = daron, slot 1 = daronne; the label can be flipped).
   Only you ever see your own photos in the lobby. The host picks the settings
   (seconds per photo, anonymous votes on/off) and starts once at least
   `MIN_PHOTO_OWNERS` (3) players have at least one photo. Players without photos can
   still play: they just guess. The host can kick players in the lobby.
3. **Voting** — the server shuffles every photo (avoiding two photos of the same owner
   back to back when possible). One photo at a time, everyone votes for whose parent it is.
   Candidates are the players that have photos in the game, minus the voter.
   - The **owner votes too**, as a decoy ("vote for someone else to throw them off"), so
     the "who has voted" indicators never give the owner away. Decoy votes never count.
   - Votes can be changed until the round closes.
   - The round closes when the timer runs out, or `ALL_VOTED_GRACE_MS` after every
     connected player has voted, or when the host skips. With no timer (`voteSeconds = 0`)
     only the last two apply. If no one is connected the round waits.
   - The first round starts `GAME_INTRO_MS` after the game starts (3-2-1 intro), the next
     ones `ROUND_GAP_MS` after the previous one closed.
4. **Reveal** — same order as voting. For each photo: the photo, animated vote bars
   (counts only, or who voted for whom when anonymous votes are off), a drum roll, then
   the owner is revealed with confetti and a caption that fits the result (everybody got
   it / nobody did / everybody picked the same wrong person…). Each player privately sees
   whether they got it right. The host moves to the next photo. Scores in the player list
   only include fully revealed photos — and with anonymous votes on, they stay at 0 for the
   whole reveal (each player only sees their own points go up), since score changes would
   tell everybody who guessed each photo right. Final scores appear in the results.
5. **Results** — podium + full ranking, awards (Sherlock, Needs glasses, Carbon copy,
   Master of disguise, Doppelgänger, Most confusing photo, Biggest mix-up), and a wall of
   every photo with its owner and how many people got it. The host can start a new round
   (back to the lobby, same players, photos/votes/scores cleared).

Anyone can send floating emoji reactions at any time.

### Scoring

`POINTS_PER_CORRECT` (100) per correct guess. Decoy votes score nothing.

### Awards (computed server side, only included when meaningful)

- **sherlock** — most correct guesses (needs >= 1 correct). Ties: all tied players.
- **needsGlasses** — fewest correct guesses, among players that cast >= 1 real vote; only
  if it is a different set of players than sherlock.
- **carbonCopy** — player whose photos got the highest share of correct votes (value = %,
  needs >= 1 vote on their photos, value > 0).
- **masterOfDisguise** — lowest share of correct votes on their photos; only if different
  from carbonCopy.
- **doppelganger** — player that received the most wrong votes (people thought other
  people's parents were theirs), needs >= 2.
- **mostConfusing** — photo whose votes were spread over the most distinct candidates
  (tie-break: fewest correct votes), needs >= 3 distinct candidates.
- **biggestMixup** — (photo, wrong candidate) pair with the most votes, needs >= 2 votes
  and more votes than the correct owner received on that photo.

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
    lookups, uploaded bytes) and per room / server-wide photo byte caps.
  - `image.ts`: uploads are checked by their header (PNG / JPEG / WebP), not by the declared
    mime; dimensions above 4096 px per side are refused.
  - `index.ts`: HTTP server, `/photos/:code/:photoId`, `/api/health`, static client in
    production with SPA fallback.
- `src/client/` — React 19 + Vite + Tailwind v4 + Motion (`motion/react`) +
  canvas-confetti. Mobile first.
  - Photos are resized / re-encoded in the browser (max 1280px, JPEG), which also strips
    EXIF metadata, then sent as binary over the socket.
  - Sessions (`{code, playerId, token}`) are kept in `sessionStorage` (so several tabs can
    be several players) and mirrored in `localStorage` (so a phone that killed the tab can
    come back: that rejoin uses `takeover: false`).
  - Strings live in `src/client/i18n/strings/*.ts`, English + French.

## Anonymity rules (enforced in `views.ts`)

- Before a photo is revealed, no view contains its owner.
- A player's view never contains another player's photos in the lobby.
- During voting, a view only contains the viewer's own vote; others appear only as
  "has voted" (owner decoys included).
- `voters` in a `PhotoResult` is null when `anonymousVotes` is on, and public scores
  (`PublicPlayer.score`) stay at 0 until the results.
- Photo ids are random and unrelated to owners; photo URLs are only handed out once
  the photo is shown.
