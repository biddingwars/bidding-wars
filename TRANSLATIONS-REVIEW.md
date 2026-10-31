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
| en | Everyone starts with the same budget, set by the round length: **$85 for 5 states, $165 for 10, $180 for 15, $210 for 20, $315 for 30, $420 for 40 and $525 for all 50**. Money is scarce on purpose: even the biggest budget cannot buy the four biggest states. |
| de | Alle starten mit demselben Budget, das von der Rundenlänge abhängt: **$85 für 5 Bundesstaaten, $165 für 10, $180 für 15, $210 für 20, $315 für 30, $420 für 40 und $525 für alle 50**. Das Geld ist absichtlich knapp: Selbst das größte Budget reicht nicht für die vier größten Bundesstaaten. |
| it | Tutti partono con lo stesso budget, deciso dalla lunghezza della partita: **$85 per 5 stati, $165 per 10, $180 per 15, $210 per 20, $315 per 30, $420 per 40 e $525 per tutti i 50**. Il denaro è scarso di proposito: nemmeno il budget più alto basta per i quattro stati più grandi. |
| es | Todos empiezan con el mismo presupuesto, que depende de la duración de la partida: **$85 para 5 estados, $165 para 10, $180 para 15, $210 para 20, $315 para 30, $420 para 40 y $525 para los 50**. El dinero escasea a propósito: ni el presupuesto más grande alcanza para los cuatro estados más grandes. |
| fr | Tout le monde commence avec le même budget, fixé par la longueur de la partie : **$85 pour 5 États, $165 pour 10, $180 pour 15, $210 pour 20, $315 pour 30, $420 pour 40 et $525 pour les 50**. L’argent est rare exprès : même le plus gros budget ne suffit pas pour les quatre plus grands États. |

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
| en | Every state is equally likely to come up, and a state never comes up twice in the same round. Pick 5 to 40 states, or play all 50. Short rounds are luck-heavy: with 5 or 10 states one big draw can decide the game. The longer the round, the more skill counts. |
| de | Jeder Bundesstaat kommt mit der gleichen Wahrscheinlichkeit dran, und keiner kommt in derselben Runde zweimal vor. Wähle 5 bis 40 Bundesstaaten oder spiel alle 50. Kurze Runden sind glückslastig: Bei 5 oder 10 Bundesstaaten kann ein großer Treffer das Spiel entscheiden. Je länger die Runde, desto mehr zählt Können. |
| it | Ogni stato ha la stessa probabilità di uscire e nessuno esce due volte nella stessa partita. Scegli da 5 a 40 stati oppure gioca tutti i 50. Le partite corte dipendono molto dalla fortuna: con 5 o 10 stati una sola estrazione può decidere tutto. Più la partita è lunga, più conta l’abilità. |
| es | Todos los estados tienen la misma probabilidad de salir y ninguno sale dos veces en la misma partida. Elige de 5 a 40 estados o juega los 50. Las partidas cortas dependen mucho de la suerte: con 5 o 10 estados, un solo sorteo puede decidirlo todo. Cuanto más larga es la partida, más cuenta la habilidad. |
| fr | Chaque État a autant de chances de sortir, et aucun ne sort deux fois dans la même partie. Choisis de 5 à 40 États ou joue les 50. Les parties courtes dépendent beaucoup de la chance : avec 5 ou 10 États, un seul tirage peut tout décider. Plus la partie est longue, plus l’habileté compte. |

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

## Capital Cities wording (euros, "capital")

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
| en | The **bot** prices every capital by the size of its city, spends its money evenly across the round and rolls a fresh walk-away limit for each lot. Each game it is in a different mood — cautious, balanced or bold — and you are not told which. If you run low on money it may go all-in to knock you out. |
| de | Der **Bot** bewertet jede Hauptstadt nach der Größe ihrer Stadt, verteilt sein Geld gleichmäßig über die Runde und würfelt pro Los eine neue Schmerzgrenze. In jedem Spiel hat er eine andere Laune – vorsichtig, ausgewogen oder mutig – und du erfährst nicht, welche. Wird dein Geld knapp, geht er womöglich aufs Ganze, um dich auszustechen. |
| it | Il **bot** valuta ogni capitale in base alle dimensioni della città, distribuisce i soldi in modo uniforme lungo la partita e tira un nuovo limite per ogni lotto. Ogni partita ha un umore diverso — prudente, equilibrato o audace — e non ti viene detto quale. Se i tuoi soldi scarseggiano, può giocare il tutto per tutto per metterti fuori gioco. |
| es | El **bot** valora cada capital por el tamaño de su ciudad, reparte su dinero de forma pareja a lo largo de la partida y saca un límite nuevo en cada lote. En cada partida tiene un humor distinto — prudente, equilibrado o audaz — y no se te dice cuál. Si te quedas corto de dinero, puede jugárselo todo para dejarte fuera. |
| fr | Le **bot** évalue chaque capitale selon la taille de sa ville, répartit son argent régulièrement sur la partie et tire une nouvelle limite à chaque lot. À chaque partie il est d’humeur différente — prudent, équilibré ou audacieux — et on ne te dit pas laquelle. Si ton argent s’épuise, il peut jouer le tout pour le tout pour t’éliminer. |

