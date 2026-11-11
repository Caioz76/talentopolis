/**
 * Interfaccia unificata per display verticali (smartphone in portrait).
 *
 * Su schermi orizzontali (desktop, tablet, telefono ruotato) questo modulo
 * resta inattivo e lascia lavorare il canvas 16:9 di Phaser così com'è.
 *
 * Su display verticali (`window.innerHeight > window.innerWidth`):
 *  - NON divide lo schermo in due e NON duplica i menu: nasconde i testi,
 *    i pannelli e i bottoni duplicati dentro il canvas Phaser, lasciando nel
 *    canvas Phaser SOLO il mondo animato a fondo schermo (cielo, Isola dell Atleta,
 *    pista d'atletica, checkpoint e Pico che corre/salta);
 *  - mostra UN UNICO menu / quiz in stile Edu Sports Arena a tutto schermo
 *    (`#mobile-deck`), con il titolo, le domande, le icone e i pulsanti grandi
 *    perfettamente impaginati per lo schermo verticale.
 */
import type Phaser from 'phaser';
import { getMobileItems, type MobileItem } from '../challenges/ui';
import { resolveConfig, ANNO_BY_ID } from '../bes/resolver';
import { loadSettings } from '../core/settings';
import { GAME_NAME, GAME_PAYOFF } from '../core/constants';
import {
  getTeamSetup,
  getProfileLabel,
  getPlayerSummary,
  openPlayerSelectionDialog
} from '../core/player';
import { totalStarsForPlayer } from '../core/progress';
import { BES_PROFILES } from '../bes/profiles';
import { toggleFullscreen } from './fullscreen';
import { isSmartTV, isSmartphone } from './device';
export { isSmartTV, isSmartphone };

interface TextEntry {
  text: string;
  x: number;
  y: number;
  /** Profondità Phaser: i banner di feedback stanno a 300+. */
  depth: number;
}

const origAlphaMap = new WeakMap<object, number>();

/**
 * In modalità verticale nasconde gli elementi UI di Phaser (testi, bottoni,
 * cornici) così non compaiono due volte (sopra nel canvas e sotto in HTML),
 * lasciando visibili nel canvas SOLO lo sfondo, la pista e Pico (`depth <= -13`).
 */
function sincronizzaVisibilitaCanvas(
  scene: Phaser.Scene | null,
  nascondiUiPhaser: boolean
): void {
  if (!scene) return;
  for (const obj of scene.children.list) {
    const o = obj as unknown as {
      depth?: number;
      name?: string;
      alpha?: number;
      setAlpha?: (a: number) => void;
    };
    if (typeof o.setAlpha !== 'function' || typeof o.alpha !== 'number') continue;
    const depth = o.depth ?? 0;
    // Manteniamo visibili: cielo, colline, pista, bordo, polvere, Pico, checkpoint, bandiera
    const isMondo = depth <= -13;
    if (isMondo) continue;

    if (nascondiUiPhaser) {
      if (!origAlphaMap.has(o) && o.alpha > 0.01) {
        origAlphaMap.set(o, o.alpha);
      }
      if (o.alpha > 0.002) {
        o.setAlpha(0.001);
      }
    } else if (origAlphaMap.has(o)) {
      o.setAlpha(origAlphaMap.get(o)!);
      origAlphaMap.delete(o);
    }
  }
}

/** Estrae l'eventuale icona della prova "riconosci l'immagine" come data URL. */
function estraiIconaProva(scene: Phaser.Scene | null): string | null {
  if (!scene) return null;
  for (const obj of scene.children.list) {
    const n = obj as {
      type?: string;
      texture?: { key?: string; getSourceImage?: () => HTMLCanvasElement | HTMLImageElement };
    };
    const key = n.texture?.key ?? '';
    if (n.type === 'Image' && key.startsWith('icon-')) {
      const src = n.texture?.getSourceImage?.();
      if (src && 'toDataURL' in src && typeof src.toDataURL === 'function') {
        return src.toDataURL();
      }
    }
  }
  return null;
}

function raccogliTesti(scene: Phaser.Scene | null): TextEntry[] {
  if (!scene) return [];
  const out: TextEntry[] = [];
  const walk = (o: unknown): void => {
    const n = o as {
      type?: string;
      text?: string;
      x?: number;
      y?: number;
      depth?: number;
      visible?: boolean;
      parentContainer?: unknown;
      list?: unknown[];
    };
    if (!n || n.visible === false) return;
    if (n.type === 'Text' && n.text && !n.parentContainer) {
      const t = String(n.text).trim();
      if (t) out.push({ text: t, x: n.x ?? 0, y: n.y ?? 0, depth: n.depth ?? 0 });
    }
    if (n.list) n.list.forEach(walk);
  };
  scene.children.list.forEach(walk);
  return out;
}

function creaBtnDom(item: MobileItem, extraClass = ''): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  const st = item.state();
  const en = item.enabled();
  const tex = item.texture ? item.texture() : '';
  const texClass = tex ? `m-${tex}` : '';
  b.className = `m-btn m-state-${st} ${texClass} ${extraClass}`.trim();
  b.textContent = item.label();
  b.disabled = !en && st === 'disabled';
  b.addEventListener('click', (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    item.trigger();
  });
  return b;
}

