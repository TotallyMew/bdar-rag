# Skaidrių planas: reikalavimų atsekamumas su RAG – BDAR atvejis

**Pristatymo trukmė: apie 18 min. 30 sek. + auditorijos klausimai.** Numatyta 20 pagrindinių skaidrių, iš jų viena skirta maždaug 2 min. 30 sek. gyvai demonstracijai. Kiekvienoje – viena pagrindinė mintis. Šis dokumentas yra naujasis pristatymo rengimo planas; ankstesni PPTX failai palikti kaip juodraščiai.

Auditorijai pirmiausia paaiškinama, kas yra RAG ir kam jo reikia. Tuomet atskiriamos architektūros ir paieškos metodai, aptariami penkių mokslinių darbų įrodymai ir pereinama prie mūsų eksperimento. Rezultatai ir dar tik planuojamas vertinimas aiškiai atskirti.

**Būsena 2026-10-26:** atliktas BM25 ir TF-IDF paieškos pilotas bei interaktyvūs bandymai. Pilnas fiksuotų užklausų LLM metodų palyginimas ir tikras žmogaus vertinimas dar neatlikti. Etalonas yra AI parengtas juodraštis. Prieš galutinį pranešimą 17 ir 20 skaidres būtina atnaujinti tikrais galutiniais rezultatais.

## Pristatymo eiga

| Nr. | Skaidrė | Trukmė |
|---|---|---:|
| 1 | Reikalavimų atsekamumas su RAG: BDAR atvejis | 0:20 |
| 2 | Kas yra reikalavimų atsekamumas? | 0:45 |
| 3 | Kaip tai atliekama prieš AI ir su AI? | 0:40 |
| 4 | Kas yra RAG? | 0:55 |
| 5 | Kaip veikia RAG žingsnis po žingsnio? | 0:55 |
| 6 | Kokie yra RAG tipai ir plėtiniai? | 1:00 |
| 7 | Kokius RAG variantus lygina mūsų eksperimentas? | 0:55 |
| 8 | Kam RAG naudojamas dabar? | 0:40 |
| 9 | Tyrimas 1: teisinių reikalavimų ryšių radimas | 0:45 |
| 10 | Tyrimas 2: teisinę paiešką reikia vertinti atskirai | 0:35 |
| 11 | Tyrimas 3: citavimo kokybė ir teisingumas gali skirtis | 0:45 |
| 12 | Tyrimas 4: RAG kokybė turi kelias dimensijas | 0:40 |
| 13 | Tyrimas 5: daugiau konteksto ne visada padeda | 0:35 |
| 14 | Mūsų mini eksperimentas: klausimas, duomenys ir modeliai | 1:00 |
| 15 | Kaip užtikriname sąžiningą ir pakartojamą palyginimą? | 1:15 |
| 16 | Kaip vertinsime atsakymą ir žmogaus rezultatą? | 1:00 |
| 17 | Ką jau parodė atliktas paieškos pilotas? | 1:30 |
| 18 | Gyva demonstracija: nuo teiginio iki patikrinamo pagrindimo | 2:30 |
| 19 | Rizikos ir konkretūs pasiūlymai | 1:15 |
| 20 | Ką galime pagrįstai teigti ir ką tiriame toliau? | 0:30 |

## Kas bus kiekvienoje skaidrėje

Toliau „rodyti“ reiškia turinį auditorijai, o „paaiškinti“ – pranešėjo pastabas. Visas planas neturi būti perkeltas į skaidres pažodžiui.

Kiekvienos skaidrės tekste vartoti autoriaus–metų nuorodas. Apačioje įdėti būtent tai skaidrei nurodytus APA bibliografinius aprašus. Lentelių ir straipsnių iškarpų kilmę nurodyti ir prie vaizdo. T. Gao ir Y. Gao atskirti inicialais. Du skirtingus Fuchß ir bendraautorių 2025 m. darbus tekste atskirti pagal antrą autorių: „Fuchß, Hey, et al.“ (LiSSA) ir „Fuchß, Schwedt, et al.“ (Beyond retrieval).

### 01. Reikalavimų atsekamumas su RAG: BDAR atvejis · 0:20

**Rodyti:**

- Tema, pranešėjo vardas, data.
- Tyrimo klausimas: kaip paieškos metodas veikia rastus BDAR įrodymus ir atsakymo tinkamumą?

**Paaiškinti:** Trumpai pristatyti kelią: RAG pagrindai → moksliniai tyrimai → mūsų eksperimentas → rizikos ir pasiūlymai.

**Vizualas:** Viena paprasta grandinė: reikalavimas → teisės nuostata → pagrindimas.

**Nuoroda skaidrės tekste:** (Hey et al., 2025).

**APA skaidrės apačioje:**

Hey, T., Fuchß, D., Keim, J., & Koziolek, A. (2025). Requirements traceability link recovery via retrieval-augmented generation. In A. Hess & A. Susi (Eds.), Requirements engineering: Foundation for software quality (pp. 381–397). Springer. https://doi.org/10.1007/978-3-031-88531-0_27

### 02. Kas yra reikalavimų atsekamumas? · 0:45

**Rodyti:**

- Atsekamumas – dokumentuotas ryšys tarp reikalavimo ir jį pagrindžiančių ar įgyvendinančių artefaktų.
- Mūsų atveju: sistemos reikalavimas → konkretus BDAR punktas → paaiškinimas ir sąlygos.
- Platesnėje sistemoje: teisės nuostata → reikalavimas → kodas → testas.

**Paaiškinti:** Reikia parodyti, iš kur atsirado reikalavimas ir ką keisti pasikeitus šaltiniui. Ryšio su teisės aktu radimas dar neparodo, kad funkcija įgyvendinta programoje.

**Vizualas:** Maža atsekamumo matrica su vienu sintetiniu reikalavimu ir stulpeliu „įgyvendinimo įrodymas: nepateiktas“.

**Nuoroda skaidrės tekste:** (Fuchß, Hey, et al., 2025).

**APA skaidrės apačioje:**

Fuchß, D., Hey, T., Keim, J., Liu, H., Ewald, N., Thirolf, T., & Koziolek, A. (2025). LiSSA: Toward generic traceability link recovery through retrieval-augmented generation. In 2025 IEEE/ACM 47th International Conference on Software Engineering (pp. 1396–1408). IEEE. https://doi.org/10.1109/ICSE55347.2025.00186

### 03. Kaip tai atliekama prieš AI ir su AI? · 0:40

**Rodyti:**

