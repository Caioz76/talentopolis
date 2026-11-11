import { expect, test, type Page } from '@playwright/test';

/**
 * Modalità Runner: è un side-scroller. Pico corre di profilo, il mondo scorre,
 * la domanda arriva come un **cancello** che frena davanti a lui. Questi test
 * verificano fatti osservabili, non promesse:
 *  - la modalità si sceglie dalle Impostazioni e resta salvata (anche cambiando
 *    profilo, che è il punto in cui si perdeva);
 *  - in partita il cancello arriva da destra, la pista scorre e poi si ferma;
 *  - i cartelli sostituiscono i bottoni e si toccano solo all'arrivo;
 *  - toccare il cartello giusto fa saltare Pico e porta alla prova dopo;
 *  - con "meno opzioni" i cartelli sono due;
 *  - dopo 3 errori la prova si sblocca lo stesso (mai bloccarsi).
 *
 * La modalità Quiz resta coperta da `tappa.spec.ts`, che gioca una tappa intera.
 */

interface Testo {
  text: string;
  x: number;
  y: number;
}

interface Pico {
  texture: string | null;
  x: number | null;
  y: number | null;
}

interface Mondo {
  segni: number;
  bottoni: number;
  pico: Pico;
  pista: number;
  /** Centro del cancello, in coordinate di schermo. `null` se non c'è. */
  cancello: number | null;
}

async function scena(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const g = (window as unknown as { __GIOCO__?: { scena?: string } }).__GIOCO__;
    return g?.scena ?? null;
  });
}

/** Testi della scena attiva, con coordinate di mondo (dentro i container). */
async function testi(page: Page): Promise<Testo[]> {
  return page.evaluate(() => {
    const g = (window as unknown as {
      __GIOCO__?: { scenaAttiva?: { children: { list: unknown[] } } | null };
    }).__GIOCO__;
    const out: Testo[] = [];
    const walk = (o: unknown): void => {
      const n = o as {
        type?: string;
        text?: string;
        x?: number;
        y?: number;
        list?: unknown[];
        getWorldTransformMatrix?: () => { tx: number; ty: number };
      };
      if (!n) return;
      if (n.type === 'Text' && n.text) {
        const m = n.getWorldTransformMatrix?.();
        out.push({
          text: String(n.text).trim(),
          x: m ? m.tx : (n.x ?? 0),
          y: m ? m.ty : (n.y ?? 0)
        });
      }
      if (n.list) n.list.forEach(walk);
    };
    g?.scenaAttiva?.children.list.forEach(walk);
    return out;
  });
}

/** Stato osservabile del mondo: cancello, cartelli, bottoni, Pico, scorrimento. */
async function mondo(page: Page): Promise<Mondo> {
  return page.evaluate(() => {
    const g = (window as unknown as {
      __GIOCO__?: { scenaAttiva?: { children: { list: unknown[] } } | null };
    }).__GIOCO__;
    const out: Mondo = {
      segni: 0,
      bottoni: 0,
      pico: { texture: null, x: null, y: null },
      pista: 0,
      cancello: null
    };
    const walk = (o: unknown): void => {
      const n = o as {
        type?: string;
        name?: string;
        texture?: { key?: string };
        x?: number;
        y?: number;
        tilePositionX?: number;
        list?: unknown[];
      };
      if (!n) return;
      const key = n.texture?.key ?? '';
      if (n.type === 'Container' && n.name === 'segno') out.segni++;
      if (n.type === 'Container' && n.name === 'cancello') out.cancello = n.x ?? null;
      if (n.type === 'Sprite' && key.startsWith('btn-')) out.bottoni++;
      if (n.type === 'Image' && n.name === 'pico') {
        out.pico = { texture: key, x: n.x ?? null, y: n.y ?? null };
      }
      if (n.type === 'TileSprite' && n.name === 'pista') out.pista = n.tilePositionX ?? 0;
      if (n.list) n.list.forEach(walk);
    };
    g?.scenaAttiva?.children.list.forEach(walk);
    return out;
  });
}

