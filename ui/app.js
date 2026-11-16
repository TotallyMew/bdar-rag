'use strict';
const $=id=>document.getElementById(id);
const icons={hybrid:'◈',bm25:'≡',dense:'⌕',rag_fusion:'⋈',hybrid_rerank:'⇅',corrective:'↻',tfidf:'Aa',no_rag:'○'};
let config=null, token='', method='hybrid', activeJob=null, selectedRecord=null, pendingQuestion='';
let submitting=false,storageWarned=false,pollFailures=0;
let messages=[], shownResults=new Set(), currentReview=null, toastTimer=null, polling=false;
let settings={model:'qwen3.5:4b',embed_model:'nomic-embed-text:latest',top_k:3,context_length:8192,auto_query:true,system_prompt:'',no_rag_prompt:''};
const parameterDefaults={temperature:0,top_p:0.8,sampling_top_k:20,repeat_penalty:1,presence_penalty:0,seed:42,max_output_tokens:2200,history_turns:4,candidate_pool:20,rerank_pool:10,hybrid_bm25_weight:0.5,rrf_k:60,corrective_max_rounds:2,corrective_max_queries:2,fusion_query_count:3,fusion_pool:20,fusion_rrf_k:60};
settings={...parameterDefaults,measure_confidence:true,task_mode:'auto',requirement_prompt:'',...settings};
function updateTaskMode(){
 settings.task_mode='auto';
 $('question').placeholder='Įrašykite klausimą arba reikalavimą…';
 $('chatTitle').textContent='Patikrinkite reikalavimą ar klausimą';
 renderExamples();
}
function requirementView(record){
 const a=record.answer.requirement_analysis;if(!a)return null;
 const box=node('section','requirement-analysis');const labels={justified:'Pagrįstas',partially_justified:'Iš dalies pagrįstas',not_justified:'Nepagrįstas',insufficient_evidence:'Nepakanka įrodymų'};
 const tone={partially_justified:'partial',not_justified:'negative',insufficient_evidence:'insufficient'};
 box.append(node('span','verdict-pill '+(tone[a.verdict]||''),'Modelio išvada · '+(labels[a.verdict]||a.verdict)),node('h4','','Vertinamas veiksmas'),node('p','',a.actor+' · '+a.required_action));
 const details=node('details','run-parameters');details.append(node('summary','','Teisinis pagrindimas ir sąlygos'));
 const supports={direct_legal_duty:'Tiesioginė teisinė pareiga',derived_design_choice:'Iš teisinės pareigos išvestas projektavimo sprendimas',none:'Pagrindo nenustatyta',uncertain:'Pagrindo pobūdis neaiškus'};
 box.append(node('p','analysis-note',supports[a.support_type]||a.support_type));details.append(node('p','',a.justification));
 if(a.conditions?.length){const list=node('ul');for(const text of a.conditions)list.append(node('li','',text));details.append(list);}box.append(details);
 box.append(node('h4','','Siūloma reikalavimo formuluotė'),node('p','refined-text',a.refined_requirement),node('p','analysis-note','Modelio analizė. Faktinis sistemos įgyvendinimas nevertintas.'));
 if(record.method==='no_rag')box.append(node('p','analysis-note','„Be RAG“: išvada preliminari; ryšys su pateiktais šaltiniais nenustatomas.'));
 return box;
}

function selectPromptTab(active){for(const [tab,editor] of [['ragPromptTab','systemPrompt'],['noRagPromptTab','noRagPrompt'],['requirementPromptTab','requirementPrompt']]){$(tab).classList.toggle('selected',tab===active);show(editor,tab===active);}}
function fillParameters(){for(const key of Object.keys(parameterDefaults))$('param_'+key).value=settings[key];$('measureConfidence').checked=settings.measure_confidence;}
function readParameters(){const result={};for(const key of Object.keys(parameterDefaults))result[key]=Number($('param_'+key).value);result.measure_confidence=$('measureConfidence').checked;return result;}
function confidenceView(record){
 const box=node('details','confidence-panel');const c=record.confidence;
 if(c?.status==='ok')box.append(node('summary','','Kodėl modelis pasirinko tokį pasitikėjimą?'),node('p','',c.reason),node('small','','Tas pats modelis vertina savo atsakymą. Balas nekalibruotas ir nėra patikrinta teisingumo tikimybė.'));
 else{const labels={error:'Pasitikėjimo matavimas nepavyko.',disabled:'Pasitikėjimo matavimas išjungtas.',cancelled:'Pasitikėjimo matavimas nutrauktas.',not_applicable:c?.reason==='retrieval_incomplete'?'Korekcinė patikra nustatė įrodymų spragų. Bendras pasitikėjimo procentas nerodomas.':record.answer?.abstain?'Modelis nurodė, kad įrodymų nepakanka visam klausimui. Ribotam atsakymui bendras pasitikėjimo procentas nerodomas.':'Pasitikėjimas nematuojamas, nes modelis pakartojo įvestį.'};box.append(node('summary','','Apie pasitikėjimo matavimą'),node('p','',labels[c?.status]||'Šiame ankstesniame įraše pasitikėjimas nematuotas.'));}
 return box;
}

