import { expect, test, type Page } from '@playwright/test';

/**
 * Regressioni corrette nella revisione v1.4.9:
 *  - le regole "Custom" valgono anche quando esiste una squadra salvata;
 *  - Esc apre davvero la pausa;
 *  - con "Spiegazione dopo l'errore" compare un solo banner, non due sovrapposti;
 *  - in verticale il riscontro della prova è visibile nell'interfaccia HTML.
 */

const UA_PHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

type T = { text: string; x: number; y: number; font: string; depth: number };

async function scena(page: Page): Promise<string | null> {
  return page.evaluate(() => (window as unknown as { __GIOCO__?: { scena?: string } }).__GIOCO__?.scena ?? null);
}

async function testi(page: Page): Promise<T[]> {
  return page.evaluate(() => {
    const s = (window as unknown as { __GIOCO__?: { scenaAttiva?: { children: { list: unknown[] } } } }).__GIOCO__
      ?.scenaAttiva;
    const out: T[] = [];
    const walk = (o: unknown): void => {
      const n = o as {
        type?: string; text?: string; depth?: number; list?: unknown[];
        style?: { fontFamily?: string };
        getWorldTransformMatrix?: () => { tx: number; ty: number };
      };
      if (!n) return;
      if (n.type === 'Text' && n.text) {
        const m = n.getWorldTransformMatrix?.();
        out.push({ text: String(n.text).trim(), x: m?.tx ?? 0, y: m?.ty ?? 0, font: n.style?.fontFamily ?? '', depth: n.depth ?? 0 });
      }
      n.list?.forEach(walk);
    };
    s?.children.list.forEach(walk);
    return out;
  });
}

async function tocco(page: Page, x: number, y: number, attesa = 500): Promise<void> {
  const box = await page.locator('#game canvas').boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.click(box!.x + (box!.width * x) / 1024, box!.y + (box!.height * y) / 576);
  await page.waitForTimeout(attesa);
}

async function toccaTesto(page: Page, label: string): Promise<void> {
  const t = (await testi(page)).find((o) => o.text === label);
  expect(t, `testo "${label}" visibile`).toBeTruthy();
  await tocco(page, t!.x, t!.y, 700);
}

async function avviaMatematica(page: Page, settings: object, team?: object): Promise<void> {
  await page.addInitScript(
    ([s, t]) => {
      localStorage.setItem('sic.settings', JSON.stringify(s));
      if (t) localStorage.setItem('sic.team_setup', JSON.stringify(t));
    },
    [settings, team ?? null] as const
  );
  await page.goto('/');
  await expect.poll(() => scena(page)).toBe('Title');
  await toccaTesto(page, 'Gioca');
  await expect.poll(() => scena(page)).toBe('Subject');
  await toccaTesto(page, 'Matematica');
  await expect.poll(() => scena(page)).toBe('Game');
  await page.waitForTimeout(1500);
}

const BASE = { profileId: null, overrides: {}, mode: 'quiz', graphics: '2d', schoolYear: 'P3', randomQuestions: true };

test('le regole Custom valgono anche con una squadra salvata', async ({ page }) => {
  const team = {
    numPlayers: 1,
    players: [{ playerIndex: 1, token: { id: 'volpe', name: 'Volpina Sprint', icon: '🦊', color: '#ff6b35', bg: '#fff0eb', desc: '' }, profileId: null, overrides: {} }]
  };
  await avviaMatematica(page, { ...BASE, overrides: { dyslexiaFont: true } }, team);
  const prompt = (await testi(page)).find((t) => Math.abs(t.y - 66) < 20 && t.depth < 300);
  expect(prompt?.font).toContain('Comic Sans');
});

test('Esc apre la pausa e la richiude', async ({ page }) => {
  await avviaMatematica(page, BASE);
  await page.keyboard.press('Escape');
  await expect.poll(() => scena(page)).toBe('Pause');
  await page.keyboard.press('Escape');
  await expect.poll(() => scena(page)).toBe('Game');
});

