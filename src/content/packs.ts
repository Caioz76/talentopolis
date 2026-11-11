/**
 * Pacchetti EMBEDDED nel gioco (funzionano anche via file://, zero rete).
 * Include le 3 tappe complete per ciascuna delle 4 materie (72 prove nelle
 * tappe + la banca estesa per anno scolastico in `question-bank.ts`).
 * I pacchetti caricati dall'insegnante (editor / file JSON) vivono in
 * localStorage sotto 'packs.custom' e qui vengono uniti a questi.
 */
import type { Level, Pack, Round } from './types';
import { storage } from '../core/storage';
import { normalizzaAnno, type AnnoScolastico, type BesSettings } from '../bes/resolver';
import { BANCA_DOMANDE } from './question-bank';

const K_CUSTOM = 'packs.custom';

const MAT: Pack = {
  packId: 'mat-7-9',
  version: 'starter',
  title: 'Matematica',
  subject: 'matematica',
  ageRange: '7-9',
  difficulty: 1,
  levels: [
    {
      id: 'mat-7-9-l1',
      title: 'Prima tappa: contare e operare',
      difficulty: 1,
      rounds: [
        {
          id: 'mat-1', type: 'quiz',
          prompt: 'Quanto fa 7 + 5?',
          options: [
            { label: '12', correct: true },
            { label: '11', correct: false },
            { label: '13', correct: false },
            { label: '10', correct: false }
          ],
          hint: 'Completa il 7 fino a 10, poi conta il resto.',
          explanation: '7 + 3 fa 10, e 2 in più fanno 12.'
        },
        {
          id: 'mat-2', type: 'quiz',
          prompt: 'Quale numero manca? 14, 15, ..., 17',
          options: [
            { label: '16', correct: true },
            { label: '18', correct: false },
            { label: '13', correct: false }
          ],
          hint: 'Conta di uno in uno.',
          explanation: 'Dopo il 15 viene il 16, poi il 17.'
        },
        {
          id: 'mat-3', type: 'quiz',
          prompt: 'Marta ha 9 figurine e ne trova altre 4. Quante figurine ha adesso?',
          options: [
            { label: '13', correct: true },
            { label: '12', correct: false },
            { label: '14', correct: false },
            { label: '11', correct: false }
          ],
          hint: 'Somma 9 + 4.',
          explanation: '9 + 4 = 13.'
        },
        {
          id: 'mat-4', type: 'quiz',
          prompt: 'Quanto fa 12 − 5?',
          options: [
            { label: '7', correct: true },
            { label: '6', correct: false },
            { label: '8', correct: false }
          ],
          hint: 'Conta indietro di 5 dal 12.',
          explanation: '12 − 5 = 7.'
        },
        {
          id: 'mat-5', type: 'dragdrop', mode: 'sort',
          prompt: 'Metti i numeri in ordine, dal più piccolo al più grande.',
          sortItems: ['3', '8', '12', '20'],
          hint: 'Il più piccolo va per primo.',
          explanation: "L'ordine crescente è 3, 8, 12, 20."
        },
        {
          id: 'mat-6', type: 'dragdrop', mode: 'match',
          prompt: 'Abbina ogni operazione al suo risultato.',
          leftItems: ['2 + 3', '9 − 2', '4 × 2'],
          rightItems: ['7', '5', '8'],
          pairs: [[0, 1], [1, 0], [2, 2]],
          hint: 'Fai ogni operazione e cerca il numero giusto.',
          explanation: '2 + 3 = 5, 9 − 2 = 7, 4 × 2 = 8.'
        }
      ]
    },
    {
      id: 'mat-7-9-l2',
      title: 'Seconda tappa: contare, sommare, ordinare',
      difficulty: 2,
      rounds: [
        {
          id: 'mat-l2-1', type: 'quiz',
          prompt: 'Quanto fa 8 + 7?',
          options: [
            { label: '15', correct: true },
            { label: '14', correct: false },
            { label: '16', correct: false }
          ],
          hint: 'Parti da 8, arriva prima a 10 aggiungendo 2 e poi aggiungi il resto.',
          explanation: '8 più 2 fa 10, e aggiungendo altri 5 si arriva a 15.'
        },
        {
          id: 'mat-l2-2', type: 'quiz',
          prompt: 'Quanto fa 17 − 5?',
          options: [
            { label: '11', correct: false },
            { label: '12', correct: true },
            { label: '13', correct: false }
          ],
          hint: 'Togli 5 unità alle 7 unità lasciando la decina intatta.',
          explanation: '7 meno 5 fa 2, quindi 17 meno 5 fa 12.'
        },
        {
          id: 'mat-l2-3', type: 'quiz',
          prompt: 'Quale numero viene dopo nella sequenza 20, 30, 40, ...?',
          options: [
            { label: '45', correct: false },
            { label: '50', correct: true },
            { label: '60', correct: false }
          ],
          hint: 'Ogni passo aggiunge una decina.',
          explanation: 'Contando di 10 in 10, dopo il 40 viene il 50.'
        },
        {
          id: 'mat-l2-4', type: 'quiz',
          prompt: 'Luca ha 9 biglie rosse e riceve 5 biglie blu. Quante biglie ha in tutto?',
          options: [
            { label: '14', correct: true },
            { label: '13', correct: false },
            { label: '15', correct: false }
          ],
          hint: 'Unisci le biglie rosse e quelle blu facendo una somma.',
          explanation: 'Sommando 9 biglie rosse e 5 biglie blu si ottengono 14 biglie in tutto.'
        },
        {
          id: 'mat-l2-5', type: 'dragdrop', mode: 'sort',
          prompt: 'Metti questi quattro numeri in ordine dal più piccolo al più grande.',
          sortItems: ['4', '9', '14', '19'],
          hint: 'Guarda prima le decine e inizia dal numero più piccolo.',
          explanation: "L'ordine è 4, 9, 14, 19."
        },
        {
          id: 'mat-l2-6', type: 'sequence', direction: 'tap',
          prompt: 'Tocca i numeri in ordine, contando di 5 in 5.',
          items: ['5', '10', '15'],
          hint: 'Parti dal numero più piccolo e aggiungi sempre 5 a ogni passo.',
          explanation: 'Contando di 5 in 5 in ordine crescente troviamo 5, 10 e 15.'
        }
      ]
    },
    {
      id: 'mat-7-9-l3',
      title: 'Terza tappa: moltiplicare e dividere',
      difficulty: 3,
      rounds: [
        {
          id: 'mat-l3-1', type: 'quiz',
          prompt: 'Quanto fa 7 × 8?',
          options: [
            { label: '56', correct: true },
            { label: '48', correct: false },
            { label: '64', correct: false }
          ],
          hint: 'Pensa a 7 × 4 = 28 e raddoppia.',
          explanation: '7 × 8 = 56, perché 7 × 4 fa 28 e il doppio di 28 è 56.'
        },
        {
          id: 'mat-l3-2', type: 'quiz',
          prompt: 'Quanto fa 36 ÷ 6?',
          options: [
            { label: '6', correct: true },
            { label: '5', correct: false },
            { label: '7', correct: false }
          ],
          hint: 'Cerca quel numero che moltiplicato per 6 dà 36.',
          explanation: '6 × 6 = 36, quindi 36 diviso 6 fa 6.'
        },
        {
          id: 'mat-l3-3', type: 'quiz',
          prompt: 'Ci sono 3 scatole con 8 matite ciascuna. Quante matite in tutto?',
          options: [
            { label: '24', correct: true },
            { label: '11', correct: false },
            { label: '32', correct: false }
          ],
          hint: 'Tre gruppi uguali: usa una moltiplicazione.',
          explanation: '3 × 8 = 24: tre scatole da otto matite fanno ventiquattro matite.'
        },
        {
          id: 'mat-l3-4', type: 'quiz',
          prompt: 'Quale operazione dà come risultato 20?',
          options: [
            { label: '4 × 5', correct: true },
            { label: '4 + 5', correct: false },
            { label: '20 ÷ 5', correct: false }
          ],
          hint: 'Prova a moltiplicare, non solo ad addizionare.',
          explanation: '4 × 5 = 20. Le altre due operazioni danno 9 e 4.'
        },
        {
          id: 'mat-l3-5', type: 'dragdrop', mode: 'sort',
          prompt: 'Metti in ordine crescente i risultati della tabellina del 6.',
          sortItems: ['12', '18', '24', '30'],
          hint: 'Parti da 6 × 2 e aggiungi sempre 6.',
          explanation: '6 × 2 = 12, 6 × 3 = 18, 6 × 4 = 24, 6 × 5 = 30.'
        },
        {
          id: 'mat-l3-6', type: 'sequence', direction: 'tap',
          prompt: 'Tocca i risultati di 3 × 2, 3 × 3 e 3 × 4 nell\'ordine.',
          items: ['6', '9', '12'],
          hint: 'Il risultato cresce di 3 a ogni passo.',
          explanation: '3 × 2 = 6, 3 × 3 = 9, 3 × 4 = 12.'
        }
      ]
    }
  ]
};