export function initMobilePortrait(game: Phaser.Game): void {
  const tv = isSmartTV();
  document.body.classList.toggle('smart-tv', tv);

  let ruotaDismissed = false;
  try {
    ruotaDismissed = sessionStorage.getItem('sic.dismiss_rotate') === '1';
  } catch {}

  const btnChiudiRuota = document.getElementById('ruota-v-chiudi');
  const btnXRuota = document.getElementById('ruota-v-x');
  const dismissModal = (ev: Event) => {
    ev.preventDefault();
    ruotaDismissed = true;
    try {
      sessionStorage.setItem('sic.dismiss_rotate', '1');
    } catch {}
    document.body.classList.add('dismiss-rotate');
    document.body.classList.remove('smartphone-orizzontale');
    const ruotaEl = document.getElementById('ruota-in-verticale');
    if (ruotaEl) ruotaEl.style.display = 'none';
  };
  if (btnChiudiRuota) {
    btnChiudiRuota.addEventListener('click', dismissModal);
  }
  if (btnXRuota) {
    btnXRuota.addEventListener('click', dismissModal);
  }

  const deck = document.createElement('div');
  deck.id = 'mobile-deck';
  deck.setAttribute('role', 'region');
  deck.setAttribute('aria-label', 'Interfaccia mobile verticale');
  document.body.appendChild(deck);

  let ultimaChiave = '';

  const aggiorna = (): void => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const tv = isSmartTV();
    const isTouch = typeof navigator !== 'undefined' && (navigator.maxTouchPoints > 0 || 'ontouchstart' in window);
    const isPhone = isSmartphone({ vw, vh, isTouch });
    const verticale = !tv && vh > vw;

    document.body.classList.toggle('smart-tv', tv);
    document.body.classList.toggle('verticale', verticale);
    document.body.classList.toggle('smartphone', isPhone);

    const mostraRuota = isPhone && !verticale && !ruotaDismissed;
    document.body.classList.toggle('smartphone-orizzontale', mostraRuota);
    if (!mostraRuota) {
      const ruotaEl = document.getElementById('ruota-in-verticale');
      if (ruotaEl) ruotaEl.style.display = 'none';
    }

    const attive = game.scene.getScenes(true);
    const scena = attive[attive.length - 1] ?? null;
    const key = scena?.scene.key ?? 'Boot';
    document.body.dataset.scena = key;

    // In verticale l'interfaccia è tutta HTML e quella Phaser è invisibile:
    // il puntatore di Phaser va spento. Phaser ascolta pressioni e rilasci anche
    // fuori dal canvas (eventi di finestra) e, senza questo, un tocco su un
    // bottone HTML attivava anche il bottone invisibile che stava sotto
    // (es. "Gioca" → "Impostazioni" su iPhone SE con testo grande).
    const inputPhaser = !verticale || key === 'Boot';
    for (const s of attive) {
      if (s.input && s.input.enabled !== inputPhaser) s.input.enabled = inputPhaser;
    }

    if (!verticale) {
      sincronizzaVisibilitaCanvas(scena, false);
      if (deck.style.display !== 'none') {
        deck.style.display = 'none';
        ultimaChiave = '';
      }
      game.scale.refresh();
      return;
    }

    if (key === 'Boot') {
      sincronizzaVisibilitaCanvas(scena, false);
      deck.style.display = 'none';
      ultimaChiave = `hidden:${key}`;
      return;
    }

    // In verticale mostriamo l'interfaccia card touch per smartphone
    sincronizzaVisibilitaCanvas(scena, true);
    deck.style.display = 'flex';

    const impostazioni = loadSettings();
    const gameScena = scena as { roundPlayer?: import('../core/player').ActivePlayer } | null;
    const activePlayer = gameScena?.roundPlayer;
    const playerProfileId = activePlayer ? (activePlayer.profileId ?? impostazioni.profileId ?? null) : impostazioni.profileId;
    const playerOverrides = { ...(impostazioni.overrides ?? {}), ...(activePlayer?.overrides ?? {}) };
    const cfg = resolveConfig({
      ...impostazioni,
      profileId: playerProfileId,
      overrides: playerOverrides
    });
    deck.classList.toggle('bes-dislessia', cfg.font === 'dyslexia');
    deck.classList.toggle('bes-hc', cfg.highContrast);
    deck.style.setProperty('--m-font-scale', String(cfg.fontScale));

    const items = getMobileItems(scena);
    const testi = raccogliTesti(scena);
    const iconaUrl = key === 'Game' ? estraiIconaProva(scena) : null;
    const pageTab = document.body.dataset.settingsPage ?? '';

    const firmaItems = items
      .map(
        (it) =>
          `${it.id}:${it.kind}:${it.label()}:${it.state()}:${it.enabled() ? 1 : 0}`
      )
      .join('|');
    const firmaTesti = testi.map((t) => t.text).join('|');
    const chiaveAttuale = `${key}::${pageTab}::${cfg.font}::${cfg.highContrast}::${cfg.fontScale}::${Boolean(iconaUrl)}::${firmaItems}::${firmaTesti}`;

    if (chiaveAttuale === ultimaChiave) return;
    ultimaChiave = chiaveAttuale;

    const scrollPrev = deck.scrollTop;
    deck.innerHTML = '';

    if (key === 'Title') {
      renderTitle(deck, items, testi, () => {
        ultimaChiave = '';
        aggiorna();
      });
    } else if (key === 'Subject') {
      renderSubject(deck, items, testi, scena);
    } else if (key === 'Levels') {
      renderLevels(deck, items, testi);
    } else if (key === 'Settings') {
      renderSettings(deck, items, testi);
    } else if (key === 'Progress') {
      renderProgress(deck, items, testi);
    } else if (key === 'Game') {
      renderGame(deck, items, testi, iconaUrl, scena);
    } else if (key === 'Pause' || key === 'Results') {
      renderModalScene(deck, items, testi, scena);
    }

    if (scrollPrev > 0) deck.scrollTop = scrollPrev;
  };

  const suResize = (): void => {
    game.scale.refresh();
    aggiorna();
  };

  window.addEventListener('resize', suResize);
  window.addEventListener('orientationchange', suResize);
  window.addEventListener('sic:player_change', () => {
    ultimaChiave = '';
    aggiorna();
  });
  window.setInterval(aggiorna, 250);
  // Anche a ogni fotogramma: una scena appena aperta non deve restare
  // "toccabile" per i 250 ms che mancano al prossimo aggiornamento.
  game.events.on('prestep', () => {
    if (!document.body.classList.contains('verticale')) return;
    const attive = game.scene.getScenes(true);
    const top = attive[attive.length - 1];
    if (!top || top.scene.key === 'Boot') return;
    for (const s of attive) if (s.input && s.input.enabled) s.input.enabled = false;
  });
  aggiorna();
}

