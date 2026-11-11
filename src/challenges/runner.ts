/**
 * Modalità Runner: la domanda è un **cancello** piantato sulla pista. Il mondo
 * scorre, il cancello arriva da destra e frena davanti a Pico; solo allora si
 * può rispondere.
 *
 * In 2D le risposte sono cartelli sul posto. In 3D le porte sono solo
 * riferimenti visivi e le risposte stanno in una barra HTML in basso, sotto
 * Pico (`src/ui/runner-answers.ts`), così non coprono il personaggio né il
 * badge "?". Si risponde toccando la barra o allineando Pico e saltando.
 *
 * - risposta giusta → il cancello si illumina, Pico salta sulla testata, la
 *   corsa riparte e il cancello esce a sinistra;
 * - risposta sbagliata → il mondo resta fermo, la risposta trema, Pico
 *   inciampa e si riprova (fino a 3 tentativi, come nel quiz);
 * - nessun timer: chi ha bisogno di tempo può guardare le risposte quanto vuole.
 *
 * Le regole BES restano rispettate: numero di opzioni, font, scala del testo,
 * alto contrasto, suggerimento, ripetizione della domanda, ritmo lento.
 */
import Phaser from 'phaser';
import type { EffectiveConfig } from '../bes/resolver';
import type { ImageRound, Option, QuizRound } from '../content/types';
import { synth } from '../audio/synth';
import type { Gate3D, World3D } from '../art/three-world';
import { T } from '../art/palette';
import { mostraRisposteRunner, type RisposteRunner } from '../ui/runner-answers';
import { mostraHudRunner, nascondiHudRunner } from '../ui/runner-hud';
import { mostraComandiRunner, nascondiComandi } from '../ui/runner-controls';
import {
  MAX_ATTEMPTS,
  fitOptions,
  fitTextToBox,
  flashCue,
  fontSpec,
  makeButton,
  makeText,
  registerMobileItem,
  showBanner,
  spaziaturaPer,
  testoSemplice,
  type Btn,
  type Challenge,
  type ChallengeCallbacks
} from './ui';

type ChoiceRound = QuizRound | ImageRound;
type Kind = 'normal' | 'correct' | 'wrong' | 'dim';

/** Quello che il Runner chiede al mondo di gioco (Pico che corre e salta). */
export interface RunnerWorld {
  leap(x: number, y: number): void;
  stumble(): void;
  /** Velocità attuale dello scorrimento, in px/s. */
  speed(): number;
  /** Velocità desiderata: il mondo accelera o frena da solo. */
  setSpeed(px: number): void;
  /** Solo nel mondo 3D: il cancello è disegnato da Three.js. */
  openGate?(labels: string[]): Gate3D;
}

/** Velocità di crociera della corsa, px/s. */
const RUN_SPEED = 480;
/** Quanto spazio occupa la fila di cartelli, al massimo. */
const AVAIL = 820;
/** Bordo sinistro della fila quando il cancello è fermo. */
const LEFT = 170;
const GAP = 14;
const GATE_Y = 380;
const W = 1024;

interface Sign {
  root: Phaser.GameObjects.Container;
  w: number;
  h: number;
  setKind(k: Kind): void;
  setEnabled(b: boolean): void;
  onTap(cb: () => void): void;
  dispose(): void;
}