### `rulesP1`

| | text |
|---|---|
| en | Random capital cities come up one at a time, each at most once per round. **1 point = 1 million people** living in the capital’s urban area, and the population stays blacked out until the very end. |
| de | Zufällige Hauptstädte kommen nacheinander auf den Tisch, jede höchstens einmal pro Runde. **1 Punkt = 1 Million Einwohner** des Stadtgebiets der Hauptstadt, und die Einwohnerzahl bleibt bis ganz zum Schluss geschwärzt. |
| it | Escono capitali a caso, una alla volta e al massimo una volta per partita. **1 punto = 1 milione di abitanti** dell’area urbana della capitale, e la popolazione resta oscurata fino alla fine. |
| es | Salen capitales al azar, una a una y como máximo una vez por partida. **1 punto = 1 millón de habitantes** del área urbana de la capital, y la población permanece tachada hasta el final. |
| fr | Des capitales tombent au hasard, une par une et au plus une fois par partie. **1 point = 1 million d’habitants** de l’agglomération de la capitale, et la population reste masquée jusqu’à la fin. |

### `rulesP4`

| | text |
|---|---|
| en | Everyone starts with the same budget, set by the difficulty and the round length. **Medium and Expert: €50 for 5 capitals, €100 for 10, €150 for 15, €200 for 20, €300 for 30**. Beginner gets half: €25, €50, €75, €100, €150. Money is scarce on purpose: even the biggest budget cannot buy the five biggest cities. |
| de | Alle starten mit demselben Budget, das von der Schwierigkeit und der Rundenlänge abhängt. **Mittel und Experte: 50 € für 5 Hauptstädte, 100 € für 10, 150 € für 15, 200 € für 20, 300 € für 30**. Anfänger bekommen die Hälfte: 25 €, 50 €, 75 €, 100 €, 150 €. Das Geld ist absichtlich knapp: Selbst das größte Budget reicht nicht für die fünf größten Städte. |
| it | Tutti partono con lo stesso budget, deciso dalla difficoltà e dalla lunghezza della partita. **Medio ed Esperto: 50 € per 5 capitali, 100 € per 10, 150 € per 15, 200 € per 20, 300 € per 30**. I principianti hanno la metà: 25 €, 50 €, 75 €, 100 €, 150 €. Il denaro è scarso di proposito: nemmeno il budget più alto basta per le cinque città più grandi. |
| es | Todos empiezan con el mismo presupuesto, que depende de la dificultad y de la duración de la partida. **Medio y Experto: 50 € para 5 capitales, 100 € para 10, 150 € para 15, 200 € para 20, 300 € para 30**. Principiante recibe la mitad: 25 €, 50 €, 75 €, 100 €, 150 €. El dinero escasea a propósito: ni el presupuesto más grande alcanza para las cinco ciudades más grandes. |
| fr | Tout le monde commence avec le même budget, fixé par la difficulté et la longueur de la partie. **Moyen et Expert : 50 € pour 5 capitales, 100 € pour 10, 150 € pour 15, 200 € pour 20, 300 € pour 30**. Débutant reçoit la moitié : 25 €, 50 €, 75 €, 100 €, 150 €. L’argent est rare exprès : même le plus gros budget ne suffit pas pour les cinq plus grandes villes. |

### `rulesP5`