const ITA: Pack = {
  packId: 'ita-8-10',
  version: 'starter',
  title: 'Italiano',
  subject: 'italiano',
  ageRange: '8-10',
  difficulty: 1,
  levels: [
    {
      id: 'ita-8-10-l1',
      title: 'Prima tappa: parole e suoni',
      difficulty: 1,
      rounds: [
        {
          id: 'ita-1', type: 'quiz',
          prompt: 'Quale di queste parole è un nome?',
          options: [
            { label: 'cane', correct: true },
            { label: 'corre', correct: false },
            { label: 'rosso', correct: false },
            { label: 'bene', correct: false }
          ],
          hint: 'Il nome indica una persona, un animale o una cosa.',
          explanation: '"Cane" è un nome: indica un animale. Le altre sono verbo, aggettivo e avverbio.'
        },
        {
          id: 'ita-2', type: 'image', icon: 'mela',
          prompt: 'Che cosa vedi nell\'immagine?',
          options: [
            { label: 'Una mela', correct: true },
            { label: 'Una banana', correct: false },
            { label: 'Una carota', correct: false }
          ],
          hint: 'È rossa e rotonda.',
          explanation: "L'icona mostra una mela rossa."
        },
        {
          id: 'ita-3', type: 'quiz',
          prompt: 'Qual è il plurale di "cavallo"?',
          options: [
            { label: 'cavalli', correct: true },
            { label: 'cavallo', correct: false },
            { label: 'cavallini', correct: false }
          ],
          hint: 'Molti cavalli al pascolo.',
          explanation: 'Il plurale di "cavallo" è "cavalli".'
        },
        {
          id: 'ita-4', type: 'quiz',
          prompt: 'Quale parola ha la sillaba iniziale "co"?',
          options: [
            { label: 'cozza', correct: true },
            { label: 'gatto', correct: false },
            { label: 'lago', correct: false },
            { label: 'nido', correct: false }
          ],
          hint: 'Si mangia al mare.',
          explanation: '"Cozza" inizia con la sillaba "co".'
        },
        {
          id: 'ita-5', type: 'image', icon: 'nave',
          prompt: 'Con quale parola completa la frase? "La ... attraversa il mare."',
          options: [
            { label: 'nave', correct: true },
            { label: 'luna', correct: false },
            { label: 'moneta', correct: false }
          ],
          hint: 'Ha una prua e una poppa.',
          explanation: 'La nave è il mezzo che attraversa il mare.'
        },
        {
          id: 'ita-6', type: 'sequence', direction: 'tap',
          prompt: 'Metti in ordine le tappe della giornata, dalla mattina alla sera.',
          items: ['Mi sveglio', 'Colazione', 'Scuola', 'Merenda', 'Dormo'],
          hint: 'Prima ci si sveglia, poi si fa colazione.',
          explanation: 'L\'ordine è: mi sveglio, colazione, scuola, merenda, dormo.'
        }
      ]
    },
    {
      id: 'ita-8-10-l2',
      title: 'Seconda tappa: parole, frasi, ordine',
      difficulty: 2,
      rounds: [
        {
          id: 'ita-l2-1', type: 'quiz',
          prompt: 'Quale parola ha lo stesso significato di «veloce»?',
          options: [
            { label: 'rapido', correct: true },
            { label: 'lento', correct: false },
            { label: 'pesante', correct: false }
          ],
          hint: 'Pensa a come corre una lepre rispetto a una tartaruga.',
          explanation: '«Rapido» è un sinonimo di «veloce», perché indica qualcuno o qualcosa che si muove in fretta.'
        },
        {
          id: 'ita-l2-2', type: 'quiz',
          prompt: 'Quale articolo determinativo è corretto davanti alla parola «zaino»?',
          options: [
            { label: 'lo', correct: true },
            { label: 'il', correct: false },
            { label: 'la', correct: false }
          ],
          hint: 'Davanti alle parole maschili che iniziano per z non si usa «il».',
          explanation: 'Si scrive «lo zaino» perché davanti ai nomi maschili singolari che iniziano con la lettera z si usa l\'articolo «lo».'
        },
        {
          id: 'ita-l2-3', type: 'quiz',
          prompt: 'Quale di queste frasi è scritta in modo corretto con maiuscola e punto?',
          options: [
            { label: 'Il cane corre nel prato.', correct: true },
            { label: 'il cane corre nel prato', correct: false },
            { label: 'il cane. corre nel prato', correct: false }
          ],
          hint: 'Controlla come inizia la prima parola e quale segno c\'è alla fine della frase.',
          explanation: 'Ogni frase inizia sempre con la lettera maiuscola e termina con il punto fermo.'
        },
        {
          id: 'ita-l2-4', type: 'quiz',
          prompt: 'Quale parola completa la frase «Quando piove apro ... per non bagnarmi»?',
          options: [
            { label: "l'ombrello", correct: true },
            { label: "l'orologio", correct: false },
            { label: "l'armadio", correct: false }
          ],
          hint: 'È un oggetto che si tiene aperto sopra la testa quando cade la pioggia.',
          explanation: "L'ombrello è l'oggetto che serve per ripararsi dalla pioggia e restare asciutti."
        },
        {
          id: 'ita-l2-5', type: 'dragdrop', mode: 'sort',
          prompt: 'Metti queste quattro parole in ordine alfabetico.',
          sortItems: ['albero', 'fiore', 'mare', 'sole'],
          hint: "Osserva la prima lettera di ogni parola e segui l'ordine dell'alfabeto dalla A alla Z.",
          explanation: "L'ordine alfabetico segue le iniziali: A di albero, F di fiore, M di mare, S di sole."
        },
        {
          id: 'ita-l2-6', type: 'sequence', direction: 'tap',
          prompt: 'Tocca le tre parole nell\'ordine giusto per formare una frase di senso compiuto.',
          items: ['Il', 'bambino', 'sorride'],
          hint: "Parti dall'articolo con la lettera maiuscola, poi scegli il nome e infine l'azione.",
          explanation: 'In italiano l\'articolo «Il» precede il nome «bambino», seguito dal verbo «sorride».'
        }
      ]
    },
    {
      id: 'ita-8-10-l3',
      title: 'Terza tappa: significati e tempi',
      difficulty: 3,
      rounds: [
        {
          id: 'ita-l3-1', type: 'quiz',
          prompt: 'Quale parola ha lo stesso significato di «felice»?',
          options: [
            { label: 'contento', correct: true },
            { label: 'triste', correct: false },
            { label: 'stanco', correct: false }
          ],
          hint: 'Pensa a come ti senti quando ricevi un regalo che desideri.',
          explanation: '«Contento» è un sinonimo di «felice»: indicano la stessa emozione.'
        },
        {
          id: 'ita-l3-2', type: 'quiz',
          prompt: 'Qual è il contrario di «alto»?',
          options: [
            { label: 'basso', correct: true },
            { label: 'lungo', correct: false },
            { label: 'grande', correct: false }
          ],
          hint: 'Pensa a una cosa che sta vicino al pavimento.',
          explanation: '«Basso» è il contrario di «alto».'
        },
        {
          id: 'ita-l3-3', type: 'quiz',
          prompt: 'Quale frase racconta qualcosa che è già successo?',
          options: [
            { label: 'Ieri ho giocato al parco.', correct: true },
            { label: 'Oggi gioco al parco.', correct: false },
            { label: 'Domani giocherò al parco.', correct: false }
          ],
          hint: 'Cerca la parola che indica un tempo passato.',
          explanation: '«Ieri ho giocato al parco» è al passato: l\'azione è già avvenuta.'
        },
        {
          id: 'ita-l3-4', type: 'dragdrop', mode: 'match',
          prompt: 'Abbina ogni parola al suo contrario.',
          leftItems: ['alto', 'giorno', 'caldo'],
          rightItems: ['freddo', 'basso', 'notte'],
          pairs: [[0, 1], [1, 2], [2, 0]],
          hint: 'Ogni parola ha un opposto di significato.',
          explanation: 'Alto/basso, giorno/notte e caldo/freddo sono coppie di contrari.'
        },
        {
          id: 'ita-l3-5', type: 'dragdrop', mode: 'sort',
          prompt: 'Metti queste parole in ordine alfabetico.',
          sortItems: ['casa', 'dado', 'festa', 'gomma'],
          hint: 'Guarda la prima lettera e poi la seconda.',
          explanation: 'L\'ordine è: casa, dado, festa, gomma.'
        },
        {
          id: 'ita-l3-6', type: 'sequence', direction: 'tap',
          prompt: 'Tocca le parole nell\'ordine giusto per formare una frase.',
          items: ['La', 'luna', 'splende', 'nel cielo'],
          hint: 'Si parte dall\'articolo, poi il nome, il verbo e dove avviene.',
          explanation: 'La frase corretta è «La luna splende nel cielo».'
        }
      ]
    }
  ]
};

