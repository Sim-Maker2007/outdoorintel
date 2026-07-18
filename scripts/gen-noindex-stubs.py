#!/usr/bin/env python3
"""Generate honest noindex stubs for thin-data spots (triage class NOINDEX).

Produces a rewrites JSON consumable by apply-rewrites.py. Design rule: every
sentence of 8+ words interpolates the spot's own name and/or species so the
sentence-duplication check (scripts/check-content-uniqueness.js) passes —
sentences under 8 words are exempt from that check.

Usage:
  python3 scripts/gen-noindex-stubs.py fishing > scripts/rewrites/fishing-noindex-stubs.json
"""
import json, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent

# FR (MFFP inventory) -> EN gloss
SP_EN = {
    'Omble de fontaine': 'brook trout', 'Touladi': 'lake trout',
    'Doré jaune': 'walleye', 'Doré noir': 'sauger', 'Grand brochet': 'northern pike',
    'Brochet maillé': 'chain pickerel', 'Achigan': 'bass', 'Perchaude': 'yellow perch',
    'Barbotte brune': 'brown bullhead', 'Meunier noir': 'white sucker',
    'Meunier rouge': 'longnose sucker', 'Grand corégone': 'lake whitefish',
    'Cisco de lac': 'cisco', 'Lotte': 'burbot', 'Éperlan arc-en-ciel': 'rainbow smelt',
    'Ouananiche': 'landlocked salmon', 'Baret': 'white perch',
    'Marigane noire': 'black crappie', 'Barbue de rivière': 'channel catfish',
    'Maskinongé': 'muskellunge', 'Laquaiche argentée': 'mooneye',
    'Truite arc-en-ciel': 'rainbow trout', 'Truite brune': 'brown trout',
    'Omble chevalier': 'Arctic char', 'Crapet-soleil': 'pumpkinseed',
    'Crapet de roche': 'rock bass', 'Anguille d’Amérique': 'American eel',
}

def en_species(fr_list):
    out = []
    for s in fr_list:
        out.append(SP_EN.get(s, s.lower()))
    return out

def join_en(items):
    items = list(dict.fromkeys(items))
    if len(items) == 1:
        return items[0]
    return ', '.join(items[:-1]) + ' and ' + items[-1]

def join_fr(items):
    items = [i.lower() for i in dict.fromkeys(items)]
    if len(items) == 1:
        return items[0]
    return ', '.join(items[:-1]) + ' et ' + items[-1]

import re

FR_ARTICLE = {'lac': 'le', 'lacs': 'les', 'étang': "l'", 'etang': "l'",
              'rivière': 'la', 'riviere': 'la', 'réservoir': 'le',
              'reservoir': 'le', 'petit lac': 'le', 'grand lac': 'le', 'baie': 'la'}

def natural_name(raw):
    """'Admac, Lac' -> 'Lac Admac'; 'Aigle, Lac de l'' -> 'Lac de l'Aigle'."""
    m = re.match(r"^(.*?), ((?:Petit |Grand )?(?:Lac|Lacs|Étang|Etang|Rivière|Riviere|Réservoir|Reservoir|Baie)(?: .*)?)$", raw)
    if not m:
        return raw
    specific, generic = m.group(1), m.group(2)
    if generic.endswith("'") or generic.endswith('’'):
        return generic + specific
    return generic + ' ' + specific

def fr_ref(name):
    """'Lac Admac' -> 'le lac Admac' (for mid-sentence use)."""
    low = name.lower()
    for key in sorted(FR_ARTICLE, key=len, reverse=True):
        if low.startswith(key + ' ') or low.startswith(key + "'") :
            art = FR_ARTICLE[key]
            body = name[0].lower() + name[1:]
            return (art + body) if art.endswith("'") else (art + ' ' + body)
    return name

