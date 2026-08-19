# Font inclusi nel repository

Questi file servono a una cosa sola: comporre il testo dell'immagine Open Graph,
generata da `src/app/opengraph-image.tsx` con `next/og`. Il sito usa gli stessi
caratteri via `next/font/google`, che li scarica e li ospita da sé: qui servono
i file veri perché la generazione dell'immagine avviene fuori dal browser.

| File | Famiglia | Licenza |
| --- | --- | --- |
| `SourceSerif4-600-subset.ttf` | Source Serif 4 SemiBold | SIL Open Font License 1.1 |
| `SourceSans3-700-subset.ttf` | Source Sans 3 Bold | SIL Open Font License 1.1 |
| `SourceSans3-400-subset.ttf` | Source Sans 3 Regular | SIL Open Font License 1.1 |

Copyright 2014-2023 Adobe (https://adobe.com/), con Reserved Font Name "Source".
Il testo completo della licenza è in [OFL.txt](./OFL.txt).

La OFL consente uso, modifica e ridistribuzione, anche commerciale, a due
condizioni che qui sono rispettate: i file restano sotto la stessa licenza e non
vengono venduti da soli.

Sono **sottoinsiemi**: contengono solo i caratteri che compaiono nell'immagine
Open Graph, generati dall'endpoint `text=` di Google Fonts. Da 1,1 MB del font
variabile completo si scende a una ventina di KB. Se un domani l'immagine dovrà
mostrare caratteri non compresi (per esempio lettere accentate diverse), vanno
rigenerati con lo stesso metodo, altrimenti quei glifi mancheranno.
