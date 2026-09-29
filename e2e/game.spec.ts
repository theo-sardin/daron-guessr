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

/**
 * Home -> "Create a room" -> the mandatory game mode step -> the lobby. Checks the step can't be
 * skipped (nothing preselected, confirm disabled), picks `mode`, then checks the photo count jumps
 * to the mode's default before confirming. Returns the room code.
 */
async function createRoom(page: Page, name: string, mode: string, photos: number, shot?: string) {
  await page.goto('/?lang=en');
  await page.getByPlaceholder('Your nickname').fill(name);
  await page.getByRole('button', { name: /Create a room/ }).click();

  // The mode step: no room yet, nothing picked, the confirm button is locked.
  await expect(page.getByRole('heading', { name: 'Pick a game mode' })).toBeVisible();
  const modes = page.getByRole('radiogroup', { name: 'Game mode' });
  const confirm = page.getByRole('button', { name: 'Create the room' });
  await expect(modes.getByRole('radio')).toHaveCount(5);
  await expect(modes.getByRole('radio', { checked: true })).toHaveCount(0);
  await expect(confirm).toBeDisabled();
  await expect(confirm).toHaveAccessibleDescription('Pick a mode first');
  expect(new URL(page.url()).pathname).toBe('/');
  if (shot) await page.screenshot({ path: `${SHOTS}/${shot}-mode-step.png` });

  const card = modes.getByRole('radio', { name: mode, exact: true });
  await card.click();
  await expect(card).toBeChecked();
  await expect(modes.getByRole('radio', { checked: true })).toHaveCount(1);
  const perPlayer = page.getByRole('radiogroup', { name: 'Photos per player' });
  await expect(perPlayer.getByRole('radio', { name: String(photos), exact: true })).toBeChecked();
  await expect(confirm).toBeEnabled();
  if (shot) await page.screenshot({ path: `${SHOTS}/${shot}-mode-picked.png` });

  await confirm.click();
  await page.waitForURL(/\/[A-Z]{4}$/);
  // The lobby opens on the mode picked at creation.
  const lobbyTheme = page.getByRole('radiogroup', { name: 'Theme' });
  await expect(lobbyTheme.getByRole('radio', { name: new RegExp(mode) })).toBeChecked();
  await expect(lobbyTheme.getByRole('radio', { checked: true })).toHaveCount(1);
  return new URL(page.url()).pathname.slice(1);
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

  // Host creates the room, in "Parents" mode (2 photos each).
  const code = await createRoom(host, 'Host Théo', 'Parents', 2, '00');

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

test('the game mode step is mandatory, and Back returns to the form', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?lang=fr');
  const nickname = page.getByPlaceholder('Ton pseudo');
  const create = page.getByRole('button', { name: /Créer un salon/ });
  const modes = page.getByRole('radiogroup', { name: 'Mode de jeu' });
  const confirm = page.getByRole('button', { name: 'Créer le salon' });

  // No name: the step does not open.
  await nickname.fill('');
  await create.click();
  await expect(nickname).toBeFocused();
  await expect(modes).toHaveCount(0);

  // With a name: the step opens with nothing picked and a locked confirm button.
  await nickname.fill('Julie');
  await create.click();
  await expect(modes.getByRole('radio')).toHaveCount(5);
  await expect(modes.getByRole('radio', { checked: true })).toHaveCount(0);
  await expect(confirm).toBeDisabled();
  await expect(confirm).toHaveAccessibleDescription('Choisis d’abord un mode');
  await page.screenshot({ path: `${SHOTS}/09-mode-step-fr.png` });

  // "Retour" goes back to the form, name kept, no room created.
  await page.getByRole('button', { name: 'Retour', exact: true }).click();
  await expect(modes).toHaveCount(0);
  await expect(nickname).toHaveValue('Julie');
  expect(new URL(page.url()).pathname).toBe('/');

  // So does the browser's back button...
  await create.click();
  await modes.getByRole('radio', { name: 'Version mini', exact: true }).click();
  await expect(confirm).toBeEnabled();
  await page.goBack();
  await expect(modes).toHaveCount(0);
  await expect(nickname).toHaveValue('Julie');
  expect(new URL(page.url()).pathname).toBe('/');

  // ...and Escape.
  await create.click();
  await expect(modes).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(modes).toHaveCount(0);
  await expect(create).toBeVisible();

  // A reload on the step lands on the form, and afterwards one Back still closes the step.
  await create.click();
  await expect(modes).toBeVisible();
  await page.reload();
  await expect(nickname).toBeVisible();
  await expect(modes).toHaveCount(0);
  await nickname.fill('Julie');
  await create.click();
  await expect(modes).toBeVisible();
  await page.getByRole('button', { name: 'Retour', exact: true }).click();
  await expect(modes).toHaveCount(0);
  await expect(nickname).toHaveValue('Julie');

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

  // The mode is picked at creation: one photo slot, of the player as a kid.
  const code = await createRoom(host, 'Host Théo', 'Mini me', 1);
  await expect(host.locator('input[type=file]')).toHaveCount(1);

  // Bots read the room's settings, so they upload one 'kid' photo each.
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
