# Formulárové pravidlá

- Dátum sa vždy vyberá kliknutím na deň, mesiac a rok; nepoužívame textové dátumové polia.
- Katalógové hodnoty (škola, mesto, šport a podobne) sú platné iba po voľbe zo zoznamu.
- Pri začatí nového písania sa predošlá voľba zruší a hľadanie začína prázdnym dotazom.
- Používame zdieľané komponenty `ClickDateField`, `ValidatedCatalogInput` a `DatePickerModal`; ich logiku nekopírujeme do obrazoviek.
- Do systémových častí aplikácie (prihlásenie, navigácia, oprávnenia, Android/iOS konfigurácia, build a databázové napojenie) zasahujeme iba vtedy, keď je to nevyhnutné pre zadanú úlohu. Zmena má byť čo najmenšia a nesmie meniť nesúvisiace správanie obrazoviek.
- Pred odovzdaním systémovej zmeny overíme konkrétny tok, ktorý môže ovplyvniť (napríklad Android bundling po úprave mobilného kódu alebo build po úprave webu). Pri natívnej konfigurácii jasne uvedieme, že vyžaduje nový build.
- Starý alebo neaktívny kód pri nahradení komponentu nemažeme ani nepremenúvame narýchlo: najprv overíme výskyty a výsledný bundling, aby nevznikli duplicitné deklarácie alebo prerušený tok aplikácie.
- Formuláre v aplikácii umiestňujeme spravidla až do detailu konkrétnej položky. Samotné zadávanie zobrazujeme v modálnom/vyskakovacom okne, aby zoznam alebo detail ostal prehľadný. Výnimku použijeme len tam, kde je formulár hlavnou náplňou samostatnej obrazovky.