| | text |
|---|---|
| en | The bot values every capital by its population and rolls a fresh walk-away limit for each lot, so you can never quite read it. It spends evenly, pays a little extra for the biggest cities, and each game it is cautious, balanced or bold. If it has far more money than you, it bids the amount you can no longer top. Beat its limit by one euro and the lot is yours — unless it can knock you out. |
| de | Der Bot bewertet jede Hauptstadt nach Einwohnerzahl und würfelt pro Los eine neue Schmerzgrenze, du kannst ihn also nie ganz durchschauen. Er verteilt sein Geld gleichmäßig, zahlt für die größten Städte etwas mehr und ist in jedem Spiel vorsichtig, ausgewogen oder mutig. Hat er viel mehr Geld als du, bietet er den Betrag, den du nicht mehr überbieten kannst. Überbiete seine Grenze um einen Euro und das Los gehört dir – es sei denn, er kann dich ausstechen. |
| it | Il bot valuta ogni capitale in base alla popolazione e tira un nuovo limite di rinuncia per ogni lotto, quindi non riesci mai a leggerlo. Spende in modo uniforme, paga un po’ di più per le città più grandi ed è, partita per partita, prudente, equilibrato o audace. Se ha molti più soldi di te, offre la cifra che non puoi più superare. Supera il suo limite di un euro e il lotto è tuo — a meno che non riesca a metterti fuori gioco. |
| es | El bot valora cada capital por su población y saca un nuevo límite de retirada para cada lote, así que nunca puedes leerlo del todo. Gasta de forma pareja, paga algo más por las ciudades más grandes y en cada partida es prudente, equilibrado o audaz. Si tiene mucho más dinero que tú, ofrece la cantidad que ya no puedes superar. Supera su límite por un euro y el lote es tuyo — a menos que pueda dejarte fuera. |
| fr | Le bot évalue chaque capitale selon sa population et tire une nouvelle limite d’abandon à chaque lot, impossible donc de le lire complètement. Il dépense régulièrement, paye un peu plus pour les plus grandes villes et, à chaque partie, est prudent, équilibré ou audacieux. S’il a bien plus d’argent que toi, il offre le montant que tu ne peux plus surenchérir. Dépasse sa limite d’un euro et le lot est à toi — sauf s’il peut t’éliminer. |

### `rulesP6`

| | text |
|---|---|
| en | **Difficulty** decides which capitals can come up: Beginner draws from Europe only, Medium from every capital with more than 2 million people, Expert from all 195 (the 193 UN member states plus Vatican City and Taipei). Where a country has several capitals, its seat of government is used. Every capital is equally likely and none comes up twice in a round. Short rounds are luck-heavy: with 5 or 10 capitals one big draw can decide the game. The longer the round, the more skill counts. |
| de | Die **Schwierigkeit** bestimmt, welche Hauptstädte vorkommen: Anfänger nur aus Europa, Mittel aus allen Hauptstädten mit mehr als 2 Millionen Einwohnern, Experte aus allen 195 (die 193 UN-Mitgliedstaaten plus Vatikanstadt und Taipeh). Hat ein Land mehrere Hauptstädte, zählt der Regierungssitz. Jede Hauptstadt kommt mit der gleichen Wahrscheinlichkeit dran und keine zweimal in derselben Runde. Kurze Runden sind glückslastig: Bei 5 oder 10 Hauptstädten kann ein großer Treffer das Spiel entscheiden. Je länger die Runde, desto mehr zählt Können. |
| it | La **difficoltà** decide quali capitali possono uscire: Principiante solo l’Europa, Medio ogni capitale con più di 2 milioni di abitanti, Esperto tutte le 195 (i 193 Stati membri dell’ONU più Città del Vaticano e Taipei). Se un paese ha più capitali, conta la sede del governo. Ogni capitale ha la stessa probabilità di uscire e nessuna esce due volte nella stessa partita. Le partite corte dipendono molto dalla fortuna: con 5 o 10 capitali una sola estrazione può decidere tutto. Più la partita è lunga, più conta l’abilità. |
| es | La **dificultad** decide qué capitales pueden salir: Principiante solo Europa, Medio todas las de más de 2 millones de habitantes, Experto las 195 (los 193 Estados miembros de la ONU más la Ciudad del Vaticano y Taipéi). Si un país tiene varias capitales, cuenta la sede del gobierno. Todas las capitales tienen la misma probabilidad de salir y ninguna sale dos veces en la misma partida. Las partidas cortas dependen mucho de la suerte: con 5 o 10 capitales, un solo sorteo puede decidirlo todo. Cuanto más larga es la partida, más cuenta la habilidad. |
| fr | La **difficulté** décide quelles capitales peuvent sortir : Débutant seulement l’Europe, Moyen toutes celles de plus de 2 millions d’habitants, Expert les 195 (les 193 États membres de l’ONU plus la Cité du Vatican et Taipei). Quand un pays a plusieurs capitales, c’est le siège du gouvernement qui compte. Chaque capitale a autant de chances de sortir et aucune ne sort deux fois dans la même partie. Les parties courtes dépendent beaucoup de la chance : avec 5 ou 10 capitales, un seul tirage peut tout décider. Plus la partie est longue, plus l’habileté compte. |

### `rulesP8`

