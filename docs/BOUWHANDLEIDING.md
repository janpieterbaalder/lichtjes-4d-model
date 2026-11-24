# Lichtjes 4D — bouwhandleiding

> Automatisch gegenereerd uit `web/src/content.js` en `cad/design.mjs` (`npm run docs`). Open `index.html` voor de 3D-werkplaats met dezelfde stappen, interactief.

Een echte, speelbare versie van de 2×2×2×2 **Lichtjes**-puzzel (Lights Out) uit de 4d-puzzels app: 16 lichtgevende cellen op de hoekpunten van een binnen- en een buitenkubus (tesseract-weergave), één staaf, een voet met Arduino Nano en een controller met twee duimsticks.

## In het kort

|  |  |
| --- | --- |
| Hoogte | 283 mm |
| Voet | 190 × 190 × 48 mm |
| Buitenkubus / binnenkubus | 160 / 84 mm hart-op-hart |
| Cellen | 30 mm (buiten) en 24 mm (binnen), doorschijnend PETG |
| Ribben | 32 × aluminium buis 8 × 1 mm + staaf 12 × 1 mm |
| Elektronica | Arduino Nano, 16 × WS2812B, 2 × KY-023, OLED 0,96", zoemer |
| Kosten | ± € 124 zonder gereedschap |
| Printtijd / filament | ± 57 uur · 381 g zwart + 268 g naturel |

## Fasen

1. **Bestellen** (1–3 weken levertijd, ± 1 u) — Bestel alles uit de inkooplijst. Begin intussen met virtueel testen en printen.
2. **Virtueel testen** (1 avond, ± 1 u) — Speel in deze 3D-werkplaats en draai de echte firmware in Wokwi. Zo weet je dat de code klopt vóór er gesoldeerd wordt.
3. **Printen** (± 4–6 printavonden, ± 57 u) — 11 verschillende onderdelen, 39 stuks. Cellen in doorschijnend PETG, de rest zwart.
4. **Zagen & boren** (1 middag, ± 2 u) — 33 stukken buis op maat met de zaagmal, ontbramen, voedingsgat boren, sleuf in de staaf.
5. **Ketting bouwen** (2–3 avonden, ± 7 u) — 16 LED's solderen terwijl je de draden door de buizen trekt. Na elke cel testen.
6. **Frame & kruizen** (1–2 avonden, ± 4 u) — Lussen sluiten met de 17 lege buizen, haaks zetten, lijmen, kruizen erom klikken, staaf erin.
7. **Voet & controller** (2 avonden, ± 5 u) — Breadboard bedraden, OLED en GX16 inbouwen, controller solderen en dichtschroeven.
8. **Firmware & kalibratie** (1 avond, ± 1 u) — Uploaden, sticks kalibreren en spelen.

## Zo zit 4D in het object

Elke cel heeft vier coördinaten x, y, z, w (0 of 1). Celnummer = x + 2·y + 4·z + 8·w, net als in de app.

| As | Stick | Betekenis |
| --- | --- | --- |
| x | Linker stick ← → | 0 = links, 1 = rechts |
| y | Linker stick ↑ ↓ | 0 = boven, 1 = onder |
| z | Rechter stick ↑ ↓ | 0 = voor, 1 = achter (↑ = verder weg) |
| w | Rechter stick ← → | 0 = binnenkubus, 1 = buitenkubus |

Elke cel heeft vier buren (één per as). Een druk wisselt de cel en de vier buren. Voor de tesseract is de drukmatrix zijn eigen inverse: elke stand is oplosbaar en de oplossing is uniek.

## Te printen onderdelen

| Onderdeel | Aantal | Materiaal | Oriëntatie | Instellingen | Gewicht | Tijd* | Bestand |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Cel buitenkubus | 8 | PETG naturel/transparant (of PLA wit) | LED-opening naar beneden (zo staat de STL al) | 0,2 mm laag · 3 wanden · 100% infill · geen support | 169 g | 14.1 u | `stl/cel-buiten.stl` |
| Cel binnenkubus | 8 | PETG naturel/transparant (of PLA wit) | LED-opening naar boven (zo staat de STL al) | 0,2 mm laag · 3 wanden · 100% infill · geen support | 87 g | 7.3 u | `stl/cel-binnen.stl` |
| Dop buitencel | 8 | zelfde als de cellen | kraag op het bed | 0,2 mm · 100% infill | 7 g | 0.5 u | `stl/dop-buiten.stl` |
| Dop binnencel | 8 | zelfde als de cellen | kraag op het bed | 0,2 mm · 100% infill | 5 g | 0.4 u | `stl/dop-binnen.stl` |
| Buitenkruis | 1 | PETG zwart | plat, zoals de STL | 0,2 mm · 4 wanden · 40% infill · geen support | 48 g | 4.0 u | `stl/buitenkruis.stl` |
| Binnenkruis | 1 | PETG zwart | ondersteboven (kabelgoot op het bed) | 0,2 mm · 4 wanden · 40% infill · geen support | 26 g | 2.2 u | `stl/binnenkruis.stl` |
| Voet — behuizing | 1 | PETG zwart | ondersteboven (bovenkant op het bed) | 0,2 mm · 3 wanden · 20% gyroid · geen support · evt. 5 mm brim | 153 g | 12.7 u | `stl/voet-behuizing.stl` |
| Voet — bodemplaat | 1 | PETG zwart | plat | 0,2 mm · 3 wanden · 25% infill | 107 g | 8.9 u | `stl/voet-bodemplaat.stl` |
| Controller — onderschaal | 1 | PETG zwart | plat | 0,2 mm · 3 wanden · 20% infill | 28 g | 2.4 u | `stl/controller-onder.stl` |
| Controller — bovenschaal | 1 | PETG zwart | ondersteboven (bovenkant op het bed) | 0,2 mm · 3 wanden · 20% infill | 18 g | 1.5 u | `stl/controller-boven.stl` |
| Zaagmal | 1 | PETG/PLA, elke kleur | plat | 0,2 mm · 20% infill | 35 g | 2.9 u | `stl/zaagmal.stl` |

