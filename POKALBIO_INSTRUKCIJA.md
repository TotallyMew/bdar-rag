# BDAR RAG laboratorija

## Atidarymas

Darbalaukyje spustelėkite **BDAR RAG laboratorija** nuorodą arba aplanke `rag_bdar` dukart paspauskite **Paleisti BDAR pokalbi.cmd**. Programa atsidarys įprastoje naršyklėje. Interneto modelių užklausoms nereikia: naudojamas vietinis Ollama.

Jei jau veikia, paleidiklis atvers tą pačią programą. Prireikus paleidiklis paleidžia vietinį Ollama serverį. Jis neprisijungia prie jokios paskyros ir nenaudoja API raktų.

## Klausimai ir savi promptai

1. Įrašykite klausimą apatiniame lauke ir spauskite **Siųsti** arba **Enter**. Nauja eilutė: **Shift+Enter**.
2. Kairėje pasirinkite paieškos metodą, RAG eigą arba kontrolinį variantą **Be RAG**. Žemiau pasirinkite BDAR teksto kalbą **LT / EN** ir vietinius „Ollama“ modelius.
3. **Visi parametrai** leidžia nustatyti fragmentų skaičių, konteksto talpą ir modelio mąstymo išvesties rodymą. Skyrelyje **Sisteminės instrukcijos** galite redaguoti modelio rolę, kalbą ir atsakymo taisykles.
4. Paspauskite **Išsaugoti nustatymus**. Pakeitimai taikomi kitam klausimui. **Atkurti pradines** sugrąžina pradines sistemines instrukcijas redaktoriuje.

Pradinis atsakymų modelis yra `qwen3.5:4b`. Naujai konfigūracijai semantinei paieškai parenkamas daugiakalbis `bge-m3:latest`, kai jis įdiegtas. Anksčiau išsaugotą modelį galima pakeisti kairėje. Pirminė konteksto talpa yra 8192 žetonų.

## Šaltinių tikrinimas

- Virš atsakymo atverkite **RAG paieškos rezultatą**. Rodomos realios užklausos, reitingas ir tai, kurie fragmentai perduoti modeliui. Jei įvestyje Straipsnis nurodytas tiesiogiai, jis gali patekti modeliui papildomai.
- Kriterijus įrašykite atskirose eilutėse su `K1.`, `K2.` ir pan. Kiekvienas kriterijus gauna atskirą paiešką, papildytą viso reikalavimo kontekstu. Po bendru atsakymu rodomos modelio išvados pagal kriterijus.
- **Pažodžiui rastos citatos** rodo rastų tekstų skaičių iš visų bendro atsakymo citatų. Paspaudę tikslios citatos mygtuką pamatysite paryškintą ištrauką šaltinyje. Patikra suvienodina tarpus; ar citata pagrindžia teiginį, sprendžia vertintojas.
- Korpuse yra 99 pradinės ES BDAR redakcijos straipsniai, suskaidyti į 389 fragmentus. Jis neapima visos aktualios teismų praktikos, nacionalinių taisyklių ar visų EDPB išaiškinimų.

Pradinė parinktis paruošia paieškos užklausą pasirinkta korpuso kalba. Citatos pateikiamos ta pačia kalba kaip šaltinis. Užklausos pritaikymą galima išjungti.

Pirmą kartą naudojant semantinį arba hibridinį metodą paruošiami visi 389 vektoriai. Ekrane rodomas tikras progresas. Vektoriai saugomi vietoje ir panaudojami vėl, kol nepasikeičia korpusas ar modelio digest.

Kai pasirinktas vektorių modelis atmeta per ilgą tekstą, programa suskaido tą įvestį ir sujungia jos dalių vektorius pagal jų ilgį. RAG atsakyme ir citatų patikroje naudojamas visas originalus BDAR fragmentas su tuo pačiu ID. Eksporte indeksavimo taisyklė užfiksuojama lauke `metadata.embedding_format`.

## Metodų palyginimas

