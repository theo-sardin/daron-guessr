# Daron Guessr 👨👩

**Whose daron is this?** A party game for friends. Everyone uploads a photo of their
*daron* and *daronne* (French slang for dad and mom), then the group guesses, photo by
photo, whose parent is whose. Then comes the reveal: every photo, its votes, a drum roll,
confetti, and a final recap with a podium and awards.

Not only parents: the host picks a theme for the room.

| Theme | Everyone uploads… | Photos each (default) |
| --- | --- | --- |
| 👨👩 **Parents** (the original) | their dad and their mom | 2 |
| 👨‍👩‍👧 **Friends & family** | photos of their siblings, parents, grandparents, friends, partner or pet | 2 |
| 🧒 **Mini me** | a photo of themselves as a kid: who was that cutie? | 1 |
| 🎲 **Who picked it?** | any picture at all (a meme, a place, a dish…): guess who chose it | 1 |
| 📱 **Camera-roll roulette** | the LAST photo in their camera roll, no cheating | 1 |
| 💘 **Teen crush** | the celebrity they had a crush on as a teen | 1 |
| 🕵️ **Who's that?** | a photo of themselves, any age, shown blurry at first (blur on by default) | 1 |
| ✋ **Body parts** | close-ups of a hand, a foot, an ear, an eye, a nose, a smile, a knee, an elbow, a belly button or hair (they pick which, keep it SFW) | 2 |
| 🌀 **Anything goes** | any of the above, all mixed up | 2 |

The host can change the number of photos per player (1 to 3) for any theme, and turn on
**blur** in any mode: each photo starts heavily blurred and sharpens step by step during the
round, and a right guess made early earns a **speed bonus** (up to +100 on top of the 100
points).

Everyone can also add an optional **selfie**: it becomes their avatar, and it is shown next
to the photos while voting and at the reveal, to compare faces ("she has her dad's nose!").

Playable on phones and desktops, in French or English.

## How a game goes

1. **Create a room.** Pick a nickname and an avatar, create a room, and share the 4-letter
   code, the invite link or the QR code.
2. **Pick a theme and upload.** The host picks the theme and the number of photos per player
   (1 to 3). Each player adds their photos and says what each one shows (your dad, your
   sister, you as a kid, your pick, your teen crush, your ear…). Only you see your own photos
   until the game starts.
3. **Guess.** Photos show up one at a time and everyone votes for whose photo it is: "Whose
   daronne is this?", "Whose sister?", "Who is this as a kid?", "Who picked this?", "Whose
   teen crush?", "Whose ear?". When it's your own photo, you vote too, as a bluff, so nobody
   can tell it's yours. Votes are anonymous. In a blurry game, the photo sharpens as the
   round goes: guess early (and right) for bonus points.
4. **Reveal.** For each photo you see how many votes everyone got, then whose it really is.
   Players who guessed right get 100 points (plus their speed bonus in a blurry game).
5. **Recap.** A podium, the full ranking, awards (Sherlock, Carbon copy, Master of disguise,
   Doppelgänger, Biggest mix-up, Eagle eye for the fastest guesser of a blurry game…) and a
   wall of every photo. The host can start a new round,
   with the same players and settings.

At least **3 players with photos** are needed to start (players without photos can still
guess). Up to 12 players per room. At any time, players can send floating emoji reactions.

Host settings: the theme, photos per player (1–3), seconds per photo (15–60, or no timer),
blur on / off, and whether the reveal shows *who* voted for whom or only the counts.

## Running it locally

Requires Node.js 20+.

```bash
npm install
npm run dev
```

This starts the game server on `:3001` and the Vite dev server on
[http://localhost:5173](http://localhost:5173) (which proxies to the game server). To play
alone for testing, open several tabs: each tab is a separate player. To test from phones on
the same Wi-Fi, open `http://<your-computer-ip>:5173`.

Dev-only screen gallery with fake data: [http://localhost:5173/__preview](http://localhost:5173/__preview).

### Production build

```bash
npm run build   # client -> dist/client, server -> dist/server
npm start       # serves everything on $PORT (default 3001)
```

## Deploying

It's a single Node process with WebSockets and in-memory rooms (no database), so it needs a host
that runs a long-lived server. Serverless platforms such as Vercel and Netlify won't work.
Run **one instance only**: rooms are not shared between instances, and they are lost when the
server restarts.

- **Render**: *New → Blueprint*, pick this repo (uses `render.yaml`). The free plan works; it sleeps when idle.
- **Railway / Fly.io / any Docker host**: use the included `Dockerfile` (listens on `$PORT`, default 3000).
  ```bash
  docker build -t daron-guessr .
  docker run -p 3000:3000 daron-guessr
  ```
- **A VPS**: `npm ci && npm run build && PORT=80 npm start` (behind a reverse proxy with WebSocket
  support if you add HTTPS, e.g. Caddy).

Environment variables:
- `PORT` (default 3001).
- `TRUST_PROXY=1` when the server runs behind exactly one reverse proxy that appends the client IP
  to `X-Forwarded-For` (Render, Caddy, nginx…; already set in `render.yaml`). Per-IP limits then
  use the last entry of that header. Leave it unset when clients connect directly, or every
  client could pick its own IP.
- `MAX_PHOTO_MEMORY_MB` (default 256): memory allowed for the photos of all rooms together; uploads
  past it are refused. Keep it well under the machine's RAM.

## Privacy

- Photos are resized and re-encoded in the browser before upload, which strips EXIF metadata
  (location, camera, date).
- Photos are only kept in the server's memory, and only for as long as the room exists. Rooms
  are deleted after 30 minutes without any connected player, or 24 hours at most.
- Photo URLs are random and only handed out to players of the room once the game shows them.
  In a blurry game, only small low-resolution copies are handed out until the photo is meant
  to be sharp, so nobody can peek at the full photo early.
- Selfies are visible to the players of the room only, and are deleted when their owner leaves
  the room (and with the room).

## Tech

- **Server**: Node, Express 5, Socket.IO 4, zod. The game engine (`src/server/game.ts`) is pure and
  unit tested. `src/server/views.ts` builds a tailored snapshot for each player, which keeps
  owners and votes secret until they are revealed.
- **Client**: React 19, Vite, Tailwind CSS v4, Motion, canvas-confetti, synthesized Web Audio
  sound effects, French and English strings.
- **Shared contract**: `src/shared/protocol.ts`. Design notes: [`docs/DESIGN.md`](docs/DESIGN.md).

```bash
npm test          # server unit + integration tests (vitest)
npm run typecheck
npm run e2e       # full game with several browsers (Playwright)
```