\* indicatie bij ± 12 g per uur.

- **Cel buitenkubus** — Doorschijnend blokje op een hoekpunt van de buitenkubus. In de holte zit de LED; 3 insteekgaten voor de ribben en een schuin gat voor de w-buis.
- **Cel binnenkubus** — Kleiner blokje voor de binnenkubus. Het schuine gat voor de w-buis wijst naar buiten.
- **Dop buitencel** — Sluit de LED-opening. De LED-module rust op de drie pennetjes, LED naar binnen gericht.
- **Dop binnencel** — Dop voor de kleinere binnencellen.
- **Buitenkruis** — Klikt met vier C-klemmen om de onderste ribben van de buitenkubus en klemt met een M3-bout op de staaf.
- **Binnenkruis** — Klikt om de onderste ribben van de binnenkubus; de staaf wordt erin gelijmd. Door de goot loopt de voedingskabel naar LED 0.
- **Voet — behuizing** — Bevat de staafkoker met anti-draairib, venster voor het OLED-scherm, gat voor de GX16-stekker en de USB-C-uitsparing.
- **Voet — bodemplaat** — Draagt het breadboard (kader), de zoemer en twee ballastvakken. Met 4× M3 verzonken aan de behuizing.
- **Controller — onderschaal** — Houdt de twee KY-023 joysticks in hoekgeleiders. Kabeldoorvoer met tie-wrap trekontlasting.
- **Controller — bovenschaal** — Klemt de joystick-printjes vast met pennen. Eén stip = linker stick (x/y), twee stippen = rechter stick (z/w).
- **Zaagmal** — Hulpmiddel: buis tegen de aanslag, zagen in de sleuf. Sleuven op 43,3 mm (1 stip), 69 mm (2), 140 mm (3) en staaf 126 mm (4).

## Inkooplijst

### Elektronica

| Aantal | Onderdeel | Prijs (indicatie) | Waar |
| --- | --- | --- | --- |
| 1 | Arduino Nano V3 (ATmega328P, CH340, USB-C, headers gesoldeerd) | € 7 | Tinytronics / AliExpress: 'Nano V3 Type-C' |
| 20 | WS2812B LED-module, rond printje Ø10 mm (1 pixel per printje) (16 + 4 reserve) | € 8 | AliExpress: 'WS2812B 10mm round PCB' / Tinytronics |
| 2 | KY-023 analoge joystickmodule (PS2-stijl, met drukknop) | € 4 | Tinytronics / AliExpress: 'KY-023' |
| 1 | OLED 0,96" SSD1306 128×64, I²C, 4 pinnen (optioneel) | € 4 | Tinytronics / AliExpress |
| 1 | Passieve zoemer 12 mm (piëzo) (optioneel) | € 0,50 | Tinytronics: 'passieve buzzer' |
| 1 | GX16-8 luchtvaartconnector, set stekker + chassisdeel | € 3 | AliExpress / Amazon: 'GX16 8 pin' |
| 1 | Half breadboard 400 punten (82×55 mm, plakstrip) | € 3 | Tinytronics |
| 1 | Dupont jumperdraden (M-M, M-F), set | € 4 | Tinytronics / Action |
| 1 | Weerstand 330 Ω ¼ W | € 0,10 | Tinytronics |
| 1 | Elco 1000 µF / 10 V | € 0,30 | Tinytronics |
| 1 | Siliconen draad 26 AWG — rood, zwart, geel (± 4 m per kleur) | € 8 | Tinytronics / AliExpress |
| 1 | Netwerkkabel Cat5e/6, ≥ 1,5 m (8 aders, voor de controller) | € 2 | Action / oude kabel |
| 1 | JST-SM 3-pins stekkerpaar (optioneel: tesseract afneembaar) | € 1 | AliExpress: 'JST SM 3 pin' |
| 1 | Krimpkous-assortiment | € 4 | Action / Gamma |
| 1 | USB-C datakabel + 5 V USB-lader (≥ 1 A) of powerbank (meestal al in huis) | — | — |

### Metaal & bevestiging

| Aantal | Onderdeel | Prijs (indicatie) | Waar |
| --- | --- | --- | --- |
| 3 | Aluminium ronde buis 8 × 1 mm, lengte 1 m | € 12 | Gamma / Praxis / Hornbach |
| 1 | Aluminium ronde buis 12 × 1 mm, lengte 0,5–1 m | € 5 | Gamma / Praxis / Hornbach |
| 4 | M3 inzetmoeren (heat-set, M3 × 5,7) | € 3 | AliExpress / Tinytronics |
| 4 | M3 × 10 verzonken bout | € 1 | Gamma (assortimentsdoos) |
| 6 | M3 × 16 bolkop/cilinderkop bout (5 controller + 1 klem buitenkruis) | € 1 | Gamma |
| 1 | M3 moer | € 0,10 | Gamma |
| 4 | Rubber voetjes Ø12 mm, zelfklevend | € 2 | Action / Gamma |
| 1 | Ballast: ± 300 g stalen sluitringen (M10/M12) of vislood | € 3 | Gamma / hengelsport |
| 1 | Kleine tie-wrap | — | — |

