/* PROFIL ALTERBAKE — punktacja.
   ------------------------------------------------------------------
   Wydzielona z monolitów HTML dwóch dawnych testów (Mapa Potencjału,
   Profil Pracy), które liczyły wynik w skryptach inline BEZ ANI JEDNEGO
   TESTU — obok w pełni przetestowanego konsumenta w Panelu
   (redteam M-07, `[wewn.]`).

   Wzorzec UMD jak `[wewn.]`: działa jako klasyczny
   <script> (nadaje window.ProfilScoring) i jako moduł w Node (testy).

   Co ta fuzja bierze z którego testu (decyzja właściciela 18.08.2026, 4A):
   - z Mapy Potencjału: pozycje odwrócone, wykrywanie sprzeczności
     i tiebreakery, ocena wiarygodności, wymiary charakteru,
   - z Profilu Pracy: scenariusze sytuacyjne (SJT) i pytania otwarte,
     oraz raportowanie w 8 obszarach w skali 0–100,
   - M-10 miało odciąć „Uczciwość" i „Rozwiązywanie problemów" od talentów,
     które mierzą co innego, i liczyć je WYŁĄCZNIE ze scenariuszy. Redteam
     03.09.2026 znalazł, że intencja nigdy nie doszła do `MAPOWANIE_OBSZAROW`
     w `[wewn.]`: oba obszary miały
     niepuste listy `talenty` (odpowiedzialnosc/rozwaga; structure/
     analitycznosc/planowanie), więc `policzObszary()` niżej mieszała je
     ze scenariuszami jak każdy inny obszar — 03.09.2026 przez ~7 dni.
     Piotr rozstrzygnął tego samego dnia (wariant A): wrócić do czystych
     scenariuszy. Naprawione w `tresc-profilu.mjs` (`talenty: []` dla obu),
     nie tutaj — ta funkcja już miała właściwą gałąź (`!lista.length`),
     czekała tylko na puste dane. Talenty odpowiedzialnosc/rozwaga/
     structure/analitycznosc/planowanie nadal liczą się i pokazują osobno
     w sekcji talentów — zmiana odcina je wyłącznie od tych dwóch obszarów. */
