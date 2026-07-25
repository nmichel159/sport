# Databázová schéma aplikácie Sport LevelGo

## 1. Účel dokumentu

Tento dokument je záväznou technickou špecifikáciou databázovej vrstvy aplikácie.

Aplikácia je multisportová platforma pre:

- hráčov zúčastňujúcich sa individuálnych alebo tímových turnajov,
- vytváranie a správu súkromných tímov,
- vytváranie dočasných verejných tímov pre konkrétny turnaj,
- organizácie a ich organizátorov,
- prihlasovanie na turnaje,
- evidenciu výsledkov, poradia, platieb, XP a rebríčkov,
- bezpečné prihlásenie pomocou Google účtu,
- dlhodobé udržanie prihlásenia na webovom aj mobilnom zariadení.

Implementácia má používať PostgreSQL. Všetky databázové zmeny musia byť vytvorené pomocou migračného systému, napríklad Alembic.

---

# 2. Záväzné technické pravidlá

## 2.1 Základné databázové pravidlá

Použi tieto princípy:

- primárne kľúče typu `UUID`,
- generovanie UUID na serveri alebo pomocou `gen_random_uuid()`,
- všetky časy ukladať ako `TIMESTAMPTZ`,
- všetky časy ukladať v UTC,
- názvy tabuliek a stĺpcov používať v `snake_case`,
- peniaze ukladať ako `NUMERIC(12, 2)`,
- menu ukladať ako trojpísmenový ISO 4217 kód, napríklad `EUR`,
- e-mail a nickname ukladať a porovnávať bez rozlišovania veľkosti písmen,
- na e-mail a nickname použiť PostgreSQL typ `CITEXT` alebo ekvivalentnú normalizáciu,
- nepoužívať fyzické mazanie záznamov, ktoré sú súčasťou histórie turnajov, výsledkov, platieb alebo XP,
- citlivé zmeny vykonávať transakčne,
- všetky cudzie kľúče explicitne indexovať, ak sa podľa nich bude vyhľadávať.

Odporúčané spoločné stĺpce:

```text
id UUID PRIMARY KEY
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

`updated_at` aktualizovať automaticky v aplikačnej vrstve alebo databázovým triggerom.

## 2.2 Prístup k databáze

Mobilná ani webová aplikácia nesmie komunikovať priamo s PostgreSQL databázou.

Povolený tok:

```text
React / React Native
        |
        v
FastAPI backend
        |
        v
PostgreSQL
```

Databáza nesmie byť verejne dostupná z internetu.

Použi najmenej dve databázové roly:

```text
migration_role
application_role
```

- `migration_role` môže meniť databázovú schému,
- `application_role` môže iba čítať a zapisovať aplikačné dáta,
- `application_role` nesmie byť superuser,
- aplikačný backend nesmie používať účet vlastníka databázy.

---

# 3. Bezpečnosť prihlásenia

## 3.1 Google prihlásenie

Google slúži iba ako externý poskytovateľ identity.

Backend musí:

1. prijať Google ID token alebo autorizačný kód,
2. overiť podpis tokenu voči Google,
3. overiť:
   - `iss`,
   - `aud`,
   - `exp`,
   - `sub`,
   - podľa použitého flow aj `nonce`,
4. ako stabilný identifikátor Google účtu používať výhradne hodnotu `sub`,
5. nepoužívať e-mail ako primárny identifikátor identity,
6. po úspešnom overení vytvoriť vlastnú aplikačnú reláciu.

Do databázy sa nesmie ukladať Google access token, pokiaľ aplikácia nepotrebuje pristupovať k ďalším Google API. Pre samotné prihlásenie nie je jeho dlhodobé uloženie potrebné.

## 3.2 Aplikačné tokeny

Po úspešnom Google prihlásení backend vydá:

```text
access token
refresh token
```

Odporúčané pravidlá:

```text
access token platnosť: 10 až 15 minút
refresh token platnosť: 30 až 90 dní
refresh token: rotačný
```

Pri každom použití refresh tokenu:

1. starý refresh token zneplatni,
2. vytvor nový refresh token,
3. ulož iba hash nového refresh tokenu,
4. nikdy neukladaj refresh token v otvorenom texte,
5. pri opätovnom použití už zneplatneného tokenu zruš celú tokenovú rodinu.

## 3.3 Udržanie prihlásenia na zariadení

Web:

- refresh token ukladať do `HttpOnly`,
- `Secure`,
- `SameSite=Lax` alebo `SameSite=Strict` cookie,
- nepoužívať `localStorage` na dlhodobé uloženie refresh tokenu,
- pri cookie autentifikácii chrániť stav meniace endpointy proti CSRF.

Mobil:

- refresh token ukladať do systémového bezpečného úložiska:
  - iOS Keychain,
  - Android Keystore,
  - pri Expo použiť `expo-secure-store`,
- nepoužívať obyčajný `AsyncStorage` pre refresh token.

Používateľ zostáva prihlásený, kým:

- refresh token neexspiruje,
- relácia nie je zrušená,
- používateľ sa neodhlási,
- účet nie je zablokovaný alebo vymazaný,
- nebola zistená kompromitácia tokenovej rodiny.

Aplikácia nesmie používateľa odhlasovať iba preto, že sa zmenila IP adresa.

---

# 4. Enumy a číselníkové hodnoty

Enumy môžu byť implementované ako PostgreSQL enum, textový stĺpec s `CHECK`, alebo samostatný číselník. Pri hodnotách, ktoré sa budú často rozširovať, preferuj číselníkovú tabuľku.

## 4.1 Stav účtu

```text
ACTIVE
BLOCKED
DELETED
```

## 4.2 Pohlavie

```text
MALE
FEMALE
OTHER
UNSPECIFIED
```

## 4.3 Rola v organizácii

```text
ADMIN
MEMBER
```

Vlastník organizácie je uložený priamo v `organizations.owner_user_id`.

## 4.4 Typ turnaja

```text
INDIVIDUAL
TEAM
```

## 4.5 Formát turnaja

Počiatočné hodnoty:

```text
SWISS
SINGLE_ELIMINATION
GROUPS_THEN_ELIMINATION
```

Model musí umožniť neskoršie doplnenie ďalších formátov.

## 4.6 Stav turnaja

```text
DRAFT
REGISTRATION_OPEN
REGISTRATION_CLOSED
IN_PROGRESS
FINISHED
CANCELLED
```

## 4.7 Stav registrácie

```text
PENDING
ACCEPTED
REJECTED
CANCELLED
REMOVED
```

## 4.8 Stav kola

```text
NOT_STARTED
IN_PROGRESS
FINISHED
```

## 4.9 Stav zápasu

```text
SCHEDULED
IN_PROGRESS
FINISHED
CANCELLED
```

## 4.10 Výsledok zápasu

```text
PARTICIPANT_A_WIN
PARTICIPANT_B_WIN
DRAW
NO_RESULT
```

## 4.11 Stav platby

```text
PENDING
PROCESSING
PAID
FAILED
CANCELLED
REFUNDED
PARTIALLY_REFUNDED
```

## 4.12 Typ platby

```text
INDIVIDUAL_REGISTRATION_FEE
TEAM_REGISTRATION_FEE
PLAYER_LICENSE_FEE
OTHER
```

## 4.13 Typ notifikácie

Minimálne:

```text
TEAM_INVITE
TEAM_JOINED
TEAM_REMOVED
TOURNAMENT_REGISTRATION_CREATED
TOURNAMENT_REGISTRATION_ACCEPTED
TOURNAMENT_REGISTRATION_REJECTED
TOURNAMENT_UPDATED
MATCH_CREATED
MATCH_RESULT_RECORDED
PAYMENT_UPDATED
ORGANIZATION_INVITE
SYSTEM
```

---

# 5. Používatelia a autentifikácia

## 5.1 `users`

Hlavná tabuľka používateľských účtov.

Každý používateľ je automaticky hráč.

```text
users
-----
id UUID PRIMARY KEY
email CITEXT NOT NULL
account_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
email_verified BOOLEAN NOT NULL DEFAULT FALSE
last_login_at TIMESTAMPTZ NULL
blocked_at TIMESTAMPTZ NULL
blocked_reason TEXT NULL
deleted_at TIMESTAMPTZ NULL
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

Obmedzenia:

```text
UNIQUE(email)
CHECK(account_status IN ('ACTIVE', 'BLOCKED', 'DELETED'))
```

Poznámky:

- e-mail je kontaktný údaj, nie stabilný identifikátor Google identity,
- účet s `BLOCKED` alebo `DELETED` nesmie získať nový access token,
- pri soft delete nevymazávať historické väzby,
- pri vymazaní účtu anonymizovať osobné údaje podľa pravidiel aplikácie, ale zachovať turnajové výsledky, platby a XP záznamy.

## 5.2 `user_auth_identities`

Externé identity používateľa.

```text
user_auth_identities
--------------------
id UUID PRIMARY KEY
user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT
provider VARCHAR(30) NOT NULL
provider_subject VARCHAR(255) NOT NULL
provider_email CITEXT NULL
provider_email_verified BOOLEAN NOT NULL DEFAULT FALSE
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

Počiatočná hodnota `provider`:

```text
GOOGLE
```

Obmedzenia:

```text
UNIQUE(provider, provider_subject)
UNIQUE(user_id, provider)
CHECK(provider = 'GOOGLE')
```

Indexy:

```text
INDEX(user_id)
INDEX(provider, provider_subject)
```

Zásadné pravidlo:

```text
provider_subject = Google claim "sub"
```

Nikdy nepoužívaj Google e-mail ako náhradu za `provider_subject`.

## 5.3 `user_profiles`

Profilové údaje hráča.

```text
user_profiles
-------------
user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE RESTRICT
nickname CITEXT NOT NULL
first_name VARCHAR(100) NOT NULL
last_name VARCHAR(100) NOT NULL
date_of_birth DATE NULL
gender VARCHAR(20) NOT NULL DEFAULT 'UNSPECIFIED'
school_or_employer VARCHAR(255) NULL
profile_image_url TEXT NULL
bio TEXT NULL
country_code CHAR(2) NULL
city VARCHAR(120) NULL
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

Obmedzenia:

```text
UNIQUE(nickname)
CHECK(length(nickname) BETWEEN 3 AND 30)
CHECK(nickname ~ '^[A-Za-z0-9_.-]+$')
CHECK(gender IN ('MALE', 'FEMALE', 'OTHER', 'UNSPECIFIED'))
CHECK(date_of_birth IS NULL OR date_of_birth <= CURRENT_DATE)
```

Bezpečnostné pravidlá:

- hráč sa vyhľadáva iba presnou hodnotou `nickname`,
- nevytvárať endpoint na všeobecné vyhľadávanie podľa mena, priezviska, školy, zamestnávateľa alebo e-mailu,
- nevytvárať verejný endpoint, ktorý umožní listovať všetkými používateľmi,
- dátum narodenia nemusí byť verejne zobrazený; verejne možno vracať iba vypočítaný vek alebo vekovú kategóriu,
- e-mail nikdy nevystavovať vo verejnom profile,
- `school_or_employer` možno zobrazovať iba podľa nastavenia súkromia.

## 5.4 `user_privacy_settings`

Nastavenia viditeľnosti profilu.

```text
user_privacy_settings
---------------------
user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE
show_full_name BOOLEAN NOT NULL DEFAULT TRUE
show_age BOOLEAN NOT NULL DEFAULT FALSE
show_gender BOOLEAN NOT NULL DEFAULT FALSE
show_school_or_employer BOOLEAN NOT NULL DEFAULT TRUE
show_city BOOLEAN NOT NULL DEFAULT TRUE
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

Nickname zostáva vždy verejným identifikátorom profilu.

## 5.5 `auth_sessions`

Dlhodobé relácie na jednotlivých zariadeniach.

```text
auth_sessions
-------------
id UUID PRIMARY KEY
user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
session_family_id UUID NOT NULL
refresh_token_hash VARCHAR(255) NOT NULL
device_id_hash VARCHAR(255) NULL
device_name VARCHAR(255) NULL
platform VARCHAR(30) NULL
user_agent TEXT NULL
ip_address INET NULL
last_used_at TIMESTAMPTZ NOT NULL DEFAULT now()
expires_at TIMESTAMPTZ NOT NULL
rotated_at TIMESTAMPTZ NULL
revoked_at TIMESTAMPTZ NULL
revoke_reason VARCHAR(100) NULL
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

Obmedzenia:

```text
UNIQUE(refresh_token_hash)
CHECK(expires_at > created_at)
```

Indexy:

```text
INDEX(user_id)
INDEX(session_family_id)
INDEX(expires_at)
INDEX(user_id, revoked_at)
```

Pravidlá:

- ukladať iba kryptografický hash refresh tokenu,
- pri rotácii označiť starú reláciu alebo token ako rotovaný,
- pri detekcii opätovného použitia zrušeného tokenu zrušiť všetky aktívne relácie s rovnakým `session_family_id`,
- používateľ musí vedieť odhlásiť jedno zariadenie,
- používateľ musí vedieť odhlásiť všetky zariadenia,
- pri zablokovaní alebo vymazaní účtu zrušiť všetky aktívne relácie.

## 5.6 `auth_login_events`

Bezpečnostný audit prihlásení.

```text
auth_login_events
-----------------
id UUID PRIMARY KEY
user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL
provider VARCHAR(30) NOT NULL
provider_subject_hash VARCHAR(255) NULL
success BOOLEAN NOT NULL
failure_reason VARCHAR(100) NULL
ip_address INET NULL
user_agent TEXT NULL
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

Poznámky:

- neukladať celé tokeny,
- `provider_subject` možno v logu hashovať,
- log má slúžiť na bezpečnostnú diagnostiku a rate limiting,
- nastav retenčnú politiku, napríklad 90 až 180 dní.

---

# 6. Športy a sezóny

## 6.1 `sports`

Číselník športov.

```text
sports
------
id UUID PRIMARY KEY
code VARCHAR(50) NOT NULL
name VARCHAR(120) NOT NULL
is_active BOOLEAN NOT NULL DEFAULT TRUE
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

Obmedzenia:

```text
UNIQUE(code)
UNIQUE(name)
```

Príklady:

```text
FOOTBALL
BASKETBALL
VOLLEYBALL
CHESS
TABLE_TENNIS
```

Šport neurčuje pravidlá zápasu. Slúži na:

- priradenie turnaja,
- oddelenie XP,
- oddelenie rebríčkov,
- oddelenie sezón.

## 6.2 `seasons`

Sezóny sú viazané na konkrétny šport.

```text
seasons
-------
id UUID PRIMARY KEY
sport_id UUID NOT NULL REFERENCES sports(id) ON DELETE RESTRICT
name VARCHAR(120) NOT NULL
starts_at TIMESTAMPTZ NOT NULL
ends_at TIMESTAMPTZ NOT NULL
is_active BOOLEAN NOT NULL DEFAULT FALSE
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

Obmedzenia:

```text
UNIQUE(sport_id, name)
CHECK(ends_at > starts_at)
```

Odporúčanie:

- pre jeden šport povoľ iba jednu aktívnu sezónu,
- implementuj partial unique index:

```sql
CREATE UNIQUE INDEX uq_one_active_season_per_sport
ON seasons(sport_id)
WHERE is_active = TRUE;
```

XP sa po skončení sezóny fyzicky neresetuje. Nová sezóna vytvorí nový sezónny XP záznam. All-time XP zostáva zachované.

---

# 7. Súkromné tímy

## 7.1 `teams`

Trvalé súkromné tímy.

Verejný tím pre jeden turnaj sa do tejto tabuľky neukladá.

```text
teams
-----
id UUID PRIMARY KEY
owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT
name VARCHAR(150) NOT NULL
team_code CITEXT NOT NULL
description TEXT NULL
logo_url TEXT NULL
is_active BOOLEAN NOT NULL DEFAULT TRUE
deleted_at TIMESTAMPTZ NULL
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

Obmedzenia:

```text
UNIQUE(team_code)
CHECK(length(team_code) BETWEEN 3 AND 30)
```

Pravidlá:

- tím nie je viazaný na konkrétny šport,
- jeden používateľ môže vlastniť viac tímov,
- jeden používateľ môže byť členom viacerých tímov,
- vlastník nemusí byť automaticky hráčom v zostave,
- vlastník môže meniť členov tímu,
- vlastníctvo tímu sa nesmie zmeniť bez explicitnej operácie,
- tím použitý v historickom turnaji sa nesmie fyzicky vymazať.