/** Un cartello del cancello: scheda bianca con etichetta grande. */
function makeSign(
  scene: Phaser.Scene,
  cfg: EffectiveConfig,
  lx: number,
  label: string,
  w: number
): Sign {
  const spec = fontSpec(cfg);
  const text = scene.add
    .text(0, 0, label, {
      fontFamily: spec.family,
      fontSize: `${Math.round(19 * cfg.fontScale)}px`,
      fontStyle: 'bold',
      color: cfg.highContrast ? '#000000' : T.body,
      align: 'center',
      wordWrap: { width: w - 34, useAdvancedWrap: true },
      letterSpacing: spaziaturaPer(spec, label)
    })
    .setOrigin(0.5);
  text.setResolution(Math.max(window.devicePixelRatio || 1, 2));
  fitTextToBox(text, w - 30, 82, 12);
  const h = Math.min(110, Math.max(70, Math.round(text.height) + 26));

  const card = scene.add.graphics();
  const draw = (kind: Kind): void => {
    card.clear();
    const bordo =
      kind === 'correct' ? 0x22b55b : kind === 'wrong' ? 0xe04848 : kind === 'dim' ? 0xc9d3e0 : 0x00a2e8;
    const corpo =
      kind === 'correct' ? 0xe6fff0 : kind === 'wrong' ? 0xffe6e6 : 0xffffff;
    // ombra morbida stile Sport
    card.fillStyle(0x005b8f, 0.16);
    card.fillRoundedRect(-w / 2 + 3, -h / 2 + 6, w, h, 20);
    // scheda porcellana Sport
    card.fillStyle(corpo, 0.98);
    card.fillRoundedRect(-w / 2, -h / 2, w, h, 20);
    // riflesso superiore glossy
    card.fillStyle(kind === 'normal' ? 0xeaf7ff : 0xffffff, 0.72);
    card.fillRoundedRect(-w / 2 + 6, -h / 2 + 5, w - 12, Math.round(h * 0.36), 14);
    // doppia ghiera Sport (Azzurro Sport esterno + bianco interno)
    card.lineStyle(3.5, bordo, 1);
    card.strokeRoundedRect(-w / 2, -h / 2, w, h, 20);
    card.lineStyle(1.5, 0xffffff, 0.95);
    card.strokeRoundedRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6, 17);
  };
  draw('normal');

  const root = scene.add.container(lx, 0, [card, text]).setName('segno');
  const margine = cfg.permissiveTouch ? 20 : 8;
  const hit = new Phaser.Geom.Rectangle(
    -w / 2 - margine,
    -h / 2 - margine,
    w + margine * 2,
    h + margine * 2
  );
  root.setInteractive(hit, Phaser.Geom.Rectangle.Contains);

  let enabled = true;
  let currentKind: Kind = 'normal';
  const tapCallbacks: Array<() => void> = [];
  let premuto = false;
  root.on('pointerdown', () => {
    premuto = true;
  });
  root.on('pointerout', () => {
    premuto = false;
  });
  root.on('pointerup', () => {
    const valido = premuto;
    premuto = false;
    if (enabled && valido) tapCallbacks.forEach((fn) => fn());
  });
  const unregister = registerMobileItem(scene, {
    kind: 'sign',
    label: () => label,
    state: () =>
      currentKind === 'correct'
        ? 'correct'
        : currentKind === 'wrong'
          ? 'wrong'
          : currentKind === 'dim' || !enabled
            ? 'disabled'
            : 'normal',
    enabled: () => enabled && root.active,
    x: () => lx,
    y: () => GATE_Y,
    w: () => 220,
    h: () => 64,
    trigger: () => {
      if (enabled && root.active) tapCallbacks.forEach((fn) => fn());
    }
  });
  return {
    root,
    w,
    h,
    setKind(k: Kind): void {
      currentKind = k;
      draw(k);
      root.setAlpha(k === 'dim' ? 0.55 : 1);
      text.setStyle({
        color: cfg.highContrast
          ? '#000000'
          : k === 'correct'
            ? T.ok
            : k === 'wrong'
              ? T.bad
              : k === 'dim'
                ? T.faint
                : T.body
      });
    },
    setEnabled(b: boolean): void {
      enabled = b;
      if (b) root.setInteractive(hit, Phaser.Geom.Rectangle.Contains);
      else root.disableInteractive();
    },
    onTap(cb: () => void): void {
      tapCallbacks.push(cb);
    },
    dispose(): void {
      unregister();
      root.removeAllListeners();
      root.destroy();
    }
  };
}

