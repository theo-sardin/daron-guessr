import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { spawnBot, type Bot } from './bots';
import { makeFacePng } from './png';

/**
 * Full game with two real browsers (host + a friend joining by link) and two bots:
 * create -> join -> upload -> vote every photo -> reveal every photo -> results -> play again.
 * Screenshots of every phase land in e2e/screenshots/ for a visual check.
 */
const SHOTS = 'e2e/screenshots';
mkdirSync(SHOTS, { recursive: true });

async function uploadBothPhotos(page: Page, seed: number) {
  const inputs = page.locator('input[type=file]');
  const uploaded = page.locator('img[src^="/photos/"]');
  await expect(inputs).toHaveCount(2);
  await inputs.nth(0).setInputFiles({ name: 'dad.png', mimeType: 'image/png', buffer: makeFacePng(seed) });
  await expect(uploaded).toHaveCount(1, { timeout: 15_000 });
  await inputs.nth(1).setInputFiles({ name: 'mom.png', mimeType: 'image/png', buffer: makeFacePng(seed + 1) });
  await expect(uploaded).toHaveCount(2, { timeout: 15_000 });
}

async function voteWhileVoting(page: Page, stop: () => boolean) {
  let voted = 0;
  while (!stop()) {
    const buttons = page.getByRole('button', { name: /^Vote for / });
    const n = await buttons.count();
    const enabled = n > 0 && (await buttons.first().isEnabled().catch(() => false));
    if (enabled && !(await page.getByText(/Locked in|Nice bluff/).first().isVisible().catch(() => false))) {
      await buttons
        .nth(voted % n)
        .click({ timeout: 2_000 })
        .then(() => voted++)
        .catch(() => undefined);
    }
    await page.waitForTimeout(400);
  }
  return voted;
}

test('a full game with two browsers and two bots', async ({ browser, baseURL }) => {
  const host = await (await browser.newContext()).newPage();
  const friend = await (await browser.newContext()).newPage();
  const errors: string[] = [];
  for (const p of [host, friend]) p.on('pageerror', (e) => errors.push(e.message));

  // Host creates the room.
  await host.goto('/?lang=en');
  await host.getByPlaceholder('Your nickname').fill('Host Théo');
  await host.getByRole('button', { name: /Create a room/ }).click();
  await host.waitForURL(/\/[A-Z]{4}$/);
  const code = new URL(host.url()).pathname.slice(1);

  // A friend opens the invite link and joins.
  await friend.goto(`/${code}?lang=en`);
  await friend.getByPlaceholder('Your nickname').fill('Julie');
  await friend.getByRole('button', { name: /Join the room/ }).click();
  await expect(friend.locator('input[type=file]').first()).toBeAttached();

  const bots: Bot[] = [];
  for (let i = 0; i < 2; i++) bots.push(await spawnBot(baseURL!, code, i));

  await uploadBothPhotos(host, 11);
  await uploadBothPhotos(friend, 21);
  await expect(host.getByText('Julie').first()).toBeVisible();
  await host.screenshot({ path: `${SHOTS}/01-lobby-host.png` });
  await friend.screenshot({ path: `${SHOTS}/02-lobby-friend.png` });

  // Host starts.
  await host.getByRole('button', { name: /Start the game/ }).click();
  await expect(host.getByRole('button', { name: /^Vote for / }).first()).toBeVisible({ timeout: 10_000 });

  // Both humans vote on every photo until the reveal starts.
  let revealing = false;
  const watcher = (async () => {
    await expect(host.getByRole('button', { name: /Next photo|See the results/ })).toBeVisible({ timeout: 150_000 });
    revealing = true;
  })();
  await host.waitForTimeout(4_000);
  await host.screenshot({ path: `${SHOTS}/03-voting-host.png` });
  await friend.screenshot({ path: `${SHOTS}/04-voting-friend.png` });
  const [hostVotes, friendVotes] = await Promise.all([voteWhileVoting(host, () => revealing), voteWhileVoting(friend, () => revealing), watcher]);
  expect(hostVotes).toBeGreaterThan(0);
  expect(friendVotes).toBeGreaterThan(0);

  // Reveal all 8 photos.
  const next = host.getByRole('button', { name: /Next photo|See the results/ });
  for (let i = 0; i < 8; i++) {
    await expect(next).toBeEnabled({ timeout: 20_000 });
    if (i === 0) {
      await host.screenshot({ path: `${SHOTS}/05-reveal-host.png` });
      await friend.screenshot({ path: `${SHOTS}/06-reveal-friend.png` });
    }
    const label = (await next.textContent()) ?? '';
    await next.click();
    if (/results/i.test(label)) break;
    await expect(next).toBeDisabled({ timeout: 5_000 });
  }

  // Results.
  const playAgain = host.getByRole('button', { name: /Play again/ });
  await expect(playAgain).toBeVisible({ timeout: 15_000 });
  await host.waitForTimeout(5_000);
  await host.screenshot({ path: `${SHOTS}/07-results-host.png`, fullPage: true });
  await friend.screenshot({ path: `${SHOTS}/08-results-friend.png`, fullPage: true });

  // Back to the lobby with the same players, photos cleared.
  await playAgain.click();
  await expect(host.getByRole('button', { name: /Start the game/ })).toBeVisible({ timeout: 10_000 });
  await expect(host.locator('img[src^="/photos/"]')).toHaveCount(0);

  bots.forEach((b) => b.stop());
  expect(errors).toEqual([]);
});