Indexy:

```text
INDEX(owner_user_id)
INDEX(is_active)
```

## 7.2 `team_members`

Aktuálne členstvo v trvalom súkromnom tíme.

História bežného členstva sa neuchováva.

```text
team_members
------------
team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE
user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT
joined_at TIMESTAMPTZ NOT NULL DEFAULT now()
PRIMARY KEY(team_id, user_id)
```

Indexy:

```text
INDEX(user_id)
```

Pravidlá:

- vlastník tímu je oprávnený pridávať a odoberať členov,
- člen tímu nemá oprávnenie meniť zostavu,
- zmena členstva sa musí validovať proti aktívnym turnajovým registráciám,
- používateľ môže byť v jednom turnaji členom iba jedného tímového vstupu.

## 7.3 `team_invites`

Pozvánky cez link alebo QR kód.

```text
team_invites
------------
id UUID PRIMARY KEY
team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE
created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT
token_hash VARCHAR(255) NOT NULL
expires_at TIMESTAMPTZ NOT NULL
max_uses INTEGER NOT NULL DEFAULT 1
used_count INTEGER NOT NULL DEFAULT 0
is_active BOOLEAN NOT NULL DEFAULT TRUE
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
revoked_at TIMESTAMPTZ NULL
```

Obmedzenia:

```text
UNIQUE(token_hash)
CHECK(max_uses > 0)
CHECK(used_count >= 0)
CHECK(used_count <= max_uses)
CHECK(expires_at > created_at)
```

Bezpečnostné pravidlá:

- do databázy ukladať iba hash tokenu,
- QR kód obsahuje jednorazovo zobrazený surový token alebo URL,
- token musí mať minimálne 128 bitov entropie,
- po exspirácii, dosiahnutí limitu použití alebo zrušení musí byť neplatný,
- prijatie pozvánky vykonať v jednej databázovej transakcii.

## 7.4 `team_membership_events`

Voliteľný audit zmien členstva bez tvorby verejnej histórie.

```text
team_membership_events
----------------------
id UUID PRIMARY KEY
team_id UUID NOT NULL REFERENCES teams(id) ON DELETE RESTRICT
user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT
performed_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT
event_type VARCHAR(20) NOT NULL
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

Hodnoty:

```text
ADDED
REMOVED
JOINED_BY_INVITE
```

Táto tabuľka je interný bezpečnostný audit. Nemusí byť verejne zobrazovaná ako história členstva.

---

# 8. Organizácie

## 8.1 `organizations`

Organizácia je vlastníkom turnajov.

```text
organizations
-------------
id UUID PRIMARY KEY
owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT
name VARCHAR(180) NOT NULL
slug CITEXT NOT NULL
description TEXT NULL
logo_url TEXT NULL
contact_email CITEXT NULL
is_active BOOLEAN NOT NULL DEFAULT TRUE
deleted_at TIMESTAMPTZ NULL
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

Obmedzenia:

```text
UNIQUE(slug)
```

Pravidlá:

- vlastník organizácie nemôže byť odstránený,
- vlastník organizácie nemôže stratiť vlastníctvo obyčajnou zmenou roly,
- používateľ môže vlastniť alebo spravovať viac organizácií,
- organizácia vytvára turnaj,
- konkrétny používateľ je evidovaný v `created_by_user_id` turnaja iba ako autor operácie.

## 8.2 `organization_members`

Členovia a administrátori organizácie.

```text
organization_members
--------------------
organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE
user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT
role VARCHAR(20) NOT NULL
added_by_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL
joined_at TIMESTAMPTZ NOT NULL DEFAULT now()
PRIMARY KEY(organization_id, user_id)
```

Obmedzenia:

```text
CHECK(role IN ('ADMIN', 'MEMBER'))
```

Indexy:

```text
INDEX(user_id)
INDEX(organization_id, role)
```

Pravidlá:

- vlastník nemusí byť duplicitne uložený v tejto tabuľke,
- vlastník má implicitne všetky oprávnenia,
- `ADMIN` môže vytvárať a upravovať turnaje organizácie,
- `ADMIN` môže pridávať a odoberať členov,
- `ADMIN` môže meniť rolu `MEMBER` a `ADMIN`,
- `ADMIN` nesmie meniť alebo odstrániť vlastníka,
- `MEMBER` nemá právo spravovať turnaje, pokiaľ mu nie je udelená rola `ADMIN`.

## 8.3 `organization_invites`

Pozvánky do organizácie.

```text
organization_invites
--------------------
id UUID PRIMARY KEY
organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE
invited_user_id UUID NULL REFERENCES users(id) ON DELETE CASCADE
invited_email CITEXT NULL
role VARCHAR(20) NOT NULL DEFAULT 'MEMBER'
token_hash VARCHAR(255) NOT NULL
created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT
expires_at TIMESTAMPTZ NOT NULL
accepted_at TIMESTAMPTZ NULL
revoked_at TIMESTAMPTZ NULL
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

Obmedzenia:

```text
UNIQUE(token_hash)
CHECK(role IN ('ADMIN', 'MEMBER'))
CHECK(invited_user_id IS NOT NULL OR invited_email IS NOT NULL)
```

---

# 9. Turnaje

## 9.1 `tournament_formats`

Rozšíriteľný číselník turnajových formátov.

```text
tournament_formats
------------------
id UUID PRIMARY KEY
code VARCHAR(50) NOT NULL
name VARCHAR(120) NOT NULL
is_active BOOLEAN NOT NULL DEFAULT TRUE
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

Obmedzenia:

```text
UNIQUE(code)
```

Počiatočné záznamy:

```text
SWISS
SINGLE_ELIMINATION
GROUPS_THEN_ELIMINATION
```

## 9.2 `tournaments`

Hlavná tabuľka turnajov.

```text
tournaments
-----------
id UUID PRIMARY KEY
organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT
sport_id UUID NOT NULL REFERENCES sports(id) ON DELETE RESTRICT
season_id UUID NULL REFERENCES seasons(id) ON DELETE SET NULL
format_id UUID NOT NULL REFERENCES tournament_formats(id) ON DELETE RESTRICT
created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT
name VARCHAR(180) NOT NULL
description TEXT NULL
participation_type VARCHAR(20) NOT NULL
status VARCHAR(30) NOT NULL DEFAULT 'DRAFT'
registration_starts_at TIMESTAMPTZ NULL
registration_ends_at TIMESTAMPTZ NULL
starts_at TIMESTAMPTZ NOT NULL
ends_at TIMESTAMPTZ NOT NULL
city VARCHAR(120) NOT NULL
location_details TEXT NULL
currency CHAR(3) NOT NULL DEFAULT 'EUR'
registration_fee NUMERIC(12, 2) NOT NULL DEFAULT 0
license_fee NUMERIC(12, 2) NOT NULL DEFAULT 0
is_public BOOLEAN NOT NULL DEFAULT TRUE
results_locked_at TIMESTAMPTZ NULL
finished_at TIMESTAMPTZ NULL
cancelled_at TIMESTAMPTZ NULL
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

Obmedzenia:

```text
CHECK(participation_type IN ('INDIVIDUAL', 'TEAM'))
CHECK(status IN (
    'DRAFT',
    'REGISTRATION_OPEN',
    'REGISTRATION_CLOSED',
    'IN_PROGRESS',
    'FINISHED',
    'CANCELLED'
))
CHECK(ends_at > starts_at)
CHECK(registration_starts_at IS NULL OR registration_ends_at IS NULL
      OR registration_ends_at > registration_starts_at)
CHECK(registration_ends_at IS NULL OR registration_ends_at <= starts_at)
CHECK(registration_fee >= 0)
CHECK(license_fee >= 0)
```

Indexy:

```text
INDEX(organization_id)
INDEX(sport_id)
INDEX(season_id)
INDEX(status)
INDEX(starts_at)
INDEX(city)
INDEX(sport_id, starts_at)
INDEX(organization_id, status)
```

Pravidlá:

- turnaj patrí organizácii,
- vytvoriť alebo upraviť turnaj môže vlastník alebo admin organizácie,
- turnaj je vždy pre jeden šport,
- turnaj je buď individuálny, alebo tímový,
- registrácia je otvorená pre každého oprávneného používateľa alebo tím,
- organizátor registráciu prijíma alebo odmieta,
- po `FINISHED` sú registrácie, zostavy, výsledky a poradie nemenné,
- výsledok ukončeného kola sa nesmie meniť.

## 9.3 `tournament_categories`

Kategórie jedného turnaja.

```text
tournament_categories
---------------------
id UUID PRIMARY KEY
tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE
name VARCHAR(120) NOT NULL
min_age INTEGER NULL
max_age INTEGER NULL
gender_requirement VARCHAR(20) NULL
max_entries INTEGER NULL
required_team_size INTEGER NULL
registration_fee_override NUMERIC(12, 2) NULL
license_fee_override NUMERIC(12, 2) NULL
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