function correctiveView(record){
 const trace=record.corrective;if(!trace)return null;
 const labels={sufficient:'Pakanka pagal modelio vertinimą',partial:'Iš dalies pakanka',insufficient:'Nepakanka'};
 const stops={sufficient:'Modelis įvertino šaltinius kaip pakankamus.',round_limit:'Pasiekta nustatyta etapų riba.',no_new_query:'Modelis nepasiūlė naujos užklausos.',unchanged_context:'Papildoma paieška nepakeitė pateikiamų fragmentų.'};
 const box=node('details','run-parameters corrective-trace');box.open=true;
 box.append(node('summary','',`Korekcinio RAG eiga (${trace.rounds.length} patikros etapai)`));
 box.append(node('p','source-meta','Toliau pateikta modelio nuomonė apie šaltinius. Jo paaiškinimuose taip pat gali būti klaidų.'));
 for(const step of trace.rounds){const section=node('div','corrective-step');
  section.append(node('strong','',`${step.round}. ${labels[step.evaluation.assessment.judgment]}`),node('p','',step.evaluation.assessment.reason));
  if(step.evaluation.assessment.missing_aspects.length)section.append(node('p','',`Spragos: ${step.evaluation.assessment.missing_aspects.join('; ')}`));
  section.append(node('p','source-meta',`Pateikti šaltiniai: ${step.source_ids.map(articleLabel).join(', ')}`));
  if(step.correction)section.append(node('p','source-meta',`Papildomos užklausos: ${step.correction.queries.join(' / ')}`));
  box.append(section);}
 box.append(node('p','',stops[trace.stop_reason]||trace.stop_reason),node('small','source-meta','Šaltinių pakankamumą vertina vietinis modelis. Tai CRAG įkvėptas variantas fiksuotam korpusui; vertinimas nėra žmogaus patikra.'));
 return box;
}

function fusionView(record){
 const trace=record.rag_fusion;if(!trace)return null;
 const box=node('details','run-parameters fusion-trace');box.open=true;
 box.append(node('summary','',`RAG-Fusion eiga · ${trace.queries.length} paieškos užklausos`));
 box.append(node('p','source-meta','Kiekvienai užklausai atliekama vektorinė paieška. Jos rangai sujungiami vienodais svoriais pagal RRF formulę.'));
 for(const step of trace.retrievals){const section=node('div','corrective-step');
  section.append(node('strong','',`${step.query_index+1}. ${step.query}`),node('p','source-meta',`Pirmi rezultatai: ${step.ranking.slice(0,3).map(d=>articleLabel(d.id)).join(', ')||'Nėra'}`));box.append(section);}
 box.append(node('p','source-meta',`RRF konstanta: ${trace.rrf_constant}. Kandidatų vienai užklausai: ${trace.pool_size}.`));
 const top=trace.fused_ranking.slice(0,record.experiment_settings?.top_k||3);
 if(top.length){box.append(node('strong','','Bendro RRF reitingo pradžia'));const list=node('ol');
  for(const row of top)list.append(node('li','source-meta',`${articleLabel(row.id)} · ${row.rrf_score.toFixed(6)} · ${row.contributions.length} užklausų indėlis`));box.append(list);}
 if(trace.explicit_reference_ids?.length)box.append(node('p','source-meta','Aiškiai jūsų paprašytos nuostatos į galutinį kontekstą įtraukiamos atskirai. Aukščiau matomas grynas RRF reitingas prieš šį bendrą programos veiksmą.'));
 box.append(node('small','source-meta','RRF balas nusako vietą reitinge. Jis nėra atsakymo pasitikėjimas ar teisingumo tikimybė. Užklausų nukrypimas gali pabloginti rezultatus.'));
 return box;
}

function referenceView(record){
 const coverage=record.reference_coverage;if(!coverage?.length||record.method==='no_rag')return null;
 const box=node('details','run-parameters reference-coverage');box.open=coverage.some(r=>r.status!=='cited');
 box.append(node('summary','','Paprašytų straipsnių aprėptis'));
 for(const ref of coverage){const label=ref.article+(ref.paragraph?'('+ref.paragraph+')':'')+' str.';
  const status=ref.status==='missing'?'nepateiktas modeliui':ref.status==='uncited'?'pateiktas modeliui, bet atsakyme nėra jo citatos':`pateikti fragmentai: ${ref.source_ids.length}, cituoti: ${ref.cited_ids.length}`;
  box.append(node('p',ref.status==='cited'?'source-meta':'reference-warning',label+' · '+status));}
 box.append(node('small','source-meta','Tai šaltinių ir citatų nuorodų aprėptis. Ji nepatvirtina teiginių teisingumo.'));
 if(record.exact_source_ids?.length>(record.experiment_settings?.top_k||0))box.append(node('p','source-meta',`Aiškiai paprašytos nuostatos įtrauktos virš paieškos top-k ribos. Modeliui pateikta ${record.context.length} fragmentų.`));
 return box;
}

function parametersView(record){
 if(!record.experiment_settings)return null;
 const box=node('details','run-parameters');box.append(node('summary','','Šio atsakymo parametrai'));
 const names={temperature:'Temperature',top_p:'Top-p',sampling_top_k:'Top-k (žetonai)',repeat_penalty:'Kartojimo bauda',presence_penalty:'Panaudotų žetonų bauda',seed:'Seed',max_output_tokens:'Žetonų limitas',history_turns:'Istorijos ėjimai (taikyta)',requested_history_turns:'Istorijos ėjimai (nustatyta)',candidate_pool:'Kandidatų skaičius',rerank_pool:'Perrikiavimo kandidatai',hybrid_bm25_weight:'BM25 dalis',rrf_k:'RRF konstanta',corrective_max_rounds:'Korekcinio RAG etapų riba',corrective_max_queries:'Papildomų užklausų viename etape',fusion_query_count:'RAG-Fusion papildomų užklausų',fusion_pool:'RAG-Fusion kandidatų vienai užklausai',fusion_rrf_k:'RAG-Fusion RRF konstanta',top_k:'Šaltinių fragmentai',context_length:'Konteksto talpa',auto_query:'Klausimo pritaikymas',measure_confidence:'Pasitikėjimo matavimas'};
 const list=node('dl');for(const [key,label] of Object.entries(names)){const value=record.experiment_settings[key];if(value!==undefined)list.append(node('dt','',label),node('dd','',typeof value==='boolean'?(value?'Įjungta':'Išjungta'):String(value)));}box.append(list);
 if(record.method==='no_rag')box.append(node('p','','„Be RAG“ nenaudoja paieškos parametrų ir šaltinių fragmentų.'));
 return box;
}