- Rankiniu būdu: skaityti dokumentus, ieškoti nuostatų, užrašyti ryšius ir juos atnaujinti.
- Klasikinė paieška: raktažodžiai, BM25 ar TF-IDF pasiūlo galimus fragmentus.
- Su RAG: sistema randa fragmentus, modelis pateikia paaiškinimą, žmogus patikrina ryšį.

**Paaiškinti:** „Prieš AI“ nereiškia „be automatizavimo“. Paieška jau buvo naudojama; generatyvus modelis prideda natūralios kalbos paaiškinimą.

**Vizualas:** Trys proceso juostos: rankinis darbas, paieška, RAG su žmogaus patikra.

**Nuoroda skaidrės tekste:** (Hey et al., 2025).

**APA skaidrės apačioje:**

Hey, T., Fuchß, D., Keim, J., & Koziolek, A. (2025). Requirements traceability link recovery via retrieval-augmented generation. In A. Hess & A. Susi (Eds.), Requirements engineering: Foundation for software quality (pp. 381–397). Springer. https://doi.org/10.1007/978-3-031-88531-0_27

### 04. Kas yra RAG? · 0:55

**Rodyti:**

- RAG = Retrieval-Augmented Generation; atsakymo generavimas, papildytas rasta informacija.
- Pirmiausia sistema suranda susijusius dokumentų fragmentus, tada pateikia juos kalbos modeliui kartu su užklausa.
- Modelis formuluoja atsakymą, kurį galima susieti su pateiktais šaltiniais.

**Paaiškinti:** Didysis kalbos modelis (LLM) generuoja tekstą pagal įvestį. Pavyzdys: pateikus klausimą apie sutikimo atšaukimą, jis gauna konkrečią ištrauką, o ne vien remiasi savo anksčiau išmoktomis žiniomis. Mūsų variante modelio svoriai nekeičiami; dokumentai pateikiami atsakymo kontekste. RAG galima derinti ir su papildomu modelio mokymu.

**Vizualas:** Dviejų šakų schema: užklausa → modelis ir užklausa → dokumentų paieška → modelis. Schemos antraštė „Autoriaus schema pagal Lewis et al. (2020)“.

**Nuoroda skaidrės tekste:** (Lewis et al., 2020).

**APA skaidrės apačioje:**

Lewis, P., Perez, E., Piktus, A., Petroni, F., Karpukhin, V., Goyal, N., Küttler, H., Lewis, M., Yih, W.-t., Rocktäschel, T., Riedel, S., & Kiela, D. (2020). Retrieval-augmented generation for knowledge-intensive NLP tasks. Advances in Neural Information Processing Systems, 33, 9459–9474. https://arxiv.org/abs/2005.11401

### 05. Kaip veikia RAG žingsnis po žingsnio? · 0:55

**Rodyti:**

- Parengimas: dokumentai → fragmentai → indeksas.
- Atsakymas: užklausa → paieška → geriausi fragmentai → modelis → atsakymas su nuorodomis.
- Vektorinėje paieškoje tekstai paverčiami skaitiniais reikšmės atvaizdais – embeddingais.

**Paaiškinti:** Fragmentas – nedidelė dokumento dalis. Indeksas padeda ją rasti. Top-k – kiek geriausiai įvertintų fragmentų pateikiama. Vektoriniai embeddingai naudojami semantinei paieškai; leksinei BM25 paieškai jų nereikia.

**Vizualas:** Dvi aiškios eilutės: duomenų parengimas ir vienos užklausos vykdymas. Prie išvesties parodyti fragmento ID ir šaltinio redakciją.

**Nuoroda skaidrės tekste:** (Lewis et al., 2020); projekto duomenys (2026).

**APA skaidrės apačioje:**

Lewis, P., Perez, E., Piktus, A., Petroni, F., Karpukhin, V., Goyal, N., Küttler, H., Lewis, M., Yih, W.-t., Rocktäschel, T., Riedel, S., & Kiela, D. (2020). Retrieval-augmented generation for knowledge-intensive NLP tasks. Advances in Neural Information Processing Systems, 33, 9459–9474. https://arxiv.org/abs/2005.11401

BDAR RAG eksperimento projekto medžiaga. (2026). Korpusas, užklausos, programos kodas ir paieškos piloto rezultatai [Nepublikuotas duomenų ir programinės įrangos rinkinys]. Vietinis aplankas: rag_bdar. Prieš galutinį pateikimą įrašyti tikrą autorių ir viešo paketo URL.

### 06. Kokie yra RAG tipai ir plėtiniai? · 1:00

**Rodyti:**

- Pagrindinis (Naive): paieška → kontekstas → generavimas.
- Pažangesnis (Advanced): pagerinama užklausa, atranka ar fragmentų tvarka.
- Modulinis (Modular): komponuojami ir kartojami skirtingi paieškos bei apdorojimo moduliai.
- Plėtiniai: GraphRAG naudoja esybių ir ryšių grafą; agentinis RAG planuoja paieškos veiksmus ir gali ieškoti pakartotinai.

**Paaiškinti:** Tai nėra viena griežta, tarpusavyje nesikertanti klasifikacija: grafą ar agentinę eigą galima derinti su pažangesniu ir moduliniu RAG. Mūsų laboratorija lygina paieškos variantus ir ribotą darbo eigą; ji neįgyvendina GraphRAG ir savarankiškai naršančio agento.

**Vizualas:** Trys pagrindinės architektūros kortelės ir po jomis du plėtinių pavyzdžiai. Smulkius variantus palikti atsarginei skaidrei.

**Nuoroda skaidrės tekste:** (Y. Gao et al., 2024; Edge et al., 2025).

**APA skaidrės apačioje:**

Gao, Y., Xiong, Y., Gao, X., Jia, K., Pan, J., Bi, Y., Dai, Y., Sun, J., Wang, M., & Wang, H. (2024). Retrieval-augmented generation for large language models: A survey (Version 5) [Preprint]. arXiv. https://doi.org/10.48550/arXiv.2312.10997

Edge, D., Trinh, H., Cheng, N., Bradley, J., Chao, A., Mody, A., Truitt, S., Metropolitansky, D., Ness, R. O., & Larson, J. (2025). From local to global: A graph RAG approach to query-focused summarization (Version 2) [Preprint]. arXiv. https://doi.org/10.48550/arXiv.2404.16130

### 07. Kokius RAG variantus lygina mūsų eksperimentas? · 0:55

**Rodyti:**

