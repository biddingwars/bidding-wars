# Translation review

English is the source. Please check de / it / es / fr for correctness, natural wording and the game terms (lot = Los / lotto / lote / lot, bot, fair price, budget). `{n}` is a number filled in by the game; `**bold**` marks bold text. Tell me what to change; every string lives in `app.js`.

## Setup hint (shown under the lot picker at 5 lots)

| | text |
|---|---|
| en | A 5-lot round is mostly luck: one big lot can decide it. Play 10 or more lots for a game of skill. |
| de | Eine Runde mit 5 Losen hängt meist vom Glück ab: ein einziges großes Los kann alles entscheiden. Ab 10 Losen zählt das Können. |
| it | Con 5 lotti conta soprattutto la fortuna: un solo lotto grande può decidere tutto. Da 10 lotti in su conta l'abilità. |
| es | Con 5 lotes manda sobre todo la suerte: un solo lote grande puede decidirlo todo. Desde 10 lotes cuenta la habilidad. |
| fr | À 5 lots, la chance compte surtout : un seul gros lot peut tout décider. À partir de 10 lots, l'adresse l'emporte. |

## Countries wording (euros, "country")

### `budgetNote`

| | text |
|---|---|
| en | Set by the difficulty and the round length — scarce on purpose. |
| de | Hängt von Schwierigkeit und Rundenlänge ab – mit Absicht knapp. |
| it | Dipende dalla difficoltà e dalla lunghezza della partita — scarso di proposito. |
| es | Depende de la dificultad y de la duración de la partida — escaso a propósito. |
| fr | Dépend de la difficulté et de la longueur de la partie — rare exprès. |

### `rivalDesc`

| | text |
|---|---|
| en | The **bot** prices every country by population, spends its money evenly across the round and rolls a fresh walk-away limit for each lot. Each game it is in a different mood — cautious, balanced or bold — and you are not told which. If you run low on money it may go all-in to knock you out. |
| de | Der **Bot** bewertet jedes Land nach Einwohnerzahl, verteilt sein Geld gleichmäßig über die Runde und würfelt pro Los eine neue Schmerzgrenze. In jedem Spiel hat er eine andere Laune – vorsichtig, ausgewogen oder mutig – und du erfährst nicht, welche. Wird dein Geld knapp, geht er womöglich aufs Ganze, um dich auszustechen. |
| it | Il **bot** valuta ogni paese in base alla popolazione, distribuisce i soldi in modo uniforme lungo la partita e tira un nuovo limite per ogni lotto. Ogni partita ha un umore diverso — prudente, equilibrato o audace — e non ti viene detto quale. Se i tuoi soldi scarseggiano, può giocare il tutto per tutto per metterti fuori gioco. |
| es | El **bot** valora cada país por su población, reparte su dinero de forma pareja a lo largo de la partida y saca un límite nuevo en cada lote. En cada partida tiene un humor distinto — prudente, equilibrado o audaz — y no se te dice cuál. Si te quedas corto de dinero, puede jugárselo todo para dejarte fuera. |
| fr | Le **bot** évalue chaque pays selon sa population, répartit son argent régulièrement sur la partie et tire une nouvelle limite à chaque lot. À chaque partie il est d’humeur différente — prudent, équilibré ou audacieux — et on ne te dit pas laquelle. Si ton argent s’épuise, il peut jouer le tout pour le tout pour t’éliminer. |

### `rulesP4`

| | text |
|---|---|
| en | Everyone starts with the same budget, set by the difficulty and the round length. **Medium and Expert: €50 for 5 countries, €100 for 10, €150 for 15, €200 for 20, €300 for 30**. Beginner gets half: €25, €50, €75, €100, €150. Money is scarce on purpose: even the biggest budget cannot buy the five biggest countries. |
| de | Alle starten mit demselben Budget, das von der Schwierigkeit und der Rundenlänge abhängt. **Mittel und Experte: 50 € für 5 Länder, 100 € für 10, 150 € für 15, 200 € für 20, 300 € für 30**. Anfänger bekommen die Hälfte: 25 €, 50 €, 75 €, 100 €, 150 €. Das Geld ist absichtlich knapp: Selbst das größte Budget reicht nicht für die fünf größten Länder. |
| it | Tutti partono con lo stesso budget, deciso dalla difficoltà e dalla lunghezza della partita. **Medio ed Esperto: 50 € per 5 paesi, 100 € per 10, 150 € per 15, 200 € per 20, 300 € per 30**. I principianti hanno la metà: 25 €, 50 €, 75 €, 100 €, 150 €. Il denaro è scarso di proposito: nemmeno il budget più alto basta per i cinque paesi più grandi. |
| es | Todos empiezan con el mismo presupuesto, que depende de la dificultad y de la duración de la partida. **Medio y Experto: 50 € para 5 países, 100 € para 10, 150 € para 15, 200 € para 20, 300 € para 30**. Principiante recibe la mitad: 25 €, 50 €, 75 €, 100 €, 150 €. El dinero escasea a propósito: ni el presupuesto más grande alcanza para los cinco países más grandes. |
| fr | Tout le monde commence avec le même budget, fixé par la difficulté et la longueur de la partie. **Moyen et Expert : 50 € pour 5 pays, 100 € pour 10, 150 € pour 15, 200 € pour 20, 300 € pour 30**. Débutant reçoit la moitié : 25 €, 50 €, 75 €, 100 €, 150 €. L’argent est rare exprès : même le plus gros budget ne suffit pas pour les cinq plus grands pays. |

