import Phaser from 'phaser';
import { GAME_NAME, GAME_PAYOFF } from '../core/constants';
import { makeButton, makeText } from '../challenges/ui';
import { ANNO_BY_ID, resolveConfig } from '../bes/resolver';
import { loadSettings } from '../core/settings';
import { getPlayerSummary, openPlayerSelectionDialog, getTeamSetup } from '../core/player';
import { addWorld } from '../art/world';
import { add3DWorld } from '../art/three-world';
import { toggleFullscreen } from '../ui/fullscreen';
import { synth } from '../audio/synth';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create(): void {
    const settings = loadSettings();
    const cfg = resolveConfig(settings);
    const w = this.scale.gameSize.width;
    const h = this.scale.gameSize.height;

    const treD = (settings.graphics ?? '2d') === '3d' && !cfg.highContrast;
    if (treD) {
      add3DWorld(this, 'scuola', cfg, 48);
    } else {
      addWorld(this, 'scuola', cfg, { speed: 58 });
    }

    const scenografia = cfg.decoration && !cfg.highContrast;
    const animato = scenografia && cfg.motion !== 'off';

    // ── Pannello centrale "Hero" in stile Edu Sports Arena ──
    const card = this.add.graphics().setDepth(2);
    if (scenografia) {
      // Ombra morbida stratificata stile console Sport
      card.fillStyle(0x005b8f, 0.15);
      card.fillRoundedRect(w / 2 - 318, 92, 636, 412, 34);
      card.fillStyle(0x005b8f, 0.08);
      card.fillRoundedRect(w / 2 - 312, 88, 624, 410, 32);

      // Corpo principale bianco porcellana Sport (ultra-definito e pulito)
      card.fillStyle(0xffffff, 0.96);
      card.fillRoundedRect(w / 2 - 310, 72, 620, 430, 30);

      // Fascia luminosa superiore (effetto glossy Sport)
      card.fillStyle(0xe6f5ff, 0.88);
      card.fillRoundedRect(w / 2 - 296, 80, 592, 114, 24);
      card.fillStyle(0xffffff, 0.78);
      card.fillRoundedRect(w / 2 - 284, 84, 568, 38, 18);

      // Swoosh sportivi diagonali Azzurro Sport (#00a2e8) e Arancio Sport (#ff9f1c)
      card.fillStyle(0x00a2e8, 0.22);
      card.fillTriangle(w / 2 - 294, 82, w / 2 - 196, 82, w / 2 - 294, 154);
      card.fillStyle(0xff9f1c, 0.24);
      card.fillTriangle(w / 2 + 294, 82, w / 2 + 196, 82, w / 2 + 294, 154);

      // Filetto divisorio Azzurro Sport sotto il titolo
      card.lineStyle(2.5, 0x00a2e8, 0.55);
      card.lineBetween(w / 2 - 240, 186, w / 2 + 240, 186);

      // Doppia cornice luminosa Azzurro Sport (#00a2e8) + bianco speculare
      card.lineStyle(3.5, 0x00a2e8, 0.85);
      card.strokeRoundedRect(w / 2 - 310, 72, 620, 430, 30);
      card.lineStyle(2, 0xffffff, 0.98);
      card.strokeRoundedRect(w / 2 - 305, 77, 610, 420, 27);

      // Badge delle 4 materie ai lati della card (medaglioni lucidi Sport)
      const badges: Array<{ icon: string; x: number; y: number; ring: number; bg: number }> = [
        { icon: 'icon-abaco', x: w / 2 - 396, y: 184, ring: 0x00a2e8, bg: 0xe6f6ff },
        { icon: 'icon-pergamena', x: w / 2 + 396, y: 184, ring: 0xff9f1c, bg: 0xfff5e6 },
        { icon: 'icon-sole', x: w / 2 - 410, y: 324, ring: 0x26c266, bg: 0xe8faef },
        { icon: 'icon-corona', x: w / 2 + 410, y: 324, ring: 0x7d68d8, bg: 0xf2eeff }
      ];

      badges.forEach((b, idx) => {
        const g = this.add.graphics().setDepth(3);
        g.fillStyle(0x005b8f, 0.16);
        g.fillCircle(b.x, b.y + 4, 40);
        g.fillStyle(0xffffff, 0.98);
        g.fillCircle(b.x, b.y, 38);
        g.fillStyle(b.bg, 0.92);
        g.fillCircle(b.x, b.y, 32);
        g.lineStyle(3, b.ring, 0.92);
        g.strokeCircle(b.x, b.y, 36);
        // Riflesso superiore a mezzaluna
        g.fillStyle(0xffffff, 0.65);
        g.fillEllipse(b.x, b.y - 16, 36, 14);

        const ic = this.add.image(b.x, b.y, b.icon).setScale(0.52).setDepth(4);
        if (animato) {
          this.tweens.add({
            targets: [g, ic],
            y: '-=7',
            duration: 1500 + idx * 190,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
          });
        }
      });

      // Stelline decorative attorno al titolo
      const stars: Array<{ x: number; y: number; s: number; a: number }> = [
        { x: w / 2 - 252, y: 146, s: 0.48, a: -0.18 },
        { x: w / 2 + 252, y: 146, s: 0.48, a: 0.18 },
        { x: w / 2 - 264, y: 182, s: 0.34, a: 0.12 },
        { x: w / 2 + 264, y: 182, s: 0.34, a: -0.12 }
      ];
      stars.forEach((st, idx) => {
        const starImg = this.add
          .image(st.x, st.y, 'star')
          .setScale(st.s)
          .setRotation(st.a)
          .setDepth(4);
        if (animato) {
          this.tweens.add({
            targets: starImg,
            scale: st.s * 1.16,
            duration: 1200 + idx * 160,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
          });
        }
      });
    } else if (cfg.highContrast) {
      card.fillStyle(0xffffff, 1);
      card.fillRoundedRect(w / 2 - 306, 88, 612, 398, 20);
      card.lineStyle(3, 0x000000, 1);
      card.strokeRoundedRect(w / 2 - 306, 88, 612, 398, 20);
    }

    makeText(this, w / 2, 122, GAME_NAME, cfg, {
      size: 46,
      bold: true,
      color: '#000000',
      wrap: 560,
      maxH: 52
    });

    makeText(this, w / 2, 166, GAME_PAYOFF, cfg, {
      size: 16.5,
      bold: true,
      color: '#1e293b',
      wrap: 560,
      maxH: 26
    });

    const infoAnno = ANNO_BY_ID.get(cfg.schoolYear);
    const labelAnno = infoAnno ? infoAnno.label : cfg.schoolYear;
    const graficaLabel = (settings.graphics === '3d' ? '3D' : '2D');

    // ── Bottone di Riepilogo a tutta larghezza (Contorno Arancione) ──
    const btnRiepilogo = makeButton(
      this,
      cfg,
      w / 2,
      214,
      `Classe: ${labelAnno}  ·  Grafica: ${graficaLabel}`,
      {
        texture: 'btn-wide-orange',
        w: 496,
        h: 44,
        scale: 1.0,
        maxTargetScale: 1.02,
        depth: 50
      }
    );
    btnRiepilogo.onTap(() => {
      synth.play('click');
      this.scene.start('Settings');
    });

    // ── Geometria Griglia a 2 Colonne ──
    const colSinistraX = 384;
    const colDestraX = 640;
    const riga1Y = 282;
    const riga2Y = 368;

    // ── Riga 1, Colonna Sinistra: Selezione Squadra / Giocatori (Contorno Azzurro) ──
    const getBtnGiocatoriLabel = () => {
      const team = getTeamSetup();
      // In squadra il riepilogo completo non entra nel bottone: solo le icone.
      return team.numPlayers === 1
        ? getPlayerSummary()
        : `👥 ${team.numPlayers} Giocatori · ${team.players.map((p) => p.token.icon).join(' ')}`;
    };

    const btnGiocatori = makeButton(
      this,
      cfg,
      colSinistraX,
      riga1Y,
      getBtnGiocatoriLabel(),
      {
        texture: 'btn-blue',
        scale: 0.92,
        maxTargetScale: 1.03,
        depth: 50
      }
    );

    const aggiornaProfiloUI = () => {
      btnGiocatori.setLabel(getBtnGiocatoriLabel());
    };

    btnGiocatori.onTap(() => {
      synth.play('click');
      openPlayerSelectionDialog(() => {
        aggiornaProfiloUI();
      });
    });

    // ── Riga 1, Colonna Destra: Progressi e Stelle (Contorno Azzurro) ──
    const progressi = makeButton(
      this,
      cfg,
      colDestraX,
      riga1Y,
      '🏆 Progressi e Stelle',
      {
        texture: 'btn-blue',
        scale: 0.92,
        maxTargetScale: 1.03,
        depth: 50
      }
    );
    progressi.onTap(() => {
      synth.play('click');
      this.scene.start('Progress');
    });

    // ── Riga 2, Colonna Sinistra: Impostazioni / Configurazione (Contorno Rosso) ──
    const configura = makeButton(
      this,
      cfg,
      colSinistraX,
      riga2Y,
      'Impostazioni',
      {
        texture: 'btn-red-outline',
        scale: 0.92,
        maxTargetScale: 1.03,
        depth: 50
      }
    );
    configura.onTap(() => {
      synth.play('click');
      this.scene.start('Settings');
    });

    // ── Riga 2, Colonna Destra: GIOCA (Contorno Verde - Evidenziato Hero) ──
    const gioca = makeButton(
      this,
      cfg,
      colDestraX,
      riga2Y,
      'Gioca',
      {
        texture: 'btn-green-hero',
        scale: 1.0,
        maxTargetScale: 1.04,
        depth: 50
      }
    );
    gioca.onTap(() => {
      synth.play('start');
      this.scene.start('Subject');
    });

    // Evidenziazione dinamica pulsante Gioca
    if (animato) {
      this.tweens.add({
        targets: gioca.root,
        scaleX: 1.035,
        scaleY: 1.035,
        duration: 1100,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }

    // ── Musica 8-Bit (Anni '80 Arcade) ON / OFF ──
    const btnMusica = makeButton(
      this,
      cfg,
      892,
      38,
      synth.musicActive ? '🎵 Musica: ON' : '🔇 Musica: OFF',
      {
        scale: 0.65,
        maxTargetScale: 1.04,
        depth: 50
      }
    );
    btnMusica.onTap(() => {
      const active = synth.toggleMusic();
      btnMusica.setLabel(active ? '🎵 Musica: ON' : '🔇 Musica: OFF');
      if (active) synth.play('click');
    });

    // ── Schermo Intero ──
    const schermoIntero = makeButton(this, cfg, 132, 38, 'Schermo intero', {
      scale: 0.65,
      maxTargetScale: 1.05,
      depth: 50
    });
    schermoIntero.onTap(() => {
      synth.play('click');
      toggleFullscreen().catch(() => undefined);
    });

    makeText(
      this,
      w / 2,
      545,
      '© Claudio Borsotti · Applicazione in fase di sviluppo',
      cfg,
      {
        size: 12,
        bold: true,
        color: '#000000',
        wrap: 620,
        maxH: 18
      }
    );
  }
}