Pirmiausia įrašykite klausimą į pokalbio laukelį. Paspauskite **Palyginti metodus**, pažymėkite norimus metodus ir pradėkite palyginimą. Atsakymai rodomi paeiliui, pažymėti metodo pavadinimu. Prie kiekvieno atsakymo spauskite **Šaltiniai**, kad palygintumėte būtent jam pateiktus įrodymus.

Palyginime naudojamas vienas paruoštas paieškos klausimas ir tie patys konteksto parametrai. Tai interaktyvus bandymas, **ne anksčiau užfiksuotas formalus angliškų klausimų eksperimentas**. Tam išlieka atskiras `rag_experiment.py` ir jo duomenų rinkinys.

Norėdami palyginti kalbas, išsiųskite tą pačią įvestį su LT ir EN. Palikite tuos pačius modelius, metodą bei parametrus, istorijos ėjimus nustatykite į 0. Suvestinėje bus rodomi abiejų kalbų įrašai.

**Paieškos metrikos** priima aktualių fragmentų etaloną bendram klausimui arba konkrečiam kriterijui, pvz., `32.1`. Precision matuoja, kokia rastų fragmentų dalis yra etalone. Recall matuoja, kokia etalono dalis rasta. F1 vienodai sveria abi metrikas, F2 suteikia didesnę reikšmę recall. Skaičiuojama iš reitingo top-k; papildomai įterpti straipsniai reitingo nekeičia.

Prie įvesties paspauskite **NFR šablonai**. NFR-01 apima duomenų atkūrimą, NFR-02 – pranešimus apie duomenų saugumo pažeidimus. Šiems dviem šablonams parengti demonstraciniai etalonai pagal oficialų lietuvišką 2016 m. BDAR leidimą. Nepakeistam šablonui metrikos automatiškai rodomos po atsakymu, bendrai ir pagal kriterijus. **Etaloninės nuostatos ir pagrindimas** leidžia patikrinti, kodėl pasirinkta konkreti straipsnio dalis ar punktas.

NFR-03 ir NFR-04 pateikti be etalono. Jiems metrikos atsiranda įvedus savo aktualius fragmentus. Šablonai ir etalonai laikomi faile `data/nfr_examples.json`. Metrikos vertina paieškos reitingą fragmentų lygiu. Atsakyme nurodytų punktų ir teisinio pagrindimo kokybę vertina žmogus.

**Modelio mąstymo išvestis** rodo „Ollama“ siunčiamą `thinking` tekstą, kai modelis jį palaiko. Šis tekstas gali būti klaidingas. Jei sugeneruotas atsakymas netinka struktūrinei patikrai, programa gali pakartoti kvietimą ir atskirai pažymėti pirmojo kvietimo išvestį.

## Žmogaus vertinimas ir eksportas

Paspaudę **Įvertinti** galite nurodyti savo vardą arba kodą, skirti teisingumo bei išsamumo balus ir pažymėti, kiek teiginių iš tikrųjų pagrindžia šaltiniai. Vertinimas išsaugomas tik žmogui užpildžius laukus ir patvirtinus, kad jis perskaitė šaltinius. Programa žmogaus balų nesugalvoja.

**Eksportuoti pokalbį** atsisiunčia JSON su klausimais, atsakymais, šaltiniais, tiksliais promptais, modelių informacija ir jūsų vertinimais.

Viršuje atverkite **Pokalbiai**, kad peržiūrėtumėte išsaugotas užklausas ir atsakymus. Sąrašas išlieka perkrovus naršyklę ar laboratoriją. Paspaudus **Naujas pokalbis**, programa atveria tuščią pokalbį ir siunčia vykdomos užklausos nutraukimo signalą. Pasirinkus seną pokalbį, kito pokalbio užklausa toliau vykdoma. Greta jos būsenos galima spustelėti **Nutraukti** arba **Atidaryti pokalbį**. Iki nutraukimo baigti atsakymai lieka istorijoje.

Senesni atsakymai atkurti iš rezultatų failų pagal bendrą paleidimo ID. Jei naršyklėje išliko ankstesnio pokalbio kopija, ją taip pat galima atverti sąraše. Nustatymai saugomi naršyklėje.

