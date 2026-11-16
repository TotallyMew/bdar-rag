# BDAR reikalavimų atsekamumas su RAG

Pakartojamas mini eksperimentas 15–20 min. pranešimui. Pagrindinis klausimas: **kaip paieškos metodas keičia atsakymui pateiktų BDAR įrodymų aprėptį ir žmogaus įvertintą atsakymo tinkamumą?**

**Pristatymo šablonas su planu:** [atidaryti PowerPoint](presentation/BDAR_RAG_skaidriu_sablonas_su_planu.pptx). 20 redaguojamų šabloninių skaidrių su numatomu turiniu, vietomis schemoms, penkių straipsnių iškarpoms, eksperimento rezultatams ir APA šaltiniais apačioje. Kopija taip pat padėta tiesiai darbalaukyje. [Detalus turinio ir kalbėjimo planas](presentation/SKAIDRIU_PLANAS.md). Ankstesni PPTX failai palikti kaip juodraščiai. Pilnas fiksuoto klausimyno LLM palyginimas ir tikras žmogaus vertinimas dar neatlikti.

## Pokalbio sąsaja

Darbalaukyje dukart spustelėkite **BDAR RAG laboratorija** arba šiame aplanke **Paleisti BDAR pokalbi.cmd**. Viena įvestis automatiškai atpažįsta klausimą arba reikalavimą. Galima rašyti savo klausimus, keisti sisteminius promptus bei generavimo ir paieškos parametrus, palyginti aštuonis variantus, matyti atskirą modelio deklaruojamą pasitikėjimą, peržiūrėti šaltinius, įvesti žmogaus vertinimą ir eksportuoti pokalbį. Instrukcija: `POKALBIO_INSTRUKCIJA.md`. Veikia vietoje, be paskyros ar API rakto.