/** Texture del bottone che contiene l'etichetta (verde = scelto). */
async function evidenza(page: Page, label: string): Promise<string | null> {
  return page.evaluate((testo) => {
    const g = (window as unknown as {
      __GIOCO__?: { scenaAttiva?: { children: { list: unknown[] } } | null };
    }).__GIOCO__;
    for (const o of g?.scenaAttiva?.children.list ?? []) {
      const c = o as {
        type?: string;
        list?: Array<{ type?: string; text?: string; texture?: { key?: string } }>;
      };
      if (c.type !== 'Container' || !c.list) continue;
      const has = c.list.some((n) => n.type === 'Text' && String(n.text).trim() === testo);
      if (!has) continue;
      const sprite = c.list.find((n) => n.type === 'Sprite');
      return sprite?.texture?.key ?? null;
    }
    return null;
  }, label);
}

async function tocco(page: Page, x: number, y: number, attesa = 650): Promise<void> {
  const box = await page.locator('#game canvas').boundingBox();
  expect(box, 'il canvas deve essere visibile').not.toBeNull();
  await page.mouse.click(box!.x + (box!.width * x) / 1024, box!.y + (box!.height * y) / 576);
  await page.waitForTimeout(attesa);
}

async function attendi(page: Page, pred: () => Promise<boolean>, ms = 9000): Promise<boolean> {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (await pred()) return true;
    await page.waitForTimeout(150);
  }
  return false;
}

/** Il cancello ha finito di avvicinarsi: non si muove più (e nemmeno la pista). */
async function attendiFermata(page: Page): Promise<void> {
  const ok = await attendi(page, async () => {
    const a = await mondo(page);
    if (a.cancello === null) return false;
    await page.waitForTimeout(220);
    const b = await mondo(page);
    return b.cancello !== null && Math.abs(b.cancello - a.cancello) < 0.5;
  }, 9000);
  expect(ok, 'il cancello deve arrivare e fermarsi davanti a Pico').toBe(true);
}

/** Dal titolo alla prima prova di Matematica. */
async function avviaMatematica(page: Page): Promise<void> {
  await page.goto('/');
  await expect.poll(() => scena(page)).toBe('Title');
  // In verticale il canvas non riceve i tocchi (li prende l'interfaccia HTML
  // `#mobile-deck`): si usano i suoi bottoni, come farebbe un bambino.
  const verticale = await page.evaluate(() => document.body.classList.contains('verticale'));
  if (verticale) {
    await page.locator('#mobile-deck button', { hasText: /^Gioca$/ }).click();
    await expect.poll(() => scena(page)).toBe('Subject');
    await page.locator('#mobile-deck button', { hasText: 'Matematica' }).click();
    await expect.poll(() => scena(page)).toBe('Game');
    return;
  }
  await tocco(page, 640, 368); // Gioca
  await expect.poll(() => scena(page)).toBe('Subject');
  await tocco(page, 322, 248, 120); // Matematica (senza perdere l'avvicinamento)
  await expect.poll(() => scena(page)).toBe('Game');
}

/** Le prove della partita attiva di Matematica, lette da window.__GIOCO__.rounds (o fallback al pack). */
async function prove(page: Page): Promise<
  Array<{
    prompt: string;
    type: string;
    options?: Array<{ label: string; correct: boolean }>;
  }>
> {
  return page.evaluate(async () => {
    const g = (window as unknown as {
      __GIOCO__?: {
        rounds?: Array<{ prompt: string; type: string; options?: Array<{ label: string; correct: boolean }> }>;
      };
    }).__GIOCO__;
    if (g?.rounds && g.rounds.length > 0) return g.rounds;
    const percorso = '/src/content/packs.ts';
    const m = (await import(/* @vite-ignore */ percorso)) as {
      allPacks: () => Array<{
        subject: string;
        levels: Array<{ rounds: Array<{ prompt: string; type: string; options?: Array<{ label: string; correct: boolean }> }> }>;
      }>;
    };
    const pack = m.allPacks().find((p) => p.subject === 'matematica')!;
    return pack.levels[0].rounds;
  });
}

