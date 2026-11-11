/**
 * Texture procedurali stile Edu Sports Arena / Menu Sportivo:
 * capsule bianco-porcellana con bordo luminoso Azzurro Sport (#00a2e8),
 * righe sottili da canale Sport, calotta glossy speculare, pista d'atletica
 * in tartan rosso con prato a strisce da stadio, bandierina a scacchi.
 */
import type Phaser from 'phaser';
import { C } from './palette';
import { ICON_IDS, ICON_PAINTERS } from './icons';

type Ctx = CanvasRenderingContext2D;

function lgrad(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, stops: [number, string][]): CanvasGradient {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}

/**
 * Bottone iconico stile Sport Console / Sport:
 * ombra morbida azzurra/ardesia, bordo esterno spesso e luminoso,
 * texture a micro-righe orizzontali stile canale Sport e calotta glossy.
 */
function button(
  ctx: Ctx,
  w: number,
  h: number,
  topColor: string,
  midColor: string,
  botColor: string,
  borderColor: string,
  stripeRgba: string,
  hero = false
): void {
  const r = h / 2.08;
  // Se hero, alone luminoso esterno verde/smeraldo per evidenziare il bottone
  if (hero) {
    ctx.fillStyle = 'rgba(45, 199, 102, 0.35)';
    ctx.beginPath(); ctx.roundRect(0, 0, w, h - 2, r + 2); ctx.fill();
    ctx.fillStyle = 'rgba(45, 199, 102, 0.18)';
    ctx.beginPath(); ctx.roundRect(-2, -2, w + 4, h + 2, r + 4); ctx.fill();
  }

  // Ombra morbida azzurra/ardesia sotto la capsula
  ctx.fillStyle = 'rgba(15, 65, 110, 0.16)';
  ctx.beginPath(); ctx.roundRect(4, 9, w - 8, h - 11, r); ctx.fill();
  ctx.fillStyle = hero ? 'rgba(34, 197, 94, 0.20)' : 'rgba(0, 162, 232, 0.12)';
  ctx.beginPath(); ctx.roundRect(2, 6, w - 4, h - 8, r); ctx.fill();

  // Bordo esterno spesso e luminoso stile Sport (contorno colorato)
  ctx.fillStyle = borderColor;
  ctx.beginPath(); ctx.roundRect(2, 2, w - 4, h - 8, r); ctx.fill();

  // Corpo interno porcellana / pastello brillante
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(5.5, 5.5, w - 11, h - 15, r - 3.5);
  ctx.clip();

  ctx.fillStyle = lgrad(ctx, 0, 5, 0, h - 10, [
    [0, topColor],
    [0.52, midColor],
    [1, botColor]
  ]);
  ctx.fillRect(4, 4, w - 8, h - 12);
  ctx.restore();

  // Filetto interno bianco perla
  ctx.strokeStyle = 'rgba(255,255,255,0.88)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(6.5, 6.5, w - 13, h - 17, r - 4.5); ctx.stroke();

  // Calotta glossy bianca speculare nella metà superiore
  ctx.fillStyle = lgrad(ctx, 0, 6, 0, 6 + h * 0.38, [
    [0, 'rgba(255,255,255,0.86)'],
    [0.7, 'rgba(255,255,255,0.34)'],
    [1, 'rgba(255,255,255,0.06)']
  ]);
  ctx.beginPath(); ctx.roundRect(12, 6, w - 24, h * 0.38, h / 3); ctx.fill();

  // Riga di luce speculare sul bordo superiore
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath(); ctx.roundRect(22, 5.5, w - 44, 2.5, 1.5); ctx.fill();
}