### `rulesP5`

| | text |
|---|---|
| en | The bot values every country by population and rolls a fresh walk-away limit for each lot, so you can never quite read it. It spends evenly, pays a little extra for the biggest countries, and each game it is cautious, balanced or bold. If it has far more money than you, it bids the amount you can no longer top. Beat its limit by one euro and the lot is yours — unless it can knock you out. |
| de | Der Bot bewertet jedes Land nach Einwohnerzahl und würfelt pro Los eine neue Schmerzgrenze, du kannst ihn also nie ganz durchschauen. Er verteilt sein Geld gleichmäßig, zahlt für die größten Länder etwas mehr und ist in jedem Spiel vorsichtig, ausgewogen oder mutig. Hat er viel mehr Geld als du, bietet er den Betrag, den du nicht mehr überbieten kannst. Überbiete seine Grenze um einen Euro und das Los gehört dir – es sei denn, er kann dich ausstechen. |
| it | Il bot valuta ogni paese in base alla popolazione e tira un nuovo limite di rinuncia per ogni lotto, quindi non riesci mai a leggerlo. Spende in modo uniforme, paga un po’ di più per i paesi più grandi ed è, partita per partita, prudente, equilibrato o audace. Se ha molti più soldi di te, offre la cifra che non puoi più superare. Supera il suo limite di un euro e il lotto è tuo — a meno che non riesca a metterti fuori gioco. |
| es | El bot valora cada país por su población y saca un nuevo límite de retirada para cada lote, así que nunca puedes leerlo del todo. Gasta de forma pareja, paga algo más por los países más grandes y en cada partida es prudente, equilibrado o audaz. Si tiene mucho más dinero que tú, ofrece la cantidad que ya no puedes superar. Supera su límite por un euro y el lote es tuyo — a menos que pueda dejarte fuera. |
| fr | Le bot évalue chaque pays selon sa population et tire une nouvelle limite d’abandon à chaque lot, impossible donc de le lire complètement. Il dépense régulièrement, paye un peu plus pour les plus grands pays et, à chaque partie, est prudent, équilibré ou audacieux. S’il a bien plus d’argent que toi, il offre le montant que tu ne peux plus surenchérir. Dépasse sa limite d’un euro et le lot est à toi — sauf s’il peut t’éliminer. |

### `rulesP6`

| | text |
|---|---|
| en | **Difficulty** decides which countries can come up: Beginner draws from Europe only, Medium from every country above 15 million, Expert from all 196. Every country is equally likely and none comes up twice in a round. Short rounds are luck-heavy: with 5 or 10 countries one big draw can decide the game, most of all in Expert. The longer the round, the more skill counts. |
| de | Die **Schwierigkeit** bestimmt, welche Länder vorkommen: Anfänger nur aus Europa, Mittel aus allen Ländern über 15 Millionen, Experte aus allen 196. Jedes Land kommt mit der gleichen Wahrscheinlichkeit dran und keines zweimal in derselben Runde. Kurze Runden sind glückslastig: Bei 5 oder 10 Ländern kann ein großer Treffer das Spiel entscheiden, im Expertenmodus am meisten. Je länger die Runde, desto mehr zählt Können. |
| it | La **difficoltà** decide quali paesi possono uscire: Principiante solo l’Europa, Medio ogni paese sopra i 15 milioni, Esperto tutti i 196. Ogni paese ha la stessa probabilità di uscire e nessuno esce due volte nella stessa partita. Le partite corte dipendono molto dalla fortuna: con 5 o 10 paesi una sola estrazione può decidere tutto, soprattutto in Esperto. Più la partita è lunga, più conta l’abilità. |
| es | La **dificultad** decide qué países pueden salir: Principiante solo Europa, Medio todos los de más de 15 millones, Experto los 196. Todos los países tienen la misma probabilidad de salir y ninguno sale dos veces en la misma partida. Las partidas cortas dependen mucho de la suerte: con 5 o 10 países, un solo sorteo puede decidirlo todo, sobre todo en Experto. Cuanto más larga es la partida, más cuenta la habilidad. |
| fr | La **difficulté** décide quels pays peuvent sortir : Débutant seulement l’Europe, Moyen tous les pays de plus de 15 millions, Expert les 196. Chaque pays a autant de chances de sortir et aucun ne sort deux fois dans la même partie. Les parties courtes dépendent beaucoup de la chance : avec 5 ou 10 pays, un seul tirage peut tout décider, surtout en Expert. Plus la partie est longue, plus l’habileté compte. |