## Kur išsaugomi duomenys

- `ui_data/runs/`: faktiniai modelio atsakymai, promptai, šaltiniai ir metaduomenys.
- `ui_data/turns/`: įrašytos pokalbių užklausos, jų būsenos ir atsakymų ID.
- `ui_data/reviews/`: žmogaus įrašyti vertinimai.
- `ui_data/embeddings/`: pakartotinai naudojamas semantinės paieškos indeksas.
- `ui_data/server.log`: paleidimo arba klaidų žurnalas.

Pokalbis turi istoriją ir naujam klausimui pateikia iki keturių ankstesnių klausimo–atsakymo porų. Ankstesni modelio atsakymai nelaikomi teisės šaltiniais.

## Jeigu nepavyksta

- „Ollama nepasiekiama“: paleiskite Ollama, tuomet nustatymuose spauskite **Atnaujinti modelių sąrašą**.
- Ilga pirmoji užklausa: modelis įkeliamas arba pirmą kartą ruošiamas semantinis indeksas. Ekrane matomas vykdomas žingsnis.
- Užklausą galima nutraukti mygtuku **Nutraukti**. Iki tol paruošti palyginimo atsakymai lieka išsaugoti.
- Šioje sąsajoje naudojami tik vietiniai modeliai. Debesies modelių ar paskyrų prisijungimo ji nevaldo.

## Techninis paleidimas

```powershell
python ui_server.py
```

Pradinis adresas `http://127.0.0.1:8765`. Serveris pasiekiamas tik šiame kompiuteryje. Užklausa į Ollama siunčiama į `127.0.0.1:11434`. Python pakanka standartinės bibliotekos, `pip install` nereikia.

## Modelio ribotumai ir parametrai

Tikruose bandymuose mažieji modeliai darė lietuvių kalbos ir prasmės klaidų, kartais atsakymo santraukoje pakartojo klausimą. Tokiu atveju sąsaja tai aiškiai pažymi ir atveria modelio pateiktus teiginius. Jie nėra automatiškai patvirtinti teisingi. Tikslias citatas ir teisinę prasmę patikrinkite patys.

