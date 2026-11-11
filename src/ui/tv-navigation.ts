/**
 * Navigazione da Telecomando Smart TV (D-Pad & Tasti Azione) e Tastiera.
 *
 * Consente di navigare fluidamente tra tutti i pulsanti e le opzioni del gioco
 * utilizzando le frecce direzionali (Su, Giù, Sinistra, Destra), il tasto OK/Invio
 * per confermare, e il tasto Indietro/Esc per tornare indietro o mettere in pausa.
 *
 * Supporta i telecomandi di:
 *  - Samsung Smart TV (Tizen, VK_UP/DOWN/LEFT/RIGHT/ENTER/RETURN 10009)
 *  - LG Smart TV (webOS, VK_BACK 461)
 *  - Android TV / Google TV / Fire TV / Apple TV / Sony Bravia
 *  - Tastiere standard e telecomandi Bluetooth / Gamepad API.
 */
import Phaser from 'phaser';
import { getMobileItems, type MobileItem } from '../challenges/ui';
import { synth } from '../audio/synth';
import { isSmartTV } from './device';

export type NavDirection = 'up' | 'down' | 'left' | 'right';

interface BoxCoords {
  x: number;
  y: number;
  w: number;
  h: number;
}

export class TVNavigationManager {
  private game: Phaser.Game;
  private currentScene: Phaser.Scene | null = null;
  private focusedItemId: number | null = null;
  private focusGfx: Phaser.GameObjects.Graphics | null = null;
  private currentBox: BoxCoords = { x: 512, y: 288, w: 260, h: 70 };
  private targetBox: BoxCoords = { x: 512, y: 288, w: 260, h: 70 };
  private tween: Phaser.Tweens.Tween | null = null;
  private pulseTween: Phaser.Tweens.Tween | null = null;
  private pulseScale = 1;
  private active = false;
  private lastGamepadPress = 0;

  constructor(game: Phaser.Game) {
    this.game = game;
    this.initListeners();
    // Se è rilevata una Smart TV, attiva subito la navigazione visiva
    if (isSmartTV()) {
      this.active = true;
    }
  }

  private initListeners(): void {
    window.addEventListener('keydown', this.handleKeyDown, { capture: true });
    window.addEventListener('pointerdown', this.handlePointerDown);

    // Controlla gamepad / telecomando ogni frame
    this.game.events.on(Phaser.Core.Events.STEP, this.update);
  }

