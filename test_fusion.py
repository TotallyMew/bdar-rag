"""Algorithm and integration checks; test doubles are never research results."""
import json
import unittest
from unittest.mock import patch
import rag_fusion as fusion
import ui_server as ui
import test_ui as base

class Client:
    model='TEST-ONLY'
    def __init__(self,queries):self.queries=queries;self.checks=0;self.calls=[]
    def check(self):self.checks+=1
    def generate(self,system,prompt,schema):
        self.calls.append((system,json.loads(prompt),schema))
        value={'queries_en':self.queries}
        return {'parsed':value,'raw':json.dumps(value),'elapsed_ms':1}

class FusionAlgorithmTests(unittest.TestCase):
    def test_rrf_matches_manual_one_based_sum_and_preserves_consensus(self):
        ranked,trace=fusion.reciprocal_rank_fusion([
            [('A',0.99),('B',0.5)],[('B',0.9),('C',0.8)]],60)
        self.assertEqual([i for i,_ in ranked],['B','A','C'])
        self.assertAlmostEqual(ranked[0][1],1/62+1/61)
        self.assertAlmostEqual(ranked[1][1],1/61)
        self.assertEqual(trace[0]['contributions'][0]['rank'],2)
        self.assertEqual(trace[0]['contributions'][1]['query_index'],1)

    def test_rrf_uses_ranks_not_cosine_magnitudes_and_breaks_ties_stably(self):
        a=fusion.reciprocal_rank_fusion([[('Z',0.9),('A',0.1)],[('A',0.99),('Z',-0.5)]],10)
        b=fusion.reciprocal_rank_fusion([[('Z',1),('A',-1)],[('A',0.5),('Z',0.4)]],10)
        self.assertEqual(a,b)
        self.assertEqual(a[0][0][0],'A')

    def test_duplicate_document_in_one_ranking_cannot_inflate_score(self):
        with self.assertRaises(ValueError):fusion.reciprocal_rank_fusion([[('A',0.9),('A',0.8)]])
        with self.assertRaises(ValueError):fusion.reciprocal_rank_fusion([[('A',float('nan'))]])

    def test_all_queries_actually_search_and_pool_limit_applies_before_fusion(self):
        client=Client(['alternative one','alternative two']);calls=[]
        def retrieve(q):calls.append(q);return [('A',0.9),('B',0.8),('discarded',0.7)]
        ranked,trace=fusion.run(client,'ORIGINAL','base','qa',[],retrieve,query_count=2,pool_size=2)
        self.assertEqual(calls,['base','alternative one','alternative two'])
        self.assertEqual([i for i,_ in ranked],['A','B'])
        self.assertAlmostEqual(ranked[0][1],3/61)
        self.assertEqual(len(trace['retrievals']),3)
        self.assertEqual(trace['query_generation']['generation']['raw'],json.dumps({'queries_en':client.queries}))
        self.assertEqual(client.calls[0][1]['question'],'ORIGINAL')

    def test_duplicate_or_invalid_query_output_fails_before_any_search_with_provenance(self):
        for queries in [['base','other'],['One',' one '],['only one'],['', 'two'],[42,'two']]:
            with self.subTest(queries=queries):
                calls=[]
                with self.assertRaises(fusion.QueryGenerationError) as caught:
                    fusion.run(Client(queries),'ORIGINAL','base','qa',[],lambda q:calls.append(q),query_count=2)
                self.assertEqual(calls,[])
                self.assertIn('fusion_query_generation',caught.exception.generation)

    def test_configuration_bounds_are_enforced(self):
        for kwargs in [{'query_count':1},{'query_count':6},{'query_count':True},
                       {'pool_size':0},{'pool_size':101},{'constant':0},{'constant':1.5}]:
            with self.subTest(kwargs=kwargs),self.assertRaises(ValueError):
                fusion.run(Client([]),'ORIGINAL','base','qa',[],lambda q:[],**kwargs)
        for value in [0,True,101,1.5]:
            with self.subTest(value=value),self.assertRaises(ValueError):
                fusion.reciprocal_rank_fusion([],value)

    def test_non_object_model_output_retains_raw_provenance(self):
        class Malformed(Client):
            def generate(self,*args):return {'parsed':[],'raw':'[]','elapsed_ms':1}
        with self.assertRaises(fusion.QueryGenerationError) as caught:
            fusion.run(Malformed([]),'ORIGINAL','base','qa',[],lambda q:[],query_count=2)
        self.assertEqual(caught.exception.generation['fusion_query_generation']['raw'],'[]')

    def test_cancellation_prevents_remaining_searches(self):
        class Cancelled(Exception):pass
        client=Client(['one','two']);calls=[]
        def check():
            if calls:raise Cancelled()
        client.check=check
        def retrieve(q):calls.append(q);return []
        with self.assertRaises(Cancelled):fusion.run(client,'ORIGINAL','base','qa',[],retrieve,query_count=2)
        self.assertEqual(calls,['base'])

    def test_empty_rankings_are_not_replaced_with_model_invented_evidence(self):
        ranked,trace=fusion.run(Client(['one','two']),'ORIGINAL','base','qa',[],lambda q:[],query_count=2)
        self.assertEqual(ranked,[])
        self.assertEqual(trace['fused_ranking'],[])

