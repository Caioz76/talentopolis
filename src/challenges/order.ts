/**
 * Prove di riordino (dragdrop "sort") e di sequenza (sequence).
 *
 * Meccanica condivisa:
 *  - una fila di slot numerati 1..N e una "pozza" di chip mescolate;
 *  - TAP: la chip va nel primo slot libero; toccare una chip già piazzata
 *    la riporta in pozza (si può ricominciare);
 *  - DRAG (se abilitato dalla regola BES e dal contenuto): la chip può
 *    essere lasciata direttamente su uno slot specifico vuoto;
 *  - quando tutti gli slot sono pieni → verifica automatica;
 *  - giusto → tutto verde; sbagliato → rosso + onWrong + chip tornano in
 *    pozza; 3 errori (o timeout) → reveal.
 */
import type Phaser from 'phaser';
import type { EffectiveConfig } from '../bes/resolver';
import type { DragDropRound, SequenceRound } from '../content/types';
import { synth } from '../audio/synth';
import { C } from '../art/palette';
import {
  MAX_ATTEMPTS,
  flashCue,
  makeButton,
  makeChip,
  makeSlot,
  makeText,
  shuffle,
  showBanner,
  testoSemplice,
  type Btn,
  type Challenge,
  type ChallengeCallbacks,
  type Chip
} from './ui';

type OrderRound = Extract<DragDropRound, { mode: 'sort' }> | SequenceRound;

const GAP = 16;
const SLOT_Y = 236;
const POOL_Y = 382;

export class OrderChallenge implements Challenge {
  private scene: Phaser.Scene;
  private round: OrderRound;
  private cfg: EffectiveConfig;
  private cb: ChallengeCallbacks;

  private items: string[];
  private n: number;
  private xs: number[];
  private slotW: number;

  private slots: (string | null)[] = [];
  private slotChips: (Chip | null)[] = [];
  private poolLabels: (string | null)[] = [];
  private poolChips: (Chip | null)[] = [];
  private labelOf = new Map<Chip, string>();
  private allChips: Chip[] = [];
  private slotRoots: { root: Phaser.GameObjects.Container; dispose(): void }[] = [];

  private attempts = 0;
  private locked = false;
  private revealed = false;
  private checking = false;
  /** Vero mentre un trascinamento vero (oltre la soglia) è in corso o si sta concludendo. */
  private trascinamentoInCorso = false;
  private timers: Phaser.Time.TimerEvent[] = [];

  private promptText: Phaser.GameObjects.Text;
  private hintText: Phaser.GameObjects.Text | null = null;
  private instrText: Phaser.GameObjects.Text | null = null;
  private reBtn: Btn | null = null;