function node(tag,className,text){const n=document.createElement(tag);if(className)n.className=className;if(text!==undefined)n.textContent=text;return n;}
function show(id,yes=true){$(id).classList.toggle('hidden',!yes);}
function toast(text){$('toast').textContent=text;show('toast');clearTimeout(toastTimer);toastTimer=setTimeout(()=>show('toast',false),3500);}
function error(text){$('errorBanner').textContent=text;show('errorBanner',!!text);}
function articleLabel(id){const bits=id.replace('GDPR:','').split('.');return bits.length>1?`${bits[0]}(${bits.slice(1).join('.')}) str.`:`${bits[0]} str.`;}
function methodName(id){return config?.methods.find(m=>m.id===id)?.name||id;}
function saveState(){
 const stored=messages.slice(-40).map(m=>{if(m.type!=='assistant')return m;const r=m.record;return {...m,record:{...r,generation:undefined,query_rewrite:undefined,reranker:undefined,prompt:undefined,system_prompt:undefined,rag_fusion:r.rag_fusion?{...r.rag_fusion,query_generation:undefined}:null,corrective:r.corrective?{...r.corrective,rounds:r.corrective.rounds.map(step=>({...step,evaluation:{assessment:step.evaluation.assessment}}))}:null,confidence:r.confidence?{...r.confidence,generation:undefined}:null,task_detection:r.task_detection?{...r.task_detection,generation:undefined}:null}};});
 try{localStorage.setItem('bdar-chat-v1',JSON.stringify({method,settings,messages:stored,activeJob,pendingQuestion,selectedId:selectedRecord?.id}));}
 catch{if(!storageWarned){storageWarned=true;toast('Naršyklės saugykla pilna. Rezultatai saugomi programos aplanke; eksportuokite pokalbį.');}}
}

async function api(path,body){
 const options={headers:{'X-App-Token':token}};
 if(body!==undefined){options.method='POST';options.headers['Content-Type']='application/json';options.body=JSON.stringify(body);}
 const response=await fetch(path,options);let data;
 try{data=await response.json();}catch{throw new Error('Programa neatsako. Patikrinkite, ar ji paleista.');}
 if(!response.ok){const e=new Error(data.error||`Užklausos klaida (${response.status}).`);e.status=response.status;throw e;}
 return data;
}

function setBusy(yes){
 for(const id of ['sendButton','newChat','compareLaunch','settingsLaunch','question','mobileSettings','mobileNewChat','mobileCompare'])if($(id))$(id).disabled=yes;
 document.querySelectorAll('.method-button,.example-btn').forEach(b=>b.disabled=yes);show('jobStatus',yes);
 if(!yes){activeJob=null;submitting=false;$('cancelJob').disabled=false;$('cancelJob').textContent='Nutraukti';$('question').focus();}
}

function setMethod(id){method=id;$('activeMethod').textContent=methodName(id);document.querySelectorAll('.method-button').forEach(b=>b.classList.toggle('active',b.dataset.method===id));saveState();}
function buildMethods(){
 $('methodList').replaceChildren();$('compareMethods').replaceChildren();$('settingsMethod').replaceChildren();
 for(const m of config.methods){
  const option=node('option','',m.name);option.value=m.id;$('settingsMethod').append(option);
  const b=node('button','method-button');b.type='button';b.dataset.method=m.id;b.title=m.description;
  b.append(node('span','method-icon',icons[m.id]),node('span','',m.name));b.addEventListener('click',()=>setMethod(m.id));$('methodList').append(b);
  const label=node('label','checkbox-row');const input=node('input');input.type='checkbox';input.name='compareMethod';input.value=m.id;input.checked=['no_rag','bm25','dense','hybrid','rag_fusion'].includes(m.id);
  const span=node('span');span.append(node('strong','',m.name),node('small','',m.description));label.append(input,span);$('compareMethods').append(label);
 }
 setMethod(method);
}
function renderExamples(){
 $('examples').replaceChildren();for(const example of [...(config.requirement_examples||[]).slice(0,2),...(config.examples||[]).slice(0,2)]){const b=node('button','example-btn',example);b.type='button';b.addEventListener('click',()=>{$('question').value=example;$('question').focus();});$('examples').append(b);}
}
function fillModelSelect(id,values,current){
 const select=$(id);select.replaceChildren();for(const value of values){const option=node('option','',value);option.value=value;select.append(option);}
 if(!values.length){const option=node('option','','Modelio nėra');option.value='';select.append(option);}
 select.value=values.includes(current)?current:(values[0]||'');
}
function applyConfigUI(){
 const o=config.ollama;$('connection').className='connection '+(o.connected?'connected':'failed');
 $('connection').replaceChildren(node('i'),document.createTextNode(o.connected?'„Ollama“ prijungta':'„Ollama“ nepasiekiama'));
 fillModelSelect('modelSelect',o.models,settings.model);fillModelSelect('embedSelect',o.embed_models,settings.embed_model);
 if(o.models.length&&!o.models.includes(settings.model))settings.model=o.models[0];
 if(o.embed_models.length&&!o.embed_models.includes(settings.embed_model))settings.embed_model=o.embed_models[0];
 $('modelLabel').textContent=settings.model;$('corpusCount').textContent=`${config.corpus.articles} straipsniai · ${config.corpus.chunks} fragmentai`;
 if(!o.connected)error('Paleiskite „Ollama“ programą ir paspauskite „Modelis ir promptai“ → „Atnaujinti modelių sąrašą“.');
 else if(!o.models.length)error('Nėra vietinio atsakymų modelio. Atsisiųskite jį per „Ollama“.');
 else error('');
}
function updateEmpty(){show('welcome',messages.length===0);$('exportButton').disabled=!messages.some(m=>m.type==='assistant');}
function scrollBottom(){requestAnimationFrame(()=>$('chatScroll').scrollTo({top:$('chatScroll').scrollHeight,behavior:'smooth'}));}
function addUser(question){const m={type:'user',id:crypto.randomUUID(),question};messages.push(m);renderMessage(m);updateEmpty();scrollBottom();saveState();}
function addResult(record){const existing=messages.find(m=>m.type==='assistant'&&m.id===record.id);if(existing){if(record.human_review&&!existing.record.human_review){existing.record=record;renderAll();}return;}shownResults.add(record.id);messages.push({type:'assistant',id:record.id,record});renderMessage(messages.at(-1));updateEmpty();renderComparison();setSources(record);scrollBottom();saveState();}