| | text |
|---|---|
| en | **Out of money?** When only one player still has money, that player takes every remaining capital for €1 each. Going all in is a real risk: it hands the rest of the round to your rival. |
| de | **Kein Geld mehr?** Hat nur noch ein Spieler Geld, bekommt er alle übrigen Hauptstädte für je 1 €. Alles auf eine Karte zu setzen ist ein echtes Risiko: Es schenkt deinem Gegner den Rest der Runde. |
| it | **Senza soldi?** Quando solo un giocatore ha ancora denaro, si prende tutte le capitali rimaste a 1 € ciascuna. Puntare tutto è un vero rischio: regala il resto della partita al rivale. |
| es | **¿Sin dinero?** Cuando solo un jugador conserva dinero, se lleva todas las capitales restantes por 1 € cada una. Jugárselo todo es un riesgo real: le regala el resto de la ronda a tu rival. |
| fr | **Plus d’argent ?** Quand un seul joueur a encore de l’argent, il rafle toutes les capitales restantes pour 1 € chacune. Tout miser est un vrai risque : cela offre le reste de la manche à ton rival. |

### `unsoldNote`

| | text |
|---|---|
| en | {n} capitals went unsold — nobody could afford them. |
| de | {n} Hauptstädte blieben unverkauft – niemand konnte sie bezahlen. |
| it | {n} capitali sono rimaste invendute: nessuno poteva permettersele. |
| es | {n} capitales quedaron sin vender: nadie podía pagarlas. |
| fr | {n} capitales sont restées invendues : personne ne pouvait les payer. |

### `footer`

| | text |
|---|---|
| en | No accounts · No tracking · {n} capitals |
| de | Keine Konten · Kein Tracking · {n} Hauptstädte |
| it | Nessun account · Nessun tracciamento · {n} capitali |
| es | Sin cuentas · Sin rastreo · {n} capitales |
| fr | Aucun compte · Aucun suivi · {n} capitales |

## Capital Cities: credits line (Privacy -> Credits & licences)

| | text |
|---|---|
| en | **Capital-city population** — United Nations, DESA Population Division, World Urbanization Prospects: The 2018 Revision, File 13 (urban agglomeration, 2018). CC BY 3.0 IGO. Data unchanged; this is not an endorsement by the United Nations. |
| de | **Einwohnerzahlen der Hauptstädte** — Vereinte Nationen, DESA, Abteilung Bevölkerung, World Urbanization Prospects: The 2018 Revision, Datei 13 (städtische Agglomeration, 2018). CC BY 3.0 IGO. Daten unverändert; keine Billigung durch die Vereinten Nationen. |
| it | **Popolazione delle capitali** — Nazioni Unite, DESA, Divisione Popolazione, World Urbanization Prospects: The 2018 Revision, File 13 (agglomerato urbano, 2018). CC BY 3.0 IGO. Dati non modificati; nessun avallo da parte delle Nazioni Unite. |
| es | **Población de las capitales** — Naciones Unidas, DAES, División de Población, World Urbanization Prospects: The 2018 Revision, archivo 13 (aglomeración urbana, 2018). CC BY 3.0 IGO. Datos sin modificar; no implica respaldo de las Naciones Unidas. |
| fr | **Population des capitales** — Nations unies, DAES, Division de la population, World Urbanization Prospects: The 2018 Revision, fichier 13 (agglomération urbaine, 2018). CC BY 3.0 IGO. Données non modifiées ; aucune approbation des Nations unies. |

## Capital Cities: the 195 capital names (blank = same as English)