Obmedzenia:

```text
UNIQUE(tournament_id, name)
CHECK(min_age IS NULL OR min_age >= 0)
CHECK(max_age IS NULL OR max_age >= 0)
CHECK(min_age IS NULL OR max_age IS NULL OR max_age >= min_age)
CHECK(max_entries IS NULL OR max_entries > 0)
CHECK(required_team_size IS NULL OR required_team_size > 0)
CHECK(gender_requirement IS NULL OR gender_requirement IN (
    'MALE',
    'FEMALE',
    'OTHER',
    'ANY'
))
CHECK(registration_fee_override IS NULL OR registration_fee_override >= 0)
CHECK(license_fee_override IS NULL OR license_fee_override >= 0)
```

Pravidlá:

- vek sa počíta k dátumu `tournaments.starts_at`,
- pri individuálnom turnaji musí byť `required_team_size IS NULL`,
- pri tímovom turnaji musí byť `required_team_size IS NOT NULL`,
- počet miest v turnaji je počet vstupov, nie počet všetkých hráčov,
- pri tímovom turnaji `max_entries` znamená maximálny počet tímov.

Ak turnaj nemá reálne kategórie, vytvor jednu implicitnú kategóriu, napríklad:

```text
OPEN
```

---

# 10. Registrácie a turnajoví účastníci

Pre zápasy, poradie a XP sa používa spoločná entita `tournament_entries`.

Jeden `tournament_entry` reprezentuje:

- jedného hráča v individuálnom turnaji,
- jeden súkromný tím v tímovom turnaji,
- jeden dočasný verejný tím v tímovom turnaji.

## 10.1 `tournament_entries`

```text
tournament_entries
------------------
id UUID PRIMARY KEY
tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE RESTRICT
category_id UUID NOT NULL REFERENCES tournament_categories(id) ON DELETE RESTRICT
entry_type VARCHAR(20) NOT NULL
registration_status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
registered_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT
accepted_by_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL
accepted_at TIMESTAMPTZ NULL
rejected_by_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL
rejected_at TIMESTAMPTZ NULL
rejection_reason TEXT NULL
removed_by_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL
removed_at TIMESTAMPTZ NULL
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

Obmedzenia:

```text
CHECK(entry_type IN ('INDIVIDUAL', 'TEAM'))
CHECK(registration_status IN (
    'PENDING',
    'ACCEPTED',
    'REJECTED',
    'CANCELLED',
    'REMOVED'
))
```

Indexy:

```text
INDEX(tournament_id)
INDEX(category_id)
INDEX(registration_status)
INDEX(tournament_id, registration_status)
```

Aplikačné pravidlá:

- `entry_type` musí zodpovedať `tournaments.participation_type`,
- kategória musí patriť tomu istému turnaju,
- registráciu môže schváliť alebo odmietnuť iba vlastník alebo admin organizácie,
- po začiatku turnaja sa nové registrácie štandardne nepovoľujú,
- po ukončení turnaja sa registrácia nesmie meniť.

## 10.2 `individual_tournament_entries`

Individuálny hráč prihlásený na turnaj.

```text
individual_tournament_entries
-----------------------------
entry_id UUID PRIMARY KEY REFERENCES tournament_entries(id) ON DELETE CASCADE
user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

Obmedzenia:

```text
UNIQUE(entry_id)
UNIQUE(user_id, entry_id)
```

Potrebný databázový alebo aplikačný invariant:

```text
jeden používateľ môže mať najviac jeden individuálny vstup v jednom turnaji
```

Odporúčaná denormalizácia pre bezpečné unikátne obmedzenie:

```text
tournament_id UUID NOT NULL
UNIQUE(tournament_id, user_id)
```

Ak sa `tournament_id` pridá, musí byť zhodný s `tournament_entries.tournament_id`.

## 10.3 `team_tournament_entries`

Tímový vstup do turnaja.

```text
team_tournament_entries
-----------------------
entry_id UUID PRIMARY KEY REFERENCES tournament_entries(id) ON DELETE CASCADE
persistent_team_id UUID NULL REFERENCES teams(id) ON DELETE RESTRICT
owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT
display_name VARCHAR(150) NOT NULL
is_public_team BOOLEAN NOT NULL DEFAULT FALSE
is_open_for_players BOOLEAN NOT NULL DEFAULT FALSE
roster_locked_at TIMESTAMPTZ NULL
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

Obmedzenia:

```text
CHECK(
    (is_public_team = TRUE AND persistent_team_id IS NULL)
    OR
    (is_public_team = FALSE AND persistent_team_id IS NOT NULL)
)
CHECK(is_open_for_players = FALSE OR is_public_team = TRUE)
```

Význam:

### Súkromný tím

```text
is_public_team = FALSE
persistent_team_id IS NOT NULL
```

- ide o trvalý tím z tabuľky `teams`,
- prihlásiť ho môže iba jeho vlastník,
- hráči sa kopírujú do turnajovej zostavy,
- tím získava vlastné XP.

### Verejný tím pre jeden turnaj

```text
is_public_team = TRUE
persistent_team_id IS NULL
```

- existuje iba ako tento turnajový vstup,
- nie je uložený v tabuľke `teams`,
- môže byť otvorený pre dopĺňanie hráčov,
- po skončení turnaja sa historická zostava nevymaže,
- v používateľskom rozhraní sa tím po turnaji nezobrazuje ako aktívny tím,
- verejný tím nemá dlhodobé tímové XP mimo tohto turnaja, pokiaľ sa neskôr nezavedie osobitný koncept konverzie na trvalý tím.

Dôležité rozhodnutie:

Dočasný verejný tím je historický turnajový účastník, ale nie je trvalý tím. Preto sa nezaradí do dlhodobého tímového rebríčka.

## 10.4 `tournament_entry_members`

Oficiálna zostava tímu na konkrétnom turnaji.

```text
tournament_entry_members
------------------------
id UUID PRIMARY KEY
tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE RESTRICT
entry_id UUID NOT NULL REFERENCES team_tournament_entries(entry_id) ON DELETE CASCADE
user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT
joined_at TIMESTAMPTZ NOT NULL DEFAULT now()
added_by_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL
removed_at TIMESTAMPTZ NULL
removed_by_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL
is_active BOOLEAN NOT NULL DEFAULT TRUE
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

Obmedzenia:

```text
UNIQUE(entry_id, user_id)
```

Kľúčový partial unique index:

```sql
CREATE UNIQUE INDEX uq_active_user_one_team_per_tournament
ON tournament_entry_members(tournament_id, user_id)
WHERE is_active = TRUE;
```

Pravidlá:

- jeden hráč môže byť v jednom turnaji iba v jednom tíme,
- pri verejnom tíme sa hráč môže pridať sám, ak:
  - tím je otvorený,
  - turnaj ešte nie je ukončený,
  - nie je prekročený `required_team_size`,
  - hráč spĺňa vekovú a prípadne rodovú kategóriu,
  - hráč ešte nie je v inom tíme v tom istom turnaji,
- pri súkromnom tíme mení zostavu vlastník tímu,
- po ukončení turnaja sa zostava zamkne,
- historické riadky sa po turnaji nemažú,
- `removed_at` a `is_active` umožnia evidovať konečnú zostavu bez fyzického vymazania.

## 10.5 Synchronizácia súkromného tímu s turnajovou zostavou

Pri prihlásení súkromného tímu:

1. vytvor `tournament_entry`,
2. vytvor `team_tournament_entry`,
3. skopíruj aktuálnych členov z `team_members` do `tournament_entry_members`,
4. over presný požadovaný počet členov,
5. over, že žiadny hráč nie je v inom tíme toho istého turnaja.

Pri neskoršej zmene `team_members`:

- zmenu synchronizuj do všetkých neukončených turnajov, kde je tím registrovaný,
- zmenu vykonaj v jednej transakcii,
- ak by synchronizácia porušila pravidlo jedného tímu na turnaj, zmenu odmietni,
- po stave `FINISHED` sa historická turnajová zostava už nemení.

---

# 11. Turnajové kolá a zápasy

## 11.1 `tournament_rounds`

```text
tournament_rounds
-----------------
id UUID PRIMARY KEY
tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE RESTRICT
category_id UUID NOT NULL REFERENCES tournament_categories(id) ON DELETE RESTRICT
round_number INTEGER NOT NULL
name VARCHAR(120) NULL
stage_type VARCHAR(30) NOT NULL
status VARCHAR(20) NOT NULL DEFAULT 'NOT_STARTED'
started_at TIMESTAMPTZ NULL
finished_at TIMESTAMPTZ NULL
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

Odporúčané hodnoty `stage_type`:

```text
SWISS
GROUP
ELIMINATION
```

Obmedzenia:

```text
UNIQUE(category_id, round_number, stage_type)
CHECK(round_number > 0)
CHECK(status IN ('NOT_STARTED', 'IN_PROGRESS', 'FINISHED'))
```

Pravidlá:

- po `FINISHED` sa výsledky zápasov v kole nesmú meniť,
- nové kolo sa môže generovať iba z konzistentných výsledkov predchádzajúceho kola,
- pri pavúku alebo swiss systéme párovanie vykonáva backend.

## 11.2 `tournament_groups`

Skupiny pre formát `GROUPS_THEN_ELIMINATION`.

```text
tournament_groups
-----------------
id UUID PRIMARY KEY
tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE RESTRICT
category_id UUID NOT NULL REFERENCES tournament_categories(id) ON DELETE RESTRICT
name VARCHAR(50) NOT NULL
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

Obmedzenia:

```text
UNIQUE(category_id, name)
```

## 11.3 `tournament_group_entries`

Priradenie účastníkov do skupín.

```text
tournament_group_entries
------------------------
group_id UUID NOT NULL REFERENCES tournament_groups(id) ON DELETE CASCADE
entry_id UUID NOT NULL REFERENCES tournament_entries(id) ON DELETE RESTRICT
seed INTEGER NULL
PRIMARY KEY(group_id, entry_id)
```

Potrebný invariant:

```text
jeden vstup môže byť v rámci jednej kategórie najviac v jednej skupine
```

## 11.4 `matches`

Zápas medzi dvoma turnajovými vstupmi.

```text
matches
-------
id UUID PRIMARY KEY
tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE RESTRICT
category_id UUID NOT NULL REFERENCES tournament_categories(id) ON DELETE RESTRICT
round_id UUID NOT NULL REFERENCES tournament_rounds(id) ON DELETE RESTRICT
group_id UUID NULL REFERENCES tournament_groups(id) ON DELETE SET NULL
participant_a_entry_id UUID NOT NULL REFERENCES tournament_entries(id) ON DELETE RESTRICT
participant_b_entry_id UUID NOT NULL REFERENCES tournament_entries(id) ON DELETE RESTRICT
score_a INTEGER NULL
score_b INTEGER NULL
tournament_points_a NUMERIC(8, 2) NULL
tournament_points_b NUMERIC(8, 2) NULL
result_type VARCHAR(30) NOT NULL DEFAULT 'NO_RESULT'
winner_entry_id UUID NULL REFERENCES tournament_entries(id) ON DELETE RESTRICT
status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED'
scheduled_at TIMESTAMPTZ NULL
finished_at TIMESTAMPTZ NULL
recorded_by_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

Obmedzenia:

```text
CHECK(participant_a_entry_id <> participant_b_entry_id)
CHECK(score_a IS NULL OR score_a >= 0)
CHECK(score_b IS NULL OR score_b >= 0)
CHECK(tournament_points_a IS NULL OR tournament_points_a >= 0)
CHECK(tournament_points_b IS NULL OR tournament_points_b >= 0)
CHECK(result_type IN (
    'PARTICIPANT_A_WIN',
    'PARTICIPANT_B_WIN',
    'DRAW',
    'NO_RESULT'
))
CHECK(status IN ('SCHEDULED', 'IN_PROGRESS', 'FINISHED', 'CANCELLED'))
```

Indexy:

```text
INDEX(tournament_id)
INDEX(category_id)
INDEX(round_id)
INDEX(participant_a_entry_id)
INDEX(participant_b_entry_id)
INDEX(status)
```

Aplikačné invarianty:

- obaja účastníci musia patriť do toho istého turnaja a kategórie,
- výsledok zapisuje iba vlastník alebo admin organizácie,
- pri `PARTICIPANT_A_WIN` musí byť `winner_entry_id = participant_a_entry_id`,
- pri `PARTICIPANT_B_WIN` musí byť `winner_entry_id = participant_b_entry_id`,
- pri `DRAW` musí byť `winner_entry_id IS NULL`,
- `score_a` a `score_b` sú počet gólov, bodov alebo iná číselná hodnota výkonu,
- `tournament_points_a` a `tournament_points_b` sú body do tabuľky turnaja, napríklad `3` a `0`,
- výsledok ukončeného kola sa nesmie meniť,
- XP sa počíta backendom, nie organizátorom.

## 11.5 `match_result_events`

Interný audit zapisovania výsledkov.

```text
match_result_events
-------------------
id UUID PRIMARY KEY
match_id UUID NOT NULL REFERENCES matches(id) ON DELETE RESTRICT
performed_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT
old_score_a INTEGER NULL
old_score_b INTEGER NULL
new_score_a INTEGER NULL
new_score_b INTEGER NULL
old_result_type VARCHAR(30) NULL
new_result_type VARCHAR(30) NULL
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

Aj keď sa výsledok po ukončení kola nemení, audit zachytí opravy vykonané pred uzamknutím kola.

---

# 12. Konečné poradie

## 12.1 `tournament_final_standings`

Konečné poradie účastníkov v kategórii.