function renderMessage(m){
 const article=node('article','message '+m.type);article.dataset.id=m.id;
 const meta=node('div','message-meta');meta.append(node('span','avatar',m.type==='user'?'J':'B'),node('strong','',m.type==='user'?'Jūsų įvestis':m.record.method_name));
 if(m.type==='assistant')meta.append(node('span','message-model',m.record.model),node('span','message-model',m.record.task_mode==='requirement'?'Reikalavimo analizė':'BDAR klausimas'));article.append(meta);
 const r=m.record;const repeated=m.type==='assistant'&&(r.quality_flags?.includes('answer_repeated_question')||r.answer.answer.trim().toLowerCase()===r.question.trim().toLowerCase());
 article.append(node('div','message-body',m.type==='user'?m.question:repeated?'Modelis pakartojo įvestį ir nepateikė tinkamo atsakymo.':r.answer.answer));
 if(m.type==='assistant'){
  const good=(r.audit?.details||[]).filter(d=>d.known_id&&d.exact_quote).length,total=r.audit?.citation_count||0;
  if(r.provenance_unavailable)article.append(node('p','quality-note','Pilnas šio įrašo žurnalas nepasiekiamas. Rodoma naršyklėje likusi kopija.'));
  if(r.generation?.repair_attempts?.length)article.append(node('p','source-meta','Modelis vieną kartą tikslino atsakymą pagal struktūrinę patikrą. Pirminis variantas ir pataisymo nurodymas išsaugoti eksporte.'));
  const stats=node('div','stat-grid');
  for(const [label,value,note] of [['Modelio pasitikėjimas',r.confidence?.status==='ok'?r.confidence.percent+' %':'—','Savęs vertinimas, nekalibruotas'],['Citatų sutapimas',r.method==='no_rag'?'Netaikoma':total?good+' / '+total:'Nėra citatų','Tik teksto patikra, ne teisingumas'],['Žmogaus teisingumo balas',r.human_review?r.human_review.correctness_0_2+' / 2':'Neįvertinta',r.human_review?'Vertintojas: '+r.human_review.reviewer:'Teisingumą patvirtina peržiūra']]){const tile=node('div','stat-tile');tile.append(node('span','',label),node('strong','',value),node('small','',note));stats.append(tile);}article.append(stats);
  const refView=referenceView(r);if(refView)article.append(refView);
  const flagLabels={corrective_incomplete_evidence:'Korekcinė patikra nustatė likusių įrodymų spragų. Atsakymas gali apimti tik dalį klausimo.',answer_repeated_question:'Atsakymas pakartojo įvestį.',model_abstained:'Modelis nurodė, kad įrodymų nepakanka visam klausimui. Pateiktas paaiškinimas gali apimti tik jo dalį.',source_absence_claim:'Teiginyje remiamasi tuo, kad šaltinyje nėra nuostatos. Patikrinkite, ar iš to nepadaryta nepagrįsta išvada apie pareigos nebuvimą.',requested_reference_missing:'Bent vienas aiškiai paprašytas straipsnis nepateko į modelio šaltinius. Šio atsakymo nepakanka visai užklausai.',requested_reference_uncited:'Bent vienas paprašytas straipsnis pateiktas modeliui, bet atsakyme nėra jo citatos. Patikrinkite, ar atsakyta į tą klausimo dalį.',no_evidence:'Paieška nepateikė įrodymų.',no_claims:'Nėra patikrinamų teiginių.',uncited_claims:'Dalis teiginių neturi citatų.',no_citations:'Atsakymas nepateikė citatų.',unknown_citation:'Cituojamas šaltinis nebuvo pateiktas modeliui.',unmatched_quote:'Dalis citatų tiksliai nesutampa su šaltiniu.',no_rag_fabricated_citations:'Modelis pateikė citatas, nors „Be RAG“ šaltinių negauna.',inconsistent_verdict:'Modelio išvada prieštarauja jo nurodytam pagrindo pobūdžiui arba susilaikymui.',unsupported_verdict:'Teigiamas vertinimas neturi pateiktų citatų.',basis_statement_conflict:'Santrauka pagrindą vadina tiesioginiu, o analizė – išvestiniu projektavimo sprendimu. Šį neatitikimą reikia peržiūrėti.'};
  if(r.quality_flags?.length){const warning=node('div','quality-note');warning.append(node('strong','','Peržiūros signalai'));for(const flag of r.quality_flags)warning.append(node('p','',flagLabels[flag]||flag));article.append(warning);}
  const correction=correctiveView(r);if(correction)article.append(correction);const fusion=fusionView(r);if(fusion)article.append(fusion);
  const analysis=requirementView(r);if(analysis)article.append(analysis);article.append(confidenceView(r));
  if(r.answer.limitations?.length){const limitations=node('details','run-parameters');limitations.append(node('summary','',`Modelio nurodyti apribojimai (${r.answer.limitations.length})`));for(const value of r.answer.limitations)limitations.append(node('p','',value));article.append(limitations);}
  const actions=node('div','message-actions');
  const sources=node('button','small-btn',`Šaltiniai (${r.context.length})`);sources.type='button';sources.addEventListener('click',()=>{setSources(r);if(innerWidth<=1050)openSources(true);});actions.append(sources);
  const copy=node('button','small-btn','Kopijuoti');copy.type='button';copy.disabled=repeated;copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(r.answer.answer);toast('Atsakymas nukopijuotas.');}catch{toast('Pažymėkite atsakymą ir nukopijuokite su Ctrl+C.');}});actions.append(copy);
  const review=node('button','small-btn',r.human_review?'Peržiūrėti vertinimą':'Įvertinti');review.type='button';review.addEventListener('click',()=>openReview(r));actions.append(review);
  const seconds=(r.retrieval_ms||0)+(r.generation_ms||0)+(r.confidence_ms||0);actions.append(node('span','source-meta',(seconds/1000).toFixed(1)+' s · paieška, atsakymas ir savęs vertinimas'));article.append(actions);
  if(r.answer.claims?.length){const details=node('details','claims');details.open=repeated;details.append(node('summary','',`Teiginiai ir citatos (${r.answer.claims.length})`));
   for(const claim of r.answer.claims){const row=node('div','claim');row.append(node('p','',claim.text));if(!claim.citations?.length)row.append(node('small','source-meta','Šis teiginys neturi šaltinio citatos.'));for(const c of claim.citations||[]){const source=r.context.find(d=>d.id===c.id);const matched=source&&normalizeQuote(source.text).includes(normalizeQuote(c.quote))&&normalizeQuote(c.quote).length>=12;const button=node('button','citation-btn'+(!matched?' mismatch':''),articleLabel(c.id)+(matched?'':' · patikrinti'));button.type='button';button.title=c.quote;button.disabled=!source;button.addEventListener('click',()=>{setSources(r,c.id,c.quote);if(innerWidth<=1050)openSources(true);});row.append(button);if(!matched)row.append(node('div','claim-quote',c.quote));}details.append(row);}article.append(details);}
  if(r.task_detection){const intent=node('details','run-parameters');intent.append(node('summary','','Kaip suprasta įvestis'),node('p','',r.task_detection.reason),node('p','',`${r.task_detection.actor} · ${r.task_detection.action} · ${r.task_detection.object}`));article.append(intent);}
  const params=parametersView(r);if(params)article.append(params);
 }
 $('messages').append(article);
}

