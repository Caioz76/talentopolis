/**
 * Helper UI condivisi dalle prove (challenges) e dalle scene:
 * font BES, bottoni, chip, slot, banner, mescolamento, cue visivi.
 *
 * Qui vivono anche i contratti comuni:
 *  - `Challenge`: interfaccia che ogni prova deve implementare
 *  - `ChallengeCallbacks`: come la prova comunica il risultato al GameScene
 */
import Phaser from 'phaser';
import { testoSemplice, type EffectiveConfig } from '../bes/resolver';
import { T } from '../art/palette';
import type { Option } from '../content/types';
import { hitRect } from './hit';

export { testoSemplice };

/** Massimo di tentativi falliti per ogni prova (poi si rivela la risposta). */
export const MAX_ATTEMPTS = 3;

export interface ChallengeCallbacks {
  /** Chiamato UNA sola volta quando lo studente risponde correttamente. */
  onCorrect: () => void;
  /** Chiamato ad ogni tentativo fallito (attempts = 1-based). */
  onWrong: (attempts: number) => void;
}

/** Contratto di ogni prova. */
export interface Challenge {
  /** Mostra la risposta corretta (chiamato da fuori su timeout/3° errore). */
  reveal(): void;
  /** Blocca ogni interazione (nessun callback dopo la lock). */
  lock(): void;
  /** Rimuove tutti gli oggetti e i timer creati dalla prova. */
  dispose(): void;
}

export interface FontSpec {
  family: string;
  spacing: number;
}

/** Font in base alle regole BES (dislessia → Comic Sans + spaziatura). */
export function fontSpec(cfg: EffectiveConfig): FontSpec {
  return cfg.font === 'dyslexia'
    ? {
        // Le emoji (🦊, 💡, ⚙️) non esistono in Comic Sans: senza i font emoji in
        // coda il canvas disegnava dei quadratini al posto delle icone.
        family:
          '"Comic Sans MS", "Comic Sans", Verdana, "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif',
        spacing: 2
      }
    : { family: '"Arial Rounded MT Bold", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Trebuchet MS", Verdana, sans-serif', spacing: 0 };
}

/**
 * Spaziatura lettere da usare per un testo. Phaser, con `letterSpacing > 0`,
 * disegna i caratteri uno alla volta spezzando le emoji (coppie surrogate) in
 * due quadratini: per i testi che contengono emoji la spaziatura resta 0.
 */
export function spaziaturaPer(spec: FontSpec, str: string): number {
  if (spec.spacing === 0) return 0;
  return /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u.test(str) ? 0 : spec.spacing;
}

export interface TextOpts {
  size?: number;
  color?: string;
  bold?: boolean;
  italic?: boolean;
  align?: 'left' | 'center' | 'right';
  wrap?: number;
  /** Altezza massima consentita in px: riduce automaticamente il font se il testo straborda. */
  maxH?: number;
  /** Contorno bianco leggero (leggibilità su sfondi vari). */
  outline?: boolean;
  originX?: number;
  originY?: number;
  /** Profondità di rendering: default 100 per stare SEMPRE sopra ogni grafica di gioco e menu. */
  depth?: number;
}

/**
 * Riduce progressivamente il fontSize (fino a `minPx`) se il testo supera
 * `maxW` o `maxH`, evitando sovrapposizioni quando `fontScale > 1` (es. Dislessia / Ipovisione).
 */
export function fitTextToBox(
  t: Phaser.GameObjects.Text,
  maxW: number,
  maxH: number,
  minPx = 11
): void {
  const rawSize = parseInt(String(t.style.fontSize), 10);
  let px = Number.isFinite(rawSize) && rawSize > 0 ? rawSize : 18;
  // Il padding interno (es. 8+8 / 4+4 px) serve solo a non tagliare i glifi:
  // non è testo. Contarlo faceva rimpicciolire fino a 11 px anche etichette che
  // ci stavano benissimo (contatore, titolo della tappa, stelle, sottotitoli).
  const pad = (t as unknown as { padding?: { left?: number; right?: number; top?: number; bottom?: number } }).padding ?? {};
  const padW = (pad.left ?? 0) + (pad.right ?? 0);
  const padH = (pad.top ?? 0) + (pad.bottom ?? 0);
  while (px > minPx && (t.height - padH > maxH || t.width - padW > maxW + 2)) {
    px -= 1;
    t.setFontSize(px);
    t.setLineSpacing(Math.max(1, Math.round(px * 0.12)));
  }
}