  constructor(
    scene: Phaser.Scene,
    round: OrderRound,
    cfg: EffectiveConfig,
    cb: ChallengeCallbacks
  ) {
    this.scene = scene;
    this.round = round;
    this.cfg = cfg;
    this.cb = cb;

    this.items = round.type === 'dragdrop' ? (round.sortItems ?? []) : round.items;
    this.n = this.items.length;

    // ── Layout: chip adattive, al massimo 256 ──
    // A sinistra (fino a ~160 px logici) in orizzontale sta la barra HTML
    // Pausa/Esci: la fila resta tra MARGINE_SX e MARGINE_DX, centrata quando
    // c'è posto e spostata a destra quando le tessere sono tante (5-6).
    const MARGINE_SX = 162;
    const MARGINE_DX = 1016;
    const avail = MARGINE_DX - MARGINE_SX;
    this.slotW = Math.min(
      256,
      Math.max(100, Math.floor((avail - (this.n - 1) * GAP) / Math.max(1, this.n)))
    );
    const cx = scene.scale.gameSize.width / 2;
    const total = this.n * this.slotW + (this.n - 1) * GAP;
    const inizio = Math.max(MARGINE_SX, Math.min(cx - total / 2, MARGINE_DX - total));
    const x0 = inizio + this.slotW / 2;
    this.xs = Array.from({ length: this.n }, (_, i) => x0 + i * (this.slotW + GAP));

    // ── Prompt / hint / istruzione ──
    const promptX = cfg.repeatPrompt ? cx - 62 : cx;
    const promptWrap = cfg.repeatPrompt ? 640 : 780;
    this.promptText = makeText(scene, promptX, 66, testoSemplice(round.prompt, cfg), cfg, {
      size: 25,
      bold: true,
      color: '#000000',
      wrap: promptWrap,
      maxH: 54
    });
    if (round.hint && cfg.showHintUpfront) {
      this.showHintNow();
    }
    const dragOk = this.dragAllowed();
    this.instrText = makeText(
      scene,
      cx,
      142,
      cfg.simpleLanguage
        ? `Metti nell'ordine da 1 a ${this.n}`
        : dragOk
          ? `Trascina (o tocca) gli elementi negli slot, dall'1 al ${this.n}`
          : `Tocca gli elementi nell'ordine giusto, dall'1 al ${this.n}`,
      cfg,
      { size: 14, bold: true, color: '#1e293b', wrap: 740, maxH: 22 }
    );

    // ── Slot numerati ──
    for (let i = 0; i < this.n; i++) {
      this.slotRoots.push(makeSlot(scene, cfg, this.xs[i], SLOT_Y, i + 1, { w: this.slotW, h: 86 }));
      this.slots.push(null);
      this.slotChips.push(null);
    }

    // ── Pozza: chip mescolate ──
    const order = shuffle(this.items);
    order.forEach((label, i) => {
      this.poolLabels.push(label);
      const chip = makeChip(scene, cfg, this.xs[i], POOL_Y, label, {
        w: this.slotW,
        h: 86,
        size: 18,
        depth: 20
      });
      this.poolChips.push(chip);
      this.labelOf.set(chip, label);
      this.allChips.push(chip);
      // un solo listener per chip: il comportamento dipende dalla posizione corrente
      chip.onTap(() => this.onChipTap(chip));
      if (dragOk) this.enableDrag(chip);
    });

    // ── Rileggi (regola repeatPrompt) ──
    if (cfg.repeatPrompt) {
      this.reBtn = makeButton(scene, cfg, cx + 388, 68, 'Rileggi', {
        scale: 0.52,
        maxTargetScale: 1.04,
        depth: 12
      });
      this.reBtn.onTap(() => {
        if (this.locked) return;
        synth.play('click');
        const banner = showBanner(scene, cfg, this.round.prompt, null, 'ok');
        this.schedule(() => banner.dispose(), 2200);
      });
    }
  }

  /** Mostra l'hint (una sola volta). */
  private showHintNow(): void {
    if (this.hintText || !this.round.hint) return;
    this.hintText = makeText(this.scene, this.scene.scale.gameSize.width / 2, 112, `💡 ${testoSemplice(this.round.hint, this.cfg)}`, this.cfg, {
      size: 14,
      color: C.orangeDeep,
      italic: true,
      wrap: 740,
      maxH: 24
    });
  }

  /** Il trascinamento è permesso solo se la regola BES e il contenuto lo vogliono. */
  private dragAllowed(): boolean {
    if (!this.cfg.dragEnabled) return false;
    if (this.round.type === 'sequence') return this.round.direction === 'drag';
    return true; // dragdrop "sort" è per natura un drag&drop
  }

  // ── Interazione ────────────────────────────────────────────────

  private onChipTap(chip: Chip): void {
    if (this.locked || this.checking) return;
    // Il rilascio di un trascinamento fa scattare anche `pointerup` sulla
    // tessera: non è un tocco, lo gestisce `enableDrag`.
    if (this.trascinamentoInCorso) return;
    synth.play('click');
    const s = this.slotIndex(chip);
    if (s >= 0) {
      // già piazzata → torna in pozza
      this.moveToPool(chip);
      return;
    }
    const target = this.firstEmptySlot();
    if (target === -1) return;
    this.moveToSlot(chip, target);
    this.maybeCheck();
  }