function renderAll(){ $('messages').replaceChildren();shownResults=new Set();for(const m of messages){renderMessage(m);if(m.type==='assistant')shownResults.add(m.id);}updateEmpty();renderComparison();}

function highlightedText(container,text,quote){
 if(!quote){container.textContent=text;return;}
 let at=text.indexOf(quote), actual=quote;
 if(at<0){const escaped=quote.trim().split(/\s+/).map(w=>w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('\\s+');try{const match=text.match(new RegExp(escaped));if(match){at=match.index;actual=match[0];}}catch{/* Show source unmodified if it cannot be highlighted. */}}
 if(at<0){container.textContent=text;return;}
 container.append(document.createTextNode(text.slice(0,at)),node('mark','',actual),document.createTextNode(text.slice(at+actual.length)));
}
function setSources(record,selectedId,quote){
 selectedRecord=record;show('sourcesEmpty',false);$('sourceContent').replaceChildren();$('sourceCount').textContent=record.context.length;
 document.querySelectorAll('.message.assistant').forEach(n=>n.classList.toggle('active-source',n.dataset.id===record.id));
 $('sourceContent').append(node('p','source-meta',`${record.method_name} · ${record.context.length} fragmentai\n${config.corpus.version}`));
 if(!record.context.length)$('sourceContent').append(node('div','no-source-note',record.method==='no_rag'?'Šiam atsakymui RAG nenaudotas. Modelis atsakė be pateiktų BDAR ištraukų.':'Paieška negrąžino BDAR fragmentų. Modelis neturi pateiktų įrodymų šiam klausimui.'));
 record.context.forEach((source,index)=>{
  const card=node('details','source-card'+(source.id===selectedId?' selected':''));card.dataset.source=source.id;card.open=source.id===selectedId||(!selectedId&&index===0);
  const summary=node('summary');const title=node('span');title.append(node('strong','',articleLabel(source.id)),node('span','source-title',source.title));summary.append(node('span','source-number',String(index+1).padStart(2,'0')),title,node('span','', '⌄'));card.append(summary);
  const body=node('div','source-text');highlightedText(body,source.text,source.id===selectedId?quote:null);card.append(body);
  const links=node('div','source-link');const a=node('a','','Atverti originalų tekstą ↗');a.href=source.url;a.target='_blank';a.rel='noopener noreferrer';links.append(a,node('span','',source.id));card.append(links);$('sourceContent').append(card);
 });
 const queries=record.search_queries||[record.search_query];if(queries.some(Boolean)){const q=node('details','query-details');q.append(node('summary','','Paieškai naudotos užklausos'),node('p','',queries.filter(Boolean).join('\n\n')));$('sourceContent').append(q);}
 if(selectedId){requestAnimationFrame(()=>{const selected=[...$('sourceContent').querySelectorAll('.source-card')].find(c=>c.dataset.source===selectedId);selected?.scrollIntoView({block:'nearest',behavior:'smooth'});});}
}
function history(){
 const turns=[];let turn=null;
 for(const m of messages){if(m.type==='user'){turn={question:m.question,answers:[]};turns.push(turn);}else if(turn)turn.answers.push(m.record);}
 return turns.filter(t=>t.answers.length===1&&!t.answers[0].answer.abstain&&!t.answers[0].quality_flags?.includes('answer_repeated_question')).slice(-4).map(t=>({question:t.question,answer:t.answers[0].answer.answer}));
}

async function submit(methods=[method]){
 if(activeJob||submitting)return;const question=$('question').value.trim();
 if(!question){error('Pirmiausia įrašykite klausimą arba reikalavimą.');$('question').focus();return;}
 if(!config.ollama.connected||!settings.model){error('Paleiskite „Ollama“ ir pasirinkite vietinį modelį nustatymuose.');return;}
 if(methods.some(m=>['dense','hybrid','hybrid_rerank','corrective','rag_fusion'].includes(m))&&!settings.embed_model){error('Pasirinkite semantinės paieškos modelį.');return;}
 error('');submitting=true;pendingQuestion=question;const prior=history();setBusy(true);$('jobStage').textContent='Užklausa perduodama modeliui…';
 try{const response=await api('/api/chat',{question,methods,...settings,history:prior});activeJob=response.job_id;addUser(question);$('question').value='';submitting=false;saveState();pollJob();}
 catch(e){setBusy(false);error(e.message);saveState();}
}

async function pollJob(){
 if(!activeJob||polling)return;polling=true;const id=activeJob;
 try{
  const job=await api('/api/jobs/'+id);pollFailures=0;error('');$('jobStage').textContent=job.stage;$('jobTime').textContent=Math.max(0,Math.round(Date.now()/1000-job.started_at))+' s';$('jobProgress').style.width=job.progress===null?'0%':Math.round(job.progress*100)+'%';
  for(const record of job.results||[])addResult(record);
  if(['done','error','cancelled'].includes(job.status)){setBusy(false);if(job.error){error(job.error);$('question').value=pendingQuestion;}if(job.status==='cancelled'){toast('Užklausa nutraukta. Paruošti atsakymai išsaugoti.');$('question').value=pendingQuestion;}saveState();}
 }catch(e){
  if(e.status===404||e.status===403){setBusy(false);$('question').value=pendingQuestion;error('Ankstesnė užklausa nepasiekiama po programos paleidimo iš naujo. Įvestis atkurta.');saveState();}
  else{pollFailures++;error('Ryšys su programa nutrūko. Bandome prisijungti iš naujo; užklausa nedubliuojama.');}
 }finally{polling=false;if(activeJob===id)setTimeout(pollJob,Math.min(4000,750+pollFailures*750));}
}

function openSettings(){
 fillParameters();
 $('settingsMethod').value=method;
 $('modelSelect').value=settings.model;$('embedSelect').value=settings.embed_model;$('topK').value=settings.top_k;$('contextLength').value=settings.context_length;$('autoQuery').checked=settings.auto_query;
 $('systemPrompt').value=settings.system_prompt;$('noRagPrompt').value=settings.no_rag_prompt;$('requirementPrompt').value=settings.requirement_prompt;$('settingsError').textContent='';selectPromptTab('ragPromptTab');$('settingsDialog').showModal();
}
function openReview(record){
 record=messages.find(m=>m.type==='assistant'&&m.id===record.id)?.record||record;currentReview=record;$('reviewForm').reset();$('reviewRecord').value=record.id;$('reviewError').textContent='';const review=record.human_review;
 if(review){$('reviewer').value=review.reviewer;$('correctness').value=review.correctness_0_2;$('completeness').value=review.completeness_0_2;$('supportedClaims').value=review.supported_claims??0;$('totalClaims').value=review.total_material_claims??0;$('reviewNotes').value=review.notes;$('reviewedSources').checked=true;}
 else{$('totalClaims').value=record.answer.claims.length;$('supportedClaims').value='';}
 const noRag=record.method==='no_rag';$('supportedClaims').disabled=noRag;$('totalClaims').disabled=noRag;if(noRag){$('supportedClaims').value=0;$('totalClaims').value=0;}$('reviewDialog').showModal();
}

async function exportChat(){
 const button=$('exportButton');button.disabled=true;
 try{await hydrateRecords();const value={application:'BDAR RAG laboratorija',schema_version:8,exported_utc:new Date().toISOString(),settings,corpus:config.corpus,messages};const blob=new Blob([JSON.stringify(value,null,2)],{type:'application/json;charset=utf-8'});const url=URL.createObjectURL(blob);const a=node('a');a.href=url;a.download='BDAR_pokalbis_'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast(messages.some(m=>m.record?.provenance_unavailable)?'Eksportuota. Dalis ankstesnių įrašų turi tik naršyklės kopiją; tai pažymėta JSON.':'Eksportuoti atsakymai, šaltiniai, parametrai ir vertinimai.');}
 catch(e){error('Eksportuoti nepavyko: '+e.message);}finally{updateEmpty();}
}

function mobileSettingsShortcut(){const wrap=node('div','mobile-tools');const button=node('button','small-btn mobile-settings','Nustatymai');button.id='mobileSettings';button.addEventListener('click',openSettings);const compare=node('button','small-btn mobile-settings','Palyginti');compare.id='mobileCompare';compare.addEventListener('click',()=>$('compareLaunch').click());wrap.append(button,compare);$('chatTitle').parentElement.append(wrap);}
function bind(){
 $('chatForm').addEventListener('submit',e=>{e.preventDefault();submit();});
 $('question').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();submit();}});
 $('newChat').addEventListener('click',()=>{messages=[];shownResults.clear();selectedRecord=null;renderAll();$('sourceContent').replaceChildren();$('sourceCount').textContent='0';show('sourcesEmpty');openSources(false);error('');saveState();$('question').focus();});
 $('mobileNewChat').addEventListener('click',()=>$('newChat').click());$('exportButton').addEventListener('click',exportChat);$('settingsLaunch').addEventListener('click',openSettings);
 $('settingsForm').addEventListener('submit',e=>{e.preventDefault();const values=readParameters();const top=Number($('topK').value),selected=$('settingsMethod').value;$('settingsError').textContent='';if((['hybrid','hybrid_rerank','corrective'].includes(selected)&&values.candidate_pool<top)||(selected==='hybrid_rerank'&&values.rerank_pool<top)||(selected==='rag_fusion'&&values.fusion_pool<top)){$('settingsError').textContent='Kandidatų turi būti ne mažiau nei galutinių fragmentų.';return;}settings={...settings,...readParameters(),requirement_prompt:$('requirementPrompt').value,model:$('modelSelect').value,embed_model:$('embedSelect').value,top_k:Number($('topK').value),context_length:Number($('contextLength').value),auto_query:$('autoQuery').checked,system_prompt:$('systemPrompt').value,no_rag_prompt:$('noRagPrompt').value};setMethod($('settingsMethod').value);$('modelLabel').textContent=settings.model;saveState();$('settingsDialog').close();toast('Nustatymai išsaugoti. Jie bus taikomi kitam klausimui.');});
 $('resetParameters').addEventListener('click',()=>{for(const [key,value] of Object.entries(parameterDefaults))$('param_'+key).value=value;$('measureConfidence').checked=true;$('topK').value=3;$('contextLength').value=8192;$('autoQuery').checked=true;});
 $('resetPrompts').addEventListener('click',()=>{$('systemPrompt').value=config.default_prompts.rag_system;$('noRagPrompt').value=config.default_prompts.no_rag_system;$('requirementPrompt').value=config.requirement_prompt;});
 for(const tab of ['ragPromptTab','noRagPromptTab','requirementPromptTab'])$(tab).addEventListener('click',()=>selectPromptTab(tab));
 $('refreshModels').addEventListener('click',async()=>{const b=$('refreshModels');b.disabled=true;try{config=await api('/api/config');token=config.token;applyConfigUI();toast(config.ollama.connected?'Modelių sąrašas atnaujintas.':'„Ollama“ dar nepasiekiama.');}catch(e){error(e.message);}finally{b.disabled=false;}});
 $('compareLaunch').addEventListener('click',()=>{$('compareError').textContent='';$('compareDialog').showModal();});
 $('compareForm').addEventListener('submit',e=>{e.preventDefault();const methods=[...document.querySelectorAll('input[name=compareMethod]:checked')].map(i=>i.value);if(!methods.length){$('compareError').textContent='Pasirinkite bent vieną metodą.';return;}if(!$('question').value.trim()){$('compareError').textContent='Pirmiausia įrašykite klausimą pokalbio laukelyje.';return;}$('compareDialog').close();submit(methods);});
 $('reviewForm').addEventListener('submit',async e=>{e.preventDefault();$('reviewError').textContent='';const supported=Number($('supportedClaims').value),total=Number($('totalClaims').value);if(supported>total){$('reviewError').textContent='Pagrįstų teiginių negali būti daugiau nei visų.';return;}const b=e.submitter;b.disabled=true;try{const result=await api('/api/reviews',{record_id:$('reviewRecord').value,reviewer:$('reviewer').value,correctness:Number($('correctness').value),completeness:Number($('completeness').value),supported_claims:supported,total_claims:total,notes:$('reviewNotes').value,reviewed_sources:$('reviewedSources').checked});currentReview.human_review=result;saveState();renderAll();if(selectedRecord)setSources(selectedRecord);$('reviewDialog').close();toast('Jūsų vertinimas išsaugotas.');}catch(e){$('reviewError').textContent=e.message;}finally{b.disabled=false;}});
 $('cancelJob').addEventListener('click',async()=>{if(!activeJob)return;$('cancelJob').disabled=true;$('cancelJob').textContent='Nutraukiama…';try{await api('/api/cancel',{job_id:activeJob});}catch(e){error(e.message);}});
 $('mobileSources').addEventListener('click',()=>openSources(!$('sourcesPanel').classList.contains('open')));$('closeSources').addEventListener('click',()=>openSources(false));$('sourceScrim').addEventListener('click',()=>openSources(false));document.addEventListener('keydown',e=>{if(e.key==='Escape')openSources(false);});window.addEventListener('resize',()=>{if(innerWidth>1050)show('sourceScrim',false);});
 document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>$(b.dataset.close).close()));
 for(const dialog of document.querySelectorAll('dialog'))dialog.addEventListener('click',e=>{if(e.target===dialog){const box=dialog.getBoundingClientRect();if(e.clientX<box.left||e.clientX>box.right||e.clientY<box.top||e.clientY>box.bottom)dialog.close();}});
}