/** Testo BES-aware (font, scala, spaziatura, anti-sovrapposizione, altissima definizione). */
export function makeText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  str: string,
  cfg: EffectiveConfig,
  o: TextOpts = {}
): Phaser.GameObjects.Text {
  const spec = fontSpec(cfg);
  const size = Math.round((o.size ?? 22) * cfg.fontScale);
  const rawColor = o.color ?? '#000000';
  // Preferenza utente: niente testo bianco con bordo nero, solo nero pieno puro e pulito (#000000)
  const isBianco =
    rawColor.toLowerCase() === '#ffffff' ||
    rawColor.toLowerCase() === '#f0f9ff' ||
    rawColor.toLowerCase() === '#e6f4fc';
  const colore = cfg.highContrast || isBianco ? '#000000' : rawColor;
  const wrapW = o.wrap ?? 820;
  const lineGap = Math.round(size * 0.14);
  const t = scene.add.text(x, y, str, {
    fontFamily: spec.family,
    fontSize: `${size}px`,
    fontStyle: o.bold ? 'bold' : 'normal',
    color: colore,
    align: o.align ?? 'center',
    wordWrap: { width: wrapW, useAdvancedWrap: true },
    letterSpacing: spaziaturaPer(spec, str),
    lineSpacing: lineGap,
    padding: { left: 8, right: 8, top: 4, bottom: 4 }
  }).setOrigin(o.originX ?? 0.5, o.originY ?? 0.5);

  // Risoluzione elevata (Retina / 4K / Hi-DPI) per eliminare qualsiasi sfocatura
  const dpi = window.devicePixelRatio || 1;
  const hiRes = Math.min(4, Math.max(dpi * 2, 2.5));
  t.setResolution(hiRes);

  // Il testo deve SEMPRE essere in primo piano assoluto sopra ogni grafica di gioco e menu
  t.setDepth(o.depth ?? 100);

  if (o.italic) t.setStyle({ fontStyle: 'italic' });
  if (o.maxH !== undefined && o.maxH > 0) {
    fitTextToBox(t, wrapW, o.maxH, 11);
  }

  // Preferenza utente: niente contorni neri su testo bianco o aloni, solo nero pieno pulito
  t.setStroke('transparent', 0);
  t.setShadow(0, 0, 'transparent', 0);

  // Alto contrasto: nero pieno, senza ombre decorative.
  if (cfg.highContrast) {
    t.setColor('#000000');
    t.setStroke('transparent', 0);
    t.setShadow(0, 0, 'transparent', 0);
  }
  return t;
}

/**
 * Alto contrasto: ogni testo diventa nero pieno su fondo chiaro.
 * Non si conservano i colori decorativi: leggibilità prima di tutto.
 */
function hcColor(_c: string): string {
  return '#000000';
}

export type BtnKind = 'normal' | 'correct' | 'wrong' | 'disabled' | 'selected' | 'unselected';

export type MobileItemState =
  | 'normal'
  | 'correct'
  | 'wrong'
  | 'disabled'
  | 'selected'
  | 'unselected'
  | 'on'
  | 'off';

export interface MobileItem {
  id: number;
  kind: 'button' | 'chip' | 'toggle' | 'sign' | 'zone' | 'gate';
  label: () => string;
  state: () => MobileItemState;
  enabled: () => boolean;
  x: () => number;
  y: () => number;
  w?: () => number;
  h?: () => number;
  texture?: () => string;
  trigger: () => void;
}

const mobileRegistry = new WeakMap<Phaser.Scene, MobileItem[]>();
const shutdownAttached = new WeakSet<Phaser.Scene>();
let nextMobileId = 1;

export function registerMobileItem(
  scene: Phaser.Scene,
  item: Omit<MobileItem, 'id'>
): () => void {
  let list = mobileRegistry.get(scene);
  if (!list) {
    list = [];
    mobileRegistry.set(scene, list);
  }
  if (!shutdownAttached.has(scene)) {
    shutdownAttached.add(scene);
    scene.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
      mobileRegistry.set(scene, []);
    });
  }
  const entry: MobileItem = { ...item, id: nextMobileId++ };
  list.push(entry);
  return () => {
    const cur = mobileRegistry.get(scene);
    if (!cur) return;
    const idx = cur.indexOf(entry);
    if (idx >= 0) cur.splice(idx, 1);
  };
}