function renderTitle(
  deck: HTMLElement,
  items: MobileItem[],
  testi: TextEntry[],
  onAggiorna?: () => void
): void {
  const card = document.createElement('div');
  card.className = 'm-card m-card-title';

  // Titolo principale unico (non duplicato)
  const titleEl = document.createElement('h1');
  titleEl.className = 'm-game-title';
  titleEl.textContent = GAME_NAME;
  card.appendChild(titleEl);

  const payoffEl = document.createElement('p');
  payoffEl.className = 'm-sub m-payoff';
  payoffEl.textContent = GAME_PAYOFF;
  card.appendChild(payoffEl);

  // Icone decorative delle 4 materie in fila
  const iconsRow = document.createElement('div');
  iconsRow.className = 'm-sport-badges';
  iconsRow.innerHTML =
    '<span class="m-sport-dot" title="Matematica">📐</span>' +
    '<span class="m-sport-dot" title="Italiano">📖</span>' +
    '<span class="m-sport-dot" title="Scienze">🔬</span>' +
    '<span class="m-sport-dot" title="Storia">🏛️</span>';
  card.appendChild(iconsRow);

  const riepilogoItem = items.find((i) => i.label().startsWith('Classe:'));
  if (riepilogoItem) {
    card.appendChild(creaBtnDom(riepilogoItem, 'm-btn-wide-orange m-pill'));
  } else {
    const s = loadSettings();
    const cfg = resolveConfig(s);
    const infoAnno = ANNO_BY_ID.get(cfg.schoolYear);
    const labelAnno = infoAnno ? infoAnno.label : cfg.schoolYear;
    const graficaLabel = s.graphics === '3d' ? '3D' : '2D';
    const pill = document.createElement('button');
    pill.type = 'button';
    pill.className = 'm-btn m-btn-wide-orange m-pill';
    pill.textContent = `Classe: ${labelAnno}  ·  Grafica: ${graficaLabel}`;
    pill.addEventListener('click', (ev) => {
      ev.preventDefault();
      const impBtn = items.find((i) => i.label().includes('Impostazioni'));
      impBtn?.trigger();
    });
    card.appendChild(pill);
  }

  // Scheda Giocatore / Squadra sempre visibile e accessibile, indipendente dall'icona o dal numero
  const team = getTeamSetup();
  const playerCard = document.createElement('button');
  playerCard.type = 'button';
  playerCard.className = 'm-btn m-btn-player-select m-btn-blue';
  const labelNum =
    team.numPlayers === 1 ? 'Personaggio scelto' : `${team.numPlayers} Giocatori in squadra`;
  playerCard.innerHTML = `
    <span class="m-player-sel-icon">${team.numPlayers === 1 ? team.players[0].token.icon : '👥'}</span>
    <div class="m-player-sel-info">
      <span class="m-player-sel-label">${labelNum}</span>
      <span class="m-player-sel-name" title="${getPlayerSummary()}">${getPlayerSummary()}</span>
    </div>
    <span class="m-player-sel-chevron" aria-hidden="true">›</span>
  `;
  playerCard.addEventListener('click', (ev) => {
    ev.preventDefault();
    openPlayerSelectionDialog(() => {
      onAggiorna?.();
    });
  });
  card.appendChild(playerCard);

  const gioca = items.find(
    (i) =>
      (i.label().trim() === 'Gioca' || /^▶?\s*Gioca!?$/i.test(i.label().trim())) &&
      !i.label().includes('Giocator')
  );
  if (gioca) {
    card.appendChild(creaBtnDom(gioca, 'm-btn-hero m-btn-green-hero'));
  } else {
    const giocaBtn = document.createElement('button');
    giocaBtn.type = 'button';
    giocaBtn.className = 'm-btn m-btn-hero m-btn-green-hero';
    giocaBtn.textContent = '▶ Gioca';
    giocaBtn.addEventListener('click', (ev) => {
      ev.preventDefault();
      const phaserGioca = items.find(
        (i) => i.label().trim() === 'Gioca' && !i.label().includes('Giocator')
      );
      if (phaserGioca) phaserGioca.trigger();
    });
    card.appendChild(giocaBtn);
  }

  const row = document.createElement('div');
  row.className = 'm-grid-2';
  const imp = items.find(
    (i) => i.label() === 'Configura' || i.label() === 'Impostazioni' || i.label().includes('Impostazioni')
  );
  const prog = items.find((i) => i.label() === 'Progressi' || i.label().includes('Progressi'));
  if (imp) row.appendChild(creaBtnDom(imp, 'm-btn-red-outline'));
  if (prog) row.appendChild(creaBtnDom(prog, 'm-btn-blue'));
  card.appendChild(row);

  const musica = items.find((i) => i.label().includes('Musica'));
  if (musica) {
    card.appendChild(creaBtnDom(musica, 'm-btn-secondary'));
  }

  const fsBtn = document.createElement('button');
  fsBtn.type = 'button';
  fsBtn.className = 'm-btn m-btn-fullscreen';
  fsBtn.innerHTML = '⛶ A tutto schermo (Web App)';
  fsBtn.addEventListener('click', (ev) => {
    ev.preventDefault();
    toggleFullscreen().catch(() => undefined);
  });
  card.appendChild(fsBtn);

  const copy = document.createElement('div');
  copy.className = 'm-copy';
  copy.textContent = '© Claudio Borsotti · Applicazione in fase di sviluppo';
  card.appendChild(copy);

  deck.appendChild(card);
}

