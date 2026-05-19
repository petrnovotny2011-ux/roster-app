# ROSTERapp
Jednoduchý nástroj pro správu FAČR soupisky se zaměřením na mládež.  
Zobrazuje počty hráčů dle věkových kategorií pro různé ročníky soutěží.

<img width="1920" height="1032" alt="image" src="https://github.com/user-attachments/assets/bbf0b6ac-922f-4581-9757-543cd91d3b96" />

---

### Obecné funkce
- U každého hráče lze jednoduše měnit **aktivní stav**, nebo přidat poznámku.
- Hráče lze filtrovat podle:
  - věkových kategorií  
  - pohlaví  
  - aktivního stavu
  - expirovaná fotografie
 
<img width="627" height="489" alt="rect5029" src="https://github.com/user-attachments/assets/0e6ae344-ddc5-4fee-b7f9-9f8458e75fb2" />

---

## 📖 Návod
1. [Import / Export / Mazání dat](#1-import--export--mazání-dat)
2. [Merge tool](#2-merge-tool)
3. [Editor kategorií](#3-editor-kategorií)

---

## 1. Import / Export / Mazání dat

### Funkce panelu
<img width="542" height="42" alt="image" src="https://github.com/user-attachments/assets/208f4ce5-d90c-4bf9-8cb6-add5f671863a" />

1. **Nahrání klubových dat z FAČR**  
   Soubor získáš na:  
   https://is.fotbal.cz/public/hraci/hraci-prehled/?sport=fotbal

2. **Export dat z aplikace**  
   Uloží aktuální seznam hráčů.

3. **Nahrání dat do aplikace**
   Nahrání seznamu
   Existující data budou přepsána.

4. **Vymazání dat**  
   Odstraní všechna uložená data z aplikace.

Pozn.: Není povoleno importovat hráče bez ID

---

## 2. Merge tool

<img width="1920" height="1032" alt="image" src="https://github.com/user-attachments/assets/febdb134-e324-432b-bc4f-fca11ec25af9" />

<img width="1920" height="1032" alt="image" src="https://github.com/user-attachments/assets/ba13561f-c324-4a13-af75-c0fa4c7baf90" />

Merge nástroj umožňuje:

- porovnat aktuální data s nově nahraným souborem
- zobrazit rozdíly (noví hráči, změny, chybějící hráči)
- odstranit hráče, kteří se nenachází v souboru
- doplnit chybějící data (id, pohlaví)
- potvrdit, které změny se mají aplikovat  
- zabránit přepsání existujících dat bez kontroly

**Hint:**  
Ve FAČR IS exportuj oddělené soubory s muži a ženami.  
Následně při nahrávání můžeš využít hromadnou úpravu pohlaví.

---

## 3. Editor kategorií

<img width="1920" height="1032" alt="image" src="https://github.com/user-attachments/assets/122c58aa-4723-4399-b1ad-4e826265315b" />

Editor kategorií se otevře tlačítkem **„Nastavení“** a umožňuje:

- Přidat nebo odebrat soutěžní ročník
- Přidat nebo odebrat věkové kategorie
- Upravit ročníky spadající do jednotlivých kategorií
- Export a import souboru s nastavením
  
---