/** Pannello stile finestra di sistema Sport con header azzurro lucido. */
function panel(ctx: Ctx, w: number, h: number): void {
  // Ombra morbida
  ctx.fillStyle = 'rgba(15, 65, 110, 0.16)';
  ctx.beginPath(); ctx.roundRect(6, 10, w - 12, h - 12, 26); ctx.fill();

  // Corpo bianco porcellana Sport
  ctx.fillStyle = lgrad(ctx, 0, 2, 0, h - 8, [[0, '#ffffff'], [1, '#eef7ff']]);
  ctx.beginPath(); ctx.roundRect(2, 2, w - 4, h - 8, 24); ctx.fill();

  // Fascia d'intestazione azzurra Sport
  ctx.fillStyle = lgrad(ctx, 0, 10, 0, 58, [[0, '#e6f6ff'], [1, '#c8ebff']]);
  ctx.beginPath(); ctx.roundRect(12, 12, w - 24, 46, 16); ctx.fill();
  ctx.strokeStyle = 'rgba(0, 162, 232, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(12, 12, w - 24, 46, 16); ctx.stroke();

  // Bordo esterno Azzurro Sport + filetto interno bianco
  ctx.strokeStyle = '#38b6ff';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.roundRect(2, 2, w - 4, h - 8, 24); ctx.stroke();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(5, 5, w - 10, h - 14, 21); ctx.stroke();
}

function star(ctx: Ctx, s: number): void {
  const u = s / 48;
  ctx.fillStyle = '#d99a00';
  const pts: [number, number][] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 21 : 9.5;
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    pts.push([24 + Math.cos(a) * r, 24 + Math.sin(a) * r]);
  }
  ctx.beginPath(); ctx.moveTo(pts[0][0] * u, pts[0][1] * u);
  for (let i = 1; i < 10; i++) ctx.lineTo(pts[i][0] * u, pts[i][1] * u);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ffe033';
  const pts2: [number, number][] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 16.5 : 7.5;
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    pts2.push([23.5 + Math.cos(a) * r, 23.5 + Math.sin(a) * r]);
  }
  ctx.beginPath(); ctx.moveTo(pts2[0][0] * u, pts2[0][1] * u);
  for (let i = 1; i < 10; i++) ctx.lineTo(pts2[i][0] * u, pts2[i][1] * u);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.beginPath(); ctx.arc(19 * u, 17.5 * u, 3.2 * u, 0, 7); ctx.fill();
}

function heart(ctx: Ctx, s: number): void {
  const u = s / 48;
  ctx.fillStyle = '#c92a2a';
  ctx.beginPath();
  ctx.moveTo(24*u, 42*u);
  ctx.bezierCurveTo(6*u, 30*u, 7*u, 10*u, 20*u, 11*u);
  ctx.quadraticCurveTo(24*u, 12*u, 24*u, 17*u);
  ctx.quadraticCurveTo(24*u, 12*u, 28*u, 11*u);
  ctx.bezierCurveTo(41*u, 10*u, 42*u, 30*u, 24*u, 42*u);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ff4d4d';
  ctx.beginPath();
  ctx.moveTo(24*u, 38*u);
  ctx.bezierCurveTo(9*u, 27*u, 10*u, 11*u, 20*u, 12*u);
  ctx.quadraticCurveTo(24*u, 13*u, 24*u, 17*u);
  ctx.quadraticCurveTo(24*u, 13*u, 28*u, 12*u);
  ctx.bezierCurveTo(38*u, 11*u, 39*u, 27*u, 24*u, 38*u);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath(); ctx.ellipse(17*u, 19*u, 3.6*u, 2.3*u, -0.6, 0, 7); ctx.fill();
}