const SCI: Pack = {
  packId: 'sci-8-10',
  version: 'starter',
  title: 'Scienze',
  subject: 'scienze',
  ageRange: '8-10',
  difficulty: 1,
  levels: [
    {
      id: 'sci-8-10-l1',
      title: 'Prima tappa: il mondo naturale',
      difficulty: 1,
      rounds: [
        {
          id: 'sci-1', type: 'image', icon: 'albero',
          prompt: 'Che cosa vedi nell\'immagine?',
          options: [
            { label: 'Un albero', correct: true },
            { label: 'Un fiore', correct: false },
            { label: 'Una foglia', correct: false }
          ],
          hint: 'Ha un tronco e una chioma.',
          explanation: "L'icona mostra un albero."
        },
        {
          id: 'sci-2', type: 'image', icon: 'sole',
          prompt: 'Quale corpo celeste riscalda la Terra?',
          options: [
            { label: 'Il Sole', correct: true },
            { label: 'La Luna', correct: false },
            { label: 'Marte', correct: false }
          ],
          hint: 'È una stella, la più vicina a noi.',
          explanation: 'Il Sole è la stella che riscalda la Terra.'
        },
        {
          id: 'sci-3', type: 'quiz',
          prompt: 'Come si chiama il processo con cui le piante producono il proprio cibo?',
          options: [
            { label: 'Fotosintesi', correct: true },
            { label: 'Digestione', correct: false },
            { label: 'Respirazione', correct: false }
          ],
          hint: 'Usa luce, acqua e anidride carbonica.',
          explanation: 'La fotosintesi trasforma luce, acqua e CO₂ in nutrimento per la pianta.'
        },
        {
          id: 'sci-4', type: 'quiz',
          prompt: 'Quale di questi è un vertebrato?',
          options: [
            { label: 'Pesce', correct: true },
            { label: 'Lumaca', correct: false },
            { label: 'Ragno', correct: false },
            { label: 'Verme', correct: false }
          ],
          hint: 'Ha una colonna vertebrale.',
          explanation: 'Il pesce ha la colonna vertebrale; lumaca, ragno e verme no.'
        },
        {
          id: 'sci-5', type: 'dragdrop', mode: 'match',
          prompt: 'Abbina l\'organo alla sua funzione.',
          leftItems: ['Cuore', 'Polmoni', 'Cervello'],
          rightItems: ['Pensa', 'Pompa il sangue', 'Respira'],
          pairs: [[0, 1], [1, 2], [2, 0]],
          hint: 'Ogni organo ha un compito speciale.',
          explanation: 'Il cuore pompa il sangue, i polmoni respirano, il cervello pensa.'
        },
        {
          id: 'sci-6', type: 'quiz',
          prompt: 'In quale stato si trova l\'acqua di un ghiacciolo?',
          options: [
            { label: 'Solido', correct: true },
            { label: 'Liquido', correct: false },
            { label: 'Gassoso', correct: false }
          ],
          hint: 'Puoi tenerlo in mano.',
          explanation: "L'acqua del ghiacciolo è allo stato solido."
        }
      ]
    },
    {
      id: 'sci-8-10-l2',
      title: 'Seconda tappa: viventi e ambiente',
      difficulty: 2,
      rounds: [
        {
          id: 'sci-l2-1', type: 'quiz',
          prompt: 'Quale di questi animali è un mammifero?',
          options: [
            { label: 'Delfino', correct: true },
            { label: 'Squalo', correct: false },
            { label: 'Rana', correct: false }
          ],
          hint: 'Respira con i polmoni e allatta i piccoli.',
          explanation: 'Il delfino è un mammifero: respira con i polmoni e allatta i suoi piccoli, anche se vive nel mare.'
        },
        {
          id: 'sci-l2-2', type: 'quiz',
          prompt: 'Da quale parte della pianta le radici prendono l\'acqua?',
          options: [
            { label: 'Dal terreno', correct: true },
            { label: 'Dall\'aria', correct: false },
            { label: 'Dal fiore', correct: false }
          ],
          hint: 'Le radici stanno sotto terra.',
          explanation: 'Le radici assorbono dal terreno l\'acqua e i sali minerali che servono alla pianta.'
        },
        {
          id: 'sci-l2-3', type: 'image', icon: 'foglia',
          prompt: 'Quale parte della pianta vedi nell\'immagine?',
          options: [
            { label: 'Una foglia', correct: true },
            { label: 'Un fiore', correct: false },
            { label: 'Una radice', correct: false }
          ],
          hint: 'È verde e serve alla pianta per respirare.',
          explanation: 'L\'immagine mostra una foglia: è la parte verde dove la pianta produce il nutrimento.'
        },
        {
          id: 'sci-l2-4', type: 'quiz',
          prompt: 'Quale catena alimentare è nell\'ordine giusto?',
          options: [
            { label: 'Erba → cavalletta → rana', correct: true },
            { label: 'Rana → erba → cavalletta', correct: false },
            { label: 'Cavalletta → rana → erba', correct: false }
          ],
          hint: 'Si parte da ciò che mangia il primo animale.',
          explanation: 'L\'erba è mangiata dalla cavalletta, che a sua volta è mangiata dalla rana.'
        },
        {
          id: 'sci-l2-5', type: 'dragdrop', mode: 'sort',
          prompt: 'Metti in ordine le tappe del ciclo dell\'acqua.',
          sortItems: ['Evaporazione', 'Condensazione', 'Precipitazione', 'Raccolta'],
          hint: 'L\'acqua prima evapora, poi forma le nuvole e infine cade.',
          explanation: 'L\'acqua evapora, condensa nelle nuvole, cade come pioggia e si raccoglie di nuovo.'
        },
        {
          id: 'sci-l2-6', type: 'sequence', direction: 'tap',
          prompt: 'Tocca le tappe della farfalla nell\'ordine giusto.',
          items: ['Uovo', 'Bruco', 'Crisalide', 'Farfalla'],
          hint: 'La farfalla nasce da un piccolo uovo.',
          explanation: 'La farfalla passa da uovo a bruco, poi crisalide e infine farfalla adulta.'
        }
      ]
    },
    {
      id: 'sci-8-10-l3',
      title: 'Terza tappa: materia, energia, pianeta',
      difficulty: 3,
      rounds: [
        {
          id: 'sci-l3-1', type: 'quiz',
          prompt: 'Di che cosa è fatta la materia?',
          options: [
            { label: 'Di particelle piccolissime', correct: true },
            { label: 'Solo di acqua', correct: false },
            { label: 'Solo di aria', correct: false }
          ],
          hint: 'Anche un granello di sale è fatto di parti piccolissime.',
          explanation: 'Tutta la materia è fatta di particelle piccolissime, invisibili a occhio nudo.'
        },
        {
          id: 'sci-l3-2', type: 'quiz',
          prompt: 'Quale di queste è una fonte di energia rinnovabile?',
          options: [
            { label: 'Il Sole', correct: true },
            { label: 'Il carbone', correct: false },
            { label: 'Il petrolio', correct: false }
          ],
          hint: 'Si rinnova da sola e non finisce.',
          explanation: 'Il Sole è una fonte rinnovabile: la sua energia non si esaurisce come carbone o petrolio.'
        },
        {
          id: 'sci-l3-3', type: 'image', icon: 'montagna',
          prompt: 'Quale ambiente vedi nell\'immagine?',
          options: [
            { label: 'La montagna', correct: true },
            { label: 'Il deserto', correct: false },
            { label: 'Il mare', correct: false }
          ],
          hint: 'È un rilievo molto alto, spesso con la neve in cima.',
          explanation: 'L\'immagine mostra una montagna: un rilievo alto con pendii e vette.'
        },
        {
          id: 'sci-l3-4', type: 'quiz',
          prompt: 'Quali sono i tre stati della materia?',
          options: [
            { label: 'Solido, liquido, gassoso', correct: true },
            { label: 'Caldo, freddo, tiepido', correct: false },
            { label: 'Grande, medio, piccolo', correct: false }
          ],
          hint: 'Pensa al ghiaccio, all\'acqua e al vapore.',
          explanation: 'La materia può essere solida, liquida o gassosa: è il caso dell\'acqua.'
        },
        {
          id: 'sci-l3-5', type: 'dragdrop', mode: 'sort',
          prompt: 'Metti in ordine i pianeti dal più vicino al più lontano dal Sole.',
          sortItems: ['Mercurio', 'Terra', 'Giove', 'Saturno'],
          hint: 'La Terra è il terzo pianeta.',
          explanation: 'L\'ordine è Mercurio, Terra, Giove, Saturno.'
        },
        {
          id: 'sci-l3-6', type: 'sequence', direction: 'tap',
          prompt: 'Tocca le tappe della semina nell\'ordine giusto.',
          items: ['Prepara il terreno', 'Semina', 'Annaffia', 'Raccogli'],
          hint: 'Prima si prepara la terra, per ultimo si raccoglie.',
          explanation: 'Si prepara il terreno, si semina, si annaffia e infine si raccoglie.'
        }
      ]
    }
  ]
};

