import Phaser from 'phaser';
import { drawSportChannelFrame, makeButton, makeText } from '../challenges/ui';
import { resolveConfig } from '../bes/resolver';
import { loadSettings } from '../core/settings';
import { allPacks } from '../content/packs';
import { starsFor, starsForPlayer, totalStarsForPlayer, resetAllProgress, loadHistory } from '../core/progress';
import { getPlayerName, getTeamSetup, openNameDialog } from '../core/player';
import { addWorld } from '../art/world';

let progressPlayerIdx = 1;

/**
 * Progressi per giocatore e materia: tappe e stelle registrate per ciascun soggetto.
 */
export class ProgressScene extends Phaser.Scene {
  constructor() {
    super('Progress');
  }

  create(): void {
    const cfg = resolveConfig(loadSettings());
    const w = this.scale.gameSize.width;
    const team = getTeamSetup();
    if (progressPlayerIdx > team.numPlayers) progressPlayerIdx = 1;
    const activePlayer = team.players.find((p) => p.playerIndex === progressPlayerIdx) ?? team.players[0];

    const frameW = Math.min(960, w - 40);
    const frameX = (w - frameW) / 2;
    addWorld(this, 'scuola', cfg, { pico: 'cheer', speed: 22 });
    drawSportChannelFrame(this, cfg, { x: frameX, y: 16, w: frameW, h: 544, headerH: 80 });

    const btnIndietro = makeButton(this, cfg, frameX + 98, 40, 'Torna al titolo', {
      scale: 0.52,
      maxTargetScale: 1.03,
      depth: 10
    });
    btnIndietro.onTap(() => this.scene.start('Title'));

    const nome = getPlayerName();
    makeText(
      this,
      w / 2,
      40,
      team.numPlayers > 1
        ? `Progressi Squadra — ${activePlayer.token.icon} ${activePlayer.token.name} (G${activePlayer.playerIndex})`
        : `Progressi di ${nome}`,
      cfg,
      {
        size: 24,
        bold: true,
        color: '#000000',
        wrap: 540,
        maxH: 30
      }
    );

    const btnCambiaNome = makeButton(this, cfg, frameX + frameW - 76, 40, '👥 Squadra', {
      scale: 0.52,
      maxTargetScale: 1.02,
      depth: 10
    });
    btnCambiaNome.onTap(() => {
      openNameDialog(() => {
        this.scene.restart();
      });
    });

    // Se ci sono più giocatori, mostra i tasti a linguetta per selezionare il soggetto
    if (team.numPlayers > 1) {
      const num = team.numPlayers;
      const step = Math.min(220, (frameW - 120) / num);
      const startX = w / 2 - ((num - 1) * step) / 2;
      team.players.forEach((p, idx) => {
        const isCurrent = p.playerIndex === progressPlayerIdx;
        const tot = totalStarsForPlayer(p.token.id);
        const b = makeButton(
          this,
          cfg,
          startX + idx * step,
          74,
          `${p.token.icon} G${p.playerIndex}: ${tot}★`,
          { scale: 0.58, maxTargetScale: 1.02, depth: 10 }
        );
        b.setKind(isCurrent ? 'selected' : 'unselected');
        b.onTap(() => {
          progressPlayerIdx = p.playerIndex;
          this.scene.restart();
        });
      });
    } else {
      makeText(this, w / 2, 70, 'Stelle conquistate in ogni tappa (massimo 3 per tappa):', cfg, {
        size: 13.5,
        bold: true,
        color: '#1e293b',
        wrap: 680,
        maxH: 20
      });
    }

    const righe = allPacks().flatMap((pack) =>
      pack.levels.map((livello) => {
        const stPlayer = starsForPlayer(activePlayer.token.id, pack.packId, livello.id);
        const stGlobal = team.numPlayers === 1 ? starsFor(pack.packId, livello.id) : 0;
        return {
          titolo: `${pack.title} — ${livello.title}`,
          stelle: Math.max(stPlayer, stGlobal)
        };
      })
    );

    let totale = 0;
    righe.forEach((r, idx) => {
      totale += r.stelle;
      const col = idx < 6 ? 0 : 1;
      const row = idx % 6;
      const y = 118 + row * 48;
      const xTitolo = col === 0 ? frameX + 178 : frameX + 668;
      const xStelle = col === 0 ? frameX + 413 : frameX + 903;
      makeText(this, xTitolo, y, r.titolo, cfg, {
        size: 13,
        bold: true,
        align: 'left',
        wrap: 330,
        maxH: 34,
        color: '#000000'
      });
      makeText(this, xStelle, y, `★ ${r.stelle} / 3`, cfg, {
        size: 14,
        bold: r.stelle > 0,
        maxH: 22,
        color: r.stelle === 3 ? '#d99a00' : r.stelle > 0 ? '#1f8a4c' : '#8a99ad'
      });
    });

    makeText(
      this,
      w / 2,
      424,
      `Totale ${activePlayer.token.name}: ${totale} stelle su ${righe.length * 3}`,
      cfg,
      {
        size: 15,
        bold: true,
        color: '#000000',
        wrap: 620,
        maxH: 22
      }
    );

    const storia = loadHistory();
    const ultima = storia[storia.length - 1];
    if (ultima) {
      const data = new Date(ultima.finishedAt).toLocaleDateString('it-IT');
      makeText(this, w / 2, 456, `Ultima partita: ${ultima.correct}/${ultima.total} — ${data}`, cfg, {
        size: 14,
        color: '#1f8a4c',
        wrap: 620,
        maxH: 22
      });
    }

    const indietro = makeButton(this, cfg, w / 2 - 130, 510, 'Torna al titolo', {
      scale: 0.60,
      maxTargetScale: 1.04,
      depth: 10
    });
    indietro.onTap(() => this.scene.start('Title'));

    const btnAzzera = makeButton(this, cfg, w / 2 + 130, 510, '🗑️ Azzera progressi', {
      scale: 0.58,
      maxTargetScale: 1.04,
      depth: 10
    });
    btnAzzera.setKind('wrong');
    // Due tocchi: il primo chiede conferma, il secondo (entro 4 s) azzera davvero.
    let confermaAzzera = false;
    btnAzzera.onTap(() => {
      if (!confermaAzzera) {
        confermaAzzera = true;
        btnAzzera.setLabel('Sicuro? Tocca di nuovo');
        this.time.delayedCall(4000, () => {
          if (!confermaAzzera || !btnAzzera.root.active) return;
          confermaAzzera = false;
          btnAzzera.setLabel('🗑️ Azzera progressi');
        });
        return;
      }
      resetAllProgress();
      this.scene.restart();
    });
  }
}
