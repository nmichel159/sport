# Databázová schéma

Každý SQL súbor obsahuje definície tabuliek jednej oblasti aplikácie:

- `identity.sql` — používateľ, profil, Google identity a relácie
- `catalogs.sql` — športy, sezóny a formáty turnajov
- `teams.sql` — trvalé tímy, členovia a pozvánky
- `organizations.sql` — organizácie a ich členovia
- `tournaments.sql` — turnaje, registrácie, zostavy, kolá, skupiny, zápasy a poradie
- `xp.sql` — XP zostatky a nemenné XP ledgery
- `payments.sql` — platby a licencie
- `engagement.sql` — achievementy, notifikácie a bezpečnostný audit

Súbory vykoná migrácia `0002_create_sport_schema.py` pri vytváraní novej databázy.
Po nasadení nemeníme už vykonanú migráciu: každá následná zmena patrí do novej Alembic migrácie.