export class RunnerChallenge implements Challenge {
  private scene: Phaser.Scene;
  private round: ChoiceRound;
  private cfg: EffectiveConfig;
  private cb: ChallengeCallbacks;
  private world: RunnerWorld | null;

  private options: Option[];
  private signs: Sign[] = [];
  private objects: Phaser.GameObjects.GameObject[] = [];
  private timers: Phaser.Time.TimerEvent[] = [];
  private tweens: Phaser.Tweens.Tween[] = [];

  private gate: Phaser.GameObjects.Container | null = null;
  /** Cancello 3D (Three.js); in 2D resta null. */
  private gate3d: Gate3D | null = null;
  /** Risposte del Runner 3D: barra HTML in basso, sotto Pico. */
  private risposte3d: RisposteRunner | null = null;
  /** Input di corsa (tastiera, swipe, bottoni) attivo solo in 3D. */
  private inPausa = false;
  private rispostaGiusta = false;
  private pDown: { x: number; y: number } | null = null;
  /** Larghezza totale della fila di cartelli. */
  private totale = 0;
  /** Dove si ferma il centro del cancello. */
  private stopX = 512;
  private arrivato = false;
  private uscita = false;

  private promptText: Phaser.GameObjects.Text;
  private hintText: Phaser.GameObjects.Text | null = null;
  private reBtn: Btn | null = null;

  private attempts = 0;
  private locked = false;
  private revealed = false;

  constructor(
    scene: Phaser.Scene,
    round: ChoiceRound,
    cfg: EffectiveConfig,
    cb: ChallengeCallbacks,
    world: RunnerWorld | null = null
  ) {
    this.scene = scene;
    this.round = round;
    this.cfg = cfg;
    this.cb = cb;
    this.world = world;

    this.options = fitOptions(round.options, cfg.maxOptions);

    // ── Domanda ──
    const promptX = cfg.repeatPrompt ? 450 : 512;
    const promptWrap = cfg.repeatPrompt ? 640 : 780;
    this.promptText = makeText(scene, promptX, 66, testoSemplice(round.prompt, cfg), cfg, {
      size: 25,
      bold: true,
      color: '#000000',
      wrap: promptWrap,
      maxH: 54
    });
    if (round.hint && cfg.showHintUpfront) this.showHintNow();

    // ── Icona (prove di riconoscimento immagine) ──
    if (round.type === 'image') {
      const key = `icon-${round.icon}`;
      if (scene.textures.exists(key)) {
        this.objects.push(scene.add.image(512, 184, key).setScale(1.55).setDepth(8));
      }
    }

    // ── Il cancello ──
    // In 3D lo disegna Three.js: porte senza etichette, risposte HTML in basso.
    // In 2D è un container Phaser che entra da destra.
    const treD = this.world as World3D | null;
    if (treD?.openGate) {
      const labels = this.options.map((o) => o.label);
      const g = treD.openGate(labels);
      this.gate3d = g;
      // Le etichette stanno in basso, sotto Pico: non coprono il personaggio
      // né il simbolo "?" del cancello. Si mostrano solo a varco fermo.
      this.risposte3d = mostraRisposteRunner(labels, (i) => this.onPick(i));
      // Stessa risposta anche allineando Pico alla porta e saltando: la barra
      // in basso è una scorciatoia, non l'unico modo.
      g.onPick((i) => this.onPick(i));
      mostraHudRunner();
      this.mostraComandi();
      this.attivaInput3D();
      g.onArrive(() => {
        this.arrivato = true;
        this.risposte3d?.abilita();
        nascondiComandi();
      });
    } else {
      this.creaCancello2D();
    }

    scene.events.on(Phaser.Scenes.Events.UPDATE, this.aggiorna);
    scene.events.on(Phaser.Scenes.Events.PAUSE, this.nascondiRisposte);
    scene.events.on(Phaser.Scenes.Events.RESUME, this.mostraRisposte);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.pulizia);