test('con la spiegazione dopo l\'errore compare un solo banner', async ({ page }) => {
  await avviaMatematica(page, { ...BASE, profileId: 'dislessia' });
  const rounds = await page.evaluate(() => (window as unknown as { __GIOCO__: { rounds: Array<{ type: string; options?: Array<{ label: string; correct: boolean }>; explanation?: string }> } }).__GIOCO__.rounds);
  test.skip(!rounds[0].options || !rounds[0].explanation, 'la prima prova non è a scelta con spiegazione');
  const sbagliata = rounds[0].options!.find((o) => !o.correct)!.label;
  const t = (await testi(page)).find((o) => o.text === sbagliata && o.y > 250);
  await tocco(page, t!.x, t!.y, 350);
  const banner = (await testi(page)).filter((o) => o.depth >= 300).map((o) => o.text);
  expect(banner).not.toContain('Riprova');
  expect(banner.some((b) => b.startsWith('Quasi'))).toBe(true);
});

test('in verticale il riscontro della prova si vede', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, userAgent: UA_PHONE, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await page.addInitScript((s) => localStorage.setItem('sic.settings', JSON.stringify(s)), BASE);
  await page.goto('/');
  await expect.poll(() => scena(page)).toBe('Title');
  await page.locator('#mobile-deck button', { hasText: /^Gioca$/ }).click();
  await expect.poll(() => scena(page)).toBe('Subject');
  await page.locator('#mobile-deck button', { hasText: 'Matematica' }).click();
  await expect.poll(() => scena(page)).toBe('Game');
  await page.waitForTimeout(1800);
  const rounds = await page.evaluate(() => (window as unknown as { __GIOCO__: { rounds: Array<{ options?: Array<{ label: string; correct: boolean }> }> } }).__GIOCO__.rounds);
  test.skip(!rounds[0].options, 'la prima prova non è a scelta');
  const sbagliata = rounds[0].options!.find((o) => !o.correct)!.label;
  await page.locator('#mobile-deck .m-btn-answer', { hasText: sbagliata }).first().click();
  await expect(page.locator('#mobile-deck .m-feedback-box')).toBeVisible();
  await ctx.close();
});

test('in verticale un tocco su un bottone HTML non attiva il bottone nascosto sotto', async ({ browser }) => {
  // iPhone SE + testo grande: "Gioca" cade sopra la pillola "Classe" del canvas nascosto.
  const ctx = await browser.newContext({ viewport: { width: 320, height: 568 }, userAgent: UA_PHONE, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await page.addInitScript(
    (s) => localStorage.setItem('sic.settings', JSON.stringify(s)),
    { ...BASE, overrides: { highContrast: true, largerText: true, largerTargets: true, dyslexiaFont: true } }
  );
  await page.goto('/');
  await expect.poll(() => scena(page)).toBe('Title');
  await page.waitForTimeout(600);
  await page.locator('#mobile-deck button', { hasText: /^Gioca$/ }).click();
  await expect.poll(() => scena(page)).toBe('Subject');
  await page.waitForTimeout(600);
  expect(await scena(page)).toBe('Subject');
  await ctx.close();
});

test('in verticale si possono scegliere tutti i profili BES', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, userAgent: UA_PHONE, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await page.addInitScript((s) => localStorage.setItem('sic.settings', JSON.stringify(s)), BASE);
  await page.goto('/');
  await expect.poll(() => scena(page)).toBe('Title');
  await page.locator('#mobile-deck button', { hasText: 'Impostazioni' }).first().click();
  await expect.poll(() => scena(page)).toBe('Settings');
  await page.locator('#mobile-deck button', { hasText: 'Bisogni Educativi' }).click();
  for (const nome of ['ADHD', 'Autismo', 'Dislessia', 'Discalculia', 'Disgrafia', 'Disprassia', 'Sordità', 'Disabilità intellettiva', 'DSA / Ansia']) {
    await expect(page.locator('#mobile-deck button', { hasText: nome }).first(), nome).toBeVisible();
  }
  await page.locator('#mobile-deck button', { hasText: 'Disabilità intellettiva' }).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('sic.settings') || '{}').profileId)).toBe('disabilita-intellettiva');
  await ctx.close();
});
