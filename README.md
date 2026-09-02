# Alterbake Akademia

Otwarta nauka rzemiosła piekarskiego i cukierniczego + test rozwoju osobistego
(Work Profile). Ucz się dobrowolnie, we własnym tempie, na własnym telefonie.

- **`/akademia-kurs.html`** — kurs rzemiosła: 26 modułów, wykład z parametrami,
  diagnostyką i ćwiczeniem, plus quiz. Jeden plik, działa offline.
- **`/`** — starsza aplikacja nauki (panel React).
- **`/test/`** — test Profil Pracy / Mapa Potencjału.
- **`/mistrz.html`** — 14 mikro-lekcji Mistrza: decyzje, komunikacja,
  odpowiedzialność i próby zachowania, opcjonalnie dobierane z Mapy Potencjału.

Postęp zapisuje się **wyłącznie w Twojej przeglądarce**, pod kluczami
`akademia_*`. Nie jest nigdzie wysyłany i nikt go nie widzi.

Wersja publiczna, uogólniona: uczy rzemiosła, nie organizacji konkretnego
zakładu. Treść operacyjna piekarni pozostaje prywatna.

## Skąd się bierze zawartość

To repozytorium jest **celem publikacji**, nie miejscem pracy. Wszystko
powstaje w prywatnym monorepo `alterbake-os` i trafia tu przez strażnika:

```bash
# w alterbake-os
node tools/buduj-kurs-jednoplikowy.mjs     # kurs z materiałów, pytań i słownika
node tools/build-akademia.mjs ../alterbake-akademia   # skan prywatności → kopia
```

`build-akademia.mjs` najpierw **skanuje** treść pod kątem sekretów, adresów
wdrożeń, cen i prywatnych kluczy localStorage — i kopiuje dopiero po czystym
skanie. Generator kursu dodatkowo **przerywa budowę**, gdy do wersji publicznej
wsiąkłaby nazwa naszego pieca, wewnętrzne oznaczenie dokumentu albo kwota.

**Nie edytuj plików w `site/` ręcznie i nie wgrywaj ich przez przeglądarkę.**
Do 29.08.2026 tak właśnie powstawały — i przez jedną dobę istniały dwie różne
wersje tych samych 26 modułów, bo nic ich ze sobą nie porównywało.

## Publikacja

`.github/workflows/pages.yml` wdraża katalog **`site/`** na GitHub Pages przy
każdym pushu na `main`. Reszta repozytorium (README) nie jest serwowana.
