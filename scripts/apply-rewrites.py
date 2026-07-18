#!/usr/bin/env python3
"""Apply content rewrites from scripts/rewrites/*.json to data JSON + EN/FR HTML.

Keeps JSON and HTML in sync: for each spot, updates
  - data/{activity}.json: description, seasonal_tips, description_fr, seasonal_tips_fr
  - en/{activity}/{slug}.html: "About This Place" + "Seasonal Tips" paragraphs
  - fr/{activity}/{slug}.html: "À propos de ce lieu" + "Conseils de saison" paragraphs
Only paragraph text is replaced; markup, classes, header/footer/schema untouched.

Usage: python3 scripts/apply-rewrites.py fishing scripts/rewrites/fishing-batch1a.json [more.json ...]
"""
import json, re, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent

def html_par(text):
    return text.replace('\n\n', '<br/><br/>').replace('\n', '<br/>')

def replace_section(html, heading, new_text, path):
    pat = re.compile(r'(<h2[^>]*>' + re.escape(heading) + r'</h2>\s*<p[^>]*>)[\s\S]*?(</p>)')
    if not pat.search(html):
        raise SystemExit(f'ANCHOR NOT FOUND: "{heading}" in {path}')
    return pat.sub(lambda m: m.group(1) + html_par(new_text) + m.group(2), html, count=1)

def main():
    activity, files = sys.argv[1], sys.argv[2:]
    rewrites = {}
    for f in files:
        rewrites.update(json.load(open(f)))

    data_path = ROOT / 'data' / f'{activity}.json'
    data = json.load(open(data_path))
    by_slug = {s['slug']: s for s in data['spots']}

    for slug, rw in rewrites.items():
        spot = by_slug.get(slug)
        if spot is None:
            raise SystemExit(f'UNKNOWN SLUG: {slug}')
        spot['description'] = rw['description']
        spot['seasonal_tips'] = rw['seasonal_tips']
        spot['description_fr'] = rw['description_fr']
        spot['seasonal_tips_fr'] = rw['seasonal_tips_fr']

        en = ROOT / 'en' / activity / f'{slug}.html'
        html = en.read_text(encoding='utf-8')
        html = replace_section(html, 'About This Place', rw['description'], en)
        html = replace_section(html, 'Seasonal Tips', rw['seasonal_tips'], en)
        en.write_text(html, encoding='utf-8')

        fr = ROOT / 'fr' / activity / f'{slug}.html'
        html = fr.read_text(encoding='utf-8')
        html = replace_section(html, 'À propos de ce lieu', rw['description_fr'], fr)
        html = replace_section(html, 'Conseils de saison', rw['seasonal_tips_fr'], fr)
        fr.write_text(html, encoding='utf-8')
        print(f'applied: {slug}')

    with open(data_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print(f'updated {data_path} ({len(rewrites)} spots)')

if __name__ == '__main__':
    main()