- Be RAG: tas pats modelis gauna užklausą be dokumentų paieškos; tai palyginimo atskaitos taškas.
- BM25 ir TF-IDF: leksinė paieška pagal žodžius.
- Semantinis: panašumas pagal nomic-embed-text vektorius.
- Hibridinis: BM25 ir semantinės paieškos rangų sujungimas.
- Hibridinis su perrikiavimu: LLM papildomai įvertina kandidatų aktualumą.

**Paaiškinti:** BM25, semantinis ir hibridinis nėra lygiaverčiai ankstesnės skaidrės architektūrų pavadinimai – tai paieškos pasirinkimai. Didesnis kandidatų skaičius ar papildomas filtravimas turi būti tikrinamas konkrečioje užduotyje.

**Vizualas:** Palyginimo lentelė: variantas, kaip ieško, ar modelis gauna šaltinius. Rodyti tik penkias paieškos eilutes ir atskirą „Be RAG“ eilutę.

**Nuoroda skaidrės tekste:** (Fuchß, Schwedt, et al., 2025); projekto metodai (2026).

**APA skaidrės apačioje:**

Fuchß, D., Schwedt, S., Keim, J., & Hey, T. (2025). Beyond retrieval: A study of using LLM ensembles for candidate filtering in requirements traceability. In 2025 IEEE 33rd International Requirements Engineering Conference Workshops (pp. 5–12). IEEE. https://doi.org/10.1109/REW66121.2025.00006

BDAR RAG eksperimento projekto medžiaga. (2026). Korpusas, užklausos, programos kodas ir paieškos piloto rezultatai [Nepublikuotas duomenų ir programinės įrangos rinkinys]. Vietinis aplankas: rag_bdar. Prieš galutinį pateikimą įrašyti tikrą autorių ir viešo paketo URL.

### 08. Kam RAG naudojamas dabar? · 0:40

**Rodyti:**

- Organizacijų žinių bazės: atsakymai pagal vidaus taisykles, instrukcijas ir dokumentaciją.
- Pagalba klientams ir darbuotojams: atsakymai pagal konkrečios organizacijos turinį.
- Teisinė ir atitikties analizė: reikalingų nuostatų paieška ir jų paaiškinimas.
- Programinės įrangos inžinerija: reikalavimų ir kitų artefaktų ryšių atkūrimas.

**Paaiškinti:** Praktinės RAG infrastruktūros pavyzdžiai – Azure AI Search ir Amazon Bedrock Knowledge Bases. Dokumentų prieiga, jų redakcijos ir šaltinių kokybė išlieka svarbios. Atsekamumą programinės įrangos inžinerijoje iliustruoja LiSSA tyrimas.

**Vizualas:** Keturi naudojimo pavyzdžiai su po vieną konkrečią užklausą. Pateikti kaip taikymo kategorijas, be nepagrįstų rinkos paplitimo procentų.

**Nuoroda skaidrės tekste:** (Microsoft, n.d.; Amazon Web Services, n.d.; Fuchß, Hey, et al., 2025).

**APA skaidrės apačioje:**

Microsoft. (n.d.). Retrieval-augmented generation (RAG) in Azure AI Search. Microsoft Learn. Retrieved October 26, 2026, from https://learn.microsoft.com/en-us/azure/search/retrieval-augmented-generation-overview

Amazon Web Services. (n.d.). Retrieve data and generate AI responses with Amazon Bedrock Knowledge Bases. Retrieved October 26, 2026, from https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base.html

Fuchß, D., Hey, T., Keim, J., Liu, H., Ewald, N., Thirolf, T., & Koziolek, A. (2025). LiSSA: Toward generic traceability link recovery through retrieval-augmented generation. In 2025 IEEE/ACM 47th International Conference on Software Engineering (pp. 1396–1408). IEEE. https://doi.org/10.1109/ICSE55347.2025.00186

### 09. Tyrimas 1: teisinių reikalavimų ryšių radimas · 0:45

**Rodyti:**

- Etezadi et al. (2026): empirinis teisinių reikalavimų atsekamumo tyrimas.
- Rice_LRT vidurkiai: Recall 83,9 %, Precision 29,4 %, F2 61,1 %.
- Išvada mūsų darbui: daug rastų ryšių gali reikšti ir daug netinkamų kandidatų.

**Paaiškinti:** Recall rodo, kiek tikrų ryšių rasta, Precision – kiek pasiūlytų ryšių buvo teisingi. Tai ryšių atkūrimo, o ne mūsų pokalbių atsakymų teisingumo rezultatai. Tyrimo nepavadinti visų RAG sistemų įrodymu.

**Vizualas:** MOKSLINIO STRAIPSNIO EKRANO VAIZDAS 1: evidence/etezadi2026.png. 9 lentelėje pažymėti Rice_LRT Average eilutę. Pridėti straipsnio pavadinimą ir autorius.

**Nuoroda skaidrės tekste:** (Etezadi et al., 2026, 9 lentelė).

**APA skaidrės apačioje:**

Etezadi, R., Abualhaija, S., Arora, C., & Briand, L. (2026). Classifier or prompt: A case study on legal requirements traceability. Empirical Software Engineering, 31, Article 85. https://doi.org/10.1007/s10664-026-10827-1

### 10. Tyrimas 2: teisinę paiešką reikia vertinti atskirai · 0:35

**Rodyti:**

- LegalBench-RAG skirtas teisinio RAG paieškos komponentui vertinti.
- Mini rinkinyje – 776 užklausos iš keturių užduočių grupių.
- Mūsų darbui: tikrinti konkrečius reikalingus fragmentus, o ne vien viso dokumento radimą.

**Paaiškinti:** Tai kito tyrimo viešo etalono pavyzdys. Mūsų BDAR korpusas nėra LegalBench-RAG, jo žmogaus anotacijų neperimame. Darbas yra preprintas.

**Vizualas:** MOKSLINIO STRAIPSNIO EKRANO VAIZDAS 2: evidence/legalbenchrag2024.png. 3 lentelėje pažymėti bendrą 776 užklausų skaičių ir paaiškinti etalono paskirtį.

**Nuoroda skaidrės tekste:** (Pipitone & Alami, 2024, 3 lentelė).

**APA skaidrės apačioje:**

Pipitone, N., & Alami, G. H. (2024). LegalBench-RAG: A benchmark for retrieval-augmented generation in the legal domain [Preprint]. arXiv. https://doi.org/10.48550/arXiv.2408.10343

### 11. Tyrimas 3: citavimo kokybė ir teisingumas gali skirtis · 0:45

