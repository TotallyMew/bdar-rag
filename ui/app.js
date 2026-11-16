'use strict';
const $=id=>document.getElementById(id);
const icons={hybrid:'◈',bm25:'≡',dense:'⌕',rag_fusion:'⋈',hybrid_rerank:'⇅',corrective:'↻',tfidf:'Aa',no_rag:'○'};
let config=null, token='', method='hybrid', activeJob=null, selectedRecord=null;
let conversationId=crypto.randomUUID().replaceAll('-',''), navigation=0, loadingChat=false, cancelling=false, liveJobId=null;
let submitting=false,storageWarned=false,pollFailures=0;
let messages=[], currentReview=null, toastTimer=null, polling=false;
let goldSets=new Map(), liveTraceCount=0;
const LEGACY_CHAT='legacy-browser';
let legacyMessages=[];
const methodGroups=[['Paieškos metodai',['bm25','tfidf','dense','hybrid']],['RAG eigos',['hybrid_rerank','rag_fusion','corrective']],['Kontrolė',['no_rag']]];
const corpusNames={lt:'LT · Lietuvių',en:'EN · Anglų'};
let settings={model:'qwen3.5:4b',embed_model:'bge-m3:latest',top_k:3,context_length:8192,auto_query:true,system_prompt:'',no_rag_prompt:''};
const parameterDefaults={temperature:0,top_p:0.8,sampling_top_k:20,repeat_penalty:1,presence_penalty:0,seed:42,max_output_tokens:2200,history_turns:4,candidate_pool:20,rerank_pool:10,hybrid_bm25_weight:0.5,rrf_k:60,corrective_max_rounds:2,corrective_max_queries:2,fusion_query_count:3,fusion_pool:20,fusion_rrf_k:60};
settings={...parameterDefaults,measure_confidence:true,show_thinking:true,corpus_language:'lt',task_mode:'auto',requirement_prompt:'',...settings};
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
function fillParameters(){for(const key of Object.keys(parameterDefaults))$('param_'+key).value=settings[key];$('measureConfidence').checked=settings.measure_confidence;$('showThinking').checked=settings.show_thinking;}
function readParameters(){const result={};for(const key of Object.keys(parameterDefaults))result[key]=Number($('param_'+key).value);result.measure_confidence=$('measureConfidence').checked;result.show_thinking=$('showThinking').checked;return result;}
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
function articleLabel(id){const [article,part]=id.replace('GDPR:','').split('.');return part?`${article} str. ${part} d.`:`${article} str.`;}
function methodName(id){return config?.methods.find(m=>m.id===id)?.name||id;}
function saveState(){
 try{localStorage.setItem('bdar-chat-v2',JSON.stringify({method,settings,conversationId:messages.length?conversationId:null,goldSets:[...goldSets].slice(-120)}));}
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

function updateControls(){
 const belongs=activeJob?.conversation_id===conversationId;
 const locked=submitting||loadingChat;
 for(const id of ['newChat','mobileNewChat','chatHistoryLaunch'])$(id).disabled=submitting;
 const archive=conversationId===LEGACY_CHAT;
 $('question').disabled=Boolean(locked||belongs||archive);
 $('nfrExamplesLaunch').disabled=Boolean(locked||belongs||archive);
 for(const id of ['sendButton','compareLaunch','mobileCompare'])if($(id))$(id).disabled=Boolean(locked||activeJob||archive);
 document.querySelectorAll('.example-btn').forEach(b=>b.disabled=Boolean(locked||belongs));
 show('jobStatus',Boolean(activeJob||submitting));
 show('jobOrigin',Boolean(activeJob&&!belongs));
 show('cancelJob',Boolean(activeJob));
 $('cancelJob').disabled=cancelling||Boolean(activeJob?.cancel_requested);
 $('cancelJob').textContent=$('cancelJob').disabled?'Nutraukiama…':'Nutraukti';
 const label=activeJob?.stage||'Užduotis ruošiama…';
 const text=activeJob&&!belongs?'Kitas pokalbis · '+label:label;
 if($('jobStage').textContent!==text)$('jobStage').textContent=text;
 $('jobTime').textContent=activeJob?Math.max(0,Math.round(Date.now()/1000-activeJob.started_at))+' s':'';
 $('jobProgress').style.width=belongs&&activeJob.progress!=null?Math.round(activeJob.progress*100)+'%':'0%';
}

function setMethod(id){method=id;$('activeMethod').textContent=methodName(id);document.querySelectorAll('.method-button').forEach(b=>b.classList.toggle('active',b.dataset.method===id));saveState();}
function buildMethods(){
 $('methodList').replaceChildren();$('compareMethods').replaceChildren();$('settingsMethod').replaceChildren();
 for(const [name,ids] of methodGroups){
  const group=node('div','method-group');group.append(node('div','section-label',name));
  const options=node('optgroup');options.label=name;$('settingsMethod').append(options);
  const comparison=node('fieldset','method-group');comparison.append(node('legend','section-label',name));
  for(const m of config.methods.filter(m=>ids.includes(m.id))){
  const option=node('option','',m.name);option.value=m.id;options.append(option);
  const b=node('button','method-button');b.type='button';b.dataset.method=m.id;b.title=m.description;
  b.append(node('span','method-icon',icons[m.id]),node('span','',m.name));b.addEventListener('click',()=>setMethod(m.id));group.append(b);
  const label=node('label','checkbox-row');const input=node('input');input.type='checkbox';input.name='compareMethod';input.value=m.id;input.checked=['no_rag','bm25','dense','hybrid','rag_fusion'].includes(m.id);
  const span=node('span');span.append(node('strong','',m.name),node('small','',m.description));label.append(input,span);comparison.append(label);
  }
  $('methodList').append(group);$('compareMethods').append(comparison);
 }
 setMethod(method);
}
function renderExamples(){
 $('examples').replaceChildren();for(const example of [...(config.requirement_examples||[]).slice(0,2),...(config.examples||[]).slice(0,2)]){const b=node('button','example-btn',example);b.type='button';b.addEventListener('click',()=>{$('question').value=example;$('question').focus();});$('examples').append(b);}
}
function openNfrExamples(){
 const list=$('nfrExamplesList');list.replaceChildren();
 for(const template of config.nfr_examples?.templates||[]){
  const row=node('li'),button=node('button','chat-history-row');button.type='button';
  button.append(node('strong','',template.id+' · '+template.title),node('small','',template.gold?'Su paruoštu etalonu':'Be etalono'));
  button.addEventListener('click',()=>{
   if($('question').disabled)return;
   $('question').value=template.prompt;$('nfrExamplesDialog').close();$('question').focus();
  });
  row.append(button);list.append(row);
 }
 $('nfrExamplesDialog').showModal();
}
function fillModelSelect(id,values,current){
 const select=$(id);select.replaceChildren();for(const value of values){const option=node('option','',value);option.value=value;select.append(option);}
 if(!values.length){const option=node('option','','Modelio nėra');option.value='';select.append(option);}
 select.value=values.includes(current)?current:(values[0]||'');
}
function updateCorpusUI(){
 const corpora=config.corpora||{en:config.corpus};
 if(!corpora[settings.corpus_language])settings.corpus_language='en';
 for(const id of ['corpusLanguage','settingsCorpus']){
  const select=$(id);select.replaceChildren();
  for(const lang of ['lt','en'].filter(key=>corpora[key])){const option=node('option','',corpusNames[lang]);option.value=lang;select.append(option);}
  select.value=settings.corpus_language;
 }
 const corpus=corpora[settings.corpus_language];
 $('activeCorpus').textContent=settings.corpus_language.toUpperCase();
 $('corpusCount').textContent=`${corpus.articles} straipsniai · ${corpus.chunks} fragmentai`;
}
function applyConfigUI(){
 const o=config.ollama;$('connection').className='connection '+(o.connected?'connected':'failed');
 $('connection').replaceChildren(node('i'),document.createTextNode(o.connected?'„Ollama“ prijungta':'„Ollama“ nepasiekiama'));
 if(o.models.length&&!o.models.includes(settings.model))settings.model=o.models[0];
 if(o.embed_models.length&&!o.embed_models.includes(settings.embed_model))settings.embed_model=o.embed_models[0];
 for(const id of ['modelSelect','sidebarModel'])fillModelSelect(id,o.models,settings.model);
 for(const id of ['embedSelect','sidebarEmbed'])fillModelSelect(id,o.embed_models,settings.embed_model);
 updateCorpusUI();
 if(!o.connected)error('Paleiskite „Ollama“ programą ir paspauskite „Modelis ir promptai“ → „Atnaujinti modelių sąrašą“.');
 else if(!o.models.length)error('Nėra vietinio atsakymų modelio. Atsisiųskite jį per „Ollama“.');
 else error('');
}
function updateEmpty(){show('welcome',messages.length===0);$('exportButton').disabled=!messages.some(m=>m.type==='assistant');}
function scrollBottom(){requestAnimationFrame(()=>$('chatScroll').scrollTo({top:$('chatScroll').scrollHeight,behavior:'smooth'}));}
function addUser(id,question){
 if(messages.some(m=>m.id===id))return;
 const m={type:'user',id,question};messages.push(m);renderMessage(m);updateEmpty();renderComparison();scrollBottom();saveState();
}
function addResult(record){const existing=messages.find(m=>m.type==='assistant'&&m.id===record.id);if(existing){if(record.human_review&&!existing.record.human_review){existing.record=record;renderAll();}return;}messages.push({type:'assistant',id:record.id,record});renderMessage(messages.at(-1));updateEmpty();renderComparison();setSources(record);scrollBottom();saveState();}

function goldKey(record,criterion){return JSON.stringify([record.question,criterion||'']);}
function nfrTemplate(record){
 return (config.nfr_examples?.templates||[]).find(template=>template.prompt===record.question);
}
function expectedFragments(record,criterion){
 const gold=nfrTemplate(record)?.gold;
 if(!gold)return goldSets.get(goldKey(record,criterion))||[];
 const references=criterion?gold[criterion]||[]:Object.values(gold).flat();
 return [...new Set(references.map(reference=>reference.id))];
}
function metricsFor(trace,gold){
 if(!trace||!gold?.length)return null;
 const expected=new Set(gold), found=new Set(trace.ranked.slice(0,trace.top_k).map(row=>row.id));
 const tp=[...found].filter(id=>expected.has(id)).length,fp=found.size-tp,fn=expected.size-tp;
 return {tp,fp,fn,precision:tp/Math.max(1,found.size),recall:tp/expected.size,f1:2*tp/(2*tp+fn+fp),f2:5*tp/(5*tp+4*fn+fp)};
}
const percent=value=>new Intl.NumberFormat('lt-LT',{style:'percent',maximumFractionDigits:1}).format(value);
const metricFields=[['precision','Precision'],['recall','Recall'],['f1','F1'],['f2','F2']];
function benchmarkView(template){
 const details=node('details','benchmark-details');
 details.append(node('summary','','Etaloninės nuostatos ir pagrindimas'));
 const items=node('ul');
 for(const [criterion,references] of Object.entries(template.gold)){
  const line=node('li');line.append(node('strong','',criterion));
  for(const reference of references){
   const article=reference.id.replace('GDPR:','').split('.')[0];
   const pointLabel=reference.points.length?' '+reference.points.join(', ')+' p.':'';
   const link=node('a','',articleLabel(reference.id)+pointLabel);
   link.href=config.nfr_examples.source+'#art_'+article;link.target='_blank';link.rel='noopener noreferrer';
   const item=node('p');item.append(link,document.createTextNode(' · '+reference.why));line.append(item);
  }
  items.append(line);
 }
 details.append(items);
 return details;
}
function answerMetricsView(record){
 const template=nfrTemplate(record);
 if(!record.retrieval&&!template)return null;
 const panel=node('section','answer-metrics gold-watch');
 const render=()=>{
  panel.hidden=false;
  panel.replaceChildren(node('h3','answer-heading','Paieškos metrikos'));
  if(record.method==='no_rag'){panel.append(node('p','source-meta','„Be RAG“ variante paieškos metrikos netaikomos.'));return;}
  if(!record.retrieval){panel.append(node('p','source-meta','Šio bandymo paieškos reitingas neišsaugotas.'));return;}
  const rows=[[record.task_mode==='requirement'?'Visas reikalavimas':'Bendra paieška',record.retrieval,null],
   ...(record.criterion_searches||[]).map(criterion=>[criterion.id,criterion.retrieval,criterion.id])];
  const scoredRows=rows.map(([label,trace,id])=>[label,metricsFor(trace,expectedFragments(record,id))]);
  if(!scoredRows.some(([,scores])=>scores)){
   if(!template&&!record.criterion_searches?.length){panel.hidden=true;return;}
   panel.append(node('p','source-meta','Etalonas neįvestas. Metrikos bus parodytos įvedus etaloninius fragmentus skiltyje „RAG paieškos rezultatas“.'));
   return;
  }
  const title=template?.gold?template.id+' · Paruoštas demonstracinis etalonas':'Jūsų įvestas etalonas';
  panel.append(node('p','section-meta',title+' · Pirmos '+record.retrieval.top_k+' reitingo vietos'));
  const table=node('table'),head=node('thead'),header=node('tr');
  for(const name of ['Apimtis',...metricFields.map(([,label])=>label),'TP / FP / FN']){
   const cell=node('th','',name);cell.scope='col';header.append(cell);
  }
  head.append(header);table.append(head);
  const body=node('tbody');
  for(const [label,scores] of scoredRows){
   const row=node('tr'),scope=node('th','',label);scope.scope='row';row.append(scope);
   if(scores){
    for(const [metric] of metricFields)row.append(node('td','',percent(scores[metric])));
    row.append(node('td','',scores.tp+' / '+scores.fp+' / '+scores.fn));
   }else{
    const missing=node('td','','Etalonas neįvestas');missing.colSpan=5;row.append(missing);
   }
   body.append(row);
  }
  table.append(body);const wrap=node('div','table-wrap');wrap.append(table);panel.append(wrap);
  panel.append(node('p','source-meta','Vertinami paieškos fragmentų ID. Viename fragmente gali būti keli straipsnio punktai. TP – rastas etaloninis fragmentas, FP – rastas fragmentas už etalono ribų, FN – nerastas etaloninis fragmentas.'));
  if(template?.gold)panel.append(benchmarkView(template));
 };
 panel.addEventListener('goldchange',render);render();return panel;
}
function metricsView(record,trace,criterion){
 if(nfrTemplate(record)?.gold)return null;
 const key=goldKey(record,criterion?.id);
 const box=node('details','retrieval-metrics');box.open=goldSets.has(key);
 box.append(node('summary','',criterion?'Paieškos metrikos · '+criterion.id:'Paieškos metrikos · Precision, Recall, F1, F2'));
 box.append(node('p','source-meta','Įrašykite visus žmogaus patvirtintus aktualius fragmentų ID, pvz., 32.1, 12.3. Etalonas bendras tai pačiai įvesčiai ir kriterijui. Skaičiuojama iš pirmų '+trace.top_k+' reitingo vietų prieš papildomą straipsnių įtraukimą.'));
 const line=node('div','gold-input');const input=node('input');input.type='text';input.placeholder='Pvz., 32.1, 12.3';input.maxLength=500;input.setAttribute('aria-label',criterion?'Etaloniniai fragmentai · '+criterion.id:'Etaloniniai fragmentai · bendra paieška');
 const save=node('button','small-btn','Taikyti');save.type='button';line.append(input,save);
 const scores=node('p','metric-values'),errorText=node('p','validation-error');errorText.setAttribute('role','alert');
 const refresh=()=>{
  const gold=goldSets.get(key)||[];
  if(document.activeElement!==input)input.value=gold.map(id=>id.replace('GDPR:','')).join(', ');
  const result=metricsFor(trace,gold);
  scores.textContent=result?'Precision '+percent(result.precision)+' · Recall '+percent(result.recall)+' · F1 '+percent(result.f1)+' · F2 '+percent(result.f2)+' | TP '+result.tp+' · FP '+result.fp+' · FN '+result.fn:'Metrikos atsiras įvedus etaloną.';
 };
 const apply=()=>{
  const known=new Set(config.source_ids||[]);
  const gold=[...new Set(input.value.toUpperCase().split(/[\s,;]+/).filter(Boolean).map(value=>value.startsWith('GDPR:')?value:'GDPR:'+value))];
  const invalid=gold.filter(id=>!known.has(id));
  if(invalid.length){errorText.textContent='Korpuse nerasta: '+invalid.join(', ');return;}
  errorText.textContent='';if(gold.length)goldSets.set(key,gold);else goldSets.delete(key);
  document.querySelectorAll('.gold-watch').forEach(panel=>panel.dispatchEvent(new Event('goldchange')));saveState();renderComparison();
 };
 save.addEventListener('click',apply);input.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();apply();}});
 box.addEventListener('goldchange',refresh);
 box.classList.add('gold-watch');box.append(line,errorText,scores);refresh();return box;
}
function sourceButton(record,id,quote,criterion,className='citation-btn',label=articleLabel(id)){
 const button=node('button',className,label);button.type='button';
 button.addEventListener('click',()=>{if(innerWidth<=1050)openSources(true);setSources(record,id,quote,criterion);});
 return button;
}
function rankingView(record,trace,criterion){
 const body=node('div','ranking');
 if(!trace){body.append(node('p','source-meta','Šio ankstesnio bandymo reitingas neišsaugotas.'));return body;}
 const queries=node('ul','rank-queries');
 for(const query of trace.queries)queries.append(node('li','',query));
 body.append(node('strong','','Paieškos užklausos'),queries,node('p','source-meta','Balas · '+trace.score_kind+' | top-k '+trace.top_k));
 const listing=(rows,offset)=>{
  const list=node('ol','rank-list');list.start=offset+1;
  for(const [i,row] of rows.entries()){
   const sent=trace.context_ids.includes(row.id);
   const entry=node('li','rank-row');
   entry.append(node('span','rank-index',String(i+offset+1)),
    sent?sourceButton(record,row.id,null,criterion,'rank-source'):node('span','',articleLabel(row.id)),
    node('code','',row.score.toFixed(5)),
    node('span',sent?'rank-state sent':'rank-state',trace.explicit_ids.includes(row.id)&&sent?'Paprašytas straipsnis':sent?'Pateikta modeliui':'Kandidatas'));
   list.append(entry);
  }
  return list;
 };
 if(trace.ranked.length)body.append(listing(trace.ranked.slice(0,trace.top_k),0));
 else body.append(node('p','source-meta','Reitingas tuščias.'));
 if(trace.ranked.length>trace.top_k){
  const rest=node('details','rank-extra');rest.append(node('summary','', 'Kiti kandidatai'),listing(trace.ranked.slice(trace.top_k),trace.top_k));body.append(rest);
 }
 const rankedIds=new Set(trace.ranked.slice(0,trace.top_k).map(row=>row.id));
 const extra=trace.context_ids.filter(id=>!rankedIds.has(id));
 if(extra.length){const line=node('div','rank-inserted');line.append(node('span','','Papildomai pateikta modeliui'),...extra.map(id=>sourceButton(record,id,null,criterion,'rank-source')));body.append(line);}
 return body;
}
function retrievalView(record,live=false){
 const box=node('details','retrieval-panel');box.open=true;
 const search=record.retrieval;
 const heading=live?record.method_name+' · RAG paieškos rezultatas':'RAG paieškos rezultatas';
 box.append(node('summary','',heading),node('p','section-meta',record.method==='no_rag'?'Kontrolinis variantas. Modeliui BDAR fragmentai nepateikiami.':(record.corpus_language||'en').toUpperCase()+' · '+record.context.length+' fragmentai bendram atsakymui'));
 if(record.method==='no_rag')return box;
 if(record.query_rewrite?.status==='fallback')box.append(node('p','source-meta','Užklausos pritaikymas nepavyko. Paieškai panaudota pirminė įvestis.'));
 box.append(rankingView(record,search,null));
 if(search&&!live){const metrics=metricsView(record,search,null);if(metrics)box.append(metrics);}
 for(const criterion of record.criterion_searches||[]){
  const c=node('details','criterion-search');c.append(node('summary','',criterion.id+' · '+criterion.text),node('p','source-meta','Šio kriterijaus paieškos metodas · '+methodName(criterion.method)),rankingView(record,criterion.retrieval,criterion));
  if(!live){const metrics=metricsView(record,criterion.retrieval,criterion);if(metrics)c.append(metrics);}box.append(c);
 }
 const correction=correctiveView(record);if(correction)box.append(correction);
 const fusion=fusionView(record);if(fusion)box.append(fusion);
 return box;
}
function citationView(record,citation,check,criterion){
 const box=node('div','citation-item');
 const source=(criterion?.context||record.context).find(item=>item.id===citation.id);
 const quote=normalizeQuote(citation.quote), matched=source&&(check?.exact_quote??(quote.length>=12&&normalizeQuote(source.text).includes(quote)));
 const label=!source?'Šaltinis nepateiktas modeliui':matched?'Rasta pažodžiui · rodyti šaltinyje':'Citatos tekstas nerastas · rodyti šaltinį';
 const points=matched?citedPoints(source.text,quote):[];
 const location=articleLabel(citation.id)+(points.length?' '+points.join(', ')+' p.':'');
 const button=sourceButton(record,citation.id,matched?citation.quote:null,criterion,'citation-btn'+(matched?'':' mismatch'),location+' · '+label);
 button.disabled=!source;box.append(button,node('blockquote',matched?'citation-exact':'citation-unmatched',citation.quote||'Citatos tekstas tuščias.'));
 return box;
}
function citedPoints(text,quote){
 const lines=text.split('\n').map(normalizeQuote).filter(Boolean);
 const start=lines.join(' ').indexOf(quote),end=start+quote.length;
 if(start<0)return [];
 let offset=0;const points=new Set();
 for(const line of lines){
  const next=offset+line.length;
  const point=line.match(/^(?:\(([a-z])\)|([a-z])\))\s/i);
  if(point&&next>start&&offset<end)points.add(point[1]||point[2]);
  offset=next+1;
  if(offset>=end)break;
 }
 return [...points];
}
function criterionResultsView(record){
 if(!record.criterion_results?.length)return null;
 const box=node('section','criteria-panel');box.append(node('h3','answer-heading','Modelio atsakymai pagal kriterijus'));
 const labels={supported:'Pagrįsta',partial:'Iš dalies pagrįsta',contradicted:'Prieštarauja šaltiniui',insufficient:'Šaltinių nepakanka',unverified:'Reikia patikrinti citatą'};
 for(const result of record.criterion_results){
  const search=record.criterion_searches.find(item=>item.id===result.id);
  const row=node('div','criterion-result');const header=node('div','criterion-title');
  header.append(node('strong','',result.id+' · '+result.text),node('span','criterion-verdict '+result.status,labels[result.status]||result.status));
  row.append(header,node('p','',result.reason));
  if(result.review_note)row.append(node('p','source-meta',result.review_note));
  for(const [i,citation] of (result.citations||[]).entries())row.append(citationView(record,citation,result.audit?.details?.[i],search));
  if(!result.citations?.length)row.append(node('p','source-meta','Modelis šiam kriterijui nepateikė citatos.'));
  box.append(row);
 }
 return box;
}
const thinkingLabels={waiting:'Laukiama pirmos mąstymo išvesties.',streaming:'Gaunama iš „Ollama“…',finished:'„Ollama“ perduota generavimo išvestis.',unavailable:'Pasirinktas modelis nepalaiko atskiro mąstymo srauto.',retrying:'Struktūrinis atsakymas generuojamas dar kartą.',no_output:'Modelis šiam kvietimui neperdavė mąstymo teksto.'};
function thinkingView(record){
 if(!record.thinking_status||record.thinking_status==='disabled')return null;
 const box=node('details','thinking-panel');
 const repaired=record.generation?.repair_attempts?.length;
 box.append(node('summary','','Modelio mąstymo išvestis'),node('p','source-meta',repaired&&record.thinking?'Išvestis iš pirmojo kvietimo. Pateiktas atsakymas vėliau pakartotas pagal struktūros arba citatų patikrą.':thinkingLabels[record.thinking_status]||''));
 if(record.thinking)box.append(node('pre','',record.thinking));return box;
}
function updateLive(job){
 const retrievals=job.retrievals||[];
 for(const record of retrievals.slice(liveTraceCount))$('liveRetrievals').append(retrievalView({...record,id:'live-'+record.method},true));
 liveTraceCount=retrievals.length;
 const showThinking=job.thinking_status&&job.thinking_status!=='disabled';
 show('liveRun',Boolean(liveTraceCount||showThinking));show('liveThinking',showThinking);
 $('liveThinkingStatus').textContent=thinkingLabels[job.thinking_status]||'';
 if($('liveThinkingText').textContent!==(job.thinking||'')){
  $('liveThinkingText').textContent=job.thinking||'';
  const pre=$('liveThinkingText');pre.scrollTop=pre.scrollHeight;
 }
}

