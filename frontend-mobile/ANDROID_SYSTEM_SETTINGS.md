# Android systémové nastavenia

Tento dokument opisuje systémové správanie Android aplikácie `Sport`, jeho
zdrojovú konfiguráciu a vykonané overenia.

## Zdroj pravdy

- `app.json` obsahuje natívne Expo/Android nastavenia.
- `app.config.ts` kontroluje bezpečnostné podmienky zostavy.
- `eas.json` explicitne určuje prostredie každej EAS zostavy cez `APP_ENV`.
- Priečinok `android/` je generovaný cez Expo prebuild a nie je commitovaný.
  Ručné zmeny v ňom sa preto nemajú robiť; pri ďalšom čistom prebuild-e by sa
  stratili.

## Nastavené správanie

| Oblasť | Nastavenie | Čo robí |
| --- | --- | --- |
| Systémové lišty | Stavový aj navigačný panel sú viditeľné, s bielymi ikonami | Aplikácia už nevynucuje fullscreen/immersive režim. Android riadi zobrazenie líšt aj pri návrate z pozadia alebo po zatvorení klávesnice. |
| Edge-to-edge | `edgeToEdgeEnabled: true` | Aplikácia používa aktuálny Android model vykresľovania za systémovými oknami. |
| Bezpečná oblasť | Koreň aplikácie, systémové modaly a fullscreen pavúk používajú všetky štyri safe-area okraje | Ovládacie prvky nekolidujú so status barom, gesture barom, výrezom displeja ani zaoblenými rohmi, v portrait aj landscape režime. |
| Rotácia | `orientation: "default"` | Android môže aplikáciu otočiť podľa zariadenia. Rozloženie už nie je natvrdo uzamknuté na portrait. |
| Klávesnica | `softwareKeyboardLayoutMode: "resize"` | Android zmenší dostupnú výšku okna namiesto prekrytia formulára. Existujúce zatvorenie klávesnice kliknutím mimo poľa a scroll formulárov ostali zachované. |
| Modaly a klávesnica | Android modal používa translucent systémové lišty, safe area a `KeyboardAvoidingView` | Samostatné Android okno modalu sa správa rovnako ako hlavné okno a vstupy ostávajú dostupné nad klávesnicou. |
| Štartovacie pozadie | Tmavá systémová farba cez `expo-system-ui` | Pred načítaním React rozhrania sa neobjaví biely záblesk. |
| Sieť | Release nepovoľuje cleartext HTTP | Produkčné prihlasovanie a API komunikácia nemôžu potichu odísť cez nešifrované HTTP. Debug manifest Expo naďalej povoľuje lokálny HTTP backend. |
| Produkčná poistka | `APP_ENV=production` vyžaduje HTTPS `EXPO_PUBLIC_API_BASE_URL` | Produkčná zostava skončí s jasnou chybou, kým nie je zadaný platný HTTPS endpoint. |
| Zálohy | `allowBackup: false`; SecureStore má explicitnú Android backup konfiguráciu | Android nezálohuje dáta celej aplikácie. SecureStore je navyše nakonfigurovaný tak, aby sa jeho šifrované dáta neprenášali do neplatného zariadenia. |
| Povolenia | Odstránené storage, overlay a vibration povolenia | Release si nepýta prístup, ktorý aplikácia aktuálne nepotrebuje. Zmenšuje sa rozsah oprávnení aj pri budúcich aktualizáciách závislostí. |
| Android SDK | Expo prebuild generuje `minSdk 24`, `compileSdk 36`, `targetSdk 36` | Aplikácia používa aktuálne edge-to-edge správanie cieľového Android SDK, pričom zachováva podporu od Androidu 7.0. |

## Overenie

Vykonané kontroly:

- TypeScript kontrola: úspešná.
- Expo dependency check: všetky balíky kompatibilné s Expo SDK 54.
- Čistý Android prebuild: úspešný a bez pôvodných ručných immersive úprav.
- Android debug zostava pre štandardný plný ABI balík: úspešná.
- Android debug a release zostava pre emulátor `x86_64`: úspešná.
- Android `lintRelease`: 0 chýb; zostali iba upozornenia generovaného
  Expo/React Native projektu a dostupných novších verzií závislostí.
- Gradle unit-test úloha: úspešná, ale projekt momentálne nemá natívne Android
  unit testy (`NO-SOURCE`).
- Release APK nainštalovaný a spustený na emulátore Android 17/API 37.
- Vizuálne overené: portrait, landscape, návrat z pozadia a opätovné spustenie.
  Systémové lišty ostali viditeľné, obsah bol v safe area a aplikácia nemala
  `AndroidRuntime` ani `ReactNative` chybu.
- Zlúčený release manifest overený: bez cleartext HTTP, storage, vibration a
  overlay povolení; `adjustResize` a povolená rotácia sú prítomné.
- Produkčný config test zámerne zlyhá pri súčasnej HTTP URL, teda bezpečnostná
  poistka funguje.

Interaktívny formulár s klávesnicou sa v release emulátore nedal otvoriť bez
Google prihlásenia a backendu. Jeho Android `adjustResize` konfigurácia,
safe-area/keyboard komponenty a TypeScript zostavenie boli overené staticky.

## Zostávajúce úlohy

1. Pred produkčnou zostavou nahraď
   `http://192.168.1.182:8000` v produkčnom EAS profile reálnou verejnou HTTPS
   adresou. Aktuálne je produkčný build zámerne blokovaný.
2. `npm audit --omit=dev` hlási 34 existujúcich tranzitívnych nálezov
   (14 moderate, 20 high, 0 critical) v Expo/React Native build toolchaine.
   Automatická oprava vyžaduje nekompatibilný major upgrade na Expo 57 /
   React Native 0.86; nerobiť `npm audit fix --force`. Naplánovať samostatný
   upgrade Expo SDK s regresnými testami.
3. Pri budúcom prechode na `targetSdk 37` znovu posúdiť Android
   `ACCESS_LOCAL_NETWORK`. Produkčný vzdialený HTTPS backend ho nepotrebuje;
   lokálny vývojový backend ho na Android 17 pri target 37 bude vyžadovať ako
   runtime povolenie.
4. Pred publikovaním doplniť finálne brandové `icon`, `adaptiveIcon` a splash
   assety. V repozitári momentálne nie je zdrojový brandový asset, preto neboli
   vymýšľané náhradné ikony.