  private enableDrag(chip: Chip): void {
    chip.onDragStart?.((p: Phaser.Input.Pointer) => {
      if (this.locked || this.checking) return;
      synth.play('pickup');
      const root = chip.root;
      const homeX = root.x;
      const homeY = root.y;
      const wasInSlot = this.slotIndex(chip) >= 0;
      root.setDepth(500);

      // Un TOCCO non è un trascinamento: sotto questa soglia lascia fare a
      // onChipTap, altrimenti il rilascio rimanderebbe la tessera nella pozza.
      const SOGLIA = 10;
      const startX = p.x;
      const startY = p.y;
      let trascinato = false;

      const onMove = (pe: Phaser.Input.Pointer) => {
        if (!trascinato && Math.hypot(pe.x - startX, pe.y - startY) < SOGLIA) return;
        trascinato = true;
        this.trascinamentoInCorso = true;
        root.setPosition(pe.x, pe.y);
      };
      let done = false;
      const onUp = (pe: Phaser.Input.Pointer) => {
        if (done) return;
        done = true;
        this.scene.input.off('pointermove', onMove);
        this.scene.input.off('pointerup', onUp);
        this.scene.input.off('pointerupoutside', onUp);
        if (!trascinato) {
          // era un tocco: onChipTap ha già spostato la tessera
          root.setDepth(wasInSlot ? 21 : 20);
          return;
        }
        // Il `pointerup` della tessera può arrivare subito dopo: resta
        // "in trascinamento" fino al prossimo giro, così non conta come tocco.
        this.scene.time.delayedCall(0, () => {
          this.trascinamentoInCorso = false;
        });
        const s = this.locked || this.checking ? -1 : this.slotAt(pe.x, pe.y);
        if (s !== -1) {
          synth.play('drop');
          this.moveToSlot(chip, s);
          this.maybeCheck();
        } else {
          // rimbalza nella posizione di partenza
          root.setDepth(wasInSlot ? 21 : 20);
          this.scene.tweens.add({ targets: root, x: homeX, y: homeY, duration: 160 });
        }
      };
      this.scene.input.on('pointermove', onMove);
      this.scene.input.once('pointerup', onUp);
      this.scene.input.once('pointerupoutside', onUp);
    });
  }

  // ── Movimenti ──────────────────────────────────────────────────

  private slotIndex(chip: Chip): number {
    for (let i = 0; i < this.slotChips.length; i++) {
      if (this.slotChips[i] === chip) return i;
    }
    return -1;
  }

  private poolIndex(chip: Chip): number {
    for (let i = 0; i < this.poolChips.length; i++) {
      if (this.poolChips[i] === chip) return i;
    }
    return -1;
  }

  private firstEmptySlot(): number {
    return this.slots.findIndex((s) => s === null);
  }

  /** Slot vuoto (se c'è) sotto il punto dato. */
  private slotAt(x: number, y: number): number {
    const hw = this.slotW / 2 + 14;
    for (let i = 0; i < this.n; i++) {
      if (
        this.slots[i] === null &&
        Math.abs(x - this.xs[i]) <= hw &&
        Math.abs(y - SLOT_Y) <= 58
      ) {
        return i;
      }
    }
    return -1;
  }

  private moveToSlot(chip: Chip, s: number): void {
    const label = this.labelOf.get(chip) ?? '';
    // rimuovi da pozza, se ci sei
    const pi = this.poolIndex(chip);
    if (pi >= 0) {
      this.poolLabels[pi] = null;
      this.poolChips[pi] = null;
    }
    // ...e dallo slot precedente, se la tessera era già piazzata (drag slot→slot)
    const prev = this.slotIndex(chip);
    if (prev >= 0 && prev !== s) {
      this.slots[prev] = null;
      this.slotChips[prev] = null;
    }
    this.slots[s] = label;
    this.slotChips[s] = chip;
    chip.root.setPosition(this.xs[s], SLOT_Y);
    chip.root.setDepth(21);
    chip.setTint(null);
  }

