import Phaser from 'phaser';
import { getMateria, getLevel } from './shared';
import { showChallenge, type Challenge } from '../challenges/index';
import { allPacks, defaultLevelForYear, selectRoundsForGame } from '../content/packs';
import type { Round } from '../content/types';
import type { RoundOutcome } from '../core/state';
import { drawSportChannelFrame, showBanner, makeText } from '../challenges/ui';
import { ANNO_BY_ID, resolveConfig } from '../bes/resolver';
import { loadSettings } from '../core/settings';
import { getTeamSetup, getProfileLabel, type PlayerToken, type ActivePlayer, type TeamSetup } from '../core/player';
import { setPlayerStars } from '../core/progress';
import { addWorld, themeFor } from '../art/world';
import { add3DWorld } from '../art/three-world';
import { mostraNav, nascondiNav, aggiornaNavGiocatore, type AzioniNav } from '../ui/nav';
import { synth } from '../audio/synth';

export interface PlayerRoundStat {
  playerIndex: number;
  token: PlayerToken;
  profileId: string | null;
  roundsPlayed: number;
  correct: number;
  stars: number;
}

export class GameScene extends Phaser.Scene {
  public roundPlayer?: ActivePlayer;
  public team?: TeamSetup;
  /** Prova in corso: serve all'interfaccia verticale per sapere che tipo di prova disegnare. */
  public roundAttivo?: Round;

  constructor() {
    super('Game');
  }