function renderSubject(
  deck: HTMLElement,
  items: MobileItem[],
  testi: TextEntry[],
  scena: Phaser.Scene | null
): void {
  const card = document.createElement('div');
  card.className = 'm-card';

  const h = document.createElement('div');
  h.className = 'm-header';
  h.textContent = 'Scegli la materia';
  card.appendChild(h);

  const team = getTeamSetup();
  const playerBadge = document.createElement('div');
  playerBadge.className = 'm-pill';
  playerBadge.style.background = '#e0f2fe';
  playerBadge.style.color = '#0369a1';
  playerBadge.style.fontWeight = '800';
  playerBadge.textContent =
    team.numPlayers > 1 ? `👥 Squadra: ${getPlayerSummary()}` : `👤 Giocatore: ${getPlayerSummary()}`;
  card.appendChild(playerBadge);

  const classeTxt = testi.find((t) => t.text.startsWith('Classe attiva:'));
  if (classeTxt) {
    const pill = document.createElement('div');
    pill.className = 'm-pill';
    pill.textContent = classeTxt.text;
    card.appendChild(pill);
  }

  const icone: Record<string, string> = {
    Matematica: '📐 ',
    Italiano: '📖 ',
    Scienze: '🔬 ',
    Storia: '🏛️ '
  };

  const SUBJECT_NAMES = ['Matematica', 'Italiano', 'Scienze', 'Storia'];
  const grid = document.createElement('div');
  grid.className = 'm-grid-2';
  const materie = items.filter((i) => SUBJECT_NAMES.includes(i.label()));
  materie.forEach((m) => {
    const b = creaBtnDom(m, 'm-btn-subject');
    const starTxt = testi.find(
      (t) => Math.abs(t.x - m.x()) < 40 && Math.abs(t.y - (m.y() + 52)) < 25
    );
    b.innerHTML = `<span class="m-subj-title">${icone[m.label()] ?? ''}${m.label()}</span>${
      starTxt ? `<span class="m-subj-stars">${starTxt.text}</span>` : ''
    }`;
    grid.appendChild(b);
  });
  card.appendChild(grid);

  const bottomRow = document.createElement('div');
  bottomRow.className = 'm-grid-2';
  const tappe = items.find((i) => i.label() === 'Tutte le tappe');
  if (tappe) {
    bottomRow.appendChild(creaBtnDom(tappe, 'm-btn-secondary'));
  }
  const homeBtn = document.createElement('button');
  homeBtn.type = 'button';
  homeBtn.className = 'm-btn m-btn-secondary';
  homeBtn.textContent = 'Torna al menu';
  homeBtn.addEventListener('click', (ev) => {
    ev.preventDefault();
    scena?.scene.start('Title');
  });
  bottomRow.appendChild(homeBtn);
  card.appendChild(bottomRow);

  deck.appendChild(card);
}

function renderLevels(deck: HTMLElement, items: MobileItem[], _testi: TextEntry[]): void {
  const card = document.createElement('div');
  card.className = 'm-card';

  const h = document.createElement('div');
  h.className = 'm-header';
  h.textContent = 'Tutte le tappe';
  card.appendChild(h);

  const nomiMaterie = ['Matematica', 'Italiano', 'Scienze', 'Storia'];
  const bottoniTappe = items.filter((i) => i.label().startsWith('Tappa'));

  nomiMaterie.forEach((nome, rowIdx) => {
    const yAtteso = 145 + rowIdx * 80;
    const diRiga = bottoniTappe
      .filter((b) => Math.abs(b.y() - yAtteso) < 35)
      .sort((a, b) => a.x() - b.x());
    if (diRiga.length === 0) return;

    const grp = document.createElement('div');
    grp.className = 'm-level-group';
    const lbl = document.createElement('div');
    lbl.className = 'm-group-title';
    lbl.textContent = nome;
    grp.appendChild(lbl);

    const row = document.createElement('div');
    row.className = 'm-grid-3';
    diRiga.forEach((b) => row.appendChild(creaBtnDom(b, 'm-btn-compact')));
    grp.appendChild(row);
    card.appendChild(grp);
  });

  const indietro = items.find((i) => i.label() === 'Indietro' || i.label().includes('indietro') || i.label().includes('Torna'));
  if (indietro) card.appendChild(creaBtnDom(indietro, 'm-btn-secondary'));

  deck.appendChild(card);
}