Qwen3 interaktyviame pokalbyje naudojama temperature=0.7, top_p=0.8, top_k=20, min_p=0, think=false ir seed=42. Kitiems modeliams temperature=0. Parametrai ir tikri atsakymai išsaugomi eksporte. Tai nepakeičia atskiro fiksuoto eksperimento parametrų. Nustatymai parinkti pagal [oficialią Qwen3 modelio kortelę](https://huggingface.co/Qwen/Qwen3-4B).

## Atsakymo generavimo pataisa

Nuo šio atnaujinimo naudojamas Ollama `/api/chat`, modeliui perduodama JSON schema ir patikslintos pradinės instrukcijos. Jei atsakymas pakartoja klausimą, bandoma dar vieną kartą. Originalus ir pakartotinis atsakymai išsaugomi; jų bendra trukmė įtraukiama į generavimo laiką. Jei ir antras bandymas pakartoja klausimą, įrašoma `quality_flags: answer_repeated_question` ir sąsaja aiškiai nurodo nesėkmę. Seni pokalbiai neperrašomi.

Qwen3.5 pokalbiui po vietinių bandymų pasirinkta temperature=0, presence_penalty=0, repeat_penalty=1, top_p=0.8, top_k=20, min_p=0, think=false, seed=42. Tai vietiniam pilotui pasirinkti parametrai, o ne modelio autorių numatytasis profilis. Ankstesnio skyriaus Qwen3 parametrai taikomi tik `qwen3:4b`. Net ir naujas modelis gali daryti prasmės, vertimo ir teisinių sąlygų klaidų; trys bandymai nėra išsamus kokybės įrodymas. Formalus žmogaus vertinimas lieka neatliktas.


## Modelio deklaruojamas pasitikėjimas ir išplėsti nustatymai

Po kiekvieno naujo atsakymo pagal nutylėjimą atliekamas atskiras to paties modelio savęs vertinimas: kiek jis pasitiki, kad visas atsakymas yra faktiškai teisingas ir pakankamai išsamus. Modelis nurodo 0–100 % bei trumpą priežastį. Jis mato tą patį klausimą, savo atsakymą ir tam atsakymui pateiktus šaltinius. „Be RAG“ vertinimui šaltiniai nepateikiami. Metodas įrašuose pažymėtas `self_report_post_answer_v1`, `calibrated: false`.

Tai **modelio deklaracija**, ne išmatuota teisingumo tikimybė. Aukštas balas gali būti klaidingas. Citatų sutapimas, modelio pasitikėjimas ir žmogaus vertinimas yra trys atskiri rodikliai. Šis principas dera su pasitikėjimo išgavimo ir kalibravimo tyrimų skirtimi: Tian, K., et al. (2023). *Just Ask for Calibration*. https://arxiv.org/abs/2305.14975. Šio darbo rezultatai nėra įrodymas, kad mūsų vietinis modelis ar BDAR užduotis kalibruoti.

Nustatymuose šį papildomą kvietimą galima išjungti. Jeigu modelis nepateikia tinkamo balo arba kvietimas nepavyksta, rodoma „nepavyko išmatuoti“, o ne sugalvotas 0 %. Ankstesniems atsakymams balai automatiškai nepriskiriami. Pirminis atsakymas dėl vertinimo nesėkmės neprarandamas.

**Modelis ir promptai → Atsakymo generavimas** leidžia keisti:

| Parametras | Pradinė reikšmė | Paskirtis |
|---|---:|---|
| Temperature | 0 | Generavimo atsitiktinumas |
| Top-p | 0,8 | Žetonų tikimybės masės riba |
| Top-k (žetonai) | 20 | Kitam žetonui svarstomų kandidatų skaičius |
| Kartojimo bauda | 1 | 1 reiškia papildomos baudos nebuvimą |
| Panaudotų žetonų bauda | 0 | Žodžių įvairovės skatinimas |
| Generavimo limitas | 2200 | Didžiausias vieno modelio kvietimo išvesties žetonų skaičius |
| Seed | 42 | Atsitiktinumo sėkla; savaime negarantuoja visiško pakartojamumo |
| Istorijos ėjimai | 4 | 0 išjungia ankstesnių pokalbio ėjimų perdavimą |

Modelio parinkimas savaime nepakeičia jūsų išsaugotų generavimo parametrų. Šios reikšmės perduodamos atsakymo, užklausos pritaikymo, perrikiavimo, pakartojimo ir pasitikėjimo kvietimams. Konteksto talpa išlieka atskiras parametras. Ollama API: https://docs.ollama.com/api/chat.

**Hibridinės paieškos derinimas** leidžia keisti kandidatų skaičių iš kiekvieno reitingo (20), perrikiavimo apimtį (10), BM25 dalį (0,5) ir RRF konstantą (60). Jungimo formulė: `BM25_svoris / (RRF_k + BM25_rangas) + (1 - BM25_svoris) / (RRF_k + semantinis_rangas)`. Kai svoris 0 arba 1, kitos paieškos reitingas neįtraukiamas. Galutiniam atsakymui pateikiama nuo 1 iki 10 fragmentų. Kandidatų turi pakakti galutiniams fragmentams. Pernelyg didelis perrikiavimo kandidatų skaičius gali viršyti modelio kontekstą.

Kiekviename atsakyme atverkite **Šio atsakymo parametrai**. Eksporte `experiment_settings` saugo to konkretaus bandymo nustatymus, o `generation.options` – tikrai API perduotas reikšmes. Pasitikėjimo žalią atsakymą ir jo kvietimo parametrus rasite `confidence.generation`. Jo trukmė saugoma atskirai `confidence_ms`; ji nepridedama prie pirminio atsakymo `generation_ms`.

Lygindami metodus naudokite tą patį klausimą ir parametrus, o istorijos ėjimus nustatykite į 0. Tada atskirai įveskite žmogaus vertinimus. Tik su nepriklausomais žmogaus įvertintais atsakymais galima tirti deklaruoto pasitikėjimo kalibraciją. Šis atnaujinimas nekeičia formaliojo eksperimento skripto ar senųjų rezultatų.


## Viena įvestis klausimams ir reikalavimams

Rankinio užduoties pasirinkimo nėra. Rašykite tiek „Sistema turi leisti…“, tiek „Ar sistema turi…?“, tiek bendrą klausimą apie savo teises. Sistema pirmiausia modelio kvietimu nustato užduoties pobūdį ir išskiria veikėją, veiksmą bei objektą (`automatic_intent_v1`). Pradinė įvestis nepakeičiama ir kartu perduodama tolesnei analizei. Atpažinimo žalias atsakymas saugomas `task_detection.generation`; lange galite atverti „Kaip suprasta įvestis“. Tai nėra teisinis įrodymas. Neteisingai suprastą veiksmą reikia patikslinti žodžiais, o ne perjungti režimą.

Reikalavimo atveju modelis pateikia keturių galimų išvadų vertinimą, teisinio pagrindo pobūdį, reikalaujamą veiksmą, pagrindimą, sąlygas ir patikslintą formuluotę. Faktinis įgyvendinimas nevertinamas (`not_assessed`), nes netiriamas programos kodas ar jos veikimas. Bendras klausimas gauna įprastą atsakymą. Abi užduotys naudoja tuos pačius pasirenkamus RAG metodus, generavimo parametrus ir atskirą deklaruojamo pasitikėjimo žingsnį.

Reikalavimų paieškoje papildomai taikomas viešas veiksmų žodynas `action_vocabulary_balanced_v1`. Prašymo pateikimo veiksmui ieškoma teisių įgyvendinimo palengvinimo; ištrynimo temai – pagrindų, o absoliučiam ištrynimui – išimčių. Kode nėra įrašytų tikslinių straipsnių numerių ar etaloninių atsakymų. Kiekvieno paieškos klausimo pirmas rezultatas įtraukiamas pirmumo tvarka, likusieji sujungiami RRF. Visos užklausos matomos dešinėje ir eksporto `search_queries`, strategija – `query_strategy`. Tai atskira užklausų išplėtimo metodika; jos rezultatų negalima tiesiogiai tapatinti su seno vienos užklausos formaliojo eksperimento rezultatais. Rankiniai `qa` ir `requirement` API parametrai išlieka tik atkuriamiems techniniams bandymams, vartotojo sąsajoje jų rinktis nereikia.

Paieškos gerinimas ir automatinis užduoties supratimas negarantuoja teisingo teisinio vertinimo. Vietinis mažas modelis bandymuose vis dar painiojo kai kurias sąlygas ir prastai formulavo lietuvišką tekstą. Nei modelio išvada, nei jo pasitikėjimo balas nėra žmogaus patvirtintas atsekamumo ryšys. Formalus žmogaus vertinimas lieka būtinas tyrimo žingsnis.


## Logikos ir sąsajos peržiūra (5 versija)

Pagrindiniai pataisymai:

- Kelių metodų palyginimai vykdomi be ankstesnio pokalbio istorijos visiems metodams. Taip ankstesni RAG atsakymai nepatenka į „Be RAG“ kontrolę. `experiment_settings.history_turns` rodo taikytą 0, `requested_history_turns` – vartotojo nustatymą. Įprastas vieno metodo pokalbis ir toliau naudoja pasirinktą istorijos apimtį. Kelių metodų rezultatai savaime neparenkami kaip vienas atsakymas vėlesnei pokalbio istorijai.
- „Be RAG“ negauna kitam metodui paruoštos paieškos užklausos; jam nerodomas semantinės paieškos modelis ir neskaičiuojamas paieškos laikas.
- `retrieval_ms` įtraukia atitinkamą tikrą BM25, užklausos vektorizavimo, tankios paieškos ir reitingų sujungimo/perrikiavimo darbą. Bendras užklausos planavimas ir indekso paruošimas pateikiami atskirai `timings`. Bendros operacijos fiziškai atliekamos vieną kartą, tačiau palyginimo metodo laike rodoma jam priskiriama operacijos kaina; šių laikų suma nebūtinai lygi viso palyginimo sieniniam laikui.
- Patikrinami vektorių matmenys, skaičių baigtinumas ir jų formato versija. Sugadinta indekso kopija kuriama iš naujo. Pirmas paleidimas po atnaujinimo gali atkurti indeksą.
- Išjungus klausimo pritaikymą, nebeįterpiamos ir automatinės papildomos užklausos. Nulinio balo BM25 ir TF-IDF dokumentai nebelaikomi rastais įrodymais.
- Nutrūkęs arba žetonų limitą pasiekęs modelio atsakymas nelaikomas tinkamu vien todėl, kad pavyko perskaityti JSON. Išsaugomas jo žurnalas `ui_data/errors/`. Pasikartojusi įvestis arba susilaikymas negauna pasitikėjimo balo kaip užbaigtas atsakymas.
- `quality_flags` pažymi trūkstamus šaltinius, nepagrįstas nuorodas, netikslias citatas ir aptinkamus vidinius išvados prieštaravimus. Tai struktūriniai peržiūros signalai, ne teisinio teisingumo ar semantinio pagrįstumo įrodymas. Jie nekeičia žalio modelio atsakymo.
- Žmogaus vertinimai įrašomi ir atskirai, ir į atitinkamo atsakymo `human_review`. Jie nebeprarandami atnaujinant palyginimą ar eksportuojant kitame lange. „Be RAG“ citatų pagrįstumo skaičiai yra `null`, nes šis matavimas netaikomas, o ne 0 %.
- Užklausa nebedubliuojama, kol laukiama priėmimo. Atmesta užklausa neprideda tuščio pokalbio ėjimo. Atnaujinus puslapį tęsiamas pradėtos užklausos stebėjimas. Dingus ryšiui bandoma prisijungti dar kartą, o ne automatiškai kurti naują užklausą.
- Naršyklėje laikoma mažesnė atsakymų kopija. Pilni promptai ir modelio žurnalai vėl perskaitomi iš vietinių atsakymų failų atidarius programą arba eksportuojant. Jei pilnas įrašas nepasiekiamas, tai pažymima; trūkstama kilmės informacija nesugalvojama.

Sąsajoje dabar atskirai rodomi **modelio pasitikėjimas**, **citatų sutapimas n/N** ir **žmogaus teisingumo balas**. Citatų skaičiui nebenaudojamas įspūdingai atrodantis 100 % patikimumo rodinys. Teisinio pagrindo pobūdis rodomas prie modelio išvados, siūloma formuluotė atskirta nuo originalios įvesties. Metodų lentelėje galima tiesiogiai palyginti šaltinių ir citatų kiekius, deklaruotą pasitikėjimą, žmogaus balą ir paieškos laiką. Tikslios citatos paspaudimas atveria atitinkamą vietą dešinėje; nuoroda į nepateiktą šaltinį neaktyvi.

Ši peržiūra neištaiso visų mažo vietinio modelio interpretavimo klaidų. Ypač vertinant teisinę pareigą ir konkretų projektavimo sprendimą reikia žmogaus peržiūros. Modelio pasitikėjimas tebėra nekalibruotas savęs vertinimas, o citatos egzistavimas nereiškia, kad ji logiškai pagrindžia visą išvadą.

## Aiškiai nurodyti straipsniai ir jų aprėptis (v6, 2026-10-27)

- Formuluotės „BDAR 17 ir 22 straipsnius“, „17(1) bei 22(1) str.“ ir „Articles 17 and 22“ atpažįstamos kaip kelios atskiros nuorodos. Visos paprašytos nuostatos įtraukiamos į kontekstą ir išlieka po perrikiavimo.
- Jei nurodytas visas straipsnis, pateikiami visi jo korpuse esantys fragmentai. Todėl aiškiai paprašytos nuostatos gali viršyti paieškos top-k. Pavyzdžiui, 17 ir 22 straipsniams reikia 7 fragmentų, nors top-k nustatytas 3. Tai atskirai rodoma sąsajoje ir išsaugoma žurnale.
- „Paprašytų straipsnių aprėptis“ atskiria nepateiktą šaltinį, pateiktą bet necituotą šaltinį ir atsakyme cituotą šaltinį. Tai nuorodų aprėpties patikra, ne teiginio teisingumo ar teisinio pagrįstumo įvertinimas.
- Kai modelio teiginys neturi citatos arba praleidžia paprašytą straipsnį, sistema atlieka daugiausia vieną pataisymo bandymą su tuo pačiu šaltinių rinkiniu. Nesėkmė lieka pažymėta. Pirminis atsakymas ir pataisymo nurodymas išsaugomi, o abiejų generavimų trukmė įtraukiama į laiką.
- Žinutė apie modelio nurodytą įrodymų trūkumą gali lydėti dalinį paaiškinimą. Ji nereiškia, kad modelis visai nieko neparašė. Tokiam atsakymui bendras pasitikėjimo procentas nerodomas.
- Ankstesni atsakymai nepergeneruojami ir neperrašomi. Juos atvėrus tik papildomai patikrinama paprašytų šaltinių aprėptis. Norint gauti atsakymą su pataisyta paieška, klausimą reikia pateikti iš naujo.
- Teiginiai apie tai, kad šaltinyje nėra pareigos ar nuostatos, papildomai pažymimi peržiūrai pagal teksto požymius. Tiksli citata savaime tokio nebuvimo neįrodo. Šis perspėjimas nėra automatinis klaidos įrodymas ar semantinio pagrįstumo balas.

## Korekcinis RAG (v7)

Pasirinkite **Korekcinis RAG**, kai norite bandyti kitokią RAG eigą: hibridinė paieška, šaltinių pakankamumo patikra ir, prireikus, naujos užklausos bei pakartotinė paieška. Nustatymų skiltyje **Korekcinio RAG derinimas** galima nustatyti 1–3 patikros etapus ir 1–3 papildomas užklausas. Su pradine 2 etapų riba leidžiama daugiausia viena papildomos paieškos eiga.

Prie atsakymo atverta **Korekcinio RAG eiga** parodo, kodėl paieška kartota ar sustabdyta. Patikra yra modelio nuomonė. Kai lieka įrodymų spragų, rodomas perspėjimas ir bendras confidence nematuojamas. Šis variantas gali užtrukti ilgiau ir nebūtinai duoti geresnį atsakymą.

Palyginimo lange galima rinktis **Hibridinis**, **Korekcinis RAG** ir **Be RAG**. Papildomai pateikiamas patikros etapų skaičius. Eksporte išsaugomos papildomos užklausos, šaltiniai, promptai ir modelio patikros išvestys. Pilnas metodo aprašas ir mokslinis šaltinis yra `CORRECTIVE_RAG.md`.


## UI v8: RAG-Fusion

1. Atnaujinkite puslapį ir pasirinkite **RAG-Fusion**.
2. Įrašykite klausimą ar reikalavimą. Atsakyme išskleista eiga rodo tikras užklausas, jų pirmus rezultatus ir bendrą RRF reitingą.
3. **Modelis ir parametrai → RAG-Fusion derinimas** leidžia keisti papildomų užklausų skaičių (2–5, pradinis 3), kandidatų vienai užklausai (1–100, pradinis 20) ir RRF konstantą (1–100, pradinė 60). Galutinį šaltinių skaičių keičia bendras fragmentų nustatymas.
4. Palyginkite su **Semantinis**, naudodami tą patį modelį, klausimą ir top-k. JSON eksportas saugo visą paieškos eigą.

Užklausų variantai gali nukrypti nuo klausimo. RRF balas yra rangų jungimo balas, ne pasitikėjimo procentas. Pagrindinė RAG-Fusion metodika įgyvendinta, tačiau publikuoti Infineon bandymai ir jų rezultatai šiuo papildymu nekartojami. Išsamiau: [RAG_FUSION.md](RAG_FUSION.md).