/** Bandiera del traguardo in stile Sport (asta bianca/argento, pomello d'oro, scacchi). */
function flag(ctx: Ctx, _w: number, h: number): void {
  // Base sportiva bianca e azzurra Sport
  ctx.fillStyle = '#00a2e8';
  ctx.beginPath(); ctx.roundRect(24, h - 14, 24, 12, 5); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.roundRect(28, h - 18, 16, 9, 4); ctx.fill();
  ctx.strokeStyle = '#00a2e8'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(28, h - 18, 16, 9, 4); ctx.stroke();

  // Asta bianca/argento satinata
  ctx.fillStyle = '#dce6f2';
  ctx.beginPath(); ctx.roundRect(33, 8, 6, h - 24, 3); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(34, 8, 2.5, h - 24);

  // Sfera dorata in cima
  ctx.fillStyle = '#f5b800';
  ctx.beginPath(); ctx.arc(36, 7, 5.5, 0, 7); ctx.fill();
  ctx.fillStyle = '#fff3a1';
  ctx.beginPath(); ctx.arc(34.5, 5.5, 2, 0, 7); ctx.fill();

  // Drappo sportivo con bordo azzurro Sport e scacchi bianchi/azzurri + punta corallo
  ctx.fillStyle = '#00a2e8';
  ctx.beginPath();
  ctx.roundRect(39, 10, 30, 22, 4);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(41, 12, 26, 18);
  // Scacchiera Sport
  ctx.fillStyle = '#00a2e8';
  const cw = 6.5;
  const ch = 6;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 4; c++) {
      if ((r + c) % 2 === 0) {
        ctx.fillRect(41 + c * cw, 12 + r * ch, cw, ch);
      }
    }
  }
}

/**
 * Tile di terra tileabile (128×96):
 * vera pista d'atletica / stadio Sport!
 * Fascia superiore di prato da stadio a strisce verdi brillanti,
 * cordolo sportivo bianco e azzurro Sport, e corsia in tartan rosso/terracotta
 * con linee di corsia bianche tratteggiate su cui corre Pico.
 */
function ground(ctx: Ctx, w: number, h: number): void {
  // 1. Fascia superiore: prato da golf/stadio Sport a bande verticali
  ctx.fillStyle = '#6ee268';
  ctx.fillRect(0, 10, w, 24);
  ctx.fillStyle = '#58cc52';
  ctx.fillRect(0, 10, w / 2, 24);

  // Ciglio erboso luminoso in cima + ciuffi morbidi
  ctx.fillStyle = '#9df296';
  ctx.fillRect(0, 9, w, 3);
  for (const x of [16, 48, 80, 112]) {
    ctx.fillStyle = x < 64 ? '#58cc52' : '#6ee268';
    ctx.beginPath();
    ctx.arc(x, 10, 4, Math.PI, 0);
    ctx.fill();
  }

  // 2. Cordolo sportivo bianco e Azzurro Sport (#00a2e8)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 32, w, 6);
  ctx.fillStyle = '#00a2e8';
  for (let x = 0; x < w; x += 32) {
    ctx.fillRect(x, 32, 16, 6);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.10)';
  ctx.fillRect(0, 38, w, 2);

  // 3. Corsia d'atletica in tartan rosso/terracotta Sport
  ctx.fillStyle = lgrad(ctx, 0, 40, 0, h - 10, [
    [0, '#ee7354'],
    [0.5, '#e05d3c'],
    [1, '#c9492a']
  ]);
  ctx.fillRect(0, 40, w, h - 50);

  // Grana leggera del tartan e linee di corsia bianche
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.fillRect(0, 41, w, 2);
  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  // Linee tratteggiate di corsia (perfettamente periodiche su 128px)
  for (let x = 8; x < w; x += 32) {
    ctx.beginPath();
    ctx.roundRect(x, 61, 18, 3.5, 1.5);
    ctx.fill();
  }
  // Linea continua di fondo corsia
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillRect(0, h - 14, w, 3);

  // 4. Bordo inferiore di prato verde scuro
  ctx.fillStyle = '#4ab845';
  ctx.fillRect(0, h - 11, w, 11);
}

/** Scheda bianca porcellana stile Sport con doppio bordo celeste/argento e riflesso. */
function card(ctx: Ctx, w: number, h: number): void {
  // Ombra morbida azzurra/ardesia
  ctx.fillStyle = 'rgba(15, 65, 110, 0.16)';
  ctx.beginPath(); ctx.roundRect(4, 8, w - 8, h - 10, 20); ctx.fill();

  // Bordo esterno celeste Sport (#38b6ff)
  ctx.fillStyle = '#38b6ff';
  ctx.beginPath(); ctx.roundRect(2, 2, w - 4, h - 10, 19); ctx.fill();

  // Corpo bianco porcellana
  ctx.fillStyle = lgrad(ctx, 0, 4, 0, h - 10, [[0, '#ffffff'], [0.65, '#f7fbff'], [1, '#e6f4ff']]);
  ctx.beginPath(); ctx.roundRect(5, 5, w - 10, h - 16, 16); ctx.fill();

  // Riflesso superiore glossy
  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  ctx.beginPath(); ctx.roundRect(12, 7, w - 24, h * 0.30, 12); ctx.fill();

  // Filetto interno bianco
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(5.5, 5.5, w - 11, h - 17, 15.5); ctx.stroke();
}