function renderMessage(m){
 const article=node('article','message '+m.type);article.dataset.id=m.id;
 const meta=node('div','message-meta');meta.append(node('span','avatar',m.type==='user'?'J':'B'),node('strong','',m.type==='user'?'Jūsų įvestis':m.record.method_name));
 if(m.type==='assistant')meta.append(node('span','message-model',m.record.model),node('span','message-model',m.record.method==='no_rag'?'Be BDAR korpuso':(m.record.corpus_language||'en').toUpperCase()));article.append(meta);
 const r=m.record;const repeated=m.type==='assistant'&&(r.quality_flags?.includes('answer_repeated_question')||r.answer.answer.trim().toLowerCase()===r.question.trim().toLowerCase());
 if(m.type==='assistant')article.append(retrievalView(r),node('h3','answer-heading','AI atsakymas'));
 article.append(node('div','message-body',m.type==='user'?m.question:repeated?'Modelis pakartojo įvestį ir nepateikė tinkamo atsakymo.':r.answer.answer));
 if(m.type==='user'){
  const notice=node('p','turn-notice');notice.hidden=true;article.append(notice);
  updateTurnNotice(notice,m);
 }
 if(m.type==='assistant'){
  const good=(r.audit?.details||[]).filter(d=>d.known_id&&d.exact_quote).length,total=r.audit?.citation_count||0;
  if(r.provenance_unavailable)article.append(node('p','quality-note','Pilnas šio įrašo žurnalas nepasiekiamas. Rodoma naršyklėje likusi kopija.'));
  if(r.generation?.repair_attempts?.length)article.append(node('p','source-meta','Modelis vieną kartą tikslino atsakymą pagal struktūrinę patikrą. Pirminis variantas ir pataisymo nurodymas išsaugoti eksporte.'));
  const stats=node('div','stat-grid');
  for(const [label,value,note] of [['Modelio pasitikėjimas',r.confidence?.status==='ok'?r.confidence.percent+' %':'—','Savęs vertinimas, nekalibruotas'],['Pažodžiui rastos citatos',r.method==='no_rag'?'Netaikoma':total?good+' / '+total:'Nėra citatų','Sutapusios iš visų bendro atsakymo citatų'],['Žmogaus teisingumo balas',r.human_review?r.human_review.correctness_0_2+' / 2':'Neįvertinta',r.human_review?'Vertintojas: '+r.human_review.reviewer:'Teisingumą patvirtina peržiūra']]){const tile=node('div','stat-tile');tile.append(node('span','',label),node('strong','',value),node('small','',note));stats.append(tile);}article.append(stats);
  const criteria=criterionResultsView(r);if(criteria)article.append(criteria);
  const metrics=answerMetricsView(r);if(metrics)article.append(metrics);
  const refView=referenceView(r);if(refView)article.append(refView);
  const flagLabels={corrective_incomplete_evidence:'Korekcinė patikra nustatė likusių įrodymų spragų. Atsakymas gali apimti tik dalį klausimo.',answer_repeated_question:'Atsakymas pakartojo įvestį.',model_abstained:'Modelis nurodė, kad įrodymų nepakanka visam klausimui. Pateiktas paaiškinimas gali apimti tik jo dalį.',source_absence_claim:'Teiginyje remiamasi tuo, kad šaltinyje nėra nuostatos. Patikrinkite, ar iš to nepadaryta nepagrįsta išvada apie pareigos nebuvimą.',requested_reference_missing:'Bent vienas aiškiai paprašytas straipsnis nepateko į modelio šaltinius. Šio atsakymo nepakanka visai užklausai.',requested_reference_uncited:'Bent vienas paprašytas straipsnis pateiktas modeliui, bet atsakyme nėra jo citatos. Patikrinkite, ar atsakyta į tą klausimo dalį.',no_evidence:'Paieška nepateikė įrodymų.',no_claims:'Nėra patikrinamų teiginių.',uncited_claims:'Dalis teiginių neturi citatų.',no_citations:'Atsakymas nepateikė citatų.',unknown_citation:'Cituojamas šaltinis nebuvo pateiktas modeliui.',unmatched_quote:'Dalis citatų tiksliai nesutampa su šaltiniu.',no_rag_fabricated_citations:'Modelis pateikė citatas, nors „Be RAG“ šaltinių negauna.',inconsistent_verdict:'Modelio išvada prieštarauja jo nurodytam pagrindo pobūdžiui arba susilaikymui.',unsupported_verdict:'Teigiamas vertinimas neturi pateiktų citatų.',basis_statement_conflict:'Santrauka pagrindą vadina tiesioginiu, o analizė – išvestiniu projektavimo sprendimu. Šį neatitikimą reikia peržiūrėti.'};
  if(r.quality_flags?.length){const warning=node('div','quality-note');warning.append(node('strong','','Peržiūros signalai'));for(const flag of r.quality_flags)warning.append(node('p','',flagLabels[flag]||flag));article.append(warning);}
  const analysis=requirementView(r);if(analysis)article.append(analysis);article.append(confidenceView(r));
  const thinking=thinkingView(r);if(thinking)article.append(thinking);
  if(r.answer.limitations?.length){const limitations=node('details','run-parameters');limitations.append(node('summary','',`Modelio nurodyti apribojimai (${r.answer.limitations.length})`));for(const value of r.answer.limitations)limitations.append(node('p','',value));article.append(limitations);}
  const actions=node('div','message-actions');
  const sources=node('button','small-btn',`Šaltiniai (${r.context.length})`);sources.type='button';sources.addEventListener('click',()=>{setSources(r);if(innerWidth<=1050)openSources(true);});actions.append(sources);
  const copy=node('button','small-btn','Kopijuoti');copy.type='button';copy.disabled=repeated;copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(r.answer.answer);toast('Atsakymas nukopijuotas.');}catch{toast('Pažymėkite atsakymą ir nukopijuokite su Ctrl+C.');}});actions.append(copy);
  const review=node('button','small-btn',r.human_review?'Peržiūrėti vertinimą':'Įvertinti');review.type='button';review.addEventListener('click',()=>openReview(r));actions.append(review);
  const seconds=(r.retrieval_ms||0)+(r.generation_ms||0)+(r.confidence_ms||0)+(r.timings?.criterion_generation_ms||0);actions.append(node('span','source-meta',(seconds/1000).toFixed(1)+' s · paieška ir modelio atsakymai'));article.append(actions);
  if(r.answer.claims?.length){const details=node('details','claims');details.open=repeated;details.append(node('summary','',`Bendro atsakymo teiginiai ir citatos (${r.answer.claims.length})`),node('p','source-meta','Patikra ieško pažodinio teksto po tarpų suvienodinimo. Ar ši ištrauka pagrindžia teiginį, įvertinkite perskaitę ją kontekste.'));
   let index=0;
   for(const claim of r.answer.claims){const row=node('div','claim');row.append(node('p','',claim.text));if(!claim.citations?.length)row.append(node('small','source-meta','Šis teiginys neturi šaltinio citatos.'));for(const citation of claim.citations||[])row.append(citationView(r,citation,r.audit?.details?.[index++]));details.append(row);}article.append(details);}
  if(r.task_detection){const intent=node('details','run-parameters');intent.append(node('summary','','Kaip suprasta įvestis'),node('p','',r.task_detection.reason),node('p','',`${r.task_detection.actor} · ${r.task_detection.action} · ${r.task_detection.object}`));article.append(intent);}
  const params=parametersView(r);if(params)article.append(params);
 }
 $('messages').append(article);
}

