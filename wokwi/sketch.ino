/*
  ============================================================================
   LICHTJES 4D  —  de 2×2×2×2 "Lichtjes"-puzzel (Lights Out) als echt object
  ============================================================================
   Project : https://github.com/janpieterbaalder/lichtjes-4d-model
   Board   : Arduino Nano (ATmega328P). Bij een kloon met oude bootloader:
             Extra > Processor > "ATmega328P (Old Bootloader)".
   Libraries (Bibliotheekbeheer):  Adafruit NeoPixel, Adafruit SSD1306, Adafruit GFX Library

   SPEL
   - 16 cellen op de hoekpunten van twee kubussen (binnen- en buitenkubus = tesseract).
   - Doel: zet alle lampjes UIT.
   - Druk op een stick: de gekozen cel én zijn 4 buren (één per as x, y, z, w) wisselen.

   BEDIENING (twee PlayStation-achtige duimsticks)
   - Linker stick  ← →  : x  (links / rechts)
   - Linker stick  ↑ ↓  : y  (boven / onder)
   - Rechter stick ↑ ↓  : z  (achter / voor)
   - Rechter stick ← →  : w  (binnenkubus / buitenkubus)
   - Stick kort indrukken           : drukken op de gekozen cel
   - Eén stick 0,8 s vasthouden     : hint (cursor springt naar een cel die je moet drukken)
   - Beide sticks 1,5 s vasthouden  : nieuwe puzzel
   - Beide sticks vasthouden tijdens aanzetten : kalibratie van de sticks (wordt bewaard)

   LEDS
   - uit = uit, aan = middel, gekozen cel = fel. Is de gekozen cel uit, dan 'ademt' hij
     (zie CURSOR_STYLE), zodat je altijd ziet of hij aan of uit staat.

   SERIËLE MONITOR (115200 baud) — handig om te testen zonder sticks:
     a/d = x   w/s = y   i/k = z (achter/voor)   j/l = w (binnen/buiten)
     spatie = druk   h = hint   n = nieuw   r = opnieuw   c = toon bord   ? = help
  ============================================================================
*/

#include <Adafruit_NeoPixel.h>
#include <EEPROM.h>

/* ------------------------------------------------------------------ INSTELLINGEN */
#define USE_OLED 1       // 0 = zonder OLED-schermpje
#define USE_BUZZER 1     // 0 = zonder zoemer
#define CURSOR_STYLE 1   // 0 = gekozen cel altijd fel   1 = fel als aan, ademend als uit
#define NEIGHBOR_RULE 1  // 1 = Lichtjes (cel + 4 buren)  0 = alleen de cel zelf (oefenen)

#if USE_OLED
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#endif

// Pinnen (zie hardware/bedrading in het project)
const uint8_t PIN_LEDS = 6;    // data naar LED 0 (via 330 Ω)
const uint8_t PIN_BUZZER = 9;  // passieve zoemer
const uint8_t PIN_SW_L = 2;    // linker stick indrukken (SW)
const uint8_t PIN_SW_R = 3;    // rechter stick indrukken (SW)
const uint8_t PIN_AN[4] = {A0, A1, A2, A3};  // kanalen: 0 = L-X, 1 = L-Y, 2 = R-X, 3 = R-Y

// Kleur en helderheid (0..255). Warmgeel, net als in de 4d-puzzels app (#ffd166).
const uint8_t COLOR_R = 255, COLOR_G = 209, COLOR_B = 102;
const uint8_t LEVEL_ON = 96;         // "aan"  (middel)
const uint8_t LEVEL_CURSOR = 255;    // "gekozen" (fel)
const uint8_t LEVEL_BREATH_MIN = 20; // laagste stand van het ademen
const uint8_t MAX_BRIGHTNESS = 160;  // begrenzing → max. ±300 mA, prima via USB

// Sticks
const int STICK_ON = 300;   // uitslag (van 512) waarbij een stap telt
const int STICK_OFF = 150;  // terug onder deze uitslag = klaar voor de volgende stap
const uint16_t DEBOUNCE_MS = 25, HINT_MS = 800, NEWGAME_MS = 1500;
const uint8_t MAX_LEVEL = 8;

