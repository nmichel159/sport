"""Generate API catalog files from the supplied Ministry school export.

Run from backend: ``python scripts/build_catalogs.py``.  The generated JSON
files are committed/deployed with the API, so the mobile app never downloads
the source CSV and only refreshes when the catalog version changes.
"""
import csv
import json
from pathlib import Path

root = Path(__file__).resolve().parents[2]
source = root / "data" / "dataset.csv"
target = root / "backend" / "app" / "catalog_data"
target.mkdir(exist_ok=True)

with source.open(encoding="utf-8-sig", newline="") as file:
    reader = csv.DictReader(file, delimiter=";")
    schools = [
        {
            "code": row["Kód školy"],
            "edu_id": row["EDUID"],
            "name": row["Názov"],
            "street": row["Ulica"],
            "municipality": row["Obec"],
        }
        for row in reader
        if row["Kód školy"] and row["Názov"]
    ]
schools.sort(key=lambda item: (item["municipality"], item["name"]))

# Seats of all 79 Slovak districts.  ``district`` disambiguates city districts
# in Bratislava and Košice while ``name`` is the selectable district city.
district_cities = [
    ["Banská Bystrica", "Banská Bystrica"], ["Banská Štiavnica", "Banská Štiavnica"], ["Bardejov", "Bardejov"], ["Bratislava I", "Bratislava"], ["Bratislava II", "Bratislava"], ["Bratislava III", "Bratislava"], ["Bratislava IV", "Bratislava"], ["Bratislava V", "Bratislava"], ["Brezno", "Brezno"], ["Bytča", "Bytča"], ["Čadca", "Čadca"], ["Detva", "Detva"], ["Dolný Kubín", "Dolný Kubín"], ["Dunajská Streda", "Dunajská Streda"], ["Galanta", "Galanta"], ["Gelnica", "Gelnica"], ["Hlohovec", "Hlohovec"], ["Humenné", "Humenné"], ["Ilava", "Ilava"], ["Kežmarok", "Kežmarok"], ["Košice I", "Košice"], ["Košice II", "Košice"], ["Košice III", "Košice"], ["Košice IV", "Košice"], ["Košice-okolie", "Košice"], ["Komárno", "Komárno"], ["Krupina", "Krupina"], ["Kysucké Nové Mesto", "Kysucké Nové Mesto"], ["Levice", "Levice"], ["Levoča", "Levoča"], ["Liptovský Mikuláš", "Liptovský Mikuláš"], ["Lučenec", "Lučenec"], ["Malacky", "Malacky"], ["Martin", "Martin"], ["Medzilaborce", "Medzilaborce"], ["Michalovce", "Michalovce"], ["Myjava", "Myjava"], ["Námestovo", "Námestovo"], ["Nitra", "Nitra"], ["Nové Mesto nad Váhom", "Nové Mesto nad Váhom"], ["Nové Zámky", "Nové Zámky"], ["Partizánske", "Partizánske"], ["Pezinok", "Pezinok"], ["Piešťany", "Piešťany"], ["Poltár", "Poltár"], ["Poprad", "Poprad"], ["Považská Bystrica", "Považská Bystrica"], ["Prešov", "Prešov"], ["Prievidza", "Prievidza"], ["Púchov", "Púchov"], ["Revúca", "Revúca"], ["Rimavská Sobota", "Rimavská Sobota"], ["Rožňava", "Rožňava"], ["Ružomberok", "Ružomberok"], ["Sabinov", "Sabinov"], ["Senec", "Senec"], ["Senica", "Senica"], ["Skalica", "Skalica"], ["Snina", "Snina"], ["Sobrance", "Sobrance"], ["Spišská Nová Ves", "Spišská Nová Ves"], ["Stará Ľubovňa", "Stará Ľubovňa"], ["Stropkov", "Stropkov"], ["Svidník", "Svidník"], ["Šaľa", "Šaľa"], ["Topoľčany", "Topoľčany"], ["Trebišov", "Trebišov"], ["Trenčín", "Trenčín"], ["Trnava", "Trnava"], ["Turčianske Teplice", "Turčianske Teplice"], ["Tvrdošín", "Tvrdošín"], ["Veľký Krtíš", "Veľký Krtíš"], ["Vranov nad Topľou", "Vranov nad Topľou"], ["Zlaté Moravce", "Zlaté Moravce"], ["Zvolen", "Zvolen"], ["Žarnovica", "Žarnovica"], ["Žiar nad Hronom", "Žiar nad Hronom"], ["Žilina", "Žilina"]
]
district_cities.append(["Bánovce nad Bebravou", "Bánovce nad Bebravou"])
district_items = [{"id": district.lower().replace(" ", "-").replace("ľ", "l").replace("š", "s").replace("č", "c").replace("ž", "z").replace("á", "a").replace("é", "e").replace("í", "i").replace("ý", "y").replace("ô", "o").replace("ä", "a"), "district": district, "name": name} for district, name in district_cities]

for name, items in (("schools", schools), ("district-cities", district_items)):
    (target / f"{name}.json").write_text(json.dumps(items, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