| id | en | de | it | es | fr |
|---|---|---|---|---|---|
| AD | Andorra la Vella |  |  |  |  |
| AE | Abu Dhabi |  |  | Abu Dabi | Abou Dabi |
| AF | Kabul |  |  |  | Kaboul |
| AG | Saint John's |  |  |  |  |
| AL | Tirana |  |  |  |  |
| AM | Yerevan | Jerewan | Erevan | Ereván | Erevan |
| AO | Luanda |  |  |  |  |
| AR | Buenos Aires |  |  |  |  |
| AT | Vienna | Wien |  | Viena | Vienne |
| AU | Canberra |  |  |  |  |
| AZ | Baku |  |  | Bakú | Bakou |
| BA | Sarajevo |  |  |  |  |
| BB | Bridgetown |  |  |  |  |
| BD | Dhaka |  | Dacca | Daca | Dacca |
| BE | Brussels | Brüssel | Bruxelles | Bruselas | Bruxelles |
| BF | Ouagadougou |  |  | Uagadugú |  |
| BG | Sofia |  |  | Sofía |  |
| BH | Manama |  |  |  |  |
| BI | Bujumbura |  |  |  |  |
| BJ | Cotonou |  |  |  |  |
| BN | Bandar Seri Begawan |  |  |  |  |
| BO | La Paz |  |  |  |  |
| BR | Brasília |  | Brasilia | Brasilia | Brasilia |
| BS | Nassau |  |  |  |  |
| BT | Thimphu |  |  |  | Thimphou |
| BW | Gaborone |  |  |  |  |
| BY | Minsk |  |  |  |  |
| BZ | Belmopan |  |  |  |  |
| CA | Ottawa |  |  |  |  |
| CD | Kinshasa |  |  |  |  |
| CF | Bangui |  |  |  |  |
| CG | Brazzaville |  |  |  |  |
| CH | Bern |  | Berna | Berna | Berne |
| CI | Abidjan |  |  |  |  |
| CL | Santiago |  |  |  |  |
| CM | Yaoundé | Jaunde |  | Yaundé |  |
| CN | Beijing | Peking | Pechino | Pekín | Pékin |
| CO | Bogotá |  |  |  | Bogota |
| CR | San José |  |  |  |  |
| CU | Havana | Havanna | L'Avana | La Habana | La Havane |
| CV | Praia |  |  |  |  |
| CY | Nicosia | Nikosia |  |  | Nicosie |
| CZ | Prague | Prag | Praga | Praga |  |
| DE | Berlin |  |  |  |  |
| DJ | Djibouti | Dschibuti | Gibuti | Yibuti |  |
| DK | Copenhagen | Kopenhagen | Copenaghen | Copenhague | Copenhague |
| DM | Roseau |  |  |  |  |
| DO | Santo Domingo |  |  |  |  |
| DZ | Algiers | Algier | Algeri | Argel | Alger |
| EC | Quito |  |  |  |  |
| EE | Tallinn |  |  |  |  |
| EG | Cairo | Kairo | Il Cairo | El Cairo | Le Caire |
| ER | Asmara |  |  |  |  |
| ES | Madrid |  |  |  |  |
| ET | Addis Ababa | Addis Abeba | Addis Abeba | Adís Abeba | Addis-Abeba |
| FI | Helsinki |  |  |  |  |
| FJ | Suva |  |  |  |  |
| FM | Palikir |  |  |  |  |
| FR | Paris |  |  |  |  |
| GA | Libreville |  |  |  |  |
| GB | London |  | Londra | Londres | Londres |
| GD | Saint George's |  |  |  |  |
| GE | Tbilisi |  |  |  | Tbilissi |
| GH | Accra |  |  | Acra |  |
| GM | Banjul |  |  |  |  |
| GN | Conakry |  |  | Conakri |  |
| GQ | Malabo |  |  |  |  |
| GR | Athens | Athen | Atene | Atenas | Athènes |
| GT | Guatemala City | Guatemala-Stadt | Città del Guatemala | Ciudad de Guatemala | Guatemala |
| GW | Bissau |  |  |  |  |
| GY | Georgetown |  |  |  |  |
| HN | Tegucigalpa |  |  |  |  |
| HR | Zagreb |  |  |  |  |
| HT | Port-au-Prince |  |  | Puerto Príncipe |  |
| HU | Budapest |  |  |  |  |
| ID | Jakarta |  |  | Yakarta |  |
| IE | Dublin |  | Dublino | Dublín |  |
| IL | Jerusalem |  | Gerusalemme | Jerusalén | Jérusalem |
| IN | Delhi |  |  |  |  |
| IQ | Baghdad | Bagdad |  | Bagdad | Bagdad |
| IR | Tehran | Teheran | Teheran | Teherán | Téhéran |
| IS | Reykjavik |  |  | Reikiavik |  |
| IT | Rome | Rom | Roma | Roma |  |
| JM | Kingston |  |  |  |  |
| JO | Amman |  |  | Amán |  |
| JP | Tokyo |  |  | Tokio |  |
| KE | Nairobi |  |  |  |  |
| KG | Bishkek |  | Biškek | Biskek | Bichkek |
| KH | Phnom Penh |  |  | Nom Pen |  |
| KI | Tarawa |  |  |  |  |
| KM | Moroni |  |  |  |  |
| KN | Basseterre |  |  |  |  |
| KP | Pyongyang | Pjöngjang |  | Pionyang |  |
| KR | Seoul |  | Seul | Seúl | Séoul |
| KW | Kuwait City | Kuwait-Stadt |  |  | Koweït |
| KZ | Astana |  |  |  |  |
| LA | Vientiane |  |  | Vientián |  |
| LB | Beirut |  |  |  | Beyrouth |
| LC | Castries |  |  |  |  |
| LI | Vaduz |  |  |  |  |
| LK | Colombo |  |  |  |  |
| LR | Monrovia |  |  |  |  |
| LS | Maseru |  |  |  |  |
| LT | Vilnius |  |  | Vilna |  |
| LU | Luxembourg | Luxemburg | Lussemburgo | Luxemburgo |  |
| LV | Riga |  |  |  |  |
| LY | Tripoli | Tripolis |  |  |  |
| MA | Rabat |  |  |  |  |
| MC | Monaco |  |  | Mónaco |  |
| MD | Chișinău |  |  | Chisináu |  |
| ME | Podgorica |  |  |  |  |
| MG | Antananarivo |  |  |  |  |
| MH | Majuro |  |  |  |  |
| MK | Skopje |  |  | Skopie |  |
| ML | Bamako |  |  |  |  |
| MM | Nay Pyi Taw |  |  |  |  |
| MN | Ulaanbaatar | Ulan Bator | Ulan Bator | Ulán Bator | Oulan-Bator |
| MR | Nouakchott |  |  |  |  |
| MT | Valletta |  | La Valletta | La Valeta | La Valette |
| MU | Port Louis |  |  |  |  |
| MV | Malé |  |  |  |  |
| MW | Lilongwe |  |  |  |  |
| MX | Mexico City | Mexiko-Stadt | Città del Messico | Ciudad de México | Mexico |
| MY | Kuala Lumpur |  |  |  |  |
| MZ | Maputo |  |  |  |  |
| NA | Windhoek |  |  |  |  |
| NE | Niamey |  |  |  |  |
| NG | Abuja |  |  |  |  |
| NI | Managua |  |  |  |  |
| NL | The Hague | Den Haag | L'Aia | La Haya | La Haye |
| NO | Oslo |  |  |  |  |
| NP | Kathmandu |  |  | Katmandú | Katmandou |
| NR | Yaren |  |  |  |  |
| NZ | Wellington |  |  |  |  |
| OM | Muscat | Maskat | Mascate | Mascate | Mascate |
| PA | Panama City | Panama-Stadt | Città di Panama | Ciudad de Panamá | Panama |
| PE | Lima |  |  |  |  |
| PG | Port Moresby |  |  |  |  |
| PH | Manila |  |  |  | Manille |
| PK | Islamabad |  |  |  |  |
| PL | Warsaw | Warschau | Varsavia | Varsovia | Varsovie |
| PT | Lisbon | Lissabon | Lisbona | Lisboa | Lisbonne |
| PW | Koror |  |  |  |  |
| PY | Asunción |  |  |  |  |
| QA | Doha |  |  |  |  |
| RO | Bucharest | Bukarest | Bucarest | Bucarest | Bucarest |
| RS | Belgrade | Belgrad | Belgrado | Belgrado |  |
| RU | Moscow | Moskau | Mosca | Moscú | Moscou |
| RW | Kigali |  |  |  |  |
| SA | Riyadh | Riad | Riyad | Riad |  |
| SB | Honiara |  |  |  |  |
| SC | Victoria |  |  |  |  |
| SD | Khartoum | Khartum | Khartum | Jartum |  |
| SE | Stockholm |  | Stoccolma | Estocolmo |  |
| SG | Singapore | Singapur |  | Singapur | Singapour |
| SI | Ljubljana |  | Lubiana | Liubliana |  |
| SK | Bratislava |  |  |  |  |
| SL | Freetown |  |  |  |  |
| SM | San Marino |  |  |  |  |
| SN | Dakar |  |  |  |  |
| SO | Mogadishu | Mogadischu | Mogadiscio | Mogadiscio | Mogadiscio |
| SR | Paramaribo |  |  |  |  |
| SS | Juba |  |  |  |  |
| ST | São Tomé |  |  | Santo Tomé |  |
| SV | San Salvador |  |  |  |  |
| SY | Damascus | Damaskus | Damasco | Damasco | Damas |
| SZ | Mbabane |  |  |  |  |
| TD | N'Djamena |  |  | Yamena | N'Djaména |
| TG | Lomé |  |  |  |  |
| TH | Bangkok |  |  |  |  |
| TJ | Dushanbe | Duschanbe |  | Dusambé | Douchanbé |
| TL | Dili |  |  |  |  |
| TM | Ashgabat | Aschgabat |  | Asjabad | Achgabat |
| TN | Tunis |  |  | Túnez |  |
| TO | Nuku'alofa |  |  |  |  |
| TR | Ankara |  |  |  |  |
| TT | Port of Spain |  |  | Puerto España | Port-d'Espagne |
| TV | Funafuti |  |  |  |  |
| TW | Taipei | Taipeh |  | Taipéi |  |
| TZ | Dodoma |  |  |  |  |
| UA | Kyiv | Kiew | Kiev | Kiev | Kiev |
| UG | Kampala |  |  |  |  |
| US | Washington, D.C. |  | Washington | Washington D. C. | Washington |
| UY | Montevideo |  |  |  |  |
| UZ | Tashkent | Taschkent |  | Taskent | Tachkent |
| VA | Vatican City | Vatikanstadt | Città del Vaticano | Ciudad del Vaticano | Cité du Vatican |
| VC | Kingstown |  |  |  |  |
| VE | Caracas |  |  |  |  |
| VN | Hanoi |  |  | Hanói | Hanoï |
| VU | Port Vila |  |  |  |  |
| WS | Apia |  |  |  |  |
| YE | Sana'a | Sanaa |  | Saná | Sanaa |
| ZA | Pretoria |  |  |  |  |
| ZM | Lusaka |  |  |  |  |
| ZW | Harare |  |  |  |  |