### Lijm

| Aantal | Onderdeel | Prijs (indicatie) | Waar |
| --- | --- | --- | --- |
| 1 | 2-componentenlijm (epoxy, 5 minuten) | € 5 | Gamma / Action |
| 1 | Secondelijm, medium | € 3 | Gamma / Action |

### Filament

| Aantal | Onderdeel | Prijs (indicatie) | Waar |
| --- | --- | --- | --- |
| 1 | PETG zwart (± 400 g nodig) (spoel 1 kg) | € 20 | Prusament / Elegoo / Bambu |
| 1 | PETG naturel/transparant (± 270 g nodig) (spoel 1 kg, of PLA wit) | € 20 | Prusament / Elegoo / Bambu |

**Totaal ± € 124**

## Gereedschap

- 3D-printer met bed van minstens 200 × 200 mm (voet en buitenkruis zijn 190 en 174 mm)
- Soldeerbout (± 330 °C) met fijne punt, soldeertin met flux, derde hand
- Afstriptang, zijkniptang, pincet
- Pijpsnijder (aanrader) of ijzerzaag + de geprinte zaagmal, vijl of ontbramer
- Boormachine met Ø5 mm boor (voedingsgat) en een Ø8 mm boor om gaten met de hand na te ruimen
- Schuifmaat, multimeter, lijmpistool, markeerstift en schilderstape
- Inbussleutel/schroevendraaier voor M3, soldeerbout-opzetstuk of gewone punt voor de inzetmoeren
- Computer met Arduino IDE 2 en een USB-C datakabel

## Zaagplan

| Aantal | Lengte | Wat | Materiaal | Opmerking |
| --- | --- | --- | --- | --- |
| 12 | 140 mm | Ribbe buitenkubus | Al 8 × 1 mm |  |
| 12 | 69 mm | Ribbe binnenkubus | Al 8 × 1 mm | één ervan wordt buis V: Ø5 mm gat precies in het midden |
| 8 | 43,3 mm | w-ribbe (binnen ↔ buiten) | Al 8 × 1 mm |  |
| 1 | 126 mm | Staaf | Al 12 × 1 mm | sleuf 4 × 8 mm aan de onderkant |

| Staaf | Stukken |
| --- | --- |
| Staaf 1 (8 × 1, 1 m) | 6 × 140 mm + 2 × 69 mm |
| Staaf 2 (8 × 1, 1 m) | 6 × 140 mm + 2 × 69 mm |
| Staaf 3 (8 × 1, 1 m) | 8 × 69 mm + 8 × 43,3 mm |
| Staaf 4 (12 × 1) | 1 × 126 mm |

## Draden (ketting)

Per segment drie siliconen aders 26 AWG: **rood = 5V, zwart = GND, geel = DATA**, 50 mm extra per kant.

| Segment | Van → naar | Buis | Draadlengte |
| --- | --- | --- | --- |
| S1 | LED 0 (cel 2) → LED 1 (cel 3) | binnenribbe 69 mm (buis V) | 170 mm |
| S2 | LED 1 (cel 3) → LED 2 (cel 1) | binnenribbe 69 mm | 170 mm |
| S3 | LED 2 (cel 1) → LED 3 (cel 0) | binnenribbe 69 mm | 170 mm |
| S4 | LED 3 (cel 0) → LED 4 (cel 4) | binnenribbe 69 mm | 170 mm |
| S5 | LED 4 (cel 4) → LED 5 (cel 5) | binnenribbe 69 mm | 170 mm |
| S6 | LED 5 (cel 5) → LED 6 (cel 7) | binnenribbe 69 mm | 170 mm |
| S7 | LED 6 (cel 7) → LED 7 (cel 6) | binnenribbe 69 mm | 170 mm |
| S8 | LED 7 (cel 6) → LED 8 (cel 14) | w-ribbe 43,3 mm | 145 mm |
| S9 | LED 8 (cel 14) → LED 9 (cel 15) | buitenribbe 140 mm | 240 mm |
| S10 | LED 9 (cel 15) → LED 10 (cel 13) | buitenribbe 140 mm | 240 mm |
| S11 | LED 10 (cel 13) → LED 11 (cel 12) | buitenribbe 140 mm | 240 mm |
| S12 | LED 11 (cel 12) → LED 12 (cel 8) | buitenribbe 140 mm | 240 mm |
| S13 | LED 12 (cel 8) → LED 13 (cel 9) | buitenribbe 140 mm | 240 mm |
| S14 | LED 13 (cel 9) → LED 14 (cel 11) | buitenribbe 140 mm | 240 mm |
| S15 | LED 14 (cel 11) → LED 15 (cel 10) | buitenribbe 140 mm | 240 mm |
| V | breadboard → LED 0 (via staaf en binnenkruis) | — | 550 mm |

## Bouwstappen

### 1. Het plan in één oogopslag

*Fase: Bestellen*

Je bouwt de 2×2×2×2 Lichtjes-puzzel uit de 4d-puzzels app als echt object: 16 lichtgevende blokjes op de hoekpunten van een binnen- en een buitenkubus (de tesseract-weergave), gedragen door één staaf op een voet. Twee duimsticks kiezen de cel, indrukken = drukken.

**Doen**

1. Draai rond het model (slepen), zoom (scrollen) en klik op onderdelen om te zien wat het is.
2. Bekijk het tabblad Onderdelen voor de inkooplijst en zet je bestelling uit — levertijd uit China is 1–3 weken.
3. Lees deze stappen één keer helemaal door voordat je begint: de volgorde van stap 8 t/m 14 is belangrijk.

**Controle**