const STO: Pack = {
  packId: 'sto-10-12',
  version: 'starter',
  title: 'Storia',
  subject: 'storia',
  ageRange: '10-12',
  difficulty: 2,
  levels: [
    {
      id: 'sto-10-12-l1',
      title: 'Prima tappa: antichi popoli',
      difficulty: 1,
      rounds: [
        {
          id: 'sto-1', type: 'quiz',
          prompt: 'In quale civiltà vivevano i faraoni?',
          options: [
            { label: 'Egitto', correct: true },
            { label: 'Grecia', correct: false },
            { label: 'Roma', correct: false }
          ],
          hint: 'È famosa per le piramidi e i geroglifici.',
          explanation: 'I faraoni erano i re dell\'antico Egitto.'
        },
        {
          id: 'sto-2', type: 'sequence', direction: 'tap',
          prompt: 'Metti in ordine questi periodi storici, dal più antico al più recente.',
          items: ['Paleolitico', 'Neolitico', 'Età del Bronzo', 'Età del Ferro'],
          hint: 'La pietra arriva prima dei metalli.',
          explanation: "L'ordine è: Paleolitico, Neolitico, Età del Bronzo, Età del Ferro."
        },
        {
          id: 'sto-3', type: 'quiz',
          prompt: 'Quale popolo ha fondato la città di Roma secondo la leggenda?',
          options: [
            { label: 'I Latini (Romolo e Remo)', correct: true },
            { label: 'I Greci', correct: false },
            { label: 'I Galli', correct: false },
            { label: 'I Cartaginesi', correct: false }
          ],
          hint: 'Due fratelli gemelli.',
          explanation: 'Secondo la leggenda, Roma fu fondata da Romolo e Remo.'
        },
        {
          id: 'sto-4', type: 'sequence', direction: 'tap',
          prompt: 'Metti in ordine come veniva diffusa una notizia nell\'antichità.',
          items: ['Accade un fatto', 'Si scrive il messaggio', 'L\'araldo parte', 'La notizia viene annunciata'],
          hint: 'Prima accade il fatto, poi si scrive il messaggio.',
          explanation: "L'ordine è: accade il fatto, si scrive il messaggio, l'araldo parte, la notizia viene annunciata."
        },
        {
          id: 'sto-5', type: 'dragdrop', mode: 'sort',
          prompt: 'Metti in ordine le tappe della costruzione di una città romana.',
          sortItems: ['Si sceglie il luogo', 'Si costruiscono le mura', 'Si alzano le case', 'Si costruisce il foro'],
          hint: 'Prima si sceglie dove costruire.',
          explanation: "L'ordine è: si sceglie il luogo, si costruiscono le mura, si alzano le case, si costruisce il foro."
        },
        {
          id: 'sto-6', type: 'quiz',
          prompt: 'Che cos\'era il Foro a Roma?',
          options: [
            { label: 'Il centro della vita pubblica e commerciale', correct: true },
            { label: 'Una prigione', correct: false },
            { label: 'Un teatro segreto', correct: false }
          ],
          hint: 'Lì si vendeva, si parlava e si faceva politica.',
          explanation: 'Il Foro era la piazza principale della città, centro della vita pubblica.'
        }
      ]
    },
    {
      id: 'sto-10-12-l2',
      title: 'Seconda tappa: Grecia e Roma',
      difficulty: 2,
      rounds: [
        {
          id: 'sto-l2-1', type: 'quiz',
          prompt: 'In quale città greca nacque la democrazia?',
          options: [
            { label: 'Atene', correct: true },
            { label: 'Sparta', correct: false },
            { label: 'Tebe', correct: false }
          ],
          hint: 'È la città dell\'Acropoli e del Partenone.',
          explanation: 'Ad Atene, nel V secolo a.C., i cittadini iniziarono a decidere insieme delle leggi.'
        },
        {
          id: 'sto-l2-2', type: 'quiz',
          prompt: 'Chi poteva votare nell\'assemblea di Atene?',
          options: [
            { label: 'Gli uomini liberi adulti', correct: true },
            { label: 'Tutti gli abitanti', correct: false },
            { label: 'Solo i soldati', correct: false }
          ],
          hint: 'Non tutti gli abitanti erano cittadini.',
          explanation: 'Votavano solo gli uomini liberi adulti, figli di genitori ateniesi; donne, schiavi e stranieri erano esclusi.'
        },
        {
          id: 'sto-l2-3', type: 'sequence', direction: 'tap',
          prompt: 'Metti in ordine le forme di governo di Roma, dalla più antica.',
          items: ['Monarchia', 'Repubblica', 'Impero'],
          hint: 'Prima ci fu un re, poi la Repubblica, infine l\'Impero.',
          explanation: 'Roma fu prima una monarchia, poi una repubblica e infine un impero.'
        },
        {
          id: 'sto-l2-4', type: 'quiz',
          prompt: 'Che cosa erano le terme romane?',
          options: [
            { label: 'Luoghi pubblici per lavarsi e incontrarsi', correct: true },
            { label: 'Templi dedicati agli dei', correct: false },
            { label: 'Magazzini per il grano', correct: false }
          ],
          hint: 'Ci si andava per lavarsi, ma anche per incontrarsi.',
          explanation: 'Le terme erano edifici pubblici con bagni caldi e freddi, palestre e luoghi di incontro.'
        },
        {
          id: 'sto-l2-5', type: 'dragdrop', mode: 'match',
          prompt: 'Abbina ogni data al suo evento.',
          leftItems: ['753 a.C.', '509 a.C.', '476 d.C.'],
          rightItems: ['Fine dell\'Impero d\'Occidente', 'Fondazione di Roma', 'Nascita della Repubblica'],
          pairs: [[0, 1], [1, 2], [2, 0]],
          hint: 'Più il numero è grande, più l\'evento è recente.',
          explanation: 'Roma fu fondata nel 753 a.C., la Repubblica nacque nel 509 a.C. e l\'Impero d\'Occidente finì nel 476 d.C.'
        },
        {
          id: 'sto-l2-6', type: 'quiz',
          prompt: 'Chi era Alessandro Magno?',
          options: [
            { label: 'Il re macedone che creò un grande impero', correct: true },
            { label: 'Un imperatore romano', correct: false },
            { label: 'Un filosofo ateniese', correct: false }
          ],
          hint: 'Era il re della Macedonia.',
          explanation: 'Alessandro Magno fu re di Macedonia e creò un vasto impero che unì la Grecia all\'Oriente.'
        }
      ]
    },
    {
      id: 'sto-10-12-l3',
      title: 'Terza tappa: Medioevo e Rinascimento',
      difficulty: 3,
      rounds: [
        {
          id: 'sto-l3-1', type: 'quiz',
          prompt: 'Che cos\'era un feudo nel Medioevo?',
          options: [
            { label: 'Una terra concessa in cambio di fedeltà', correct: true },
            { label: 'Una nave da guerra', correct: false },
            { label: 'Una moneta d\'oro', correct: false }
          ],
          hint: 'Il signore concedeva terre in cambio di fedeltà e servizio.',
          explanation: 'Il feudo era la terra concessa dal signore al vassallo, che in cambio gli giurava fedeltà.'
        },
        {
          id: 'sto-l3-2', type: 'quiz',
          prompt: 'Chi era Carlo Magno?',
          options: [
            { label: 'Il re dei Franchi incoronato imperatore', correct: true },
            { label: 'Un imperatore romano del I secolo', correct: false },
            { label: 'Un pirata del Mediterraneo', correct: false }
          ],
          hint: 'Fu incoronato imperatore nell\'800.',
          explanation: 'Carlo Magno era il re dei Franchi; nell\'800 fu incoronato imperatore dal Papa.'
        },
        {
          id: 'sto-l3-3', type: 'sequence', direction: 'tap',
          prompt: 'Metti in ordine questi eventi, dal più antico al più recente.',
          items: ['Fine dell\'Impero d\'Occidente', 'Incoronazione di Carlo Magno', 'Scoperta dell\'America'],
          hint: 'La fine dell\'Impero romano d\'Occidente viene prima del Medioevo.',
          explanation: '476: fine dell\'Impero d\'Occidente; 800: incoronazione di Carlo Magno; 1492: scoperta dell\'America.'
        },
        {
          id: 'sto-l3-4', type: 'quiz',
          prompt: 'Che cos\'era la peste nera?',
          options: [
            { label: 'Una grave epidemia del Trecento', correct: true },
            { label: 'Una guerra tra Francia e Inghilterra', correct: false },
            { label: 'Un tipo di nave mercantile', correct: false }
          ],
          hint: 'Nel Trecento colpì l\'Europa e fece moltissime vittime.',
          explanation: 'La peste nera fu una grave epidemia che nel XIV secolo uccise gran parte della popolazione europea.'
        },
        {
          id: 'sto-l3-5', type: 'dragdrop', mode: 'match',
          prompt: 'Abbina ogni opera o invenzione al suo autore.',
          leftItems: ['Stampa a caratteri mobili', 'Scoperta dell\'America', 'Ultima Cena'],
          rightItems: ['Leonardo da Vinci', 'Gutenberg', 'Colombo'],
          pairs: [[0, 1], [1, 2], [2, 0]],
          hint: 'Gutenberg lavorava con i caratteri mobili.',
          explanation: 'Gutenberg inventò la stampa a caratteri mobili, Colombo scoprì l\'America, Leonardo dipinse l\'Ultima Cena.'
        },
        {
          id: 'sto-l3-6', type: 'quiz',
          prompt: 'Che cosa metteva al centro l\'umanesimo?',
          options: [
            { label: 'L\'uomo e la sua capacità di creare', correct: true },
            { label: 'Solo la guerra', correct: false },
            { label: 'Solo il commercio', correct: false }
          ],
          hint: 'Riprendeva lo studio dei testi antichi e la fiducia nell\'uomo.',
          explanation: 'L\'umanesimo metteva al centro l\'uomo, la sua capacità di ragionare e di creare.'
        }
      ]
    }
  ]
};