## Capital Cities: taunts (generic, by size of the capital; `{n}` is the capital's name)

### tier `mega`

| | lines |
|---|---|
| en | {n} is the lot people remember. Try to remember it as mine.<br>A skyline like {n}'s does not come cheap. Neither will I.<br>Bid on {n} if you enjoy expensive lessons.<br>Millions live in {n}. You are about to meet the bill.<br>I will take {n} and everything inside its ring road. |
| de | {n} ist das Los, an das man sich erinnert. Erinnere dich an mich.<br>Eine Skyline wie die von {n} gibt es nicht billig. Ich auch nicht.<br>Biete auf {n}, wenn du teure Lektionen magst.<br>In {n} leben Millionen. Du bekommst gleich die Rechnung.<br>Ich nehme {n} und alles innerhalb der Stadtgrenze. |
| it | {n} è il lotto che tutti ricordano. Ricordalo come mio.<br>Uno skyline come quello di {n} non costa poco. Nemmeno io.<br>Se ti piacciono le lezioni costose, {n} fa per te.<br>{n}: milioni di abitanti. Ti arriva il conto.<br>Prendo {n} e tutto ciò che sta dentro la tangenziale. |
| es | {n} es el lote que todo el mundo recuerda. Recuérdalo como mío.<br>Un perfil urbano como el de {n} no sale barato. Yo tampoco.<br>Puja por {n} si te gustan las lecciones caras.<br>En {n} viven millones. Te va a llegar la factura.<br>Me llevo {n} y todo lo que haya dentro de su circunvalación. |
| fr | {n} est le lot dont on se souvient. Souviens-toi qu'il est à moi.<br>Une skyline comme celle de {n} ne se brade pas. Moi non plus.<br>Enchéris sur {n} si tu aimes les leçons coûteuses.<br>Des millions de gens vivent à {n}. L'addition arrive.<br>Je prends {n} et tout ce qui est dans son périphérique. |

