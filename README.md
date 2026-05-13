# roster-app
Jednoduchý offline tool pro správu soupisky FAČR klubu, se zaměřením na mládež, zobrazující počty hráčů dle věkových kategorií pro různé ročníky soutěží.

<img width="1920" height="942" alt="image" src="https://github.com/user-attachments/assets/e51e051f-b870-4f36-bc09-46098d8c0aae" />

 # NÁVOD
* Jdi na https://is.fotbal.cz/public/hraci/hraci-prehled/%3Fsport=fotbal
* Vyfiltruj si hráče dle potřeb (vyber svůj klub, případně i další proměnné) a exportuj xlsx soubor
* Otevři soubor RosterApp.html a v horním menu klikni na "Nahrát xlsx" a nahraj soubor, který jsi získal v předchozím bodě
* "Export hráčů" vytvoří datový soubor json, který je možné následně opět nahrát
* Data jsou uložena v local storage prohlížeče (omezená velikost - cca do 10MB), dokud je uživatel nevymaže pomocí tlačítka "Vymazat data"
* Kromě poznámky je možné jednolivým hráčům měnit Aktivní stav, ten je následně možné využít k vyfiltrování pouze aktivních hráčů
* Hráče je možné filtrovat také dle věkových kategorií, či pohlaví
* Pro úpravu kategorií otevři "Nastavení"

<img width="627" height="489" alt="rect5029" src="https://github.com/user-attachments/assets/c676224b-2f5b-4d49-a423-18b46d6a3a69" />

# Poznámka
Export z IS FAČR neobsahuje ID neaktivních hráčů, nahrání hráčů bez ID není v aplikaci dovoleno. V případě potřeby je nutné ID doplnit ručně (možno přímo v aplikaci)


