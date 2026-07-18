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

def replace_section(html, heading, new_text, path, required=True):
    pat = re.compile(r'(<h2[^>]*>' + re.escape(heading) + r'</h2>\s*<p[^>]*>)[\s\S]*?(</p>)')
    if not pat.search(html):
        if required:
            raise SystemExit(f'ANCHOR NOT FOUND: "{heading}" in {path}')
        return html
    return pat.sub(lambda m: m.group(1) + html_par(new_text) + m.group(2), html, count=1)

def g(v):
    return '%g' % v

def set_noindex(html):
    return re.sub(r'(<meta name="robots" content=")[^"]*(">)',
                  r'\g<1>noindex, follow\g<2>', html, count=1)

def apply_fixes(html, spot, fixes):
    """Patch depth stat, coordinates, and species chips in rendered HTML."""
    if 'depth_max' in fixes:
        old = spot['depth_max']
        html = html.replace(f'>{old}</div>', f'>{fixes["depth_max"]}</div>', 1)
    if 'coordinates' in fixes:
        ol, on = g(spot['coordinates']['lat']), g(spot['coordinates']['lng'])
        nl, nn = g(fixes['coordinates']['lat']), g(fixes['coordinates']['lng'])
        html = html.replace(f'"latitude":{ol},"longitude":{on}', f'"latitude":{nl},"longitude":{nn}')
        html = html.replace(f'content="{ol};{on}"', f'content="{nl};{nn}"')
        html = html.replace(f'content="{ol}, {on}"', f'content="{nl}, {nn}"')
        html = html.replace(f'[{ol}, {on}]', f'[{nl}, {nn}]')
        oabs, nabs = g(abs(spot['coordinates']['lng'])), g(abs(fixes['coordinates']['lng']))
        html = html.replace(f'GPS: {ol}&deg;N, {oabs}&deg;W', f'GPS: {nl}&deg;N, {nabs}&deg;W')
    if 'primary_species' in fixes:
        for old_sp, new_sp in zip(spot['primary_species'], fixes['primary_species']):
            if old_sp != new_sp:
                html = html.replace(f'>{old_sp}</span>', f'>{new_sp}</span>', 1)
    return html

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
        if 'terrain' in rw:
            spot['terrain'] = rw['terrain']
        if 'terrain_fr' in rw:
            spot['terrain_fr'] = rw['terrain_fr']
        fixes = rw.get('fixes', {})

        en = ROOT / 'en' / activity / f'{slug}.html'
        html = en.read_text(encoding='utf-8')
        html = replace_section(html, 'About This Place', rw['description'], en)
        html = replace_section(html, 'Seasonal Tips', rw['seasonal_tips'], en)
        if 'terrain' in rw:
            html = replace_section(html, 'Terrain & Topography', rw['terrain'], en, required=False)
        if fixes:
            html = apply_fixes(html, spot, fixes)
        if rw.get('noindex'):
            html = set_noindex(html)
        en.write_text(html, encoding='utf-8')

        fr = ROOT / 'fr' / activity / f'{slug}.html'
        html = fr.read_text(encoding='utf-8')
        html = replace_section(html, 'À propos de ce lieu', rw['description_fr'], fr)
        html = replace_section(html, 'Conseils de saison', rw['seasonal_tips_fr'], fr)
        if 'terrain_fr' in rw:
            html = replace_section(html, 'Terrain et topographie', rw['terrain_fr'], fr, required=False)
        if fixes:
            html = apply_fixes(html, spot, fixes)
        if rw.get('noindex'):
            html = set_noindex(html)
        fr.write_text(html, encoding='utf-8')

        # apply data fixes to JSON after HTML (apply_fixes needs old values)
        if 'depth_max' in fixes:
            spot['depth_max'] = fixes['depth_max']
        if 'coordinates' in fixes:
            spot['coordinates'] = fixes['coordinates']
        if 'primary_species' in fixes:
            spot['primary_species'] = fixes['primary_species']
        print(f'applied: {slug}' + (' [noindex]' if rw.get('noindex') else ''))

    with open(data_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print(f'updated {data_path} ({len(rewrites)} spots)')

if __name__ == '__main__':
    main()
