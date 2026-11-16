"""Meaningful regression checks; mock responses are never experimental results."""
import unittest
from pathlib import Path
import argparse
import contextlib
import io
import json
import tempfile
from unittest.mock import patch
import rag_experiment as r

class ExperimentTests(unittest.TestCase):
    def test_source_contains_all_articles_and_erasure_exceptions(self):
        docs=r.parse_corpus(Path(__file__).parent/'sources'/'gdpr_uk.xml')
        self.assertEqual({d['article'] for d in docs},set(range(1,100)))
        ids={d['id']:d for d in docs}
        self.assertIn('legal obligation',ids['GDPR:17.3']['text'])
        self.assertIn('legal claims',ids['GDPR:17.3']['text'])
        self.assertIn('two further months',ids['GDPR:12.3']['text'])

    def test_metric_denominators_and_no_gold(self):
        m=r.retrieval_metrics(['A','B','C'],['B','D'])
        self.assertEqual(m['recall_at_k'],0.5)
        self.assertEqual(m['precision_at_k'],1/3)
        self.assertEqual(m['mrr_at_k'],0.5)
        self.assertEqual(m['all_required_found'],0)
        self.assertIsNone(r.retrieval_metrics(['A'],[])['recall_at_k'])
        self.assertEqual(r.retrieval_metrics([],['A'])['recall_at_k'],0)

    def test_real_id_with_fabricated_quote_is_rejected(self):
        docs=[{'id':'GDPR:7.3','text':'It shall be as easy to withdraw as to give consent.'}]
        response={'claims':[{'text':'False proposition','citations':[
            {'id':'GDPR:7.3','quote':'A controller must wait for thirty years.'},
            {'id':'GDPR:999','quote':'It shall be as easy to withdraw as to give consent.'}]}]}
        audit=r.citation_audit(response,docs)
        self.assertEqual(audit['known_id_rate'],0.5)
        self.assertEqual(audit['exact_quote_rate'],0)
        self.assertEqual(audit['details'][0]['entailment'],'REQUIRES_HUMAN_REVIEW')

    def test_exact_quote_does_not_assert_entailment(self):
        docs=[{'id':'X','text':'A source has this exact quotation in its legal text.'}]
        audit=r.citation_audit({'claims':[{'text':'Any unrelated claim','citations':[{'id':'X','quote':'this exact quotation'}]}]},docs)
        self.assertEqual(audit['exact_quote_rate'],1)
        self.assertEqual(audit['details'][0]['entailment'],'REQUIRES_HUMAN_REVIEW')

    def test_reranking_does_not_invent_candidates(self):
        class Fake:
            def generate(self,system,prompt):
                self.prompt=prompt
                return {'parsed':{'scores':[{'id':'NOT_SUPPLIED','relevance':3}]},'parse_error':None,'raw':'mock'}
        with self.assertRaises(ValueError):
            r.rerank('question',[('A',1)],{'A':{'id':'A','article':1,'title':'t','text':'text'}},Fake(),1)

    def test_valid_json_with_missing_answer_schema_fails(self):
        with self.assertRaises(ValueError):
            r.validate_answer({'unrelated':'valid JSON but not an answer'})

    def test_all_pipeline_routes_keep_gold_out_of_prompts_and_preserve_outputs(self):
        captured=[]
        class Fake:
            def __init__(self,*args):
                pass
            def metadata(self,require_embed):
                return {'TEST_MOCK_ONLY':True}
            def embed(self,texts):
                return [[1.0,float(len(t)%7)] for t in texts]
            def generate(self,system,prompt):
                data=json.loads(prompt); captured.append(data)
                if 'candidates' in data:
                    answer={'scores':[{'id':d['id'],'relevance':1} for d in data['candidates']]}
                else:
                    citations=[{'id':d['id'],'quote':d['text'][:90]} for d in data.get('sources',[])[:1]]
                    answer={'answer':'TEST MOCK ONLY','abstain':False,'limitations':[],
                            'claims':[{'text':'TEST MOCK ONLY','citations':citations}]}
                return {'parsed':answer,'raw':json.dumps(answer),'parse_error':None}
        with tempfile.TemporaryDirectory() as tmp:
            args=argparse.Namespace(methods='no_rag,bm25,dense,hybrid,hybrid_rerank',backend='ollama',
                top_k=3,rerank_pool=6,split='all',query_id='D01',output=str(Path(tmp)/'mock'),
                host='http://unused',model='TEST-MOCK',embed_model='TEST-MOCK',seed=42,timeout=10,demo=False)
            with patch.object(r,'Ollama',Fake),contextlib.redirect_stdout(io.StringIO()):
                r.run(args)
            records=[json.loads(x) for x in (Path(args.output)/'records.jsonl').read_text(encoding='utf8').splitlines()]
            self.assertEqual(len(records),5)
            self.assertTrue(all(x['generation'] and x['error'] is None for x in records))
            self.assertTrue((Path(args.output)/'report.html').exists())
            for data in captured:
                self.assertFalse({'required_ids','expected_points','human_confirmed'} & set(data))
            with self.assertRaisesRegex(ValueError,'No completed human ratings'):
                r.evaluate_human(argparse.Namespace(run_dir=args.output))

if __name__=='__main__':
    unittest.main()