- [ ] Totale hoogte ± 283 mm, voet 190 × 190 mm.
- [ ] Kosten ± € 124 (zonder gereedschap en printer).

### 2. Eerst virtueel testen: hier én in Wokwi

*Fase: Virtueel testen*

De simulatie in deze werkplaats gebruikt exact dezelfde spelregels, drempels en LED-standen als de Arduino-code. In Wokwi draait de échte firmware op een gesimuleerde Nano.

**Doen**

1. Tabblad Spelen: speel een paar puzzels met toetsenbord, de knoppen op het scherm of een echte PlayStation-controller (USB/Bluetooth).
2. Ga naar wokwi.com → New Project → Arduino Nano. Plak de inhoud van wokwi/sketch.ino, wokwi/diagram.json en wokwi/libraries.txt in de gelijknamige tabbladen.
3. Druk op ▶. Je ziet de LED-test (0 → 15), daarna een puzzel. Beweeg de joysticks, klik erop, open de seriële monitor voor het tekstbord.

**Controle**

- [ ] Na een stick-klik wisselen 5 lampjes (cel + 4 buren).
- [ ] Alle lampjes uit → 'OPGELOST!' en een melodietje.

### 3. Printen: 16 cellen en 16 doppen

*Fase: Printen*

De cellen bepalen hoe mooi het licht wordt. Print ze in doorschijnend PETG (naturel) of wit PLA, met 100% infill zodat het licht egaal verstrooit.

**Doen**

1. Open stl/cel-buiten.stl en stl/cel-binnen.stl in je slicer. Ze staan al in de juiste oriëntatie (geen support nodig).
2. Instellingen: 0,2 mm laaghoogte, 3 wanden, 100% infill (rechtlijnig), PETG ± 235 °C / bed 80 °C.
3. Print 8 buitencellen en 8 binnencellen (bv. 4 tegelijk), plus 8 + 8 doppen (stl/dop-*.stl, kraag op het bed).
4. Ruim alle insteekgaten na met een Ø8 mm boor in je hand (niet in de boormachine): de buis moet er strak maar zonder kracht in schuiven.

**Controle**

- [ ] Een 8 mm buis schuift in elk gat tot in de holte.
- [ ] De dop klikt vlak in de verzinking en is er met een naald weer uit te wippen.

**Let op**

- ⚠️ Gebruik een lijmstift op het bed bij PETG om te voorkomen dat het te hard hecht.
- ⚠️ Kleine 'haartjes' (stringing) in de holte met een aansteker of föhn kort wegsmelten.

### 4. Printen: voet, kruizen, controller en zaagmal

*Fase: Printen*

Alle zwarte delen in PETG. De STL's liggen al in printoriëntatie; nergens support nodig.

**Doen**

1. voet-behuizing.stl (ondersteboven, 20% gyroid) — de grootste print, ± 190 × 190 mm. Gebruik een brim als je printer last heeft van kromtrekken.
2. voet-bodemplaat.stl (plat), buitenkruis.stl (plat), binnenkruis.stl (ondersteboven).
3. controller-onder.stl en controller-boven.stl; zaagmal.stl in een opvallende kleur.
4. Controleer of de C-klemmen van de kruizen over een stukje buis klikken. Te strak? Met een mesje de invoerschuinte iets verruimen.

**Controle**

- [ ] De 12 mm staaf schuift door het buitenkruis en 14 mm diep in het binnenkruis.
- [ ] Een M3-moer past in de sleuf van het buitenkruis.

### 5. Buizen zagen, ontbramen en boren

*Fase: Zagen & boren*

Alle 32 ribben zijn aluminium buis 8 × 1 mm; de staaf is 12 × 1 mm. Maten zijn tot op 0,5 mm belangrijk, anders worden de kubussen scheef.

**Doen**

1. Leg de buis in de zaagmal tegen de aanslag en zaag in de sleuf: 12 × 140 mm, 12 × 69 mm, 8 × 43,3 mm. Zaagplan: zie Onderdelen.
2. Staaf: 1 × 126 mm uit de 12 mm buis. Zaag onderaan een sleuf van 4 mm breed en 8 mm diep (twee zaagsneden, lipje eruit buigen, vijlen).
3. Ontbraam alle uiteinden binnen én buiten — scherpe randen snijden anders door de isolatie van de draden.
4. Kies één binnenribbe (69 mm) als buis V (voeding): boor precies in het midden (34,5 mm) een gat van Ø5 mm dwars door één wand. Goed ontbramen en markeren met tape.
5. Leg de buizen per soort op een rij en tel na: 12 + 12 + 8 + staaf.

**Controle**

- [ ] Alle buizen van één soort zijn even lang (± 0,3 mm).
- [ ] Er steekt nergens een braam uit (draai een wattenstaafje rond in de buis: blijft er niets aan haken?).

**Let op**

- ⚠️ Een pijpsnijder geeft rechtere, schonere sneden dan een zaag. Zet hem op de streep die je met de zaagmal hebt afgetekend.

### 6. LED-modules testen en de proefopstelling

*Fase: Ketting bouwen*

Test elke WS2812B-module vóór hij in een cel verdwijnt. Dat scheelt later veel zoekwerk.

**Doen**

1. Zet de Nano op het breadboard (rij 1–15, kolom c en g, USB-C aan de kant van rij 1) en upload de firmware (zie stap 18).
2. Soldeer aan één module tijdelijk drie draadjes aan DIN, 5V en GND (de pijl op het printje wijst van DIN naar DOUT).
3. Sluit aan: 5V → + rail, GND → − rail, DIN → via 330 Ω op D6. Bij het opstarten licht LED 0 even fel op (de ketting-test).
4. Herhaal voor alle 16 (+ reserve) modules. Markeer slechte exemplaren.

