# Capital Cities pack — sources and choices

`pack-capitals.js` is **generated** by `test/make-pack-capitals.js` from two committed inputs: `test/wup2018-f13-capitals.json` (the UN numbers, copied unchanged) and `test/capitals-content.json` (names, Europe list, taunts, level labels). Edit those, never the pack.

## The one source

- **United Nations, Department of Economic and Social Affairs, Population Division (2018). *World Urbanization Prospects: The 2018 Revision*, Online Edition.** File 13, *Population of Capital Cities in 2018 (thousands)*, `POP/DB/WUP/Rev.2018/1/F13`.
- Downloaded 2026-10-31 from `https://population.un.org/wup/assets/Download/Archive/WUP2018-Excel-files.zip` (member `WUP2018-F13-Capital_Cities.xls`; the page is <https://population.un.org/wup/> → Downloads → Archive). SHA-256 of the xls: `0a7932e6ab30b3c8ba0d518d5f84072f162bad6553769c2a05d654bea99de6a6`.
- Licence: *Copyright © 2018 by United Nations, made available under a Creative Commons license CC BY 3.0 IGO* (<http://creativecommons.org/licenses/by/3.0/igo/>), as printed in the file itself. The game credits the source in Privacy → Credits & licences (five languages) and `NOTICE.md`, states that the data are unchanged and that this is no endorsement by the UN.
- **What the number is**: the 2018 population of the capital's *urban agglomeration* as the UN reports it from each country's own definition (the file's notes say, for example, that Ottawa means Ottawa–Gatineau, La Paz means La Paz + El Alto + Viacha + Achocalla, The Hague means s-Gravenhage and six neighbouring municipalities). `value` in the pack = thousands ÷ 1,000 (1 point = 1 million people). Nothing was estimated, rounded or projected by us.
- **Why 2018 and not the 2025 Revision.** WUP 2025 (published Nov 2025) has a capital-city table too (`WUP2025-F20-DEGURBA-Capital_Cities.xlsx`), but it counts *functional "cities" by the Degree of Urbanisation*, not urban agglomerations — it gives Vatican City 2,376 thousand (that is Rome's functional city; the Vatican has about 800 inhabitants) and Sejong 8 thousand. The 2018 file is the one that matches "population of the capital's urban agglomeration" and has a real Vatican City row. The cost: the numbers are for 2018. **Owner decision pending: keep 2018, or switch to WUP 2025 and accept its definition.**

## Lots: 195

The 193 UN member states + Vatican City (the file calls it "Holy See") + Taiwan's Taipei (the file lists "China, Taiwan Province of China", city "Taibei", type "Others"). **Not** State of Palestine (observer). The file has 241 rows; the other 46 are territories and dependencies (Hong Kong, Puerto Rico, Greenland …) and are not lots. Every one of the 195 has a population in the file (the only empty cell in the whole file is Tokelau, which is not a lot). Item ids are the ISO 3166-1 alpha-2 codes, so the country's flag marks the lot.

## Countries with several capitals (the seat of government is used)


| Country | Used (UN row, type) | thousands | Not used (UN row, type) | thousands |
|---|---|---|---|---|
| Benin | Cotonou (Economic Capital) | 685.458 | Porto-Novo (Constitutional Capital) | 285.328 |
| Bolivia (Plurinational State of) | La Paz (Seat of Government) | 1814.087 | Sucre (Constitutional Capital) | 277.91 |
| Côte d'Ivoire | Abidjan (Administrative Capital) | 4920.776 | Yamoussoukro (Capital) | 231.072 |
| Netherlands | s-Gravenhage (The Hague) (Seat of Government) | 685.14 | Amsterdam (Capital) | 1131.69 |
| South Africa | Pretoria (Administrative Capital) | 2378.35 | Bloemfontein (Judiciary Capital); Cape Town (Legislative Capital) | 545.875; 4430.367 |
| Sri Lanka | Colombo (Capital) | 599.821 | Sri Jayewardenepura Kotte (Legislative Capital) | 103.248 |

Reading of "seat of government": where the UN labels one row *Seat of Government* or *Administrative Capital* (Bolivia, The Netherlands, Côte d'Ivoire, South Africa) that row is used; Benin's government sits in Cotonou, Sri Lanka's executive in Colombo (Sri Jayewardenepura Kotte is the legislative capital). **These six are surprising to a player who expects the constitutional capital (Porto-Novo, Sucre, Yamoussoukro, Amsterdam, Cape Town/Bloemfontein, Kotte) — owner may overrule any of them: change `CHOSEN` in the input build and the name in `capitals-content.json`.**

## Caveats the owner should know (UN row ≠ today's seat of government, or the row is not the town)

- **Malaysia** — the UN lists Kuala Lumpur only; the federal government sits in Putrajaya (no UN row). Kuala Lumpur is used.
- **Palau** — the UN lists Koror (the old capital); the capital moved to Ngerulmud in 2006 (no UN row, ~300 people). Koror is used.
- **Burundi** — the UN lists Bujumbura (2018 file); Gitega became the political capital in January 2019 (no UN row). Bujumbura is used.
- **Nauru** — Nauru has no official capital; Yaren is the de-facto seat. The UN row is "Nauru" (the whole island, 11.3 thousand), shown as **Yaren** in the game.
- **Vatican City** — 0.801 thousand = 801 people; a lot worth 0.0008 points (the metric prints "801").
- **Taiwan** — UN type "Others", the row exists (2,705.791 thousand).
- **Tanzania** — Dodoma (the UN's row, 261.645 thousand), not Dar es Salaam.
- **Myanmar** — Nay Pyi Taw (500.218 thousand).
- Names in German, Italian, Spanish and French were written for this game and **have not been reviewed by a native speaker**. Taunts are generic (by size tier) in all five languages; there are no per-capital fun facts.

## All 195 lots (UN figures, thousands, 2018)

| id | Capital (UN city) | Country (UN) | thousands |
|---|---|---|---|
| JP | Tokyo (Tokyo) | Japan | 37468.302 |
| IN | Delhi (Delhi) | India | 28513.682 |
| MX | Mexico City (Ciudad de México (Mexico City)) | Mexico | 21580.827 |
| EG | Cairo (Al-Qahirah (Cairo)) | Egypt | 20076.002 |
| CN | Beijing (Beijing) | China | 19617.963 |
| BD | Dhaka (Dhaka) | Bangladesh | 19578.421 |
| AR | Buenos Aires (Buenos Aires) | Argentina | 14966.53 |
| PH | Manila (Manila) | Philippines | 13482.468 |
| CD | Kinshasa (Kinshasa) | Democratic Republic of the Congo | 13171.256 |
| RU | Moscow (Moskva (Moscow)) | Russian Federation | 12409.738 |
| FR | Paris (Paris) | France | 10900.952 |
| CO | Bogotá (Bogotá) | Colombia | 10574.409 |
| ID | Jakarta (Jakarta) | Indonesia | 10516.927 |
| PE | Lima (Lima) | Peru | 10390.607 |
| TH | Bangkok (Krung Thep (Bangkok)) | Thailand | 10156.316 |
| KR | Seoul (Seoul) | Republic of Korea | 9963.497 |
| GB | London (London) | United Kingdom | 9046.485 |
| IR | Tehran (Tehran) | Iran (Islamic Republic of) | 8895.947 |
| AO | Luanda (Luanda) | Angola | 7774.2 |
| MY | Kuala Lumpur (Kuala Lumpur) | Malaysia | 7563.912 |
| SA | Riyadh (Ar-Riyadh (Riyadh)) | Saudi Arabia | 6906.595 |
| IQ | Baghdad (Baghdad) | Iraq | 6811.955 |
| CL | Santiago (Santiago) | Chile | 6680.371 |
| ES | Madrid (Madrid) | Spain | 6497.124 |
| SG | Singapore (Singapore) | Singapore | 5791.901 |
| SD | Khartoum (Al-Khartum (Khartoum)) | Sudan | 5534.079 |
| US | Washington, D.C. (Washington, D.C.) | United States of America | 5206.593 |
| CI | Abidjan (Abidjan) | Côte d'Ivoire | 4920.776 |
| TR | Ankara (Ankara) | Turkey | 4919.074 |
| BR | Brasília (Brasília) | Brazil | 4469.585 |
| ET | Addis Ababa (Addis Ababa) | Ethiopia | 4399.674 |
| KE | Nairobi (Nairobi) | Kenya | 4385.853 |
| VN | Hanoi (Hà Noi) | Viet Nam | 4282.738 |
| IT | Rome (Roma (Rome)) | Italy | 4209.71 |
| AF | Kabul (Kabul) | Afghanistan | 4011.77 |
| CM | Yaoundé (Yaoundé) | Cameroon | 3655.656 |
| DE | Berlin (Berlin) | Germany | 3552.123 |
| PY | Asunción (Asunción) | Paraguay | 3222.199 |
| DO | Santo Domingo (Santo Domingo) | Dominican Republic | 3172.152 |
| GR | Athens (Athínai (Athens)) | Greece | 3155.6 |
| MG | Antananarivo (Antananarivo) | Madagascar | 3058.387 |
| KP | Pyongyang (P'yongyang) | Dem. People's Republic of Korea | 3037.862 |
| KW | Kuwait City (Al Kuwayt (Kuwait City)) | Kuwait | 2989.27 |
| UG | Kampala (Kampala) | Uganda | 2986.352 |
| SN | Dakar (Dakar) | Senegal | 2978.419 |
| UA | Kyiv (Kyiv (Kiev)) | Ukraine | 2956.706 |
| VE | Caracas (Caracas) | Venezuela (Bolivarian Republic of) | 2934.56 |
| PT | Lisbon (Lisboa (Lisbon)) | Portugal | 2927.316 |
| NG | Abuja (Abuja) | Nigeria | 2918.518 |
| GT | Guatemala City (Ciudad de Guatemala (Guatemala City)) | Guatemala | 2851.104 |
| YE | Sana'a (Sana'a') | Yemen | 2779.317 |
| TW | Taipei (Taibei) | China, Taiwan Province of China | 2705.791 |
| DZ | Algiers (El Djazaïr (Algiers)) | Algeria | 2693.542 |
| HT | Port-au-Prince (Port-au-Prince) | Haiti | 2636.763 |
| BF | Ouagadougou (Ouagadougou) | Burkina Faso | 2531.381 |
| ZM | Lusaka (Lusaka) | Zambia | 2523.844 |
| UZ | Tashkent (Tashkent) | Uzbekistan | 2463.969 |
| ML | Bamako (Bamako) | Mali | 2446.749 |
| GH | Accra (Accra) | Ghana | 2439.389 |
| LB | Beirut (Bayrut (Beirut)) | Lebanon | 2385.271 |
| ZA | Pretoria (Pretoria) | South Africa | 2378.35 |
| SY | Damascus (Dimashq (Damascus)) | Syrian Arab Republic | 2319.545 |
| TN | Tunis (Tunis) | Tunisia | 2290.777 |
| AZ | Baku (Baku) | Azerbaijan | 2285.729 |
| CG | Brazzaville (Brazzaville) | Congo | 2229.693 |
| CU | Havana (La Habana (Havana)) | Cuba | 2136.468 |
| SO | Mogadishu (Muqdisho (Mogadishu)) | Somalia | 2081.624 |
| JO | Amman (Amman) | Jordan | 2064.582 |
| BE | Brussels (Bruxelles-Brussel) | Belgium | 2049.51 |
| BY | Minsk (Minsk) | Belarus | 2004.672 |
| KH | Phnom Penh (Phnum Pénh (Phnom Penh)) | Cambodia | 1952.329 |
| AT | Vienna (Wien (Vienna)) | Austria | 1900.547 |
| MA | Rabat (Rabat) | Morocco | 1846.661 |
| GN | Conakry (Conakry) | Guinea | 1843.121 |
| EC | Quito (Quito) | Ecuador | 1822.397 |
| RO | Bucharest (Bucuresti (Bucharest)) | Romania | 1821.38 |
| BO | La Paz (La Paz) | Bolivia (Plurinational State of) | 1814.087 |
| PA | Panama City (Ciudad de Panamá (Panama City)) | Panama | 1783.49 |
| PL | Warsaw (Warszawa (Warsaw)) | Poland | 1767.798 |
| HU | Budapest (Budapest) | Hungary | 1759.497 |
| TG | Lomé (Lomé) | Togo | 1745.744 |
| UY | Montevideo (Montevideo) | Uruguay | 1736.989 |
| SE | Stockholm (Stockholm) | Sweden | 1582.968 |
| MN | Ulaanbaatar (Ulaanbaatar) | Mongolia | 1520.381 |
| ZW | Harare (Harare) | Zimbabwe | 1515.016 |
| OM | Muscat (Masqat (Muscat)) | Oman | 1446.563 |
| AE | Abu Dhabi (Abu Zaby (Abu Dhabi)) | United Arab Emirates | 1419.699 |
| LR | Monrovia (Monrovia) | Liberia | 1418.3 |
| RS | Belgrade (Beograd (Belgrade)) | Serbia | 1389.351 |
| CA | Ottawa (Ottawa-Gatineau) | Canada | 1363.159 |
| HN | Tegucigalpa (Tegucigalpa) | Honduras | 1363.041 |
| CR | San José (San José) | Costa Rica | 1357.745 |
| NP | Kathmandu (Kathmandu) | Nepal | 1329.732 |
| TD | N'Djamena (N'Djaména) | Chad | 1322.679 |
| DK | Copenhagen (København (Copenhagen)) | Denmark | 1320.826 |
| CZ | Prague (Praha (Prague)) | Czechia | 1291.552 |
| FI | Helsinki (Helsinki) | Finland | 1279.096 |
| BG | Sofia (Sofia) | Bulgaria | 1272.418 |
| NE | Niamey (Niamey) | Niger | 1213.781 |
| MR | Nouakchott (Nouakchott) | Mauritania | 1205.414 |
| IE | Dublin (Dublin) | Ireland | 1201.426 |
| LY | Tripoli (Tarabulus (Tripoli)) | Libya | 1157.746 |
| SL | Freetown (Freetown) | Sierra Leone | 1135.949 |
| SV | San Salvador (San Salvador) | El Salvador | 1106.698 |
| MZ | Maputo (Maputo) | Mozambique | 1101.771 |
| AM | Yerevan (Yerevan) | Armenia | 1080.324 |
| GE | Tbilisi (Tbilisi) | Georgia | 1077.333 |
| KZ | Astana (Astana) | Kazakhstan | 1068.113 |
| PK | Islamabad (Islamabad) | Pakistan | 1061.412 |
| RW | Kigali (Kigali) | Rwanda | 1057.836 |
| NI | Managua (Managua) | Nicaragua | 1047.923 |
| MW | Lilongwe (Lilongwe) | Malawi | 1029.639 |
| NO | Oslo (Oslo) | Norway | 1012.225 |
| KG | Bishkek (Bishkek) | Kyrgyzstan | 996.319 |
| IL | Jerusalem (Jerusalem) | Israel | 907.062 |
| BI | Bujumbura (Bujumbura) | Burundi | 898.968 |
| ER | Asmara (Asmara) | Eritrea | 895.863 |
| TJ | Dushanbe (Dushanbe) | Tajikistan | 872.653 |
| CF | Bangui (Bangui) | Central African Republic | 850.946 |
| GA | Libreville (Libreville) | Gabon | 813.489 |
| TM | Ashgabat (Ashgabat) | Turkmenistan | 810.186 |
| HR | Zagreb (Zagreb) | Croatia | 685.587 |
| BJ | Cotonou (Cotonou) | Benin | 685.458 |
| NL | The Hague (s-Gravenhage (The Hague)) | Netherlands | 685.14 |
| LA | Vientiane (Vientiane) | Lao People's Democratic Republic | 664.754 |
| LV | Riga (Riga) | Latvia | 637.089 |
| QA | Doha (Ad-Dawhah (Doha)) | Qatar | 633.401 |
| LK | Colombo (Colombo) | Sri Lanka | 599.821 |
| JM | Kingston (Kingston) | Jamaica | 589.083 |
| MK | Skopje (Skopje) | TFYR Macedonia | 584.208 |
| BH | Manama (Al-Manamah (Manama)) | Bahrain | 564.631 |
| DJ | Djibouti (Djibouti) | Djibouti | 561.564 |
| GW | Bissau (Bissau) | Guinea-Bissau | 558.399 |
| TT | Port of Spain (Port of Spain) | Trinidad and Tobago | 544.417 |
| LT | Vilnius (Vilnius) | Lithuania | 536.055 |
| MD | Chișinău (Chişinău) | Republic of Moldova | 509.707 |
| MM | Nay Pyi Taw (Nay Pyi Taw) | Myanmar | 500.218 |
| AL | Tirana (Tiranë (Tirana)) | Albania | 475.577 |
| AU | Canberra (Canberra) | Australia | 447.692 |
| GM | Banjul (Banjul) | Gambia | 437.161 |
| EE | Tallinn (Tallinn) | Estonia | 437.027 |
| SK | Bratislava (Bratislava) | Slovakia | 429.92 |
| CH | Bern (Bern) | Switzerland | 422.153 |
| NZ | Wellington (Wellington) | New Zealand | 411.346 |
| NA | Windhoek (Windhoek) | Namibia | 404.28 |
| SS | Juba (Juba) | South Sudan | 368.914 |
| PG | Port Moresby (Port Moresby) | Papua New Guinea | 366.862 |
| BA | Sarajevo (Sarajevo) | Bosnia and Herzegovina | 342.577 |
| GQ | Malabo (Malabo) | Equatorial Guinea | 296.77 |
| SI | Ljubljana (Ljubljana) | Slovenia | 286.491 |
| TL | Dili (Dili) | Timor-Leste | 281.135 |
| BS | Nassau (Nassau) | Bahamas | 279.668 |
| CY | Nicosia (Lefkosia (Nicosia)) | Cyprus | 269.469 |
| BW | Gaborone (Gaborone) | Botswana | 269.338 |
| TZ | Dodoma (Dodoma) | United Republic of Tanzania | 261.645 |
| SR | Paramaribo (Paramaribo) | Suriname | 239.457 |
| IS | Reykjavik (Reykjavík) | Iceland | 216.364 |
| MT | Valletta (Valletta) | Malta | 212.768 |
| BT | Thimphu (Thimphu) | Bhutan | 203.297 |
| LS | Maseru (Maseru) | Lesotho | 201.851 |
| FJ | Suva (Suva) | Fiji | 178.339 |
| ME | Podgorica (Podgorica) | Montenegro | 177.177 |
| MV | Malé (Male) | Maldives | 176.851 |
| CV | Praia (Praia) | Cabo Verde | 167.504 |
| MU | Port Louis (Port Louis) | Mauritius | 149.365 |
| LU | Luxembourg (Luxembourg) | Luxembourg | 119.752 |
| GY | Georgetown (Georgetown) | Guyana | 109.934 |
| BB | Bridgetown (Bridgetown) | Barbados | 89.201 |
| SB | Honiara (Honiara) | Solomon Islands | 81.801 |
| ST | São Tomé (São Tomé) | Sao Tome and Principe | 80.099 |
| SZ | Mbabane (Mbabane) | Swaziland | 68.01 |
| KI | Tarawa (Tarawa) | Kiribati | 64.011 |
| KM | Moroni (Moroni) | Comoros | 62.351 |
| VU | Port Vila (Port Vila) | Vanuatu | 52.69 |
| BN | Bandar Seri Begawan (Bandar Seri Begawan) | Brunei Darussalam | 40.781 |
| GD | Saint George's (St.George's) | Grenada | 39.297 |
| MC | Monaco (Monaco) | Monaco | 38.897 |
| WS | Apia (Apia) | Samoa | 36.066 |
| MH | Majuro (Majuro) | Marshall Islands | 30.661 |
| SC | Victoria (Victoria) | Seychelles | 28.091 |
| VC | Kingstown (Kingstown) | Saint Vincent and the Grenadines | 26.636 |
| BZ | Belmopan (Belmopan) | Belize | 22.964 |
| TO | Nuku'alofa (Nuku'alofa) | Tonga | 22.904 |
| AD | Andorra la Vella (Andorra la Vella) | Andorra | 22.614 |
| LC | Castries (Castries) | Saint Lucia | 22.258 |
| AG | Saint John's (St. John's) | Antigua and Barbuda | 20.764 |
| DM | Roseau (Roseau) | Dominica | 14.942 |
| KN | Basseterre (Basseterre) | Saint Kitts and Nevis | 14.434 |
| PW | Koror (Koror) | Palau | 11.41 |
| NR | Yaren (Nauru) | Nauru | 11.312 |
| TV | Funafuti (Funafuti) | Tuvalu | 7.042 |
| FM | Palikir (Palikir) | Micronesia (Fed. States of) | 6.996 |
| LI | Vaduz (Vaduz) | Liechtenstein | 5.47 |
| SM | San Marino (San Marino) | San Marino | 4.465 |
| VA | Vatican City (Vatican City) | Holy See | 0.801 |