export function getMobileItems(scene: Phaser.Scene | null | undefined): MobileItem[] {
  if (!scene) return [];
  return (mobileRegistry.get(scene) ?? []).slice();
}

/**
 * Cornice grafica in stile **Sport Arena**:
 * pannello porcellana semitrasparente con scanline orizzontali leggere,
 * doppia ghiera Azzurro Sport (`#00a2e8`) + bianco speculare e dettagli dinamici.
 * Rispetta automaticamente le regole BES: sparisce con `noDecoration` o `highContrast`.
 */
export function drawSportChannelFrame(
  scene: Phaser.Scene,
  cfg: EffectiveConfig,
  opts: {
    x?: number;
    y?: number;
    w?: number;
    h?: number;
    headerH?: number;
    depth?: number;
    swoosh?: boolean;
    solid?: boolean;
  } = {}
): Phaser.GameObjects.Graphics | null {
  if (!cfg.decoration || cfg.highContrast) return null;
  const x = opts.x ?? 48;
  const y = opts.y ?? 14;
  const w = opts.w ?? 928;
  const h = opts.h ?? 468;
  const headerH = opts.headerH ?? 68;
  const g = scene.add.graphics().setDepth(opts.depth ?? 1);

  // Ombra esterna morbida azzurra/ardesia
  g.fillStyle(0x005b8f, 0.12);
  g.fillRoundedRect(x + 4, y + 8, w, h, 28);
  g.fillStyle(0x005b8f, 0.07);
  g.fillRoundedRect(x + 2, y + 4, w, h, 28);

  // Corpo principale bianco porcellana sportiva (opaco per massima leggibilità se solid)
  g.fillStyle(0xffffff, opts.solid ? 0.98 : 0.92);
  g.fillRoundedRect(x, y, w, h, 26);

  // Fascia d'intestazione superiore chiara con filetto divisorio Azzurro Sport
  if (headerH > 0) {
    g.fillStyle(0xf0f7fc, 0.96);
    g.fillRoundedRect(x + 6, y + 6, w - 12, headerH, 20);
    // Filetto divisorio inferiore Azzurro Sport
    g.lineStyle(2, 0x00a2e8, 0.65);
    g.lineBetween(x + 20, y + 6 + headerH, x + w - 20, y + 6 + headerH);
  }

  // Strisce dinamiche diagonali negli angoli superiori
  if (opts.swoosh !== false) {
    g.fillStyle(0x00a2e8, 0.18);
    g.fillTriangle(x + 18, y + 12, x + 78, y + 12, x + 18, y + 54);
    g.fillStyle(0xff9f1c, 0.22);
    g.fillTriangle(x + w - 18, y + 12, x + w - 78, y + 12, x + w - 18, y + 54);
  }

  // Doppia cornice: ghiera esterna Azzurro Sport (#00a2e8) + filetto interno bianco
  g.lineStyle(3, 0x00a2e8, 0.78);
  g.strokeRoundedRect(x, y, w, h, 26);
  g.lineStyle(1.5, 0xffffff, 0.96);
  g.strokeRoundedRect(x + 3, y + 3, w - 6, h - 6, 23);

  return g;
}

export const drawWiiChannelFrame = drawSportChannelFrame;

export interface Btn {
  root: Phaser.GameObjects.Container;
  text: Phaser.GameObjects.Text;
  setLabel(s: string): void;
  setKind(k: BtnKind): void;
  setEnabled(b: boolean): void;
  onTap(cb: () => void): void;
  dispose(): void;
}

/** Dimensione base del bottone (texture btn-*). */
export const BTN_W = 260;
export const BTN_H = 52;

const KIND_TEX: Record<BtnKind, string> = {
  normal: 'btn-blue',
  correct: 'btn-green',
  selected: 'btn-green',
  wrong: 'btn-red',
  disabled: 'btn-gray',
  unselected: 'btn-blue'
};

/** Stessi stati per il bottone "risposta lunga" (texture più grande). */
const KIND_TEX_ANS: Record<BtnKind, string> = {
  normal: 'btn-ans-blue',
  correct: 'btn-ans-green',
  selected: 'btn-ans-green',
  wrong: 'btn-ans-red',
  disabled: 'btn-ans-gray',
  unselected: 'btn-ans-blue'
};