### tier `large`

| | lines |
|---|---|
| en | {n} has real weight. So does my wallet.<br>A serious city, {n}. A serious bid is required.<br>You cannot out-collect me starting from {n}.<br>{n} is worth more than your instincts suggest.<br>Careful with {n}: it bites back. |
| de | {n} hat Gewicht. Mein Geldbeutel auch.<br>Eine ernsthafte Stadt, {n}. Es braucht ein ernsthaftes Gebot.<br>Mit {n} als Start überbietest du mich nie.<br>{n} ist mehr wert, als dein Gefühl dir sagt.<br>Vorsicht mit {n}: Das beißt zurück. |
| it | {n} ha peso. Anche il mio portafoglio.<br>Una città seria, {n}. Serve un'offerta seria.<br>Non puoi battermi partendo da {n}.<br>{n} vale più di quanto suggerisca il tuo istinto.<br>Attento con {n}: morde. |
| es | {n} pesa. Mi cartera también.<br>Una ciudad seria, {n}. Hace falta una puja seria.<br>No puedes superarme empezando por {n}.<br>{n} vale más de lo que te dice el instinto.<br>Cuidado con {n}: muerde. |
| fr | {n} a du poids. Mon portefeuille aussi.<br>Une ville sérieuse, {n}. Il faut une mise sérieuse.<br>Tu ne peux pas me battre en partant de {n}.<br>{n} vaut plus que ton instinct ne le dit.<br>Prudence avec {n} : ça mord. |

### tier `mid`

