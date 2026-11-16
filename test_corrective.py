"""Deterministic software checks. Scripted outputs are not research results."""
import json
import unittest
from unittest.mock import patch
import corrective_rag as cr
import ui_server as ui
import test_ui as base
FakeClient=base.FakeClient

A={'id':'GDPR:6.1','article':6,'paragraph':1,'title':'TEST A','text':'TEST initial source only','url':'https://example.invalid/a'}
B={'id':'GDPR:17.1','article':17,'paragraph':1,'title':'TEST B','text':'TEST corrected source only','url':'https://example.invalid/b'}

def assessment(judgment='partial',ids=None,queries=None):
    return {'judgment':judgment,'reason':'TEST model opinion',
        'useful_source_ids':ids or [A['id']],
        'missing_aspects':[] if judgment=='sufficient' else ['TEST missing evidence'],
        'follow_up_queries_en':queries or []}

class ScriptedClient:
    model='TEST ONLY'
    def __init__(self,values):self.values=list(values);self.prompts=[];self.checked=0
    def check(self):self.checked+=1
    def generate(self,system,prompt,schema):
        self.prompts.append(json.loads(prompt));value=self.values.pop(0)
        return {'parsed':value,'raw':json.dumps(value),'elapsed_ms':1}

class CorrectiveUnitTests(unittest.TestCase):
    def context(self,ranking):return [{A['id']:A,B['id']:B}[ranking[0][0]]] if ranking else []
    def run_case(self,client,retrieve,**kwargs):
        return cr.run(client,'TEST question','qa',[(A['id'],1)],['initial query'],self.context,retrieve,**kwargs)
    def test_sufficient_evidence_skips_all_extra_searches(self):
        client=ScriptedClient([assessment('sufficient')])
        def forbidden(q):self.fail('Unexpected extra search')
        context,trace=self.run_case(client,forbidden)
        self.assertEqual(context,[A]);self.assertEqual(trace['stop_reason'],'sufficient')
        self.assertEqual(len(trace['rounds']),1)
        self.assertIn('raw',trace['rounds'][0]['evaluation']['generation'])

    def test_gap_query_changes_context_and_is_re_evaluated(self):
        client=ScriptedClient([assessment(queries=['targeted gap query']),assessment('sufficient',[B['id']])])
        queries=[]
        def retrieve(q):queries.append(q);return [(B['id'],1)]
        context,trace=self.run_case(client,retrieve)
        self.assertEqual(context,[B]);self.assertEqual(queries,['targeted gap query'])
        self.assertEqual(trace['rounds'][0]['source_ids'],[A['id']])
        self.assertEqual(trace['rounds'][1]['source_ids'],[B['id']])
        self.assertEqual(trace['final_judgment'],'sufficient')
        self.assertNotIn('history',client.prompts[0])

    def test_round_and_query_limits_bound_model_and_search_calls(self):
        client=ScriptedClient([assessment(queries=['gap 1','gap 2','gap 3']),assessment(ids=[B['id']],queries=['gap 4'])])
        queries=[]
        def retrieve(q):queries.append(q);return [(B['id'],1)]
        _,trace=self.run_case(client,retrieve,max_rounds=2,max_queries=2)
        self.assertEqual(queries,['gap 1','gap 2'])
        self.assertEqual(len(client.prompts),2)
        self.assertEqual(trace['stop_reason'],'round_limit')
        self.assertEqual(trace['final_judgment'],'partial')

    def test_repeated_query_stops_without_retrieving(self):
        client=ScriptedClient([assessment(queries=['  INITIAL   query '])])
        _,trace=self.run_case(client,lambda q:self.fail('Repeated query searched'))
        self.assertEqual(trace['stop_reason'],'no_new_query')

    def test_unchanged_context_does_not_trigger_duplicate_evaluation(self):
        client=ScriptedClient([assessment(queries=['new query'])])
        context,trace=self.run_case(client,lambda q:[(A['id'],1)])
        self.assertEqual(context,[A]);self.assertEqual(len(client.prompts),1)
        self.assertEqual(trace['stop_reason'],'unchanged_context')
        self.assertEqual(trace['all_queries'],['initial query','new query'])

    def test_foreign_source_and_inconsistent_sufficiency_are_rejected(self):
        for value in [assessment('sufficient',['NOT-SUPPLIED']),
                      {**assessment('sufficient'),'missing_aspects':['contradiction']}]:
            with self.subTest(value=value):
                with self.assertRaises(cr.EvaluationError) as error:self.run_case(ScriptedClient([value]),lambda q:[])
                self.assertIn('raw',error.exception.generation['evaluator_generation'])

    def test_one_round_is_a_real_no_extra_search_ablation(self):
        client=ScriptedClient([assessment(queries=['new query'])])
        _,trace=self.run_case(client,lambda q:self.fail('Search should be disabled'),max_rounds=1)
        self.assertEqual(trace['stop_reason'],'round_limit')
        self.assertEqual(len(trace['rounds']),1)

    def test_cancellation_propagates(self):
        client=ScriptedClient([])
        def cancelled():raise ui.Cancelled()
        client.check=cancelled
        with self.assertRaises(ui.Cancelled):self.run_case(client,lambda q:[])

class CorrectiveIntegrationTests(unittest.TestCase):
    setUp=base.UIIntegrationTests.setUp
    tearDown=base.UIIntegrationTests.tearDown
    wait=base.UIIntegrationTests.wait
    def test_corrective_record_keeps_models_prompts_and_source_gaps(self):
        class MissingEvidence(FakeClient):
            def generate(inner,system,prompt,schema=None):
                if 'judgment' in (schema or {}).get('properties',{}):
                    data=json.loads(prompt)
                    value=assessment('partial',[data['sources'][0]['id']],['new targeted query'])
                    return {'parsed':value,'raw':json.dumps(value),'elapsed_ms':1}
                return super(MissingEvidence,inner).generate(system,prompt,schema)
        with patch.object(ui,'LocalClient',MissingEvidence):
            job=self.wait(self.engine.start({'question':'Articles 17 and 22',
                'methods':['corrective','no_rag'],'task_mode':'qa','auto_query':False,'top_k':1})['job_id'])
        self.assertEqual(job['status'],'done',job['error'])
        record,baseline=job['results']
        self.assertEqual(len(record['context']),7)
        self.assertEqual(record['corrective']['stop_reason'],'unchanged_context')
        self.assertIn('corrective_incomplete_evidence',record['quality_flags'])
        self.assertEqual(record['confidence']['reason'],'retrieval_incomplete')
        self.assertEqual(len(record['metadata']['ollama']['models']),2)
        self.assertIsNotNone(record['embed_model'])
        self.assertIn('retrieval_assessment',json.loads(record['prompt']))
        self.assertIsNone(baseline['corrective'])
        self.assertNotIn('retrieval_assessment',json.loads(baseline['prompt']))
        self.assertEqual(baseline['context'],[])
        self.assertGreaterEqual(record['retrieval_ms'],record['timings']['corrective_evaluation_ms'])

    def test_corrective_settings_reject_invalid_bounds(self):
        for payload in [{'corrective_max_rounds':0},{'corrective_max_rounds':4},
                        {'corrective_max_rounds':True},{'corrective_max_queries':1.5}]:
            with self.subTest(payload=payload):
                with self.assertRaises(ValueError):self.engine.start({'question':'test','methods':['corrective'],**payload})

if __name__=='__main__':unittest.main()
