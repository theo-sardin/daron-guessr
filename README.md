# Daron Guessr 👨👩

**Whose daron is this?** A party game for friends. Everyone uploads a photo of their
*daron* and *daronne* (French slang for dad and mom), then the group guesses, photo by
photo, whose parent is whose. Then comes the reveal: every photo, its votes, a drum roll,
confetti, and a final recap with a podium and awards.

Playable on phones and desktops, in French or English.

## How a game goes

1. **Create a room.** Pick a nickname and an avatar, create a room, and share the 4-letter
   code, the invite link or the QR code.
2. **Upload your darons.** Each player adds a photo of their dad and one of their mom. Only you
   see your own photos until the game starts.
3. **Guess.** Photos show up one at a time and everyone votes for whose parent it is. When it's
   your own parent, you vote too, as a bluff, so nobody can tell it's yours. Votes are
   anonymous.
4. **Reveal.** For each photo you see how many votes everyone got, then who the parent really
   belongs to. Players who guessed right get 100 points.
5. **Recap.** A podium, the full ranking, awards (Sherlock, Carbon copy, Master of disguise,
   Doppelgänger, Biggest mix-up…) and a wall of every photo. The host can start a new round.

At least **3 players with photos** are needed to start (players without photos can still
guess). Up to 12 players per room. At any time, players can send floating emoji reactions.

Host settings: seconds per photo (15–60, or no timer) and whether the reveal shows *who*
voted for whom or only the counts.

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

Environment variables: `PORT` (default 3001).

## Privacy

- Photos are resized and re-encoded in the browser before upload, which strips EXIF metadata
  (location, camera, date).
- Photos are only kept in the server's memory, and only for as long as the room exists. Rooms
  are deleted after 30 minutes without any connected player, or 24 hours at most.
- Photo URLs are random and only handed out to players of the room once the game shows them.

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
