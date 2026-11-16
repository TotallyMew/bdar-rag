# Logic and interface review

The standalone Desktop app was reviewed without changing `rag_experiment.py`, the formal corpus, draft gold labels, slides, or earlier research results.

| Issue | Change |
|---|---|
| Search time omitted shared BM25/dense work | Attribute actual ranking work to each applicable method; report query planning and index preparation separately. |
| No-RAG received a query prepared for retrieval | Keep its search query, rewrite, source list and embedding model empty; search time is zero. |
| Prior RAG answers could contaminate a comparison baseline | All methods in a multi-method comparison receive no conversation history; record requested and effective history settings separately. |
| Follow-up history arbitrarily selected one comparison method | Exclude multi-answer turns from subsequent history. |
| Cached embeddings could have inconsistent dimensions or invalid values | Validate count, dimensions, finite values and document format version; rebuild corrupt caches. |
| Zero lexical scores looked like retrieved evidence | Exclude zero-score BM25/TF-IDF hits. Respect disabled query expansion. |
| Parseable JSON could still be truncated | Reject missing completion or token-limit completion; preserve raw failure provenance. |
| A failed answer could receive reassuring confidence | Skip self-confidence for repeated-input answers and abstentions. |
| Citation existence and answer correctness looked alike | Show neutral exact-match counts, uncalibrated self-confidence and human ratings separately. Surface structural review flags without rewriting model output. |
| Reviews were not persisted in answer records | Save review history and update the answer record and running job snapshots atomically. Reject fractional/boolean review scores. |
| No-RAG citation evaluation appeared to score zero | Store nonapplicable citation counts as null. |
| Rejected requests added phantom messages; rapid submissions could race | Lock submission before the request; add the input to history only when the server accepts it. |
| Refresh/network failure abandoned a running job | Persist the job reference; reconnect without creating another request; restore input if the server restarted. |
| Browser storage duplicated large prompt data | Store a smaller view locally; rehydrate full provenance and persisted reviews from authenticated run endpoints. Mark unavailable records explicitly. |
| Mobile sidebar hid essential actions | Add mobile new-conversation, settings, comparison and dismissible source-drawer controls. |

The interface now includes a comparison table, clearer assessment cards, visible legal-support type, a distinct proposed wording block, readable source text, and accessible source navigation. Existing user settings are preserved; known older default requirement instructions migrate to the revised default, while custom prompts remain unchanged.

Validation: 29 automated tests passed, along with real local-model browser testing of hybrid/no-RAG comparison, refresh recovery, export provenance and selected settings. Browser-only test doubles covered network interruption, rejected inputs, storage failure, zero confidence and invalid source references; they were not stored as research outputs. Desktop and mobile layouts were inspected.

These changes improve application logic and evidence reporting. They do not prove that the small local model's legal interpretations are correct. Confidence remains uncalibrated self-report. Structural consistency checks and exact quotations do not replace independent human assessment.

## v6: coordinated article references and incomplete grounding (2026-10-27)

The reported question asked for Articles 17 and 22 together, but the parser only recognised the number directly before the shared article word. The recorded context contained only Article 22 paragraphs. This was a retrieval failure, not evidence that Article 17 was absent from the corpus.

Coordinated Lithuanian and English references now resolve to every requested provision. Missing members of a reference list are reported individually; a partially resolvable list cannot silently proceed. Explicit provisions remain after reranking and may exceed the normal top-k. The no-RAG baseline does not validate its input against the retrieval corpus.

Source availability and citation presence are exported and displayed separately for each requested reference. Historical model outputs remain unchanged; current structural annotations can expose old missing-source problems. The abstention label now describes insufficient evidence for the whole question rather than incorrectly claiming no explanation was given.

A single recorded correction attempt is allowed for an echoed input or missing claim/reference citations. It uses the same context, preserves the initial generation and retry prompt, records combined generation time, and never loops until it obtains a preferred legal answer. The UI exposes that a correction was used. Unresolved flags remain visible. This is structural checking, not an independent entailment judge.

Validation: 41 automated UI/core checks passed, including grouped references, paragraph syntax, reranking, absent references, historical provenance, bounded correction and unchanged baseline isolation. A real local Qwen test supplied all 7 paragraphs of Articles 17 and 22 and produced citations to both. Its legal interpretations still require independent human review; structural coverage does not certify them. Private regression runs are outside the research results and distributable archive.

A conservative language-pattern flag also highlights assertions that a legal obligation is absent from a source. It remains a review signal even when a quote matches exactly. It does not perform semantic entailment or prove the assertion false. The real local model still produced imperfect legal summaries, so the regression outcome is source inclusion and explicit review signalling, not validated answer correctness.