/* Volgorde van de LED's in de ketting (Gray-code: elke stap is één ribbe). CHAIN[k] = cel van LED k */
const uint8_t CHAIN[16] = {2, 3, 1, 0, 4, 5, 7, 6, 14, 15, 13, 12, 8, 9, 11, 10};

/* Standaard stick-toewijzing (klopt in Wokwi). Met de kalibratie wordt die voor jouw controller
   bepaald en in het EEPROM bewaard. sign: +1 = hogere analoge waarde → coördinaat 1. */
struct AxisMap {
  uint8_t ch;
  int8_t sign;
};
AxisMap axisMap[4] = {{0, -1}, {1, -1}, {3, +1}, {2, -1}};  // x, y, z, w

/* Typen staan bovenaan: de Arduino-IDE zet automatisch functie-prototypes boven de code. */
struct Btn {
  uint8_t pin;
  bool stable, last;
  unsigned long t;
};
struct Note {
  uint16_t f;
  uint16_t ms;
};

/* ------------------------------------------------------------------ HARDWARE-OBJECTEN */
Adafruit_NeoPixel strip(16, PIN_LEDS, NEO_GRB + NEO_KHZ800);
#if USE_OLED
Adafruit_SSD1306 oled(128, 64, &Wire, -1);
bool oledOk = false;
#endif

/* ------------------------------------------------------------------ SPELTOESTAND */
enum Mode : uint8_t { M_BOOT, M_PLAY, M_WON, M_CAL };
Mode mode = M_BOOT;
uint16_t lights = 0, startLights = 0;
uint8_t cursor = 0, par = 0, level = 1, hints = 0;
uint16_t presses = 0;
unsigned long tStart = 0, tSolved = 0, tMode = 0, hintFlashUntil = 0;
uint8_t pixelOf[16];
int center[4] = {512, 512, 512, 512};
bool armed[4] = {true, true, true, true};
bool dirty = true;
uint8_t calStep = 0;

const uint8_t EE_MAGIC0 = 0, EE_MAGIC1 = 1, EE_VERSION = 2, EE_AXES = 3, EE_LEVEL = 11, EE_SEED = 12;

/* ------------------------------------------------------------------ SPELREGELS */

/* Cel c + de 4 buren: in een 2×2×2×2 rooster is een buur 'één bit omgedraaid'. */
uint16_t pressMask(uint8_t c) {
#if NEIGHBOR_RULE
  return (1u << c) | (1u << (c ^ 1)) | (1u << (c ^ 2)) | (1u << (c ^ 4)) | (1u << (c ^ 8));
#else
  return 1u << c;
#endif
}

uint8_t popcount16(uint16_t v) {
  uint8_t n = 0;
  while (v) {
    v &= v - 1;
    n++;
  }
  return n;
}

/* Oplossing: welke cellen moet je (nog) indrukken? Voor de tesseract is de drukmatrix zijn eigen
   inverse (over GF(2)), dus cel j moet gedrukt als (lampjes ∩ masker(j)) een oneven aantal heeft.
   Elke stand is oplosbaar en de oplossing is uniek. */
uint16_t solution(uint16_t L) {
#if NEIGHBOR_RULE
  uint16_t sol = 0;
  for (uint8_t j = 0; j < 16; j++)
    if (popcount16(L & pressMask(j)) & 1) sol |= 1u << j;
  return sol;
#else
  return L;
#endif
}

/* ------------------------------------------------------------------ GELUID (niet-blokkerend) */
Note noteQ[10];
uint8_t qHead = 0, qLen = 0;
unsigned long noteEnd = 0;

void queueNote(uint16_t f, uint16_t ms) {
#if USE_BUZZER
  if (qLen < 10) {
    noteQ[(qHead + qLen) % 10] = {f, ms};
    qLen++;
  }
#endif
}
void soundTick() {
#if USE_BUZZER
  if (qLen && (long)(millis() - noteEnd) >= 0) {
    Note n = noteQ[qHead];
    qHead = (qHead + 1) % 10;
    qLen--;
    if (n.f) tone(PIN_BUZZER, n.f, n.ms);
    else noTone(PIN_BUZZER);
    noteEnd = millis() + n.ms + 8;
  }
#endif
}
void sndMove() { queueNote(1800, 12); }
void sndBump() { queueNote(180, 45); }
void sndPress() { queueNote(988, 28); queueNote(1319, 40); }
void sndHint() { queueNote(1568, 50); queueNote(0, 40); queueNote(1568, 50); }
void sndNew() { queueNote(784, 60); queueNote(1047, 80); }
void sndWin() {
  queueNote(1047, 110); queueNote(1319, 110); queueNote(1568, 110); queueNote(2093, 260);
  queueNote(0, 60); queueNote(1568, 90); queueNote(2093, 380);
}