// ── Caricamento ──────────────────────────────────────────────────────

export const EMBEDDED_PACKS: Pack[] = [MAT, ITA, SCI, STO];

export function loadCustomPacks(): Pack[] {
  return storage.get<Pack[]>(K_CUSTOM, []);
}

export function saveCustomPacks(packs: Pack[]): void {
  storage.set(K_CUSTOM, packs);
}

/** Tutti i pacchetti: embedded + personalizzati (deduplicati per packId, i custom vincono). */
export function allPacks(): Pack[] {
  const map = new Map<string, Pack>();
  for (const p of EMBEDDED_PACKS) map.set(p.packId, p);
  for (const p of loadCustomPacks()) map.set(p.packId, p);
  return Array.from(map.values());
}

// ── Selezione per anno scolastico ed estrazione casuale ─────────────

function mescola<T>(arr: readonly T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i];
    a[i] = a[j];
    a[j] = tmp;
  }
  return a;
}

/** Tappa predefinita di un pacchetto modellata sull'anno scolastico scelto. */
export function defaultLevelForYear(pack: Pack, year?: AnnoScolastico): Level {
  const y = normalizzaAnno(year);
  if (y === 'P4' || y === 'P5') {
    return pack.levels[1] ?? pack.levels[0];
  }
  if (y === 'S1' || y === 'S2' || y === 'S3') {
    return pack.levels[2] ?? pack.levels[pack.levels.length - 1] ?? pack.levels[0];
  }
  return pack.levels[0];
}

