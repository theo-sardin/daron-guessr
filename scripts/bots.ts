// Dev helper: fill a room with bot players that upload generated photos and vote randomly.
// Usage: npx tsx scripts/bots.ts <ROOM_CODE> [count=3] [serverUrl=http://localhost:3001]
import { spawnBot, type Bot } from '../e2e/bots';

const [code, count = '3', url = 'http://localhost:3001'] = process.argv.slice(2);
if (!code) {
  console.error('usage: npx tsx scripts/bots.ts <ROOM_CODE> [count] [serverUrl]');
  process.exit(1);
}

const bots: Bot[] = [];
for (let i = 0; i < Number(count); i++) {
  const bot = await spawnBot(url, code.toUpperCase(), i);
  bots.push(bot);
  console.log(`🤖 ${bot.name} joined ${code.toUpperCase()} with 2 photos`);
}
console.log('Bots are playing. Ctrl+C to stop.');
process.on('SIGINT', () => {
  bots.forEach((b) => b.stop());
  process.exit(0);
});