/* ------------------------------------------------------------------ LEDS */
void setCell(uint8_t c, uint8_t lvl) {
  uint16_t g = Adafruit_NeoPixel::gamma8(lvl);
  strip.setPixelColor(pixelOf[c], (COLOR_R * g) / 255, (COLOR_G * g) / 255, (COLOR_B * g) / 255);
}

uint8_t tri8(uint16_t phase) {  // driehoeksgolf 0..255..0 over 512 stappen
  phase &= 511;
  return phase < 256 ? phase : 511 - phase;
}

void renderLeds() {
  unsigned long now = millis();
  for (uint8_t c = 0; c < 16; c++) {
    uint8_t lvl = 0;
    bool on = (lights >> c) & 1;
    if (mode == M_PLAY) {
      if (c == cursor) {
        if (now < hintFlashUntil) lvl = ((now / 90) & 1) ? LEVEL_CURSOR : 0;
        else if (on || CURSOR_STYLE == 0) lvl = LEVEL_CURSOR;
        else lvl = LEVEL_BREATH_MIN + (uint16_t)(LEVEL_CURSOR - LEVEL_BREATH_MIN) * tri8(now / 2) / 255;
      } else lvl = on ? LEVEL_ON : 0;
    } else if (mode == M_WON) {
      unsigned long t = now - tSolved;
      if (t < 2600) lvl = (uint16_t)tri8(t / 2 + pixelOf[c] * 32) * 180 / 255;
      else lvl = 24 + (uint16_t)tri8((now - tSolved) / 4) * 70 / 255;
    } else if (mode == M_CAL) {
      bool target = false;
      if (calStep == 1) target = (c & 1);         // naar rechts: x = 1
      if (calStep == 2) target = !(c & 2);        // omhoog: y = 0 (boven)
      if (calStep == 3) target = (c & 4);         // omhoog op rechts: z = 1 (achter)
      if (calStep == 4) target = (c & 8);         // naar rechts op rechts: w = 1 (buiten)
      if (calStep == 0) target = true;
      lvl = target ? 40 + tri8(now) * 160 / 255 : 0;
    }
    setCell(c, lvl);
  }
  if (mode == M_BOOT) {  // ketting-test: LED 0 → 15 lichten één voor één op
    unsigned long t = now - tMode;
    for (uint8_t k = 0; k < 16; k++) {
      uint8_t lvl = 0;
      if (t > k * 70UL) lvl = (t < k * 70UL + 140) ? 255 : (t < 1400 ? LEVEL_ON : 0);
      setCell(CHAIN[k], lvl);
    }
  }
  strip.show();
}

/* ------------------------------------------------------------------ OLED */
#if USE_OLED
void printTime(unsigned long ms) {
  unsigned long s = ms / 1000;
  if (s > 5999) s = 5999;
  uint8_t m = s / 60, ss = s % 60;
  if (m < 10) oled.print('0');
  oled.print(m);
  oled.print(':');
  if (ss < 10) oled.print('0');
  oled.print(ss);
}

void drawMap() {  // 4 bordjes van 2×2: kolom = w (binnen|buiten), rij = z (voor|achter)
  unsigned long now = millis();
  for (uint8_t c = 0; c < 16; c++) {
    uint8_t x = c & 1, y = (c >> 1) & 1, z = (c >> 2) & 1, w = (c >> 3) & 1;
    int px = 79 + w * 26 + x * 11, py = 13 + z * 26 + y * 11;
    bool on = (lights >> c) & 1;
    if (on) oled.fillRect(px, py, 10, 10, SSD1306_WHITE);
    else oled.drawRect(px, py, 10, 10, SSD1306_WHITE);
    if (c == cursor && ((now / 250) & 1)) oled.fillRect(px + 3, py + 3, 4, 4, on ? SSD1306_BLACK : SSD1306_WHITE);
  }
}