/** Slot vuoto (bordo tratteggiato azzurro Sport) per le prove di riordino. */
function slot(ctx: Ctx, w: number, h: number): void {
  ctx.fillStyle = 'rgba(235, 248, 255, 0.72)';
  ctx.beginPath(); ctx.roundRect(4, 4, w - 8, h - 8, 18); ctx.fill();
  ctx.strokeStyle = '#00a2e8';
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 7]);
  ctx.beginPath(); ctx.roundRect(4, 4, w - 8, h - 8, 18); ctx.stroke();
  ctx.setLineDash([]);
}

/** Bottone tondo piccolo stile icona Menu Sportivo (HUD: pausa, audio). */
function roundbtn(ctx: Ctx, s: number): void {
  ctx.fillStyle = 'rgba(15, 65, 110, 0.16)';
  ctx.beginPath(); ctx.arc(s / 2, s / 2 + 2, s / 2 - 2, 0, 7); ctx.fill();
  ctx.fillStyle = '#00a2e8';
  ctx.beginPath(); ctx.arc(s / 2, s / 2, s / 2 - 3, 0, 7); ctx.fill();
  ctx.fillStyle = lgrad(ctx, 0, 4, 0, s - 4, [[0, '#ffffff'], [1, '#e0f2ff']]);
  ctx.beginPath(); ctx.arc(s / 2, s / 2, s / 2 - 6, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath(); ctx.ellipse(s / 2, s * 0.30, s * 0.28, s * 0.14, 0, 0, 7); ctx.fill();
}

/**
 * Oggetti di bordo pista in stile stadio Sport (512×64):
 * transenne sportive bianche/azzurre Sport, cartelli metrici (50m, 100m),
 * cespugli sferici curati e bandierine sportive.
 */
function propsRow(ctx: Ctx, _w: number, h: number): void {
  // Cespuglio sferico stile Sport Golf
  const bush = (x: number, s: number): void => {
    ctx.fillStyle = '#3eb848';
    ctx.beginPath();
    ctx.arc(x - 13 * s, h - 12 * s, 10 * s, 0, 7);
    ctx.arc(x, h - 18 * s, 13.5 * s, 0, 7);
    ctx.arc(x + 13 * s, h - 12 * s, 10 * s, 0, 7);
    ctx.fill();
    ctx.fillStyle = '#7bf078';
    ctx.beginPath();
    ctx.arc(x - 6 * s, h - 21 * s, 6.5 * s, 0, 7);
    ctx.arc(x + 5 * s, h - 22 * s, 7.5 * s, 0, 7);
    ctx.fill();
  };

  // Transenna sportiva bassa bianca e Azzurro Sport
  const barrier = (x: number): void => {
    // Piedini
    ctx.fillStyle = '#5f7186';
    ctx.fillRect(x - 22, h - 8, 5, 8);
    ctx.fillRect(x + 17, h - 8, 5, 8);
    // Pannello bianco con bordo azzurro Sport
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.roundRect(x - 26, h - 24, 52, 17, 4); ctx.fill();
    ctx.strokeStyle = '#00a2e8';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.roundRect(x - 26, h - 24, 52, 17, 4); ctx.stroke();
    // Striscia centrale azzurra Sport
    ctx.fillStyle = '#00a2e8';
    ctx.fillRect(x - 20, h - 18, 40, 5);
  };

  // Cartello chilometrico / distanza Sport ("50m" / "100m")
  const signPost = (x: number, label: string): void => {
    ctx.fillStyle = '#c9d6e4';
    ctx.fillRect(x - 2, h - 14, 4, 14);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.roundRect(x - 20, h - 32, 40, 20, 6); ctx.fill();
    ctx.strokeStyle = '#00a2e8';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.roundRect(x - 20, h - 32, 40, 20, 6); ctx.stroke();
    ctx.fillStyle = '#0078b8';
    ctx.font = 'bold 10px Verdana, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x, h - 22);
  };

  // Bandierina sportiva triangolare
  const pennant = (x: number, color: string): void => {
    ctx.fillStyle = '#dce6f2';
    ctx.fillRect(x - 1.5, h - 34, 3, 34);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x + 1.5, h - 34);
    ctx.lineTo(x + 20, h - 27);
    ctx.lineTo(x + 1.5, h - 20);
    ctx.closePath();
    ctx.fill();
  };

  bush(46, 0.95);
  barrier(140);
  signPost(238, '50m');
  pennant(308, '#00a2e8');
  bush(366, 0.82);
  signPost(452, '100m');
  pennant(494, '#ff7a33');
}