Sąsajoje pagal numatytąją parinktį ieškoma **lietuviškame BDAR**. Kairėje galima perjungti į **EN** ir pakartoti tą pačią įvestį. Abiejų korpusų 389 fragmentų ID sutampa. Lietuviškas tekstas paimtas iš ES oficialiojo leidinio. Jį iš vietinės XHTML kopijos galima iš naujo suskaidyti komanda `python prepare_lt_corpus.py`. [Oficiali lietuviška redakcija](https://eur-lex.europa.eu/eli/reg/2016/679/oj/lit)

Atvėrus **RAG paieškos rezultatą** matyti tikros užklausos, reitingas ir kokie fragmentai perduoti modeliui. Reikalavimo kriterijus rašykite atskirose eilutėse su `K1.`, `K2.` ir t. t. Kiekvienam kriterijui rodoma jo paieška, modelio išvada ir citata, jeigu modelis ją pateikia. **Paieškos metrikos** apskaičiuoja Precision@k, Recall@k, F1 ir F2 pagal žmogaus įvestus aktualių fragmentų ID. Formalusis `rag_experiment.py` naudoja fiksuotą anglišką rinkinį.

## Kas jau atlikta

- Paruoštas viešo teisės akto korpusas: **99 straipsniai, 389 fragmentai**.
- Sukurta **20 užklausų**: 4 derinimui (`dev`), 12 pagrindiniam palyginimui (`test`), 4 ribiniams atvejams (`stress`).
- Paleistas tikras **BM25 ir TF-IDF paieškos** palyginimas. Rezultatai aplanke `results/final_k3`, ataskaita `report.html`. Top-k jautrumo paleidimai yra `results/final_k1` ir `results/final_k5`.
- Įdiegtas Ollama, atlikti tikri interaktyvūs atsakymų, hibridinės paieškos ir perrikiavimo bandymai. Visas fiksuoto klausimyno LLM palyginimas ir žmogaus vertinimas dar neatlikti.
- Etaloninių nuorodų ir vertinimo kriterijų failas `data/gold_draft.json` yra **AI parengtas juodraštis**, ne žmogaus ar teisės eksperto etalonas. Žmogaus vertinimas neatliktas. Šio fakto negalima pakeisti vien paleidžiant programą.

## Greitas paleidimas be papildomų bibliotekų

Reikia Python 3.10 arba naujesnio. Komandas vykdykite šiame aplanke:

```powershell
python rag_experiment.py prepare
python rag_experiment.py run
```

Šis režimas nenaudoja LLM, interneto ar mokamo API. Jis palygina du paieškos bazinius metodus ir išsaugo naują rezultatų aplanką. Tai **paieškos posistemės eksperimentas**, ne visas RAG.

## Pilnas RAG eksperimentas su vietiniais viešų svorių modeliais

1. Įdiekite [Ollama](https://ollama.com/download/windows) ir paleiskite programą.
2. Vieną kartą atsisiųskite modelius:

```powershell
ollama pull qwen2.5:3b
ollama pull nomic-embed-text
```

3. Paleiskite palyginimą su tuo pačiu atsakymų modeliu ir tomis pačiomis užklausomis:

```powershell
python rag_experiment.py run --backend ollama --methods no_rag,bm25,dense,hybrid,hybrid_rerank --split test
```

Skriptas modelių neįdiegia, jų tyliai nekeičia ir nepakeičia neveikiančio metodo kitu. Klaida lieka rezultatų faile, o procesas grąžina nesėkmės kodą. Modelių atsisiuntimui reikia interneto ir vietos diske. Atminties poreikis priklauso nuo konteksto ilgio ir įrangos. 3B modelis tinka mokomajam pilotui, jo lietuviški atsakymai gali būti silpnesni nei didesnio modelio.

### Lyginami variantai

| Pavadinimas | Paieška | Atsakymas |
|---|---|---|
| `no_rag` | Nėra | Tas pats Qwen modelis remiasi savo žiniomis |
| `bm25` | BM25, k1=1,5, b=0,75 | Qwen gauna top-3 fragmentus |
| `dense` | `nomic-embed-text`, kosinuso panašumas | Qwen gauna top-3 fragmentus |
| `hybrid` | BM25 top-20 + dense top-20, RRF c=60 | Qwen gauna top-3 fragmentus |
| `hybrid_rerank` | Tas pats hibridas, Qwen perrikiuoja 6 kandidatus | Qwen gauna galutinius top-3 fragmentus |
| `tfidf` | TF-IDF ir kosinuso panašumas | Papildomas klasikinis bazinis metodas |

Perrikiavimas yra **LLM relevance reranker**, ne cross-encoder. Agentas čia reiškia apribotą darbo eigą: paieška, pasirinktinai kandidatų perrikiavimas, atsakymas, mechaninė citatų patikra. Jis savarankiškai nenaršo ir neatlieka teisinių veiksmų.

`hybrid` yra tikras leksinės ir **tankios semantinės** paieškos hibridas. TF-IDF nėra tanki semantinė paieška ir nepristatomas kaip tokia.

## Demonstracija auditorijai, apie 2–3 min.

Iš anksto atsisiųskite modelius ir išbandykite demonstraciją. Pristatymo metu:

```powershell
python rag_experiment.py run --backend ollama --methods bm25,hybrid,hybrid_rerank --query-id T05 --demo
```

Klausimas: „Ar visada galiu reikalauti ištrinti įrašus, net jeigu juos būtina saugoti vykdant teisinę prievolę?“

1. Parodykite klausimą, rastų fragmentų ID ir jų tekstą.
2. Atverkite naujo rezultatų aplanko `report.html` naršyklėje.
3. Palyginkite, ar rasti tiek ištrynimo pagrindai (17 straipsnio 1 dalis), tiek išimtys (17 straipsnio 3 dalis).
4. Parodykite atsakymo teiginius, tikslias citatas ir patikros rezultatą.
5. Paaiškinkite, kad tiksli citata gali būti priskirta jos nepagrindžiamam teiginiui. Tam reikia žmogaus semantinio vertinimo.

Jeigu modelis suklysta ar neranda išimties, rodykite tikrą rezultatą. Prieš auditoriją neperrašykite atsakymo į „teisingą“.

## Duomenys ir atsekamumas

- `sources/gdpr_uk.xml`: pradinės **ES** reglamento 2016/679 redakcijos vieša XML kopija iš JK Nacionalinio archyvo valdomos [legislation.gov.uk](https://www.legislation.gov.uk/eur/2016/679/adopted/data.xml). Kelio `/adopted/` reikšmė svarbi: tai pradinė ES redakcija, **ne vėliau pakeistas UK GDPR**.
- Originalus autoritetingas ES šaltinis: [EUR-Lex](https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng). Tiesioginis atsisiuntimas parengimo metu buvo blokuojamas, todėl naudota aiškiai identifikuota vyriausybinė kopija.
- Tai fiksuotos redakcijos mokomasis eksperimentas, ne aktualios teisės, nacionalinių išimčių, EDPB išaiškinimų ir teismų praktikos išsami analizė. Korpusas apima straipsnius, **ne preambulės konstatuojamąsias dalis**. T02 klausimo interpretacijai konstatuojamoji dalis 32 būtų papildomas reikalingas įrodymas, todėl šio testo apribojimas užfiksuotas juodraštiniame etalone.
- `data/corpus.json`: vienas numeruotas straipsnio punktas viename fragmente. Žemiau esantys sąrašai ir išimtys paliekami kartu. Jeigu straipsnis taip nesunumeruotas, laikomas visas straipsnis. Tekstas tyliai netrumpinamas.
- `data/queries.json`: nekintantys klausimai angliškai paieškai ir lietuviški jų vertimai demonstracijai. Modelis atsako lietuviškai. Tai nesuteikia įrodymų apie paiešką lietuviškais klausimais.
- `data/gold_draft.json`: atskirai laikomi AI pasiūlyti būtini punktai, tikėtinos išvados ir anotavimo būsena. Paieškos bei generavimo metodai šių etiketėmis pažymėtų duomenų **negauna**.
- `data/prompts.json`: tikslios sisteminės užklausos. Visų metodų RAG generavimo užklausa vienoda. `no_rag` gauna tą patį klausimą be šaltinių ir nurodymą necituoti neegzistuojančių ištraukų.

`manifest.json` išsaugo kodo, duomenų, etalono ir užklausų SHA-256, modelių Ollama digest, programos versiją, parametrus, aplinką ir paleidimo laiką UTC. Konkrečių modelių žymos gali kisti, todėl lyginkite digest. `temperature=0` ir `seed=42` mažina variaciją, tačiau negarantuoja vienodo rezultato skirtingoje įrangoje ar Ollama versijose. Esami rezultatų aplankai neperrašomi.

## Vertinimo planas

**Prieš galutinį eksperimentą:** žmogus, pageidautina turintis BDAR žinių, perskaito kiekvieną klausimą ir šaltinį, pataiso / patvirtina `gold_draft.json`, įrašo `human_reviewer` ir `human_confirmed=true`. Išsaugokite pakeistą etalono versiją. Pradinis paleidimas prieš šį patvirtinimą tėra pilotas.

Derinimui naudokite tik `dev`. Galima iš anksto pasirinkti top-k=3 ir kandidatų skaičių=6. Jei derinate, nedarykite to pagal `test` rezultatą. Testų turinį, etiketes ir parametrus užfiksuokite prieš pagrindinį paleidimą. Kadangi dabartinio piloto rezultatai jau matyti, griežtam patvirtinamajam tyrimui verta sukurti naują nepriklausomą testų imtį. Šis darbas yra žvalgomasis mini tyrimas.

### Automatiniai rodikliai

- **Recall@k:** rastų būtinų punktų skaičius / visų etalone nurodytų būtinų punktų skaičius. Pateikiamas klausimų makrovidurkis.
- **Precision@k:** rastų būtinų punktų skaičius / faktiškai pateiktų fragmentų skaičius. Rodiklis priklauso nuo žmogaus sudaryto aktualių punktų sąrašo išsamumo. Papildoma naudinga nuoroda gali klaidingai atrodyti nereikšminga.
- **MRR@k:** 1 / pirmojo būtino punkto rangas, arba 0, jei jo nėra top-k.
- **Visų būtinų punktų aprėptis:** klausimų, kuriems rasti visi būtini punktai, dalis.
- **Nuorodų ID egzistavimas:** ar modelis cituoja tik gautus fragmentus.
- **Tikslios citatos dalis:** ar cituotas tekstas, normalizavus tarpus, iš tiesų egzistuoja nurodytame fragmente. Tai **nėra semantinis pagrįstumas**.
- **Paieškos / generavimo trukmė:** atskirai. Paieškos indeksavimas ir dokumentų embeddingų parengimas neįtraukti. Hibrido perrikiavimo laikas įtrauktas į jo paieškos trukmę. Vienas paleidimas nėra patikimas greičio tyrimas.

S01 yra neatsakomas mokesčių klausimas. Jo etalonas tuščias, todėl Recall ir MRR nenustatomi, o ne prilyginami 100 %. Teisingą atsisakymą vertina žmogus. Rezultatų suvestinėje `n_retrieval_evaluated` rodo tikrą šių rodiklių vardiklį. `no_rag` atveju paieškos rodikliai netaikomi.

### Žmogaus vertinimas

Po pilno LLM paleidimo sugeneruojamas `human_review.csv` su atsitiktiniais B001 tipo ID. Vertintojas nemato metodo pavadinimo. Atskirą `review_key_private.json` saugokite nuo vertintojo iki anotavimo pabaigos. Stilius ar atsakymo tekstas gali dalinai atskleisti metodą, todėl aklinimas nėra tobulas.

Pildomi laukai:

| Laukas | Reikšmė |
|---|---|
| `reviewer` | Tikro vertintojo vardas arba sutartas kodas |
| `correctness_0_2` | 0 klaidinga / klaidinanti, 1 iš dalies teisinga, 2 teisinga |
| `completeness_0_2` | 0 neatsako, 1 praleidžia reikšmingas sąlygas, 2 apima būtinas sąlygas / išimtis |
| `supported_claims` | Kiek reikšmingų teiginių iš tiesų pagrindžia nurodyti šaltiniai |
| `total_material_claims` | Kiek iš viso yra reikšmingų teiginių |
| `abstention_appropriate_0_1` | 1 atsakymo / atsisakymo sprendimas tinkamas, 0 netinkamas |
| `review_minutes` | Faktiškai užtruktas laikas, ne spėjimas |
| `notes` | Klaidos, praleista išimtis, netinkama citata ir kt. |

```powershell
python rag_experiment.py evaluate-human results/PALEIDIMO_APLANKAS
```

Programa atsisako išvesti žmogaus rezultatą iš neužpildytos formos. Jei LLM atsako į klausimą be šaltinių, jo teisingumą vertintojas tikrina pagal tą patį viešą korpusą, tačiau citavimo rodiklius tokiam variantui žymime „netaikoma“. Pageidautina du nepriklausomi vertintojai ir nesutarimų aptarimas. 12 pagrindinių klausimų leidžia parodyti mechanizmą, bet neįrodo bendro tinkamumo visiems BDAR atvejams.

`no_rag` eilutėms `supported_claims` ir `total_material_claims` galima palikti tuščius: jų citavimo pagrįstumo rodiklis neskaičiuojamas. Aklajame pildyme vertinkite pateiktą atsakymą, o šį skirtumą rezultatų apdorojimas pritaikys pagal atskirą metodo raktą.

## Rezultatų failai

- `records.jsonl`: visos užklausos, faktinis kontekstas, pilni modelių išvedimai, klaidos ir rodikliai.
- `summary.csv`, `summary.json`: atskiros dev / test / stress suvestinės.
- `report.html`: vietinė ataskaita pristatymui, rodanti šaltinius ir atsakymus.
- `manifest.json`: eksperimentui pakartoti būtinos versijos ir parametrai.
- `document_embeddings.json`: tikros tankios paieškos vektoriai, kai toks režimas naudotas.
- `human_review.csv`, `human_summary.csv`: žmogaus vertinimo įvestis ir, tik užpildžius, rezultatai.

## Papildomi patikrinimai

```powershell
python -m unittest test_experiment.py
python rag_experiment.py run --methods bm25,tfidf --split test --top-k 1
python rag_experiment.py run --methods bm25,tfidf --split test --top-k 5
```

Top-k jautrumą laikykite atskiru žvalgomuoju eksperimentu. Nepasirinkite geriausio testinio top-k ir nepristatykite jo kaip iš anksto numatyto parametro.

Testai tikrina ir visus penkis pilnos darbo eigos kelius naudodami aiškiai pažymėtą modelio imitaciją. Imituoti atsakymai laikomi laikinuose testų aplankuose ir **nepateikiami kaip eksperimentiniai rezultatai**. Tai nėra tikro Qwen ar Ollama integracijos išbandymo pakaitalas.

## Atsakingas naudojimas ir tyrimo ribos

Užduoties klausimai, juodraštinės etiketės ir programos parengimas naudojo AI. Žmogus turi patikrinti mokslinius teiginius, bibliografiją, teisines interpretacijas ir patvirtinti savo indėlį. Nereikia siųsti asmens duomenų ar konfidencialių organizacijos dokumentų: pateikti klausimai sintetiniai, korpusas viešas. Viskas vyksta vietoje per localhost, jei nepakeičiate `--host`.

Užduotyje pateikto VILNIUS TECH Moodle dokumento turinys parengimo metu nebuvo pasiekiamas, todėl neatliekamas teiginys, kad visos jo taisyklės patikrintos. Prieš pateikimą perskaitykite jį savo universiteto paskyroje ir pritaikykite reikalaujamą AI naudojimo deklaraciją.


Logikos ir sąsajos peržiūros pataisos bei patikrinimai: `REVIEW_NOTES.md`. 5 versijoje pridėta aiškesnė metodų palyginimo lentelė, atskiri modelio pasitikėjimo, citatų ir žmogaus vertinimo rodikliai, puslapio atnaujinimo atkūrimas bei ištaisyti paieškos laiko ir įrašų saugojimo trūkumai.

## Naujas variantas: Korekcinis RAG (v7)

UI pasirinkimas **Korekcinis RAG** papildo hibridinę paiešką modelio atliekama šaltinių pakankamumo patikra ir ribota papildoma paieška. Tai vietinė CRAG idėjos adaptacija fiksuotam BDAR korpusui. Nustatymuose galima keisti patikros etapų ir papildomų užklausų skaičių, o prie atsakymo matyti atliktos eigos žurnalas. Išsamus metodas, šaltinis ir pakartojimo planas: [CORRECTIVE_RAG.md](CORRECTIVE_RAG.md).

Šis variantas įtrauktas į UI palyginimą ir JSON eksportą. Ankstesnio formalaus paieškos piloto skaičiai nekeičiami ir nėra šio naujo varianto efektyvumo įrodymas.


## UI v8: RAG-Fusion

Pridėtas **RAG-Fusion**: LLM sukuria papildomas užklausas, kiekvienai atliekama vektorinė paieška, rangai sujungiami standartiniu RRF ir generuojamas atsakymas. Tai pagrindinio metodo įgyvendinimas su vietiniais modeliais ir BDAR korpusu; tai nėra straipsnio eksperimento rezultatų reprodukcija. Visa eiga, formulė, parametrai ir pakartojimas: [RAG_FUSION.md](RAG_FUSION.md). Ankstesnis korekcinis variantas sąraše aiškiai pažymėtas kaip adaptacija.