function normalizeQuote(text){return String(text||'').replace(/\s+/g,' ').trim();}
function openSources(yes){$('sourcesPanel').classList.toggle('open',yes);show('sourceScrim',yes&&innerWidth<=1050);$('mobileSources').setAttribute('aria-expanded',String(yes));}
function renderComparison(){
 const panel=$('comparisonSummary');let index=messages.length-1;while(index>=0&&messages[index].type!=='user')index--;const records=messages.slice(index+1).filter(m=>m.type==='assistant').map(m=>m.record);panel.replaceChildren();show('comparisonSummary',records.length>1);if(records.length<2)return;
 panel.append(node('h2','','Metodų palyginimas'),node('p','','Tas pats klausimas ir generavimo parametrai, be ankstesnio pokalbio istorijos. Pasitikėjimas, citatos ir žmogaus balas matuojami atskirai.'));
 const wrap=node('div','table-wrap'),table=node('table'),head=node('thead'),hr=node('tr');for(const label of ['Metodas','Šaltiniai','Citatos','Modelio balas','Žmogaus balas','Užklausos','Patikros etapai','Paieška'])hr.append(node('th','',label));head.append(hr);table.append(head);const body=node('tbody');
 for(const r of records){const row=node('tr'),cell=node('td'),button=node('button','comparison-link',r.method_name);button.type='button';button.addEventListener('click',()=>{const target=[...document.querySelectorAll('.message.assistant')].find(e=>e.dataset.id===r.id);target?.scrollIntoView({block:'start',behavior:'smooth'});setSources(r);});cell.append(button);row.append(cell);const good=(r.audit?.details||[]).filter(d=>d.known_id&&d.exact_quote).length;for(const value of [String(r.context.length),r.method==='no_rag'?'—':r.audit?.citation_count?good+'/'+r.audit.citation_count:'0',r.confidence?.status==='ok'?r.confidence.percent+' %':'—',r.human_review?r.human_review.correctness_0_2+'/2':'Neįvertinta',r.method==='no_rag'?'—':String(r.search_queries?.length||1),r.corrective?String(r.corrective.rounds.length):'—',((r.retrieval_ms||0)/1000).toFixed(2)+' s'])row.append(node('td','',value));body.append(row);}table.append(body);wrap.append(table);panel.append(wrap);
 const same=records.some((a,i)=>records.some((b,j)=>j>i&&normalizeQuote(a.answer.answer).toLowerCase()===normalizeQuote(b.answer.answer).toLowerCase()));if(same)panel.append(node('p','','Bent dviejų metodų atsakymų tekstas sutampa. Daugiau citatų savaime nereiškia geresnio atsakymo.'));
 const rag=records.filter(r=>r.context.length);if(rag.length>1){const sets=rag.map(r=>new Set(r.context.map(d=>d.id)));const union=new Set(sets.flatMap(v=>[...v]));const shared=[...sets[0]].filter(id=>sets.every(v=>v.has(id)));panel.append(node('p','',`Visiems RAG variantams bendri punktai: ${shared.length} iš ${union.size} skirtingų. Šaltinių sutapimas nėra atsakymų teisingumo balas.`));}
 panel.append(node('p','','Šis kelių metodų palyginimas neperduodamas kaip vienas pasirinktas atsakymas į kitą pokalbio ėjimą.'));
}
async function hydrateRecords(){
 await Promise.all(messages.filter(m=>m.type==='assistant').map(async m=>{try{m.record=await api('/api/runs/'+m.id);}catch(e){if(!m.record.generation)m.record.provenance_unavailable=true;}}));
}