async function impostaModalita(page: Page, mode: 'quiz' | 'runner', overrides = {}): Promise<void> {
  await page.addInitScript(
    ([m, o]) => {
      localStorage.setItem('sic.settings', JSON.stringify({ profileId: null, overrides: o, mode: m }));
    },
    [mode, overrides] as const
  );
}

interface StatoTreD {
  attivo: boolean;
  pronta: boolean;
  cancello: number | null;
  arrivato: boolean;
  velocita: number;
  pannelli: Array<{ x: number; y: number }>;
  etichette: string[];
  errori: number;
  corsia: number;
  cuori: number;
  stelle: number;
  punteggio: number;
  combo: number;
  turbo: number;
  boost: boolean;
  ostacoli: number;
  raccoglibili: number;
  inSalto: boolean;
  inScivolata: boolean;
}

async function treD(page: Page): Promise<StatoTreD | null> {
  return page.evaluate(() => {
    const g = (window as unknown as { __GIOCO__?: { treD?: StatoTreD } }).__GIOCO__;
    return g?.treD ?? null;
  });
}

/** Impostazioni con modalità e grafica insieme (le due scelte sono separate). */
async function impostaGrafica(
  page: Page,
  mode: 'quiz' | 'runner',
  graphics: '2d' | '3d',
  overrides = {}
): Promise<void> {
  await page.addInitScript(
    ([m, g, o]) => {
      localStorage.setItem(
        'sic.settings',
        JSON.stringify({ profileId: null, overrides: o, mode: m, graphics: g })
      );
    },
    [mode, graphics, overrides] as const
  );
}