**Rodyti:**

- ALCE, ASQA užduotis: citavimo recall 73,6 → 84,8.
- Tuo pat metu teisingumo EM recall 40,4 → 40,2.
- Mūsų darbui: daugiau ar geresnių citatų savaime neįrodo geresnio atsakymo.

**Paaiškinti:** Palyginamos VANILLA ir atsakymų RERANK eilutės. Šiame straipsnyje RERANK atrenka sugeneruotus atsakymus; mūsų programoje perrikiuojami dokumentų kandidatai. Šių metodų nesutapatinti.

**Vizualas:** MOKSLINIO STRAIPSNIO EKRANO VAIZDAS 3: evidence/alce2023.png. 4 lentelėje atskirai pažymėti citavimo ir teisingumo stulpelius.

**Nuoroda skaidrės tekste:** (T. Gao et al., 2023, 4 lentelė).

**APA skaidrės apačioje:**

Gao, T., Yen, H., Yu, J., & Chen, D. (2023). Enabling large language models to generate text with citations. In Proceedings of EMNLP 2023 (pp. 6465–6488). Association for Computational Linguistics. https://doi.org/10.18653/v1/2023.emnlp-main.398

### 12. Tyrimas 4: RAG kokybė turi kelias dimensijas · 0:40

**Rodyti:**

- RAGAs atskiria atsakymo pagrįstumą, atsakymo aktualumą ir konteksto aktualumą.
- WikiEval porinių palyginimų sutapimas su žmonėmis: 0,95 / 0,78 / 0,70.
- Mūsų darbui: vertinti paiešką, teiginių pagrindimą ir atsakymo turinį atskirai.

**Paaiškinti:** Šie skaičiai reiškia automatinio vertinimo sutapimą su žmonių poriniais sprendimais. Jie nereiškia, kad RAG ar mūsų BDAR atsakymai yra 95 % teisingi. Mūsų programos mechaninė citatų patikra nėra RAGAs pagrįstumo vertintojas.

**Vizualas:** MOKSLINIO STRAIPSNIO EKRANO VAIZDAS 4: evidence/ragas2024.png. 4 lentelėje pažymėti tris RAGAs reikšmes.

**Nuoroda skaidrės tekste:** (Es et al., 2024, 4 lentelė).

**APA skaidrės apačioje:**

Es, S., James, J., Espinosa Anke, L., & Schockaert, S. (2024). RAGAs: Automated evaluation of retrieval augmented generation. In Proceedings of the 18th EACL: System Demonstrations (pp. 150–158). Association for Computational Linguistics. https://doi.org/10.18653/v1/2024.eacl-demo.16

### 13. Tyrimas 5: daugiau konteksto ne visada padeda · 0:35

**Rodyti:**

- Lost in the Middle: tirtų modelių rezultatai priklausė nuo aktualaus teksto vietos kontekste.
- Kai reikalinga informacija buvo viduryje, dalyje bandymų rezultatai suprastėjo.
- Mūsų darbui: keisti top-k ir fragmentų tvarką reikia matuojant rezultatą.

**Paaiškinti:** Parodyti konkretaus tyrimo kreivę. Neapibendrinti jos visiems dabartiniams modeliams ir neteigti, kad kiekvienas papildomas fragmentas kenkia.

**Vizualas:** MOKSLINIO STRAIPSNIO EKRANO VAIZDAS 5: evidence/lostmiddle2024.png. 1 paveiksle pažymėti kreivės vidurinę dalį.

**Nuoroda skaidrės tekste:** (Liu et al., 2024, 1 pav.).

**APA skaidrės apačioje:**

Liu, N. F., Lin, K., Hewitt, J., Paranjape, A., Bevilacqua, M., Petroni, F., & Liang, P. (2024). Lost in the middle: How language models use long contexts. Transactions of the Association for Computational Linguistics, 12, 157–173. https://doi.org/10.1162/tacl_a_00638

### 14. Mūsų mini eksperimentas: klausimas, duomenys ir modeliai · 1:00

**Rodyti:**

- Klausimas: kuris paieškos variantas geriau pateikia būtinus BDAR įrodymus ir padeda atsakyti?
- Viešas fiksuotos pradinės ES BDAR redakcijos korpusas: 99 straipsniai, 389 fragmentai.
- 20 užklausų: 4 derinimui, 12 palyginimui, 4 ribiniams atvejams.
- Siūlomas vienas generavimo modelis visam naujam palyginimui: qwen3.5:4b; embeddingai: nomic-embed-text; vykdymas per Ollama vietoje.

**Paaiškinti:** Skaičiai apie korpusą ir užklausas jau patikrinti vietiniuose failuose. UI numatytasis modelis šiuo metu qwen3.5:4b, tačiau pilnas fiksuoto klausimyno LLM palyginimas dar neatliktas. Skaidrėje po jo reikia įrašyti faktiškai naudotą modelį ir digest. Korpuse nėra visų teisės aiškinimo šaltinių ar sistemos kodo.

**Vizualas:** Eksperimento kortelė: duomenys, modeliai, metodai, užklausos. Apačioje aiškus žymėjimas „fiksuotos redakcijos mokomasis pilotas“.

**Nuoroda skaidrės tekste:** (European Parliament & Council of the European Union, 2016); projekto medžiaga (2026).

**APA skaidrės apačioje:**

European Parliament & Council of the European Union. (2016). Regulation (EU) 2016/679. Official Journal of the European Union, L 119, 1–88. https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng

BDAR RAG eksperimento projekto medžiaga. (2026). Korpusas, užklausos, programos kodas ir paieškos piloto rezultatai [Nepublikuotas duomenų ir programinės įrangos rinkinys]. Vietinis aplankas: rag_bdar. Prieš galutinį pateikimą įrašyti tikrą autorių ir viešo paketo URL.

### 15. Kaip užtikriname sąžiningą ir pakartojamą palyginimą? · 1:15

**Rodyti:**

- Tie patys klausimai, generavimo modelis ir palyginami atsakymo nurodymai; kinta pasirinktas paieškos metodas.
- Pagrindinis palyginimas: Be RAG, BM25, semantinis, hibridinis, hibridinis su perrikiavimu; TF-IDF – papildomas bazinis variantas.
- Iš anksto užfiksuoti top-k, kandidatų skaičių, promptus, temperatūrą, seed, modelio ir duomenų versijas.
- Atskirti pagrindinį palyginimą nuo papildomų parametrų bandymų.