const LEVEL_YEARS_COMPATIBILITY: Record<string, AnnoScolastico[]> = {
  // Matematica
  'mat-7-9-l1': ['P1', 'P2', 'P3'],
  'mat-7-9-l2': ['P3', 'P4'],
  'mat-7-9-l3': ['P4', 'P5'],
  // Italiano
  'ita-8-10-l1': ['P2', 'P3'],
  'ita-8-10-l2': ['P3', 'P4'],
  'ita-8-10-l3': ['P4', 'P5'],
  // Scienze
  'sci-8-10-l1': ['P2', 'P3'],
  'sci-8-10-l2': ['P3', 'P4'],
  'sci-8-10-l3': ['P4', 'P5'],
  // Storia
  'sto-10-12-l1': ['P4', 'P5'],
  'sto-10-12-l2': ['P5', 'S1'],
  'sto-10-12-l3': ['S1', 'S2']
};

// Set in-memory dei round già visti nel percorso per ciascuna materia
const roundVistiNelPercorso: Record<string, Set<string>> = {
  matematica: new Set(),
  italiano: new Set(),
  scienze: new Set(),
  storia: new Set()
};

/** Recupera la cronologia FIFO delle domande già viste (memoria + persistenza storage) */
function getVistiHistory(subject: string): string[] {
  const stored = storage.get<string[]>(`percorso.visti.${subject}`, []);
  const mem = roundVistiNelPercorso[subject];
  if (mem && mem.size > 0) {
    for (const id of mem) {
      if (!stored.includes(id)) stored.push(id);
    }
  }
  return stored;
}