### `rulesP8`

| | text |
|---|---|
| en | **Out of money?** When only one player still has money, that player takes every remaining country for €1 each. Going all in is a real risk: it hands the rest of the round to your rival. |
| de | **Kein Geld mehr?** Hat nur noch ein Spieler Geld, bekommt er alle übrigen Länder für je 1 €. Alles auf eine Karte zu setzen ist ein echtes Risiko: Es schenkt deinem Gegner den Rest der Runde. |
| it | **Senza soldi?** Quando solo un giocatore ha ancora denaro, si prende tutti i paesi rimasti a 1 € ciascuno. Puntare tutto è un vero rischio: regala il resto della partita al rivale. |
| es | **¿Sin dinero?** Cuando solo un jugador conserva dinero, se lleva todos los países restantes por 1 € cada uno. Jugárselo todo es un riesgo real: le regala el resto de la ronda a tu rival. |
| fr | **Plus d’argent ?** Quand un seul joueur a encore de l’argent, il rafle tous les pays restants pour 1 € chacun. Tout miser est un vrai risque : cela offre le reste de la manche à votre rival. |

### `unsoldNote`

| | text |
|---|---|
| en | {n} countries went unsold — nobody could afford them. |
| de | {n} Länder blieben unverkauft – niemand konnte sie bezahlen. |
| it | {n} paesi sono rimasti invenduti: nessuno poteva permetterseli. |
| es | {n} países quedaron sin vender: nadie podía pagarlos. |
| fr | {n} pays sont restés invendus : personne ne pouvait les payer. |

## US States wording (dollars, "state")

### `budgetNote`

| | text |
|---|---|
| en | Set by the round length — scarce on purpose. |
| de | Hängt von der Rundenlänge ab – mit Absicht knapp. |
| it | Dipende dalla lunghezza della partita — scarso di proposito. |
| es | Depende de la duración de la partida — escaso a propósito. |
| fr | Dépend de la longueur de la partie — rare exprès. |

### `rivalDesc`

| | text |
|---|---|
| en | The **bot** prices every state by population, spends its money evenly across the round and rolls a fresh walk-away limit for each lot. Each game it is in a different mood — cautious, balanced or bold — and you are not told which. If you run low on money it may go all-in to knock you out. |
| de | Der **Bot** bewertet jeden Bundesstaat nach Einwohnerzahl, verteilt sein Geld gleichmäßig über die Runde und würfelt pro Los eine neue Schmerzgrenze. In jedem Spiel hat er eine andere Laune – vorsichtig, ausgewogen oder mutig – und du erfährst nicht, welche. Wird dein Geld knapp, geht er womöglich aufs Ganze, um dich auszustechen. |
| it | Il **bot** valuta ogni stato in base alla popolazione, distribuisce i soldi in modo uniforme lungo la partita e tira un nuovo limite di rinuncia per ogni lotto. Ogni partita ha un umore diverso – prudente, equilibrato o audace – e non ti dice quale. Se i tuoi soldi scarseggiano, può giocare il tutto per tutto per metterti fuori gioco. |
| es | El **bot** valora cada estado por su población, reparte su dinero de forma pareja a lo largo de la partida y saca un nuevo límite de retirada para cada lote. Cada partida tiene otro humor —prudente, equilibrado o audaz— y no te dice cuál. Si te quedas sin dinero, puede jugárselo todo para dejarte fuera. |
| fr | Le **bot** évalue chaque État selon sa population, répartit son argent régulièrement sur la partie et tire une nouvelle limite d’abandon à chaque lot. À chaque partie il est d’une humeur différente — prudent, équilibré ou audacieux — sans te dire laquelle. Si ton argent s’épuise, il peut tout jouer pour t’éliminer. |