/** Crea tutte le texture UI con disegno nitido ad alta fedeltà. */
export function ensureUI(scene: Phaser.Scene): void {
  const make = (key: string, w: number, h: number, draw: (ctx: Ctx) => void): void => {
    if (scene.textures.exists(key)) scene.textures.remove(key);
    const cv = scene.textures.createCanvas(key, w, h);
    if (!cv) return;
    const ctx = cv.getContext();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    draw(ctx);
    cv.refresh();
  };

  // Texture tileabili standard (pista e props)
  const makeRaw = (key: string, w: number, h: number, draw: (ctx: Ctx) => void): void => {
    if (scene.textures.exists(key)) scene.textures.remove(key);
    const cv = scene.textures.createCanvas(key, w, h);
    if (!cv) return;
    draw(cv.getContext());
    cv.refresh();
  };

  // btn-blue: l'iconico bottone principale Sport (bianco-porcellana + bordo Azzurro Sport #00a2e8)
  make('btn-blue', 260, 52, (ctx) =>
    button(ctx, 260, 52, '#ffffff', '#eaf6ff', '#d0ebff', '#00a2e8', 'rgba(0, 162, 232, 0.045)')
  );
  // btn-wide-orange: bottone lungo di riepilogo a 2 colonne (bordo Arancione Sport #ff7a00)
  make('btn-wide-orange', 496, 44, (ctx) =>
    button(ctx, 496, 44, '#ffffff', '#fff9f0', '#ffeed4', '#ff7a00', 'rgba(255, 122, 0, 0.05)')
  );
  // btn-red-outline: impostazioni / configurazione (bianco-porcellana + contorno rosso vivo #e63946)
  make('btn-red-outline', 260, 52, (ctx) =>
    button(ctx, 260, 52, '#ffffff', '#fff5f5', '#ffe5e5', '#e63946', 'rgba(230, 57, 70, 0.05)')
  );
  // btn-green-hero: bottone "Gioca" evidenziato (bianco-porcellana + contorno verde vivo #16a34a ed effetto hero)
  make('btn-green-hero', 260, 52, (ctx) =>
    button(ctx, 260, 52, '#ffffff', '#f0fdf4', '#dcfce7', '#16a34a', 'rgba(22, 163, 74, 0.06)', true)
  );
  // btn-green: attivo / risposta corretta (verde energico e solido ad altissimo contrasto)
  make('btn-green', 260, 52, (ctx) =>
    button(ctx, 260, 52, '#2dc766', '#1ca64e', '#13833b', '#0b5424', 'rgba(11, 84, 36, 0.08)')
  );
  // btn-orange: avviso / secondario caldo
  make('btn-orange', 260, 52, (ctx) =>
    button(ctx, 260, 52, '#fff6e8', '#ffc478', '#f59838', '#c96a12', 'rgba(201, 106, 18, 0.05)')
  );
  // btn-red: errore (corallo acceso Sport)
  make('btn-red', 260, 52, (ctx) =>
    button(ctx, 260, 52, '#fff0f0', '#ff9696', '#e65555', '#c22e2e', 'rgba(194, 46, 46, 0.05)')
  );
  // btn-yellow: oro Sport
  make('btn-yellow', 260, 52, (ctx) =>
    button(ctx, 260, 52, '#fffbe6', '#ffe47a', '#f2c438', '#c49200', 'rgba(196, 146, 0, 0.05)')
  );
  // btn-gray: disabilitato / neutro argento Sport
  make('btn-gray', 260, 52, (ctx) =>
    button(ctx, 260, 52, '#ffffff', '#eef3f8', '#dce4ee', '#9eb0c4', 'rgba(95, 113, 134, 0.04)')
  );
  // Bottoni "risposta lunga": più larghi e alti (3 righe di testo), con gli
  // stessi stati dei bottoni normali. Li usano le prove a scelta quando una
  // risposta è troppo lunga per il bottone standard da 260×52.
  make('btn-ans-blue', 400, 76, (ctx) =>
    button(ctx, 400, 76, '#ffffff', '#eaf6ff', '#d0ebff', '#00a2e8', 'rgba(0, 162, 232, 0.045)')
  );
  make('btn-ans-green', 400, 76, (ctx) =>
    button(ctx, 400, 76, '#2dc766', '#1ca64e', '#13833b', '#0b5424', 'rgba(11, 84, 36, 0.08)')
  );
  make('btn-ans-red', 400, 76, (ctx) =>
    button(ctx, 400, 76, '#fff0f0', '#ff9696', '#e65555', '#c22e2e', 'rgba(194, 46, 46, 0.05)')
  );
  make('btn-ans-gray', 400, 76, (ctx) =>
    button(ctx, 400, 76, '#ffffff', '#eef3f8', '#dce4ee', '#9eb0c4', 'rgba(95, 113, 134, 0.04)')
  );
  make('panel', 700, 480, (ctx) => panel(ctx, 700, 480));
  make('star', 48, 48, (ctx) => star(ctx, 48));
  make('heart', 48, 48, (ctx) => heart(ctx, 48));
  make('flag', 72, 108, (ctx) => flag(ctx, 72, 108));
  make('ground', 128, 96, (ctx) => ground(ctx, 128, 96));
  make('card', 256, 96, (ctx) => card(ctx, 256, 96));
  make('slot', 256, 96, (ctx) => slot(ctx, 256, 96));
  make('roundbtn', 48, 48, (ctx) => roundbtn(ctx, 48));
  // groundRow: 9 tile ripetuti → larghezza 1152, sposta seamlessly con mod 128
  makeRaw('groundRow', 1152, 96, (ctx) => {
    for (let i = 0; i < 9; i++) {
      ctx.save();
      ctx.translate(i * 128, 0);
      ground(ctx, 128, 96);
      ctx.restore();
    }
  });
  // propsRow: transenne, cartelli 50m/100m, cespugli e bandierine (modalità Runner)
  makeRaw('propsRow', 512, 64, (ctx) => propsRow(ctx, 512, 64));
}

/** Crea le texture delle icone (id → texture `icon-{id}`) per le prove di riconoscimento. */
export function ensureIcons(scene: Phaser.Scene): void {
  for (const id of ICON_IDS) {
    const key = `icon-${id}`;
    if (scene.textures.exists(key)) scene.textures.remove(key);
    const cv = scene.textures.createCanvas(key, 96, 96);
    if (!cv) continue;
    const ctx = cv.getContext();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    // Fondo medaglione bianco porcellana Sport con bordo celeste
    ctx.fillStyle = 'rgba(255,255,255,0.96)';
    ctx.beginPath(); ctx.roundRect(2, 2, 92, 92, 16); ctx.fill();
    ctx.strokeStyle = '#38b6ff'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.roundRect(3, 3, 90, 90, 15); ctx.stroke();
    ICON_PAINTERS[id](ctx, 96);
    cv.refresh();
  }
}
