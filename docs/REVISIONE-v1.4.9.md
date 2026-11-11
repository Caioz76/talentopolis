# Revisione v1.4.9 — Talentopolis

Revisione completa dell'applicazione: codice, contenuti, design, adattamento alle risoluzioni e funzionalità di ogni bottone.

## Come è stata verificata

| Verifica | Esito |
|---|---|
| Controllo dei tipi (`tsc`) | nessun errore |
| Test unitari (Vitest) | 66 / 66 |
| Test end-to-end (Playwright) | 55 / 55 (6 nuovi in `tests/e2e/revisione.spec.ts`) |
| Audit impaginazione: 7 casi tra profili BES, classi da 1ª Primaria a 3ª Secondaria e squadra da 4 | nessuna sovrapposizione |
| Audit risoluzioni: 16 schermi da 320 a 2560 px, verticale e orizzontale, più ridimensionamento dal vivo | nessun problema |
| Audit bottoni: ogni bottone di ogni schermata premuto uno per uno (orizzontale e verticale) | 227 pressioni: 222 con effetto, 5 su opzioni già selezionate (corretto) |
| Partite complete in verticale su iPhone SE e iPhone 8 | 12 su 12 arrivano ai risultati |

## Difetti corretti

### Funzionamento

- **Le regole "Custom" venivano ignorate in partita.** Con una squadra salvata, le facilitazioni scelte nel pannello Custom (font leggibile, testo grande…) non si applicavano. Ora si sommano a quelle del giocatore.
- **In verticale un tocco poteva attivare il bottone sbagliato.** Phaser ascolta i tocchi su tutta la finestra: un tocco su un bottone HTML attivava anche il bottone invisibile del canvas sottostante (es. "Gioca" apriva "Impostazioni" su iPhone SE con testo grande). In verticale l'input di Phaser ora è spento, e un bottone reagisce solo se il tocco è iniziato su di lui.
- **Riordino rovinato dal trascinamento.** Dopo aver trascinato una tessera in una casella, il tocco successivo la spostava nel posto sbagliato, e spostarla da una casella all'altra lasciava la casella di partenza "occupata".
- **In verticale il riordino da 4 tessere sembrava un abbinamento.** Mostrava le istruzioni sbagliate e nessuna casella numerata.
- **In verticale il bambino non riceveva alcun riscontro.** "Giusto!", "Riprova" e la spiegazione non comparivano.
- **In verticale il profilo "Disabilità intellettiva" non si poteva scegliere.** La lista scritta a mano conteneva "Ipovisione", che non esiste.
- **In verticale le ultime tessere finivano sotto la barra dei comandi** nelle prove lunghe, senza poterle raggiungere scorrendo.
- **Il tasto Esc non apriva la pausa.**
- **"Azzera progressi" cancellava tutto al primo tocco.** Ora chiede conferma con un secondo tocco.
- **In squadra da 4 ogni bambino rispondeva a una sola domanda.** Ora ognuno ha almeno 2 prove.

### Design e leggibilità

- **I testi si rimpicciolivano fino a 11 px senza motivo.** La funzione di adattamento contava il margine interno come testo. Colpiva contatore "Prova x/6", titolo della tappa, stelle e sottotitoli, annullando di fatto la regola "Testo più grande". Casi ridotti al minimo: da 213 a 0.
- **Le risposte lunghe scendevano a 10 px.** Ora usano bottoni larghi a due colonne (17 px con testo normale).
- **Le emoji (🦊 💡 🏆) apparivano come quadratini** con il font per la dislessia: la spaziatura tra lettere spezzava i caratteri.
- **Due banner sovrapposti** dopo un errore con la spiegazione attiva.
- **La barra Pausa/Esci copriva risposte e tessere** sui telefoni in orizzontale e sugli schermi 4:3. Su schermi piccoli diventa una colonna di sole icone.
- **In 3D il contatore "Prova 1/6" era coperto** da cuori e punti.
- **L'anello di selezione della tastiera restava a schermo** dopo aver usato mouse o dito.
- Etichetta "Personalizza Caratteristiche (Custom)" accorciata in "Personalizza (Custom)": con testo grande non entrava nel bottone.
- Testo del popup "ruota il telefono" reso coerente con il bottone "Continua comunque in orizzontale".

## Raccomandazioni ancora aperte

1. **Accorciare 32 risposte troppo lunghe** (oltre 70 caratteri, fino a 121). L'elenco con file e riga è in [`opzioni-da-accorciare.md`](opzioni-da-accorciare.md).
2. **Il font per la dislessia dipende dal dispositivo.** Il README parla di Atkinson Hyperlegible, ma il codice usa Comic Sans, che non c'è su iPhone, iPad e Android. Conviene includere nel pacchetto un font libero (Atkinson Hyperlegible o OpenDyslexic).
3. **Otto regole BES si possono attivare ma non fanno nulla:** `extraTime`, `oneAtATime`, `colorCoding`, `positiveReinforcement`, `predictableLayout`, `noStreakPressure`, `clearProgress`, `immediateFeedback`. Vanno implementate o nascoste.
4. **Lo zoom con due dita è bloccato** (`user-scalable=no`): per l'ipovisione è una barriera. Valutare di riattivarlo almeno nelle schermate HTML.
5. **Profilo "Ipovisione":** documentazione e test lo citano ma non esiste. Si potrebbe aggiungere (alto contrasto, testo grande, bottoni grandi).
6. **6 domande duplicate** nella banca (stesso testo, id diversi).
7. **Pulizia della radice del repository:** i file `PATCH-*.txt`, `DISPATCH-*` e simili sono note di lavoro.