### `rulesP1`

| | text |
|---|---|
| en | Random states come up one at a time, each one at most once per round. **1 point = 1 million people**, and the population stays blacked out until the very end. |
| de | Nacheinander kommen zufällige Bundesstaaten auf den Tisch, jeder höchstens einmal pro Runde. **1 Punkt = 1 Million Einwohner**, und die Einwohnerzahl bleibt bis ganz zum Schluss geschwärzt. |
| it | Escono stati a caso, uno alla volta e al massimo una volta per partita. **1 punto = 1 milione di abitanti**, e la popolazione resta oscurata fino alla fine. |
| es | Salen estados al azar, uno a uno y como máximo una vez por partida. **1 punto = 1 millón de habitantes**, y la población permanece tachada hasta el final. |
| fr | Des États tombent au hasard, un par un et au plus une fois par partie. **1 point = 1 million d’habitants**, et la population reste masquée jusqu’à la fin. |

### `rulesP4`

| | text |
|---|---|
| en | Everyone starts with the same budget, set by the round length: **$85 for 5 states, $165 for 10, $180 for 15, $210 for 20**. Money is scarce on purpose: even the biggest budget cannot buy the four biggest states. |
| de | Alle starten mit demselben Budget, das von der Rundenlänge abhängt: **$85 für 5 Bundesstaaten, $165 für 10, $180 für 15, $210 für 20**. Das Geld ist absichtlich knapp: Selbst das größte Budget reicht nicht für die vier größten Bundesstaaten. |
| it | Tutti partono con lo stesso budget, deciso dalla lunghezza della partita: **$85 per 5 stati, $165 per 10, $180 per 15, $210 per 20**. Il denaro è scarso di proposito: nemmeno il budget più alto basta per i quattro stati più grandi. |
| es | Todos empiezan con el mismo presupuesto, que depende de la duración de la partida: **$85 para 5 estados, $165 para 10, $180 para 15, $210 para 20**. El dinero escasea a propósito: ni el presupuesto más grande alcanza para los cuatro estados más grandes. |
| fr | Tout le monde commence avec le même budget, fixé par la longueur de la partie : **$85 pour 5 États, $165 pour 10, $180 pour 15, $210 pour 20**. L’argent est rare exprès : même le plus gros budget ne suffit pas pour les quatre plus grands États. |

### `rulesP5`

| | text |
|---|---|
| en | The bot values every state by population and rolls a fresh walk-away limit for each lot, so you can never quite read it. It spends evenly, pays a little extra for the biggest states, and each game it is cautious, balanced or bold. If it has far more money than you, it bids the amount you can no longer top. Beat its limit by one dollar and the lot is yours — unless it can knock you out. |
| de | Der Bot bewertet jeden Bundesstaat nach Einwohnerzahl und würfelt pro Los eine neue Schmerzgrenze, du kannst ihn also nie ganz durchschauen. Er verteilt sein Geld gleichmäßig, zahlt für die größten Staaten etwas mehr und ist in jedem Spiel vorsichtig, ausgewogen oder mutig. Hat er viel mehr Geld als du, bietet er den Betrag, den du nicht mehr überbieten kannst. Überbiete seine Grenze um einen Dollar und das Los gehört dir – es sei denn, er kann dich ausstechen. |
| it | Il bot valuta ogni stato in base alla popolazione e tira un nuovo limite di rinuncia per ogni lotto, quindi non riesci mai a leggerlo. Spende in modo uniforme, paga un po’ di più per gli stati più grandi ed è, partita per partita, prudente, equilibrato o audace. Se ha molti più soldi di te, offre la cifra che non puoi più superare. Supera il suo limite di un dollaro e il lotto è tuo, a meno che non possa metterti fuori gioco. |
| es | El bot valora cada estado por su población y saca un nuevo límite de retirada para cada lote, así que nunca puedes leerlo del todo. Gasta de forma pareja, paga algo más por los estados más grandes y en cada partida es prudente, equilibrado o audaz. Si tiene mucho más dinero que tú, ofrece la cantidad que ya no puedes superar. Supera su límite por un dólar y el lote es tuyo, salvo que pueda dejarte fuera. |
| fr | Le bot évalue chaque État selon sa population et tire une nouvelle limite d’abandon à chaque lot, impossible donc de le lire complètement. Il dépense régulièrement, paye un peu plus pour les plus grands États et, à chaque partie, est prudent, équilibré ou audacieux. S’il a bien plus d’argent que toi, il mise la somme que tu ne peux plus dépasser. Dépasse sa limite d’un dollar et le lot est à toi, sauf s’il peut t’éliminer. |

