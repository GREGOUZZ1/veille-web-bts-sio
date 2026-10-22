#!/usr/bin/env python3
"""Collecte RSS/Atom hebdomadaire sans dependance Python externe."""
import datetime as dt
import email.utils
import hashlib
import html
import json
import pathlib
import re
import urllib.request
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor, as_completed

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / 'data' / 'articles.json'
FEEDS = {
    'CSS-Tricks': 'https://css-tricks.com/feed/',
    'web.dev': 'https://web.dev/feed.xml',
    'Smashing Magazine': 'https://www.smashingmagazine.com/feed/',
    'JavaScript Weekly': 'https://javascriptweekly.com/rss/',
}
TERMS = ('javascript', 'typescript', 'html', 'css', 'web', 'browser', 'frontend', 'front-end', 'accessibility', 'responsive', 'performance', 'react', 'vue', 'node', 'design', 'api', 'security', 'sécurité', 'develop', 'développ', 'framework', 'semantic', 'form', 'animation')
TAG = re.compile(r'<[^>]+>')
SPACE = re.compile(r'\s+')


def clean(value):
    return SPACE.sub(' ', html.unescape(TAG.sub(' ', value or ''))).strip()


def child_text(node, names):
    for child in node:
        if child.tag.split('}')[-1] in names and child.text:
            return child.text.strip()
    return ''


def category(title, desc):
    t = (title + ' ' + desc).lower()
    if any(x in t for x in ('security', 'sécurité', 'xss', 'csrf', 'vulnerab')):
        return 'Sécurité web'
    if any(x in t for x in ('accessibility', 'a11y', 'responsive', 'mobile', 'ux')):
        return 'Accessibilité & UX'
    if any(x in t for x in ('react', 'vue', 'angular', 'node', 'framework')):
        return 'Frameworks'
    if any(x in t for x in ('javascript', 'typescript', 'ecmascript', ' js ')):
        return 'JavaScript'
    if any(x in t for x in ('css', 'html', 'layout', 'grid')):
        return 'HTML & CSS'
    return 'Développement web'


def parse_date(raw):
    if not raw:
        return None
    try:
        parsed = email.utils.parsedate_to_datetime(raw)
        if parsed:
            return parsed.astimezone(dt.timezone.utc).date().isoformat()
    except (TypeError, ValueError, IndexError):
        pass
    try:
        return dt.datetime.fromisoformat(raw.replace('Z', '+00:00')).date().isoformat()
    except ValueError:
        return None


def fetch(feed):
    source, url = feed
    req = urllib.request.Request(url, headers={'User-Agent': 'BTS-SIO-Veille/1.0 (+RSS reader)', 'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml'})
    with urllib.request.urlopen(req, timeout=18) as response:
        payload = response.read(3_000_000)
    root = ET.fromstring(payload)
    entries = [e for e in root.iter() if e.tag.split('}')[-1] in ('item', 'entry')]
    results = []
    today = dt.datetime.now(dt.timezone.utc).date()
    for e in entries[:45]:
        title = clean(child_text(e, ('title',)))
        description = clean(child_text(e, ('description', 'summary', 'content')))
        link = child_text(e, ('link',))
        if not link:
            for c in e:
                if c.tag.split('}')[-1] == 'link' and c.attrib.get('href') and c.attrib.get('rel', 'alternate') == 'alternate':
                    link = c.attrib['href']
                    break
        published = parse_date(child_text(e, ('pubDate', 'published', 'updated', 'date')))
        if not (title and link and link.startswith('https://') and published):
            continue
        try:
            pubdate = dt.date.fromisoformat(published)
        except ValueError:
            continue
        if pubdate > today or (today - pubdate).days > 100:
            continue
        if not any(term in (title + ' ' + description).lower() for term in TERMS):
            continue
        results.append({
            'id': hashlib.sha256(link.encode('utf-8')).hexdigest()[:16],
            'title': title[:220], 'url': link, 'source': source,
            'date': published, 'category': category(title, description),
            'summary': (description[:350].rsplit(' ', 1)[0] + '…') if len(description) > 350 else (description or 'Lire cet article pour en savoir plus.'),
        })
    return results


def main():
    try:
        previous = json.loads(OUT.read_text(encoding='utf-8'))
        old = previous.get('articles', [])
    except (OSError, json.JSONDecodeError):
        old = []
    found, errors = [], []
    with ThreadPoolExecutor(max_workers=4) as pool:
        futures = {pool.submit(fetch, feed): feed[0] for feed in FEEDS.items()}
        for future in as_completed(futures):
            try:
                items = future.result()
                print(f'{futures[future]} : {len(items)} articles')
                found.extend(items)
            except Exception as exc:
                errors.append(f'{futures[future]} : {exc}')
    if not found:
        raise RuntimeError('Aucune source accessible : données existantes conservées. ' + '; '.join(errors))
    merged = {a['id']: a for a in old if isinstance(a, dict) and 'id' in a}
    for article in found:
        merged[article['id']] = article
    # Historique de 12 mois, sans doublons
    cutoff = (dt.datetime.now(dt.timezone.utc).date() - dt.timedelta(days=365)).isoformat()
    articles = sorted((a for a in merged.values() if a.get('date', '') >= cutoff), key=lambda a: (a['date'], a['id']), reverse=True)[:550]
    output = {'last_updated': dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds'), 'article_count': len(articles), 'errors': errors, 'articles': articles}
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(output, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'{len(articles)} articles enregistrés, {len(errors)} source(s) en erreur.')


if __name__ == '__main__':
    main()
