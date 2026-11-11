import Phaser from 'phaser';
import { drawSportChannelFrame, makeButton, makeText, makeToggle } from '../challenges/ui';
import {
  ANNI_SCOLASTICI,
  ANNO_BY_ID,
  normalizzaAnno,
  resolveConfig,
  type AnnoScolastico,
  type BesSettings
} from '../bes/resolver';
import { BES_PROFILES } from '../bes/profiles';
import { RULE_BY_ID } from '../bes/rules';
import { loadSettings, saveSettings } from '../core/settings';
import { getTeamSetup, setPlayerProfile, getProfileLabel, getPlayerSummary } from '../core/player';
import { addWorld } from '../art/world';
import { synth } from '../audio/synth';

const REGOLE_UI = [
  'pauseAllowed',
  'slowPace',
  'fewerOptions',
  'hintFirst',
  'errorExplanation',
  'dyslexiaFont',
  'largerText',
  'visualSupports',
  'tapInsteadOfDrag',
  'largerTargets',
  'noPrecision',
  'repeatPrompt',
  'clearProgress',
  'musicOff',
  'soundCues',
  'visualInsteadOfAudio',
  'highContrast',
  'reduceMotion',
  'noDecoration',
  'shorterText',
  'simpleLanguage',
  'mascotGuide'
];

export type NodoImpostazioni =
  | 'radice'
  | 'bes'
  | 'bes-custom'
  | 'anno'
  | 'anno-primaria'
  | 'anno-secondaria'
  | 'gioco';

let nodoCorrente: NodoImpostazioni = 'radice';
let playerConfigIndex = 1;

export class SettingsScene extends Phaser.Scene {
  constructor() {
    super('Settings');
  }