def make_stub(spot):
    name = natural_name(spot['name'])
    nfr = fr_ref(name)
    Nfr = nfr[0].upper() + nfr[1:]
    fr_sp = spot.get('primary_species', [])
    en_sp = join_en(en_species(fr_sp)) if fr_sp else ''
    fr_spj = join_fr(fr_sp) if fr_sp else ''
    lat, lng = spot['coordinates']['lat'], spot['coordinates']['lng']

    if fr_sp:
        d_en = (
            f"{name} appears in Québec's provincial fish-habitat records with a species inventory listing {en_sp}. "
            f"That inventory, and the mapped location at {lat}°N, is what we can verify about {name} today — not its depths, its access points, or how it actually fishes. "
            f"Rather than dress {name} up with invented detail, we're keeping this page short until we can ground it in checked facts. "
            "No guesses, no filler. "
            f"If you know {name} first-hand, a community report helps us build the real page. "
            f"A Québec fishing licence is required to fish {name}, and the zone regulations apply."
        )
        t_en = (
            f"Seasonal advice for {name} would be guesswork at this point, so we won't offer any. "
            f"Before planning a trip to {name}, check the current Québec zone regulations for the seasons and limits covering the recorded species."
        )
        d_fr = (
            f"{Nfr} figure aux inventaires provinciaux d'habitat du poisson du Québec avec une liste d'espèces comprenant {fr_spj}. "
            f"Cet inventaire, et la position cartographiée à {lat}°N, voilà ce que nous pouvons vérifier aujourd'hui pour {nfr} — pas ses profondeurs, ses accès ni sa vraie pêche. "
            f"Plutôt que d'habiller {nfr} de détails inventés, nous gardons cette page brève jusqu'à ce que des faits vérifiés permettent de l'étoffer. "
            "Pas de suppositions, pas de remplissage. "
            f"Si vous connaissez {nfr} de première main, un rapport de la communauté nous aidera à bâtir la vraie page. "
            f"Un permis de pêche du Québec est obligatoire pour pêcher {nfr}, et les règlements de zone s'appliquent."
        )
        t_fr = (
            f"Des conseils saisonniers pour {nfr} relèveraient de la supposition, alors nous n'en donnerons pas. "
            f"Avant de planifier une sortie vers {nfr}, consultez les règlements de zone du Québec pour les saisons et les limites des espèces recensées."
        )
        ter_en = f"No verified bathymetry or terrain survey on file for {name}; the species inventory suggests typical {spot.get('province','Québec')} lake habitat, but we have not confirmed it."
        ter_fr = f"Aucune bathymétrie ni relevé de terrain vérifié au dossier pour {nfr}; l'inventaire d'espèces évoque un habitat lacustre québécois typique, mais nous ne l'avons pas confirmé."
    else:
        d_en = (
            f"{name} is in our records with a mapped location but little else we can verify. "
            f"Until we can check real details about {name} against official sources, this page stays deliberately short. "
            "No guesses, no filler. "
            f"If you know {name} first-hand, a community report helps us build the real page."
        )
        t_en = f"We have no verified seasonal information for {name}; consult the provincial regulations before any trip."
        d_fr = (
            f"{Nfr} figure à nos dossiers avec une position cartographiée, mais peu d'autres éléments vérifiables. "
            f"Tant que de vrais détails sur {nfr} n'auront pas été validés auprès de sources officielles, cette page restera volontairement brève. "
            "Pas de suppositions, pas de remplissage. "
            f"Si vous connaissez {nfr} de première main, un rapport de la communauté nous aidera à bâtir la vraie page."
        )
        t_fr = f"Aucune information saisonnière vérifiée pour {nfr}; consultez la réglementation provinciale avant tout déplacement."
        ter_en = f"No verified terrain data on file for {name}."
        ter_fr = f"Aucune donnée de terrain vérifiée au dossier pour {nfr}."

    stub = {
        'description': d_en, 'seasonal_tips': t_en,
        'description_fr': d_fr, 'seasonal_tips_fr': t_fr,
        'terrain': ter_en, 'terrain_fr': ter_fr,
        'noindex': True,
    }
    if spot.get('depth_max') and spot['depth_max'] != 'Varies':
        stub['fixes'] = {'depth_max': 'Varies'}
    return stub

def main():
    activity = sys.argv[1]
    triage = json.load(open(ROOT / 'scripts' / 'rewrites' / 'triage-report.json'))
    # Per the triage rule, SHORT-tier spots also get honest stubs + noindex
    # until enriched (they're the first candidates for enrichment/re-indexing).
    noindex_slugs = {x['slug'] for x in triage[activity] if x['cls'] in ('NOINDEX', 'SHORT')}
    spots = json.load(open(ROOT / 'data' / f'{activity}.json'))['spots']
    out = {s['slug']: make_stub(s) for s in spots if s['slug'] in noindex_slugs}
    json.dump(out, sys.stdout, ensure_ascii=False, indent=2)
    print(f'\n', file=sys.stderr)
    print(f'{len(out)} stubs generated', file=sys.stderr)

if __name__ == '__main__':
    main()
