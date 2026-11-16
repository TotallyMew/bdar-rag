import unittest
import re
from pathlib import Path
from xml.etree import ElementTree as ET

import prepare_lt_corpus as corpus
import rag_experiment as core
import traceability
from ui_server import extract_article_references, requirement_queries


class TraceabilityTest(unittest.TestCase):
    def test_nfr_benchmarks_are_aligned_with_the_lithuanian_corpus(self):
        data=Path(__file__).resolve().parent/'data'
        package=core.read_json(data/'nfr_examples.json')
        by_id={entry['id']:entry['text'] for entry in core.read_json(data/'corpus_lt.json')}
        self.assertEqual([template['id'] for template in package['templates']],
                         ['NFR-01','NFR-02','NFR-03','NFR-04'])
        scored=[template for template in package['templates'] if template['gold'] is not None]
        self.assertEqual([template['id'] for template in scored],['NFR-01','NFR-02'])
        for template in package['templates']:
            with self.subTest(template=template['id']):
                criteria=traceability.parse_criteria(template['prompt'])
                self.assertGreaterEqual(len(criteria),3)
                self.assertEqual(extract_article_references(template['prompt']),[])
                if template['gold'] is None:
                    continue
                self.assertEqual(set(template['gold']),{item['id'] for item in criteria})
                for references in template['gold'].values():
                    self.assertTrue(references)
                    for reference in references:
                        text=by_id[reference['id']]
                        self.assertTrue(reference['why'])
                        for point in reference['points']:
                            self.assertRegex(text,rf'(?m)^{re.escape(point)}\)')

    def test_original_lithuanian_corpus_aligns_with_english(self):
        root=Path(__file__).resolve().parent
        english=core.read_json(root/'data'/'corpus.json')
        lithuanian=corpus.build(ET.parse(corpus.SOURCE).getroot(),english)
        self.assertEqual(len(lithuanian),389)
        self.assertEqual({d['id'] for d in english},{d['id'] for d in lithuanian})
        source=next(d for d in lithuanian if d['id']=='GDPR:32.1')
        self.assertIn('c) gebėjimą laiku atkurti',source['text'])
        self.assertIn('d) reguliarų techninių ir organizacinių priemonių',source['text'])

    def test_query_plan_keeps_criterion_and_parent_search_separate(self):
        class Client:
            def generate(self,*unused):
                return {'parsed':{'scope_query':'duomenų atkūrimas po incidento',
                                  'K2':'atkūrimas laiku'}}
        text='NFR-01. Atkūrimas po incidento.\n- **K2.** Atkūrimas per 24 valandas.'
        criteria=traceability.parse_criteria(text)
        scope=traceability.requirement_scope(text)
        queries,_=traceability.plan_criteria(Client(),scope,criteria,True,'lt')
        self.assertEqual(len(criteria),1)
        self.assertEqual(queries['K2'],['atkūrimas laiku','duomenų atkūrimas po incidento','Atkūrimas per 24 valandas.'])

    def test_regular_testing_does_not_confirm_three_months(self):
        quote='d) reguliarų techninių ir organizacinių priemonių tikrinimą.'
        citations=[{'id':'GDPR:32.1','quote':quote}]
        class Client:
            def generate(self,*unused):
                return {'parsed':{'status':'supported','reason':'Šaltinis nurodo tikrinimą.',
                                  'citations':citations}}
        item={'id':'K3','text':'Priemones tikrina kas tris mėnesius.'}
        source={'id':'GDPR:32.1','article':32,'title':'Saugumas','text':quote,'url':'https://example.com/'}
        result=traceability.assess_criterion(Client(),item,'', [source])
        self.assertEqual(result['status'],'partial')
        self.assertEqual(result['model_status'],'supported')
        self.assertTrue(result['audit']['details'][0]['exact_quote'])
        citations[0]['quote']='Ištraukos originale nėra.'
        result=traceability.assess_criterion(Client(),item,'', [source])
        self.assertEqual(result['status'],'unverified')

    def test_lithuanian_request_submission_has_localised_search(self):
        question='Sistema turi leisti pateikti prašymą ištrinti asmens duomenis.'
        queries=requirement_queries(question,question,'lt')
        self.assertEqual(len(queries),3)
        self.assertIn('sudaro palankesnes sąlygas',queries[0])
        self.assertIn('ištrynimo pagrindai',queries[1])


if __name__=='__main__':
    unittest.main()