**Controle**

- [ ] Elke module licht warmgeel op tijdens de opstarttest.

**Let op**

- ⚠️ Zet een elco van 1000 µF over de + en − rail, met de min-streep naar de − rail.

### 7. Draadstukken knippen en labelen

*Fase: Ketting bouwen*

De 16 LED's vormen één ketting die langs 15 ribben loopt (Gray-code: elke stap wisselt precies één coördinaat). Elk stuk ketting = 3 aders: rood 5V, zwart GND, geel DATA.

**Doen**

1. Draai voor elk segment drie siliconen draden (rood, zwart, geel) losjes in elkaar en knip ze op lengte:
2. S1: LED 0 (cel 2) → LED 1 (cel 3), binnenribbe 69 mm, draad 170 mm
3. S2: LED 1 (cel 3) → LED 2 (cel 1), binnenribbe 69 mm, draad 170 mm
4. S3: LED 2 (cel 1) → LED 3 (cel 0), binnenribbe 69 mm, draad 170 mm
5. S4: LED 3 (cel 0) → LED 4 (cel 4), binnenribbe 69 mm, draad 170 mm
6. S5: LED 4 (cel 4) → LED 5 (cel 5), binnenribbe 69 mm, draad 170 mm
7. S6: LED 5 (cel 5) → LED 6 (cel 7), binnenribbe 69 mm, draad 170 mm
8. S7: LED 6 (cel 7) → LED 7 (cel 6), binnenribbe 69 mm, draad 170 mm
9. S8: LED 7 (cel 6) → LED 8 (cel 14), w-ribbe 43,3 mm, draad 145 mm
10. S9: LED 8 (cel 14) → LED 9 (cel 15), buitenribbe 140 mm, draad 240 mm
11. S10: LED 9 (cel 15) → LED 10 (cel 13), buitenribbe 140 mm, draad 240 mm
12. S11: LED 10 (cel 13) → LED 11 (cel 12), buitenribbe 140 mm, draad 240 mm
13. S12: LED 11 (cel 12) → LED 12 (cel 8), buitenribbe 140 mm, draad 240 mm
14. S13: LED 12 (cel 8) → LED 13 (cel 9), buitenribbe 140 mm, draad 240 mm
15. S14: LED 13 (cel 9) → LED 14 (cel 11), buitenribbe 140 mm, draad 240 mm
16. S15: LED 14 (cel 11) → LED 15 (cel 10), buitenribbe 140 mm, draad 240 mm
17. Voedingskabel (V): 550 mm, van het breadboard via de staaf en de goot van het binnenkruis naar LED 0.
18. Label elk segment aan beide kanten met tape (S1, S2, …) en strip 4 mm af.

**Controle**

- [ ] 15 segmenten + 1 voedingskabel, gelabeld.

### 8. Ketting deel 1: binnenkubus (LED 0 – 7)

*Fase: Ketting bouwen*

Je bouwt de binnenkubus langs de ketting: cel na cel, buis na buis. De buizen gaan nog niet vast — alles wordt eerst 'droog' gemonteerd en getest.

**Doen**

1. LED 0 = cel 2 (binnen · links · onder · voor). Steek buis V (gat naar achteren/binnen gericht) in het x-gat van cel 2. Duw de voedingskabel van buiten door het Ø5-gat en door buis V naar cel 2; laat de rest uit het gat hangen.
2. Schuif segment S1 door buis V vanaf cel 2 naar het andere eind. Trek bij cel 2 de voedingskabel en S1 door de LED-opening naar buiten.
3. Soldeer de voedingskabel aan DIN/5V/GND en S1 aan DOUT/5V/GND van een LED-module. Krimpkous of een druppel hete lijm over de soldeerpunten.
4. Duw de module met de draden terug in de holte, LED naar binnen gericht. Doppen pas na de kettingtest plaatsen.
5. Zet cel 3 (LED 1) op het andere eind van buis V, trek S1 erin en naar buiten, schuif S2 door de buis naar de volgende cel, soldeer, terugduwen.
6. Herhaal langs de ketting: cel 2 → 3 → 1 → 0 → 4 → 5 → 7 → 6. Elke buis gaat zo ver in de cel dat het uiteinde gelijk ligt met de binnenwand van de holte (kijk met een zaklamp door de opening).

**Controle**

- [ ] Na elke cel: voedingskabel op het breadboard, Nano aan → alle LED's tot nu toe lichten op tijdens de opstarttest.

**Let op**

- ⚠️ De holte is krap: houd de draden in de cel kort (± 4 cm) en plooi ze als een harmonica.
- ⚠️ Let goed op DIN versus DOUT. Omgedraaid = de ketting stopt bij die LED.

### 9. Ketting deel 2: w-ribbe en buitenkubus (LED 8 – 15)

*Fase: Ketting bouwen*

Vanaf cel 6 (binnen · links · onder · achter) springt de ketting via één w-ribbe naar de buitenkubus.

**Doen**

1. Schuif S8 door een w-ribbe (43,3 mm). Steek die in het schuine gat van cel 6 (wijst naar buiten) en zet cel 14 (buiten · links · onder · achter) erop.
2. Soldeer LED 8 in cel 14 en ga verder langs de buitenkubus: 14 → 15 → 13 → 12 → 8 → 9 → 11 → 10.
3. De buitenribben zijn 140 mm; ze steken 5 mm in elke cel (gelijk met de binnenwand van de holte).
4. LED 15 (cel 10) heeft alleen een ingang: DOUT blijft leeg.