    // ── Rileggi (regola repeatPrompt) ──
    if (cfg.repeatPrompt) {
      this.reBtn = makeButton(scene, cfg, 900, 68, 'Rileggi', {
        scale: 0.52,
        maxTargetScale: 1.04,
        depth: 12
      });
      this.reBtn.onTap(() => {
        const banner = showBanner(scene, cfg, round.prompt, null, 'ok', { y: 186 });
        this.schedule(() => banner.dispose(), 2200);
      });
    }
  }

  // ── Cancello 2D: cartelli in fila, pali e traversa ──────────────

  private creaCancello2D(): void {
    const scene = this.scene;
    const cfg = this.cfg;
    const n = this.options.length;
    const larghezza = Math.min(210, (AVAIL - (n - 1) * GAP) / n);
    this.totale = n * larghezza + (n - 1) * GAP;
    // Centrato, ma se è troppo largo resta dentro lo schermo.
    this.stopX = Math.max(512, LEFT + this.totale / 2);

    const x0 = -this.totale / 2 + larghezza / 2;
    this.options.forEach((opt, i) => {
      const sign = makeSign(scene, cfg, x0 + i * (larghezza + GAP), opt.label, larghezza);
      sign.onTap(() => this.onPick(i));
      // Fino all'arrivo i cartelli non si toccano: la corsa deve arrivare.
      sign.setEnabled(false);
      this.signs.push(sign);
    });

    const maxH = Math.max(...this.signs.map((s) => s.h));
    const crossY = -maxH / 2 - 30;
    const half = this.totale / 2;
    const fondo = 120;

    const struttura = scene.add.graphics();
    // pali da stadio Sport (bianco porcellana con bande Azzurro Sport)
    struttura.fillStyle(0x005b8f, 0.15);
    struttura.fillEllipse(-half - 17, fondo + 3, 34, 10);
    struttura.fillEllipse(half + 17, fondo + 3, 34, 10);
    struttura.fillStyle(0xffffff, 0.98);
    struttura.fillRoundedRect(-half - 23, crossY, 12, fondo - crossY, 6);
    struttura.fillRoundedRect(half + 11, crossY, 12, fondo - crossY, 6);
    struttura.lineStyle(2, 0x00a2e8, 0.85);
    struttura.strokeRoundedRect(-half - 23, crossY, 12, fondo - crossY, 6);
    struttura.strokeRoundedRect(half + 11, crossY, 12, fondo - crossY, 6);
    // traversa superiore stile portale Sport (bianco + Azzurro Sport + oro)
    struttura.fillStyle(0x005b8f, 0.16);
    struttura.fillRoundedRect(-half - 30, crossY + 5, 2 * (half + 30), 18, 9);
    struttura.fillStyle(0x00a2e8, 1);
    struttura.fillRoundedRect(-half - 30, crossY - 5, 2 * (half + 30), 18, 9);
    struttura.fillStyle(0x6cd4ff, 0.65);
    struttura.fillRoundedRect(-half - 24, crossY - 3, 2 * (half + 24), 7, 4);
    struttura.lineStyle(2.5, 0xffffff, 0.95);
    struttura.strokeRoundedRect(-half - 30, crossY - 5, 2 * (half + 30), 18, 9);
    // medaglione centrale "?" stile Sport
    struttura.fillStyle(0xffffff, 1);
    struttura.fillCircle(0, crossY + 4, 22);
    struttura.lineStyle(4, 0x00a2e8, 1);
    struttura.strokeCircle(0, crossY + 4, 22);
    struttura.lineStyle(2, 0xffd93d, 0.95);
    struttura.strokeCircle(0, crossY + 4, 17);

    const badge = scene.add
      .text(0, crossY + 4, '?', {
        fontFamily: fontSpec(cfg).family,
        fontSize: '24px',
        fontStyle: 'bold',
        color: cfg.highContrast ? '#000000' : '#2b7fd4'
      })
      .setOrigin(0.5);
    badge.setResolution(Math.max(window.devicePixelRatio || 1, 2));

    this.gate = scene.add
      .container(W + this.totale / 2 + 40, GATE_Y, [
        struttura,
        ...this.signs.map((s) => s.root),
        badge
      ])
      .setDepth(20)
      .setName('cancello');
  }

  // ── Avvicinamento ──────────────────────────────────────────────

  /**
   * Il cancello avanza con la stessa velocità del mondo e frena negli ultimi
   * metri. Usare la velocità vera del mondo (non un timer) tiene sincronizzati
   * pista, cartelli e Pico: si fermano insieme.
   */
  // ── Input di corsa (solo 3D) ───────────────────────────────────

  private spostaCorsia = (delta: number): void => {
    const w = this.world as World3D | null;
    if (!w?.setCorsia) return;
    w.setCorsia(w.corsia() + delta);
  };

  private salta3D = (): void => {
    (this.world as World3D | null)?.salta?.();
  };

  private scivola3D = (): void => {
    (this.world as World3D | null)?.scivola?.();
  };

  private mostraComandi = (): void => {
    if (!this.gate3d) return;
    mostraComandiRunner({
      onCorsia: this.spostaCorsia,
      onSalta: this.salta3D,
      onScivola: this.scivola3D
    });
  };

  private togliComandi = (): void => {
    nascondiComandi();
  };

  private attivaInput3D(): void {
    window.addEventListener('keydown', this.onTasto3D);
    window.addEventListener('pointerdown', this.onPuntaGiu);
    window.addEventListener('pointerup', this.onPuntaSu);
  }

  private onTasto3D = (e: KeyboardEvent): void => {
    if (this.inPausa || !this.gate3d) return;
    const k = e.key;
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') {
      e.preventDefault();
      this.spostaCorsia(-1);
    } else if (k === 'ArrowRight' || k === 'd' || k === 'D') {
      e.preventDefault();
      this.spostaCorsia(1);
    } else if (k === ' ' || k === 'ArrowUp' || k === 'w' || k === 'W') {
      e.preventDefault();
      this.salta3D();
    } else if (k === 'ArrowDown' || k === 's' || k === 'S') {
      e.preventDefault();
      this.scivola3D();
    }
  };

  private onPuntaGiu = (e: PointerEvent): void => {
    if (this.inPausa || !this.gate3d) return;
    const t = e.target as HTMLElement | null;
    if (t?.closest('button')) return;
    this.pDown = { x: e.clientX, y: e.clientY };
  };

  private onPuntaSu = (e: PointerEvent): void => {
    const partenza = this.pDown;
    this.pDown = null;
    if (!partenza || this.inPausa || !this.gate3d) return;
    const dx = e.clientX - partenza.x;
    const dy = e.clientY - partenza.y;
    if (Math.abs(dx) < 36 && Math.abs(dy) < 36) return;
    if (Math.abs(dx) > Math.abs(dy)) this.spostaCorsia(dx > 0 ? 1 : -1);
    else if (dy < 0) this.salta3D();
    else this.scivola3D();
  };

  private nascondiRisposte = (): void => {
    this.inPausa = true;
    this.pDown = null;
    this.risposte3d?.nascondi();
    this.togliComandi();
    // La scheda di pausa sta sopra al mondo: l'HUD non deve restare a galla.
    nascondiHudRunner();
  };

  private mostraRisposte = (): void => {
    this.inPausa = false;
    if (this.gate3d) mostraHudRunner();
    if (this.arrivato && !this.rispostaGiusta && !this.revealed) {
      this.risposte3d?.mostra();
    } else {
      this.mostraComandi();
    }
  };

  private aggiorna = (_time: number, deltaMs: number): void => {
    // In 3D il cancello e la frenata li gestisce Three.js.
    if (this.gate3d) return;
    if (!this.gate || this.arrivato || this.uscita) return;
    const dt = Math.min(deltaMs, 50);
    const dist = Math.max(0, this.gate.x - this.stopX);
    // Curva di frenata: v = √(2·a·s), con a = 900 px/s².
    const frenata = Math.sqrt(2 * 900 * dist);
    this.world?.setSpeed(Math.min(RUN_SPEED, frenata));

    const v = this.world?.speed() ?? 0;
    this.gate.x -= (v * dt) / 1000;

    if (this.gate.x <= this.stopX + 0.5 || v < 2) {
      this.gate.x = this.stopX;
      this.arrivato = true;
      this.world?.setSpeed(0);
      this.signs.forEach((s) => s.setEnabled(true));
    }
  };

  // ── Interazione ────────────────────────────────────────────────

  private onPick(i: number): void {
    if (this.locked || this.revealed || !this.arrivato) return;
    if (!this.gate && !this.gate3d) return;
    const sign = this.signs[i];
    const correct = this.options[i].correct;
    const tre = this.gate3d;

    this.locked = true;
    this.rispostaGiusta = correct;
    synth.play('click');
    const wx = this.gate && sign ? this.gate.x + sign.root.x : 0;
    const wy = this.gate && sign ? this.gate.y + sign.root.y + sign.h / 2 + 24 : 0;
    this.world?.leap(wx, wy);

    if (correct) {
      if (tre) {
        // Three.js: porta verde, salto, stelline, cancello che esce.
        tre.markCorrect(i);
        this.risposte3d?.segna(i, 'giusto');
        this.risposte3d?.disabilita();
        this.schedule(() => {
          this.risposte3d?.nascondi();
          this.mostraComandi();
        }, 650);
      } else if (sign) {
        sign.setKind('correct');
        this.signs.forEach((s, j) => {
          if (j !== i) s.setKind('dim');
          s.setEnabled(false);
        });
        this.burst(wx, wy);
        // La corsa riparte e il cancello resta indietro, a sinistra.
        this.world?.setSpeed(560);
        this.esci();
      }
      synth.play('correct');
      flashCue(this.scene, this.cfg, 'ok');
      this.cb.onCorrect();
      return;
    }

    // ── Errore ──
    this.attempts++;
    if (tre) {
      tre.markWrong(i);
      this.risposte3d?.segna(i, 'sbagliato');
      this.risposte3d?.disabilita();
    } else if (sign) {
      sign.setKind('wrong');
      this.shake(sign);
      this.world?.stumble();
    }
    synth.play('wrong');
    flashCue(this.scene, this.cfg, 'bad');
    this.cb.onWrong(this.attempts);

    if (this.attempts === 1 && !this.cfg.showHintUpfront) this.showHintNow();

    if (this.attempts >= MAX_ATTEMPTS) {
      this.schedule(() => this.reveal(), 600);
      return;
    }

    const explain = this.cfg.showExplanationOnWrong && this.round.explanation;
    const delay = explain ? 2000 : 950;
    if (explain) {
      const banner = showBanner(
        this.scene,
        this.cfg,
        'Quasi! Guarda la spiegazione',
        testoSemplice(this.round.explanation!, this.cfg),
        'bad',
        { y: 186 }
      );
      this.schedule(() => banner.dispose(), delay - 250);
    }
    this.schedule(() => {
      if (this.revealed) return;
      if (tre) {
        tre.reset();
        this.risposte3d?.pulisci();
        this.risposte3d?.abilita();
      } else {
        sign?.setKind('normal');
      }
      this.locked = false;
    }, delay);
  }

  /** Il cancello superato esce a sinistra mentre il mondo riparte. */
  private esci(): void {
    if (!this.gate) return;
    this.uscita = true;
    this.tweens.push(
      this.scene.tweens.add({
        targets: this.gate,
        x: -this.totale / 2 - 160,
        alpha: 0,
        duration: 520,
        ease: 'Cubic.easeIn'
      })
    );
  }

  /** Stelline dal cartello indovinato (coordinate di mondo). */
  private burst(x: number, y: number): void {
    for (let i = 0; i < 6; i++) {
      const ang = (Math.PI * 2 * i) / 6 - Math.PI / 2;
      const stella = this.scene.add.image(x, y, 'star').setScale(0.34).setDepth(30);
      this.objects.push(stella);
      this.tweens.push(
        this.scene.tweens.add({
          targets: stella,
          x: x + Math.cos(ang) * 70,
          y: y + Math.sin(ang) * 60,
          alpha: 0,
          duration: 620,
          ease: 'Quad.easeOut',
          onComplete: () => stella.destroy()
        })
      );
    }
  }

  private shake(sign: Sign): void {
    const baseX = sign.root.x;
    this.tweens.push(
      this.scene.tweens.add({
        targets: sign.root,
        x: baseX + 7,
        duration: 60,
        yoyo: true,
        repeat: 3,
        ease: 'Sine.easeInOut',
        onComplete: () => sign.root.setX(baseX)
      })
    );
  }

  private showHintNow(): void {
    if (this.hintText || !this.round.hint) return;
    this.hintText = makeText(this.scene, 512, 112, `💡 ${testoSemplice(this.round.hint, this.cfg)}`, this.cfg, {
      size: 14,
      color: '#c96a12',
      italic: true,
      wrap: 740,
      maxH: 24
    });
  }

  private schedule(fn: () => void, ms: number): void {
    const t = this.scene.time.delayedCall(ms, fn);
    this.timers.push(t);
  }

  /** Stacca listener e timer (la scena può chiudersi in qualsiasi momento). */
  private pulizia = (): void => {
    this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.aggiorna);
    this.scene.events.off(Phaser.Scenes.Events.PAUSE, this.nascondiRisposte);
    this.scene.events.off(Phaser.Scenes.Events.RESUME, this.mostraRisposte);
    this.scene.events.off(Phaser.Scenes.Events.SHUTDOWN, this.pulizia);
    window.removeEventListener('keydown', this.onTasto3D);
    window.removeEventListener('pointerdown', this.onPuntaGiu);
    window.removeEventListener('pointerup', this.onPuntaSu);
    nascondiHudRunner();
    this.togliComandi();
    this.timers.forEach((t) => t.remove(false));
    this.timers = [];
    this.tweens.forEach((t) => t.remove());
    this.tweens = [];
  };

  // ── Contratto Challenge ────────────────────────────────────────

  reveal(): void {
    if (this.revealed) return;
    this.revealed = true;
    this.locked = true;
    this.timers.forEach((t) => t.remove(false));
    this.timers = [];
    if (this.gate3d) {
      const giusta = this.options.findIndex((o) => o.correct);
      this.gate3d.reveal(giusta);
      this.risposte3d?.segna(giusta, 'giusto');
      this.risposte3d?.disabilita();
      this.schedule(() => {
        this.risposte3d?.nascondi();
        this.mostraComandi();
      }, 900);
      return;
    }
    this.signs.forEach((s, i) => {
      s.setKind(this.options[i].correct ? 'correct' : 'dim');
      s.setEnabled(false);
    });
  }

  lock(): void {
    this.locked = true;
    this.timers.forEach((t) => t.remove(false));
    this.timers = [];
    this.gate3d?.lock();
    this.risposte3d?.disabilita();
    this.togliComandi();
    this.signs.forEach((s) => s.setEnabled(false));
  }

  dispose(): void {
    this.locked = true;
    this.revealed = true;
    this.pulizia();
    this.gate3d?.dispose();
    this.gate3d = null;
    this.risposte3d?.dispose();
    this.risposte3d = null;
    nascondiHudRunner();
    this.togliComandi();
    this.signs.forEach((s) => s.dispose());
    this.signs = [];
    this.gate?.destroy();
    this.gate = null;
    this.promptText.destroy();
    if (this.hintText) this.hintText.destroy();
    if (this.reBtn) this.reBtn.dispose();
    this.objects.forEach((o) => o.destroy());
    this.objects = [];
  }
}