function updateTurnNotice(notice,turn){
 const labels={cancelled:'Užklausa nutraukta.',interrupted:'Užklausa nutrūko paleidžiant programą iš naujo.',error:'Užklausa nepavyko.'};
 notice.textContent=turn.error||labels[turn.status]||'';
 notice.hidden=!notice.textContent;
}
function renderAll(){ $('messages').replaceChildren();for(const m of messages)renderMessage(m);updateEmpty();renderComparison();}

function highlightedText(container,text,quote){
 if(!quote){container.textContent=text;return;}
 let at=text.indexOf(quote), actual=quote;
 if(at<0){const escaped=quote.trim().split(/\s+/).map(w=>w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('\\s+');try{const match=text.match(new RegExp(escaped));if(match){at=match.index;actual=match[0];}}catch{/* Show source unmodified if it cannot be highlighted. */}}
 if(at<0){container.textContent=text;return;}
 container.append(document.createTextNode(text.slice(0,at)),node('mark','',actual),document.createTextNode(text.slice(at+actual.length)));
}
function setSources(record,selectedId,quote,criterion){
 if(!record.id?.startsWith('live-'))selectedRecord=record;
 const context=criterion?.context||record.context;
 show('sourcesEmpty',false);$('sourceContent').replaceChildren();$('sourceCount').textContent=context.length;
 document.querySelectorAll('.message.assistant').forEach(n=>n.classList.toggle('active-source',n.dataset.id===record.id));
 const lang=record.corpus_language||'en';
 $('sourceContent').append(node('p','source-meta',`${record.method_name} · ${lang.toUpperCase()} · ${context.length} fragmentai`+(criterion?' · '+criterion.id:'')));
 if(quote)$('sourceContent').append(node('p','highlight-legend','Paryškinta pažodinė modelio citata.'));
 if(!context.length)$('sourceContent').append(node('div','no-source-note',record.method==='no_rag'?'Šiam atsakymui modeliui BDAR ištraukų nepateikta.':'Paieška negrąžino BDAR fragmentų.'));
 context.forEach((source,index)=>{
  const card=node('details','source-card'+(source.id===selectedId?' selected':''));card.dataset.source=source.id;card.open=source.id===selectedId||(!selectedId&&index===0);
  const summary=node('summary');const title=node('span');title.append(node('strong','',articleLabel(source.id)),node('span','source-title',source.title));summary.append(node('span','source-number',String(index+1).padStart(2,'0')),title,node('span','', '⌄'));card.append(summary);
  const body=node('div','source-text');highlightedText(body,source.text,source.id===selectedId?quote:null);card.append(body);
  body.lang=lang;
  const links=node('div','source-link');const a=node('a','','Atverti originalų tekstą ↗');a.href=source.url;a.target='_blank';a.rel='noopener noreferrer';links.append(a,node('span','',source.id));card.append(links);$('sourceContent').append(card);
 });
 const queries=criterion?.retrieval.queries||record.retrieval?.queries||record.search_queries||[record.search_query];if(queries.some(Boolean)){const q=node('details','query-details');q.append(node('summary','','Paieškai naudotos užklausos'),node('p','',queries.filter(Boolean).join('\n\n')));$('sourceContent').append(q);}
 if(selectedId){requestAnimationFrame(()=>{const selected=[...$('sourceContent').querySelectorAll('.source-card')].find(c=>c.dataset.source===selectedId);(selected?.querySelector('mark')||selected)?.scrollIntoView({block:'nearest',behavior:'smooth'});});}
}
function history(){
 const turns=[];let turn=null;
 for(const m of messages){if(m.type==='user'){turn={question:m.question,answers:[]};turns.push(turn);}else if(turn)turn.answers.push(m.record);}
 return turns.filter(t=>t.answers.length===1&&!t.answers[0].answer.abstain&&!t.answers[0].quality_flags?.includes('answer_repeated_question')).slice(-4).map(t=>({question:t.question,answer:t.answers[0].answer.answer}));
}

function resetLive(){
 liveTraceCount=0;liveJobId=null;$('liveRetrievals').replaceChildren();$('liveThinkingText').textContent='';
 show('liveRun',false);$('liveThinking').open=true;
}
function displayConversation(id,entries){
 conversationId=id;messages=entries;selectedRecord=null;resetLive();
 $('question').value='';$('sourceContent').replaceChildren();$('sourceCount').textContent='0';
 show('sourcesEmpty');openSources(false);error('');renderAll();
 $('taskModeHelp').textContent=id===LEGACY_CHAT?'Ankstesnio pokalbio archyvas. Naują užklausą galite pateikti įprastame pokalbyje.':'Reikalavimo kriterijus rašykite atskirose eilutėse ir žymėkite K1., K2., K3.';
 const last=messages.filter(m=>m.type==='assistant').at(-1);if(last)setSources(last.record);
 updateControls();scrollBottom();saveState();
}
async function selectConversation(id){
 const request=++navigation;loadingChat=true;updateControls();
 try{
  let entries;
  if(id===LEGACY_CHAT){
   entries=await Promise.all(legacyMessages.map(async m=>{
    if(m.type==='user')return m;
    try{return {...m,record:await api('/api/runs/'+m.id)};}
    catch{return {...m,record:{...m.record,provenance_unavailable:true}};}
   }));
  }else{
   const chat=await api('/api/conversations/'+id);
   const groups=await Promise.all(chat.turns.map(async turn=>{
    const live=turn.status==='running'?await api('/api/jobs/'+turn.id).catch(()=>null):null;
    const results=live?.results||await Promise.all(turn.result_ids.map(runId=>api('/api/runs/'+runId)));
    return [{type:'user',id:turn.id,question:turn.question,status:live?.status||turn.status,error:live?.error||turn.error},
     ...results.map(record=>({type:'assistant',id:record.id,record}))];
   }));
   entries=groups.flat();
  }
  if(request!==navigation)return;
  displayConversation(id,entries);
  $('chatHistoryDialog').close();
 }catch(e){
  if(request!==navigation)return;
  if($('chatHistoryDialog').open)$('chatHistoryStatus').textContent=e.message;
  else if(e.status!==404)error(e.message);
 }finally{
  if(request===navigation){loadingChat=false;updateControls();}
 }
}
async function refreshChatHistory(){
 const status=$('chatHistoryStatus'), list=$('chatHistoryList');
 try{
  const result=await api('/api/conversations');list.replaceChildren();
  const labels={running:'Vykdoma',interrupted:'Nutrūko',cancelled:'Nutraukta',error:'Klaida'};
  const dates=new Intl.DateTimeFormat('lt-LT',{dateStyle:'short',timeStyle:'short'});
  for(const chat of result.conversations){
   const item=node('li'),button=node('button','chat-history-row');
   button.type='button';
   button.setAttribute('aria-current',chat.id===conversationId?'true':'false');
   button.append(node('strong','',chat.title),node('small','',dates.format(new Date(chat.updated_at*1000))+' · Užklausų: '+chat.count));
   if(labels[chat.status])button.append(node('span','chat-status-label',labels[chat.status]));
   button.addEventListener('click',()=>selectConversation(chat.id));item.append(button);list.append(item);
  }
  if(legacyMessages.length){
   const item=node('li'),button=node('button','chat-history-row');button.type='button';
   button.setAttribute('aria-current',conversationId===LEGACY_CHAT?'true':'false');
   button.append(node('strong','','Ankstesnis pokalbis šioje naršyklėje'),node('small','','Naršyklėje išlikusi kopija'));
   button.addEventListener('click',()=>selectConversation(LEGACY_CHAT));item.append(button);list.append(item);
  }
  status.textContent=list.childElementCount?'':'Dar nėra išsaugotų pokalbių.';
 }catch(e){status.textContent='Nepavyko įkelti pokalbių. '+e.message;}
}
async function cancelRunning(id){
 if(!id||cancelling)return;
 cancelling=true;updateControls();
 try{
  await api('/api/cancel',{job_id:id});
  if(activeJob?.id===id)activeJob.cancel_requested=true;
 }catch(e){error(e.message);}
 finally{cancelling=false;updateControls();}
}
async function newConversation(){
 if(submitting)return;
 navigation++;loadingChat=false;
 const running=activeJob;
 displayConversation(crypto.randomUUID().replaceAll('-',''),[]);
 $('question').focus();
 if(running)await cancelRunning(running.id);
 else{
  try{const {job}=await api('/api/jobs/active');if(job)await cancelRunning(job.id);}
  catch(e){error(e.message);}
 }
}
async function submit(methods=[method]){
 if(activeJob||submitting||loadingChat||conversationId===LEGACY_CHAT)return;const question=$('question').value.trim();
 if(!question){error('Pirmiausia įrašykite klausimą arba reikalavimą.');$('question').focus();return;}
 if(!config.ollama.connected||!settings.model){error('Paleiskite „Ollama“ ir pasirinkite vietinį modelį nustatymuose.');return;}
 if(methods.some(m=>['dense','hybrid','hybrid_rerank','corrective','rag_fusion'].includes(m))&&!settings.embed_model){error('Pasirinkite semantinės paieškos modelį.');return;}
 error('');submitting=true;const prior=history();updateControls();resetLive();
 try{
  const response=await api('/api/chat',{question,methods,...settings,history:prior,conversation_id:conversationId});
  activeJob={id:response.job_id,conversation_id:conversationId,started_at:Date.now()/1000};
  addUser(response.job_id,question);$('question').value='';
 }catch(e){error(e.message);}
 finally{submitting=false;updateControls();}
}

async function pollJob(){
 if(polling||submitting)return;polling=true;const previous=activeJob;
 try{
  const {job}=await api('/api/jobs/active');
  const watched=previous||job;
  const full=watched?.conversation_id===conversationId?await api('/api/jobs/'+watched.id):null;
  if(submitting||activeJob?.id!==previous?.id)return;
  const recovered=pollFailures>0;pollFailures=0;if(recovered)error('');
  activeJob=job;
  if(full&&full.conversation_id===conversationId){
   addUser(full.id,full.question);
   for(const record of full.results)addResult(record);
   const terminal=['done','error','cancelled'].includes(full.status);
   if(terminal){
    resetLive();
    const turn=messages.find(m=>m.id===full.id);
    Object.assign(turn,{status:full.status,error:full.error});
    const notice=[...$('messages').querySelectorAll('.message.user')].find(n=>n.dataset.id===full.id)?.querySelector('.turn-notice');
    if(notice)updateTurnNotice(notice,turn);
    if(full.error&&!$('question').value)$('question').value=full.question;
   }else{
    if(liveJobId!==full.id){resetLive();liveJobId=full.id;}
    updateLive(full);
    if(job?.id===full.id)activeJob=full;
   }
  }
  if(previous?.id!==activeJob?.id&&$('chatHistoryDialog').open)refreshChatHistory();
  updateControls();
 }catch(e){
  if(e.status===403){const current=await api('/api/config').catch(()=>null);if(current){token=current.token;}}
  if(e.status===404&&activeJob?.id===previous?.id){
   activeJob=null;resetLive();updateControls();
   if(previous?.conversation_id===conversationId)await selectConversation(conversationId);
  }else{pollFailures++;error('Ryšys su programa nutrūko. Bandome prisijungti iš naujo.');}
 }finally{polling=false;}
}

function openSettings(){
 fillParameters();
 $('settingsMethod').value=method;$('settingsCorpus').value=settings.corpus_language;
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
 try{await hydrateRecords();const retrieval_metrics={};
  for(const {record:r} of messages.filter(m=>m.type==='assistant'&&m.record.retrieval)){
   const template=nfrTemplate(r);
   retrieval_metrics[r.id]={overall:metricsFor(r.retrieval,expectedFragments(r)),
    criteria:Object.fromEntries((r.criterion_searches||[]).map(c=>[c.id,metricsFor(c.retrieval,expectedFragments(r,c.id))])),
    template_id:template?.id??null,
    benchmark:template?.gold?{version:config.nfr_examples.version,source:config.nfr_examples.source,criteria:template.gold}:null};
  }
  const value={application:'BDAR RAG laboratorija',schema_version:9,exported_utc:new Date().toISOString(),settings,corpora:config.corpora,gold_sets:[...goldSets],retrieval_metrics,messages};
  const blob=new Blob([JSON.stringify(value,null,2)],{type:'application/json;charset=utf-8'});const url=URL.createObjectURL(blob);const a=node('a');a.href=url;a.download='BDAR_pokalbis_'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast(messages.some(m=>m.record?.provenance_unavailable)?'Eksportuota. Dalis ankstesnių įrašų turi tik naršyklės kopiją; tai pažymėta JSON.':'Eksportuoti atsakymai, šaltiniai, parametrai ir vertinimai.');}
 catch(e){error('Eksportuoti nepavyko: '+e.message);}finally{updateEmpty();}
}

function mobileSettingsShortcut(){const wrap=node('div','mobile-tools');const button=node('button','small-btn mobile-settings','Nustatymai');button.id='mobileSettings';button.addEventListener('click',openSettings);const compare=node('button','small-btn mobile-settings','Palyginti');compare.id='mobileCompare';compare.addEventListener('click',()=>$('compareLaunch').click());wrap.append(button,compare);$('chatTitle').parentElement.append(wrap);}
function bind(){
 for(const [id,key] of [['corpusLanguage','corpus_language'],['sidebarModel','model'],['sidebarEmbed','embed_model']]){
  $(id).addEventListener('change',()=>{settings[key]=$(id).value;updateCorpusUI();saveState();});
 }
 $('chatForm').addEventListener('submit',e=>{e.preventDefault();submit();});
 $('question').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();submit();}});
 $('newChat').addEventListener('click',newConversation);
 $('nfrExamplesLaunch').addEventListener('click',openNfrExamples);
 $('chatHistoryLaunch').addEventListener('click',()=>{
  $('chatHistoryStatus').textContent='Įkeliami pokalbiai…';$('chatHistoryList').replaceChildren();
  $('chatHistoryDialog').showModal();refreshChatHistory();
 });
 $('mobileNewChat').addEventListener('click',()=>$('newChat').click());$('exportButton').addEventListener('click',exportChat);$('settingsLaunch').addEventListener('click',openSettings);
 $('settingsForm').addEventListener('submit',e=>{e.preventDefault();const values=readParameters();const top=Number($('topK').value),selected=$('settingsMethod').value;$('settingsError').textContent='';if((['hybrid','hybrid_rerank','corrective'].includes(selected)&&values.candidate_pool<top)||(selected==='hybrid_rerank'&&values.rerank_pool<top)||(selected==='rag_fusion'&&values.fusion_pool<top)){$('settingsError').textContent='Kandidatų turi būti ne mažiau nei galutinių fragmentų.';return;}settings={...settings,...readParameters(),requirement_prompt:$('requirementPrompt').value,model:$('modelSelect').value,corpus_language:$('settingsCorpus').value,embed_model:$('embedSelect').value,top_k:Number($('topK').value),context_length:Number($('contextLength').value),auto_query:$('autoQuery').checked,system_prompt:$('systemPrompt').value,no_rag_prompt:$('noRagPrompt').value};setMethod($('settingsMethod').value);applyConfigUI();saveState();$('settingsDialog').close();toast('Nustatymai išsaugoti. Jie bus taikomi kitam klausimui.');});
 $('resetParameters').addEventListener('click',()=>{for(const [key,value] of Object.entries(parameterDefaults))$('param_'+key).value=value;$('measureConfidence').checked=true;$('showThinking').checked=true;$('topK').value=3;$('contextLength').value=8192;$('autoQuery').checked=true;});
 $('resetPrompts').addEventListener('click',()=>{$('systemPrompt').value=config.default_prompts.rag_system;$('noRagPrompt').value=config.default_prompts.no_rag_system;$('requirementPrompt').value=config.requirement_prompt;});
 for(const tab of ['ragPromptTab','noRagPromptTab','requirementPromptTab'])$(tab).addEventListener('click',()=>selectPromptTab(tab));
 $('refreshModels').addEventListener('click',async()=>{const b=$('refreshModels');b.disabled=true;try{config=await api('/api/config');token=config.token;applyConfigUI();toast(config.ollama.connected?'Modelių sąrašas atnaujintas.':'„Ollama“ dar nepasiekiama.');}catch(e){error(e.message);}finally{b.disabled=false;}});
 $('compareLaunch').addEventListener('click',()=>{$('compareError').textContent='';$('compareDialog').showModal();});
 $('compareForm').addEventListener('submit',e=>{e.preventDefault();const methods=[...document.querySelectorAll('input[name=compareMethod]:checked')].map(i=>i.value);if(!methods.length){$('compareError').textContent='Pasirinkite bent vieną metodą.';return;}if(!$('question').value.trim()){$('compareError').textContent='Pirmiausia įrašykite klausimą pokalbio laukelyje.';return;}$('compareDialog').close();submit(methods);});
 $('reviewForm').addEventListener('submit',async e=>{e.preventDefault();$('reviewError').textContent='';const supported=Number($('supportedClaims').value),total=Number($('totalClaims').value);if(supported>total){$('reviewError').textContent='Pagrįstų teiginių negali būti daugiau nei visų.';return;}const b=e.submitter;b.disabled=true;try{const result=await api('/api/reviews',{record_id:$('reviewRecord').value,reviewer:$('reviewer').value,correctness:Number($('correctness').value),completeness:Number($('completeness').value),supported_claims:supported,total_claims:total,notes:$('reviewNotes').value,reviewed_sources:$('reviewedSources').checked});currentReview.human_review=result;saveState();renderAll();if(selectedRecord)setSources(selectedRecord);$('reviewDialog').close();toast('Jūsų vertinimas išsaugotas.');}catch(e){$('reviewError').textContent=e.message;}finally{b.disabled=false;}});
 $('cancelJob').addEventListener('click',()=>cancelRunning(activeJob?.id));
 $('jobOrigin').addEventListener('click',()=>{if(activeJob)selectConversation(activeJob.conversation_id);});
 $('mobileSources').addEventListener('click',()=>openSources(!$('sourcesPanel').classList.contains('open')));$('closeSources').addEventListener('click',()=>openSources(false));$('sourceScrim').addEventListener('click',()=>openSources(false));document.addEventListener('keydown',e=>{if(e.key==='Escape')openSources(false);});window.addEventListener('resize',()=>{if(innerWidth>1050)show('sourceScrim',false);});
 document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>$(b.dataset.close).close()));
 for(const dialog of document.querySelectorAll('dialog'))dialog.addEventListener('click',e=>{if(e.target===dialog){const box=dialog.getBoundingClientRect();if(e.clientX<box.left||e.clientX>box.right||e.clientY<box.top||e.clientY>box.bottom)dialog.close();}});
}

