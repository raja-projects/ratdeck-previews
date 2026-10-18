"""Validate the portable release (relative URLs) using only the Python standard library."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import json, re, xml.etree.ElementTree as ET

SOURCE = Path(__file__).resolve().parent
RELEASE = SOURCE.parent
CONFIG = json.loads((SOURCE / 'site-config.json').read_text())
BASE = CONFIG['siteUrl'].rstrip('/')
MOUNT = ''
ORIGIN = urlsplit(BASE)
ALIASES = {f'{slug}.html': f'/{slug}/' for slug in ['privacy', 'terms', 'refund', 'contact']}
errors = []

class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = []; self.refs = []; self.headings = []; self.title = ''
        self.in_title = False; self.in_ld = False; self.ld = ''; self.schemas = []
        self.canonical = None; self.description = None; self.robots = None
        self.refresh = None; self.body_mount = None; self.meta = {}
        self.answers = []; self.currency = None; self.tables = 0; self.table_headers = 0
        self.select_currency = False; self.errors = []
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if 'id' in a: self.ids.append(a['id'])
        if re.fullmatch(r'h[1-6]', tag): self.headings.append(int(tag[1]))
        if tag == 'title': self.in_title = True
        if tag == 'body': self.body_mount = a.get('data-base-path')
        if tag == 'script' and a.get('type') == 'application/ld+json':
            self.in_ld = True; self.ld = ''
        for attribute in ['href', 'src', 'action', 'poster']:
            if attribute in a and not (tag == 'link' and a.get('rel') == 'canonical'):
                self.refs.append(a[attribute])
        if tag == 'img' and 'alt' not in a: self.errors.append('Image missing alt')
        if tag == 'link' and a.get('rel') == 'canonical': self.canonical = a.get('href')
        if tag == 'meta':
            key = a.get('name', a.get('property', ''))
            self.meta[key] = a.get('content')
            if key == 'description': self.description = a.get('content')
            if key == 'robots': self.robots = a.get('content')
            if a.get('http-equiv', '').lower() == 'refresh': self.refresh = a.get('content')
        if 'data-question' in a: self.answers.append(a.get('id'))
        if tag == 'select' and 'data-currency' in a: self.select_currency = True
        if tag == 'option' and self.select_currency and 'selected' in a: self.currency = a.get('value')
        if tag == 'table': self.tables += 1
        if tag == 'th':
            self.table_headers += 1
            if a.get('scope') not in ['col', 'row']: self.errors.append('Table header missing scope')
    def handle_endtag(self, tag):
        if tag == 'title': self.in_title = False
        if tag == 'select': self.select_currency = False
        if tag == 'script' and self.in_ld:
            self.in_ld = False
            try: self.schemas.append(json.loads(self.ld))
            except ValueError: self.errors.append('Invalid JSON-LD')
    def handle_data(self, data):
        if self.in_title: self.title += data
        if self.in_ld: self.ld += data

def issue(file, message): errors.append({'file': str(file.relative_to(RELEASE)) if isinstance(file, Path) else file, 'error': message})
def local_target(ref, current):
    u = urlsplit(ref)
    if u.netloc:
        if (u.scheme, u.netloc) != (ORIGIN.scheme, ORIGIN.netloc): return None, None
    elif u.scheme: return None, None
    route = unquote(u.path)
    if u.netloc:
        target = RELEASE / route.lstrip('/')
    elif route.startswith('/') and current.name == '404.html':
        target = RELEASE / route.lstrip('/')
    elif route.startswith('/'):
        issue(current, 'Root-relative URL breaks under a subfolder: ' + ref); return None, None
    else: target = current.parent / route if route else current
    target = target.resolve()
    if not target.is_relative_to(RELEASE): issue(current, 'URL escapes release: ' + ref); return None, None
    if target.is_dir(): target = target / 'index.html'
    return target, unquote(u.fragment)

def string_values(value):
    if isinstance(value, str): yield value
    elif isinstance(value, list):
        for item in value: yield from string_values(item)
    elif isinstance(value, dict):
        for item in value.values(): yield from string_values(item)

pages = {}
for file in sorted(RELEASE.rglob('*.html')):
    if SOURCE in file.parents: issue(file, 'Source must not contain standalone HTML pages')
    raw = file.read_text()
    if 'chatgpt.site' in raw: issue(file, 'Private Site URL found')
    page = Page(); page.feed(raw); pages[file] = page

seen_titles = set(); seen_descriptions = set()
for file, page in pages.items():
    alias = file.relative_to(RELEASE).as_posix() in ALIASES
    for message in page.errors: issue(file, message)
    if page.headings.count(1) != 1: issue(file, 'Expected exactly one H1')
    if any(b > a + 1 for a, b in zip(page.headings, page.headings[1:])): issue(file, 'Skipped heading level')
    if len(page.ids) != len(set(page.ids)): issue(file, 'Duplicate IDs')
    if not page.title or page.title in seen_titles: issue(file, 'Empty or duplicate title')
    if not page.description or page.description in seen_descriptions: issue(file, 'Empty or duplicate description')
    seen_titles.add(page.title); seen_descriptions.add(page.description)
    if not page.canonical or not page.canonical.startswith(BASE + '/'): issue(file, 'Incorrect canonical base')
    if CONFIG.get('preview', True) and 'noindex' not in (page.robots or ''): issue(file, 'Preview missing noindex')
    if alias:
        expected = BASE + ALIASES[file.name]
        if page.canonical != expected or page.refresh != '0; url=' + ALIASES[file.name].strip('/') + '/': issue(file, 'Incorrect compatibility redirect')
    else:
        if not page.schemas: issue(file, 'Missing JSON-LD')
        if page.meta.get('og:url') != page.canonical: issue(file, 'OG URL differs from canonical')
        for field in ['og:image', 'twitter:image']:
            if page.meta.get(field) != BASE + '/assets/social-card.png': issue(file, 'Incorrect social image URL')
    references = page.refs + ([page.canonical] if page.canonical else [])
    for schema in page.schemas:
        references.extend(value for value in string_values(schema) if value.startswith(BASE + '/'))
    for ref in references:
        if not ref or ref == '#': issue(file, 'Empty URL'); continue
        target, fragment = local_target(ref, file)
        if target is None: continue
        if not target.exists(): issue(file, 'Missing target: ' + ref); continue
        if fragment and target in pages and fragment not in pages[target].ids:
            # JSON-LD entity fragment IDs are semantic identifiers, not DOM anchors.
            if fragment not in ['organization', 'website', 'webpage', 'software']:
                issue(file, 'Missing fragment: ' + ref)

xml = ET.fromstring((RELEASE / 'sitemap.xml').read_text())
urls = [element.text for element in xml.findall('{*}url/{*}loc')]
if len(urls) != len(set(urls)): issue('sitemap.xml', 'Duplicate URLs')
for url in urls:
    if not url.startswith(BASE + '/'): issue('sitemap.xml', 'Incorrect URL base'); continue
    target, _ = local_target(url, RELEASE / 'sitemap.xml')
    if not target or not target.exists(): issue('sitemap.xml', 'Missing target: ' + url)
    elif pages[target].canonical != url: issue('sitemap.xml', 'URL differs from target canonical')

content = json.loads((SOURCE / 'content.json').read_text())
answers = pages[RELEASE / 'answers/index.html'].answers
if len(answers) != len(content['faqs']) or set(answers) != {q['id'] for q in content['faqs']}: issue('answers/index.html', 'Incorrect answer coverage')
for relative in ['index.html', 'pricing/index.html']:
    if 'data-price="premium">$4.99<' not in (RELEASE / relative).read_text(): issue(relative, 'USD is not shown by default')
for fragment in ['faq', 'how', 'questions', 'how-it-works']:
    if fragment not in pages[RELEASE / 'index.html'].ids: issue('index.html', 'Missing current or legacy anchor: ' + fragment)
for file in (RELEASE / 'assets').glob('*.css'):
    for value in re.findall(r'url\(\s*[\"\x27]?([^\"\x27)]+)', file.read_text()):
        if not value.startswith(('data:', 'http:', 'https:', '//')) and not (file.parent / value).exists():
            issue(file, 'Missing CSS asset: ' + value)
js = (RELEASE / 'assets/site.js').read_text()
if 'contact/' not in js:
    issue('assets/site.js', 'Missing contact fallback')
for name in ['Tanishkha', 'Rajamurugan', '33BMVPA2143N2ZV', '7306812819', '629704', 'Swamythoppu']:
    for file, _ in pages.items():
        rel = file.relative_to(RELEASE).as_posix()
        text = file.read_text()
        if rel in ('terms/index.html', 'privacy/index.html'):
            if name not in text: issue(file, 'Business detail missing: ' + name)
        elif name in text: issue(file, 'Business detail outside Terms/Privacy: ' + name)
for file in pages:
    if re.search(r'\bR[a]ja\b', file.read_text()): issue(file, 'Private name found')
    if re.search(r'(?i)lemon ?squeezy|stripe|paddle', file.read_text()): issue(file, 'Non-Razorpay payment provider mentioned')
if 'chatgpt.site' in js or 'chatgpt.site' in (RELEASE / 'sitemap.xml').read_text(): issue('release', 'Private URL found')
if (RELEASE / '_headers').exists(): issue('_headers', 'Unsupported GitHub header file must be excluded')
if len(pages) != 30 or len(urls) != 25: issue('release', 'Expected 26 canonical pages + 4 redirects and 25 sitemap URLs')
backup = pages[RELEASE / 'guides/backup-and-changing-computers/index.html']
if backup.tables != 1 or backup.table_headers < 2: issue('backup guide', 'Expected the accessible storage table')

print(json.dumps({'htmlFiles': len(pages), 'canonicalPagesIncluding404': len(pages) - len(ALIASES), 'contentPages': len(urls), 'legacyRedirects': len(ALIASES), 'answers': len(answers), 'guides': len(content['guides']), 'storageTables': backup.tables, 'defaultCurrency': CONFIG['defaultCurrency'], 'basePath': MOUNT, 'errors': errors}, indent=2))
if errors: raise SystemExit(1)