test.describe('Modalità Runner', () => {
  test('si sceglie dalle Impostazioni e resta salvata anche cambiando profilo', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem('sic.settings', JSON.stringify({ profileId: null, overrides: {}, mode: 'runner' }));
    });
    await page.goto('/');
    await expect.poll(() => scena(page)).toBe('Title');

    // La modalità runner salvata in localStorage viene preservata da loadSettings()
    let s = JSON.parse((await page.evaluate(() => localStorage.getItem('sic.settings')))!);
    expect(s.mode).toBe('runner');

    // Tocco Impostazioni
    await tocco(page, 384, 368);
    await expect.poll(() => scena(page)).toBe('Settings');

    // Cambiare profilo non perde la modalità runner
    await tocco(page, 512, 145); // BES
    await page.waitForTimeout(300);
    s = JSON.parse((await page.evaluate(() => localStorage.getItem('sic.settings')))!);
    expect(s.mode).toBe('runner');
  });

  test('la grafica 2D/3D si sceglie a parte dalle impostazioni di gioco', async ({ page }) => {
    await page.addInitScript(() => localStorage.clear());
    await page.goto('/');
    await expect.poll(() => scena(page)).toBe('Title');

    await tocco(page, 384, 368); // Impostazioni
    await expect.poll(() => scena(page)).toBe('Settings');

    // Apre Ramo Gioco & Grafica
    await tocco(page, 512, 345);
    await page.waitForTimeout(300);

    // Scelgo 3D
    await tocco(page, 664, 175);
    let s = JSON.parse((await page.evaluate(() => localStorage.getItem('sic.settings')))!);
    expect(s.graphics).toBe('3d');

    // Scelgo 2D
    await tocco(page, 360, 175);
    s = JSON.parse((await page.evaluate(() => localStorage.getItem('sic.settings')))!);
    expect(s.graphics).toBe('2d');
  });

  test('il cancello arriva da destra, la pista scorre e poi si ferma', async ({ page }) => {
    await impostaModalita(page, 'runner');
    await avviaMatematica(page);
    const rounds = await prove(page);
    const primo = rounds[0];
    expect(primo.type, 'la prima prova deve essere a scelta').toBe('quiz');

    // La corsa è partita: il cancello è ancora a destra e si avvicina.
    const a = await mondo(page);
    expect(a.cancello, 'il cancello deve esistere').not.toBeNull();
    await page.waitForTimeout(350);
    const b = await mondo(page);
    expect(b.cancello!, 'il cancello avanza verso Pico').toBeLessThan(a.cancello!);
    expect(b.pista, 'la pista scorre durante l\'avvicinamento').toBeGreaterThan(a.pista);

    // Frena e si ferma davanti a Pico, con la pista ferma.
    await attendiFermata(page);
    const fermo = await mondo(page);
    expect(fermo.cancello!, 'il cancello si ferma davanti a Pico').toBeLessThan(900);
    const pistaPrima = fermo.pista;
    await page.waitForTimeout(400);
    const pistaDopo = (await mondo(page)).pista;
    expect(Math.abs(pistaDopo - pistaPrima), 'all\'arrivo la pista si ferma').toBeLessThan(1);

    // I cartelli sostituiscono i bottoni.
    expect(fermo.segni, 'un cartello per ogni opzione').toBe(primo.options!.length);
    expect(fermo.bottoni, 'nessun bottone di risposta in modalità Runner').toBe(0);

    // Le etichette delle opzioni stanno sui cartelli, sulla pista.
    const etichette = (await testi(page)).filter((t) => t.y > 300).map((t) => t.text);
    for (const opt of primo.options!) {
      expect(etichette, `il cartello "${opt.label}" deve essere sulla pista`).toContain(opt.label);
    }
  });

  test('toccare il cartello giusto fa saltare Pico e passa alla prova dopo', async ({ page }) => {
    await impostaModalita(page, 'runner');
    await avviaMatematica(page);
    const rounds = await prove(page);
    const primo = rounds[0];
    const giusta = primo.options!.find((o) => o.correct)!.label;

    await attendiFermata(page);
    const cartello = (await testi(page)).find((t) => t.text === giusta && t.y > 300);
    expect(cartello, `il cartello "${giusta}" deve essere toccabile`).toBeTruthy();

    const prima = await mondo(page);
    // Fermo davanti al cancello, Pico è di profilo e non corre.
    expect(prima.pico.texture, 'Pico è di profilo').toBe('pico-side-idle');
    expect(prima.pico.x).toBeCloseTo(110, 0);

    await tocco(page, cartello!.x, cartello!.y, 150);
    const durante = await mondo(page);
    expect(durante.pico.texture, 'Pico salta verso il cartello').toBe('pico-side-jump');
    expect(durante.pico.y!, 'Pico si stacca da terra').toBeLessThan(prima.pico.y! - 40);
    expect(durante.pico.x!, 'Pico va verso il cartello scelto').toBeGreaterThan(prima.pico.x! + 80);

    // La corsa riparte: compare la domanda della prova successiva.
    const dopo = await attendi(
      page,
      async () => (await testi(page)).some((t) => t.text === rounds[1].prompt),
      8000
    );
    expect(dopo, 'dopo la risposta giusta deve arrivare la prova successiva').toBe(true);

    // Pico è tornato al suo posto, pronto per la prossima corsa.
    const riposo = await mondo(page);
    expect(riposo.pico.x).toBeCloseTo(110, 0);
    expect(riposo.pico.texture).toMatch(/^pico-side[12]$/);
  });

  test('con "meno opzioni" restano due cartelli', async ({ page }) => {
    await impostaModalita(page, 'runner', { fewerOptions: true });
    await avviaMatematica(page);
    await attendiFermata(page);
    expect((await mondo(page)).segni).toBe(2);
  });

  test('dopo 3 errori la prova si sblocca lo stesso', async ({ page }) => {
    test.setTimeout(45_000);
    await impostaModalita(page, 'runner');
    await avviaMatematica(page);
    const rounds = await prove(page);
    const primo = rounds[0];
    const sbagliata = primo.options!.find((o) => !o.correct)!.label;

    await attendiFermata(page);

    // Tocca il cartello sbagliato e verifica che il tocco sia arrivato: Pico
    // salta. Se il primo tocco cade nel vuoto si riprova una volta, ma un tocco
    // che il gioco ignora fa fallire il test.
    const toccaSbagliata = async (tentativo: number): Promise<boolean> => {
      for (let prova = 0; prova < 2; prova++) {
        const cartello = (await testi(page)).find((t) => t.text === sbagliata && t.y > 300);
        expect(cartello, `tentativo ${tentativo}: cartello sbagliato non trovato`).toBeTruthy();
        await tocco(page, cartello!.x, cartello!.y, 200);
        if ((await mondo(page)).pico.texture === 'pico-side-jump') return true;
      }
      return false;
    };

    for (let tentativo = 1; tentativo <= 3; tentativo++) {
      expect(await toccaSbagliata(tentativo), `tentativo ${tentativo} non registrato`).toBe(true);
      await page.waitForTimeout(1100);
    }

    const avanti = await attendi(
      page,
      async () => (await testi(page)).some((t) => t.text === rounds[1].prompt),
      10_000
    );
    expect(avanti, 'tre errori non devono bloccare la corsa').toBe(true);
  });
});