void renderOled() {
  if (!oledOk) return;
  oled.clearDisplay();
  oled.setTextColor(SSD1306_WHITE);
  oled.setTextSize(1);
  unsigned long now = millis();
  if (mode == M_BOOT) {
    oled.setTextSize(2);
    oled.setCursor(0, 6);
    oled.print(F("LICHTJES"));
    oled.setCursor(0, 26);
    oled.print(F("4D"));
    oled.setTextSize(1);
    oled.setCursor(0, 52);
    oled.print(F("LED-test 0..15"));
  } else if (mode == M_PLAY) {
    oled.setCursor(0, 0);
    oled.print(F("LICHTJES 4D   Lv "));
    oled.print(level);
    oled.drawFastHLine(0, 9, 128, SSD1306_WHITE);
    oled.setCursor(0, 14);
    oled.print(F("Aan  "));
    oled.print(popcount16(lights));
    oled.print(F("/16"));
    oled.setCursor(0, 24);
    oled.print(F("Druk "));
    oled.print(presses);
    oled.setCursor(0, 34);
    oled.print(F("Min  "));
    oled.print(par);
    oled.setCursor(0, 44);
    oled.print(F("Tijd "));
    printTime(now - tStart);
    oled.setCursor(0, 56);
    oled.print('x');
    oled.print(cursor & 1);
    oled.print('y');
    oled.print((cursor >> 1) & 1);
    oled.print('z');
    oled.print((cursor >> 2) & 1);
    oled.print('w');
    oled.print((cursor >> 3) & 1);
    drawMap();
  } else if (mode == M_WON) {
    oled.setTextSize(2);
    oled.setCursor(10, 2);
    oled.print(F("OPGELOST!"));
    oled.setTextSize(1);
    oled.setCursor(0, 26);
    oled.print(presses);
    oled.print(F(" drukken (min "));
    oled.print(par);
    oled.print(')');
    oled.setCursor(0, 38);
    oled.print(F("Tijd "));
    printTime(tSolved - tStart);
    oled.print(F("  hints "));
    oled.print(hints);
    oled.setCursor(0, 54);
    oled.print(F("Druk = level "));
    oled.print(level);
  } else if (mode == M_CAL) {
    oled.setCursor(0, 0);
    oled.print(F("KALIBRATIE  "));
    oled.print(calStep);
    oled.print(F("/4"));
    oled.drawFastHLine(0, 9, 128, SSD1306_WHITE);
    oled.setTextSize(2);
    oled.setCursor(0, 18);
    if (calStep == 0) oled.print(F("Loslaten"));
    if (calStep == 1) oled.print(F("LINKS  >"));
    if (calStep == 2) oled.print(F("LINKS  ^"));
    if (calStep == 3) oled.print(F("RECHTS ^"));
    if (calStep == 4) oled.print(F("RECHTS >"));
    oled.setTextSize(1);
    oled.setCursor(0, 44);
    if (calStep == 0) oled.print(F("sticks in het midden"));
    else oled.print(F("duw ver en laat los"));
  }
  oled.display();
}
#endif

/* ------------------------------------------------------------------ SERIEEL */
void printHelp() {
  Serial.println(F("LICHTJES 4D — a/d=x  w/s=y  i/k=z(achter/voor)  j/l=w(binnen/buiten)  spatie=druk  h=hint  n=nieuw  r=opnieuw  c=bord"));
}

