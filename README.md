# Chaoso vakarėlis Plateliuose — Game Master

Paprasta Next.js programėlė žaidimo organizatoriui. Visa būsena saugoma **tik tavo naršyklės localStorage**, todėl nereikia duomenų bazės ar prisijungimo.

## Paleidimas

1. Įsidiek Node.js 20+.
2. Atidaryk terminalą šiame aplanke.
3. Paleisk:

```bash
npm install
npm run dev
```

4. Atidaryk `http://localhost:3000`.

## Kas jau veikia

- Žaidėjų pridėjimas / šalinimas.
- Taškai ir kaltinimų žetonai.
- 130 misijų bazė (1 / 2 / 3 / 5 taškai).
- Du misijų priskyrimo režimai: programa parenka atsitiktinai pagal taškų vertę arba organizatorius įveda ištrauktos fizinės kortelės kodą M001–M130.
- [X]/[Y] priskyrimas konkretiems žaidėjams.
- Misijos įvykdymas / žlugimas.
- Misijos kaltinimas.
- Chaoso Agento kaltinimas.
- Chaoso Agento paskyrimas ir grąžinimas į Agentą.
- 20 min. „aktyvacijos“ laiko registravimas naujam Chaoso Agentui.
- Žaidimo istorija.
- Lyderių lentelė.
- Duomenys išlieka po puslapio perkrovimo.

## Svarbu

Ši MVP versija nėra pilnai offline PWA. Ji veikia lokaliai tavo kompiuteryje be interneto po `npm install`, tačiau telefone patogiausia:
- paleisti kompiuteryje tame pačiame Wi‑Fi tinkle ir atidaryti per kompiuterio IP, arba
- vėliau deployinti į Vercel.

Kitame etape galima pridėti PWA/offline cache, PIN užraktą, žaidimo eksportą/importą ir kortelių M001-M090 kodų generavimą.


## Vedėjas / Agentas

Vieną žaidėją galima pažymėti kaip **Vedėją / Agentą**. Jis vis tiek žaidžia:
- gauna ir vykdo misijas;
- gali būti [X] / [Y] taikiniu;
- renka misijų taškus;
- mato Game Master informaciją.

Kadangi vedėjas mato slaptas kitų misijas ir roles, jis:
- negali teikti misijų kaltinimų;
- negali teikti Chaoso Agento kaltinimų;
- negali būti paskirtas Chaoso Agentu.


## v0.5 pakeitimai

- Sutvarkyta kaltinimų būsena: „Pataikė“ ir „Nepataikė“ dabar atnaujina žaidimą per naujausią `state`, todėl nebestringa dėl pasenusios būsenos.
- Teisingas misijos kaltinimas automatiškai pažymi kaltinamojo aktyvią misiją kaip žlugusią ir prideda kaltintojui +1 tašką.
- Klaidingas misijos kaltinimas atima 1 kaltinimo žetoną.
- „Žlugo“ mygtukas prie misijos pervadintas į „Atšaukti misiją“ ir skirtas tik vedėjo rankiniam atšaukimui.
- Po kaltinimo forma automatiškai išvaloma, kad būtų aišku, jog veiksmas užregistruotas.


## v0.6 pakeitimai

- „Programa parenka“ dabar automatiškai parenka ne tik nepanaudotą misiją, bet ir atsitiktinius [X]/[Y] žaidėjus. Misijos vykdytojas neparenkamas, o X ir Y yra skirtingi.
- Rankiniame fizinės kortelės režime [X]/[Y] pasirinkimai išlieka.
- Kaltinimų mygtukai apsaugoti nuo pakartotinio paspaudimo ir rodo aiškų užregistravimo pranešimą.
- Misijų statusai lietuviški ir spalvoti: AKTYVI, ĮVYKDYTA, ATSPĖTA, ATŠAUKTA. Senas `failed` localStorage statusas UI rodomas kaip ATSPĖTA.
- Pasibaigusios misijos žaidėjo kortelėje rodomos kompaktiškai, be viso teksto.
- Pridėtas „Naujas žaidimas“: išsaugo žaidėjus ir Vedėjo statusą, bet nunulina progresą. Reikia checkbox ir įvesti CHAOSAS.
- „Išvalyti viską“ turi atskirą apsauginį modalą. Reikia checkbox ir įvesti IŠVALYTI.