**Paaiškinti:** Interaktyvi UI automatiškai interpretuoja klausimą ar teiginį ir gali išplėsti paiešką. Esamas formalus skriptas turi kitą, fiksuotą eigą: jų rezultatų nemaišome. Formaliame rinkinyje paieškos klausimai yra angliški, atsakymai lietuviški; lietuvišką UI demonstraciją pristatome kaip atskirą atvejį. Temperatūra 0 ir seed mažina, bet nepanaikina rezultatų variacijos.

**Vizualas:** Eksperimento protokolo lentelė: kas laikoma pastovu, kas keičiama, kas išsaugoma. Parametrų ekrano vaizdas tik kaip pavyzdys.

**Nuoroda skaidrės tekste:** (Fuchß, Schwedt, et al., 2025); projekto protokolas (2026).

**APA skaidrės apačioje:**

Fuchß, D., Schwedt, S., Keim, J., & Hey, T. (2025). Beyond retrieval: A study of using LLM ensembles for candidate filtering in requirements traceability. In 2025 IEEE 33rd International Requirements Engineering Conference Workshops (pp. 5–12). IEEE. https://doi.org/10.1109/REW66121.2025.00006

BDAR RAG eksperimento projekto medžiaga. (2026). Korpusas, užklausos, programos kodas ir paieškos piloto rezultatai [Nepublikuotas duomenų ir programinės įrangos rinkinys]. Vietinis aplankas: rag_bdar. Prieš galutinį pateikimą įrašyti tikrą autorių ir viešo paketo URL.

**Papildomos rengimo pastabos:**

Siūlomas iš anksto fiksuotas planas: pagrindiniam paleidimui k=3, kandidatų perrikiavimui 6; top-k=1 ir 5 laikyti atskira jautrumo analize. Generavimo temperatūra=0, seed=42. Konteksto limitą ir atsakymo ilgį pasirinkti pagal realų modelį ir įrašyti manifeste. Kadangi dabartinio piloto testų rezultatai jau matyti, darbą vadinti žvalgomuoju; stipresniam patvirtinimui reikėtų naujos nepriklausomos imties.

### 16. Kaip vertinsime atsakymą ir žmogaus rezultatą? · 1:00

**Rodyti:**

- Paieška: Recall@k ir visų būtinų fragmentų radimo dalis.
- Citatos: kiek jų tiksliai rasta šaltinyje, ir atskirai – ar jos pagrindžia teiginį.
- Žmogus: teisingumas 0–2, pilnumas 0–2, sąlygų ir išimčių įtraukimas.
- Modelio confidence – atskiras, kol kas nekalibruotas savęs vertinimas.

**Paaiškinti:** 2/2 ir 4/4 reiškia skirtingą patikrintų citatų kiekį. Abu santykiai gali būti 100 %, bet iš jų negalima spręsti, kuris atsakymas geresnis. Panašūs atsakymai gali būti teisingi abiem atvejais arba turėti tą pačią klaidą. Žmogus turi patikrinti etaloną ir įvertinti atsakymo turinį. Savęs vertinimo naudingumą reikia nustatyti lyginant su realiomis klaidomis pakankamoje imtyje.

**Vizualas:** Keturi aiškiai atskirti blokai: paieška, citatos, žmogus, confidence. Nedėti vieno bendro „AI tikslumo“ procento.

**Nuoroda skaidrės tekste:** (Es et al., 2024; Tian et al., 2023).

**APA skaidrės apačioje:**

Es, S., James, J., Espinosa Anke, L., & Schockaert, S. (2024). RAGAs: Automated evaluation of retrieval augmented generation. In Proceedings of the 18th EACL: System Demonstrations (pp. 150–158). Association for Computational Linguistics. https://doi.org/10.18653/v1/2024.eacl-demo.16

Tian, K., Mitchell, E., Zhou, A., Sharma, A., Rafailov, R., Yao, H., Finn, C., & Manning, C. D. (2023). Just ask for calibration: Strategies for eliciting calibrated confidence scores from language models fine-tuned with human feedback [Preprint]. arXiv. https://doi.org/10.48550/arXiv.2305.14975

### 17. Ką jau parodė atliktas paieškos pilotas? · 1:30

**Rodyti:**

- 12 testinių užklausų; top-k=3; vertinta tik paieška.
- BM25: Recall@3 81,9 %, visi būtini fragmentai rasti 9 iš 12 klausimų.
- TF-IDF: Recall@3 73,6 %, visi būtini fragmentai rasti 8 iš 12 klausimų.
- Šie skaičiai gauti pagal AI parengtą ir žmogaus dar nepatvirtintą etalono juodraštį.

**Paaiškinti:** Tai tikri jau išsaugoti rezultatai, tačiau jie neparodo atsakymo teisingumo, žmogaus sutaupytos trukmės ar teisinės atitikties. Semantinio, hibridinio ir visų metodų atsakymų galutinės suvestinės dar nėra. Prieš galutinį pristatymą po pilno palyginimo ir žmogaus vertinimo šią skaidrę papildyti jų tikrais rezultatais.

**Vizualas:** Dviejų metodų lentelė arba nedidelė Recall@3 diagrama su aiškiu užrašu „Paieškos pilotas; n=12; AI etalono juodraštis“. Greta būsimos galutinės lentelės struktūra, bet be sugalvotų skaičių.

**Nuoroda skaidrės tekste:** Projekto paieškos pilotas (2026).

**APA skaidrės apačioje:**

BDAR RAG eksperimento projekto medžiaga. (2026). Korpusas, užklausos, programos kodas ir paieškos piloto rezultatai [Nepublikuotas duomenų ir programinės įrangos rinkinys]. Vietinis aplankas: rag_bdar. Prieš galutinį pateikimą įrašyti tikrą autorių ir viešo paketo URL.

**Papildomos rengimo pastabos:**

Patikrinti šaltiniai: results/final_k3/summary.json ir records.jsonl. Papildomi jau atlikti top-k bandymai gali būti atsarginėje skaidrėje:

| Metodas | Recall@1 | Recall@3 | Recall@5 |
|---|---:|---:|---:|
| BM25 | 44,4 % | 81,9 % | 84,7 % |
| TF-IDF | 31,9 % | 73,6 % | 93,1 % |

Tai žvalgomoji parametrų analizė pagal tą patį juodraštinį etaloną. Ji rodo, kad metodų eilė gali kisti priklausomai nuo k. Keliant k ir laikant tą pačią rezultatų eilę, Recall gali didėti vien todėl, kad grąžinama daugiau fragmentų; dėl to būtina kartu vertinti perteklinį kontekstą, atsakymą ir trukmę.