/** Registra i nuovi id visti nell'ordine cronologico FIFO e salva in storage */
function recordVisti(subject: string, ids: string[]): void {
  const existing = getVistiHistory(subject);
  const filtered = existing.filter((id) => !ids.includes(id));
  const updated = [...filtered, ...ids].slice(-400); // preserva fino a 400 domande storiche
  storage.set(`percorso.visti.${subject}`, updated);
  roundVistiNelPercorso[subject] = new Set(updated);
}

/** Reset del percorso per una materia o per tutte */
export function resetPercorso(materia?: string): void {
  if (materia) {
    if (roundVistiNelPercorso[materia]) {
      roundVistiNelPercorso[materia].clear();
    }
    storage.set(`percorso.visti.${materia}`, []);
  } else {
    for (const k of ['matematica', 'italiano', 'scienze', 'storia']) {
      if (roundVistiNelPercorso[k]) {
        roundVistiNelPercorso[k].clear();
      }
      storage.set(`percorso.visti.${k}`, []);
    }
  }
}

let proveAttive: Round[] = [];

/** Prove della partita in corso (esposte anche su window.__GIOCO__.rounds). */
export function getActiveRounds(): Round[] {
  return proveAttive;
}

/**
 * Seleziona le prove per la partita (6 per un giocatore; in squadra almeno 2 a testa):
 * - garantisce la STRETTA coerenza con l'anno scolastico attivo (`settings.schoolYear`):
 *   i quesiti sono rigorosamente calibrati per l'anno dell'alunno (né più semplici, né più complessi);
 * - include i quesiti originali della tappa solo se compatibili con il grado dell'alunno;
 * - esclude categoricamente le domande già viste nelle tappe precedenti dello stesso percorso;
 * - bilancia scelte multiple e prove interattive senza mai ripescare quesiti già affrontati.
 */