function normalizeQuote(text){return String(text||'').replace(/\s+/g,' ').trim();}
function openSources(yes){$('sourcesPanel').classList.toggle('open',yes);show('sourceScrim',yes&&innerWidth<=1050);$('mobileSources').setAttribute('aria-expanded',String(yes));}
function renderComparison(){
 const panel=$('comparisonSummary'),latest=messages.findLast(m=>m.type==='user')?.question;
 const matching=messages.filter(m=>m.type==='assistant'&&m.record.question===latest).map(m=>m.record);
 const recent=new Map(matching.map(r=>[r.method+'|'+(r.method==='no_rag'?'':r.corpus_language||'en'),r]));
 const records=[...recent.values()];
 panel.replaceChildren();show('comparisonSummary',records.length>1);if(records.length<2)return;
 panel.append(node('h2','','Paieškų palyginimas'),node('p','','Paskutiniai kiekvieno metodo ir kalbos bandymai su ta pačia įvestimi. Sąžiningam palyginimui pasirinkite tuos pačius modelius ir parametrus. Paieškos metrikos remiasi bendru jūsų įvestu etalonu.'));
 const wrap=node('div','table-wrap'),table=node('table'),head=node('thead'),hr=node('tr');for(const label of ['Metodas','BDAR','Precision','Recall','F1','F2','Citatos','Žmogaus balas','Paieška'])hr.append(node('th','',label));head.append(hr);table.append(head);const body=node('tbody');
 for(const r of records){
  const row=node('tr'),cell=node('td'),button=node('button','comparison-link',r.method_name);button.type='button';
  button.addEventListener('click',()=>{const target=[...document.querySelectorAll('.message.assistant')].find(e=>e.dataset.id===r.id);target?.scrollIntoView({block:'start',behavior:'smooth'});setSources(r);});
  cell.append(button);row.append(cell);
  const good=(r.audit?.details||[]).filter(d=>d.known_id&&d.exact_quote).length;
  const metrics=metricsFor(r.retrieval,expectedFragments(r));
  const scores=metricFields.map(([key])=>metrics?percent(metrics[key]):'—');
  for(const value of [r.method==='no_rag'?'—':(r.corpus_language||'en').toUpperCase(),...scores,r.method==='no_rag'?'—':r.audit?.citation_count?good+'/'+r.audit.citation_count:'0',r.human_review?r.human_review.correctness_0_2+'/2':'Neįvertinta',((r.retrieval_ms||0)/1000).toFixed(2)+' s'])row.append(node('td','',value));
  body.append(row);
 }
 table.append(body);wrap.append(table);panel.append(wrap);
 const same=records.some((a,i)=>records.some((b,j)=>j>i&&normalizeQuote(a.answer.answer).toLowerCase()===normalizeQuote(b.answer.answer).toLowerCase()));if(same)panel.append(node('p','','Bent dviejų metodų atsakymų tekstas sutampa. Daugiau citatų savaime nereiškia geresnio atsakymo.'));
 const rag=records.filter(r=>r.context.length);if(rag.length>1){const sets=rag.map(r=>new Set(r.context.map(d=>d.id)));const union=new Set(sets.flatMap(v=>[...v]));const shared=[...sets[0]].filter(id=>sets.every(v=>v.has(id)));panel.append(node('p','',`Visiems RAG variantams bendri punktai: ${shared.length} iš ${union.size} skirtingų. Šaltinių sutapimas nėra atsakymų teisingumo balas.`));}
}
async function hydrateRecords(){
 await Promise.all(messages.filter(m=>m.type==='assistant').map(async m=>{try{m.record=await api('/api/runs/'+m.id);}catch(e){if(!m.record.generation)m.record.provenance_unavailable=true;}}));
}