```text
tournament_final_standings
--------------------------
id UUID PRIMARY KEY
tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE RESTRICT
category_id UUID NOT NULL REFERENCES tournament_categories(id) ON DELETE RESTRICT
entry_id UUID NOT NULL REFERENCES tournament_entries(id) ON DELETE RESTRICT
final_rank INTEGER NOT NULL
matches_played INTEGER NOT NULL DEFAULT 0
wins INTEGER NOT NULL DEFAULT 0
draws INTEGER NOT NULL DEFAULT 0
losses INTEGER NOT NULL DEFAULT 0
score_for INTEGER NOT NULL DEFAULT 0
score_against INTEGER NOT NULL DEFAULT 0
tournament_points NUMERIC(10, 2) NOT NULL DEFAULT 0
tie_break_data JSONB NULL
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

Obmedzenia:

```text
UNIQUE(category_id, entry_id)
UNIQUE(category_id, final_rank)
CHECK(final_rank > 0)
CHECK(matches_played >= 0)
CHECK(wins >= 0)
CHECK(draws >= 0)
CHECK(losses >= 0)
```

Pravidlá:

- konečné poradie vytvára backend po skončení turnaja alebo kategórie,
- organizátor môže poradie potvrdiť, ale nesmie ručne prideľovať XP,
- po uzamknutí výsledkov sa poradie nemení,
- `tie_break_data` uchová podrobnosti rozhodovania pri rovnosti bodov,
- XP môže zohľadniť výsledky zápasov aj konečné umiestnenie.

---

# 13. XP a rebríčky

XP je vždy oddelené podľa športu.

Hráč získava XP:

- v individuálnom turnaji podľa vlastných výsledkov,
- v tímovom turnaji podľa výsledkov tímu, za ktorý bol vedený v turnajovej zostave.

Trvalý súkromný tím získava vlastné tímové XP.

Dočasný verejný tím pre jeden turnaj nezískava dlhodobý tímový účet XP.

## 13.1 `player_sport_xp`

Aktuálne all-time XP hráča v športe.

```text
player_sport_xp
---------------
user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT
sport_id UUID NOT NULL REFERENCES sports(id) ON DELETE RESTRICT
xp NUMERIC(18, 4) NOT NULL DEFAULT 0
updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
PRIMARY KEY(user_id, sport_id)
```

Obmedzenia:

```text
CHECK(xp >= 0)
```

## 13.2 `player_season_xp`

Aktuálne sezónne XP hráča.

```text
player_season_xp
----------------
user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT
sport_id UUID NOT NULL REFERENCES sports(id) ON DELETE RESTRICT
season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE RESTRICT
xp NUMERIC(18, 4) NOT NULL DEFAULT 0
updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
PRIMARY KEY(user_id, season_id)
```

Invariant:

```text
season_id musí patriť k sport_id
```

## 13.3 `team_sport_xp`

All-time XP trvalého tímu.

```text
team_sport_xp
-------------
team_id UUID NOT NULL REFERENCES teams(id) ON DELETE RESTRICT
sport_id UUID NOT NULL REFERENCES sports(id) ON DELETE RESTRICT
xp NUMERIC(18, 4) NOT NULL DEFAULT 0
updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
PRIMARY KEY(team_id, sport_id)
```

## 13.4 `team_season_xp`

Sezónne XP trvalého tímu.

```text
team_season_xp
--------------
team_id UUID NOT NULL REFERENCES teams(id) ON DELETE RESTRICT
sport_id UUID NOT NULL REFERENCES sports(id) ON DELETE RESTRICT
season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE RESTRICT
xp NUMERIC(18, 4) NOT NULL DEFAULT 0
updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
PRIMARY KEY(team_id, season_id)
```

## 13.5 `player_xp_transactions`

Nemenný ledger zmien XP hráča.

```text
player_xp_transactions
----------------------
id UUID PRIMARY KEY
user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT
sport_id UUID NOT NULL REFERENCES sports(id) ON DELETE RESTRICT
season_id UUID NULL REFERENCES seasons(id) ON DELETE RESTRICT
tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE RESTRICT
match_id UUID NULL REFERENCES matches(id) ON DELETE RESTRICT
entry_id UUID NOT NULL REFERENCES tournament_entries(id) ON DELETE RESTRICT
xp_delta NUMERIC(18, 4) NOT NULL
all_time_xp_before NUMERIC(18, 4) NOT NULL
all_time_xp_after NUMERIC(18, 4) NOT NULL
season_xp_before NUMERIC(18, 4) NULL
season_xp_after NUMERIC(18, 4) NULL
reason_code VARCHAR(50) NOT NULL
formula_version VARCHAR(50) NOT NULL
calculation_data JSONB NULL
idempotency_key VARCHAR(120) NOT NULL
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

Obmedzenia:

```text
UNIQUE(idempotency_key)
CHECK(all_time_xp_after = all_time_xp_before + xp_delta)
```

Pravidlá:

- transakcie sa nesmú upravovať ani mazať,
- pri potrebe opravy vytvor kompenzačnú transakciu,
- `calculation_data` obsahuje vstupy vzorca, nie tajné údaje,
- `formula_version` umožní spätne vysvetliť výpočet,
- `idempotency_key` zabráni dvojitému prideleniu XP pri opakovanom spracovaní.

## 13.6 `team_xp_transactions`

Nemenný ledger zmien XP trvalého tímu.

```text
team_xp_transactions
--------------------
id UUID PRIMARY KEY
team_id UUID NOT NULL REFERENCES teams(id) ON DELETE RESTRICT
sport_id UUID NOT NULL REFERENCES sports(id) ON DELETE RESTRICT
season_id UUID NULL REFERENCES seasons(id) ON DELETE RESTRICT
tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE RESTRICT
match_id UUID NULL REFERENCES matches(id) ON DELETE RESTRICT
entry_id UUID NOT NULL REFERENCES tournament_entries(id) ON DELETE RESTRICT
xp_delta NUMERIC(18, 4) NOT NULL
all_time_xp_before NUMERIC(18, 4) NOT NULL
all_time_xp_after NUMERIC(18, 4) NOT NULL
season_xp_before NUMERIC(18, 4) NULL
season_xp_after NUMERIC(18, 4) NULL
reason_code VARCHAR(50) NOT NULL
formula_version VARCHAR(50) NOT NULL
calculation_data JSONB NULL
idempotency_key VARCHAR(120) NOT NULL
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

Obmedzenia:

```text
UNIQUE(idempotency_key)
CHECK(all_time_xp_after = all_time_xp_before + xp_delta)
```

## 13.7 Výpočet XP

XP počíta výhradne backend.

XP výpočet musí byť:

- deterministický,
- verzovaný,
- idempotentný,
- vykonaný v jednej databázovej transakcii,
- opakovateľný zo vstupných údajov uložených v `calculation_data`.

Odporúčaný proces po uzamknutí kola alebo turnaja:

1. zamkni relevantné riadky pomocou `SELECT ... FOR UPDATE`,
2. over, že XP ešte nebolo spracované,
3. vypočítaj XP,
4. vytvor XP transakciu,
5. aktualizuj all-time XP,
6. aktualizuj sezónne XP,
7. commitni celú operáciu naraz.

Organizátor nesmie manuálne zadávať hodnotu XP.

## 13.8 Rebríčky

Rebríčky sa nemusia ukladať ako samostatné tabuľky.

Vytvor databázové view alebo optimalizované query:

```text
player_all_time_rankings
player_season_rankings
team_all_time_rankings
team_season_rankings
```

Poradie:

```text
ORDER BY xp DESC
```

Pri rovnosti XP použi stabilné sekundárne kritérium, napríklad:

```text
updated_at ASC
user_id ASC
```

Odporúčané indexy:

```text
player_sport_xp(sport_id, xp DESC)
player_season_xp(season_id, xp DESC)
team_sport_xp(sport_id, xp DESC)
team_season_xp(season_id, xp DESC)
```

Ak bude objem dát vysoký, použi materialized view alebo samostatnú cache. Zdroj pravdy zostáva XP ledger a XP balance tabuľky.

---

# 14. Platby a licencie

## 14.1 `payments`

```text
payments
--------
id UUID PRIMARY KEY
payer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT
organization_id UUID NULL REFERENCES organizations(id) ON DELETE RESTRICT
tournament_id UUID NULL REFERENCES tournaments(id) ON DELETE RESTRICT
entry_id UUID NULL REFERENCES tournament_entries(id) ON DELETE RESTRICT
payment_type VARCHAR(40) NOT NULL
amount NUMERIC(12, 2) NOT NULL
currency CHAR(3) NOT NULL DEFAULT 'EUR'
status VARCHAR(30) NOT NULL DEFAULT 'PENDING'
provider VARCHAR(50) NULL
provider_payment_id VARCHAR(255) NULL
provider_customer_id VARCHAR(255) NULL
idempotency_key VARCHAR(120) NOT NULL
paid_at TIMESTAMPTZ NULL
failed_at TIMESTAMPTZ NULL
refunded_amount NUMERIC(12, 2) NOT NULL DEFAULT 0
metadata JSONB NULL
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

Obmedzenia:

```text
UNIQUE(idempotency_key)
UNIQUE(provider, provider_payment_id)
CHECK(amount >= 0)
CHECK(refunded_amount >= 0)
CHECK(refunded_amount <= amount)
CHECK(payment_type IN (
    'INDIVIDUAL_REGISTRATION_FEE',
    'TEAM_REGISTRATION_FEE',
    'PLAYER_LICENSE_FEE',
    'OTHER'
))
CHECK(status IN (
    'PENDING',
    'PROCESSING',
    'PAID',
    'FAILED',
    'CANCELLED',
    'REFUNDED',
    'PARTIALLY_REFUNDED'
))
```

Bezpečnostné pravidlá:

- nikdy neukladať číslo platobnej karty,
- nikdy neukladať CVV,
- stav `PAID` nastavovať iba na základe overeného webhooku platobnej služby alebo potvrdeného server-to-server volania,
- webhook musí overiť podpis,
- webhook musí byť idempotentný,
- klient nesmie poslať ľubovoľnú sumu; sumu vypočíta backend podľa turnaja a kategórie.

## 14.2 `user_licenses`

Flexibilný model licencie hráča.