**Controle**

- [ ] De hele ketting hangt nu als een slinger aan elkaar: 16 cellen, 15 buizen.

### 10. Kettingtest: alle 16 LED's

*Fase: Ketting bouwen*

Nu de hele ketting bestaat: test hem in één keer voordat er iets gelijmd wordt.

**Doen**

1. Sluit de voedingskabel aan op het breadboard (geel → i20 achter de 330 Ω, rood → +, zwart → −) en start de Nano.
2. Tijdens de opstarttest lichten LED 0 → 15 één voor één fel op en blijven half branden. In de seriële monitor zie je het bord.
3. Speel even via de seriële monitor (a/d, w/s, i/k, j/l, spatie) en kijk of de juiste cellen reageren.
4. Druk nu pas de doppen in de cellen (LED-module rust op de drie pennetjes).

**Controle**

- [ ] Stopt de ketting bij LED n? Dan zit de fout bij DOUT van LED n−1 of DIN van LED n (of een braam heeft de draad beschadigd).

### 11. Lussen sluiten: de 17 lege buizen

*Fase: Frame & kruizen*

De ketting gebruikt 15 van de 32 ribben. De overige 17 zijn alleen constructie. Dankzij de doorlopende gaten (tot in de holte) kun je ze tussen twee vaste cellen plaatsen.

**Doen**