/** Larghezza/altezza della texture "risposta lunga". */
export const BTN_ANS_W = 400;
export const BTN_ANS_H = 76;

/**
 * Bottone glossy Flash. Interattivo sul sprite (hit area centrata,
 * ampliata se `permissiveTouch` è attiva).
 */
export function makeButton(
  scene: Phaser.Scene,
  cfg: EffectiveConfig,
  x: number,
  y: number,
  label: string,
  o: {
    w?: number;
    h?: number;
    scale?: number;
    maxTargetScale?: number;
    depth?: number;
    texture?: string;
  } = {}
): Btn {
  const k = o.scale ?? 1;
  // Nelle griglie fitte (scale < 0.85) limitiamo automaticamente l'espansione di targetScale
  // per impedire che bottoni adiacenti si sovrappongano.
  const defaultMaxTs = k < 0.65 ? 1.03 : k < 0.88 ? 1.06 : 1.22;
  const ts = Math.min(cfg.targetScale, o.maxTargetScale ?? defaultMaxTs);
  const s = ts * k;
  const initialTex = o.texture ?? 'btn-blue';
  // Le texture di stato devono avere la stessa misura di quella iniziale,
  // altrimenti un bottone largo diventerebbe piccolo quando cambia colore.
  const mappaStati = initialTex.startsWith('btn-ans-') ? KIND_TEX_ANS : KIND_TEX;
  const texPremuto = mappaStati.correct;
  const sprite = scene.add.sprite(0, 0, initialTex).setScale(s);
  const spec = fontSpec(cfg);
  const baseW = o.w ?? (sprite.width > 0 ? sprite.width : BTN_W);
  const baseH = o.h ?? (sprite.height > 0 ? sprite.height : BTN_H);
  const boxW = Math.max(48, (baseW - 24) * s);
  const boxH = Math.max(16, (baseH - 10) * s);
  const baseFontPx = Math.max(12, Math.round(18 * cfg.fontScale * k));
  const text = scene.add.text(0, 0, label, {
    fontFamily: spec.family,
    fontSize: `${baseFontPx}px`,
    fontStyle: 'bold',
    color: '#000000',
    align: 'center',
    wordWrap: { width: boxW, useAdvancedWrap: true },
    letterSpacing: spaziaturaPer(spec, label),
    padding: { left: 4, right: 4, top: 1, bottom: 1 }
  }).setOrigin(0.5);

  const dpi = window.devicePixelRatio || 1;
  const hiRes = Math.min(4, Math.max(dpi * 2, 2.5));
  text.setResolution(hiRes);
  fitTextToBox(text, boxW, boxH, 10);
  const root = scene.add.container(x, y, [sprite, text]);
  root.setDepth(o.depth ?? 50);

  // Coordinate di TEXTURE: è lo spazio in cui Phaser fa il controllo.
  const hit = permissiveHit(cfg, sprite.width, sprite.height);
  sprite.setInteractive(hit, Phaser.Geom.Rectangle.Contains);

  let enabled = true;
  let currentKind: BtnKind = 'normal';
  const tapCallbacks: Array<() => void> = [];
  // Un tocco vale solo se è INIZIATO su questo bottone. Phaser riceve il
  // rilascio del dito su tutta la finestra: in verticale il canvas (nascosto)
  // sta sotto i bottoni HTML e senza questo controllo un tocco su "Gioca"
  // poteva attivare anche il bottone invisibile sottostante (es. Impostazioni).
  let premuto = false;

  const updateVisualState = () => {
    const texKey = currentKind === 'normal' ? initialTex : (mappaStati[currentKind] ?? initialTex);
    if (scene.textures.exists(texKey)) sprite.setTexture(texKey);
    if (currentKind === 'disabled' || currentKind === 'unselected') {
      text.setStyle({ color: '#475569', stroke: 'transparent', strokeThickness: 0 });
    } else {
      text.setStyle({ color: '#000000', stroke: 'transparent', strokeThickness: 0 });
    }
  };

  sprite.on('pointerover', () => {
    if (!enabled) return;
    if (currentKind !== 'selected' && currentKind !== 'correct' && currentKind !== 'wrong') {
      sprite.setTint(0xe6f7ff);
    }
    root.setScale(1.025);
  });

  sprite.on('pointerout', () => {
    premuto = false;
    if (!enabled) return;
    sprite.clearTint();
    root.setScale(1.0);
    updateVisualState();
  });

  sprite.on('pointerdown', () => {
    if (!enabled) return;
    premuto = true;
    root.setScale(0.97);
    if (scene.textures.exists(texPremuto)) {
      sprite.setTexture(texPremuto);
    }
  });

  sprite.on('pointerup', () => {
    if (!enabled || !premuto) return;
    premuto = false;
    sprite.clearTint();
    root.setScale(1.0);
    if (scene.textures.exists(texPremuto)) {
      sprite.setTexture(texPremuto);
    }
    tapCallbacks.forEach((fn) => fn());
  });

  const unregister = registerMobileItem(scene, {
    kind: 'button',
    label: () => text.text,
    state: () => ( !enabled ? 'disabled' : currentKind),
    enabled: () => enabled && root.active && root.visible,
    x: () => root.x,
    y: () => root.y,
    w: () => sprite.width * s,
    h: () => sprite.height * s,
    texture: () => (sprite.texture?.key ? sprite.texture.key : initialTex),
    trigger: () => {
      if (enabled && root.active) {
        if (scene.textures.exists(texPremuto)) {
          sprite.setTexture(texPremuto);
        }
        tapCallbacks.forEach((fn) => fn());
      }
    }
  });
  root.once(Phaser.GameObjects.Events.DESTROY, unregister);
  return {
    root,
    text,
    setLabel(sLbl: string): void {
      text.setFontSize(baseFontPx);
      text.setLetterSpacing(spaziaturaPer(spec, sLbl));
      text.setText(sLbl);
      fitTextToBox(text, boxW, boxH, 10);
    },
    setKind(kKind: BtnKind): void {
      currentKind = kKind;
      updateVisualState();
    },
    setEnabled(b: boolean): void {
      enabled = b;
      if (b) sprite.setInteractive(hit, Phaser.Geom.Rectangle.Contains);
      else sprite.disableInteractive();
    },
    onTap(cb: () => void): void {
      tapCallbacks.push(cb);
    },
    dispose(): void {
      unregister();
      sprite.removeAllListeners();
      root.destroy();
    }
  };
}