### 18. Gyva demonstracija: nuo teiginio iki patikrinamo pagrindimo · 2:30

**Rodyti:**

- Atverti vietinę BDAR RAG laboratoriją.
- Įrašyti savo reikalavimą arba klausimą į tą pačią įvestį.
- Palyginti rastus šaltinius, išvadą, sąlygas ir teiginių pagrindimą.
- Parodyti žmogaus vertinimą ir eksportuojamus eksperimento duomenis.

**Paaiškinti:** Pagrindinis įvedimas: „Sistema turi leisti vartotojui pateikti prašymą ištrinti jo asmens duomenis.“ Paklausti to paties klausimo forma: „Ar sistema turi leisti vartotojui pateikti prašymą ištrinti jo asmens duomenis?“ Sistema turi išlaikyti veiksmo prasmę abiem formomis. Prašymo pateikimas ir automatinis ištrynimas yra skirtingi veiksmai; teisinį vertinimą patikrinti pagal rastą originalų tekstą.

**Vizualas:** Pereiti iš pristatymo į gyvą UI. Atsarginėje skaidrėje laikyti tikro išsaugoto paleidimo vaizdą su data ir parametrais.

**Nuoroda skaidrės tekste:** (European Parliament & Council of the European Union, 2016); projekto demonstracija (2026).

**APA skaidrės apačioje:**

European Parliament & Council of the European Union. (2016). Regulation (EU) 2016/679. Official Journal of the European Union, L 119, 1–88. https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng

BDAR RAG eksperimento projekto medžiaga. (2026). Korpusas, užklausos, programos kodas ir paieškos piloto rezultatai [Nepublikuotas duomenų ir programinės įrangos rinkinys]. Vietinis aplankas: rag_bdar. Prieš galutinį pateikimą įrašyti tikrą autorių ir viešo paketo URL.

**Papildomos rengimo pastabos:**

Demonstravimo eiga, apie 2 min. 30 sek.:

1. 0:00–0:20 – parodyti tą pačią įvestį klausimui ir teiginiui, pasirinktą modelį ir parametrus.
2. 0:20–1:10 – paleisti BM25 ir hibridinį su vienodais nustatymais; atverti rastus fragmentus. Jei laukimas ilgesnis, pereiti prie iš anksto išsaugoto tikro paleidimo, aiškiai tai pasakius.
3. 1:10–1:45 – palyginti, ar atsakoma į tą patį veiksmą, ar matomos svarbios sąlygos, ar cituotas tekstas pagrindžia išvadą.
4. 1:45–2:10 – parodyti atskirą citatų kiekį ir modelio deklaruojamą pasitikėjimą. Paaiškinti, ką šie rodikliai reiškia.
5. 2:10–2:30 – parodyti realaus žmogaus vertinimo laukus ir eksportą. Tuščių laukų nepristatyti kaip jau atlikto vertinimo.

„Be RAG“ palyginimą ir antros formuluotės jau atliktą paleidimą turėti paruoštą. Pristatymo metu parodomas bent vienas tikras vykdymas; atsarginis įrašas nepakeičia gyvos eigos, kai ji veikia. Neslėpti modelio klaidos ir nepakeisti jos ranka parengtu „modelio“ atsakymu. Neprašyti modelio patvirtinti konkrečios sistemos įgyvendinimo, jei korpuse nėra jos kodo ar dokumentacijos.

### 19. Rizikos ir konkretūs pasiūlymai · 1:15

**Rodyti:**

- Rizikos: netinkamas šaltinis, praleista išimtis, klaidingas teiginio supratimas, nepagrįstas pasitikėjimas.
- Duomenys: fiksuoti teisės akto redakciją, atnaujinti korpusą ir saugoti dokumentų prieigos ribas.
- Vertinimas: žmogaus patvirtintas etalonas, atskiri paieškos ir atsakymo rodikliai, klaidų analizė.
- Diegimas: pagrindimas su nuorodomis, atsisakymas kai nepakanka įrodymų, žmogaus peržiūra svarbiems sprendimams.

**Paaiškinti:** Magesh et al. tyrime vertinti teisiniai įrankiai vis tiek haliucinavo; konkrečios jų klaidų dalies nepriskirti mūsų sistemai. Dabar indeksuojami tik BDAR straipsniai, todėl platesniam praktiniam naudojimui svarstytinos EDPB gairės ir kiti reikalingi išaiškinimai. Atskirai paminėti privatumą ir kenksmingas instrukcijas dokumentuose; šaltinio tekstas neturi tapti agento veiksmų nurodymu.

**Vizualas:** Lentelė „rizika → priemonė → kaip patikrinsime“. Apačioje skaidrus AI indėlio atskleidimas: AI padėjo rengti kodą, klausimus ir juodraščius; žmogus atsako už jų patikrą.

**Nuoroda skaidrės tekste:** (Magesh et al., 2025; European Data Protection Board, 2020).

**APA skaidrės apačioje:**

Magesh, V., Surani, F., Dahl, M., Suzgun, M., Manning, C. D., & Ho, D. E. (2025). Hallucination-free? Assessing the reliability of leading AI legal research tools. Journal of Empirical Legal Studies, 22(2), 216–242. https://doi.org/10.1111/jels.12413

European Data Protection Board. (2020). Guidelines 05/2020 on consent under Regulation 2016/679 (Version 1.1). https://www.edpb.europa.eu/documents/guideline/guidelines-052020-on-consent-under-regulation-2016679_en

### 20. Ką galime pagrįstai teigti ir ką tiriame toliau? · 0:30

**Rodyti:**

- RAG susieja atsakymą su surastais dokumentų fragmentais ir padeda kurti atsekamumo grandinę.
- Paieškos, citavimo ir atsakymo kokybę reikia matuoti atskirai.
- Šio piloto rezultatai riboti; galutiniam palyginimui reikalingas tikras žmogaus vertinimas.

**Paaiškinti:** Po galutinio eksperimento paskutinį punktą pakeisti konkrečia, duomenimis pagrįsta išvada: kuris variantas padėjo, kokia kaina ir kur suklydo. Kol vertinimas neatliktas, nelaimėti metodo iš anksto. Tada pakviesti klausimams.

**Vizualas:** Trys trumpos išvados ir nuoroda / QR kodas į realiai paskelbtą eksperimento paketą, kai jis bus paskelbtas.