1. Schuif een lege buis eerst helemaal door in cel A (tot in de holte, zo'n 6 mm extra), breng hem in lijn met cel B en schuif hem terug tot hij in beide cellen 5 mm insteekt.
2. Plaats zo de 5 ontbrekende binnenribben, 7 w-ribben en 5 buitenribben (zie de oplichtende buizen).
3. Controleer of de kubussen haaks staan: de diagonaal van elk zijvlak (hart tot hart van de cellen) is buiten 226 mm en binnen 119 mm.

**Controle**

- [ ] Alle 32 ribben zitten erin, niets wiebelt meer veel.
- [ ] De binnenkubus zit precies in het midden van de buitenkubus.

**Let op**

- ⚠️ Een liniaal of winkelhaak op de werkbank helpt om de onderkant vlak te zetten.

### 12. Haaks zetten en lijmen

*Fase: Frame & kruizen*

Pas na de geslaagde kettingtest wordt er gelijmd.

**Doen**

1. Zet de tesseract met de onderkant van de buitenkubus op een vlakke plaat. Meet de diagonalen nog één keer.
2. Laat bij elke insteekverbinding (64 stuks) een druppel medium secondelijm in de spleet lopen. Doe eerst de buitenkubus, dan de w-ribben, dan de binnenkubus.
3. Voor extra sterkte: de 8 w-ribben met 5-minuten epoxy (tandenstoker).
4. Een uur laten uitharden.

**Controle**

- [ ] Niets verschuift meer als je de tesseract voorzichtig aan de buitenkubus optilt.

**Let op**

- ⚠️ Secondelijm geeft witte waas op doorschijnend PETG: weinig lijm, en eventueel tape op de cellen rond de gaten.

### 13. Kruizen om de onderste ribben klikken

*Fase: Frame & kruizen*

Twee kruizen verbinden de kubussen met de staaf. Ze klikken met C-klemmen om het midden van de onderste ribben.

**Doen**

1. Binnenkruis: kabelgoot naar boven, de arm met de goot naar vóren. Druk de vier klemmen van onderen om de vier onderste binnenribben — de voorste klem precies over het Ø5-gat van buis V.
2. Leg de voedingskabel vanuit het gat in de goot en duw hem door het gaatje in het midden naar beneden, het staafgat in.
3. Buitenkruis: moersleuf naar boven. Klik het van onderen om de vier onderste buitenribben. Steek een M3-moer in de sleuf.

**Controle**

- [ ] Beide kruizen zitten midden onder hun kubus en de naven staan recht boven elkaar.

### 14. De staaf plaatsen

*Fase: Frame & kruizen*

De staaf (126 mm) loopt van de voet door het buitenkruis tot in het binnenkruis.

**Doen**

1. Steek de voedingskabel van boven door de staaf en trek hem er onderaan (bij de sleuf) uit.
2. Schuif de staaf van onderen door het buitenkruis en 14 mm diep in de naaf van het binnenkruis, met een beetje epoxy. De sleuf onderaan wijst naar LINKS (−x) als de voorkant van de tesseract naar je toe staat.
3. Draai de M3 × 16 bout in het buitenkruis vast tegen de staaf (niet te hard: de buis is maar 1 mm dik).

**Controle**

- [ ] Van onderkant staaf tot hart van het buitenkruis: 94 mm.

### 15. De voet: elektronica inbouwen en bedraden

*Fase: Voet & controller*

Alles in de voet zit op een half breadboard: geen printplaat nodig en je kunt later makkelijk iets veranderen.

**Doen**

1. Druk met de soldeerbout (± 220 °C) de 4 M3-inzetmoeren in de hoekbussen van de behuizing.
2. OLED: schuif het schermpje (glas naar voren, pinnen boven) tussen de geleiders achter het venster en zet het vast met een druppel hete lijm.
3. GX16-8 chassisdeel door het ronde gat in de voorwand, moer van binnen vast. Soldeer 8 Dupont-draden aan de soldeercups volgens de pintabel (tabblad Elektronica).
4. Plak het breadboard in het kader op de bodemplaat (rij 1 bij de achterwand), zet de zoemer in de houder en de ballast in de twee vakken (vastzetten met hete lijm).
5. Bedraad het breadboard precies volgens de tabel 'Breadboard' in het tabblad Elektronica (21 verbindingen).

**Controle**

- [ ] Zonder tesseract aangesloten: Nano aan → OLED toont het startscherm, de controller (stap 17) beweegt de cursor op het kaartje.

**Let op**

- ⚠️ Gebruik korte jumperdraden; lange lussen zitten straks in de weg bij het sluiten.

### 16. Tesseract op de voet en dichtschroeven

*Fase: Voet & controller*

De staaf staat los in de koker en wordt tegen draaien vastgehouden door de rib in de sleuf.

**Doen**

1. Leid de voedingskabel van boven door de staafkoker en via het zijvenster naar het breadboard (eventueel via het JST-SM stekkertje).
2. Zet de staaf in de koker: draai tot de sleuf over de rib valt. De tesseract staat nu recht vooruit.
3. Sluit de voedingskabel aan (geel i20, rood +, zwart −), leg de bodemplaat eronder (USB-C van de Nano bij de uitsparing in de achterwand) en schroef dicht met 4× M3 × 10 verzonken.
4. Plak de 4 rubber voetjes in de verdiepingen.

**Controle**

- [ ] De USB-C-stekker gaat vanaf de achterkant in de Nano.

### 17. De controller

*Fase: Voet & controller*

Een eenvoudige 'PlayStation'-controller met twee duimsticks, via een 8-aderige kabel en GX16-stekker aan de voet.

**Doen**

1. Strip de netwerkkabel aan beide kanten 6 cm. Controller-kant: 5V (oranje) en GND (bruin) splitsen naar beide joysticks.
2. Linker joystick: VRx → wit-groen, VRy → groen, SW → wit-oranje. Rechter: VRx → wit-blauw, VRy → blauw, SW → wit-bruin. Met Dupont-stekkertjes of direct gesoldeerd.
3. Leg de KY-023's in de hoekgeleiders van de onderschaal, pinnen naar het midden. Kabel door het gat achter, tie-wrap om de twee paaltjes.
4. Bovenschaal erop (stippen: 1 = links, 2 = rechts), 5× M3 × 16 van onderen.
5. Voet-kant: soldeer de 8 aders aan de GX16-8 stekker volgens de pintabel en schroef de huls dicht.

**Controle**

- [ ] Doorpiepen met de multimeter: elke GX16-pin komt uit bij de juiste joystickpin.

**Let op**

- ⚠️ Meet je KY-023 na: wijkt de printplaat af van 34 × 26 mm, pas dan 'joyPcb' aan in cad/design.mjs en draai npm run stl.

### 18. Firmware uploaden

*Fase: Firmware & kalibratie*

De firmware staat in firmware/lichtjes4d/lichtjes4d.ino.

**Doen**

1. Arduino IDE 2 → Bibliotheekbeheer: installeer 'Adafruit NeoPixel' en 'Adafruit SSD1306' (accepteer 'Adafruit GFX Library' en 'Adafruit BusIO').
2. Open lichtjes4d.ino. Hulpmiddelen → Board: Arduino Nano. Processor: ATmega328P (Old Bootloader) bij de meeste klonen. Poort: de COM-poort van de Nano (CH340-driver nodig als hij niet verschijnt).
3. Uploaden. Open de seriële monitor op 115200 baud om het bord en de hulp te zien.

**Controle**

- [ ] Na het uploaden: LED-test 0 → 15, daarna verschijnt een puzzel.

### 19. Sticks kalibreren

*Fase: Firmware & kalibratie*

Elke joystickmodule is anders gemonteerd. De kalibratie stelt vast welke draad welke richting is en bewaart dat in het EEPROM.

**Doen**

1. Houd beide sticks ingedrukt en steek de USB-C-kabel in (of druk op reset).
2. Laat los. Volg het schermpje: 'LINKS >' (duw links naar rechts), 'LINKS ^' (links omhoog), 'RECHTS ^', 'RECHTS >'. Steeds ver duwen en loslaten.
3. De LED's laten zien welke kant bedoeld is. Na stap 4 hoor je een melodietje: klaar.

**Controle**

- [ ] Linker stick naar rechts → cursor naar rechts; rechter stick naar rechts → naar de buitenkubus.

### 20. Spelen!

*Fase: Firmware & kalibratie*

Zet alle lampjes uit. Elke druk wisselt de gekozen cel en zijn vier buren — in elke richting x, y, z en w precies één.

**Doen**

1. Kort indrukken = drukken. Eén stick 0,8 s vasthouden = hint. Beide sticks 1,5 s = nieuwe puzzel.
2. Na elke oplossing gaat het level omhoog: level 1 is 3 drukken (zoals 'Tesseract' in de app), level 8 is 10 drukken.
3. Elke stand is oplosbaar en de oplossing is uniek: twee keer op dezelfde cel drukken heft zichzelf op.

**Controle**

- [ ] Veel plezier — en laat iemand die nog nooit van 4D heeft gehoord het eens proberen.

## Elektronica

### Pinnen van de Nano

| Pin | Functie |
| --- | --- |
| D6 | LED-data → 330 Ω → DIN van LED 0 |
| D2 | linker stick indrukken (SW, interne pull-up) |
| D3 | rechter stick indrukken (SW, interne pull-up) |
| A0 / A1 | linker stick X / Y |
| A2 / A3 | rechter stick X (→ w) / Y (→ z) |
| A4 / A5 | OLED SDA / SCL (I²C 0x3C) |
| D9 | passieve zoemer |
| 5V / GND | + en − rail |

### Breadboard, verbinding voor verbinding

Nano in rij 1–15, pinnen in kolom **c** (D13, 3V3, REF, A0…A7, 5V, RST, GND, VIN) en **g** (D12…D2, GND, RST, RX0, TX1). USB-C bij rij 1, tegen de achterwand. Controleer de opdruk op jouw Nano.

| # | Van | Naar | Waarvoor |
| --- | --- | --- | --- |
| 1 | Nano 5V (c12) | + rail (rij 12) | 5V naar de plus-rail |
| 2 | Nano GND (c14) | − rail (rij 14) | GND naar de min-rail |
| 3 | D6 (h7) | weerstand 330 Ω → h20 | LED-data via 330 Ω |
| 4 | i20 | LED-kabel geel (DATA) | data naar LED 0 |
| 5 | + rail (rij 22) | LED-kabel rood (5V) | voeding LED's |
| 6 | − rail (rij 22) | LED-kabel zwart (GND) | massa LED's |
| 7 | + rail (rij 25) | elco 1000 µF (+) | buffercondensator over de voeding |
| 8 | A0 (a4) | GX16 pin 3 | linker stick X |
| 9 | A1 (a5) | GX16 pin 4 | linker stick Y |
| 10 | A2 (a6) | GX16 pin 6 | rechter stick X |
| 11 | A3 (a7) | GX16 pin 7 | rechter stick Y |
| 12 | D2 (h11) | GX16 pin 5 | linker stick indrukken |
| 13 | D3 (h10) | GX16 pin 8 | rechter stick indrukken |
| 14 | + rail (rij 28) | GX16 pin 1 | 5V naar controller |
| 15 | − rail (rij 28) | GX16 pin 2 | GND naar controller |
| 16 | A4 (a8) | OLED SDA | I²C data scherm |
| 17 | A5 (a9) | OLED SCL | I²C klok scherm |
| 18 | + rail (rij 3) | OLED VCC | voeding scherm |
| 19 | − rail (rij 3) | OLED GND | massa scherm |
| 20 | D9 (h4) | buzzer + | piëzo-zoemer |
| 21 | − rail (rij 18) | buzzer − | massa zoemer |

### GX16-8 en controllerkabel (Cat5, T568B-kleuren)

| Pin | Kleur | Signaal | Nano |
| --- | --- | --- | --- |
| 1 | oranje | 5V | 5V (+ rail) |
| 2 | bruin | GND | GND (− rail) |
| 3 | wit-groen | Links X | A0 |
| 4 | groen | Links Y | A1 |
| 5 | wit-oranje | Links druk (SW) | D2 |
| 6 | wit-blauw | Rechts X | A2 |
| 7 | blauw | Rechts Y | A3 |
| 8 | wit-bruin | Rechts druk (SW) | D3 |

### LED-ketting

| LED | Cel | Coördinaten | Plek |
| --- | --- | --- | --- |
| 0 | 2 | x0 y1 z0 w0 | links · onder · voor · binnen |
| 1 | 3 | x1 y1 z0 w0 | rechts · onder · voor · binnen |
| 2 | 1 | x1 y0 z0 w0 | rechts · boven · voor · binnen |
| 3 | 0 | x0 y0 z0 w0 | links · boven · voor · binnen |
| 4 | 4 | x0 y0 z1 w0 | links · boven · achter · binnen |
| 5 | 5 | x1 y0 z1 w0 | rechts · boven · achter · binnen |
| 6 | 7 | x1 y1 z1 w0 | rechts · onder · achter · binnen |
| 7 | 6 | x0 y1 z1 w0 | links · onder · achter · binnen |
| 8 | 14 | x0 y1 z1 w1 | links · onder · achter · buiten |
| 9 | 15 | x1 y1 z1 w1 | rechts · onder · achter · buiten |
| 10 | 13 | x1 y0 z1 w1 | rechts · boven · achter · buiten |
| 11 | 12 | x0 y0 z1 w1 | links · boven · achter · buiten |
| 12 | 8 | x0 y0 z0 w1 | links · boven · voor · buiten |
| 13 | 9 | x1 y0 z0 w1 | rechts · boven · voor · buiten |
| 14 | 11 | x1 y1 z0 w1 | rechts · onder · voor · buiten |
| 15 | 10 | x0 y1 z0 w1 | links · onder · voor · buiten |

### Stroombudget

Per LED max. ± 28 mA (warmgeel, helderheid begrensd op 160/255). Tijdens spelen ± 75 mA, win-animatie < 200 mA: een USB-lader of powerbank volstaat.

## Firmware

- Code: `firmware/lichtjes4d/lichtjes4d.ino`
- Bibliotheken: Adafruit NeoPixel, Adafruit SSD1306 (+ Adafruit GFX Library, Adafruit BusIO)
- Board: Arduino Nano, processor *ATmega328P (Old Bootloader)* bij de meeste klonen
- Seriële monitor 115200 baud: `a/d` x · `w/s` y · `i/k` z · `j/l` w · spatie = druk · `h` hint · `n` nieuw · `r` opnieuw · `c` bord
- Kalibratie: houd beide sticks ingedrukt tijdens het aanzetten en volg het schermpje (LINKS >, LINKS ^, RECHTS ^, RECHTS >).

### Wokwi

Nieuw Arduino Nano-project op wokwi.com → plak `wokwi/sketch.ino`, `wokwi/diagram.json` en `wokwi/libraries.txt` → ▶.

## Zelf aanpassen

Alle maten staan in `cad/design.mjs`. Na een wijziging: `npm install` (eenmalig) en `npm run build` — dat maakt opnieuw de STL's, de 3D-werkplaats, het Wokwi-project en deze handleiding. `npm test` controleert de spellogica en de maten.