| | lines |
|---|---|
| en | {n} is decent. I take decent things from people like you.<br>Modest, useful, mine. That is {n}.<br>You keep bidding. I keep counting. {n} is mine.<br>{n} will not win you the evening, but it can lose it.<br>I could explain why {n} matters, but you would still lose. |
| de | {n} ist ordentlich. Ordentliches nehme ich Leuten wie dir weg.<br>Bescheiden, nützlich, meins. Das ist {n}.<br>Du bietest weiter. Ich rechne weiter. {n} gehört mir.<br>{n} gewinnt dir nicht den Abend, kann ihn dich aber kosten.<br>Ich könnte erklären, warum {n} zählt, aber du würdest trotzdem verlieren. |
| it | {n} è decente. Prendo le cose decenti a gente come te.<br>Modesto, utile, mio: {n}.<br>Tu rilanci, io conto. {n} è mio.<br>{n} non ti farà vincere la serata, ma può fartela perdere.<br>Potrei spiegarti perché {n} conta, ma perderesti lo stesso. |
| es | {n} está bien. Le quito lo que está bien a gente como tú.<br>Humilde, útil y mío: {n}.<br>Tú sigues pujando. Yo sigo contando. {n} es para mí.<br>{n} no te ganará la noche, pero puede hacértela perder.<br>Podría explicarte por qué importa {n}, pero perderías igual. |
| fr | {n}, c'est correct. Je prends ce qui est correct aux gens comme toi.<br>Modeste, utile, à moi : {n}.<br>Tu enchéris, je compte. {n} est à moi.<br>{n} ne te fera pas gagner la soirée, mais peut te la faire perdre.<br>Je pourrais t'expliquer pourquoi {n} compte, mais tu perdrais quand même. |

### tier `small`

| | lines |
|---|---|
| en | {n} is small, cheap, and still beyond your judgement.<br>I have owned larger car parks than {n}.<br>{n}? Charming. I shall take it out of spite.<br>Do not overpay for {n}. Do. Please do.<br>A footnote called {n}. I collect footnotes. |
| de | {n} ist klein, billig und trotzdem jenseits deines Urteilsvermögens.<br>Ich habe schon größere Parkplätze besessen als {n}.<br>{n}? Reizend. Ich nehme es aus Trotz.<br>Zahl bloß nicht zu viel für {n}. Doch. Bitte tu es.<br>Eine Fußnote namens {n}. Ich sammle Fußnoten. |
| it | {n}: piccolo, economico e comunque oltre il tuo giudizio.<br>Ho posseduto parcheggi più grandi di {n}.<br>{n}? Grazioso. Lo prendo per dispetto.<br>Non pagare troppo per {n}. Anzi sì. Fallo, ti prego.<br>Una nota a piè di pagina chiamata {n}. Le colleziono. |
| es | {n} es poca cosa y aun así supera tu criterio.<br>He tenido aparcamientos más grandes que {n}.<br>¿{n}? Encantador. Me lo quedo por despecho.<br>No pagues de más por {n}. Sí, hazlo. Por favor.<br>Una nota a pie de página llamada {n}. Las colecciono. |
| fr | {n} : petit, bon marché et pourtant hors de ta portée.<br>J'ai possédé des parkings plus grands que {n}.<br>{n} ? Charmant. Je le prends par dépit.<br>Ne paie pas trop cher {n}. Si. Fais-le, je t'en prie.<br>Une note de bas de page appelée {n}. Je les collectionne. |

### tier `micro`

| | lines |
|---|---|
| en | Somewhere in {n}, three people are watching this. Hello.<br>{n} fits in a lift. So does your score.<br>I could buy {n} with the change in my coat.<br>The whole of {n} would fit on my shortlist.<br>{n} rounds down to nothing, and I shall still outbid you. |
| de | Irgendwo in {n} schauen drei Leute zu. Hallo.<br>{n} passt in einen Aufzug. Dein Punktestand auch.<br>{n} kaufe ich vom Kleingeld in meiner Manteltasche.<br>Ganz {n} passt auf meine Merkliste.<br>{n} rundet auf null ab, und ich überbiete dich trotzdem. |
| it | {n}: da qualche parte, tre persone stanno guardando. Ciao.<br>{n} entra in un ascensore. Anche il tuo punteggio.<br>Potrei comprare {n} con gli spiccioli del cappotto.<br>{n} intero starebbe nella mia lista dei desideri.<br>{n} si arrotonda a zero, e ti rilancio lo stesso. |
| es | En algún lugar de {n}, tres personas están viendo esto. Hola.<br>{n} cabe en un ascensor. Tu puntuación también.<br>Podría comprar {n} con el cambio del abrigo.<br>{n} entero cabría en mi lista corta.<br>{n} se redondea a cero, y aun así te supero. |
| fr | Quelque part à {n}, trois personnes regardent ça. Bonjour.<br>{n} tient dans un ascenseur. Ton score aussi.<br>Je pourrais acheter {n} avec la monnaie de mon manteau.<br>Ma liste courte pourrait contenir {n} en entier.<br>{n} s'arrondit à zéro, et je te surenchérirai quand même. |