/** Colori-tint delle chip (card bianca tintata). */
export const TINT = {
  selected: 0xffe98a,
  correct: 0xb5f2cf,
  wrong: 0xffb3b3,
  dim: 0xd8dce6
} as const;

export interface Chip {
  root: Phaser.GameObjects.Container;
  text: Phaser.GameObjects.Text;
  setTint(t: number | null): void;
  setSelected(b: boolean): void;
  setCorrect(): void;
  setWrong(): void;
  setDim(): void;
  setEnabled(b: boolean): void;
  onTap(cb: () => void): void;
  onDragStart?(cb: (p: Phaser.Input.Pointer) => void): void;
  dispose(): void;
}

/**
 * Chip bianca (texture `card`) con etichetta — per riordino, sequenza,
 * abbinamenti. Stati visivi tramite TINT (mai tint "moltiplicato" su
 * texture colorate: qui la card è bianca, quindi va bene).
 */
export function makeChip(
  scene: Phaser.Scene,
  cfg: EffectiveConfig,
  x: number,
  y: number,
  label: string,
  o: { w?: number; h?: number; size?: number; depth?: number } = {}
): Chip {
  const w = o.w ?? 256;
  const h = o.h ?? 96;
  // Quando larghezza o altezza sono vincolate dalla griglia (match/order),
  // non espandiamo la card oltre la cella assegnata per evitare collisioni.
  const ts = o.w !== undefined || o.h !== undefined ? Math.min(cfg.targetScale, 1.02) : cfg.targetScale;
  const sx = ts * (w / 256);
  const sy = ts * (h / 96);
  const sprite = scene.add.sprite(0, 0, 'card').setScale(sx, sy);
  const spec = fontSpec(cfg);
  const boxW = Math.max(56, w * ts - 32);
  const boxH = Math.max(20, h * ts - 14);
  const text = scene.add.text(0, 0, label, {
    fontFamily: spec.family,
    fontSize: `${Math.round((o.size ?? 22) * cfg.fontScale)}px`,
    fontStyle: 'bold',
    color: '#000000',
    align: 'center',
    wordWrap: { width: boxW, useAdvancedWrap: true },
    letterSpacing: spaziaturaPer(spec, label),
    padding: { left: 6, right: 6, top: 2, bottom: 2 }
  }).setOrigin(0.5);
  const dpi = window.devicePixelRatio || 1;
  const hiRes = Math.min(4, Math.max(dpi * 2, 2.5));
  text.setResolution(hiRes);
  fitTextToBox(text, boxW, boxH, 11);
  const root = scene.add.container(x, y, [sprite, text]);
  root.setDepth(o.depth ?? 50);

  // Coordinate di TEXTURE: è lo spazio in cui Phaser fa il controllo.
  const hit = permissiveHit(cfg, sprite.width, sprite.height);
  sprite.setInteractive(hit, Phaser.Geom.Rectangle.Contains);

  let enabled = true;
  let chipState: MobileItemState = 'normal';
  const tapCallbacks: Array<() => void> = [];
  // Come per i bottoni: vale solo il tocco iniziato su questa tessera.
  // (Durante un trascinamento la tessera segue il dito, quindi il rilascio
  // avviene ancora sopra di lei.)
  let premuto = false;
  sprite.on('pointerdown', () => {
    premuto = true;
  });
  sprite.on('pointerup', () => {
    const valido = premuto;
    premuto = false;
    if (enabled && valido) tapCallbacks.forEach((fn) => fn());
  });
  const unregister = registerMobileItem(scene, {
    kind: 'chip',
    label: () => text.text,
    state: () => chipState,
    enabled: () => enabled && root.active && root.visible,
    x: () => root.x,
    y: () => root.y,
    w: () => (o.w ?? 256) * ts,
    h: () => (o.h ?? 96) * ts,
    trigger: () => {
      if (enabled && root.active) tapCallbacks.forEach((fn) => fn());
    }
  });
  root.once(Phaser.GameObjects.Events.DESTROY, unregister);
  return {
    root,
    text,
    setTint(t: number | null): void {
      if (t === null) {
        chipState = 'normal';
        sprite.clearTint();
      } else {
        if (t === TINT.selected) chipState = 'selected';
        else if (t === TINT.correct) chipState = 'correct';
        else if (t === TINT.wrong) chipState = 'wrong';
        else if (t === TINT.dim) chipState = 'disabled';
        sprite.setTint(t);
      }
    },
    setSelected(b: boolean): void {
      this.setTint(b ? TINT.selected : null);
    },
    setCorrect(): void {
      this.setTint(TINT.correct);
    },
    setWrong(): void {
      this.setTint(TINT.wrong);
    },
    setDim(): void {
      this.setTint(TINT.dim);
    },
    setEnabled(b: boolean): void {
      enabled = b;
      if (b) sprite.setInteractive(hit, Phaser.Geom.Rectangle.Contains);
      else sprite.disableInteractive();
    },
    onTap(cb: () => void): void {
      tapCallbacks.push(cb);
    },
    onDragStart(cb: (p: Phaser.Input.Pointer) => void): void {
      sprite.on('pointerdown', (p: Phaser.Input.Pointer) => {
        if (enabled) cb(p);
      });
    },
    dispose(): void {
      unregister();
      sprite.removeAllListeners();
      root.destroy();
    }
  };
}

