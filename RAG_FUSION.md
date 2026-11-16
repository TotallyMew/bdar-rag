# RAG-Fusion: įgyvendintas pagrindinis metodas

**Pasirinkimas programoje: RAG-Fusion.** Šiame variante įgyvendinta pagrindinė Rackauckas (2024) aprašyta eiga: LLM užklausų generavimas, vektorinė paieška kiekvienai užklausai, rezultatų jungimas pagal Reciprocal Rank Fusion ir atsakymo generavimas su originalia užduotimi bei atrinktais šaltiniais. Tai nėra vien metodo pavadinimas ar vien papildomas vertinimo promptas.

Straipsnis: https://arxiv.org/html/2402.03367v1 (skiltis „RAG vs RAG-Fusion“).

## Tiksli programos eiga

1. Bendras programos užduoties atpažinimas nustato, ar pateiktas klausimas, ar sistemos reikalavimas. Jei įjungta pradinės užklausos vertimo parinktis, užduotis išverčiama paieškai anglų kalba. Šis bendras veiksmas naudojamas ir kituose programos RAG variantuose.
2. Vietinis generavimo modelis iš originalios užduoties ir pradinės paieškos užklausos sukuria **3 papildomas angliškas užklausas** (keičiamas skaičius: 2–5). Į paiešką taip pat įtraukiama pradinė užklausa. Pradinis bendras paieškų skaičius: 4. Jei pradinės užklausos vertimas išjungtas, ji išlieka vartotojo kalba, o nauji variantai vis tiek prašomi angliškai.
3. **Kiekviena užklausa tikrai vykdoma**: `nomic-embed-text` vektorius lyginamas su visų korpuso fragmentų vektoriais pagal kosinuso panašumą. Surenkama iki 20 kandidatų vienai užklausai. Naudojami tikri korpuso fragmentai, ne modelio sugeneruoti dokumentai.
4. Kiekvieno reitingo vietos pradedamos nuo 1. Kiekvienas fragmentas gauna balą:

   **RRF(d) = Σ 1 / (c + rankᵢ(d))**, sumuojant tik reitingus, kuriuose fragmentas yra.

   Pradinė konstanta c = 60. Visos užklausos turi vienodą svorį. Kosinuso panašumo dydžiai į RRF sumą neįtraukiami; jie lemia tik vietą kiekviename atskirame reitinge. Vienodi galutiniai balai išsprendžiami stabiliai pagal fragmento ID.

   Pavyzdys: fragmentas, esantis antroje ir pirmoje vietose dviejuose reitinguose, gauna 1/62 + 1/61 ≈ 0,032522. Tai rangų jungimo balas, **ne 3,25 % pasitikėjimas**.
5. Pagal bendrą RRF reitingą atrenkami top-k fragmentai (pradinis k = 3). Čia nenaudojamas ankstesnio hibrido pirmųjų rezultatų iškėlimo algoritmas, BM25 svoris ar papildomas LLM perrikiavimas.
6. Atsakymų modelis gauna originalią užduotį, pradinę ir sugeneruotas užklausas bei atrinktus šaltinius. Užklausų variantai pažymėti tik kaip paieškos užuominos; jie nėra teisiniai įrodymai. Galioja bendri atsakymo, teiginių ir citatų patikros žingsniai.

### Bendras aiškių nuorodų apdorojimas

Kaip ir kituose RAG variantuose, vartotojo aiškiai paprašytos BDAR nuostatos papildomai užtikrinamos galutiniame kontekste. Tai bendras programos elgesys, o ne RAG-Fusion algoritmo dalis. Jis gali pakeisti top-k sudėtį ar viršyti fragmentų ribą. Eksporte atskirai saugomi `pure_rrf_top_ids`, `explicit_reference_ids` ir `final_context_ids`. Paieškos palyginimui naudokite klausimus be straipsnių numerių arba vertinkite gryną RRF reitingą prieš šį veiksmą.

## Keičiamieji parametrai

**Modelis ir parametrai → RAG-Fusion derinimas**:

| Parametras | Pradinis | Ribos | Reikšmė |
|---|---:|---:|---|
| `fusion_query_count` | 3 | 2–5 | Papildomų LLM sugeneruotų užklausų; bendras skaičius yra šis skaičius + 1. |
| `fusion_pool` | 20 | 1–100 | Kandidatų vienai vektorinei paieškai prieš RRF; ne mažiau už top-k. |
| `fusion_rrf_k` | 60 | 1–100 | Formulės c konstanta; jos nepainioti su galutiniu top-k. |
| `top_k` | 3 | 1–10 | Fragmentų, perduodamų atsakymų modeliui, skaičius su aiškių nuorodų išimtimi. |

Taip pat galioja pasirinkti vietiniai generavimo ir embeddingų modeliai, temperatūra, seed, konteksto ir generavimo žetonų ribos. Pradinės užklausos vertimo išjungimas neišjungia RAG-Fusion variantų generavimo. Hibridinės paieškos parametrai čia netaikomi. Internetinės paieškos, atskiro mokyto vertintojo ir naujo modelio mokymo šiam metodui nereikia.

## Atsekamumas ir pakartojimas

Kiekvienas atsakymas turi `rag_fusion` žurnalą:

- visos tikrai vykdytos užklausos, generavimo promptas, sisteminė instrukcija ir neapdorota modelio išvestis;
- atskiri reitingai su fragmentų ID ir kosinuso balais;
- bendras RRF reitingas, kiekvienos užklausos vieta ir konkretus jos indėlis į balą;
- parametrai, užklausų generavimo, vektorinės paieškos ir RRF skaičiavimo trukmės;
- gryno RRF ir galutinio konteksto sudėtis, modulio bei serverio SHA-256.

Bendrame įraše taip pat yra modelių digest, korpuso SHA-256, atsakymo promptas, generavimo parametrai ir citatų patikra. Naršyklėje laikoma mažesnė kopija, o eksportas iš serverio įkelia pilną žurnalą.

RAG-Fusion generavimo, paieškos ir RRF laikai jau įtraukti į `retrieval_ms`. Pradinės užklausos planavimas bei korpuso vektorių paruošimas pateikiami atskirai; jų negalima painioti su papildomų užklausų generavimo laiku.

Pakartojamas interaktyvus palyginimas:

1. Pasirinkti tą patį vietinį modelį, embeddingų modelį ir top-k.
2. Įrašyti klausimą be straipsnių numerių. Palyginimo lange pasirinkti **Semantinis**, **RAG-Fusion**, prireikus **Hibridinis** ir **Be RAG**. Palyginimas išjungia ankstesnio pokalbio istoriją visiems variantams.
3. Eksportuoti JSON. Iš reitingų galima nepriklausomai perskaičiuoti RRF ir patikrinti atranką net nekviečiant LLM.
4. Žmogui atskirai vertinti atsakymo teisingumą, išsamumą ir teiginių pagrįstumą. Didesnis užklausų, citatų ar šaltinių skaičius savaime nėra geresnis rezultatas.

## Metodas ir empirinis teiginys yra skirtingi dalykai

Šiuo papildymu įgyvendinamas pagrindinis **RAG-Fusion algoritmas**. Vietiniai Qwen ir `nomic-embed-text` modeliai bei BDAR korpusas yra mūsų eksperimento pasirinkimai. Tai **nėra straipsnio Infineon sistemos, jos duomenų, modelių ar gautų rezultatų reprodukcija**. Straipsnio tikslumo rezultatų negalima priskirti šiai programai.

Užklausų nukrypimas gali pabloginti atsakymą. Modelis gali pakeisti reikalavimo veiksmą ar neiginį, o RRF gali iškelti keliose panašiose užklausose kartojamą, tačiau nepakankamą fragmentą. Dėl to rodomos tikros užklausos ir rangai. Papildomi modelio bei paieškos kvietimai kainuoja laiko. Galutinis pagerėjimas turi būti patikrintas su žmogaus vertinimu.

Pradinis `rag_experiment.py`, užfiksuotas korpusas, AI etalono juodraštis ir ankstesni formalaus piloto rezultatų aplankai nekeičiami. Šis UI papildymas savaime neatlieka naujo žmogaus patvirtinto tyrimo.

## Šaltinis (APA)

Rackauckas, Z. (2024). RAG-Fusion: A new take on retrieval-augmented generation. *International Journal on Natural Language Computing, 13*(1), 37–47. https://doi.org/10.5121/ijnlc.2024.13103

Viešas tekstas: https://arxiv.org/abs/2402.03367.