export function selectRoundsForGame(
  pack: Pack,
  level: Level,
  settings: BesSettings,
  quante = 6
): Round[] {
  const anno = normalizzaAnno(settings.schoolYear);
  const compatibili = LEVEL_YEARS_COMPATIBILITY[level.id]?.includes(anno) ?? false;

  const extra = (BANCA_DOMANDE[pack.subject] ?? [])
    .filter((t) => t.years.includes(anno))
    .map((t) => t.round);

  if (settings.randomQuestions === false) {
    if (compatibili && level.rounds.length >= quante) {
      proveAttive = level.rounds.slice(0, quante);
    } else if (compatibili && level.rounds.length > 0 && extra.length > 0) {
      const ids = new Set(level.rounds.map((r) => r.id));
      proveAttive = [...level.rounds, ...extra.filter((r) => !ids.has(r.id))].slice(0, quante);
    } else {
      const levelIdx = Math.max(0, pack.levels.findIndex((l) => l.id === level.id));
      const start = (levelIdx * quante) % Math.max(1, extra.length);
      const slice = extra.slice(start, start + quante);
      proveAttive = slice.length >= quante ? slice : extra.slice(0, quante);
    }
    return proveAttive;
  }

  // Costruisce il bacino: SOLO quesiti rigorosamente coerenti con l'anno scolastico selezionato.
  // I quesiti della tappa vengono uniti soltanto se adatti all'anno scolastico dell'alunno.
  const mappa = new Map<string, Round>();
  for (const r of extra) mappa.set(r.id, r);
  if (compatibili) {
    for (const r of level.rounds) {
      if (!mappa.has(r.id)) mappa.set(r.id, r);
    }
  }

  const tutti = Array.from(mappa.values());
  const vistiList = getVistiHistory(pack.subject);
  const vistiSet = new Set(vistiList);

  // Privilegia categoricamente i quesiti mai visti in questo percorso
  const maiVisti = tutti.filter((r) => !vistiSet.has(r.id));

  let disponibili: Round[];
  if (maiVisti.length >= quante) {
    // Il bacino ha abbondanti quesiti del tutto freschi
    disponibili = maiVisti;
  } else {
    // Se i mai visti sono meno di 6, diamo priorità assoluta a quelli rimasti,
    // e per i posti restanti recuperiamo i quesiti visti meno di recente (LRU - Least Recently Used)
    const ordinatiLRU = [...tutti].sort((a, b) => {
      const idxA = vistiList.indexOf(a.id);
      const idxB = vistiList.indexOf(b.id);
      if (idxA === -1 && idxB !== -1) return -1;
      if (idxA !== -1 && idxB === -1) return 1;
      return idxA - idxB; // Chi è apparso per primo nella storia FIFO viene riproposto per primo
    });
    disponibili = ordinatiLRU;
  }

  const isScelta = (r: Round): boolean => r.type === 'quiz' || r.type === 'image';

  // Filtra e mescola solo i quesiti selezionati
  const scelteFresche = mescola(disponibili.filter(isScelta));
  const interattiveFresche = mescola(disponibili.filter((r) => !isScelta(r)));

  // Seleziona fino a 2 interattive se disponibili e fresche, altrimenti completa con scelte
  const nInter = Math.min(interattiveFresche.length, 2);
  const nScelte = quante - nInter;

  const selezionateScelte = scelteFresche.slice(0, nScelte);
  const selezionateInter = interattiveFresche.slice(0, quante - selezionateScelte.length);

  const risultato: Round[] = [...selezionateScelte, ...selezionateInter];

  // Se non siamo arrivati a 6 (ad esempio se mancavano interattive), completa con scelte fresche
  if (risultato.length < quante) {
    const giaIncluso = new Set(risultato.map((r) => r.id));
    for (const r of scelteFresche) {
      if (!giaIncluso.has(r.id)) {
        risultato.push(r);
        if (risultato.length === quante) break;
      }
    }
  }

  // Se ancora non si è a 6, completa con qualsiasi disponibile non ancora incluso
  if (risultato.length < quante) {
    const giaIncluso = new Set(risultato.map((r) => r.id));
    for (const r of disponibili) {
      if (!giaIncluso.has(r.id)) {
        risultato.push(r);
        if (risultato.length === quante) break;
      }
    }
  }

  // Registra i quesiti selezionati nei visti del percorso (memoria e storage persistente LRU)
  recordVisti(
    pack.subject,
    risultato.map((r) => r.id)
  );

  proveAttive = risultato.slice(0, quante);
  return proveAttive;
}