/** Slot tratteggiato numerato (posizioni per il riordino). */
export function makeSlot(
  scene: Phaser.Scene,
  cfg: EffectiveConfig,
  x: number,
  y: number,
  index: number,
  o: { w?: number; h?: number } = {}
): { root: Phaser.GameObjects.Container; dispose(): void } {
  const w = o.w ?? 256;
  const h = o.h ?? 96;
  const ts = o.w !== undefined || o.h !== undefined ? Math.min(cfg.targetScale, 1.02) : cfg.targetScale;
  const sx = ts * (w / 256);
  const sy = ts * (h / 96);
  const sprite = scene.add.sprite(0, 0, 'slot').setScale(sx, sy);
  const spec = fontSpec(cfg);
  const num = scene.add.text(0, 0, String(index), {
    fontFamily: spec.family,
    fontSize: `${Math.round(20 * cfg.fontScale)}px`,
    fontStyle: 'bold',
    color: '#000000',
    letterSpacing: spec.spacing,
    padding: { left: 4, right: 4, top: 2, bottom: 2 }
  }).setOrigin(0.5);
  const dpi = window.devicePixelRatio || 1;
  const hiRes = Math.min(4, Math.max(dpi * 2, 2.5));
  num.setResolution(hiRes);
  const root = scene.add.container(x, y, [sprite, num]);
  root.setDepth(20);
  return {
    root,
    dispose(): void {
      root.destroy();
    }
  };
}