function renderSettings(deck: HTMLElement, items: MobileItem[], testi: TextEntry[]): void {
  const card = document.createElement('div');
  card.className = 'm-card';

  const buttons = items.filter((i) => i.kind === 'button');
  const toggles = items.filter((i) => i.kind === 'toggle');

  const page = document.body.dataset.settingsPage || 'radice';

  // ── 1. NODO RADICE (Menu principale ad albero) ──
  if (page === 'radice') {
    const h = document.createElement('div');
    h.className = 'm-header';
    h.textContent = 'Impostazioni';
    card.appendChild(h);

    const sub = document.createElement('p');
    sub.className = 'm-sub';
    sub.textContent = 'Scegli la categoria da personalizzare ad albero:';
    card.appendChild(sub);

    const macro = buttons.filter((b) =>
      [
        'Bisogni Educativi Speciali (BES)',
        'Anno Scolastico & Difficoltà',
        'Gioco & Grafica'
      ].includes(b.label())
    );
    const mg = document.createElement('div');
    mg.className = 'm-toggle-list';
    macro.forEach((b) => {
      mg.appendChild(creaBtnDom(b, 'm-btn-compact'));
    });
    card.appendChild(mg);

    const titolo = buttons.find((b) => b.label() === 'Torna al titolo');
    if (titolo) {
      const bWrap = document.createElement('div');
      bWrap.style.marginTop = '16px';
      bWrap.appendChild(creaBtnDom(titolo, 'm-btn-secondary'));
      card.appendChild(bWrap);
    }

    deck.appendChild(card);
    return;
  }

  // ── 2. NODO BES (Profili guidati & Caratteristiche) ──
  if (page === 'bes') {
    const h = document.createElement('div');
    h.className = 'm-header';
    h.textContent = 'Profili BES / DSA — Talentopolis';
    card.appendChild(h);

    const sub = document.createElement('p');
    sub.className = 'm-sub';
    sub.textContent = 'Seleziona un profilo guidato o personalizza le caratteristiche:';
    card.appendChild(sub);

    const nav = document.createElement('div');
    nav.className = 'm-grid-2';
    const indietro = buttons.find((b) => b.label() === 'Torna al menu' || b.label() === 'Torna ai profili');
    const titolo = buttons.find((b) => b.label() === 'Torna al titolo');
    if (indietro) nav.appendChild(creaBtnDom(indietro, 'm-btn-secondary'));
    if (titolo) nav.appendChild(creaBtnDom(titolo, 'm-btn-secondary'));
    card.appendChild(nav);

    const playerBtns = buttons.filter((b) => /G[1-4]:/.test(b.label()));
    if (playerBtns.length > 0) {
      const pHeader = document.createElement('div');
      pHeader.className = 'm-group-title';
      pHeader.textContent = 'Seleziona il giocatore da configurare:';
      card.appendChild(pHeader);

      const pRow = document.createElement('div');
      pRow.className = 'm-grid-2';
      pRow.style.margin = '6px 0 10px 0';
      playerBtns.forEach((b) => pRow.appendChild(creaBtnDom(b, 'm-btn-compact')));
      card.appendChild(pRow);
    }

    const custom = buttons.find((b) => b.label().startsWith('Personalizza'));
    if (custom) {
      const cWrap = document.createElement('div');
      cWrap.style.margin = '10px 0';
      cWrap.appendChild(creaBtnDom(custom, 'm-btn-sport m-btn-correct'));
      card.appendChild(cWrap);
    }

    const standard = buttons.find((b) => b.label().includes('Nessun profilo'));
    if (standard) {
      card.appendChild(creaBtnDom(standard, 'm-btn-compact'));
    }

    // Le etichette vengono dall'elenco vero dei profili: la lista scritta a mano
    // conteneva "Ipovisione" (che non esiste) e dimenticava "Disabilità intellettiva".
    const BES_LABELS = BES_PROFILES.map((p) => p.label);
    const profili = buttons.filter((b) => BES_LABELS.includes(b.label()));
    if (profili.length > 0) {
      const lbl = document.createElement('div');
      lbl.className = 'm-group-title';
      lbl.textContent = 'Elenco profili BES disponibili';
      card.appendChild(lbl);
      const pg = document.createElement('div');
      pg.className = 'm-grid-2';
      profili.forEach((b) => pg.appendChild(creaBtnDom(b, 'm-btn-compact')));
      card.appendChild(pg);
    }

    deck.appendChild(card);
    return;
  }

  // ── 3. NODO BES CUSTOM ──
  if (page === 'bes-custom') {
    const h = document.createElement('div');
    h.className = 'm-header';
    h.textContent = 'Caratteristiche BES (Custom)';
    card.appendChild(h);

    const sub = document.createElement('p');
    sub.className = 'm-sub';
    sub.textContent = 'Attiva o disattiva le singole facilitazioni per il bambino:';
    card.appendChild(sub);

    const nav = document.createElement('div');
    nav.className = 'm-grid-2';
    const indietro = buttons.find((b) => b.label() === 'Torna ai profili');
    const titolo = buttons.find((b) => b.label() === 'Torna al titolo');
    if (indietro) nav.appendChild(creaBtnDom(indietro, 'm-btn-secondary'));
    if (titolo) nav.appendChild(creaBtnDom(titolo, 'm-btn-secondary'));
    card.appendChild(nav);

    const list = document.createElement('div');
    list.className = 'm-toggle-list';
    toggles.forEach((t) => {
      const b = document.createElement('button');
      b.type = 'button';
      const on = t.state() === 'on';
      b.className = `m-toggle-row ${on ? 'is-on' : 'is-off'}`;
      b.innerHTML = `<span class="m-toggle-lbl">${t.label()}</span><span class="m-toggle-badge">${
        on ? 'ON' : 'OFF'
      }</span>`;
      b.addEventListener('click', (ev) => {
        ev.preventDefault();
        t.trigger();
      });
      list.appendChild(b);
    });
    card.appendChild(list);

    // Navigazione inferiore duplicata per non obbligare a risalire tutta la lista
    const bNav = document.createElement('div');
    bNav.className = 'm-grid-2';
    bNav.style.marginTop = '12px';
    if (indietro) bNav.appendChild(creaBtnDom(indietro, 'm-btn-secondary'));
    if (titolo) bNav.appendChild(creaBtnDom(titolo, 'm-btn-secondary'));
    card.appendChild(bNav);

    deck.appendChild(card);
    return;
  }

  // ── 4. NODO ANNO (Scelta Primaria vs Secondaria) ──
  if (page === 'anno') {
    const h = document.createElement('div');
    h.className = 'm-header';
    h.textContent = 'Anno Scolastico';
    card.appendChild(h);

    const sub = document.createElement('p');
    sub.className = 'm-sub';
    sub.textContent = 'Scegli il grado scolastico del bambino:';
    card.appendChild(sub);

    const nav = document.createElement('div');
    nav.className = 'm-grid-2';
    const indietro = buttons.find((b) => b.label() === 'Torna al menu' || b.label() === 'Torna ai profili');
    const titolo = buttons.find((b) => b.label() === 'Torna al titolo');
    if (indietro) nav.appendChild(creaBtnDom(indietro, 'm-btn-secondary'));
    if (titolo) nav.appendChild(creaBtnDom(titolo, 'm-btn-secondary'));
    card.appendChild(nav);

    const gradi = buttons.filter((b) =>
      b.label().includes('Primaria') || b.label().includes('Secondaria')
    );
    const gg = document.createElement('div');
    gg.className = 'm-toggle-list';
    gradi.forEach((b) => gg.appendChild(creaBtnDom(b, 'm-btn-compact')));
    card.appendChild(gg);

    deck.appendChild(card);
    return;
  }

  // ── 5. NODO ANNO PRIMARIA ──
  if (page === 'anno-primaria') {
    const h = document.createElement('div');
    h.className = 'm-header';
    h.textContent = 'Scuola Primaria (Elementare)';
    card.appendChild(h);

    const sub = document.createElement('p');
    sub.className = 'm-sub';
    sub.textContent = 'Seleziona la classe di scuola primaria (1ª–5ª):';
    card.appendChild(sub);

    const nav = document.createElement('div');
    nav.className = 'm-grid-2';
    const indietro = buttons.find((b) => b.label() === 'Torna ai gradi' || b.label() === 'Torna ai profili');
    const titolo = buttons.find((b) => b.label() === 'Torna al titolo');
    if (indietro) nav.appendChild(creaBtnDom(indietro, 'm-btn-secondary'));
    if (titolo) nav.appendChild(creaBtnDom(titolo, 'm-btn-secondary'));
    card.appendChild(nav);

    const classi = buttons.filter((b) => b.label().includes('Primaria'));
    const cg = document.createElement('div');
    cg.className = 'm-toggle-list';
    classi.forEach((b) => cg.appendChild(creaBtnDom(b, 'm-btn-compact')));
    card.appendChild(cg);

    deck.appendChild(card);
    return;
  }

  // ── 6. NODO ANNO SECONDARIA ──
  if (page === 'anno-secondaria') {
    const h = document.createElement('div');
    h.className = 'm-header';
    h.textContent = 'Scuola Secondaria I Grado';
    card.appendChild(h);

    const sub = document.createElement('p');
    sub.className = 'm-sub';
    sub.textContent = 'Seleziona la classe di scuola media (1ª–3ª):';
    card.appendChild(sub);

    const nav = document.createElement('div');
    nav.className = 'm-grid-2';
    const indietro = buttons.find((b) => b.label() === 'Torna ai gradi' || b.label() === 'Torna ai profili');
    const titolo = buttons.find((b) => b.label() === 'Torna al titolo');
    if (indietro) nav.appendChild(creaBtnDom(indietro, 'm-btn-secondary'));
    if (titolo) nav.appendChild(creaBtnDom(titolo, 'm-btn-secondary'));
    card.appendChild(nav);

    const classi = buttons.filter((b) => b.label().includes('Secondaria'));
    const cg = document.createElement('div');
    cg.className = 'm-toggle-list';
    classi.forEach((b) => cg.appendChild(creaBtnDom(b, 'm-btn-compact')));
    card.appendChild(cg);

    deck.appendChild(card);
    return;
  }

  // ── 7. NODO GIOCO & GRAFICA ──
  if (page === 'gioco') {
    const h = document.createElement('div');
    h.className = 'm-header';
    h.textContent = 'Gioco & Grafica';
    card.appendChild(h);

    const nav = document.createElement('div');
    nav.className = 'm-grid-2';
    const indietro = buttons.find((b) => b.label() === 'Torna al menu' || b.label() === 'Torna ai profili');
    const titolo = buttons.find((b) => b.label() === 'Torna al titolo');
    if (indietro) nav.appendChild(creaBtnDom(indietro, 'm-btn-secondary'));
    if (titolo) nav.appendChild(creaBtnDom(titolo, 'm-btn-secondary'));
    card.appendChild(nav);

    // Audio
    const btnAudio = buttons.find((b) => b.label().includes('Audio'));
    if (btnAudio) {
      const aw = document.createElement('div');
      aw.style.margin = '10px 0';
      aw.appendChild(creaBtnDom(btnAudio, 'm-btn-compact'));
      card.appendChild(aw);
    }

    // Grafica 2D vs 3D
    const modeRow = document.createElement('div');
    modeRow.className = 'm-grid-2';
    ['2D', '3D', '2D (Classica)', '3D (Tre Dimensioni)'].forEach((lbl) => {
      const b = buttons.find((it) => it.label() === lbl);
      if (b) modeRow.appendChild(creaBtnDom(b, 'm-btn-compact'));
    });
    card.appendChild(modeRow);

    // Toggle domande casuali
    const tCasuali = toggles.find((t) => t.label().includes('casuali'));
    if (tCasuali) {
      const tb = document.createElement('button');
      tb.type = 'button';
      const on = tCasuali.state() === 'on';
      tb.className = `m-toggle-row ${on ? 'is-on' : 'is-off'}`;
      tb.innerHTML = `<span class="m-toggle-lbl">${tCasuali.label()}</span><span class="m-toggle-badge">${
        on ? 'ON' : 'OFF'
      }</span>`;
      tb.addEventListener('click', (ev) => {
        ev.preventDefault();
        tCasuali.trigger();
      });
      card.appendChild(tb);
    }

    deck.appendChild(card);
    return;
  }

  deck.appendChild(card);
}

