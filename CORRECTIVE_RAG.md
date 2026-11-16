# Korekcinis RAG: vietinis CRAG įkvėptas variantas

Programoje pasirinkite **Korekcinis RAG**. Šis variantas vertina pateikto konteksto pakankamumą ir, jei reikia, atlieka papildomą paiešką. Tai skiriasi nuo hibridinės paieškos su perrikiavimu: perrikiavimas peržiūri esamus kandidatus, o korekcinė eiga gali pateikti naujas užklausas.

## Veikimo eiga

1. Pradinė hibridinė paieška sujungia BM25 ir `nomic-embed-text` rangus tuo pačiu svoriniu RRF, kaip įprastas hibridinis variantas.
2. Tas pats vietinis generavimo modelis gauna originalų klausimą arba reikalavimą ir faktiškai atrinktus fragmentus. Jis pateikia `sufficient`, `partial` arba `insufficient`, priežastį, naudingų šaltinių ID ir trūkstamus aspektus.
3. Jei vertinimas nėra `sufficient` ir liko etapų, modelis pasiūlo tikslingas papildomas užklausas **angliškai**. Paieška vykdoma tik tame pačiame fiksuotame angliškame BDAR korpuse.
4. Papildomi BM25 ir vektoriniai rezultatai sujungiami su ankstesniais rangais naudojant RRF, kurio tarpužklausinė konstanta yra 60. Pirmenybę gauna papildomų užklausų pirmi rezultatai, po jų pradinis pirmas rezultatas, tada likęs bendras reitingas. Tai skaidri konteksto įvairovės taisyklė, nereikalaujanti etaloninių etikečių.
5. Naujas kontekstas vėl tikrinamas. Galutinis įprastai pateikiamų fragmentų skaičius lieka top-k. Vartotojo aiškiai nurodyti straipsniai išlieka privalomi ir, kaip kituose RAG variantuose, gali viršyti šią ribą.
6. Atsakymas generuojamas su galutiniu šaltinių rinkiniu. Likus spragų, jos nurodomos patikros eigoje ir peržiūros signaluose. Bendras modelio pasitikėjimo procentas tokiu atveju nematuojamas.

Papildoma paieška sustoja, jei modelis įvertina šaltinius kaip pakankamus, pasiekta etapų riba, nepasiūloma nauja užklausa arba paieška nebepakeičia konteksto. Nėra neriboto kartojimo iki norimos išvados. Klaidingas vertinimo JSON ar nežinomi šaltinių ID sukelia matomą klaidą, o pirminė išvestis išsaugoma klaidų žurnale.

## Keičiamieji parametrai

Nustatymuose yra skiltis **Korekcinio RAG derinimas**.

| Parametras | Pradinis | Ribos | Paskirtis |
|---|---:|---:|---|
| `corrective_max_rounds` | 2 | 1–3 | Daugiausia tiek šaltinių vertinimų. 1 reiškia vieną pradinį vertinimą be papildomos paieškos. |
| `corrective_max_queries` | 2 | 1–3 | Daugiausia tiek naujų užklausų viename korekcijos etape. |
| `top_k` | 3 | 1–10 | Galutinių fragmentų biudžetas, išskyrus aiškiai paprašytas nuostatas. |

Taip pat taikomi hibridinės paieškos kandidatų skaičius, BM25 svoris, RRF konstanta, tas pats modelis, temperatūra ir seed. Papildomų užklausų generavimas yra šio varianto dalis; pradinės užklausos vertimo parinktis jo neišjungia. Papildomą paiešką išjungia etapų riba 1.

## Ką galima patikrinti ir pakartoti

Išskleidžiamoje **Korekcinio RAG eigoje** matyti kiekvieno etapo šaltiniai, modelio sprendimas, spragos ir papildomos užklausos. Patikros komentarai bei papildomos užklausos rašomi angliškai pagal korpuso kalbą, atsakymo kalbą valdo įprastas generavimo promptas.

Pokalbio JSON eksporte `corrective` objektas saugo:

- `strategy=local_corpus_corrective_v1`, ribas ir sustojimo priežastį;
- visus vertinimo promptus, sisteminę instrukciją, neapdorotas modelio išvestis ir naudotus šaltinių ID;
- pradines ir papildomas užklausas bei tikrus jų paieškos rangus;
- vertinimo ir papildomos paieškos trukmes;
- korekcinio modulio ir serverio SHA-256. Modelio digest ir korpuso SHA-256 pateikti bendroje įrašo metainformacijoje.

Vertinimo ir papildomos paieškos laikas jau įskaičiuotas į `retrieval_ms`; atskirų jo dalių antrą kartą pridėti nereikia. Pilnas žurnalas saugomas serveryje, o naršyklėje paliekama mažesnė kopija. Eksportuojant pilnas žurnalas vėl įkeliamas iš serverio.

Pakartojimo bandymas UI:

1. Pasirinkti tą patį vietinį generavimo ir embeddingų modelį, išsaugoti jų digest.
2. Pasirinkti vieną klausimą be straipsnių numerių. Užfiksuoti modelio parametrus, top-k ir korekcijos ribas.
3. Paleisti palyginimą **Hibridinis**, **Korekcinis RAG**, **Be RAG**. Palyginimo režime ankstesnio pokalbio istorija išjungiama visiems variantams.
4. Eksportuoti rezultatus ir atskirai vertinti atsakymo teisingumą bei pilnumą su žmogumi. Papildomai lyginti trukmę, konteksto pokytį ir vertinimo etapų skaičių.

## Tyrimo interpretacija

Tai vietinio LLM pagrįsta CRAG idėjos adaptacija. Yan ir bendraautorių darbe naudojamas atskirai mokytas vertintojas, internetinė paieška ir kiti komponentai, kurių šis variantas neatkuria. Jų publikuotų rezultatų negalima priskirti šiai programai.

Šaltinių pakankamumo vertinimas yra modelio nuomonė, ne kalibruota tikimybė ar žmogaus eksperto išvada. Vertintojas gali suklysti, o papildomos užklausos gali pabloginti paiešką. Pagerėjimas yra tikrinama hipotezė. Naujas variantas turi būti lyginamas tuo pačiu klausimynu ir su žmogaus vertinimu.

Interaktyvūs bandymai ir šis naujas variantas nesumaišomi su senais formalaus `rag_experiment.py` piloto rezultatais. Pradinis skriptas, korpusas, AI etalono juodraštis ir ankstesni rezultatų aplankai nekeičiami. Šiuo papildymu dar neatliekamas žmogaus patvirtintas empirinis palyginimas.

## Šaltinis

Yan, S.-Q., Gu, J.-C., Zhu, Y., & Ling, Z.-H. (2024). *Corrective retrieval augmented generation* [Preprint]. arXiv. https://doi.org/10.48550/arXiv.2401.15884

Originalaus darbo tekstas: https://arxiv.org/abs/2401.15884. Programos modulio `corrective_rag.py` pradžioje ir kiekviename korekcinio paleidimo žurnale pažymėta, kad tai adaptacija.