  create(): void {
    const impostazioni = loadSettings();
    const team = getTeamSetup();
    const cfg = resolveConfig(impostazioni);
    const mode = impostazioni.mode ?? 'quiz';
    const pack = allPacks().find((p) => p.subject === getMateria());
    const level =
      pack?.levels.find((l) => l.id === getLevel()) ??
      (pack ? defaultLevelForYear(pack, cfg.schoolYear) : undefined);

    if (!pack || !level || level.rounds.length === 0) {
      const banner = showBanner(this, cfg, 'Nessuna prova disponibile', "Torna al titolo e scegli un'altra materia.", 'bad');
      this.time.delayedCall(2200, () => {
        banner.dispose();
        this.scene.start('Title');
      });
      return;
    }

    // Estrazione delle prove della partita (casuale dal bacino dell'anno scolastico,
    // oppure fissa se randomQuestions === false).
    // In squadra ogni giocatore ha lo stesso numero di turni e almeno 2 prove
    // (con 4 giocatori prima ne aveva una sola: troppo poco per meritare stelle).
    const turniPerGiocatore = team.numPlayers > 1 ? Math.max(2, Math.floor(6 / team.numPlayers)) : 6;
    const rounds = selectRoundsForGame(pack, level, impostazioni, turniPerGiocatore * team.numPlayers);

    const playerStats: Record<number, PlayerRoundStat> = {};
    team.players.forEach((p) => {
      playerStats[p.playerIndex] = {
        playerIndex: p.playerIndex,
        token: p.token,
        profileId: p.profileId,
        roundsPlayed: 0,
        correct: 0,
        stars: 0
      };
    });

    const infoAnno = ANNO_BY_ID.get(cfg.schoolYear);

    // Il mondo: scenografia della materia, pista e Pico che corre.
    const runner = mode === 'runner';
    const runSpeed = cfg.runnerSpeed > 0 ? cfg.runnerSpeed : 480;
    const treD = (impostazioni.graphics ?? '2d') === '3d' && !cfg.highContrast;

    const w = this.scale.gameSize.width;

    // Barra superiore e quadro domanda in stile Sport (in 2D o capsula dedicata in 3D)
    // In 3D la capsula è più stretta: a destra c'è l'HUD HTML (cuori, stelle,
    // punti) che altrimenti coprirebbe il contatore "Prova x/6".
    const frameW = Math.min(treD ? 640 : 832, w - 40);
    const frameX = (w - frameW) / 2;
    if (!treD) {
      drawSportChannelFrame(this, cfg, { x: frameX, y: 6, w: frameW, h: 124, headerH: 34, depth: -10 });
    } else {
      // In 3D: capsula superiore dedicata su fondo chiaro per garantire massima leggibilità
      const pillBg = this.add.graphics().setDepth(90);
      pillBg.fillStyle(0xffffff, 0.95);
      pillBg.fillRoundedRect(frameX, 6, frameW, 34, 17);
      pillBg.lineStyle(2, 0x00a2e8, 0.7);
      pillBg.strokeRoundedRect(frameX, 6, frameW, 34, 17);
    }

    // Intestazione in alto: materia, tappa, livello scolastico e contatore prove.
    // Solo testo nero (#000000) e centratura perfetta.
    const testoTitolo = `${pack.title} — ${level.title}${infoAnno ? ` (${infoAnno.short})` : ''}`;

    // Titolo della tappa a sinistra nella barra superiore (ampio spazio ora che il badge centrale è spostato nella barra laterale)
    makeText(this, frameX + 12, 23, testoTitolo, cfg, {
      size: 12.5,
      bold: true,
      color: '#000000',
      align: 'left',
      wrap: 520,
      maxH: 22,
      originX: 0,
      originY: 0.5
    }).setDepth(100);

    const contatore = makeText(this, frameX + frameW - 12, 23, '', cfg, {
      size: 13.5,
      bold: true,
      color: '#000000',
      align: 'right',
      wrap: 180,
      maxH: 22,
      originX: 1,
      originY: 0.5
    }).setDepth(100);

    const world = treD
      ? add3DWorld(this, themeFor(pack.subject), cfg, runner ? runSpeed : 320)
      : addWorld(this, themeFor(pack.subject), cfg, {
          track: true,
          speed: runner ? runSpeed : 38,
          advance: !runner,
          sidePico: runner,
          picoX: runner ? 110 : 66,
          props: runner
        });
    world.setProgress(0, rounds.length);

    // Regola BES `mascotGuide`: Pico accompagna lo studente passo per passo.
    const guidaPico = cfg.mascotGuide
      ? makeText(this, 248, 550, '', cfg, {
          size: 13,
          bold: true,
          color: '#000000',
          wrap: 420,
          maxH: 22
        })
      : null;

    // ── Navigazione sempre disponibile (con badge giocatore allineato ai comandi) ──
    const initialPlayer = team.players[0];
    const initialTag = team.numPlayers > 1 ? `G${initialPlayer.playerIndex}` : undefined;
    const initialLabel =
      team.numPlayers > 1
        ? `${initialPlayer.token.name} (G${initialPlayer.playerIndex})`
        : initialPlayer.token.name;

    let inPausa = false;
    const azioni: AzioniNav = {
      onPausa: () => apriPausa(false),
      onEsci: () => apriPausa(true),
      playerIcon: initialPlayer.token.icon,
      playerText: initialLabel,
      playerTag: initialTag,
      playerColor: initialPlayer.token.color,
      onPlayer: () => {
        synth.play('click');
      }
    };
    const mostraBarra = (): void => mostraNav(azioni);
    const suRipresa = (): void => {
      inPausa = false;
      mostraBarra();
    };
    const apriPausa = (conferma: boolean): void => {
      if (inPausa) return;
      inPausa = true;
      nascondiNav();
      this.events.once(Phaser.Scenes.Events.RESUME, suRipresa);
      this.scene.launch('Pause', { conferma });
      this.scene.pause();
    };
    mostraBarra();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off(Phaser.Scenes.Events.RESUME, suRipresa);
      nascondiNav();
      synth.setSfx(cfg.sfx, 0.5);
      synth.setMusic(cfg.music, 0.14);
    });

    // Tastiera: Esc e P aprono la pausa anche senza mouse.
    const tastiera = this.input.keyboard;
    const suPausa = (): void => apriPausa(false);
    tastiera?.on('keydown-ESC', suPausa);
    tastiera?.on('keydown-P', suPausa);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      tastiera?.off('keydown-ESC', suPausa);
      tastiera?.off('keydown-P', suPausa);
    });

    // Con "Pausa quando serve" il gioco si ferma da solo se il bambino esce
    // dalla pagina o cambia app: al ritorno ritrova la partita dov'era.
    const suVisibilita = (): void => {
      if (document.hidden) apriPausa(false);
    };
    if (cfg.pauseAllowed) document.addEventListener('visibilitychange', suVisibilita);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      document.removeEventListener('visibilitychange', suVisibilita);
    });

    // Con "slowPace" i feedback restano più a lungo sullo schermo.
    const ritmo = cfg.slowPace ? 1.6 : 1;

    let index = 0;
    let correct = 0;
    let current: Challenge | null = null;
    const inizio = Date.now();
    const outcomes: RoundOutcome[] = [];

    const testoGuidaPer = (round: Round): string => {
      if (round.type === 'quiz' || round.type === 'image') {
        return 'Pico: Scegli la risposta giusta!';
      }
      if (round.type === 'dragdrop' && round.mode === 'match') {
        return 'Pico: Tocca le coppie giuste!';
      }
      return 'Pico: Metti gli elementi in ordine!';
    };

    const next = (): void => {
      if (current) {
        current.dispose();
        current = null;
      }
      if (index >= rounds.length) {
        if (team.numPlayers > 1) {
          team.players.forEach((p) => {
            const st = playerStats[p.playerIndex];
            const rPlayed = st.roundsPlayed;
            st.stars =
              rPlayed > 0 && st.correct === rPlayed
                ? 3
                : st.correct >= Math.ceil(rPlayed * 0.6)
                  ? 2
                  : st.correct >= 1
                    ? 1
                    : 0;
            setPlayerStars(p.token.id, pack.packId, level.id, st.stars);
          });
        }
        this.scene.start('Results', {
          packId: pack.packId,
          levelId: level.id,
          correct,
          total: rounds.length,
          durationMs: Date.now() - inizio,
          outcomes,
          playerStats: Object.values(playerStats)
        });
        return;
      }

      const roundPlayer = team.players[index % team.players.length];
      this.roundPlayer = roundPlayer;
      this.team = team;
      playerStats[roundPlayer.playerIndex].roundsPlayed += 1;

      const playerProfileId = roundPlayer.profileId ?? impostazioni.profileId ?? null;
      // Le regole personalizzate globali (pannello "Custom") valgono per tutti;
      // quelle specifiche del giocatore, se presenti, si sommano sopra.
      const roundCfg = resolveConfig({
        ...impostazioni,
        profileId: playerProfileId,
        overrides: { ...(impostazioni.overrides ?? {}), ...(roundPlayer.overrides ?? {}) }
      });
      const roundRitmo = roundCfg.slowPace ? 1.6 : 1;

      // Applica le impostazioni audio correnti del giocatore attivo (es. profilo Sordità o Autismo)
      synth.setSfx(roundCfg.sfx, 0.5);
      synth.setMusic(roundCfg.music, 0.14);

      // Aggiorna il badge del personaggio nei comandi di navigazione a sinistra
      const tagTurno = team.numPlayers > 1 ? `G${roundPlayer.playerIndex}` : undefined;
      const labelTurno =
        team.numPlayers > 1
          ? `${roundPlayer.token.name} (G${roundPlayer.playerIndex})`
          : roundPlayer.token.name;
      azioni.playerIcon = roundPlayer.token.icon;
      azioni.playerText = labelTurno;
      azioni.playerTag = tagTurno;
      azioni.playerColor = roundPlayer.token.color;
      aggiornaNavGiocatore(roundPlayer.token.icon, labelTurno, roundPlayer.token.color, tagTurno);

      contatore.setText(`Prova ${index + 1}/${rounds.length}`);
      world.mostraCheckpoint?.(index + 1, rounds.length);

      const round: Round = rounds[index];
      this.roundAttivo = round;
      guidaPico?.setText(`🎯 ${roundPlayer.token.icon} ${roundPlayer.token.name}: ${testoGuidaPer(round)}`);

      const scelta = round.type === 'quiz' || round.type === 'image';
      if (runner) world.setSpeed(scelta ? runSpeed : 0);
      const bannerY = scelta ? 186 : 468;

      if (index === 0) {
        const welcomeMsg =
          team.numPlayers > 1
            ? `Inizia ${roundPlayer.token.icon} ${roundPlayer.token.name} (G${roundPlayer.playerIndex})!`
            : `Buon allenamento con ${roundPlayer.token.icon} ${roundPlayer.token.name}!`;
        const startBanner = showBanner(this, roundCfg, 'Pronti, via!', welcomeMsg, 'ok', { y: bannerY });
        this.time.delayedCall(1300 * roundRitmo, () => startBanner.dispose());
      }
      let errori = 0;
      current = showChallenge(this, round, roundCfg, {
        onCorrect: () => {
          const alPrimoColpo = errori === 0;
          if (alPrimoColpo) {
            correct += 1;
            playerStats[roundPlayer.playerIndex].correct += 1;
          }
          index += 1;
          outcomes.push({ roundId: round.id, correct: alPrimoColpo, attempts: errori, timeMs: 0 });
          guidaPico?.setText(alPrimoColpo ? 'Pico: Bravissimo, avanti così!' : 'Pico: Bene, completata! Continuiamo!');
          if (runner) world.setSpeed(Math.max(560, runSpeed + 80));
          else world.dash();
          world.superaCheckpoint?.();
          world.setProgress(index, rounds.length);

          const nextP = team.players[index % team.players.length];
          const okMsg =
            team.numPlayers > 1 && index < rounds.length
              ? `Turno completato! Ora tocca a ${nextP.token.icon} ${nextP.token.name}!`
              : null;
          const bannerTitle = alPrimoColpo ? 'Giusto!' : 'Completata!';
          const ok = showBanner(this, roundCfg, bannerTitle, okMsg, 'ok', { y: bannerY });
          this.time.delayedCall(900 * roundRitmo, () => {
            ok.dispose();
            next();
          });
        },
        onWrong: (attempts) => {
          errori += 1;
          guidaPico?.setText('Pico: Niente paura, riprova con calma!');
          world.bloccaCheckpoint?.();
          // Con "Spiegazione dopo l'errore" la prova a scelta mostra già il suo
          // banner con la spiegazione nello stesso punto: non se ne sovrappone un altro.
          const spiegaGia = scelta && roundCfg.showExplanationOnWrong && Boolean(round.explanation) && attempts < 3;
          if (!spiegaGia) {
            const no = showBanner(
              this,
              roundCfg,
              'Riprova',
              attempts >= 2 ? 'Guarda bene le opzioni.' : null,
              'bad',
              { y: bannerY }
            );
            this.time.delayedCall(900 * roundRitmo, () => no.dispose());
          }
          if (attempts >= 3) {
            index += 1;
            outcomes.push({ roundId: round.id, correct: false, attempts: errori, timeMs: 0 });
            world.setProgress(index, rounds.length);

            const nextP = team.players[index % team.players.length];
            if (team.numPlayers > 1 && index < rounds.length) {
              guidaPico?.setText(`Ora tocca a ${nextP.token.icon} ${nextP.token.name}!`);
            }
            this.time.delayedCall(2600 * roundRitmo, () => next());
          }
        }
      }, { mode, world });
    };

    next();
  }
}