function renderProgress(deck: HTMLElement, items: MobileItem[], testi: TextEntry[]): void {
  const card = document.createElement('div');
  card.className = 'm-card';

  const h = document.createElement('div');
  h.className = 'm-header';
  h.textContent = 'Progressi e stelle';
  card.appendChild(h);

  const indietro = items.find((i) => i.label() === 'Torna al titolo' || i.label() === 'Torna al menu');

  // Pulsante Esci/Torna in ALTO per massima accessibilità immediata su mobile
  const topNav = document.createElement('div');
  topNav.style.margin = '4px 0 8px 0';
  const topBtn = document.createElement('button');
  topBtn.type = 'button';
  topBtn.className = 'm-btn m-btn-secondary';
  topBtn.textContent = '← Torna al Menu Principale';
  topBtn.addEventListener('click', (ev) => {
    ev.preventDefault();
    if (indietro) indietro.trigger();
    else window.location.reload();
  });
  topNav.appendChild(topBtn);
  card.appendChild(topNav);

  const playerBtns = items.filter((i) => /G[1-4]:/.test(i.label()));
  if (playerBtns.length > 0) {
    const pTabs = document.createElement('div');
    pTabs.className = 'm-grid-2';
    pTabs.style.margin = '4px 0 8px 0';
    playerBtns.forEach((b) => pTabs.appendChild(creaBtnDom(b, 'm-btn-compact')));
    card.appendChild(pTabs);
  }

  const tot = testi.find((t) => t.text.startsWith('Totale'));
  const ult = testi.find((t) => t.text.startsWith('Ultima partita:'));
  if (tot || ult) {
    const pill = document.createElement('div');
    pill.className = 'm-pill';
    pill.textContent = [tot?.text, ult?.text].filter(Boolean).join(' · ');
    card.appendChild(pill);
  }

  const list = document.createElement('div');
  list.className = 'm-progress-list';
  const righeTitoli = testi.filter((t) => t.text.includes(' — '));
  righeTitoli.forEach((r) => {
    const star = testi.find((t) => t.text.startsWith('★') && Math.abs(t.y - r.y) < 12 && t.x > r.x);
    const row = document.createElement('div');
    row.className = 'm-progress-row';
    row.innerHTML = `<span class="m-prog-title">${r.text}</span><span class="m-prog-stars">${
      star?.text ?? ''
    }</span>`;
    list.appendChild(row);
  });
  card.appendChild(list);

  // Azioni a fondo lista: torna al titolo e azzera progressi
  const azzera = items.find((i) => i.label().includes('Azzera'));
  const bRow = document.createElement('div');
  bRow.className = 'm-grid-2';
  bRow.style.marginTop = '10px';
  if (indietro) bRow.appendChild(creaBtnDom(indietro, 'm-btn-secondary'));
  if (azzera) bRow.appendChild(creaBtnDom(azzera, 'm-btn-compact'));
  card.appendChild(bRow);

  deck.appendChild(card);
}

