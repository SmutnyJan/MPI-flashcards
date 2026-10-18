# MPI kartičky – lokální aplikace

Jednoduchá aplikace HTML/CSS/JS. **Žádný GitHub Pages, GitHub API, cloud, nahrávání ani tlačítko pro výběr souborů.** Obrázky jsou ve tvém repozitáři vedle aplikace. Pro samotné procvičování není třeba internet.

## Struktura

```text
mpi-karticky-lokalni/
├── index.html
├── style.css
├── app.js
├── images.js                 ← seznam obrázků
├── update_images.py          ← volitelný generátor seznamu
└── images/
    ├── definition_1.png
    ├── definition_1_blurred.png
    ├── definition_2.png
    └── definition_2_blurred.png
```

## Přidání definic

1. Vlož dvě verze každé definice do `images/` (např. `definition_1.png` a `definition_1_blurred.png`). Přípona obou souborů musí být stejná. Podporované přípony: PNG, JPG, JPEG, WebP, GIF, AVIF, SVG.
2. Do `images.js` přidej **pouze úplnou verzi**, např. `"definition_1.png",`. Ke každé úplné verzi aplikace automaticky použije soubor se suffixem `_blurred`.
3. Normálně si změny commitni a pushni; pokud si repozitář synchronizuješ s telefonem, převezmeš tak celý obsah.

Pokud nechceš názvy zapisovat ručně, spusť na počítači ze složky repozitáře `python update_images.py`. Skript projde všechny obrázky, najde dvojice a přegeneruje soubor `images.js`. Skript je **nepovinný**. Změněný `images.js` dej do commitu spolu s obrázky.

## Použití

Otevři `index.html` v prohlížeči, který umí zobrazit lokální HTML včetně relativně odkazovaných souborů (na mobilu záleží na operačním systému a aplikaci, přes kterou HTML otevřeš). V některých mobilních prohlížečích je lokální `file://` omezené; v tom případě použij libovolný **lokální** statický HTTP server, ne GitHub Pages. HTML náhled přímo v GitHub aplikaci nemusí spouštět JavaScript.

- **Otočit kartu** → odhalit řešení / zase skrýt.
- **Další náhodná** → náhodná karta bez opakování v kole.
- **Kliknutí na obrázek** → celoobrazovkové zobrazení. Přiblížení dvěma prsty nebo tlačítky, posouvání tahem.
- **Klávesnice**: mezerník otočí, šipka doprava další, Escape zavře náhled.

### Proč existuje images.js?

Běžný statický HTML/JS nemůže při lokálním otevření bez povolení prohlížeče získat seznam souborů z adresáře. **Jednotlivé obrázky ze složky ale načítat může.** Proto aplikace používá pouze malý lokální seznam názvů; nesnaží se číst GitHub a nemá žádný formulář pro import.