**Nuoroda skaidrės tekste:** (Es et al., 2024); projekto rezultatai (2026).

**APA skaidrės apačioje:**

Es, S., James, J., Espinosa Anke, L., & Schockaert, S. (2024). RAGAs: Automated evaluation of retrieval augmented generation. In Proceedings of the 18th EACL: System Demonstrations (pp. 150–158). Association for Computational Linguistics. https://doi.org/10.18653/v1/2024.eacl-demo.16

BDAR RAG eksperimento projekto medžiaga. (2026). Korpusas, užklausos, programos kodas ir paieškos piloto rezultatai [Nepublikuotas duomenų ir programinės įrangos rinkinys]. Vietinis aplankas: rag_bdar. Prieš galutinį pateikimą įrašyti tikrą autorių ir viešo paketo URL.

## Atsarginės skaidrės klausimams

Jos neįtrauktos į 18 min. 30 sek. trukmę.

- **A1. Išsami metodų ir parametrų lentelė:** BM25, TF-IDF, vektoriai, RRF, LLM perrikiavimas, naudojami promptai ir versijos. Šaltiniai: projekto kodas ir Fuchß, Schwedt, et al. (2025).
- **A2. Top-k jautrumo rezultatai:** tikri k=1, 3 ir 5 piloto duomenys, etalono juodraščio apribojimas. Šaltinis: projekto rezultatai.
- **A3. Vieno atsakymo auditas:** tikra užklausa, visas modelio atsakymas, rastos ištraukos, žmogaus pastabos. Nurodyti paleidimo laiką, modelio digest ir faktinius parametrus.
- **A4. Žmogaus vertinimo forma:** teisingumas, pilnumas, teiginių pagrindimas ir nesutarimai. Atskirti žmogaus sprendimą nuo AI įvertinimo. Metodinis šaltinis: Es et al. (2024).
- **A5–A6. Visa bibliografija:** padalyti į dvi ar daugiau skaidrių, kad tekstą būtų galima perskaityti. Bendras literatūros sąrašas nepakeičia konkrečios skaidrės APA footer.
- **A7. Sąvokos ir RAG palyginimas su modelio mokymu:** LLM, fragmentas, embeddingas, top-k, perrikiavimas. Mūsų RAG pateikia ištraukas įvestyje; papildomas mokymas keičia modelio svorius. Šie būdai gali būti derinami. Šaltiniai: Lewis et al. (2020) ir projekto eiga.

## Penki privalomi straipsnių ekrano vaizdai

Visos penkios iškarpos jau yra projekto aplanke. Tai originalių publikacijų puslapių vaizdai su pažymėta įrodymo vieta; jų kilmė ir puslapiai užfiksuoti `evidence/manifest.json`.

| Skaidrė | Publikacija | Failas | Pažymima vieta |
|---|---|---|---|
| 9 | Etezadi et al., 2026 | `evidence/etezadi2026.png` | 9 lentelė, Rice_LRT vidurkiai |
| 10 | Pipitone & Alami, 2024 | `evidence/legalbenchrag2024.png` | 3 lentelė, 776 užklausos |
| 11 | T. Gao et al., 2023 | `evidence/alce2023.png` | 4 lentelė, VANILLA ir RERANK |
| 12 | Es et al., 2024 | `evidence/ragas2024.png` | 4 lentelė, sutapimas su žmonėmis |
| 13 | Liu et al., 2024 | `evidence/lostmiddle2024.png` | 1 paveikslas, aktualaus teksto padėtis |

Vienai skaidrei naudoti vieną didelę įskaitomą iškarpą. Prie jos – tyrimo užduotis, rezultatas ir viena aiški įžvalga. Nepateikti vien publikacijos viršelio vietoj tyrimo įrodymo. Iškarpų tekstų neperrašyti; galima apkirpti tuščias paraštes ir paryškinti aktualią vietą.

## Ką dar reikia atlikti iki galutinio pristatymo

1. Tikras žmogus peržiūri klausimus ir originalius BDAR punktus, pataiso / patvirtina etaloną. Užfiksuoti vertintoją ir versiją; AI negali atlikti šio žingsnio už žmogų.
2. Užfiksuoti vieną eksperimento eigą ir parametrus, paleisti visų pasirinktų metodų palyginimą. Išsaugoti tikrus atsakymus, klaidas, faktinį kontekstą, trukmes ir modelių digest. UI ir formalaus skripto rezultatus pateikti kaip atskirus bandymus, jei jų eigos skiriasi.
3. Žmogus vertina atsakymus nematydamas metodų pavadinimų. Jei vertintojas tik vienas, tai aiškiai nurodyti; antras nepriklausomas vertintojas sustiprintų rezultatą. Tušti vertinimo laukai nėra rezultatas.
4. 17 skaidrėje pateikti paieškos ir žmogaus vertinimo suvestines su vardikliais ir imties dydžiu. Neskaičiuoti bendro „teisingumo %“ iš citatų sutapimų ar modelio deklaruojamo confidence.
5. Parengti tikro demonstravimo scenarijų ir atsarginį tikro paleidimo įrašą. UI leidžia keisti parametrus, bet auditorijai vienu metu parodyti tik vieną aiškų jų pakeitimą.
6. Paskelbti pakartojimo paketą, promptus, konfigūraciją, duomenų kilmę, modelių atsisiuntimo nuorodas ir planą. Vietiniai Desktop failai savaime nėra viešas paskelbimas. Neviešinti asmeninių pokalbių ar vertintojų duomenų; prieš skelbiant naudoti tik demonstravimui skirtus duomenis.
7. Į bibliografinį projekto aprašą vietoj laikino rinkinio pavadinimo įrašyti tikrą autorių ir viešą URL. Kiekvienai skaidrei palikti jos šaltinių APA aprašus.
8. Nurodyti AI indėlį ir patikrinti universiteto atsakingo AI naudojimo taisykles. Užduotyje pateikto Moodle PDF šiame plano rengimo etape nepavyko viešai atverti, todėl jo konkrečių nuostatų atitiktis čia netvirtinama.

## Literatūra ir kam ji naudojama

Plane panaudoti **13 datuotų mokslinių šaltinių nuo 2020 m. ir papildomos 2020 m. EDPB gairės**, taip pat du nuolat atnaujinami oficialios dokumentacijos puslapiai. BDAR (2016) yra papildomas pirminis tyrimo objektas ir neįskaičiuojamas į reikalaujamus ≥10 šaltinių nuo 2020 m. Preprintų statusas pažymėtas; penkių empirinių publikacijų įrodymai numatyti 9–13 skaidrėse.