/** Rettangolo hit centrato sull'oggetto (ampliato con permissiveTouch). */
export function permissiveHit(cfg: EffectiveConfig, w: number, h: number): Phaser.Geom.Rectangle {
  const r = hitRect(w, h, cfg.permissiveTouch);
  return new Phaser.Geom.Rectangle(r.x, r.y, r.width, r.height);
}

/** Fisher–Yates su una COPIA (non muta l'originale). */
export function shuffle<T>(arr: readonly T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i];
    a[i] = a[j];
    a[j] = tmp;
  }
  return a;
}

/**
 * Adatta il numero di opzioni al limite BES (`fewerOptions`).
 * Mantiene SEMPRE l'opzione corretta + fintantefattibili sbagliate.
 */
export function fitOptions(options: Option[], max: number): Option[] {
  const shuffled = shuffle(options);
  if (shuffled.length <= max) return shuffled;
  const correct = shuffled.filter((o) => o.correct);
  const wrong = shuffle(shuffled.filter((o) => !o.correct)).slice(0, Math.max(0, max - correct.length));
  return shuffle([...correct, ...wrong]);
}

/**
 * Lampeggio a tutto schermo (cue visivo per chi ha difficoltà audio).
 * Non interattivo: NON intercetta i tocchi.
 */
export function flashCue(scene: Phaser.Scene, cfg: EffectiveConfig, kind: 'ok' | 'bad'): void {
  if (!cfg.visualAudioCues) return;
  const color = kind === 'ok' ? 0x58d68d : 0xff5d5d;
  const gw = scene.scale.gameSize.width;
  const gh = scene.scale.gameSize.height;
  const r = scene.add.rectangle(gw / 2, gh / 2, gw, gh, color, 0).setDepth(400);
  scene.tweens.add({
    targets: r,
    alpha: 0.32,
    duration: 130,
    yoyo: true,
    repeat: 1,
    onComplete: () => r.destroy()
  });
}

/**
 * Riga interruttore per il pannello "regole una per una".
 * Il tocco agisce sull'intera riga (zona interattiva), non solo sul testo.
 */
export function makeToggle(
  scene: Phaser.Scene,
  cfg: EffectiveConfig,
  x: number,
  y: number,
  w: number,
  label: string,
  on: boolean,
  onTap: () => void
): void {
  const h = 32;
  const spec = fontSpec(cfg);
  const g = scene.add.graphics().setDepth(50);
  g.fillStyle(on ? 0xdff6e7 : 0xffffff, 0.96);
  g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 9);
  g.lineStyle(2, on ? 0x3aa564 : 0xc9d3e0, 1);
  g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 9);

  const dpi = window.devicePixelRatio || 1;
  const hiRes = Math.min(4, Math.max(dpi * 2, 2.5));

  const lbl = scene.add
    .text(x - w / 2 + 12, y, label, {
      fontFamily: spec.family,
      fontSize: `${Math.round(13 * cfg.fontScale)}px`,
      fontStyle: 'bold',
      color: '#000000',
      wordWrap: { width: w - 74, useAdvancedWrap: true },
      padding: { left: 4, right: 4, top: 2, bottom: 2 }
    })
    .setOrigin(0, 0.5)
    .setDepth(60);
  lbl.setResolution(hiRes);
  fitTextToBox(lbl, w - 74, h - 6, 10);
  const toggleTxt = scene.add
    .text(x + w / 2 - 12, y, on ? 'ON' : 'OFF', {
      fontFamily: spec.family,
      fontSize: `${Math.min(15, Math.round(13 * cfg.fontScale))}px`,
      color: on ? '#064e22' : '#000000',
      fontStyle: 'bold',
      padding: { left: 4, right: 4, top: 2, bottom: 2 }
    })
    .setOrigin(1, 0.5)
    .setDepth(60);
  toggleTxt.setResolution(hiRes);

  const zona = scene.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
  zona.setDepth(70);
  let premuto = false;
  zona.on('pointerdown', () => {
    premuto = true;
  });
  zona.on('pointerout', () => {
    premuto = false;
  });
  zona.on('pointerup', () => {
    if (!premuto) return;
    premuto = false;
    onTap();
  });
  const unregister = registerMobileItem(scene, {
    kind: 'toggle',
    label: () => label,
    state: () => (on ? 'on' : 'off'),
    enabled: () => zona.active,
    x: () => x,
    y: () => y,
    w: () => w,
    h: () => h,
    trigger: () => {
      if (zona.active) onTap();
    }
  });
  zona.once(Phaser.GameObjects.Events.DESTROY, unregister);
}