  private moveToPool(chip: Chip): void {
    const label = this.labelOf.get(chip) ?? '';
    const s = this.slotIndex(chip);
    if (s >= 0) {
      this.slots[s] = null;
      this.slotChips[s] = null;
    }
    let j = this.poolChips.findIndex((c) => c === null);
    if (j === -1) {
      // pozza piena (impossibile se uno slot è libero), fallback: ultima
      j = this.poolChips.length - 1;
      this.poolLabels[j] = null;
      this.poolChips[j] = null;
    }
    this.poolLabels[j] = label;
    this.poolChips[j] = chip;
    chip.root.setPosition(this.xs[j], POOL_Y);
    chip.root.setDepth(20);
    chip.setTint(null);
  }

  // ── Verifica ───────────────────────────────────────────────────

  private maybeCheck(): void {
    if (this.checking || this.locked) return;
    if (this.slots.some((s) => s === null)) return;
    this.checking = true;
    this.schedule(() => this.check(), 450);
  }

  private check(): void {
    this.checking = false;
    if (this.locked) return;
    const ok = this.slots.every((s, i) => s === this.items[i]);
    if (ok) {
      this.succeed();
      return;
    }
    this.attempts++;
    synth.play('wrong');
    flashCue(this.scene, this.cfg, 'bad');
    // evidenzia gli slot sbagliati
    this.slots.forEach((s, i) => {
      if (s !== this.items[i] && this.slotChips[i]) this.slotChips[i]!.setWrong();
    });
    this.cb.onWrong(this.attempts);

    // hint "tardivo" (regola showHintUpfront=false)
    if (this.attempts === 1 && !this.cfg.showHintUpfront) this.showHintNow();

    if (this.attempts >= MAX_ATTEMPTS) {
      this.locked = true;
      this.schedule(() => this.reveal(), 700);
      return;
    }
    // lascia il tempo di "vedere" l'errore, poi tutto torna in pozza
    this.checking = true;
    this.schedule(() => {
      this.checking = false;
      if (this.locked) return;
      for (let i = 0; i < this.n; i++) {
        if (this.slotChips[i]) this.moveToPool(this.slotChips[i]!);
      }
    }, 1100);
  }

  private succeed(): void {
    if (this.locked) return;
    this.locked = true;
    synth.play('correct');
    flashCue(this.scene, this.cfg, 'ok');
    this.slotChips.forEach((c) => {
      if (c) c.setCorrect();
    });
    this.poolChips.forEach((c) => {
      if (c) c.setDim();
    });
    this.cb.onCorrect();
  }

  /** Mostra la sequenza corretta negli slot. */
  reveal(): void {
    if (this.revealed) return;
    this.revealed = true;
    this.locked = true;
    this.checking = false;
    this.clearTimers();
    // riporta ogni chip al suo posto corretto
    this.items.forEach((label, i) => {
      const chip = [...this.labelOf.entries()].find(([, l]) => l === label)?.[0];
      if (chip) {
        this.slots[i] = label;
        this.slotChips[i] = chip;
        chip.root.setPosition(this.xs[i], SLOT_Y);
        chip.root.setDepth(21);
        chip.setCorrect();
        chip.setEnabled(false);
      }
    });
    this.poolChips.forEach((c) => {
      if (c) {
        c.setDim();
        c.setEnabled(false);
      }
    });
  }

  lock(): void {
    this.locked = true;
    this.checking = false;
    this.clearTimers();
  }

  dispose(): void {
    this.locked = true;
    this.revealed = true;
    this.clearTimers();
    this.allChips.forEach((c) => c.dispose());
    this.allChips = [];
    this.slotRoots.forEach((s) => s.dispose());
    this.slotRoots = [];
    this.promptText.destroy();
    if (this.hintText) this.hintText.destroy();
    if (this.instrText) this.instrText.destroy();
    if (this.reBtn) this.reBtn.dispose();
  }

  private schedule(fn: () => void, ms: number): void {
    this.timers.push(this.scene.time.delayedCall(ms, fn));
  }

  private clearTimers(): void {
    this.timers.forEach((t) => t.remove(false));
    this.timers = [];
  }
}