```text
user_licenses
-------------
id UUID PRIMARY KEY
user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT
sport_id UUID NULL REFERENCES sports(id) ON DELETE RESTRICT
season_id UUID NULL REFERENCES seasons(id) ON DELETE RESTRICT
payment_id UUID NULL REFERENCES payments(id) ON DELETE SET NULL
valid_from TIMESTAMPTZ NOT NULL
valid_until TIMESTAMPTZ NOT NULL
is_active BOOLEAN NOT NULL DEFAULT TRUE
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

Obmedzenia:

```text
CHECK(valid_until > valid_from)
```

Poznámka:

Model podporuje:

- globálnu časovú licenciu,
- licenciu pre konkrétny šport,
- licenciu pre konkrétnu sezónu.

Presné obchodné pravidlá možno neskôr sprísniť bez zmeny základného modelu.

---

# 15. Achievementy

## 15.1 `achievements`

```text
achievements
------------
id UUID PRIMARY KEY
code VARCHAR(80) NOT NULL
name VARCHAR(150) NOT NULL
description TEXT NOT NULL
sport_id UUID NULL REFERENCES sports(id) ON DELETE SET NULL
is_active BOOLEAN NOT NULL DEFAULT TRUE
rule_type VARCHAR(50) NOT NULL
rule_config JSONB NOT NULL
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

Obmedzenia:

```text
UNIQUE(code)
```

## 15.2 `user_achievements`

```text
user_achievements
-----------------
id UUID PRIMARY KEY
user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT
achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE RESTRICT
tournament_id UUID NULL REFERENCES tournaments(id) ON DELETE SET NULL
awarded_at TIMESTAMPTZ NOT NULL DEFAULT now()
calculation_data JSONB NULL
```

Obmedzenia:

```text
UNIQUE(user_id, achievement_id, tournament_id)
```

---

# 16. Notifikácie

## 16.1 `notifications`

```text
notifications
-------------
id UUID PRIMARY KEY
user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
type VARCHAR(60) NOT NULL
title VARCHAR(180) NOT NULL
message TEXT NOT NULL
related_entity_type VARCHAR(50) NULL
related_entity_id UUID NULL
read_at TIMESTAMPTZ NULL
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

Indexy:

```text
INDEX(user_id, read_at)
INDEX(user_id, created_at DESC)
```

## 16.2 `push_notification_devices`

Push tokeny mobilných zariadení.

```text
push_notification_devices
-------------------------
id UUID PRIMARY KEY
user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
device_id_hash VARCHAR(255) NOT NULL
platform VARCHAR(20) NOT NULL
push_token_encrypted TEXT NOT NULL
is_active BOOLEAN NOT NULL DEFAULT TRUE
last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

Obmedzenia:

```text
UNIQUE(user_id, device_id_hash)
CHECK(platform IN ('IOS', 'ANDROID', 'WEB'))
```

Push token považuj za citlivý údaj. Nezapisuj ho do aplikačných logov.

---

# 17. Bezpečnostný audit

## 17.1 `security_audit_events`

Audit citlivých operácií.