function renderModalScene(
  deck: HTMLElement,
  items: MobileItem[],
  testi: TextEntry[],
  scena?: Phaser.Scene | null
): void {
  const card = document.createElement('div');
  card.className = 'm-card';

  const isResults = testi.some(
    (t) =>
      t.text.includes('Riepilogo') ||
      t.text.includes('Tappa completata') ||
      t.text.includes('Bravissim')
  );
  const team = getTeamSetup();

  if (isResults && team.numPlayers > 1) {
    const headerEl = document.createElement('div');
    headerEl.className = 'm-header';
    headerEl.textContent = '🏆 Riepilogo della Sessione';
    card.appendChild(headerEl);

    const subEl = document.createElement('div');
    subEl.className = 'm-sub';
    subEl.textContent = 'Risultati e progressi reali ottenuti da ciascun giocatore:';
    card.appendChild(subEl);

    const vList = document.createElement('div');
    vList.className = 'm-vertical-results-list';

    const resultsScene = scena as
      | (Phaser.Scene & { playerStats?: import('../scenes/game').PlayerRoundStat[] })
      | null;
    const pStats = resultsScene?.playerStats ?? [];

    team.players.forEach((p) => {
      const st = pStats.find((s) => s.playerIndex === p.playerIndex) ?? {
        correct: 0,
        roundsPlayed: 0,
        stars: 0
      };
      const isPerfeito = st.roundsPlayed > 0 && st.correct === st.roundsPlayed;
      const pct = st.roundsPlayed > 0 ? Math.round((st.correct / st.roundsPlayed) * 100) : 0;
      const badgeCls = isPerfeito ? 'ok' : st.correct > 0 ? 'partial' : 'bad';
      const badgeTxt = isPerfeito
        ? `Tutte corrette! (${st.correct}/${st.roundsPlayed})`
        : `${st.correct}/${st.roundsPlayed} corrette (${pct}%)`;

      const row = document.createElement('div');
      row.className = 'm-player-vertical-card';
      row.style.borderLeft = `5px solid ${p.token.color}`;
      row.innerHTML = `
        <div class="m-player-v-logo" style="background: ${p.token.bg}; border-color: ${p.token.color};">${p.token.icon}</div>
        <div class="m-player-v-info">
          <div class="m-player-v-name">${p.token.name} <span class="m-player-v-idx">(G${p.playerIndex})</span></div>
          <div class="m-player-v-prof">${getProfileLabel(p.profileId)}</div>
          <div class="m-player-v-score">
            <span class="m-player-v-badge ${badgeCls}">${badgeTxt}</span>
            <span class="m-player-v-stars">${'★ '.repeat(st.stars)}${'☆ '.repeat(3 - st.stars)}</span>
          </div>
          <div class="m-player-v-total">Progresso globale: ${totalStarsForPlayer(p.token.id)} ★ totali</div>
        </div>
      `;
      vList.appendChild(row);
    });

    card.appendChild(vList);

    const col = document.createElement('div');
    col.className = 'm-stack';
    col.style.marginTop = '14px';
    items.forEach((it) => col.appendChild(creaBtnDom(it)));
    card.appendChild(col);

    deck.appendChild(card);
    return;
  }

  testi.forEach((t, idx) => {
    const el = document.createElement('div');
    el.className = idx === 0 ? 'm-header' : 'm-sub';
    el.textContent = t.text;
    card.appendChild(el);
  });

  const col = document.createElement('div');
  col.className = 'm-stack';
  items.forEach((it) => col.appendChild(creaBtnDom(it)));
  card.appendChild(col);

  deck.appendChild(card);
}