void printBoard() {
  Serial.print(F("Level "));
  Serial.print(level);
  Serial.print(F(" | aan "));
  Serial.print(popcount16(lights));
  Serial.print(F(" | gedrukt "));
  Serial.print(presses);
  Serial.print(F(" (min "));
  Serial.print(par);
  Serial.print(F(") | cel "));
  Serial.print(cursor);
  Serial.print(F(" = x"));
  Serial.print(cursor & 1);
  Serial.print(F(" y"));
  Serial.print((cursor >> 1) & 1);
  Serial.print(F(" z"));
  Serial.print((cursor >> 2) & 1);
  Serial.print(F(" w"));
  Serial.println((cursor >> 3) & 1);
  Serial.println(F("           binnen (w0)              buiten (w1)"));
  Serial.println(F("        voor      achter         voor      achter"));
  for (uint8_t y = 0; y < 2; y++) {
    Serial.print(y ? F(" onder ") : F(" boven "));
    for (uint8_t w = 0; w < 2; w++) {
      for (uint8_t z = 0; z < 2; z++) {
        for (uint8_t x = 0; x < 2; x++) {
          uint8_t c = x | (y << 1) | (z << 2) | (w << 3);
          bool on = (lights >> c) & 1;
          Serial.print(c == cursor ? '[' : ' ');
          Serial.print(on ? '#' : '.');
          Serial.print(c == cursor ? ']' : ' ');
        }
        Serial.print(F("    "));
      }
      Serial.print(F("   "));
    }
    Serial.println();
  }
}

/* ------------------------------------------------------------------ ACTIES */
void newPuzzle() {
  uint8_t k = level + 2;  // level 1 = 3 drukken (zoals 'Tesseract' in de app), level 8 = 10
  if (k > 10) k = 10;
  uint8_t cells[16];
  for (uint8_t i = 0; i < 16; i++) cells[i] = i;
  for (uint8_t i = 0; i < k; i++) {  // gedeeltelijke Fisher-Yates
    uint8_t j = i + random(16 - i);
    uint8_t t = cells[i];
    cells[i] = cells[j];
    cells[j] = t;
  }
  lights = 0;
  for (uint8_t i = 0; i < k; i++) lights ^= pressMask(cells[i]);
  par = popcount16(solution(lights));  // = k: de oplossing is uniek
  startLights = lights;
  presses = 0;
  hints = 0;
  tStart = millis();
  mode = M_PLAY;
  dirty = true;
  Serial.println(F("--- nieuwe puzzel ---"));
  printBoard();
}

void onMove(uint8_t axis, uint8_t val) {
  if (mode == M_WON) return;
  if (mode != M_PLAY) return;
  uint8_t bit = 1 << axis;
  uint8_t next = val ? (cursor | bit) : (cursor & ~bit);
  if (next == cursor) {
    sndBump();
    return;
  }
  cursor = next;
  hintFlashUntil = 0;
  sndMove();
  dirty = true;
}

void onPress() {
  if (mode == M_WON) {
    newPuzzle();
    sndNew();
    return;
  }
  if (mode != M_PLAY) return;
  lights ^= pressMask(cursor);
  presses++;
  hintFlashUntil = 0;
  dirty = true;
  if (lights == 0) {
    mode = M_WON;
    tSolved = millis();
    if (level < MAX_LEVEL) level++;
    EEPROM.update(EE_LEVEL, level);
    sndWin();
    Serial.println(F("*** OPGELOST! ***"));
  } else sndPress();
  printBoard();
}

void onHint() {
  if (mode != M_PLAY) return;
  uint16_t sol = solution(lights);
  if (!sol) return;
  uint8_t best = 255, bestD = 255;
  for (uint8_t c = 0; c < 16; c++)
    if ((sol >> c) & 1) {
      uint8_t d = popcount16(c ^ cursor);
      if (d < bestD) {
        bestD = d;
        best = c;
      }
    }
  cursor = best;
  hints++;
  hintFlashUntil = millis() + 1200;
  sndHint();
  dirty = true;
  Serial.print(F("Hint: druk op cel "));
  Serial.print(best);
  Serial.print(F(" (nog "));
  Serial.print(popcount16(sol));
  Serial.println(F(" keer drukken)"));
}

void onNewGame() {
  newPuzzle();
  sndNew();
}

/* ------------------------------------------------------------------ KNOPPEN */
Btn btnL = {PIN_SW_L, false, false, 0}, btnR = {PIN_SW_R, false, false, 0};
bool anyDown = false, chord = false, consumed = false;
unsigned long tDown = 0;

bool readBtn(Btn &b) {
  bool raw = digitalRead(b.pin) == LOW;
  if (raw != b.last) {
    b.last = raw;
    b.t = millis();
  }
  if (millis() - b.t >= DEBOUNCE_MS) b.stable = raw;
  return b.stable;
}