class FusionIntegrationTests(unittest.TestCase):
    setUp=base.UIIntegrationTests.setUp
    tearDown=base.UIIntegrationTests.tearDown
    wait=base.UIIntegrationTests.wait

    def test_fusion_trace_is_reproducible_and_does_not_leak_to_baseline(self):
        with patch.object(ui,'LocalClient',base.FakeClient):
            job=self.wait(self.engine.start({'question':'consent withdrawal','methods':['rag_fusion','no_rag'],
                'task_mode':'qa','auto_query':False,'measure_confidence':False,'fusion_query_count':2})['job_id'])
        self.assertEqual(job['status'],'done',job['error'])
        record,baseline=job['results'];trace=record['rag_fusion']
        self.assertEqual(len(trace['queries']),3)
        self.assertEqual(record['search_queries'],trace['queries'])
        self.assertEqual([d['id'] for d in record['context']],trace['pure_rrf_top_ids'])
        self.assertEqual(record['query_strategy'],'rag_fusion_dense_rrf_v1')
        self.assertEqual(len(trace['implementation_sha256']),64)
        self.assertEqual(len(record['metadata']['ollama']['models']),2)
        self.assertIsNone(baseline['rag_fusion']);self.assertIsNone(baseline['embed_model'])
        self.assertEqual(baseline['context'],[]);self.assertEqual(baseline['search_queries'],[])
        generated=json.loads(record['prompt']);plain=json.loads(baseline['prompt'])
        self.assertEqual(generated['generated_search_queries'],trace['queries'][1:])
        self.assertNotIn('generated_search_queries',plain)
        rebuilt,_=fusion.reciprocal_rank_fusion([
            [(d['id'],d['cosine_similarity']) for d in r['ranking']] for r in trace['retrievals']],trace['rrf_constant'])
        self.assertEqual(rebuilt[:3],[(d['id'],d['rrf_score']) for d in trace['fused_ranking'][:3]])
        self.assertGreaterEqual(record['retrieval_ms'],trace['vector_search_ms']+trace['query_generation_ms'])

    def test_explicit_references_are_logged_separately_from_pure_rrf(self):
        with patch.object(ui,'LocalClient',base.FakeClient):
            job=self.wait(self.engine.start({'question':'Article 17(1) and Article 22(1)',
                'methods':['rag_fusion'],'task_mode':'qa','auto_query':False,'top_k':1})['job_id'])
        self.assertEqual(job['status'],'done',job['error'])
        record=job['results'][0];trace=record['rag_fusion']
        self.assertEqual(trace['explicit_reference_ids'],['GDPR:17.1','GDPR:22.1'])
        self.assertEqual(trace['final_context_ids'],['GDPR:17.1','GDPR:22.1'])
        self.assertEqual(len(trace['pure_rrf_top_ids']),1)

    def test_requirement_fusion_uses_generated_queries_without_old_balanced_heuristic(self):
        with patch.object(ui,'LocalClient',base.FakeClient):
            job=self.wait(self.engine.start({'question':'Sistema turi priimti prašymą ištrinti duomenis.',
                'methods':['rag_fusion'],'task_mode':'requirement','auto_query':True,'measure_confidence':False})['job_id'])
        self.assertEqual(job['status'],'done',job['error'])
        record=job['results'][0]
        self.assertEqual(len(record['search_queries']),4)
        self.assertEqual(record['search_queries'][0],'right to withdraw consent at any time')
        self.assertEqual(json.loads(record['rag_fusion']['query_generation']['prompt'])['task_mode'],'requirement')
        self.assertIn('requirement_analysis',record['answer'])

    def test_invalid_model_output_is_visible_and_raw_generation_is_journalled(self):
        class Bad(base.FakeClient):
            def generate(inner,system,prompt,schema=None):
                result=super().generate(system,prompt,schema)
                if 'queries_en' in (schema or {}).get('properties',{}):result['parsed']['queries_en']=['same']*3
                return result
        with patch.object(ui,'LocalClient',Bad):
            job=self.wait(self.engine.start({'question':'consent','methods':['rag_fusion'],
                'task_mode':'qa','auto_query':False})['job_id'])
        self.assertEqual(job['status'],'error')
        self.assertEqual(job['results'],[])
        error=json.loads((self.engine.storage/'errors'/(job['id']+'.json')).read_text(encoding='utf-8'))
        self.assertIn('fusion_query_generation',error['generation'])

    def test_api_rejects_invalid_settings_before_starting_job(self):
        for values in [{'fusion_query_count':1},{'fusion_query_count':True},{'fusion_pool':2,'top_k':3},
                       {'fusion_rrf_k':101},{'fusion_query_count':2.5}]:
            with self.subTest(values=values),self.assertRaises(ValueError):
                self.engine.start({'question':'consent','methods':['rag_fusion'],**values})

if __name__=='__main__':unittest.main()