test('joining an unknown room shows a friendly error', async ({ page }) => {
  await page.goto('/ZZZZ?lang=en');
  await expect(page.getByRole('button', { name: /home/i }).first()).toBeVisible({ timeout: 10_000 });
});

test('a "Mini me" game: one childhood photo each', async ({ browser, baseURL }) => {
  const host = await (await browser.newContext()).newPage();
  const errors: string[] = [];
  host.on('pageerror', (e) => errors.push(e.message));

  await host.goto('/?lang=en');
  await host.getByPlaceholder('Your nickname').fill('Host Théo');
  await host.getByRole('button', { name: /Create a room/ }).click();
  await host.waitForURL(/\/[A-Z]{4}$/);
  const code = new URL(host.url()).pathname.slice(1);

  // The host switches the theme: one photo slot, of the player as a kid.
  await host.getByRole('radio', { name: /Mini me/ }).click();
  await expect(host.locator('input[type=file]')).toHaveCount(1);

  // Bots join after the switch, so they upload one 'kid' photo each.
  const bots: Bot[] = [];
  for (let i = 0; i < 3; i++) bots.push(await spawnBot(baseURL!, code, i));
  await host.locator('input[type=file]').first().setInputFiles({ name: 'me.png', mimeType: 'image/png', buffer: makeFacePng(42) });
  await expect(host.locator('img[src^="/photos/"]')).toHaveCount(1, { timeout: 15_000 });
  await host.screenshot({ path: `${SHOTS}/10-minime-lobby.png`, fullPage: true });

  await host.getByRole('button', { name: /Start the game/ }).click();
  await expect(host.getByText('Who is this as a kid?').first()).toBeVisible({ timeout: 10_000 });

  let revealing = false;
  const watcher = (async () => {
    await expect(host.getByRole('button', { name: /Next photo|See the results/ })).toBeVisible({ timeout: 120_000 });
    revealing = true;
  })();
  await host.waitForTimeout(4_000);
  await host.screenshot({ path: `${SHOTS}/11-minime-voting.png` });
  await Promise.all([voteWhileVoting(host, () => revealing), watcher]);

  const next = host.getByRole('button', { name: /Next photo|See the results/ });
  for (let i = 0; i < 4; i++) {
    await expect(next).toBeEnabled({ timeout: 20_000 });
    if (i === 0) await host.screenshot({ path: `${SHOTS}/12-minime-reveal.png` });
    const label = (await next.textContent()) ?? '';
    await next.click();
    if (/results/i.test(label)) break;
    await expect(next).toBeDisabled({ timeout: 5_000 });
  }
  await expect(host.getByRole('button', { name: /Play again/ })).toBeVisible({ timeout: 15_000 });
  await host.waitForTimeout(5_000);
  await host.screenshot({ path: `${SHOTS}/13-minime-results.png`, fullPage: true });

  bots.forEach((b) => b.stop());
  expect(errors).toEqual([]);
});
