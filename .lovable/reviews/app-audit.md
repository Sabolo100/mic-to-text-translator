# Alkalmazásellenőrzés – 2026. november 25.

## Ellenőrzött működés

- Élő Chrome-próba valódi szolgáltatáshívásokkal, angol teszthanggal: beszédfelismerés és magyar fordítás megjelent a képernyőn.
- Felvétel közbeni diafeltöltés: az olvasható eredeti és magyar diaszöveg megjelent, a felvétel folytatódott.
- Szövegszépítés és tényleges TXT-letöltés: az eredeti beszéd, fordítás és dia bekerült a fájlba.
- Dia törlése, nyelvválasztás, naplómásolás és újratöltés utáni naplómegőrzés kipróbálva.
- Mobilméretű (390×844) és asztali (1440×1000) megjelenítés: nem volt vízszintes túlcsordulás vagy futási hiba.
- Szimulált egyenleghiány: a felvétel leállt, a felismert szöveg megmaradt, nem indult ismételt automatikus kérés.
- Szimulált szépítési hiba: figyelmeztetés mellett a nyers szöveg letöltődött.
- 13 automatizált regressziós teszt sikeres; kódellenőrzés: 0 hiba, 7 meglévő fejlesztői gyorsfrissítési figyelmeztetés; az automatikus fordításellenőrzés sikeres.

## Javítások

- Teljes, különálló hangfájl minden szakaszhoz; nincs időzített újraindítás miatti állapotkeveredés.
- Soros, korlátozott memóriaigényű hangfeldolgozás, rögzített nyelvekkel.
- A leállítás megvárja az utolsó hangszakaszt; letöltés csak a feldolgozás befejezése után indítható.
- Támogatott hangformátum kiválasztása és továbbítása, csendes szakaszok kihagyása.
- Strukturált AI-válaszok és JSON-sztringek olvasható formázása.
- Érthető szolgáltatáshibák; a sikeres beszédfelismerés fordítási hiba esetén sem vész el.
- A képkezelés megvárja a korábbi hangfeldolgozás befejezését, felszabadítja a képerőforrásokat.
- Hibanapló az alkalmazás hibaképernyőjétől függetlenül, a lap újratöltése után is hozzáférhető.
- A régi AI-modellazonosító a hitelesített katalógus szerinti aktuális azonosítóra javítva; hívások a támogatott SDK-val.

## Korlátok

- Fizikai Android-készüléken a kamerát és a hosszú ideig tartó felvételt nem teszteltük; a mobilpróba asztali Chromium telefonméretű nézetében futott.
- A diafeldolgozás idejére a hangrögzítés ténylegesen szünetel a mobilmemória védelmében: az eközben elhangzó beszéd nem kerül rögzítésre.
- A fordítás mondatszakaszokban érkezik, nem szavankénti streaming; a hálózat és az AI sebessége befolyásolja a késést.
- A próbában szintetikus, ismétlődő teszthang szerepelt; a beszédfelismerés és a fordítás tartalmi pontossága nem garantált, rövid töredékeknél félrehallás előfordult.
- A szövegek és diák újratöltéskor továbbra is törlődnek; csak a hibanapló marad meg ugyanazon böngészőlapon. A beszélgetés megőrzéséhez TXT-letöltés szükséges.
- A biztonsági panel jelzi, hogy a kiszivárgott jelszavak szűrése nincs bekapcsolva. Az alkalmazás jelenleg nem tartalmaz bejelentkezést; a hitelesítési beállításokat ez az ellenőrzés nem módosította.
- Az alkalmazás nyilvánosan hívható AI-funkciói hitelesítést és használati korlátozásokat nem kaptak; nyilvános megosztáskor ez költségkockázat. Ennek lezárása a bejelentkezési folyamat külön megtervezését igényli.