### `rulesP6`

| | text |
|---|---|
| en | Every state is equally likely to come up, and a state never comes up twice in the same round. Pick 5, 10, 15 or 20 states. Short rounds are luck-heavy: with 5 or 10 states one big draw can decide the game. The longer the round, the more skill counts. |
| de | Jeder Bundesstaat kommt mit der gleichen Wahrscheinlichkeit dran, und keiner kommt in derselben Runde zweimal vor. Wähle 5, 10, 15 oder 20 Bundesstaaten. Kurze Runden sind glückslastig: Bei 5 oder 10 Bundesstaaten kann ein großer Treffer das Spiel entscheiden. Je länger die Runde, desto mehr zählt Können. |
| it | Ogni stato ha la stessa probabilità di uscire e nessuno esce due volte nella stessa partita. Scegli 5, 10, 15 o 20 stati. Le partite corte dipendono molto dalla fortuna: con 5 o 10 stati una sola estrazione può decidere tutto. Più la partita è lunga, più conta l’abilità. |
| es | Todos los estados tienen la misma probabilidad de salir y ninguno sale dos veces en la misma partida. Elige 5, 10, 15 o 20 estados. Las partidas cortas dependen mucho de la suerte: con 5 o 10 estados, un solo sorteo puede decidirlo todo. Cuanto más larga es la partida, más cuenta la habilidad. |
| fr | Chaque État a autant de chances de sortir, et aucun ne sort deux fois dans la même partie. Choisis 5, 10, 15 ou 20 États. Les parties courtes dépendent beaucoup de la chance : avec 5 ou 10 États, un seul tirage peut tout décider. Plus la partie est longue, plus l’habileté compte. |

### `rulesP8`

| | text |
|---|---|
| en | **Out of money?** When only one player still has money, that player takes every remaining state for $1 each. Going all in is a real risk: it hands the rest of the round to your rival. |
| de | **Kein Geld mehr?** Hat nur noch ein Spieler Geld, bekommt er alle übrigen Bundesstaaten für je $1. Alles auf eine Karte zu setzen ist ein echtes Risiko: Es schenkt deinem Gegner den Rest der Runde. |
| it | **Senza soldi?** Quando solo un giocatore ha ancora denaro, si prende tutti gli stati rimasti a $1 ciascuno. Puntare tutto è un vero rischio: regala il resto della partita al rivale. |
| es | **¿Sin dinero?** Cuando solo un jugador conserva dinero, se lleva todos los estados restantes por $1 cada uno. Jugárselo todo es un riesgo real: le regala el resto de la ronda a tu rival. |
| fr | **Plus d’argent ?** Quand un seul joueur a encore de l’argent, il rafle tous les États restants pour $1 chacun. Tout miser est un vrai risque : cela offre le reste de la manche à votre rival. |

### `unsoldNote`

| | text |
|---|---|
| en | {n} states went unsold — nobody could afford them. |
| de | {n} Bundesstaaten blieben unverkauft – niemand konnte sie bezahlen. |
| it | {n} stati sono rimasti invenduti: nessuno poteva permetterseli. |
| es | {n} estados quedaron sin vender: nadie podía pagarlos. |
| fr | {n} États sont restés invendus : personne ne pouvait les payer. |

### `rulesP7`

| | text |
|---|---|
| en | Efficiency is scored too: dollars per million people. Lower is better. |
| de | Auch die Effizienz wird gewertet: Dollar pro Million Einwohner. Weniger ist besser. |
| it | Si valuta anche l’efficienza: dollari per milione di abitanti. Meno è meglio. |
| es | También se puntúa la eficiencia: dólares por millón de habitantes. Cuanto menos, mejor. |
| fr | L’efficacité compte aussi : dollars par million d’habitants. Moins, c’est mieux. |

### `footer`

| | text |
|---|---|
| en | No accounts · No tracking · {n} states |
| de | Keine Konten · Kein Tracking · {n} Bundesstaaten |
| it | Nessun account · Nessun tracciamento · {n} stati |
| es | Sin cuentas · Sin rastreo · {n} estados |
| fr | Aucun compte · Aucun suivi · {n} États |

### `worldTitle`

| | text |
|---|---|
| en | The map |
| de | Die Karte |
| it | La mappa |
| es | El mapa |
| fr | La carte |

### `world`

| | text |
|---|---|
| en | {name}’s states, lit in gold |
| de | Die Staaten von {name}, golden markiert |
| it | Gli stati di {name}, evidenziati in oro |
| es | Los estados de {name}, en dorado |
| fr | Les États de {name}, en or |