  create(): void {
    const impostazioni = loadSettings();
    const cfg = resolveConfig(impostazioni);
    const w = this.scale.gameSize.width;

    document.body.dataset.settingsPage = nodoCorrente;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      delete document.body.dataset.settingsPage;
    });

    addWorld(this, 'scuola', cfg, { pico: false, speed: 20 });
    drawSportChannelFrame(this, cfg, { x: 32, y: 16, w: 960, h: 544, headerH: 80 });

    if (nodoCorrente === 'bes') {
      this.creaBes(impostazioni, cfg, w);
      return;
    }
    if (nodoCorrente === 'bes-custom') {
      this.creaBesCustom(cfg, w);
      return;
    }
    if (nodoCorrente === 'anno') {
      this.creaSceltaGrado(impostazioni, cfg, w);
      return;
    }
    if (nodoCorrente === 'anno-primaria') {
      this.creaClassePrimaria(impostazioni, cfg, w);
      return;
    }
    if (nodoCorrente === 'anno-secondaria') {
      this.creaClasseSecondaria(impostazioni, cfg, w);
      return;
    }
    if (nodoCorrente === 'gioco') {
      this.creaGioco(impostazioni, cfg, w);
      return;
    }

    this.creaMenuRadice(impostazioni, cfg, w);
  }

  // ── 1. NODO RADICE (Menu principale ad albero) ─────────────────────
  private creaMenuRadice(
    impostazioni: BesSettings,
    cfg: ReturnType<typeof resolveConfig>,
    w: number
  ): void {
    makeText(this, w / 2, 40, 'Configura', cfg, {
      size: 26,
      bold: true,
      color: '#000000',
      wrap: 520,
      maxH: 30
    });

    makeText(this, w / 2, 70, 'Seleziona una categoria per visualizzare le opzioni dedicate:', cfg, {
      size: 13.5,
      bold: true,
      color: '#1e293b',
      wrap: 680,
      maxH: 20
    });

    const scelto = BES_PROFILES.find((p) => p.id === impostazioni.profileId);
    const infoAnno = ANNO_BY_ID.get(normalizzaAnno(impostazioni.schoolYear))!;
    const graficaTxt = impostazioni.graphics === '3d' ? '3D' : '2D';

    // ── Ramo 1: BES ──
    const btnBes = makeButton(
      this,
      cfg,
      w / 2,
      145,
      `Bisogni Educativi Speciali (BES)`,
      { scale: 0.85, maxTargetScale: 1.02, depth: 10 }
    );
    btnBes.onTap(() => {
      nodoCorrente = 'bes';
      this.scene.restart();
    });

    makeText(
      this,
      w / 2,
      186,
      `Profilo attivo: ${scelto ? scelto.label : 'Standard (Nessun profilo)'} · Personalizza profili e caratteristiche`,
      cfg,
      { size: 13, bold: true, color: '#102a43', wrap: 720, maxH: 20 }
    );

    // ── Ramo 2: Anno Scolastico ──
    const btnAnno = makeButton(
      this,
      cfg,
      w / 2,
      245,
      `Anno Scolastico & Difficoltà`,
      { scale: 0.85, maxTargetScale: 1.02, depth: 10 }
    );
    btnAnno.onTap(() => {
      nodoCorrente = 'anno';
      this.scene.restart();
    });

    makeText(
      this,
      w / 2,
      286,
      `Classe attiva: ${infoAnno.label} (Difficoltà ${infoAnno.difficulty}/3) · Scegli tra Primaria e Secondaria`,
      cfg,
      { size: 13, bold: true, color: '#102a43', wrap: 720, maxH: 20 }
    );

    // ── Ramo 3: Gioco & Grafica ──
    const btnGioco = makeButton(
      this,
      cfg,
      w / 2,
      345,
      `Gioco & Grafica`,
      { scale: 0.85, maxTargetScale: 1.02, depth: 10 }
    );
    btnGioco.onTap(() => {
      nodoCorrente = 'gioco';
      this.scene.restart();
    });

    makeText(
      this,
      w / 2,
      386,
      `Stato attuale: Grafica ${graficaTxt} · ${synth.muted ? '🔇 Muto' : '🔊 Audio ON'} · Domande ${impostazioni.randomQuestions !== false ? 'Casuali' : 'Fisse'}`,
      cfg,
      { size: 13, bold: true, color: '#102a43', wrap: 720, maxH: 20 }
    );

    // ── Torna al titolo ──
    const btnTitolo = makeButton(this, cfg, w / 2, 480, 'Torna al titolo', {
      scale: 0.65,
      maxTargetScale: 1.04,
      depth: 10
    });
    btnTitolo.onTap(() => {
      nodoCorrente = 'radice';
      this.scene.start('Title');
    });
  }

  // ── 2. RAMO BES (Profili guidati & Caratteristiche) ─────────────────
  private creaBes(
    impostazioni: BesSettings,
    cfg: ReturnType<typeof resolveConfig>,
    w: number
  ): void {
    const team = getTeamSetup();
    if (playerConfigIndex > team.numPlayers) playerConfigIndex = 1;
    const activePlayer = team.players.find((p) => p.playerIndex === playerConfigIndex) ?? team.players[0];
    const currentProfileId = activePlayer.profileId;

    makeText(this, w / 2, 36, 'Profili BES / DSA — Talentopolis', cfg, {
      size: 24,
      bold: true,
      color: '#000000',
      wrap: 620,
      maxH: 30
    });

    if (team.numPlayers > 1) {
      // Selettore a linguette per ciascun giocatore
      const num = team.numPlayers;
      const step = Math.min(220, 840 / num);
      const startX = w / 2 - ((num - 1) * step) / 2;
      team.players.forEach((p, idx) => {
        const isCurrent = p.playerIndex === playerConfigIndex;
        const b = makeButton(
          this,
          cfg,
          startX + idx * step,
          72,
          `${p.token.icon} G${p.playerIndex}: ${getProfileLabel(p.profileId)}`,
          { scale: 0.58, maxTargetScale: 1.02, depth: 10 }
        );
        b.setKind(isCurrent ? 'selected' : 'unselected');
        b.onTap(() => {
          playerConfigIndex = p.playerIndex;
          this.scene.restart();
        });
      });

      makeText(
        this,
        w / 2,
        100,
        `Configura il profilo per G${activePlayer.playerIndex} (${activePlayer.token.icon} ${activePlayer.token.name}):`,
        cfg,
        { size: 13, bold: true, color: '#1e293b', wrap: 680, maxH: 18 }
      );
    } else {
      makeText(this, w / 2, 68, 'Seleziona un profilo guidato o personalizza le caratteristiche:', cfg, {
        size: 13.5,
        bold: true,
        color: '#1e293b',
        wrap: 680,
        maxH: 20
      });
    }

    const customY = team.numPlayers > 1 ? 126 : 115;
    // Tasto Caratteristiche Custom
    const btnCustom = makeButton(
      this,
      cfg,
      w / 2,
      customY,
      'Personalizza (Custom)',
      { scale: 0.70, maxTargetScale: 1.02, depth: 10 }
    );
    btnCustom.onTap(() => {
      nodoCorrente = 'bes-custom';
      this.scene.restart();
    });

    // 9 Profili BES in griglia 3x3 simmetrica
    const xs = [232, 512, 792];
    const baseGridY = team.numPlayers > 1 ? 180 : 172;
    const ys = [baseGridY, baseGridY + 54, baseGridY + 108];
    BES_PROFILES.forEach((p, i) => {
      const b = makeButton(this, cfg, xs[i % 3], ys[Math.floor(i / 3)], p.label, {
        scale: 0.72,
        maxTargetScale: 1.0,
        depth: 10
      });
      const isSel = p.id === currentProfileId;
      b.setKind(isSel ? 'selected' : 'unselected');
      b.onTap(() => {
        setPlayerProfile(playerConfigIndex, p.id);
        if (playerConfigIndex === 1) {
          saveSettings({ ...impostazioni, profileId: p.id, overrides: {} });
        }
        this.scene.restart();
      });
    });

    // Tasto Nessun Profilo (Standard)
    const btnStandard = makeButton(this, cfg, w / 2, baseGridY + 168, 'Nessun profilo (Standard)', {
      scale: 0.72,
      maxTargetScale: 1.02,
      depth: 10
    });
    btnStandard.setKind(currentProfileId === null ? 'selected' : 'unselected');
    btnStandard.onTap(() => {
      setPlayerProfile(playerConfigIndex, null);
      if (playerConfigIndex === 1) {
        saveSettings({ ...impostazioni, profileId: null, overrides: {} });
      }
      this.scene.restart();
    });

    const scelto = BES_PROFILES.find((p) => p.id === currentProfileId);
    makeText(
      this,
      w / 2,
      baseGridY + 210,
      scelto ? scelto.description : 'Regole standard per tutti i bambini.',
      cfg,
      { size: 13, bold: true, color: scelto ? '#064e22' : '#102a43', wrap: 800, maxH: 22 }
    );

    const btnTornaMenu = makeButton(this, cfg, 370, 492, 'Torna al menu', {
      scale: 0.72,
      maxTargetScale: 1.04,
      depth: 10
    });
    btnTornaMenu.onTap(() => {
      nodoCorrente = 'radice';
      this.scene.restart();
    });

    const btnTitolo = makeButton(this, cfg, 654, 492, 'Torna al titolo', {
      scale: 0.72,
      maxTargetScale: 1.04,
      depth: 10
    });
    btnTitolo.onTap(() => {
      nodoCorrente = 'radice';
      this.scene.start('Title');
    });
  }

  // ── 3. SOTTO-RAMO CARATTERISTICHE BES (Custom) ──────────────────────
  private creaBesCustom(cfg: ReturnType<typeof resolveConfig>, w: number): void {
    makeText(this, w / 2, 40, 'Caratteristiche BES (Custom)', cfg, {
      size: 26,
      bold: true,
      color: '#000000',
      wrap: 540,
      maxH: 30
    });

    makeText(this, w / 2, 70, 'Attiva o disattiva le singole facilitazioni per il bambino:', cfg, {
      size: 13.5,
      bold: true,
      color: '#1e293b',
      wrap: 680,
      maxH: 20
    });

    const voci = REGOLE_UI.map((id) => RULE_BY_ID.get(id)).filter(
      (r): r is NonNullable<typeof r> => Boolean(r)
    );

    voci.forEach((regola, i) => {
      const colonna = i < 11 ? 0 : 1;
      const riga = i % 11;
      makeToggle(
        this,
        cfg,
        colonna === 0 ? 274 : 750,
        110 + riga * 34,
        440,
        regola.label,
        cfg.rules[regola.id] === true,
        () => {
          const s = loadSettings();
          saveSettings({
            ...s,
            overrides: { ...s.overrides, [regola.id]: !(cfg.rules[regola.id] === true) }
          });
          this.scene.restart();
        }
      );
    });

    const btnTornaProfili = makeButton(this, cfg, 370, 492, 'Torna ai profili', {
      scale: 0.72,
      maxTargetScale: 1.04,
      depth: 10
    });
    btnTornaProfili.onTap(() => {
      nodoCorrente = 'bes';
      this.scene.restart();
    });

    const btnTitolo = makeButton(this, cfg, 654, 492, 'Torna al titolo', {
      scale: 0.72,
      maxTargetScale: 1.04,
      depth: 10
    });
    btnTitolo.onTap(() => {
      nodoCorrente = 'radice';
      this.scene.start('Title');
    });
  }

  // ── 4. RAMO ANNO SCOLASTICO (Scelta Grado) ─────────────────────────
  private creaSceltaGrado(
    impostazioni: BesSettings,
    cfg: ReturnType<typeof resolveConfig>,
    w: number
  ): void {
    makeText(this, w / 2, 40, 'Anno Scolastico', cfg, {
      size: 26,
      bold: true,
      color: '#000000',
      wrap: 520,
      maxH: 30
    });

    const infoAnno = ANNO_BY_ID.get(normalizzaAnno(impostazioni.schoolYear))!;
    makeText(
      this,
      w / 2,
      70,
      `Classe attuale: ${infoAnno.label} (Difficoltà ${infoAnno.difficulty}/3) · Scegli il grado scolastico:`,
      cfg,
      { size: 13.5, bold: true, color: '#1e293b', wrap: 680, maxH: 20 }
    );

    // ── Ramo Primaria ──
    const btnPrimaria = makeButton(
      this,
      cfg,
      w / 2,
      175,
      'Scuola Primaria (Elementare)',
      { scale: 0.85, maxTargetScale: 1.02, depth: 10 }
    );
    btnPrimaria.setKind(infoAnno.ciclo === 'primaria' ? 'selected' : 'unselected');
    btnPrimaria.onTap(() => {
      nodoCorrente = 'anno-primaria';
      this.scene.restart();
    });

    makeText(
      this,
      w / 2,
      220,
      'Dalla 1ª alla 5ª Primaria · Esercizi graduati per bambini dai 6 ai 10 anni',
      cfg,
      { size: 13, bold: true, color: '#102a43', wrap: 720, maxH: 40 }
    );

    // ── Ramo Secondaria ──
    const btnSecondaria = makeButton(
      this,
      cfg,
      w / 2,
      305,
      'Scuola Secondaria di 1° Grado (Media)',
      { scale: 0.85, maxTargetScale: 1.02, depth: 10 }
    );
    btnSecondaria.setKind(infoAnno.ciclo === 'secondaria' ? 'selected' : 'unselected');
    btnSecondaria.onTap(() => {
      nodoCorrente = 'anno-secondaria';
      this.scene.restart();
    });

    makeText(
      this,
      w / 2,
      350,
      'Dalla 1ª alla 3ª Secondaria · Quesiti logici e di comprensione per ragazzi dagli 11 ai 14 anni',
      cfg,
      { size: 13, bold: true, color: '#102a43', wrap: 720, maxH: 40 }
    );

    // ── Bottom Nav ──
    const btnTornaMenu = makeButton(this, cfg, 370, 492, 'Torna al menu', {
      scale: 0.72,
      maxTargetScale: 1.04,
      depth: 10
    });
    btnTornaMenu.onTap(() => {
      nodoCorrente = 'radice';
      this.scene.restart();
    });

    const btnTitolo = makeButton(this, cfg, 654, 492, 'Torna al titolo', {
      scale: 0.72,
      maxTargetScale: 1.04,
      depth: 10
    });
    btnTitolo.onTap(() => {
      nodoCorrente = 'radice';
      this.scene.start('Title');
    });
  }

  // ── 5. SOTTO-RAMO PRIMARIA (1ª – 5ª) ────────────────────────────────
  private creaClassePrimaria(
    impostazioni: BesSettings,
    cfg: ReturnType<typeof resolveConfig>,
    w: number
  ): void {
    makeText(this, w / 2, 40, 'Scuola Primaria', cfg, {
      size: 26,
      bold: true,
      color: '#000000',
      wrap: 520,
      maxH: 30
    });

    makeText(this, w / 2, 70, 'Seleziona la classe di riferimento della Scuola Primaria (1ª–5ª):', cfg, {
      size: 13.5,
      bold: true,
      color: '#1e293b',
      wrap: 680,
      maxH: 20
    });

    const attivoId = normalizzaAnno(impostazioni.schoolYear);
    const primaria = ANNI_SCOLASTICI.filter((a) => a.ciclo === 'primaria');

    primaria.forEach((anno, i) => {
      const y = 140 + i * 65;
      const b = makeButton(this, cfg, w / 2, y, anno.label, {
        scale: 0.72,
        maxTargetScale: 1.02,
        depth: 10
      });
      const isSel = anno.id === attivoId;
      b.setKind(isSel ? 'selected' : 'unselected');
      b.onTap(() => {
        saveSettings({ ...impostazioni, schoolYear: anno.id as AnnoScolastico });
        this.scene.restart();
      });
    });

    const btnTorna = makeButton(this, cfg, 370, 492, 'Torna ai gradi', {
      scale: 0.72,
      maxTargetScale: 1.04,
      depth: 10
    });
    btnTorna.onTap(() => {
      nodoCorrente = 'anno';
      this.scene.restart();
    });

    const btnTitolo = makeButton(this, cfg, 654, 492, 'Torna al titolo', {
      scale: 0.72,
      maxTargetScale: 1.04,
      depth: 10
    });
    btnTitolo.onTap(() => {
      nodoCorrente = 'radice';
      this.scene.start('Title');
    });
  }

  // ── 6. SOTTO-RAMO SECONDARIA (1ª – 3ª) ──────────────────────────────
  private creaClasseSecondaria(
    impostazioni: BesSettings,
    cfg: ReturnType<typeof resolveConfig>,
    w: number
  ): void {
    makeText(this, w / 2, 40, 'Scuola Secondaria I Grado', cfg, {
      size: 26,
      bold: true,
      color: '#000000',
      wrap: 520,
      maxH: 30
    });

    makeText(this, w / 2, 70, 'Seleziona la classe di riferimento della Scuola Secondaria di 1° grado:', cfg, {
      size: 13.5,
      bold: true,
      color: '#1e293b',
      wrap: 680,
      maxH: 20
    });

    const attivoId = normalizzaAnno(impostazioni.schoolYear);
    const secondaria = ANNI_SCOLASTICI.filter((a) => a.ciclo === 'secondaria');

    secondaria.forEach((anno, i) => {
      const y = 175 + i * 90;
      const b = makeButton(this, cfg, w / 2, y, anno.label, {
        scale: 0.78,
        maxTargetScale: 1.02,
        depth: 10
      });
      const isSel = anno.id === attivoId;
      b.setKind(isSel ? 'selected' : 'unselected');
      b.onTap(() => {
        saveSettings({ ...impostazioni, schoolYear: anno.id as AnnoScolastico });
        this.scene.restart();
      });
    });

    const btnTorna = makeButton(this, cfg, 370, 492, 'Torna ai gradi', {
      scale: 0.72,
      maxTargetScale: 1.04,
      depth: 10
    });
    btnTorna.onTap(() => {
      nodoCorrente = 'anno';
      this.scene.restart();
    });

    const btnTitolo = makeButton(this, cfg, 654, 492, 'Torna al titolo', {
      scale: 0.72,
      maxTargetScale: 1.04,
      depth: 10
    });
    btnTitolo.onTap(() => {
      nodoCorrente = 'radice';
      this.scene.start('Title');
    });
  }

  // ── 7. RAMO GIOCO & GRAFICA ────────────────────────────────────────
  private creaGioco(
    impostazioni: BesSettings,
    cfg: ReturnType<typeof resolveConfig>,
    w: number
  ): void {
    makeText(this, w / 2, 40, 'Gioco & Grafica', cfg, {
      size: 26,
      bold: true,
      color: '#000000',
      wrap: 520,
      maxH: 30
    });

    makeText(this, w / 2, 70, 'Personalizza grafica 2D/3D, domande e audio di gioco:', cfg, {
      size: 13.5,
      bold: true,
      color: '#1e293b',
      wrap: 680,
      maxH: 20
    });

    // ── Grafica: 2D vs 3D ──
    const grafica = impostazioni.graphics ?? '2d';
    makeText(this, w / 2, 130, 'Grafica di Gioco', cfg, {
      size: 16,
      bold: true,
      color: '#000000',
      wrap: 320,
      maxH: 22
    });

    const btn2D = makeButton(this, cfg, 360, 175, '2D (Classica)', {
      scale: 0.65,
      maxTargetScale: 1.02,
      depth: 10
    });
    btn2D.setKind(grafica === '2d' ? 'selected' : 'unselected');
    btn2D.onTap(() => {
      if (grafica === '2d') return;
      saveSettings({ ...impostazioni, graphics: '2d' });
      this.scene.restart();
    });

    const btn3D = makeButton(this, cfg, 664, 175, '3D (Tre Dimensioni)', {
      scale: 0.65,
      maxTargetScale: 1.02,
      depth: 10
    });
    btn3D.setKind(grafica === '3d' ? 'selected' : 'unselected');
    btn3D.onTap(() => {
      if (grafica === '3d') return;
      saveSettings({ ...impostazioni, graphics: '3d' });
      this.scene.restart();
    });

    makeText(
      this,
      w / 2,
      225,
      grafica === '3d'
        ? 'Modalità 3D attiva: scenario poligonale dinamico con avatar 3D.'
        : 'Modalità 2D attiva: grafica illustrata pulita, rapida e a basso consumo.',
      cfg,
      { size: 13, bold: true, color: '#102a43', wrap: 720, maxH: 20 }
    );

    // ── Domande casuali ──
    const casuali = impostazioni.randomQuestions !== false;
    makeToggle(
      this,
      cfg,
      w / 2,
      290,
      580,
      'Domande casuali ad ogni partita (consigliato)',
      casuali,
      () => {
        const s = loadSettings();
        saveSettings({ ...s, randomQuestions: !(s.randomQuestions !== false) });
        this.scene.restart();
      }
    );

    // ── Audio ON / OFF ──
    makeText(this, w / 2, 360, 'Audio di Gioco', cfg, {
      size: 16,
      bold: true,
      color: '#000000',
      wrap: 320,
      maxH: 22
    });

    const btnAudio = makeButton(
      this,
      cfg,
      w / 2,
      405,
      synth.muted ? '🔇 Audio OFF' : '🔊 Audio ON',
      { scale: 0.62, maxTargetScale: 1.02, depth: 10 }
    );
    if (synth.muted) btnAudio.setKind('disabled');
    btnAudio.onTap(() => {
      const muto = synth.toggleMute();
      btnAudio.setLabel(muto ? '🔇 Audio OFF' : '🔊 Audio ON');
      btnAudio.setKind(muto ? 'disabled' : 'normal');
    });

    // ── Bottom Nav ──
    const btnTornaMenu = makeButton(this, cfg, 370, 492, 'Torna al menu', {
      scale: 0.72,
      maxTargetScale: 1.04,
      depth: 10
    });
    btnTornaMenu.onTap(() => {
      nodoCorrente = 'radice';
      this.scene.restart();
    });

    const btnTitolo = makeButton(this, cfg, 654, 492, 'Torna al titolo', {
      scale: 0.72,
      maxTargetScale: 1.04,
      depth: 10
    });
    btnTitolo.onTap(() => {
      nodoCorrente = 'radice';
      this.scene.start('Title');
    });
  }
}