void handleButtons() {
  bool l = readBtn(btnL), r = readBtn(btnR);
  unsigned long now = millis();
  if (!anyDown && (l || r)) {
    anyDown = true;
    chord = false;
    consumed = false;
    tDown = now;
  }
  if (l && r) chord = true;
  if (anyDown && !l && !r) {
    anyDown = false;
    if (!consumed && !chord && now - tDown < HINT_MS) onPress();
    return;
  }
  if (anyDown && !consumed) {
    if (l && r && now - tDown >= NEWGAME_MS) {
      consumed = true;
      onNewGame();
    } else if (!chord && now - tDown >= HINT_MS) {
      consumed = true;
      onHint();
    }
  }
}

/* ------------------------------------------------------------------ STICKS */
void readCenters() {
  for (uint8_t ch = 0; ch < 4; ch++) {
    long sum = 0;
    for (uint8_t i = 0; i < 16; i++) sum += analogRead(PIN_AN[ch]);
    int c = sum / 16;
    center[ch] = (abs(c - 512) < 150) ? c : 512;  // stick vastgehouden? dan gewoon 512
  }
}

void handleSticks() {
  for (uint8_t a = 0; a < 4; a++) {
    uint8_t ch = axisMap[a].ch;
    int d = (analogRead(PIN_AN[ch]) - center[ch]) * axisMap[a].sign;
    if (armed[a]) {
      if (d > STICK_ON) {
        armed[a] = false;
        onMove(a, 1);
      } else if (d < -STICK_ON) {
        armed[a] = false;
        onMove(a, 0);
      }
    } else if (abs(d) < STICK_OFF) armed[a] = true;
  }
}

/* ------------------------------------------------------------------ KALIBRATIE */
bool calWaitRelease = false;
unsigned long calQuietSince = 0;

void calibrationTick() {
  unsigned long now = millis();
  int dev[4];
  int maxDev = 0;
  uint8_t maxCh = 0;
  for (uint8_t ch = 0; ch < 4; ch++) {
    dev[ch] = analogRead(PIN_AN[ch]) - (calStep == 0 ? 512 : center[ch]);
    if (abs(dev[ch]) > maxDev) {
      maxDev = abs(dev[ch]);
      maxCh = ch;
    }
  }
  bool btn = readBtn(btnL) || readBtn(btnR);
  if (calStep == 0) {  // wacht tot alles los is en meet dan het midden
    if (!btn && maxDev < 150) {
      if (!calQuietSince) calQuietSince = now;
      if (now - calQuietSince > 700) {
        readCenters();
        calStep = 1;
        calWaitRelease = false;
        queueNote(1200, 40);
        dirty = true;
      }
    } else calQuietSince = 0;
    return;
  }
  if (calWaitRelease) {
    if (maxDev < 120) {
      calWaitRelease = false;
      calStep++;
      dirty = true;
      if (calStep > 4) {
        bool used[4] = {false, false, false, false};
        bool ok = true;
        for (uint8_t a = 0; a < 4; a++) {
          if (used[axisMap[a].ch]) ok = false;
          used[axisMap[a].ch] = true;
        }
        if (!ok) {  // twee keer hetzelfde kanaal: opnieuw
          queueNote(200, 300);
          calStep = 1;
          return;
        }
        EEPROM.update(EE_MAGIC0, 'L');
        EEPROM.update(EE_MAGIC1, '4');
        EEPROM.update(EE_VERSION, 1);
        for (uint8_t a = 0; a < 4; a++) {
          EEPROM.update(EE_AXES + a * 2, axisMap[a].ch);
          EEPROM.update(EE_AXES + a * 2 + 1, (uint8_t)axisMap[a].sign);
        }
        Serial.println(F("Kalibratie bewaard."));
        sndWin();
        newPuzzle();
      }
    }
    return;
  }
  if (maxDev > 380) {
    int8_t s = dev[maxCh] > 0 ? 1 : -1;
    uint8_t a = calStep - 1;  // 1: x (rechts=1)  2: y (omhoog = 0 → teken omdraaien)  3: z (omhoog = 1)  4: w (rechts = 1)
    axisMap[a].ch = maxCh;
    axisMap[a].sign = (calStep == 2) ? -s : s;
    calWaitRelease = true;
    queueNote(1600, 40);
    Serial.print(F("as "));
    Serial.print("xyzw"[a]);
    Serial.print(F(" = kanaal "));
    Serial.print(maxCh);
    Serial.print(F(" teken "));
    Serial.println(axisMap[a].sign);
  }
}