async function init(){
 bind();
 try{
  config=await api('/api/config');token=config.token;settings={...settings,...config.parameter_defaults};
  let legacySaved,saved;
  try{legacySaved=JSON.parse(localStorage.getItem('bdar-chat-v1')||'null');}catch{}
  try{saved=JSON.parse(localStorage.getItem('bdar-chat-v2')||'null')||legacySaved;}catch{saved=legacySaved;}
  if(Array.isArray(legacySaved?.messages))legacyMessages=legacySaved.messages.filter(m=>m?.id&&(m.type==='user'||m.type==='assistant'&&m.record?.answer));
  if(saved){if(config.methods.some(m=>m.id===saved.method))method=saved.method;if(saved.settings)settings={...settings,...saved.settings};if(Array.isArray(saved.goldSets))goldSets=new Map(saved.goldSets);}
  if(settings.system_prompt===config.legacy_default_prompts?.rag_system)settings.system_prompt=config.default_prompts.rag_system;
  if(settings.no_rag_prompt===config.legacy_default_prompts?.no_rag_system)settings.no_rag_prompt=config.default_prompts.no_rag_system;
  if(settings.system_prompt===config.previous_default_prompts?.rag_system)settings.system_prompt=config.default_prompts.rag_system;
  if(settings.no_rag_prompt===config.previous_default_prompts?.no_rag_system)settings.no_rag_prompt=config.default_prompts.no_rag_system;
  if(!settings.system_prompt)settings.system_prompt=config.default_prompts.rag_system;
  if(!settings.no_rag_prompt)settings.no_rag_prompt=config.default_prompts.no_rag_system;
  settings.task_mode='auto';
  if(!settings.requirement_prompt||settings.requirement_prompt===config.previous_requirement_prompt)settings.requirement_prompt=config.requirement_prompt;
  const preferred=saved?.conversationId||(saved===legacySaved&&legacyMessages.length?LEGACY_CHAT:null);
  buildMethods();updateTaskMode();applyConfigUI();renderAll();mobileSettingsShortcut();updateControls();
  if(preferred)await selectConversation(preferred);
  if(!messages.length&&saved?.activeJob&&saved.pendingQuestion)$('question').value=saved.pendingQuestion;
  pollJob();setInterval(pollJob,1200);
  $('question').focus();
 }catch(e){error('Nepavyko prisijungti prie vietinės programos. Paleiskite „Paleisti BDAR pokalbi.cmd“. '+e.message);}
}
init();
