"""Build the Lithuanian GDPR index from the pinned Publications Office XHTML."""
from hashlib import sha256
from pathlib import Path
import re
from xml.etree import ElementTree as ET
from rag_experiment import read_json, save_json, normalize, digest

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / 'sources' / 'gdpr_lt.xhtml'
OFFICIAL = 'https://eur-lex.europa.eu/eli/reg/2016/679/oj/lit'
CELLAR = 'https://publications.europa.eu/resource/celex/32016R0679'
HTML = '{http://www.w3.org/1999/xhtml}'


def display_blocks(node):
    tag = node.tag.removeprefix(HTML)
    if tag in ('p', 'li'):
        return [normalize(''.join(node.itertext()))]
    if tag == 'tr':
        return [' '.join(filter(None, (normalize(''.join(c.itertext())) for c in node)))]
    return [line for child in node for line in display_blocks(child)]


def build(root, reference):
    head = root.find(HTML+'head')
    if head is None or 'L_2016119LT' not in head.findtext(HTML+'title', ''):
        raise ValueError('Expected the original Lithuanian EU official journal publication.')
    articles = {int(n.get('id').split('_')[1]):n for n in root.iter(HTML+'div')
                if re.fullmatch(r'art_\d+',n.get('id',''))}
    if set(articles) != set(range(1,100)):
        raise ValueError('Expected 99 articles.')
    chunks = []
    for article,node in sorted(articles.items()):
        title = next(normalize(''.join(n.itertext())) for n in node.iter(HTML+'p')
                     if n.get('class')=='oj-sti-art')
        paragraph_blocks = {}
        for part in node:
            pid=part.get('id','')
            if re.fullmatch(r'\d{3}\.\d{3}',pid) and int(pid.split('.')[0])==article:
                number=int(pid.split('.')[1])
                paragraph_blocks[number]=display_blocks(part)
        desired = [d for d in reference if d['article']==article]
        for entry in desired:
            id=entry['id']
            if '.' in id:
                paragraph=int(id.rsplit('.',1)[1])
                blocks=paragraph_blocks[paragraph]
                blocks=[re.sub(rf'^{paragraph}\.\s+','',blocks[0],count=1),*blocks[1:]]
            else:
                blocks=[line for child in node if child.get('class') not in ('oj-ti-art','eli-title')
                        for line in display_blocks(child)]
            text='\n'.join(filter(None,blocks))
            if not text:
                raise ValueError(f'Missing text for {id}')
            url=f'{OFFICIAL}#art_{article}'
            chunks.append({'id':id,'article':article,'title':title,'text':text,'url':url,'official_eu_url':url,
                           'version':'Pradinė ES BDAR redakcija (2016), lietuvių kalba',
                           'sha256':sha256(text.encode()).hexdigest()})
    if {d['id'] for d in chunks} != {d['id'] for d in reference}:
        raise ValueError('English and Lithuanian fragment identifiers do not align.')
    return chunks


def main():
    source_tree=ET.parse(SOURCE).getroot()
    data=ROOT/'data'
    docs=build(source_tree,read_json(data/'corpus.json'))
    output=data/'corpus_lt.json'
    save_json(output,docs)
    save_json(data/'corpus_manifest_lt.json',{
        'source_url':OFFICIAL,'download_url':CELLAR,'accept_language':'lt, lit',
        'source_sha256':digest(SOURCE),'corpus_sha256':digest(output),'article_count':99,
        'chunk_count':len(docs),'language':'lt','scope':'EU GDPR as published in the 2016 Official Journal, Lithuanian.',
        'chunking':'Same article and paragraph IDs as the English experiment; lettered items retained.',
    })
    print(f'{len(docs)} aligned Lithuanian fragments.')


if __name__=='__main__':
    main()