```text
security_audit_events
---------------------
id UUID PRIMARY KEY
actor_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL
event_type VARCHAR(80) NOT NULL
entity_type VARCHAR(50) NULL
entity_id UUID NULL
ip_address INET NULL
user_agent TEXT NULL
metadata JSONB NULL
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

Zaznamenávať minimálne:

```text
USER_BLOCKED
USER_UNBLOCKED
USER_DELETED
ALL_SESSIONS_REVOKED
TEAM_OWNER_CHANGED
ORGANIZATION_CREATED
ORGANIZATION_ADMIN_ADDED
ORGANIZATION_ADMIN_REMOVED
TOURNAMENT_CREATED
TOURNAMENT_FINISHED
ROUND_FINISHED
PAYMENT_STATUS_CHANGED
XP_CALCULATED
```

Do `metadata` nevkladať:

- access token,
- refresh token,
- Google ID token,
- heslá,
- čísla platobných kariet,
- celé citlivé osobné údaje.

---

# 18. Povinné databázové invarianty

Codex musí implementovať alebo explicitne validovať nasledujúce pravidlá.

## 18.1 Používateľ

- Google `sub` je unikátny pre poskytovateľa.
- Nickname je globálne unikátny bez ohľadu na veľkosť písmen.
- Blokovaný alebo vymazaný používateľ sa nemôže prihlásiť.
- Blokovaný alebo vymazaný používateľ nemôže vytvárať tímy, organizácie ani registrácie.
- Vymazanie účtu nesmie poškodiť historické výsledky.

## 18.2 Tím

- Trvalý tím má presne jedného vlastníka.
- Iba vlastník upravuje členov.
- Tím nie je viazaný na šport.
- Člen môže byť v ľubovoľnom počte trvalých tímov.
- V jednom turnaji môže byť hráč iba v jednom tímovom vstupe.
- Verejný tím existuje iba ako `team_tournament_entry`.
- Verejný tím sa nesmie uložiť do `teams`.

## 18.3 Organizácia

- Turnaj vždy patrí jednej organizácii.
- Turnaj môže vytvoriť alebo upraviť iba vlastník alebo admin organizácie.
- Vlastníka organizácie nemožno odstrániť alebo degradovať.
- Používateľ môže byť členom viacerých organizácií.

## 18.4 Turnaj

- Turnaj patrí presne jednému športu.
- Turnaj je buď individuálny, alebo tímový.
- Zápasy môžu obsahovať iba vstupy z rovnakého turnaja a kategórie.
- Ukončené kolo je nemenné.
- Ukončený turnaj je nemenný.
- Organizátor zapisuje výsledky, ale neurčuje XP.
- Konečné poradie sa zachová.
- Pri vekovej kategórii sa vek počíta k dátumu začiatku turnaja.

## 18.5 XP

- XP sa počíta výhradne backendom.
- XP transakcie sú append-only.
- XP spracovanie je idempotentné.
- Hráč má oddelené XP pre každý šport.
- Trvalý tím má oddelené XP pre každý šport.
- Výsledok jedného tímu nemení XP iného tímu.
- Hráči tímu získajú hráčske XP za výsledok tímu, za ktorý boli evidovaní v turnajovej zostave.
- Dočasný verejný tím sa nezaraďuje do dlhodobého tímového rebríčka.

## 18.6 Platby

- Sumu určuje backend.
- Klient nesmie potvrdiť úspešnú platbu.
- Platobné webhooky musia byť overené a idempotentné.
- Platobné údaje kariet sa nesmú ukladať.

---

# 19. Transakčné operácie

Nasledujúce operácie musia prebehnúť v jednej databázovej transakcii.

## 19.1 Google login

1. over Google token,
2. nájdi alebo vytvor `user_auth_identity`,
3. nájdi alebo vytvor `user`,
4. vytvor alebo aktualizuj profil,
5. vytvor `auth_session`,
6. zapíš `auth_login_event`,
7. commit.

## 19.2 Obnova relácie

1. nájdi hash refresh tokenu,
2. zamkni reláciu,
3. over exspiráciu a zrušenie,
4. označ starý token ako rotovaný,
5. vytvor nový token,
6. pri reuse detekcii zruš celú rodinu,
7. commit.

## 19.3 Vstup do tímu cez QR

1. zamkni pozvánku,
2. over exspiráciu a počet použití,
3. over používateľa,
4. vytvor členstvo,
5. zvýš `used_count`,
6. synchronizuj neukončené turnajové zostavy,
7. commit.

## 19.4 Registrácia súkromného tímu

1. over vlastníka,
2. over turnaj a kategóriu,
3. over počet hráčov,
4. over jedinečnosť hráčov v turnaji,
5. vytvor entry,
6. vytvor team entry,
7. vytvor roster,
8. vytvor platobný záznam, ak je potrebný,
9. commit.

## 19.5 Pridanie hráča do verejného tímu

1. zamkni team entry,
2. over otvorenosť,
3. over kapacitu,
4. over kategóriu,
5. over, že hráč nie je v inom tíme turnaja,
6. vlož člena,
7. commit.

## 19.6 Uzamknutie kola

1. zamkni kolo,
2. over všetky zápasy,
3. nastav stav `FINISHED`,
4. vypočítaj príslušné XP,
5. vytvor XP transakcie,
6. aktualizuj XP balances,
7. vygeneruj ďalšie kolo, ak je potrebné,
8. commit.

## 19.7 Ukončenie turnaja

1. over ukončenie všetkých potrebných kôl,
2. vytvor konečné poradie,
3. vypočítaj finálne XP a achievementy,
4. zamkni turnajové zostavy,
5. nastav turnaj na `FINISHED`,
6. nastav `results_locked_at`,
7. commit.

---

# 20. API a autorizačné pravidlá

Databáza je zdroj pravdy, ale každá operácia musí byť autorizovaná v backend service vrstve.

Odporúčané pomocné autorizačné funkcie:

```text
is_active_user(user_id)
is_team_owner(user_id, team_id)
is_organization_owner(user_id, organization_id)
is_organization_admin(user_id, organization_id)
can_manage_tournament(user_id, tournament_id)
can_record_match_result(user_id, match_id)
can_join_public_team(user_id, entry_id)
```

Nikdy neprijímaj oprávnenie alebo rolu z klienta ako dôveryhodný údaj.

Nesprávne:

```json
{
  "user_id": "...",
  "is_admin": true
}
```

Správne:

- identitu používateľa získaj z overeného access tokenu,
- rolu načítaj z databázy,
- operáciu povoľ až po serverovej autorizácii.

---

# 21. Rate limiting a ochrana endpointov

Aplikačná vrstva musí zaviesť rate limiting minimálne pre:

- Google login callback,
- refresh token endpoint,
- vyhľadávanie podľa nickname,
- generovanie pozvánok,
- prijímanie pozvánok,
- registráciu na turnaj,
- platobné webhooky,
- zapisovanie výsledkov.

Vyhľadávanie podľa nickname:

- iba presná zhoda,
- obmedzený počet pokusov za minútu,
- nevracať informáciu, či účet existuje v odlišnom chybovom tvare, ak by to umožňovalo masové enumerovanie,
- výsledok nesmie obsahovať e-mail ani dátum narodenia.

---

# 22. Odporúčané poradie implementácie

## Fáza 1: identita a bezpečnosť

Implementovať ako prvé:

1. `users`,
2. `user_auth_identities`,
3. `user_profiles`,
4. `user_privacy_settings`,
5. `auth_sessions`,
6. `auth_login_events`,
7. Google login,
8. access/refresh token rotáciu,
9. logout jedného zariadenia,
10. logout všetkých zariadení,
11. blokovanie účtu.

Táto fáza je najvyššia priorita.

## Fáza 2: športy, tímy a organizácie

1. `sports`,
2. `seasons`,
3. `teams`,
4. `team_members`,
5. `team_invites`,
6. `organizations`,
7. `organization_members`,
8. autorizačné pravidlá.

## Fáza 3: turnaje a registrácie

1. `tournament_formats`,
2. `tournaments`,
3. `tournament_categories`,
4. `tournament_entries`,
5. individuálne vstupy,
6. tímové vstupy,
7. turnajové zostavy,
8. verejné turnajové tímy,
9. schvaľovanie registrácií.

## Fáza 4: zápasy a poradie

1. kolá,
2. skupiny,
3. zápasy,
4. výsledky,
5. uzamknutie kola,
6. konečné poradie.

## Fáza 5: XP, rebríčky, platby a notifikácie

1. XP balances,
2. XP ledger,
3. sezónne rebríčky,
4. all-time rebríčky,
5. platby,
6. licencie,
7. achievementy,
8. notifikácie.

---

# 23. Povinné testy

## 23.1 Autentifikácia

- nový Google používateľ sa vytvorí iba raz,
- rovnaký Google `sub` nikdy nevytvorí druhý účet,
- zmena Google e-mailu nevytvorí nový účet,
- refresh token sa po použití otočí,
- starý refresh token nemožno použiť druhýkrát,
- reuse starého tokenu zruší celú rodinu,
- blokovaný používateľ nedostane nový access token,
- odhlásenie jedného zariadenia nezruší ostatné,
- odhlásenie všetkých zariadení zruší všetky relácie,
- mobilná relácia prežije reštart aplikácie,
- webová relácia prežije zatvorenie prehliadača podľa životnosti cookie.

## 23.2 Tímy

- iba vlastník pridá alebo odstráni člena,
- QR token sa nedá použiť po exspirácii,
- QR token sa nedá použiť nad limit použití,
- používateľ môže byť v niekoľkých trvalých tímoch,
- používateľ nemôže byť v dvoch tímoch rovnakého turnaja,
- verejný tím nevytvorí riadok v `teams`,
- historická turnajová zostava zostane po skončení turnaja.

## 23.3 Organizácie

- member nemôže vytvoriť turnaj,
- admin môže vytvoriť turnaj,
- admin nemôže odstrániť vlastníka,
- používateľ môže byť adminom vo viacerých organizáciách.

## 23.4 Turnaje

- individuálny hráč sa nemôže registrovať dvakrát,
- tím nemôže prekročiť požadovaný počet hráčov,
- veková kategória sa kontroluje k dátumu turnaja,
- výsledok ukončeného kola nemožno zmeniť,
- ukončený turnaj nemožno upraviť,
- zápas nemôže obsahovať účastníkov z rozdielnych kategórií.

## 23.5 XP

- opakované spracovanie rovnakého zápasu nepridá XP dvakrát,
- hráčske XP sa pridá iba hráčom príslušnej turnajovej zostavy,
- tímové XP sa pridá iba správnemu trvalému tímu,
- XP jedného športu nemení XP iného športu,
- sezónne XP nemení historickú sezónu,
- kompenzačná transakcia správne opraví chybu bez mazania ledgeru.

## 23.6 Platby

- klient nemôže zmeniť sumu,
- neoverený webhook nezmení platbu,
- duplicitný webhook nevytvorí druhú platbu,
- stav `PAID` vytvorí príslušné oprávnenie alebo registráciu iba raz.

---

# 24. Minimálny ER prehľad

```text
users
 ├── user_auth_identities
 ├── user_profiles
 ├── user_privacy_settings
 ├── auth_sessions
 ├── team_members
 ├── organization_members
 ├── individual_tournament_entries
 ├── tournament_entry_members
 ├── player_sport_xp
 ├── player_season_xp
 └── player_xp_transactions

sports
 ├── seasons
 ├── tournaments
 ├── player_sport_xp
 ├── player_season_xp
 ├── team_sport_xp
 └── team_season_xp

teams
 ├── team_members
 ├── team_invites
 ├── team_tournament_entries
 ├── team_sport_xp
 ├── team_season_xp
 └── team_xp_transactions

organizations
 ├── organization_members
 ├── organization_invites
 └── tournaments

tournaments
 ├── tournament_categories
 ├── tournament_entries
 ├── tournament_rounds
 ├── tournament_groups
 ├── matches
 ├── tournament_final_standings
 ├── payments
 ├── player_xp_transactions
 └── team_xp_transactions

tournament_entries
 ├── individual_tournament_entries
 ├── team_tournament_entries
 ├── matches
 └── tournament_final_standings

team_tournament_entries
 └── tournament_entry_members
```

---

# 25. Záverečné implementačné požiadavky pre Codex

Codex musí:

1. vytvoriť SQLAlchemy modely,
2. vytvoriť Alembic migrácie,
3. vytvoriť všetky unikátne obmedzenia, `CHECK` obmedzenia a indexy,
4. vytvoriť seed pre športy a turnajové formáty,
5. implementovať Google login bezpečne podľa tohto dokumentu,
6. implementovať vlastné access a rotačné refresh tokeny,
7. ukladať iba hash refresh tokenu,
8. zabezpečiť dlhodobé prihlásenie na mobile aj webe,
9. nepovoliť priamy prístup klienta do databázy,
10. implementovať service vrstvu s transakciami,
11. implementovať autorizačné kontroly podľa vlastníctva a členstva,
12. implementovať soft delete historických entít,
13. implementovať idempotentný XP ledger,
14. implementovať idempotentné platby,
15. doplniť unit testy a integračné testy,
16. zdokumentovať všetky endpointy v API dokumentácii,
17. nevytvárať endpointy, ktoré umožnia hromadné listovanie používateľov,
18. nevystavovať e-mail, refresh token, Google token ani dátum narodenia vo verejnom API,
19. nepoužívať e-mail ako identifikátor Google účtu,
20. pred dokončením skontrolovať, že blokovanie účtu okamžite zruší všetky aktívne relácie.

Najvyššia priorita celého projektu je správna implementácia:

```text
Google identity
    +
bezpečná aplikačná session
    +
rotačný refresh token
    +
bezpečné uloženie tokenu na zariadení
    +
stabilné používateľské dáta
```

Bez dokončenia a otestovania tejto časti sa nemá pokračovať na platby ani produkčné nasadenie.