- **[1]** Etezadi, R., Abualhaija, S., Arora, C., & Briand, L. (2026). Classifier or prompt: A case study on legal requirements traceability. Empirical Software Engineering, 31, Article 85. https://doi.org/10.1007/s10664-026-10827-1
- **[2]** Lewis, P., Perez, E., Piktus, A., Petroni, F., Karpukhin, V., Goyal, N., Küttler, H., Lewis, M., Yih, W.-t., Rocktäschel, T., Riedel, S., & Kiela, D. (2020). Retrieval-augmented generation for knowledge-intensive NLP tasks. Advances in Neural Information Processing Systems, 33, 9459–9474. https://arxiv.org/abs/2005.11401
- **[3]** Gao, T., Yen, H., Yu, J., & Chen, D. (2023). Enabling large language models to generate text with citations. In Proceedings of EMNLP 2023 (pp. 6465–6488). Association for Computational Linguistics. https://doi.org/10.18653/v1/2023.emnlp-main.398
- **[4]** Pipitone, N., & Alami, G. H. (2024). LegalBench-RAG: A benchmark for retrieval-augmented generation in the legal domain [Preprint]. arXiv. https://doi.org/10.48550/arXiv.2408.10343
- **[5]** Es, S., James, J., Espinosa Anke, L., & Schockaert, S. (2024). RAGAs: Automated evaluation of retrieval augmented generation. In Proceedings of the 18th EACL: System Demonstrations (pp. 150–158). Association for Computational Linguistics. https://doi.org/10.18653/v1/2024.eacl-demo.16
- **[6]** Liu, N. F., Lin, K., Hewitt, J., Paranjape, A., Bevilacqua, M., Petroni, F., & Liang, P. (2024). Lost in the middle: How language models use long contexts. Transactions of the Association for Computational Linguistics, 12, 157–173. https://doi.org/10.1162/tacl_a_00638
- **[7]** Magesh, V., Surani, F., Dahl, M., Suzgun, M., Manning, C. D., & Ho, D. E. (2025). Hallucination-free? Assessing the reliability of leading AI legal research tools. Journal of Empirical Legal Studies, 22(2), 216–242. https://doi.org/10.1111/jels.12413
- **[8]** Hey, T., Fuchß, D., Keim, J., & Koziolek, A. (2025). Requirements traceability link recovery via retrieval-augmented generation. In A. Hess & A. Susi (Eds.), Requirements engineering: Foundation for software quality (pp. 381–397). Springer. https://doi.org/10.1007/978-3-031-88531-0_27
- **[9]** Fuchß, D., Hey, T., Keim, J., Liu, H., Ewald, N., Thirolf, T., & Koziolek, A. (2025). LiSSA: Toward generic traceability link recovery through retrieval-augmented generation. In 2025 IEEE/ACM 47th International Conference on Software Engineering (pp. 1396–1408). IEEE. https://doi.org/10.1109/ICSE55347.2025.00186
- **[10]** Fuchß, D., Schwedt, S., Keim, J., & Hey, T. (2025). Beyond retrieval: A study of using LLM ensembles for candidate filtering in requirements traceability. In 2025 IEEE 33rd International Requirements Engineering Conference Workshops (pp. 5–12). IEEE. https://doi.org/10.1109/REW66121.2025.00006
- **[11]** European Data Protection Board. (2020). Guidelines 05/2020 on consent under Regulation 2016/679 (Version 1.1). https://www.edpb.europa.eu/documents/guideline/guidelines-052020-on-consent-under-regulation-2016679_en
- **[12]** European Parliament & Council of the European Union. (2016). Regulation (EU) 2016/679. Official Journal of the European Union, L 119, 1–88. https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng
- **[13]** Gao, Y., Xiong, Y., Gao, X., Jia, K., Pan, J., Bi, Y., Dai, Y., Sun, J., Wang, M., & Wang, H. (2024). Retrieval-augmented generation for large language models: A survey (Version 5) [Preprint]. arXiv. https://doi.org/10.48550/arXiv.2312.10997
- **[14]** Edge, D., Trinh, H., Cheng, N., Bradley, J., Chao, A., Mody, A., Truitt, S., Metropolitansky, D., Ness, R. O., & Larson, J. (2025). From local to global: A graph RAG approach to query-focused summarization (Version 2) [Preprint]. arXiv. https://doi.org/10.48550/arXiv.2404.16130
- **[15]** Microsoft. (n.d.). Retrieval-augmented generation (RAG) in Azure AI Search. Microsoft Learn. Retrieved October 26, 2026, from https://learn.microsoft.com/en-us/azure/search/retrieval-augmented-generation-overview
- **[16]** Amazon Web Services. (n.d.). Retrieve data and generate AI responses with Amazon Bedrock Knowledge Bases. Retrieved October 26, 2026, from https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base.html
- **[17]** Tian, K., Mitchell, E., Zhou, A., Sharma, A., Rafailov, R., Yao, H., Finn, C., & Manning, C. D. (2023). Just ask for calibration: Strategies for eliciting calibrated confidence scores from language models fine-tuned with human feedback [Preprint]. arXiv. https://doi.org/10.48550/arXiv.2305.14975
- **[E]** BDAR RAG eksperimento projekto medžiaga. (2026). Korpusas, užklausos, programos kodas ir paieškos piloto rezultatai [Nepublikuotas duomenų ir programinės įrangos rinkinys]. Vietinis aplankas: rag_bdar. Prieš galutinį pateikimą įrašyti tikrą autorių ir viešo paketo URL.

### Dokumentų ir rezultatų nuorodos projekto aplanke

- Duomenys ir protokolas: `README.md`, `data/corpus_manifest.json`, `data/queries.json`, `data/prompts.json`.
- AI parengtas, žmogaus dar nepatvirtintas etalonas: `data/gold_draft.json`.
- Jau atlikti rezultatai: `results/final_k1`, `results/final_k3`, `results/final_k5`.
- Straipsnių PDF ir iškarpos: `sources/`, `evidence/`.
- Interaktyvios laboratorijos instrukcija: `POKALBIO_INSTRUKCIJA.md`.
- Ankstesni pristatymo juodraščiai: `presentation/BDAR_RAG_19_skaidriu_juodrastis.pptx` ir `presentation/BDAR_RAG_pranesimo_juodrastis.pptx`. Naujų skaidrių turinį rengti pagal šį planą.