test.describe('Grafica 3D', () => {
  test('Runner 3D: HUD e comandi durante la corsa, risposte in basso al varco', async ({ page }) => {
    test.setTimeout(90_000);
    await impostaGrafica(page, 'runner', '3d');
    await avviaMatematica(page);

    await expect.poll(async () => (await treD(page))?.pronta ?? false).toBe(true);
    await expect(page.locator('canvas.tre-d')).toHaveCount(1);

    // Durante la corsa: HUD e comandi sì, risposte no. Le risposte non sono
    // più pannelli 3D davanti a Pico né una barra sempre accesa: compaiono
    // solo quando il varco si ferma, altrimenti coprirebbero il personaggio.
    await expect(page.locator('#hud-runner')).toBeVisible();
    await expect(page.locator('#comandi-runner')).toBeVisible();
    await expect(page.locator('#risposte-runner')).toBeHidden();

    const partenza = (await treD(page))!;
    expect(partenza.corsia, 'Pico parte in corsia').toBeGreaterThanOrEqual(0);
    expect(partenza.cuori).toBe(3);
    expect(partenza.stelle).toBe(0);
    expect(partenza.ostacoli, 'il percorso ha ostacoli da superare').toBeGreaterThan(0);
    expect(partenza.raccoglibili, 'il percorso ha stelline da prendere').toBeGreaterThan(0);

    const arrivato = await attendi(page, async () => (await treD(page))?.arrivato === true, 20_000);
    expect(arrivato, 'il cancello 3D deve arrivare e fermarsi').toBe(true);

    const primo = (await treD(page))!;
    expect(primo.etichette.length).toBeGreaterThan(1);
    expect(primo.pannelli, 'niente risposte disegnate davanti al personaggio').toEqual([]);
    // La corsa finisce di frenare: a cancello fermo la velocità va a zero.
    await expect.poll(async () => (await treD(page))?.velocita ?? 999).toBeLessThan(5);

    // Al varco i comandi lasciano il posto alle risposte, in basso sotto Pico.
    await expect(page.locator('#risposte-runner')).toBeVisible();
    await expect(page.locator('#comandi-runner')).toBeHidden();
    const risposte = page.locator('#risposte-runner .risposta-runner');
    const etichette = (await risposte.allTextContents()).map((t) => t.trim());
    expect(etichette).toEqual(primo.etichette);
    const scatola = await risposte.first().boundingBox();
    const viewport = page.viewportSize()!;
    expect(scatola, 'la barra delle risposte deve essere visibile').not.toBeNull();
    expect(scatola!.y, 'le risposte stanno nella metà bassa dello schermo').toBeGreaterThan(
      viewport.height / 2
    );
    await expect(risposte.first()).toBeEnabled();

    const rounds = await prove(page);
    const giusta = rounds[0].options!.find((o) => o.correct)!.label;
    const sbagliata = rounds[0].options!.find((o) => !o.correct)!.label;

    // Tocco sbagliato: il gioco lo registra e resta sulla stessa domanda.
    const iSbagliata = primo.etichette.indexOf(sbagliata);
    expect(iSbagliata, `la risposta "${sbagliata}" deve esistere`).toBeGreaterThanOrEqual(0);
    await risposte.nth(iSbagliata).click();
    await expect.poll(async () => (await treD(page))?.errori ?? 0).toBe(1);
    expect((await treD(page))!.etichette).toEqual(primo.etichette);
    await expect(risposte.nth(iSbagliata)).toHaveClass(/sbagliato/);

    // Dopo il reset, la risposta giusta fa ripartire la corsa.
    const iGiusta = primo.etichette.indexOf(giusta);
    expect(iGiusta, `la risposta "${giusta}" deve esistere`).toBeGreaterThanOrEqual(0);
    await expect(risposte.nth(iGiusta)).toBeEnabled({ timeout: 5000 });
    await risposte.nth(iGiusta).click();

    // La barra si richiude e la corsa riparte: HUD e comandi tornano.
    await expect(page.locator('#risposte-runner')).toBeHidden({ timeout: 5000 });
    await expect(page.locator('#comandi-runner')).toBeVisible({ timeout: 5000 });

    const cambiata = await attendi(page, async () => {
      const t = await treD(page);
      return Boolean(t && t.etichette.length > 0 && t.etichette.join('|') !== primo.etichette.join('|'));
    }, 10_000);
    expect(cambiata, 'dopo la risposta giusta deve arrivare il cancello successivo').toBe(true);

    const arrivo2 = await attendi(page, async () => (await treD(page))?.arrivato === true, 20_000);
    expect(arrivo2, 'anche il secondo cancello deve fermarsi davanti a Pico').toBe(true);
  });

  test('Runner 3D: corsie, salto, scivolata, stelline e cuori funzionano davvero', async ({
    page
  }) => {
    test.setTimeout(90_000);
    await impostaGrafica(page, 'runner', '3d');
    await avviaMatematica(page);

    await expect.poll(async () => (await treD(page))?.pronta ?? false).toBe(true);
    await expect(page.locator('#comandi-runner')).toBeVisible();
    await page.focus('body');

    // ── Corsie da tastiera e comandi touch ──
    const btnDx = page.locator('#comandi-runner button').filter({ hasText: 'DX' });
    const btnSx = page.locator('#comandi-runner button').filter({ hasText: 'SX' });
    const iniziale = (await treD(page))!.corsia;

    await btnDx.click();
    await expect.poll(async () => (await treD(page))?.corsia).toBe(Math.min(3, iniziale + 1));

    await btnSx.click();
    await expect.poll(async () => (await treD(page))?.corsia).toBe(iniziale);

    await btnSx.click();
    await btnSx.click();
    await expect.poll(async () => (await treD(page))?.corsia).toBe(0);

    // Ai bordi non si esce dalla pista.
    await btnSx.click();
    await page.waitForTimeout(120);
    expect((await treD(page))!.corsia).toBe(0);

    await btnDx.click();
    await expect.poll(async () => (await treD(page))?.corsia).toBe(1);

    // ── Scivolata e salto: stati veri, non solo animazioni ──
    const btnGiu = page.locator('#comandi-runner button').filter({ hasText: 'Giù' });
    const btnSalta = page.locator('#comandi-runner button').filter({ hasText: 'Salta' });

    await btnGiu.click();
    await expect.poll(async () => (await treD(page))?.inScivolata ?? false, { timeout: 3000 }).toBe(
      true
    );
    await expect.poll(async () => (await treD(page))?.inScivolata ?? true, { timeout: 8000 }).toBe(
      false
    );

    await btnSalta.click();
    await expect.poll(async () => (await treD(page))?.inSalto ?? false, { timeout: 3000 }).toBe(true);
    await expect.poll(async () => (await treD(page))?.inSalto ?? true, { timeout: 8000 }).toBe(false);

    // ── Stelline: raccoglierle aumenta stelle e punteggio nell'HUD ──
    const raccolta = await attendi(page, async () => ((await treD(page))?.stelle ?? 0) >= 1, 15_000);
    expect(raccolta, 'correndo sulla corsia giusta si raccoglie una stellina').toBe(true);
    expect((await treD(page))!.punteggio, 'le stelline danno punti').toBeGreaterThan(0);
    await expect(page.locator('#hud-runner [data-hud="stelle"]')).not.toHaveText('0');
  });

  test('Runner 3D: sbattere contro un ostacolo toglie un cuore, mai la partita', async ({
    page
  }) => {
    test.setTimeout(90_000);
    await impostaGrafica(page, 'runner', '3d');
    await avviaMatematica(page);

    await expect.poll(async () => (await treD(page))?.pronta ?? false).toBe(true);

    // Nessun input: Pico resta nella sua corsia e trova l'ostacolo basso.
    const colpito = await attendi(page, async () => ((await treD(page))?.cuori ?? 3) < 3, 20_000);
    expect(colpito, 'un ostacolo non saltato deve togliere un cuore').toBe(true);

    const dopo = (await treD(page))!;
    expect(dopo.cuori).toBe(2);
    // Mai game over: la partita continua e il varco arriva lo stesso.
    const arrivato = await attendi(page, async () => (await treD(page))?.arrivato === true, 25_000);
    expect(arrivato, 'dopo l’urto la corsa continua fino al varco').toBe(true);
    await expect(page.locator('#hud-runner [data-hud="cuori"]')).toHaveAttribute(
      'aria-label',
      '2 cuori su 3'
    );
  });

  test('Runner 3D: al varco si risponde anche allineando Pico alla porta e saltando', async ({
    page
  }) => {
    test.setTimeout(90_000);
    await impostaGrafica(page, 'runner', '3d');
    await avviaMatematica(page);

    await expect.poll(async () => (await treD(page))?.pronta ?? false).toBe(true);
    const arrivato = await attendi(page, async () => (await treD(page))?.arrivato === true, 20_000);
    expect(arrivato, 'il cancello deve arrivare').toBe(true);
    await expect.poll(async () => (await treD(page))?.velocita ?? 999).toBeLessThan(5);

    const stato = (await treD(page))!;
    const rounds = await prove(page);
    const giusta = rounds[0].options!.find((o) => o.correct)!.label;
    const porta = stato.etichette.indexOf(giusta);
    expect(porta, `la risposta "${giusta}" deve avere una porta`).toBeGreaterThanOrEqual(0);

    // Porta → corsia: con 4 porte è la stessa, con meno porte alcune corsie
    // sono equivalenti. Si cerca la corsia che sceglie davvero quella porta.
    const n = stato.etichette.length;
    const corsiaPerPorta = (i: number): number =>
      n >= 4 ? i : n === 3 ? (i === 0 ? 0 : i === 2 ? 3 : 1) : n === 2 ? (i === 0 ? 1 : 2) : 1;
    const bersaglio = corsiaPerPorta(porta);
    for (let giro = 0; giro < 6 && (await treD(page))!.corsia !== bersaglio; giro++) {
      const ora = (await treD(page))!.corsia;
      const key = bersaglio > ora ? 'ArrowRight' : 'ArrowLeft';
      await page.evaluate((k) => window.dispatchEvent(new KeyboardEvent('keydown', { key: k })), key);
      await page.waitForTimeout(180);
    }
    expect((await treD(page))!.corsia).toBe(bersaglio);

    // Salto sulla porta allineata: risposta giusta senza toccare la barra.
    await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' })));
    await expect(page.locator('#risposte-runner')).toBeHidden({ timeout: 5000 });
    expect((await treD(page))!.combo, 'la risposta giusta aumenta la serie').toBeGreaterThan(0);

    const cambiata = await attendi(page, async () => {
      const t = await treD(page);
      return Boolean(t && t.etichette.length > 0 && t.etichette.join('|') !== stato.etichette.join('|'));
    }, 10_000);
    expect(cambiata, 'dopo il salto sulla porta giusta arriva il varco successivo').toBe(true);
  });

  test('Runner 3D in verticale: domanda in alto, risposte in basso, avviso nascosto', async ({
    page
  }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 390, height: 664 });
    await impostaGrafica(page, 'runner', '3d');
    await avviaMatematica(page);

    await expect.poll(async () => (await treD(page))?.pronta ?? false).toBe(true);
    await expect(page.locator('body')).toHaveClass(/con-3d/);

    // Il canvas Phaser 16:9 non resta al centro dello schermo: si aggancia in
    // alto sotto la barra, così la domanda non finisce sopra al cancello.
    const tela = await page.locator('#game canvas').boundingBox();
    expect(tela, 'il canvas Phaser deve essere visibile').not.toBeNull();
    expect(tela!.y, 'la domanda sta sotto la barra Pausa/Esci').toBeGreaterThanOrEqual(60);

    const nav = await page.locator('#nav-gioco').boundingBox();
    expect(nav, 'la barra di navigazione deve essere visibile').not.toBeNull();
    expect(nav!.height, 'i bottoni della barra restano toccabili').toBeGreaterThanOrEqual(44);

    const arrivato = await attendi(page, async () => (await treD(page))?.arrivato === true, 20_000);
    expect(arrivato, 'il cancello 3D deve arrivare anche in verticale').toBe(true);
    await expect.poll(async () => (await treD(page))?.velocita ?? 999).toBeLessThan(5);

    const risposte = page.locator('#risposte-runner .risposta-runner');
    await expect(risposte.first()).toBeEnabled();
    const scatola = await risposte.first().boundingBox();
    const viewport = page.viewportSize()!;
    expect(scatola, 'le risposte devono essere visibili').not.toBeNull();
    expect(scatola!.y, 'le risposte stanno sotto il personaggio').toBeGreaterThan(
      viewport.height / 2
    );
    expect(scatola!.height, 'le risposte restano toccabili').toBeGreaterThanOrEqual(44);

    // L'avviso "Ruota il telefono" non deve restare dietro alle risposte.
    await expect(page.locator('#ruota')).toBeHidden();
  });

  test('Quiz 3D: il mondo c\'è, i bottoni restano l\'interfaccia', async ({ page }) => {
    await impostaGrafica(page, 'quiz', '3d');
    await avviaMatematica(page);

    await expect.poll(async () => (await treD(page))?.pronta ?? false).toBe(true);
    await expect(page.locator('canvas.tre-d')).toHaveCount(1);
    const stato = (await treD(page))!;
    expect(stato.cancello, 'in Quiz non c\'è un cancello da toccare').toBeNull();
    expect(stato.etichette).toEqual([]);

    // Le risposte restano i bottoni Phaser: il 3D è il mondo, non l'interfaccia.
    expect((await mondo(page)).bottoni).toBeGreaterThan(0);
  });

  test('con alto contrasto il 3D si spegne (fondo chiaro e testi neri)', async ({ page }) => {
    await impostaGrafica(page, 'quiz', '3d', { highContrast: true });
    await avviaMatematica(page);

    await expect(page.locator('canvas.tre-d')).toHaveCount(0);
    expect((await treD(page))?.attivo ?? false).toBe(false);
  });
});