(function (root) {
  "use strict";

  /* ── skale odpowiedzi ──────────────────────────────────────────────
     Asymetria (z Mapy Potencjału) jest celowa: „zdecydowanie tak" waży
     dwa razy tyle co „raczej tak", a odmowy nie karzą tak mocno, jak
     zgoda nagradza — inaczej jedno „raczej nie" zjadało cały talent. */
  var SKALA = { sa: 2, a: 1, n: 0, d: -0.5, sd: -1 };
  var SKALA_ODWROCONA = { sa: -1, a: -0.5, n: 0, d: 1, sd: 2 };
  var SKALA_CHARAKTER = { sa: 1, a: 0.5, n: 0, d: -0.5, sd: -1 };
  /* Rozstrzygnięcie sprzeczności — odpowiedź behawioralna bije deklarację. */
  var TIEBREAK = { agree: 2, dk: 0, disagree: -1 };

  var MIN_TALENT = -2, MAX_TALENT = 4;

  function liczba(x) { return typeof x === "number" && isFinite(x); }
  function przytnij(v, min, max) { return Math.max(min, Math.min(max, v)); }

  /* ── 1. Talenty ────────────────────────────────────────────────────
     stwierdzenia: [{ id, talent, r? }]  odpowiedzi: { idStwierdzenia: 'sa'|… }
     Wynik talentu = średnia × 2, przycięta do [-2, 4].

     BALANSOWANIE POZYCJI (usterka wykryta 18.08.2026 przy scalaniu):
     żaden talent w odziedziczonej treści nie ma równej liczby pozycji
     zwykłych i odwróconych — każdy ma 2:1 albo 1:2. Przy zwykłym
     uśrednieniu wszystkich pozycji razem talent 2:1 daje się zawyżyć
     samą zgodą („zgadzam się na wszystko" = wynik 2, czyli „Silny"),
     a talent 1:2 symetrycznie zaniżyć. Dlatego liczymy średnią OSOBNO
     w każdej grupie i dopiero te dwie średnie uśredniamy: proporcja
     pozycji przestaje wpływać na wynik. Talent, który ma tylko jedną
     grupę, liczy się z niej samej.                                      */
  function policzTalenty(stwierdzenia, odpowiedzi, talenty) {
    var grupy = {}; /* talent → { zwykle: [suma, ile], odwrocone: [suma, ile] } */
    function pusty() { return { zwykle: [0, 0], odwrocone: [0, 0] }; }
    (talenty || []).forEach(function (t) { grupy[t] = pusty(); });
    (stwierdzenia || []).forEach(function (s) {
      var o = odpowiedzi && odpowiedzi[s.id];
      if (!o) return;
      var skala = s.r ? SKALA_ODWROCONA : SKALA;
      if (!(o in skala)) return;
      if (!grupy[s.talent]) grupy[s.talent] = pusty();
      var g = grupy[s.talent][s.r ? "odwrocone" : "zwykle"];
      g[0] += skala[o];
      g[1] += 1;
    });
    var wynik = {};
    Object.keys(grupy).forEach(function (t) {
      var g = grupy[t], srednie = [];
      if (g.zwykle[1]) srednie.push(g.zwykle[0] / g.zwykle[1]);
      if (g.odwrocone[1]) srednie.push(g.odwrocone[0] / g.odwrocone[1]);
      if (!srednie.length) { wynik[t] = 0; return; }
      var s = srednie.reduce(function (a, b) { return a + b; }, 0) / srednie.length;
      wynik[t] = przytnij(Math.round(s * 2 * 10) / 10, MIN_TALENT, MAX_TALENT);
    });
    return wynik;
  }

  /* Sprzeczność: ten sam kierunek odpowiedzi na pozycji zwykłej i odwróconej
     („jestem dokładny" TAK i „często coś przeoczę" TAK). Nie znaczy kłamstwa —
     znaczy, że deklaracja nie wystarcza i trzeba dopytać o zachowanie. */
  function talentySprzeczne(stwierdzenia, odpowiedzi) {
    var zgoda = { sa: 1, a: 1, n: 0, d: -1, sd: -1 };
    var znaki = {};
    (stwierdzenia || []).forEach(function (s) {
      var o = odpowiedzi && odpowiedzi[s.id];
      if (!o || !(o in zgoda) || zgoda[o] === 0) return;
      var kierunek = s.r ? -zgoda[o] : zgoda[o]; /* po odwróceniu obie mówią o tym samym */
      if (!znaki[s.talent]) znaki[s.talent] = [];
      znaki[s.talent].push(kierunek);
    });
    return Object.keys(znaki).filter(function (t) {
      var lista = znaki[t];
      return lista.some(function (z) { return z > 0; }) && lista.some(function (z) { return z < 0; });
    }).sort();
  }

  /* Odpowiedź behawioralna NADPISUJE wynik talentu (nie uśrednia się z nim) —
     zachowanie jest mocniejszym świadectwem niż dwie sprzeczne deklaracje. */
  function zastosujTiebreakery(talenty, odpowiedziTb) {
    var wynik = {};
    Object.keys(talenty || {}).forEach(function (t) { wynik[t] = talenty[t]; });
    Object.keys(odpowiedziTb || {}).forEach(function (t) {
      var o = odpowiedziTb[t];
      if (o in TIEBREAK) wynik[t] = TIEBREAK[o];
    });
    return wynik;
  }

  /* ── 2. Charakter ──────────────────────────────────────────────────
     Oś dwubiegunowa w [-2, 2]; NIE jest oceną — mówi „jak z tą osobą
     pracować", nie „czy jest dobra”.                                    */
  function policzCharakter(stwierdzenia, odpowiedzi, wymiary) {
    var sumy = {};
    (wymiary || []).forEach(function (w) { sumy[w] = 0; });
    (stwierdzenia || []).forEach(function (s) {
      var o = odpowiedzi && odpowiedzi[s.id];
      if (!o || !(o in SKALA_CHARAKTER)) return;
      if (!(s.wymiar in sumy)) sumy[s.wymiar] = 0;
      sumy[s.wymiar] += SKALA_CHARAKTER[o] * (s.pol || 1);
    });
    var wynik = {};
    Object.keys(sumy).forEach(function (w) { wynik[w] = przytnij(sumy[w], -2, 2); });
    return wynik;
  }

  /* ── 3. Scenariusze sytuacyjne (SJT) ───────────────────────────────
     scenariusze: [{ id, opcje: [{ id, punkty: {obszar: n} }] }]
     Wynik obszaru: 50 ± udział zebranych punktów w możliwym maksimum —
     środek skali to „nie wiadomo”, nie „źle”.                            */
  function policzScenariusze(scenariusze, wybory, obszary) {
    var zebrane = {}, mozliwe = {};
    (obszary || []).forEach(function (o) { zebrane[o] = 0; mozliwe[o] = 0; });
    (scenariusze || []).forEach(function (s) {
      var maks = {};
      (s.opcje || []).forEach(function (opcja) {
        Object.keys(opcja.punkty || {}).forEach(function (o) {
          var p = opcja.punkty[o];
          if (!liczba(p)) return;
          maks[o] = Math.max(maks[o] || 0, Math.abs(p));
        });
      });
      Object.keys(maks).forEach(function (o) {
        if (!(o in mozliwe)) { mozliwe[o] = 0; zebrane[o] = 0; }
        mozliwe[o] += maks[o];
      });
      var wybor = wybory && wybory[s.id];
      var opcja = (s.opcje || []).filter(function (x) { return x.id === wybor; })[0];
      if (!opcja) return;
      Object.keys(opcja.punkty || {}).forEach(function (o) {
        if (liczba(opcja.punkty[o])) zebrane[o] = (zebrane[o] || 0) + opcja.punkty[o];
      });
    });
    var wynik = {};
    Object.keys(mozliwe).forEach(function (o) {
      wynik[o] = mozliwe[o] > 0
        ? przytnij(Math.round(50 + (zebrane[o] / mozliwe[o]) * 50), 0, 100)
        : 50;
    });
    return wynik;
  }

  /* ── 4. Obszary (raport wspólny, 0–100) ────────────────────────────
     mapowanie: { obszar: { talenty: [...], waga? } } — obszar, którego
     lista `talenty` jest pusta, liczy się wyłącznie ze scenariuszy; obszar
     z niepustą listą miesza jedno i drugie. Od decyzji Piotra 03.09.2026
     (patrz nagłówek pliku) „Uczciwość" i „Rozwiązywanie problemów" mają
     w `MAPOWANIE_OBSZAROW` pustą listę `talenty` — to świadomy wyjątek,
     nie przeoczenie: te dwa obszary liczą się wyłącznie ze scenariuszy,
     pozostałe sześć nadal miesza. */
  function talentNa100(v) {
    return przytnij(Math.round(((v - MIN_TALENT) / (MAX_TALENT - MIN_TALENT)) * 100), 0, 100);
  }

  function policzObszary(talenty, zeScenariuszy, mapowanie, udzialScenariuszy) {
    var u = liczba(udzialScenariuszy) ? przytnij(udzialScenariuszy, 0, 1) : 0.35;
    var wynik = {};
    Object.keys(mapowanie || {}).forEach(function (obszar) {
      var def = mapowanie[obszar] || {};
      var lista = (def.talenty || []).filter(function (t) { return liczba(talenty && talenty[t]); });
      var zSjt = zeScenariuszy && liczba(zeScenariuszy[obszar]) ? zeScenariuszy[obszar] : null;
      if (!lista.length) { wynik[obszar] = zSjt === null ? 50 : zSjt; return; }
      var zTalentow = Math.round(lista.reduce(function (s, t) { return s + talentNa100(talenty[t]); }, 0) / lista.length);
      wynik[obszar] = zSjt === null ? zTalentow : Math.round(zTalentow * (1 - u) + zSjt * u);
    });
    return wynik;
  }

  /* ── 5. Wiarygodność ───────────────────────────────────────────────
     Nie ocenia człowieka, tylko to, ile warta jest ta konkretna próbka.
     „Za szybko" i „same środki skali" to dwa najczęstsze sposoby na
     wypełnienie testu bez czytania.                                     */
  function ocenWiarygodnosc(dane) {
    var d = dane || {};
    var wszystkie = liczba(d.pozycji) ? d.pozycji : 0;
    var odpowiedzianych = liczba(d.odpowiedzi) ? d.odpowiedzi : 0;
    var niewiem = liczba(d.niewiem) ? d.niewiem : 0;
    var sekundy = liczba(d.sekundy) ? d.sekundy : 0;
    var nierozwiazane = liczba(d.nierozwiazaneSprzecznosci) ? d.nierozwiazaneSprzecznosci : 0;

    var procentNiewiem = odpowiedzianych ? Math.round((niewiem / odpowiedzianych) * 100) : 0;
    var kompletnosc = wszystkie ? Math.round((odpowiedzianych / wszystkie) * 100) : 0;
    var sekundNaPozycje = odpowiedzianych ? sekundy / odpowiedzianych : 0;

    var uwagi = [];
    if (odpowiedzianych && sekundNaPozycje < 2)
      uwagi.push("Test wypełniony bardzo szybko (poniżej 2 sekund na pytanie) — wynik traktuj jako wstęp do rozmowy, nie jako pomiar.");
    if (procentNiewiem >= 30)
      uwagi.push("Dużo odpowiedzi „trudno powiedzieć” (" + procentNiewiem + "%) — obraz jest rozmyty, warto dopytać na żywo.");
    if (kompletnosc < 100)
      uwagi.push("Część pytań została bez odpowiedzi (" + kompletnosc + "% wypełnienia).");
    if (nierozwiazane > 0)
      uwagi.push("Sprzeczne odpowiedzi bez rozstrzygnięcia: " + nierozwiazane + " — te obszary policzone są z samych deklaracji.");

    var poziom = "wysoka";
    if (uwagi.length === 1) poziom = "średnia";
    if (uwagi.length >= 2) poziom = "niska";
    return { poziom: poziom, procentNiewiem: procentNiewiem, kompletnosc: kompletnosc, sekundNaPozycje: Math.round(sekundNaPozycje * 10) / 10, uwagi: uwagi };
  }

  /* ── 6. Rekord wyniku ──────────────────────────────────────────────
     Kształt zgodny z kontraktem `akademia_work_profile_wyniki_v1`
     (czyta go `[wewn.]` — pola typ/narzedzie/
     osoba/wyniki/charakter są wymagane i NIE wolno ich przemianować).

     Dwa reżimy danych (decyzja właściciela 18.08.2026):
     - 'zespol'   — pełny rekord: wyniki, charakter, talenty, scenariusze,
                    odpowiedzi surowe. To jest materiał do dalszej ewaluacji
                    pracy, powiedziany wprost przed testem;
     - 'publiczny'— raport dla siebie; rekord bez danych osobowych,
                    przekazywany DOBROWOLNIE i tylko po to, by ulepszać
                    narzędzie: pozycje, ich trafność i wiarygodność próbki.
     Wersja 2026-08-20: 24 talenty (16 odziedziczonych + 8 nowych, t49–t64),
     pozycje t33–t48 wycofane, PYTANIA OTWARTE usunięte — pole `otwarte`
     nie jest już zapisywane; w starych rekordach zostaje nietknięte
     (log append-only, nierozpoznane pola przeżywają). */
  var TYP_REKORDU = "alterbake-wynik-work-profile";
  var NARZEDZIE = "profil-alterbake";
  var WERSJA = "2026-08-20";

  /* Preferencje w jednym, przewidywalnym kształcie — także gdy przyszły
     puste albo poobcinane ze starszej wersji testu. Odbiorca (drabina nauki)
     ma dostać zawsze te same trzy pola, żeby nie musiał zgadywać. */
  function normalizujPreferencje(p) {
    var x = p || {};
    var lista = function (v) { return Array.isArray(v) ? v.filter(function (s) { return typeof s === "string" && s; }) : []; };
    return {
      wiodace: typeof x.wiodace === "string" && x.wiodace ? x.wiodace : null,
      dodatkowe: lista(x.dodatkowe),
      wazne: lista(x.wazne)
    };
  }

  function zbudujRekord(dane) {
    var d = dane || {};
    var rezim = d.rezim === "publiczny" ? "publiczny" : "zespol";
    var rekord = {
      typ: TYP_REKORDU,
      wersja: WERSJA,
      narzedzie: NARZEDZIE,
      rezim: rezim,
      data: d.data || new Date().toISOString(),
      osoba: rezim === "publiczny"
        ? { imie: "", rola: "" }
        : { imie: (d.osoba && d.osoba.imie) || "", rola: (d.osoba && d.osoba.rola) || "" },
      wyniki: d.obszary || {},
      charakter: d.charakter || {},
      talenty: d.talenty || {},
      scenariusze: d.zeScenariuszy || {},
      wiarygodnosc: d.wiarygodnosc || null,
      /* Preferencje nauki (01.09.2026): czego ta osoba CHCE się uczyć i w jakiej
         kolejności. To nie jest wynik pomiaru — to deklaracja, i tak jest tu
         trzymana, osobno od talentów. Panel układa z niej drabinę nauki. */
      preferencje: normalizujPreferencje(d.preferencje)
    };
    if (rezim === "zespol") {
      /* Materiał do ewaluacji pracy — bo o to właściciel poprosił wprost. */
      rekord.odpowiedzi = d.odpowiedzi || {};
      if (d.osoba && d.osoba.kontakt) rekord.osoba.kontakt = d.osoba.kontakt;
    } else {
      /* Dobrowolny wkład w narzędzie: same odpowiedzi na pozycje skalowe
         (bez imienia i bez kontaktu) + czas. */
      rekord.odpowiedzi = d.odpowiedzi || {};
      rekord.sekundy = liczba(d.sekundy) ? d.sekundy : null;
    }
    return rekord;
  }

  /* Dopisanie do wspólnego logu. Log jest APPEND-ONLY i przycinany do 50
     ostatnich pozycji — dedupe po (narzędzie, imię, dane wynikowe), bo
     ekran raportu potrafi się przerysować i zapisać ten sam wynik drugi raz. */
  function dopiszWynik(log, rekord, limit) {
    var lista = Array.isArray(log) ? log.slice() : [];
    var duplikat = lista.some(function (w) {
      return w && w.narzedzie === rekord.narzedzie &&
        ((w.osoba && w.osoba.imie) || "") === ((rekord.osoba && rekord.osoba.imie) || "") &&
        JSON.stringify(w.wyniki || {}) === JSON.stringify(rekord.wyniki || {});
    });
    if (duplikat) return lista;
    lista.push(rekord);
    var max = liczba(limit) ? limit : 50;
    return lista.slice(-max);
  }

  var API = {
    SKALA: SKALA,
    SKALA_ODWROCONA: SKALA_ODWROCONA,
    SKALA_CHARAKTER: SKALA_CHARAKTER,
    TYP_REKORDU: TYP_REKORDU,
    NARZEDZIE: NARZEDZIE,
    WERSJA: WERSJA,
    policzTalenty: policzTalenty,
    talentySprzeczne: talentySprzeczne,
    zastosujTiebreakery: zastosujTiebreakery,
    policzCharakter: policzCharakter,
    policzScenariusze: policzScenariusze,
    policzObszary: policzObszary,
    talentNa100: talentNa100,
    ocenWiarygodnosc: ocenWiarygodnosc,
    normalizujPreferencje: normalizujPreferencje,
    zbudujRekord: zbudujRekord,
    dopiszWynik: dopiszWynik
  };

  if (typeof module === "object" && module.exports) module.exports = API;
  else root.ProfilScoring = API;
})(typeof globalThis !== "undefined" ? globalThis : this);