## v7: local-corpus corrective RAG (2026-10-27)

Added `corrective` as a seventh UI variant. It begins with the existing weighted hybrid retrieval, evaluates the actual context with the local LLM, proposes bounded English queries for evidence gaps, retrieves again in the same corpus and re-evaluates the selected context. It preserves explicit user references, the final top-k budget, method isolation and the no-RAG baseline. It is CRAG-inspired, not a replication of the paper's trained evaluator, web retrieval or knowledge refinement.

The limits are 1–3 evaluations and 1–3 follow-up queries per correction batch; defaults are two evaluations and at most two new queries. Stop conditions cover sufficient evidence, the round limit, repeated/missing queries and an unchanged context. Evaluation failures remain errors with raw output, not a silent switch to hybrid. Remaining gaps stay flagged and suppress the uncalibrated answer-confidence score. The trace, exact prompts, model generations, code hashes and timings are exported. Local browser storage strips large evaluation provenance and rehydrates it on export.

Validation: 51 unique automated checks passed, including branch/stop limits, changed and unchanged context, malformed evaluator output, cancellation, explicit-reference retention, model metadata and baseline isolation. Real Qwen testing exercised both evaluation rounds. A first development run exposed Lithuanian follow-up queries; the final schema explicitly uses `follow_up_queries_en` and English evaluator prose. The final real run searched with English queries and changed sources from 15.1 / 14.2 / 13.2 to 17.1 / 19 / 15.1. Evidence remained insufficient for the whole question, and the UI displayed that limitation instead of a confidence percentage. The evaluator's legal explanations were imperfect, so its opinion is explicitly labelled as fallible.

Browser checks covered the new sidebar choice, parameter controls (2 rounds and 2 queries), completed trace and source display. Private real-model test records remain only in the staging workspace; they are not research outcomes or human annotations. The fixed formal script, corpus, draft gold labels, existing slides and historical results are unchanged. Method details and primary paper citation are in CORRECTIVE_RAG.md.


## UI v8: RAG-Fusion (2026-10-27)

- Įgyvendintas užklausų generavimas, atskira vektorinė paieška kiekvienai užklausai ir standartinis vienodų svorių RRF su vietomis nuo 1. Įprastas hibrido pirmųjų rezultatų iškėlimas šiam metodui netaikomas. Atsakymo promptas gauna originalią užduotį, sugeneruotus variantus ir galutinius šaltinius.
- Išsaugomi visi rangai, RRF indėliai, pirminė generavimo išvestis, promptai, parametrai ir kodo hash. Aiškių vartotojo nuorodų įtraukimas į kontekstą atskirtas nuo gryno RRF reitingo.
- UI turi atskirus trijų parametrų valdiklius ir tikrą paieškos eigą. Sąraše ankstesnis korekcinis variantas pažymėtas kaip adaptacija. Ilgesnis variantų sąrašas slenka, paliekant nustatymus pasiekiamus.
- 65 automatinės patikros praėjo: rankų skaičiavimo kontrolė, rangų suliejimas be kosinuso balų sumavimo, kandidatų ribos, tikri atskiri paieškos kvietimai, klaidingų modelio išvesčių žurnalai, nutraukimas, tušti rezultatai, aiškių nuorodų apdorojimas ir „Be RAG“ izoliacija. JavaScript sintaksė ir Python kompiliavimas patikrinti. Testų pakaitalai nėra tyrimo duomenys.
- Realus vietinio Qwen3.5:4b bandymas su sutikimo atšaukimo klausimu panaudojo 4 paieškas, po 20 kandidatų ir RRF konstantą 60. Pirmas bendras fragmentas buvo GDPR:7.3. Reikalavimo formuluotės bandymas su pakeistais parametrais tikrai panaudojo 3 paieškas, po 10 kandidatų ir konstantą 30; pirmas fragmentas GDPR:17.1. Viena to atsakymo citata tiksliai nesutapo su šaltiniu; signalas išliko. Atsakymai žmogaus neįvertinti.
- Po paskutinių klaidų apdorojimo pataisų pakartotas realus klausimo bandymas su galutiniu moduliu ir išjungta istorija. Visų trijų realių paleidimų RRF reitingai nepriklausomai perskaičiuoti iš išsaugotų atskirų rangų; jie sutampa. Šie privatūs techniniai bandymai neplatinami ZIP ir nelaikomi žmogaus patvirtintu empiriniu palyginimu.
- Nauju papildymu nekeičiami pradinis formalus eksperimentas, korpusas, AI etalono juodraštis, klausimynas ir ankstesni rezultatai ar skaidrės. Straipsnio Infineon eksperimento rezultatų šiai programai nepriskiriame.