/**
 * Banner di feedback (sotto, sopra la terra). Il chiamante decide la durata
 * e chiama dispose() (con fade out).
 */
export function showBanner(
  scene: Phaser.Scene,
  cfg: EffectiveConfig,
  text: string,
  sub: string | null,
  kind: 'ok' | 'bad',
  at?: { x?: number; y?: number }
): { dispose(): void } {
  // `at` permette di spostare il feedback dove non copre il contenuto:
  // nelle prove a opzioni va sopra i bottoni, nelle altre in basso.
  const w = 660;
  const h = sub ? 132 : 92;
  const cx = at?.x ?? scene.scale.gameSize.width / 2;
  const cy = at?.y ?? 468;
  const spec = fontSpec(cfg);
  const g = scene.add.graphics().setDepth(300);
  // scheda bianca con ombra morbida e bordo colorato
  g.fillStyle(0x3b4a5a, 0.16);
  g.fillRoundedRect(cx - w / 2 + 4, cy - h / 2 + 6, w, h, 20);
  g.fillStyle(0xffffff, 0.97);
  g.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, 20);
  g.lineStyle(4, kind === 'ok' ? 0x3aa564 : 0xe05a5a, 1);
  g.strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, 20);

  const dpi = window.devicePixelRatio || 1;
  const hiRes = Math.min(4, Math.max(dpi * 2, 2.5));

  const t1 = scene.add
    .text(cx, sub ? cy - 27 : cy, text, {
      fontFamily: spec.family,
      fontSize: `${Math.round(27 * cfg.fontScale)}px`,
      fontStyle: 'bold',
      color: '#000000',
      align: 'center',
      wordWrap: { width: w - 64, useAdvancedWrap: true },
      letterSpacing: spaziaturaPer(spec, text),
      padding: { left: 8, right: 8, top: 4, bottom: 4 }
    })
    .setOrigin(0.5)
    .setDepth(301);
  t1.setResolution(hiRes);

  let t2: Phaser.GameObjects.Text | null = null;
  if (sub) {
    t2 = scene.add
      .text(cx, cy + 32, sub, {
        fontFamily: spec.family,
        fontSize: `${Math.round(18 * cfg.fontScale)}px`,
        fontStyle: 'bold',
        color: '#1e293b',
        align: 'center',
        wordWrap: { width: w - 64, useAdvancedWrap: true },
        letterSpacing: spaziaturaPer(spec, sub),
        padding: { left: 8, right: 8, top: 4, bottom: 4 }
      })
      .setOrigin(0.5)
      .setDepth(301);
    t2.setResolution(hiRes);
  }

  const objs = [g, t1, ...(t2 ? [t2] : [])];
  scene.tweens.add({ targets: objs, alpha: 1, duration: 160 });
  return {
    dispose(): void {
      scene.tweens.add({
        targets: objs,
        alpha: 0,
        duration: 200,
        onComplete: () => {
          g.destroy();
          t1.destroy();
          if (t2) t2.destroy();
        }
      });
    }
  };
}

/**
 * Posizioni per le opzioni multiple in base al numero (2-4),
 * tenendo conto della scala degli obiettivi.
 */
export function optionLayout(n: number, scale: number, cx: number = 512): [number, number][] {
  const w = BTN_W * scale;
  const gap = 20 * scale;
  if (n <= 1) return [[cx, 356]];
  if (n === 2) return [[cx - w / 2 - gap, 356], [cx + w / 2 + gap, 356]];
  if (n === 3) return [[cx - w / 2 - gap, 308], [cx + w / 2 + gap, 308], [cx, 420]];
  return [
    [cx - w / 2 - gap, 308],
    [cx + w / 2 + gap, 308],
    [cx - w / 2 - gap, 420],
    [cx + w / 2 + gap, 420]
  ];
}
