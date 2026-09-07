# ZVC scritti in codice

## Aggiungere una base

Crea una cartella in `app/zvc/`. Il riferimento completo incluso nel progetto è:

```text
app/zvc/starterhero/
  StarterHero.zvc.js
  StarterHero.meta.js
  data/
    StarterHero.defaults.js
```

Il caricamento è automatico: ogni `**/*.zvc.js` viene importato da Vite. Non serve un indice manuale. Ricarica la pagina dopo aver cambiato i sorgenti; in produzione ricostruisci l'applicazione. Le basi vengono aggiunte anche ai progetti già presenti nel localStorage.

Usa la stessa sintassi di Zaux:

```js
import ZVCHelper from '@zx_core/common/helpers/zvc.helper';
import meta from './MySection.meta';
import defaults from './data/MySection.defaults';

export default {
  ...meta,
  buildNode(data = {}, params = {}) {
    data = { ...defaults, ...data };
    const gv = path => ZVCHelper.getValue(data, path);
    const nodeObject = {
      meta: { ZVCName: meta.ZVCName },
      node: {
        name: 'Zsection',
        props: {
          size: 'm',
          contained: true,
          content: {
            type: 'component',
            name: 'IntroText',
            props: {
              title: gv('title'),
              ctas: gv('showButton')
                ? [{ label: gv('buttonLabel'), href: '#' }]
                : []
            }
          }
        }
      }
    };
    return ZVCHelper.renderNode(nodeObject, data, params, meta);
  }
};
```

Il modulo deve esportare `ZVCName` e `buildNode`. `label` è il nome visualizzato; `fields` descrive i controlli. `builder: false` esclude una base dalla libreria. Il caricatore riconosce i default nella posizione `data/Nome.defaults.js`; per percorsi personalizzati, esponi i valori attraverso `fields[].default`.

Si esegue la funzione del modulo importato, incluse condizioni, composizioni e chiamate agli helper. Non viene interpretato o ricostruito il suo sorgente. Per annidare moduli locali puoi importarli e chiamarne `buildNode`; il registry originale di Zaux continua a contenere i componenti del submodule.

## Campi e valori

Sono disponibili i tipi Zaux `text`, `textarea`, `number`, `switch`, `select`, `json`, `html`, `css-editor`, `button`, `buttongroup`, `component`. Gli ultimi tre usano un editor JSON essenziale; HTML e CSS usano un'area di testo. Gli oggetti delle opzioni select mantengono il tipo del valore.

`showIf` accetta una condizione o un array di condizioni, tutte necessarie. Operatori: `eq`, `neq`, `gt`, `lt`, `in`, `contains`, `notEmpty`, come nel builder Zaux. Nascondere un controllo conserva il valore, così riattivarlo non cancella il lavoro.

La base su file mostra i default in sola lettura. Puoi:
- inserire una copia nel template e modificarne i contenuti;
- creare una copia configurabile nella libreria;
- modificare i file della base direttamente nel progetto.

Le copie mantengono dati, default e metadati indipendenti. La funzione JavaScript rimane condivisa attraverso `sourceKey`: cambiare il codice del modulo cambia il comportamento delle copie che lo usano. Modificare i contenuti di una copia non cambia le altre.

## Passare alla modifica visuale

`Converti in visuale` conserva la struttura renderizzata con i valori attuali. Rimuove il collegamento al modulo e i campi dinamici; condizioni e rami inattivi del codice non fanno parte del risultato. Da quel momento puoi trascinare, duplicare, eliminare e configurare i singoli nodi.

Se parti dalla base su file, viene creata una nuova voce nella libreria. Se parti da una copia, si converte quella copia. L'operazione è annullabile.

Il risultato deve essere JSON compatibile: nomi dei componenti, proprietà e figli. Callback, oggetti Vue e nodi DOM non appartengono al formato persistito. Zsection con `content.type: 'component'` viene rappresentata con un figlio nello slot predefinito, mantenendo lo stesso ordine di rendering. Proprietà di contenuto speciali degli altri componenti rimangono configurabili come JSON.

## Export e spostamento fra macchine

Per un ZVC da codice, il pacchetto JS contiene i file originali della sua cartella. Le condizioni restano nel sorgente. Il file convenzionale dei default viene aggiornato con la configurazione esportata; `instance-data.json` contiene tutti i valori, anche quando sono usati percorsi personalizzati. Il CSS scritto nell'editor è aggiunto in `style/Studio.css`.

Mantieni le dipendenze locali necessarie nella cartella del componente; import esterni a quella cartella restano dipendenze del progetto di destinazione. Gli alias `@zx_core` e `@zx_project` hanno il significato originale di Zaux.

Il JSON Studio salva il percorso relativo `sourceKey`, i dati e l'ultimo albero renderizzato, senza codice eseguibile. Per continuare a modificare un componente nativo su un'altra installazione, porta anche i suoi file in `app/zvc/`. Se mancano, l'app mostra l'ultimo risultato e permette di convertirlo in visuale.

L'export `JSON Zaux` produce nodi pronti per il rendering con i valori risolti. Il `JSON modificabile` conserva invece il documento da reimportare in Studio.

## Whitelist drag and drop

Modifica `app/data/catalog/palette.js`. L'ordine nell'array è l'ordine nella palette.

Ogni voce contiene:
- `name`: nome registrato del componente;
- `props`: configurazione iniziale per ogni inserimento;
- `container: true`: consente l'inserimento visuale nello slot predefinito;
- `html: true`: identifica un elemento HTML.

La whitelist limita la creazione dalla palette. Un componente non elencato può ancora essere usato da un modulo ZVC o trovarsi in un documento salvato. Non aggiungere `container: true` a un componente che non espone uno slot predefinito.

Il catalogo registra i componenti Zaux comuni e condivisi del core. Per estenderlo a componenti Vue specifici del progetto, importa il loro registry in `app/services/catalog.js` e registrali anche nel plugin Zaux.

## Riferimenti

Sintassi verificata rispetto a `vendor/zaux/project/components/virtual/fancysection/FancySection.zvc.js`, `core/common/helpers/zvc.helper.js` e ai campi del builder originale. Il caricamento automatico usa gli [import glob di Vite](https://vite.dev/guide/features.html#glob-import).