  public destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown, { capture: true });
    window.removeEventListener('pointerdown', this.handlePointerDown);
    this.game.events.off(Phaser.Core.Events.STEP, this.update);
    this.cleanupGfx();
  }

  private handlePointerDown = (): void => {
    // Con mouse o dito l'anello di selezione non serve: sparisce finché non si
    // torna a usare i tasti. Su Smart TV (solo telecomando) resta sempre attivo.
    if (isSmartTV()) return;
    this.active = false;
    this.focusedItemId = null;
    this.cleanupGfx();
  };

  /**
   * Mappa dei codici tasti telecomando Smart TV.
   */
  private handleKeyDown = (e: KeyboardEvent): void => {
    const key = e.key;
    const code = e.keyCode || e.which;

    const isUp = key === 'ArrowUp' || key === 'Up' || code === 38 || code === 19;
    const isDown = key === 'ArrowDown' || key === 'Down' || code === 40 || code === 20;
    const isLeft = key === 'ArrowLeft' || key === 'Left' || code === 37 || code === 21;
    const isRight = key === 'ArrowRight' || key === 'Right' || code === 39 || code === 22;
    const isEnter = key === 'Enter' || key === 'Select' || key === 'Ok' || code === 13 || code === 23 || code === 66;
    const isBack =
      key === 'Escape' ||
      key === 'Backspace' ||
      key === 'Back' ||
      key === 'GoBack' ||
      key === 'XF86Back' ||
      code === 27 ||
      code === 8 ||
      code === 4 ||
      code === 10009 || // Samsung Tizen Return
      code === 461; // LG webOS Back

    if (!isUp && !isDown && !isLeft && !isRight && !isEnter && !isBack) {
      return;
    }

    // Modalità attiva
    this.active = true;

    // 1. Se c'è una modale DOM aperta (es. scelta personaggi #sic-player-dialog), naviga lì
    const modalDialog = document.getElementById('sic-player-dialog');
    if (modalDialog) {
      this.handleModalNavigation(modalDialog, { isUp, isDown, isLeft, isRight, isEnter, isBack }, e);
      return;
    }

    // 2. Controllo scena attiva Phaser
    const scene = this.getActiveScene();
    if (!scene) return;

    // Se siamo durante la corsa attiva 3D (runner con tasti direzionali corsia),
    // non intercettiamo i tasti di sterzata della corsia
    const runnerChallenge = (scene as unknown as { challenge?: { gate3d?: boolean } }).challenge;
    if (runnerChallenge?.gate3d && (isLeft || isRight || isUp || isDown)) {
      return;
    }

    // Previeni lo scroll predefinito del browser TV
    e.preventDefault();
    e.stopPropagation();

    if (isBack) {
      this.handleBackAction(scene);
      return;
    }

    if (isEnter) {
      this.triggerFocused(scene);
      return;
    }

    let dir: NavDirection | null = null;
    if (isUp) dir = 'up';
    else if (isDown) dir = 'down';
    else if (isLeft) dir = 'left';
    else if (isRight) dir = 'right';

    if (dir) {
      this.moveFocus(scene, dir);
    }
  };

  /**
   * Gestione navigazione con telecomando all'interno della modale DOM "Chi Gioca?".
   */
  private handleModalNavigation(
    modal: HTMLElement,
    keys: { isUp: boolean; isDown: boolean; isLeft: boolean; isRight: boolean; isEnter: boolean; isBack: boolean },
    e: KeyboardEvent
  ): void {
    e.preventDefault();
    e.stopPropagation();

    if (keys.isBack) {
      const closeBtn = modal.querySelector<HTMLElement>('.sic-dialog-close');
      if (closeBtn) closeBtn.click();
      else modal.remove();
      return;
    }

    const focusables = Array.from(
      modal.querySelectorAll<HTMLElement>(
        '.sic-dialog-close, .sic-count-btn, .sic-slot-card, #sic-prof-select, .sic-token-choice:not([disabled]):not(.is-taken), #sic-team-save'
      )
    ).filter((el) => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });

    if (focusables.length === 0) return;

    let current = modal.querySelector<HTMLElement>('.tv-focused') || (document.activeElement as HTMLElement | null);
    if (!current || !focusables.includes(current)) {
      current = focusables.find((el) => el.id === 'sic-team-save') || focusables[0];
      this.setModalFocus(current);
      return;
    }

    if (keys.isEnter) {
      synth.play('click');
      current.click();
      return;
    }

    const currRect = current.getBoundingClientRect();
    const cx = currRect.left + currRect.width / 2;
    const cy = currRect.top + currRect.height / 2;

    let best: HTMLElement | null = null;
    let bestScore = Infinity;

    for (const cand of focusables) {
      if (cand === current) continue;
      const r = cand.getBoundingClientRect();
      const tx = r.left + r.width / 2;
      const ty = r.top + r.height / 2;
      const dx = tx - cx;
      const dy = ty - cy;

      if (keys.isUp && dy < -10) {
        const score = Math.abs(dy) + Math.abs(dx) * 1.8;
        if (score < bestScore) {
          bestScore = score;
          best = cand;
        }
      } else if (keys.isDown && dy > 10) {
        const score = Math.abs(dy) + Math.abs(dx) * 1.8;
        if (score < bestScore) {
          bestScore = score;
          best = cand;
        }
      } else if (keys.isLeft && dx < -10) {
        const score = Math.abs(dx) + Math.abs(dy) * 1.8;
        if (score < bestScore) {
          bestScore = score;
          best = cand;
        }
      } else if (keys.isRight && dx > 10) {
        const score = Math.abs(dx) + Math.abs(dy) * 1.8;
        if (score < bestScore) {
          bestScore = score;
          best = cand;
        }
      }
    }

    // Se non trova candidati diretti, scorre al successivo o precedente logico
    if (!best) {
      const curIdx = focusables.indexOf(current);
      if (keys.isDown || keys.isRight) {
        best = focusables[(curIdx + 1) % focusables.length];
      } else if (keys.isUp || keys.isLeft) {
        best = focusables[(curIdx - 1 + focusables.length) % focusables.length];
      }
    }

    if (best) {
      synth.play('tick');
      this.setModalFocus(best);
    }
  }

  private setModalFocus(el: HTMLElement): void {
    document.querySelectorAll('.tv-focused').forEach((n) => n.classList.remove('tv-focused'));
    el.classList.add('tv-focused');
    el.focus({ preventScroll: false });
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  /**
   * Azione Indietro / Esc dal telecomando.
   */
  private handleBackAction(scene: Phaser.Scene): void {
    const key = scene.scene.key;
    if (key === 'Game') {
      // In gioco apre la pausa: la GameScene ascolta `keydown-ESC` sul plugin
      // tastiera (l'evento nativo è stato fermato qui sopra, quindi va rilanciato).
      scene.input.keyboard?.emit('keydown-ESC');
      return;
    }

    if (key === 'Pause') {
      // In pausa riprende
      const items = getMobileItems(scene).filter((i) => i.enabled());
      const riprendi = items.find((i) => /continua|riprendi|torna al gioco/i.test(i.label()));
      if (riprendi) {
        synth.play('click');
        riprendi.trigger();
      }
      return;
    }

    // Nelle altre schermate cerca il pulsante "Torna" / "Indietro"
    const items = getMobileItems(scene).filter((i) => i.enabled());
    const tornaBtn = items.find((i) => /torna|indietro/i.test(i.label()));
    if (tornaBtn) {
      synth.play('click');
      tornaBtn.trigger();
    } else if (key !== 'Title') {
      synth.play('click');
      scene.scene.start('Title');
    }
  }

  /**
   * Sposta il focus nella direzione richiesta.
   */
  public moveFocus(scene: Phaser.Scene, dir: NavDirection): void {
    const items = getMobileItems(scene).filter((i) => i.enabled());
    if (items.length === 0) return;

    let current = items.find((i) => i.id === this.focusedItemId);
    if (!current) {
      current = this.pickDefaultItem(items, scene.scene.key);
      this.setFocus(scene, current);
      return;
    }

    const cx = current.x();
    const cy = current.y();

    let best: MobileItem | null = null;
    let bestScore = Infinity;

    for (const cand of items) {
      if (cand.id === current.id) continue;
      const tx = cand.x();
      const ty = cand.y();
      const dx = tx - cx;
      const dy = ty - cy;

      if (dir === 'up' && dy < -8) {
        const score = Math.abs(dy) + Math.abs(dx) * 2.2;
        if (score < bestScore) {
          bestScore = score;
          best = cand;
        }
      } else if (dir === 'down' && dy > 8) {
        const score = Math.abs(dy) + Math.abs(dx) * 2.2;
        if (score < bestScore) {
          bestScore = score;
          best = cand;
        }
      } else if (dir === 'left' && dx < -8) {
        const score = Math.abs(dx) + Math.abs(dy) * 2.2;
        if (score < bestScore) {
          bestScore = score;
          best = cand;
        }
      } else if (dir === 'right' && dx > 8) {
        const score = Math.abs(dx) + Math.abs(dy) * 2.2;
        if (score < bestScore) {
          bestScore = score;
          best = cand;
        }
      }
    }

    // Se non ci sono candidati nella direzione stretta (bordo), wrap intelligente
    if (!best) {
      if (dir === 'down') {
        // Torna all'elemento più in alto
        best = items.reduce((prev, curr) => (curr.y() < prev.y() ? curr : prev), items[0]);
      } else if (dir === 'up') {
        // Torna all'elemento più in basso
        best = items.reduce((prev, curr) => (curr.y() > prev.y() ? curr : prev), items[0]);
      } else if (dir === 'right') {
        // Torna all'elemento più a sinistra
        best = items.reduce((prev, curr) => (curr.x() < prev.x() ? curr : prev), items[0]);
      } else if (dir === 'left') {
        // Torna all'elemento più a destra
        best = items.reduce((prev, curr) => (curr.x() > prev.x() ? curr : prev), items[0]);
      }
    }

    if (best && best.id !== current.id) {
      synth.play('tick');
      this.setFocus(scene, best);
    }
  }

  /**
   * Seleziona l'elemento con focus.
   */
  public triggerFocused(scene: Phaser.Scene): void {
    const items = getMobileItems(scene).filter((i) => i.enabled());
    if (items.length === 0) return;

    let current = items.find((i) => i.id === this.focusedItemId);
    if (!current) {
      current = this.pickDefaultItem(items, scene.scene.key);
      this.setFocus(scene, current);
    }

    if (current) {
      synth.play('click');
      this.playTriggerPulse();
      current.trigger();
    }
  }

  /**
   * Sceglie l'elemento iniziale più logico per la scena.
   */
  private pickDefaultItem(items: MobileItem[], sceneKey: string): MobileItem {
    if (sceneKey === 'Title') {
      const gioca = items.find((i) => /gioca/i.test(i.label()));
      if (gioca) return gioca;
    } else if (sceneKey === 'Subject') {
      const primo = items.find((i) => /italiano/i.test(i.label()));
      if (primo) return primo;
    } else if (sceneKey === 'Pause') {
      const continua = items.find((i) => /continua|riprendi/i.test(i.label()));
      if (continua) return continua;
    } else if (sceneKey === 'Results') {
      const next = items.find((i) => /tappa successiva/i.test(i.label()));
      if (next) return next;
      const rigioca = items.find((i) => /rigioca/i.test(i.label()));
      if (rigioca) return rigioca;
    }

    // Default: elemento più vicino al centro o in alto
    return items.reduce((best, cur) => {
      const dCur = Math.hypot(cur.x() - 512, cur.y() - 300);
      const dBest = Math.hypot(best.x() - 512, best.y() - 300);
      return dCur < dBest ? cur : best;
    }, items[0]);
  }

  /**
   * Imposta il focus su un elemento specifico con animazione fluida.
   */
  private setFocus(scene: Phaser.Scene, item: MobileItem): void {
    this.focusedItemId = item.id;
    const x = item.x();
    const y = item.y();
    const w = item.w ? item.w() : 280;
    const h = item.h ? item.h() : 74;

    this.targetBox = { x, y, w, h };

    if (!this.focusGfx || this.currentScene !== scene) {
      this.currentBox = { ...this.targetBox };
      this.setupGfx(scene);
    } else {
      // Tween fluido di transizione tra i bottoni (stile console Sport)
      if (this.tween) this.tween.stop();
      this.tween = scene.tweens.add({
        targets: this.currentBox,
        x: this.targetBox.x,
        y: this.targetBox.y,
        w: this.targetBox.w,
        h: this.targetBox.h,
        duration: 110,
        ease: 'Sine.easeOut',
        onUpdate: () => this.drawFocusRing()
      });
    }

    this.drawFocusRing();
  }

  private setupGfx(scene: Phaser.Scene): void {
    this.cleanupGfx();
    this.currentScene = scene;

    this.focusGfx = scene.add.graphics();
    this.focusGfx.setDepth(9999);

    if (this.pulseTween) this.pulseTween.stop();
    this.pulseScale = 1;
    this.pulseTween = scene.tweens.add({
      targets: this,
      pulseScale: 1.05,
      duration: 650,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      onUpdate: () => this.drawFocusRing()
    });

    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.currentScene === scene) {
        this.cleanupGfx();
      }
    });
  }

  private cleanupGfx(): void {
    if (this.tween) {
      this.tween.stop();
      this.tween = null;
    }
    if (this.pulseTween) {
      this.pulseTween.stop();
      this.pulseTween = null;
    }
    if (this.focusGfx) {
      this.focusGfx.destroy();
      this.focusGfx = null;
    }
    this.currentScene = null;
  }

  /**
   * Disegna la cornice di selezione in stile Sport Arena ad alta visibilità da divano:
   *  - Alone esterno azzurro elettrico / ciano Sport (`#00f0ff`);
   *  - Doppia linea bianco ghiaccio;
   *  - 4 angolari dinamici da console di gioco.
   */
  private drawFocusRing(): void {
    if (!this.focusGfx || !this.active) return;
    this.focusGfx.clear();

    const { x, y, w, h } = this.currentBox;
    const pad = 6;
    const fw = (w + pad * 2) * this.pulseScale;
    const fh = (h + pad * 2) * this.pulseScale;
    const fx = x - fw / 2;
    const fy = y - fh / 2;
    const radius = Math.min(22, fh / 2);

    // 1. Alone morbido ciano elettrico
    this.focusGfx.lineStyle(6, 0x00f0ff, 0.42);
    this.focusGfx.strokeRoundedRect(fx, fy, fw, fh, radius);

    // 2. Linea interna bianca brillante
    this.focusGfx.lineStyle(3, 0xffffff, 0.95);
    this.focusGfx.strokeRoundedRect(fx, fy, fw, fh, radius);

    // 3. Angolari sportivi "Console Badge" (4 angoli stile HUD)
    const clen = Math.min(14, fw / 5);
    this.focusGfx.lineStyle(3.5, 0x00f0ff, 1);

    // Top-Left
    this.focusGfx.beginPath();
    this.focusGfx.moveTo(fx + radius, fy - 2);
    this.focusGfx.lineTo(fx + radius - clen, fy - 2);
    this.focusGfx.strokePath();

    // Top-Right
    this.focusGfx.beginPath();
    this.focusGfx.moveTo(fx + fw - radius, fy - 2);
    this.focusGfx.lineTo(fx + fw - radius + clen, fy - 2);
    this.focusGfx.strokePath();

    // Bottom-Left
    this.focusGfx.beginPath();
    this.focusGfx.moveTo(fx + radius, fy + fh + 2);
    this.focusGfx.lineTo(fx + radius - clen, fy + fh + 2);
    this.focusGfx.strokePath();

    // Bottom-Right
    this.focusGfx.beginPath();
    this.focusGfx.moveTo(fx + fw - radius, fy + fh + 2);
    this.focusGfx.lineTo(fx + fw - radius + clen, fy + fh + 2);
    this.focusGfx.strokePath();
  }

  private playTriggerPulse(): void {
    if (!this.focusGfx || !this.currentScene) return;
    this.currentScene.tweens.add({
      targets: this,
      pulseScale: 0.94,
      duration: 60,
      yoyo: true,
      ease: 'Quad.easeOut',
      onUpdate: () => this.drawFocusRing()
    });
  }

  /**
   * Monitoraggio frame-by-frame: sincronizza focus se la scena cambia
   * e intercetta D-pad Gamepad se collegati alla Smart TV.
   */
  private update = (): void => {
    const scene = this.getActiveScene();
    if (!scene) return;

    if (!this.active) {
      // Niente anello finché non si usano i tasti (vedi handlePointerDown).
    } else if (scene !== this.currentScene) {
      const items = getMobileItems(scene).filter((i) => i.enabled());
      if (items.length > 0) {
        const def = this.pickDefaultItem(items, scene.scene.key);
        this.setFocus(scene, def);
      } else {
        this.cleanupGfx();
      }
    } else if (this.focusGfx) {
      // Stessa scena ma l'elemento selezionato non c'è più (es. cambio prova
      // nella GameScene): l'anello non deve restare a galleggiare nel vuoto.
      const items = getMobileItems(scene).filter((i) => i.enabled());
      const corrente = items.find((i) => i.id === this.focusedItemId);
      if (!corrente) {
        if (items.length > 0) this.setFocus(scene, this.pickDefaultItem(items, scene.scene.key));
        else this.cleanupGfx();
      }
    }

    // Polling Gamepad (telecomandi Bluetooth Smart TV che espongono Gamepad API)
    this.pollGamepad(scene);
  };

  private pollGamepad(scene: Phaser.Scene): void {
    if (typeof navigator === 'undefined' || !navigator.getGamepads) return;
    const now = Date.now();
    if (now - this.lastGamepadPress < 180) return;

    const gamepads = navigator.getGamepads();
    for (let i = 0; i < gamepads.length; i++) {
      const gp = gamepads[i];
      if (!gp) continue;

      const btnUp = gp.buttons[12]?.pressed;
      const btnDown = gp.buttons[13]?.pressed;
      const btnLeft = gp.buttons[14]?.pressed;
      const btnRight = gp.buttons[15]?.pressed;
      const btnA = gp.buttons[0]?.pressed;
      const btnB = gp.buttons[1]?.pressed;

      if (btnUp) {
        this.lastGamepadPress = now;
        this.moveFocus(scene, 'up');
        break;
      } else if (btnDown) {
        this.lastGamepadPress = now;
        this.moveFocus(scene, 'down');
        break;
      } else if (btnLeft) {
        this.lastGamepadPress = now;
        this.moveFocus(scene, 'left');
        break;
      } else if (btnRight) {
        this.lastGamepadPress = now;
        this.moveFocus(scene, 'right');
        break;
      } else if (btnA) {
        this.lastGamepadPress = now;
        this.triggerFocused(scene);
        break;
      } else if (btnB) {
        this.lastGamepadPress = now;
        this.handleBackAction(scene);
        break;
      }
    }
  }

  private getActiveScene(): Phaser.Scene | null {
    const scenes = this.game.scene.getScenes(true);
    return scenes[scenes.length - 1] ?? null;
  }
}

let tvNavManager: TVNavigationManager | null = null;

export function initTVNavigation(game: Phaser.Game): TVNavigationManager {
  if (tvNavManager) {
    tvNavManager.destroy();
  }
  tvNavManager = new TVNavigationManager(game);
  return tvNavManager;
}

export function getTVNavigation(): TVNavigationManager | null {
  return tvNavManager;
}
