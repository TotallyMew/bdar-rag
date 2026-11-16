"""Integration checks use test doubles and temporary files, never research results."""
import json
import io
from pathlib import Path
import shutil
import tempfile
import threading
import time
import unittest
from unittest.mock import patch
import urllib.error
import urllib.request
import ui_server as ui

class FakeClient:
    embeds=0
    prompts=[]
    def __init__(self,model,embed_model,cancelled,context_length=8192):
        self.model=model;self.embed_model=embed_model;self.cancelled=cancelled
    def check(self):
        if self.cancelled.is_set():raise ui.Cancelled()
    def metadata(self,required):
        return {'TEST_DOUBLE':True,'models':[{'name':self.model,'digest':'TEST-GENERATOR'},
                                            {'name':self.embed_model,'digest':'TEST-EMBEDDING'}]}
    def embed(self,texts):
        self.check();FakeClient.embeds+=1
        return [[1.0,float(len(t)%11)] for t in texts]
    def generate(self,system,prompt,schema=None):
        self.check();data=json.loads(prompt);FakeClient.prompts.append(data)
        if 'task_mode' in (schema or {}).get('properties',{}):
            value={'task_mode':'requirement' if 'TEST REQUIREMENT' in data['input'] else 'qa','actor':'TEST actor','action':'TEST action','object':'TEST object','reason':'TEST ONLY'}
        elif 'judgment' in (schema or {}).get('properties',{}):
            value={'judgment':'sufficient','reason':'TEST DOUBLE ONLY',
                'useful_source_ids':[d['id'] for d in data['sources'][:1]],'missing_aspects':[],'follow_up_queries_en':[]}
        elif 'queries_en' in (schema or {}).get('properties',{}):
            value={'queries_en':[f'TEST ONLY alternative consent query {i}' for i in range(data['additional_query_count'])]}
        elif 'query_en' in (schema or {}).get('properties',{}):
            value={'query_en':'right to withdraw consent at any time'}
        elif 'confidence_percent' in (schema or {}).get('properties',{}):
            value={'confidence_percent':73,'reason':'TEST DOUBLE ONLY, not a human rating'}
        elif 'candidates' in data:
            value={'scores':[{'id':d['id'],'relevance':1} for d in data['candidates']]}
        else:
            citations=[{'id':d['id'],'quote':d['text'][:100]} for d in data['sources'][:1]]
            value={'answer':'TEST DOUBLE ONLY','abstain':False,'limitations':[],
                   'claims':[{'text':'TEST DOUBLE ONLY','citations':citations}]}
            if 'requirement_analysis' in (schema or {}).get('properties',{}):
                value['requirement_analysis']={'actor':'TEST actor','required_action':'TEST action',
                    'verdict':'insufficient_evidence','support_type':'uncertain','justification':'TEST ONLY',
                    'conditions':[],'refined_requirement':'TEST refined requirement','implementation_status':'not_assessed'}
        return {'parsed':value,'raw':json.dumps(value),'parse_error':None,'elapsed_ms':1}

class LocalEmbeddingTests(unittest.TestCase):
    def setUp(self):
        self.client=ui.LocalClient('generator','nomic-embed-text:latest',threading.Event())

    def test_oversize_input_is_embedded_without_dropping_words_or_changing_order(self):
        prefix='search_document: '
        calls=[]

        def request(endpoint,body):
            self.assertEqual(endpoint,'/api/embed')
            self.assertFalse(body['truncate'])
            self.assertEqual(body['model'],'nomic-embed-text:latest')
            self.assertTrue(all(text.startswith(prefix) for text in body['input']))
            parts=[text.removeprefix(prefix) for text in body['input']]
            calls.append(parts)
            if any(len(text)>11 for text in parts):
                raise ui.core.OllamaHTTPError(endpoint,400,'the input length exceeds the context length')
            return {'embeddings':[[float(len(part)),1.0] for part in parts]}

        with patch.object(self.client,'request',side_effect=request):
            result=self.client.embed([prefix+'next',prefix+'aaaaa bbbb cccc dddddd',prefix+'z'])
        self.assertIn(['aaaaa bbbb','cccc dddddd'],calls)
        self.assertEqual(result[0],[4.0,1.0])
        self.assertEqual(result[2],[1.0,1.0])
        self.assertAlmostEqual(result[1][0],221/21)
        self.assertEqual(result[1][1],1.0)

    def test_other_http_400_retains_the_service_error_without_retrying(self):
        endpoint=self.client.host+'/api/embed'
        error=urllib.error.HTTPError(endpoint,400,'Bad Request',None,io.BytesIO(b'{"error":"model cannot embed"}'))
        with patch.object(urllib.request,'urlopen',side_effect=error) as request:
            with self.assertRaisesRegex(ui.core.OllamaHTTPError,'model cannot embed'):
                self.client.embed(['test'])
        self.assertEqual(request.call_count,1)


class UIIntegrationTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.root=Path(self.tmp.name)
        (self.root/'data').mkdir()
        for name in ['corpus.json','corpus_manifest.json','prompts.json']:
            shutil.copyfile(ui.ROOT/'data'/name,self.root/'data'/name)
        self.engine=ui.Engine(self.root)
        FakeClient.embeds=0;FakeClient.prompts=[]
    def tearDown(self):self.tmp.cleanup()

    def test_chat_history_groups_turns_and_restores_saved_results(self):
        conversation='a'*32
        with patch.object(ui,'LocalClient',FakeClient):
            first=self.engine.start({'question':'Pirmas klausimas','conversation_id':conversation,'methods':['bm25'],'auto_query':False})
            a=self.wait(first['job_id'])
            second=self.engine.start({'question':'Antras klausimas','conversation_id':conversation,'methods':['no_rag'],'auto_query':False})
            b=self.wait(second['job_id'])
        self.assertEqual([a['status'],b['status']],['done','done'])
        restored=ui.Engine(self.root)
        summary=restored.conversation_list()
        self.assertEqual([(item['title'],item['count']) for item in summary],[('Pirmas klausimas',2)])
        turns=restored.conversation(conversation)['turns']
        self.assertEqual([t['question'] for t in turns],['Pirmas klausimas','Antras klausimas'])
        self.assertEqual([t['result_ids'] for t in turns],[[a['results'][0]['id']],[b['results'][0]['id']]])
        self.assertEqual(a['results'][0]['conversation_id'],conversation)

    def test_failed_query_rewrite_falls_back_to_the_original_input(self):
        question='Ar galiu bet kada atšaukti savo sutikimą?'
        failed=ui.ModelOutputError('Pritaikyta užklausa pasiekė žetonų limitą.',{'raw':'truncated'})
        with patch.object(ui,'LocalClient',FakeClient),patch.object(self.engine,'query',side_effect=failed):
            job=self.engine.start({'question':question,'methods':['bm25'],'task_mode':'qa'})['job_id']
            result=self.wait(job)
        self.assertEqual(result['status'],'done',result['error'])
        record=result['results'][0]
        self.assertEqual(record['search_queries'],[question])
        self.assertEqual(record['query_rewrite']['status'],'fallback')
        self.assertEqual(record['query_rewrite']['generation'],{'raw':'truncated'})

    def test_active_job_can_be_discovered_and_cancelled_from_another_chat(self):
        entered=threading.Event()
        release=threading.Event()

        class SlowClient(FakeClient):
            def generate(self,system,prompt,schema=None):
                entered.set()
                release.wait(3)
                self.check()
                return super().generate(system,prompt,schema)

        conversation='a'*32
        with patch.object(ui,'LocalClient',SlowClient):
            pending=self.engine.start({'question':'Vykdoma užklausa','conversation_id':conversation,
                'methods':['no_rag'],'task_mode':'qa','auto_query':False})['job_id']
            try:
                self.assertTrue(entered.wait(2))
                summary=self.engine.active_job()
                self.assertEqual((summary['id'],summary['conversation_id']),(pending,conversation))
                after_restart=ui.Engine(self.root)
                self.assertEqual(after_restart.conversation(conversation)['turns'][0]['status'],'interrupted')
                self.engine.cancel(summary['id'])
                self.assertTrue(self.engine.active_job()['cancel_requested'])
            finally:
                release.set()
            self.assertEqual(self.wait(pending)['status'],'cancelled')
        self.assertIsNone(self.engine.active_job())
        stored=ui.Engine(self.root).conversation(conversation)['turns'][0]
        self.assertEqual((stored['status'],stored['result_ids']),('cancelled',[]))

    def test_legacy_comparison_results_are_recoverable_as_one_chat(self):
        comparison='b'*32
        for n,run_id in enumerate(('c'*32,'d'*32)):
            ui.atomic_json(self.engine.storage/'runs'/(run_id+'.json'),{
                'id':run_id,'question':'Ankstesnė užklausa','comparison_id':comparison,
                'created_utc':f'2026-11-16T14:0{n}:00+00:00'})
        engine=ui.Engine(self.root)
        self.assertEqual(engine.conversation_list()[0]['title'],'Ankstesnė užklausa')
        self.assertEqual(engine.conversation(comparison)['turns'][0]['result_ids'],['c'*32,'d'*32])

    def test_extracts_lithuanian_and_english_article_references(self):
        self.assertEqual(
            ui.extract_article_references(
                'BDAR 17 straipsnio 1 dalis ir Article 22(1), taip pat 23 straipsnis'),
            [(17,1),(22,1),(23,None)])
        self.assertEqual(ui.exact_article_ids(self.engine.docs,[(17,1),(22,1)]),
                         ['GDPR:17.1','GDPR:22.1'])

    def test_exact_references_are_kept_in_context(self):
        ranked=[('GDPR:23.1',1.0),('GDPR:80.2',0.9)]
        context=ui.assemble_context(
            ranked,self.engine.byid,['GDPR:17.1','GDPR:22.1'],3)
        self.assertEqual([doc['id'] for doc in context[:2]],
                         ['GDPR:17.1','GDPR:22.1'])
        self.assertEqual(len(ui.assemble_context(
            ranked,self.engine.byid,['GDPR:17.1','GDPR:22.1'],1)),2)

    def test_shared_article_word_keeps_all_requested_numbers(self):
        cases={
            'Ar pagal BDAR 17 ir 22 straipsnius asmuo gali reikalauti ištrinti duomenis?':[(17,None),(22,None)],
            'Pagal 17, 19 ir 22 straipsnių nuostatas':[(17,None),(19,None),(22,None)],
            'Articles 17 and 22 GDPR':[(17,None),(22,None)],
            '17(1) bei 22(1) str.':[(17,1),(22,1)],
            'Article 17 paragraph 1 and Article 22(1)':[(17,1),(22,1)],
            '7 straipsnio 3 dalis ir 17 straipsnio 1 dalis':[(7,3),(17,1)],
            '17 straipsnį ir 22 straipsnį':[(17,None),(22,None)],
            '17 ir 22 dienas, 100 eurų':[],
        }
        for question,expected in cases.items():
            with self.subTest(question=question):self.assertEqual(ui.extract_article_references(question),expected)

    def test_grouped_references_survive_reranking_and_top_k(self):
        with patch.object(ui,'LocalClient',FakeClient):
            job=self.wait(self.engine.start({'question':'Pagal BDAR 17 ir 22 straipsnius paaiškinkite teises.',
                'methods':['hybrid_rerank'],'auto_query':False,'top_k':1})['job_id'])
        self.assertEqual(job['status'],'done',job['error'])
        record=job['results'][0]
        self.assertEqual(record['exact_source_ids'],['GDPR:17.1','GDPR:17.2','GDPR:17.3',
            'GDPR:22.1','GDPR:22.2','GDPR:22.3','GDPR:22.4'])
        self.assertEqual([d['id'] for d in record['context']],record['exact_source_ids'])
        self.assertEqual([r['article'] for r in record['reference_coverage']],[17,22])

    def test_each_invalid_explicit_reference_is_reported(self):
        with patch.object(ui,'LocalClient',FakeClient):
            job=self.wait(self.engine.start({'question':'Article 17(1) and Article 999(1)',
                'methods':['bm25'],'auto_query':False})['job_id'])
        self.assertEqual(job['status'],'error')
        self.assertIn('999(1)',job['error'])
        self.assertEqual(job['results'],[])

    def test_no_rag_does_not_validate_explicit_references_against_corpus(self):
        with patch.object(ui,'LocalClient',FakeClient):
            job=self.wait(self.engine.start({'question':'Article 999(1)',
                'methods':['no_rag'],'auto_query':False})['job_id'])
        self.assertEqual(job['status'],'done',job['error'])
        self.assertEqual(job['results'][0]['exact_source_ids'],[])

    def test_missing_and_uncited_requested_articles_are_distinct(self):
        d=self.engine.byid['GDPR:22.1']
        answer={'answer':'Ribotas paaiškinimas','abstain':True,'limitations':[],
            'claims':[{'text':'Automatizuotas sprendimas','citations':[{'id':d['id'],'quote':d['text'][:100]}]}]}
        question='Pagal BDAR 17 ir 22 straipsnius'
        _,flags=ui.answer_checks(answer,[d],'qa','hybrid',question)
        self.assertIn('requested_reference_missing',flags)
        context=[self.engine.byid['GDPR:17.1'],d]
        _,flags=ui.answer_checks(answer,context,'qa','hybrid',question)
        self.assertNotIn('requested_reference_missing',flags)
        self.assertIn('requested_reference_uncited',flags)
        record={'method':'hybrid','question':question,'answer':answer,'context':[d],'quality_flags':[]}
        decorated=ui.record_view(record)
        self.assertEqual(decorated['reference_coverage'][0]['status'],'missing')
        self.assertEqual(decorated['reference_coverage'][1]['status'],'cited')
        self.assertNotIn('reference_coverage',record)
        self.assertEqual(decorated['answer'],answer)

    def test_uncited_material_claim_gets_one_recorded_correction_attempt(self):
        class UncitedClient(FakeClient):
            answer_calls=0
            def generate(inner,system,prompt,schema=None):
                result=super(UncitedClient,inner).generate(system,prompt,schema)
                if 'answer' in (schema or {}).get('properties',{}):
                    UncitedClient.answer_calls+=1
                    if UncitedClient.answer_calls==1:
                        result['parsed']['claims'][0]['citations']=[]
                return result
        with patch.object(ui,'LocalClient',UncitedClient):
            job=self.wait(self.engine.start({'question':'consent','methods':['bm25'],
                'task_mode':'qa','auto_query':False,'measure_confidence':False})['job_id'])
        self.assertEqual(job['status'],'done',job['error'])
        record=job['results'][0]
        self.assertEqual(UncitedClient.answer_calls,2)
        attempt=record['generation']['repair_attempts'][0]
        self.assertEqual(attempt['reason'],'citation_coverage')
        self.assertEqual(attempt['generation']['parsed']['claims'][0]['citations'],[])
        self.assertNotIn('uncited_claims',record['quality_flags'])

    def test_unsuccessful_citation_correction_stays_flagged_and_does_not_loop(self):
        class AlwaysUncited(FakeClient):
            answer_calls=0
            def generate(inner,system,prompt,schema=None):
                result=super(AlwaysUncited,inner).generate(system,prompt,schema)
                if 'answer' in (schema or {}).get('properties',{}):
                    AlwaysUncited.answer_calls+=1
                    result['parsed']['claims'][0]['citations']=[]
                return result
        with patch.object(ui,'LocalClient',AlwaysUncited):
            job=self.wait(self.engine.start({'question':'consent','methods':['bm25'],
                'task_mode':'qa','auto_query':False,'measure_confidence':False})['job_id'])
        self.assertEqual(job['status'],'done',job['error'])
        self.assertEqual(AlwaysUncited.answer_calls,2)
        self.assertIn('uncited_claims',job['results'][0]['quality_flags'])

    def test_exact_quote_does_not_hide_source_absence_assertion(self):
        d=self.engine.byid['GDPR:17.1']
        answer={'answer':'Pateiktuose šaltiniuose nėra nurodyta konkreti techninė pareiga.',
            'abstain':False,'limitations':[],
            'claims':[{'text':'BDAR neturi nuostatų dėl konkretaus techninio būdo.',
                'citations':[{'id':d['id'],'quote':d['text'][:100]}]}]}
        audit,flags=ui.answer_checks(answer,[d],'qa','hybrid','Paaiškinkite teisę.')
        self.assertTrue(audit['details'][0]['exact_quote'])
        self.assertIn('source_absence_claim',flags)

    def test_exact_references_reach_generated_context(self):
        with patch.object(ui,'LocalClient',FakeClient):
            job=self.wait(self.engine.start({
                'question':'Kokias teises nustato 17 straipsnio 1 dalis ir 22 straipsnio 1 dalis?',
                'methods':['bm25'],'auto_query':False,'measure_confidence':False,'top_k':1
            })['job_id'])
        self.assertEqual(job['status'],'done',job['error'])
        result=job['results'][0]
        self.assertEqual(result['exact_source_ids'],['GDPR:17.1','GDPR:22.1'])
        self.assertEqual([doc['id'] for doc in result['context'][:2]],
                         ['GDPR:17.1','GDPR:22.1'])

    def test_task_detection_does_not_send_history(self):
        class CaptureClient(FakeClient):
            def generate(inner,system,prompt,schema=None):
                if 'task_mode' in (schema or {}).get('properties',{}):
                    self.assertNotIn('"history"',prompt)
                return super(CaptureClient,inner).generate(system,prompt,schema)
        with patch.object(ui,'LocalClient',CaptureClient):
            job=self.wait(self.engine.start({
                'question':'Kokias teises nustato Article 17(1) ir Article 22(1)?',
                'methods':['bm25'],'history':[{'question':'ištrinti duomenis','answer':'senas atsakymas'}]
            })['job_id'])
        self.assertEqual(job['status'],'done',job['error'])
    def wait(self,job_id):
        for _ in range(100):
            job=self.engine.snapshot(job_id)
            if job['status'] in ('done','error','cancelled'):return job
            time.sleep(.02)
        self.fail('Worker failed to finish')
    def test_all_methods_generate_persist_and_do_not_receive_gold(self):
        with patch.object(ui,'LocalClient',FakeClient):
            job_id=self.engine.start({'question':'Ar galiu atšaukti sutikimą?',
                'methods':list(ui.METHODS),'auto_query':True})['job_id']
            job=self.wait(job_id)
        self.assertEqual(job['status'],'done',job['error'])
        self.assertEqual(len(job['results']),len(ui.METHODS))
        self.assertEqual(len(list((self.root/'ui_data/runs').glob('*.json'))),len(ui.METHODS))
        for data in FakeClient.prompts:
            self.assertFalse({'required_ids','expected_points','human_confirmed'}&set(data))
        for result in job['results']:
            self.assertIsNone(result['human_review'])
            self.assertEqual(result['metadata']['ollama']['TEST_DOUBLE'],True)
    def test_dense_vectors_reused_on_second_question(self):
        with patch.object(ui,'LocalClient',FakeClient):
            one=self.engine.start({'question':'one','methods':['dense']})['job_id'];self.assertEqual(self.wait(one)['status'],'done')
            calls=FakeClient.embeds
            two=self.engine.start({'question':'two','methods':['dense']})['job_id'];self.assertEqual(self.wait(two)['status'],'done')
            self.assertEqual(FakeClient.embeds-calls,1)
    def test_echo_is_retried_once_and_original_preserved(self):
        class EchoClient(FakeClient):
            answer_calls=0
            def generate(inner,system,prompt,schema=None):
                if 'Your previous answer field' in prompt:
                    prompt=prompt.split('\n\nYour previous answer field')[0]
                value=super(EchoClient,inner).generate(system,prompt,schema)
                if 'query_en' not in schema.get('properties',{}):
                    EchoClient.answer_calls+=1
                    if EchoClient.answer_calls==1:
                        value['parsed']['answer']='Test question?'
                        value['raw']=json.dumps(value['parsed'])
                return value
        with patch.object(ui,'LocalClient',EchoClient):
            job=self.wait(self.engine.start({'question':'Test question?','task_mode':'qa','methods':['bm25'],'auto_query':False,'measure_confidence':False})['job_id'])
        self.assertEqual(job['status'],'done',job['error'])
        response=job['results'][0]['generation']
        self.assertEqual(EchoClient.answer_calls,2)
        self.assertEqual(response['repair_attempts'][0]['generation']['parsed']['answer'],'Test question?')
        self.assertEqual(response['parsed']['answer'],'TEST DOUBLE ONLY')
    def test_review_requires_actual_confirmation(self):
        with patch.object(ui,'LocalClient',FakeClient):
            job=self.wait(self.engine.start({'question':'test','methods':['bm25']})['job_id'])
        record=job['results'][0]
        with self.assertRaisesRegex(ValueError,'patvirtinkite'):
            self.engine.review({'record_id':record['id'],'reviewer':'TEST'})
        self.assertFalse((self.root/'ui_data/reviews').exists())
    def test_failed_retry_is_flagged_and_never_loops(self):
        class AlwaysEcho(FakeClient):
            calls=0
            def generate(inner,system,prompt,schema=None):
                AlwaysEcho.calls+=1
                prompt=prompt.split('\n\nYour previous answer field')[0]
                result=super(AlwaysEcho,inner).generate(system,prompt,schema)
                result['parsed']['answer']='Test question?'
                return result
        with patch.object(ui,'LocalClient',AlwaysEcho):
            job=self.wait(self.engine.start({'question':'Test question?','task_mode':'qa','methods':['bm25'],'auto_query':False,'measure_confidence':False})['job_id'])
        self.assertEqual(AlwaysEcho.calls,2)
        self.assertEqual(job['results'][0]['quality_flags'],['answer_repeated_question'])
    def test_cloud_and_unknown_methods_rejected(self):
        with self.assertRaises(ValueError):self.engine.start({'question':'test','methods':['unknown']})
        with self.assertRaises(ValueError):self.engine.start({'question':'test','model':'gemma4:cloud'})
    def test_requirement_mode_has_distinct_schema_and_preserves_sources(self):
        with patch.object(ui,'LocalClient',FakeClient):
            job=self.wait(self.engine.start({'question':'TEST REQUIREMENT','task_mode':'requirement',
                'methods':['bm25','no_rag'],'requirement_prompt':'CUSTOM REQUIREMENT RULE'})['job_id'])
        self.assertEqual(job['status'],'done',job['error'])
        for result in job['results']:
            self.assertEqual(result['task_mode'],'requirement')
            self.assertEqual(result['answer']['requirement_analysis']['implementation_status'],'not_assessed')
            self.assertIn('CUSTOM REQUIREMENT RULE',result['system_prompt'])
            self.assertEqual(result['answer']['requirement_analysis']['required_action'],'TEST action')
        self.assertTrue(job['results'][0]['context'])
        self.assertEqual(job['results'][1]['context'],[])
        with self.assertRaises(ValueError):self.engine.start({'question':'test','task_mode':'invented'})
        with self.assertRaises(ValueError):ui.validate_response({'answer':'test','abstain':False,'limitations':[],'claims':[]},'requirement')
    def test_action_query_retrieval_does_not_lose_request_facilitation(self):
        queries=ui.requirement_queries('Sistema turi leisti pateikti prašymą ištrinti duomenis.','user request to delete personal data GDPR')
        ranking=ui.balanced_query_ranking([self.engine.lexical.bm25(q) for q in queries])
        self.assertIn('GDPR:12.2',[i for i,_ in ranking[:3]])
        self.assertIn('GDPR:17.1',[i for i,_ in ranking[:3]])
        self.assertTrue(all('GDPR:' not in q for q in queries))
    def test_automatic_input_understanding_selects_schema_and_keeps_original(self):
        with patch.object(ui,'LocalClient',FakeClient):
            job=self.wait(self.engine.start({'question':'TEST REQUIREMENT','methods':['bm25']})['job_id'])
        record=job['results'][0]
        self.assertEqual(record['task_mode'],'requirement')
        self.assertIn('requirement_analysis',record['answer'])
        self.assertEqual(record['task_detection']['method'],'automatic_intent_v1')
        self.assertEqual(json.loads(record['task_detection']['generation']['raw'])['action'],'TEST action')
        self.assertEqual(json.loads(record['prompt'])['question'],'TEST REQUIREMENT')
    def test_parameters_apply_to_run_and_zero_history(self):
        with patch.object(ui,'LocalClient',FakeClient):
            job=self.wait(self.engine.start({'question':'test','methods':['no_rag'],
                'temperature':0.3,'seed':123,'max_output_tokens':700,'history_turns':0,
                'history':[{'question':'SECRET HISTORY','answer':'SECRET HISTORY'}]})['job_id'])
        record=job['results'][0]
        self.assertEqual(record['experiment_settings']['seed'],123)
        self.assertEqual(record['metadata']['sampling']['temperature'],0.3)
        self.assertEqual(record['confidence']['percent'],73)
        self.assertFalse(record['confidence']['calibrated'])
        self.assertNotIn('SECRET HISTORY',record['prompt'])
        self.assertEqual(json.loads(record['confidence']['generation']['raw'])['confidence_percent'],73)
    def test_invalid_parameters_and_confidence_are_not_faked(self):
        for parameters in [{'temperature':float('nan')},{'top_p':0},{'seed':True},{'history_turns':1.5},{'max_output_tokens':-1},{'measure_confidence':'yes'}]:
            with self.assertRaises(ValueError):self.engine.start({'question':'test',**parameters})
        class BadConfidence(FakeClient):
            def generate(inner,system,prompt,schema=None):
                result=super(BadConfidence,inner).generate(system,prompt,schema)
                if 'confidence_percent' in (schema or {}).get('properties',{}):
                    result['parsed']['confidence_percent']=101
                return result
        with patch.object(ui,'LocalClient',BadConfidence):
            job=self.wait(self.engine.start({'question':'test','methods':['no_rag']})['job_id'])
        self.assertEqual(job['status'],'done')
        self.assertIsNone(job['results'][0]['confidence']['percent'])
        self.assertEqual(job['results'][0]['confidence']['status'],'error')
    def test_hybrid_weight_endpoints_and_generation_options_reach_ollama(self):
        bm=[('a',10),('b',5)];dense=[('b',1),('a',.5)]
        self.assertEqual(ui.weighted_rrf(bm,dense,1,60)[0][0],'a')
        self.assertEqual(ui.weighted_rrf(bm,dense,0,60)[0][0],'b')
        client=ui.LocalClient('test-model','test-embed',threading.Event(),4096)
        client.seed=321;client.max_output_tokens=900;client.sampling={'temperature':.4,'top_p':.9,'top_k':11,'repeat_penalty':1.2,'presence_penalty':0}
        class Response:
            def __enter__(inner):return inner
            def __exit__(inner,*args):pass
            def __iter__(inner):return iter([json.dumps({'message':{'content':'{"ok":true}'},'done':True}).encode()])
        with patch.object(ui.urllib.request,'urlopen',return_value=Response()) as request:
            client.generate('system','prompt')
        body=json.loads(request.call_args.args[0].data)
        self.assertEqual(body['options'],{**client.sampling,'seed':321,'num_ctx':4096,'num_predict':900})
    def test_cancel_during_confidence_keeps_already_generated_answer(self):
        class CancelConfidence(FakeClient):
            def generate(inner,system,prompt,schema=None):
                if 'confidence_percent' in (schema or {}).get('properties',{}):
                    inner.cancelled.set();raise ui.Cancelled()
                return super(CancelConfidence,inner).generate(system,prompt,schema)
        with patch.object(ui,'LocalClient',CancelConfidence):
            job=self.wait(self.engine.start({'question':'test','methods':['no_rag']})['job_id'])
        self.assertEqual(job['status'],'cancelled')
        self.assertEqual(len(job['results']),1)
        self.assertEqual(job['results'][0]['confidence']['status'],'cancelled')
        self.assertEqual(len(list((self.root/'ui_data/runs').glob('*.json'))),1)
    def test_http_requires_local_token_before_starting_model(self):
        server=ui.AppServer(('127.0.0.1',0),self.engine)
        worker=threading.Thread(target=server.serve_forever,daemon=True);worker.start()
        base=f'http://127.0.0.1:{server.server_port}'
        try:
            req=urllib.request.Request(base+'/api/chat',data=b'{"question":"test"}',headers={'Content-Type':'application/json'})
            with self.assertRaises(urllib.error.HTTPError) as error:urllib.request.urlopen(req)
            self.assertEqual(error.exception.code,403)
            self.assertIsNone(self.engine.active)
            with self.assertRaises(urllib.error.HTTPError) as error:
                urllib.request.urlopen(base+'/api/runs/'+'a'*32)
            self.assertEqual(error.exception.code,403)
            with urllib.request.urlopen(base+'/api/status') as response:
                self.assertEqual(json.load(response)['app'],'bdar-rag-local-ui')
            req=urllib.request.Request(base+'/../data/corpus.json')
            with self.assertRaises(urllib.error.HTTPError) as error:urllib.request.urlopen(req)
            self.assertEqual(error.exception.code,404)
        finally:server.shutdown();server.server_close();worker.join(timeout=2)

    def test_no_rag_does_not_receive_shared_search_query_or_embedding_metadata(self):
        with patch.object(ui,'LocalClient',FakeClient):
            job=self.wait(self.engine.start({'question':'original input','methods':['hybrid','no_rag'],'task_mode':'qa'})['job_id'])
        baseline=job['results'][1]
        self.assertIsNone(json.loads(baseline['prompt'])['search_query'])
        self.assertEqual(baseline['search_queries'],[])
        self.assertIsNone(baseline['embed_model'])
        self.assertIsNone(baseline['query_rewrite'])
        self.assertEqual(baseline['retrieval_ms'],0)
        self.assertEqual(len(baseline['metadata']['ollama']['models']),1)

    def test_retrieval_time_includes_actual_lexical_search(self):
        original=self.engine.lexical.bm25
        def slow(query):time.sleep(.025);return original(query)
        with patch.object(ui,'LocalClient',FakeClient),patch.object(self.engine.lexical,'bm25',side_effect=slow):
            job=self.wait(self.engine.start({'question':'consent','methods':['bm25'],'task_mode':'qa','auto_query':False})['job_id'])
        self.assertGreaterEqual(job['results'][0]['retrieval_ms'],20)

    def test_reviews_are_persisted_and_survive_later_job_updates(self):
        with patch.object(ui,'LocalClient',FakeClient):
            job=self.wait(self.engine.start({'question':'consent','methods':['bm25']})['job_id'])
        stale=copy_record=json.loads(json.dumps(job['results'][0]))
        review=self.engine.review({'record_id':stale['id'],'reviewer':'TEST REVIEWER','reviewed_sources':True,
            'correctness':1,'completeness':1,'supported_claims':1,'total_claims':1})
        stored=json.loads((self.root/'ui_data/runs'/(stale['id']+'.json')).read_text())
        self.assertEqual(stored['human_review']['id'],review['id'])
        self.engine.publish_results(job['id'],[copy_record])
        self.assertEqual(self.engine.snapshot(job['id'])['results'][0]['human_review']['id'],review['id'])
        with self.assertRaises(ValueError):self.engine.review({'record_id':stale['id'],'reviewer':'TEST',
            'reviewed_sources':True,'correctness':True,'completeness':1,'supported_claims':0,'total_claims':1})

    def test_corrupted_embedding_cache_is_rebuilt(self):
        with patch.object(ui,'LocalClient',FakeClient):
            one=self.wait(self.engine.start({'question':'consent','methods':['dense']})['job_id'])
            self.assertEqual(one['status'],'done')
            path=next((self.root/'ui_data/embeddings').glob('*.json'))
            cached=json.loads(path.read_text());cached['vectors'][0]=[float('nan')]
            path.write_text(json.dumps(cached));self.engine.vector_cache.clear();FakeClient.embeds=0
            two=self.wait(self.engine.start({'question':'consent','methods':['dense']})['job_id'])
        self.assertEqual(two['status'],'done',two['error'])
        self.assertGreater(FakeClient.embeds,1)

    def test_token_limit_is_not_accepted_even_if_json_is_parseable(self):
        client=ui.LocalClient('test','embed',threading.Event())
        class Response:
            def __enter__(inner):return inner
            def __exit__(inner,*args):pass
            def __iter__(inner):return iter([json.dumps({'message':{'content':'{"answer":"cut off"}'},'done':True,'done_reason':'length'}).encode()])
        with patch.object(ui.urllib.request,'urlopen',return_value=Response()),self.assertRaises(ui.ModelOutputError) as error:
            client.generate('system','prompt')
        self.assertIn('cut off',error.exception.generation['raw'])

    def test_no_query_expansion_when_disabled_and_sparse_zero_scores_excluded(self):
        with patch.object(ui,'LocalClient',FakeClient):
            job=self.wait(self.engine.start({'question':'nonesensexyzq','task_mode':'requirement','auto_query':False,'methods':['bm25']})['job_id'])
        record=job['results'][0]
        self.assertEqual(record['search_queries'],['nonesensexyzq'])
        self.assertEqual(record['context'],[])
        self.assertIn('no_evidence',record['quality_flags'])

    def test_comparisons_are_isolated_from_prior_retrieval_answers(self):
        with patch.object(ui,'LocalClient',FakeClient):
            job=self.wait(self.engine.start({'question':'test','methods':['bm25','no_rag'],'history_turns':4,
                'history':[{'question':'prior question','answer':'RAG HISTORY MUST NOT LEAK'}]})['job_id'])
        for record in job['results']:
            self.assertEqual(record['experiment_settings']['history_turns'],0)
            self.assertEqual(record['experiment_settings']['requested_history_turns'],4)
            self.assertNotIn('RAG HISTORY MUST NOT LEAK',record['prompt'])

    def test_inconsistent_model_basis_and_abstention_do_not_look_verified(self):
        answer={'answer':'Tai yra tiesioginis reikalavimas.','abstain':False,'limitations':[],'claims':[],
            'requirement_analysis':{'verdict':'justified','support_type':'derived_design_choice'}}
        _,flags=ui.answer_checks(answer,[],'requirement','bm25','original requirement')
        self.assertIn('basis_statement_conflict',flags)
        self.assertIn('unsupported_verdict',flags)
        answer['answer']='Tai nėra tiesioginis reikalavimas.'
        _,flags=ui.answer_checks(answer,[],'requirement','bm25','original requirement')
        self.assertNotIn('basis_statement_conflict',flags)

if __name__=='__main__':unittest.main()