void loadSettings() {
  if (EEPROM.read(EE_MAGIC0) == 'L' && EEPROM.read(EE_MAGIC1) == '4' && EEPROM.read(EE_VERSION) == 1) {
    for (uint8_t a = 0; a < 4; a++) {
      uint8_t ch = EEPROM.read(EE_AXES + a * 2);
      int8_t s = (int8_t)EEPROM.read(EE_AXES + a * 2 + 1);
      if (ch < 4 && (s == 1 || s == -1)) axisMap[a] = {ch, s};
    }
  }
  uint8_t lv = EEPROM.read(EE_LEVEL);
  level = (lv >= 1 && lv <= MAX_LEVEL) ? lv : 1;
  uint16_t seed = EEPROM.read(EE_SEED) | (EEPROM.read(EE_SEED + 1) << 8);
  seed++;
  EEPROM.update(EE_SEED, seed & 0xFF);
  EEPROM.update(EE_SEED + 1, seed >> 8);
  randomSeed(((uint32_t)seed << 16) ^ analogRead(A6) ^ ((uint32_t)analogRead(A7) << 6) ^ micros());
}

/* ------------------------------------------------------------------ SETUP / LOOP */
void setup() {
  Serial.begin(115200);
  pinMode(PIN_SW_L, INPUT_PULLUP);
  pinMode(PIN_SW_R, INPUT_PULLUP);
  for (uint8_t k = 0; k < 16; k++) pixelOf[CHAIN[k]] = k;
  strip.begin();
  strip.setBrightness(MAX_BRIGHTNESS);
  strip.clear();
  strip.show();
#if USE_OLED
  oledOk = oled.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  if (oledOk) {  // reageert er echt een schermpje op adres 0x3C?
    Wire.beginTransmission(0x3C);
    oledOk = (Wire.endTransmission() == 0);
  }
  if (!oledOk) Serial.println(F("Geen OLED gevonden (adres 0x3C) — speel gewoon verder zonder."));
#endif
  loadSettings();
  delay(250);
  if (digitalRead(PIN_SW_L) == LOW && digitalRead(PIN_SW_R) == LOW) {
    mode = M_CAL;
    calStep = 0;
    Serial.println(F("KALIBRATIE: laat de sticks los en volg het schermpje / de LED's."));
  } else {
    readCenters();
    mode = M_BOOT;
  }
  tMode = millis();
  printHelp();
}

void handleSerial() {
  while (Serial.available()) {
    char ch = Serial.read();
    switch (ch) {
      case 'a': onMove(0, 0); break;
      case 'd': onMove(0, 1); break;
      case 'w': onMove(1, 0); break;
      case 's': onMove(1, 1); break;
      case 'i': onMove(2, 1); break;
      case 'k': onMove(2, 0); break;
      case 'j': onMove(3, 0); break;
      case 'l': onMove(3, 1); break;
      case ' ':
      case 'p': onPress(); break;
      case 'h': onHint(); break;
      case 'n': onNewGame(); break;
      case 'r':
        lights = startLights;
        presses = 0;
        mode = M_PLAY;
        tStart = millis();
        dirty = true;
        printBoard();
        break;
      case 'c': printBoard(); break;
      case '?': printHelp(); break;
    }
  }
}

unsigned long tLed = 0, tOled = 0;

void loop() {
  unsigned long now = millis();
  soundTick();
  handleSerial();
  if (mode == M_CAL) calibrationTick();
  else if (mode == M_BOOT) {
    if (now - tMode > 1700) newPuzzle();
  } else {
    handleButtons();
    handleSticks();
  }
  if (now - tLed >= 16) {  // ±60 beelden per seconde
    tLed = now;
    renderLeds();
  }
#if USE_OLED
  if (dirty || now - tOled >= 200) {
    tOled = now;
    dirty = false;
    renderOled();
  }
#endif
}