function renderGame(
  deck: HTMLElement,
  items: MobileItem[],
  testi: TextEntry[],
  iconaUrl: string | null,
  scena: Phaser.Scene | null
): void {
  const card = document.createElement('div');
  card.className = 'm-card';

  const team = getTeamSetup();
  const gameScena = scena as { roundPlayer?: import('../core/player').ActivePlayer } | null;
  const activePlayer = gameScena?.roundPlayer ?? team.players[0];

  // Badge prominente del turno con logo (icona) e nome del giocatore
  const hasCustom = Boolean(activePlayer.profileId && activePlayer.profileId !== 'standard');
  const turnCard = document.createElement('div');
  turnCard.className = 'm-turn-banner';
  turnCard.style.borderLeft = `6px solid ${activePlayer.token.color}`;
  turnCard.style.background = activePlayer.token.bg;
  turnCard.innerHTML = `
    <span class="m-turn-avatar" style="font-size: 28px; line-height: 1;">${activePlayer.token.icon}</span>
    <div class="m-turn-info" style="display: flex; flex-direction: column; text-align: left; gap: 1px;">
      <div class="m-turn-label" style="font-size: 11px; font-weight: 800; color: #475569;">
        ${team.numPlayers > 1 ? `TURNO DI G${activePlayer.playerIndex}` : 'GIOCATORE ATTIVO'}
      </div>
      <div class="m-turn-name" style="font-size: 15px; font-weight: 900; color: #000000;">
        ${activePlayer.token.name}${hasCustom ? ' ⚙️' : ''}
      </div>
    </div>
  `;
  card.appendChild(turnCard);

  // Intestazione tappa + contatore
  const headerTappa = testi.find((t) => Math.abs(t.y - 20) < 12 && t.x < 650);
  const contatore = testi.find((t) => t.text.startsWith('Prova ') || t.text.includes(' · Prova '));
  if (headerTappa || contatore) {
    const topMeta = document.createElement('div');
    topMeta.className = 'm-pill';
    topMeta.textContent = [headerTappa?.text, contatore?.text].filter(Boolean).join(' · ');
    card.appendChild(topMeta);
  }

  // Domanda (prompt) e indizio
  const prompt = testi.find((t) => Math.abs(t.y - 66) < 20 && t.depth < 300);
  const hint = testi.find((t) => t.text.startsWith('💡'));

  // Feedback (banner Phaser a profondità 300+): in verticale il canvas è
  // nascosto, quindi "Giusto!", "Riprova" e la spiegazione vanno ridisegnati qui,
  // altrimenti il bambino non riceve alcun riscontro sull'errore.
  const banner = testi.filter((t) => t.depth >= 300).sort((a, b) => a.y - b.y);
  if (banner.length > 0) {
    const titolo = banner[0].text;
    const positivo = /giusto|completat|pronti|bravissim/i.test(titolo);
    const fb = document.createElement('div');
    fb.className = `m-feedback-box ${positivo ? 'is-ok' : 'is-bad'}`;
    fb.setAttribute('role', 'status');
    fb.setAttribute('aria-live', 'polite');
    fb.innerHTML = `<div class="m-feedback-title">${titolo}</div>${
      banner.length > 1 ? `<div class="m-feedback-sub">${banner.slice(1).map((b) => b.text).join(' ')}</div>` : ''
    }`;
    card.appendChild(fb);
  }
  const rileggi = items.find((i) => i.kind === 'button' && i.label() === 'Rileggi');

  if (prompt || rileggi) {
    const pBox = document.createElement('div');
    pBox.className = 'm-prompt-box';
    if (prompt) {
      const pTxt = document.createElement('div');
      pTxt.className = 'm-prompt-text';
      pTxt.textContent = prompt.text;
      pBox.appendChild(pTxt);
    }
    if (rileggi) {
      pBox.appendChild(creaBtnDom(rileggi, 'm-btn-compact m-btn-secondary'));
    }
    card.appendChild(pBox);
  }

  if (iconaUrl) {
    const imgWrap = document.createElement('div');
    imgWrap.className = 'm-icon-wrap';
    const img = document.createElement('img');
    img.src = iconaUrl;
    img.alt = 'Immagine della domanda';
    img.className = 'm-round-icon';
    imgWrap.appendChild(img);
    card.appendChild(imgWrap);
  }

  if (hint) {
    const hBox = document.createElement('div');
    hBox.className = 'm-hint-box';
    hBox.textContent = hint.text;
    card.appendChild(hBox);
  }

  // 1) Prove Quiz / Immagine (bottoni) o Runner 2D (cartelli)
  const opzioni = items.filter(
    (i) => (i.kind === 'button' && i.label() !== 'Rileggi') || i.kind === 'sign'
  );
  if (opzioni.length > 0) {
    const inAvvicinamento =
      opzioni[0].kind === 'sign' &&
      opzioni.every((o) => !o.enabled() && o.state() !== 'correct');
    if (inAvvicinamento) {
      const wait = document.createElement('div');
      wait.className = 'm-pill';
      wait.textContent = '🏃 Pico sta arrivando al cancello… preparati a rispondere!';
      card.appendChild(wait);
    }
    const grid = document.createElement('div');
    grid.className = opzioni.length <= 2 ? 'm-stack' : 'm-grid-2';
    opzioni.forEach((opt) => grid.appendChild(creaBtnDom(opt, 'm-btn-answer')));
    card.appendChild(grid);
    deck.appendChild(card);
    return;
  }

  // 2) Prove con Chip: Abbinamenti (Match) oppure Riordino/Sequenza (Order)
  const chips = items.filter((i) => i.kind === 'chip');
  if (chips.length > 0) {
    const midX = scena ? scena.scale.gameSize.width / 2 : 512;
    const sinistre = chips.filter((c) => c.x() < midX).sort((a, b) => a.y() - b.y());
    const destre = chips.filter((c) => c.x() >= midX).sort((a, b) => a.y() - b.y());
    // Il tipo di prova si legge dalla scena, non si indovina dalla posizione:
    // un riordino da 4 tessere ha 2 tessere a sinistra e 2 a destra del centro
    // e veniva scambiato per un abbinamento (niente caselle, istruzioni sbagliate).
    const prova = (scena as { roundAttivo?: import('../content/types').Round } | null)?.roundAttivo;
    const abbinamento = prova
      ? prova.type === 'dragdrop' && prova.mode === 'match'
      : sinistre.length > 0 && destre.length === sinistre.length;

    if (abbinamento) {
      const instr = document.createElement('div');
      instr.className = 'm-sub';
      instr.textContent = 'Tocca un elemento a sinistra e poi il suo compagno a destra:';
      card.appendChild(instr);

      const matchGrid = document.createElement('div');
      matchGrid.className = 'm-grid-2';
      for (let i = 0; i < sinistre.length; i++) {
        matchGrid.appendChild(creaBtnDom(sinistre[i], 'm-btn-chip'));
        matchGrid.appendChild(creaBtnDom(destre[i], 'm-btn-chip'));
      }
      card.appendChild(matchGrid);
    } else {
      const inSlot = chips.filter((c) => c.y() < 300).sort((a, b) => a.x() - b.x());
      const inPool = chips.filter((c) => c.y() >= 300).sort((a, b) => a.x() - b.x());

      const instr = document.createElement('div');
      instr.className = 'm-sub';
      instr.textContent = `Tocca le tessere nell'ordine giusto (da 1 a ${chips.length}):`;
      card.appendChild(instr);

      const slotRow = document.createElement('div');
      slotRow.className = 'm-slot-row';
      for (let i = 0; i < chips.length; i++) {
        const piazzata = inSlot[i];
        if (piazzata) {
          const b = creaBtnDom(piazzata, 'm-btn-slot is-filled');
          b.innerHTML = `<span class="m-slot-num">${i + 1}.</span> <span>${piazzata.label()}</span>`;
          slotRow.appendChild(b);
        } else {
          const empty = document.createElement('div');
          empty.className = 'm-slot-empty';
          empty.textContent = `${i + 1}`;
          slotRow.appendChild(empty);
        }
      }
      card.appendChild(slotRow);

      if (inPool.length > 0) {
        const poolGrid = document.createElement('div');
        poolGrid.className = 'm-grid-2';
        inPool.forEach((c) => poolGrid.appendChild(creaBtnDom(c, 'm-btn-chip')));
        card.appendChild(poolGrid);
      }
    }
  }

  deck.appendChild(card);
}