async function init(){
 bind();
 try{
  config=await api('/api/config');token=config.token;settings={...settings,...config.parameter_defaults};
  let saved;try{saved=JSON.parse(localStorage.getItem('bdar-chat-v1')||'null');}catch{}
  if(saved){if(config.methods.some(m=>m.id===saved.method))method=saved.method;if(saved.settings)settings={...settings,...saved.settings};if(Array.isArray(saved.messages))messages=saved.messages.filter(m=>m.type==='user'||m.type==='assistant'&&m.record?.answer).slice(-40);}
  if(settings.system_prompt===config.legacy_default_prompts?.rag_system)settings.system_prompt=config.default_prompts.rag_system;
  if(settings.no_rag_prompt===config.legacy_default_prompts?.no_rag_system)settings.no_rag_prompt=config.default_prompts.no_rag_system;
  if(settings.system_prompt===config.previous_default_prompts?.rag_system)settings.system_prompt=config.default_prompts.rag_system;
  if(settings.no_rag_prompt===config.previous_default_prompts?.no_rag_system)settings.no_rag_prompt=config.default_prompts.no_rag_system;
  if(!settings.system_prompt)settings.system_prompt=config.default_prompts.rag_system;
  if(!settings.no_rag_prompt)settings.no_rag_prompt=config.default_prompts.no_rag_system;
  settings.task_mode='auto';
  if(!settings.requirement_prompt||settings.requirement_prompt===config.previous_requirement_prompt)settings.requirement_prompt=config.requirement_prompt;
  await hydrateRecords();buildMethods();updateTaskMode();applyConfigUI();renderAll();mobileSettingsShortcut();
  const last=messages.find(m=>m.type==='assistant'&&m.id===saved?.selectedId)||messages.filter(m=>m.type==='assistant').at(-1);if(last)setSources(last.record);
  if(saved?.activeJob){activeJob=saved.activeJob;pendingQuestion=saved.pendingQuestion||'';setBusy(true);pollJob();}
  $('question').focus();
 }catch(e){error('Nepavyko prisijungti prie vietinės programos. Paleiskite „Paleisti BDAR pokalbi.cmd“. '+e.message);}
}
init();