## v0.7 pakeitimai
- Atskiras „Lyderiai“ tabas su visais žaidėjais, 🥇🥈🥉 TOP 3 ir išskirtu TOP 5.
- Kaltinimai: startas 2/3, maksimumas 3/3, rankinis 0–3.
- Kas 3 ĮVYKDYTAS misijas: +1 kaltinimas iki 3/3, rodomas progresas.
- Chaoso Agentas gali kaltinti; Vedėjas kaltinti negali.
- Random režimas ima tik nepanaudotas korteles; kortelė užrakinama nuo priskyrimo.
- Visi browser alert/confirm pakeisti appso modalais; veiksmų patvirtinimai rodomi toast.
- Kaltinimai turi anti-double-click apsaugą ir toast feedback.


## v0.8 pakeitimai

- Teisingas Chaoso Agento kaltinimas automatiškai demaskuoja kaltinamąjį: +2 taškai kaltintojui, Chaoso rolė nuimama.
- Po demaskavimo atidaromas modalas su pasirinkimu iš karto paskirti naują Chaoso Agentą arba tai padaryti vėliau.
- „Chaos“ tabe pridėtas „Priskirti Chaoso Agentą“ mygtukas.
- Chaoso Agentą galima pasirinkti rankiniu būdu arba leisti programai atsitiktinai parinkti norimą skaičių.
- Vedėjas ir jau esami Chaoso Agentai neįtraukiami į naujų Chaoso Agentų kandidatų sąrašą.
- Jei misijos vykdymu apkaltinamas Chaoso Agentas, nėra „Pataikė / Nepataikė“ pasirinkimo: rodomas vienas „Užregistruoti klaidingą kaltinimą“ mygtukas.
- Tokio klaidingo misijos kaltinimo atveju Chaoso Agentas gauna +1 tašką, o kaltintojas praranda 1 kaltinimo žetoną.
- Teisingai demaskuotas Chaoso Agentas negauna +1 taško už tai, kad buvo pagautas.


## v0.9 pakeitimai
- „Žaidėjai“ tabe pridėti filtrai ir rikiavimas.
- „Reikia misijos“ prioritetas iškelia ATSPĖTAS, ATŠAUKTAS, ĮVYKDYTAS ir misijos neturinčius Agentus; žaidėjų tabas rodo jų skaičių.
- Rikiuoti galima pagal dėmesio poreikį, numerį, vardą arba taškus.
- Kaltinimų žaidėjų pasirinkimai pakeisti į custom paieškos modalus, todėl mobile neberodomas milžiniškas native select sąrašas.
- Sutvarkytas mobile responsive: header, grid, formos ir modalai telpa į viewport, puslapis neturi horizontaliai slinkti.


## v1.0 misijų kaladė
- Misijų fondas padidintas nuo 130 iki 250.
- Pridėta daugiau sodybos, ežero, miškelio, muzikos, maisto/grilio, grupinių ir socialinių situacijų.
- Airsoft tematikos misijos apsiriboja saugiu varžybų organizavimu / taškų / taikinių aptarimu, ne slapta ginklo naudojimo provokacija.
- Formuluotės sąmoningai maišomos: „Įtikink“, „Išprovokuok“, „Nukreipk...“, „Sukurk situaciją...“ ir kt.
- Peržiūrėtos lytį nurodančios „pats/pati“ konstrukcijos; jos pakeistos neutralesnėmis.

## v1.1
- Galutinė kaltinimų logika: pradžia 2/3, maksimumas 3; kas 3 įvykdytas misijas +1 žetonas.
- Teisingas misijos kaltinimas: +1 tšk., žetonas nesunaudojamas; klaidingas: -1 žetonas.
- Teisingas Chaoso Agento kaltinimas: +2 tšk., žetonas nesunaudojamas, Chaoso Agentas demaskuojamas ir +1 negauna.
- Klaidingas kaltinimas tikram Chaoso Agentui: kaltintojas -1 žetonas, Chaoso Agentas +1 tšk.
- Misijos kaltinimas Chaoso Agentui automatiškai klaidingas: kaltintojas -1 žetonas, Chaoso Agentas +1 tšk.
- Lyderiuose pridėtas telefono screenshotui skirtas Scoreboard vaizdas be slaptų rolių.
- Pridėtas viso leaderboard kopijavimas tekstu į iškarpinę.


## v1.2 PWA

- Pridėtas `manifest.webmanifest`.
- Pridėtos 192×192 ir 512×512 programėlės ikonėlės.
- Pridėtas Service Worker (`public/sw.js`) ir automatinė jo registracija.
- Programėlę galima įsidėti į telefono Home Screen.
- Po pirmo sėkmingo užkrovimo pagrindinis vaizdas gali veikti ir nutrūkus internetui.
- Žaidimo duomenys ir toliau saugomi naršyklės `localStorage`, todėl Game Master žaidimą pradėk tame pačiame telefone/naršyklėje, kurią naudosiesi vakarėlyje.
