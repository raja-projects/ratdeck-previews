#!/usr/bin/env python3
"""Generate a portable, crawlable DewCue marketing site from reviewed content.
Run: python source/build.py from the release root. Public configuration contains no credentials.
"""
from pathlib import Path
from html import escape
import json, re
from urllib.parse import urlsplit

ROOT=Path(__file__).resolve().parent
DIST=ROOT.parent
CONFIG=json.loads((ROOT/'site-config.json').read_text())
CONTENT=json.loads((ROOT/'content.json').read_text())
BASE=CONFIG['siteUrl'].rstrip('/')
MOUNT=CONFIG.get('basePath','').rstrip('/')
if urlsplit(BASE).path.rstrip('/') != MOUNT:
 raise ValueError('basePath must match the path in siteUrl.')
if MOUNT and (not MOUNT.startswith('/') or '//' in MOUNT or '..' in MOUNT.split('/')):
 raise ValueError('basePath must be a normalized absolute URL path.')

def mount_html(html,path='/'):
 # Rewrite same-origin root-relative attribute values as document-relative URLs,
 # so the same files work in a subfolder (GitHub Pages preview) and at a domain root.
 # Absolute URLs, local anchors, mail links and protocol-relative URLs keep their meaning.
 depth=path.count('/')-1 if path.endswith('/') else path.count('/')-1
 prefix='../'*depth
 pattern=r'''\b(href|src|action|poster)=(["'])(/(?!/)[^"']*)\2'''
 def mounted(match):
  attr,quote,value=match.groups()
  rel=prefix+value[1:]
  if rel=='' : rel='./'
  elif rel.startswith('#'): rel='./'+rel
  return attr+'='+quote+rel+quote
 return re.sub(pattern,mounted,html)

PREVIEW=CONFIG.get('preview', True)
if CONFIG['indexable'] and PREVIEW:
 raise ValueError('A preview must not be indexable. Approve public content before changing preview=false.')
if not PREVIEW and not CONFIG.get('storeUrl') and not CONFIG.get('storeComingSoon'):
 raise ValueError('Add a verified Chrome Web Store URL before building the public release.')
if CONFIG.get('storeUrl') and not re.fullmatch(r'https://chromewebstore\.google\.com/detail/(?:[^/?#]+/)?[a-p]{32}(?:[?][^#]*)?', CONFIG['storeUrl']):
 raise ValueError('storeUrl must be an actual Chrome Web Store listing URL with a 32-character extension ID.')
PAGES=[]
FAQS={f['id']:f for f in CONTENT['faqs']}
e=lambda s:escape(str(s),quote=True)

ICONS={
'arrow':'<path d="M5 12h14m-5-5 5 5-5 5"/>',
'chevron':'<path d="m9 5 7 7-7 7"/>',
'check':'<path d="m5 12 4 4L19 6"/>',
'plus':'<path d="M12 5v14M5 12h14"/>',
'close':'<path d="m6 6 12 12M6 18 12 6"/>',
'menu':'<path d="M4 6h16M4 12h16M4 18h16"/>',
'bell':'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
'clock':'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
'lock':'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>',
'shield':'<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/>',
'mail':'<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m3 7 9 6 9-6"/>',
'folder':'<path d="M3 7a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v9H3V7Z"/>',
'focus':'<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6M12 2v3m7 1 2 2"/>',
'heart':'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0l-1 1-1-1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
'panel':'<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M15 4v16M6 8h5M6 12h5"/>',
'moon':'<path d="M20.8 13A9 9 0 0 1 11 3.2 9 9 0 1 0 20.8 13Z"/>',
'work':'<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V4h8v3M3 12c6 3 12 3 18 0M10 12h4v4h-4z"/>',
'book':'<path d="M12 5C8 2 3 3 3 3v16s5-1 9 2c4-3 9-2 9-2V3s-5-1-9 2Zm0 0v16"/>',
'home':'<path d="m3 10 9-7 9 7M5 9v12h14V9M9 21v-7h6v7"/>',
'pen':'<path d="m16 3 5 5L8 21H3v-5L16 3ZM13 6l5 5"/>',
'spark':'<path d="m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4L12 3Z"/>',
'search':'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
'copy':'<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
'globe':'<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
'link':'<path d="m10 13 4-4M8 16l-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 10a4 4 0 0 0 6 0l4-4a4 4 0 0 0-6-6l-1 1"/>',
'chrome':'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.6"/><path d="M12 8.4h8.1M8.9 13.8 4.7 6.5m9.4 8.4-4 5.9"/>',
'play':'<path d="m9 5 10 7-10 7V5Z"/>',
'cup':'<path d="M4 7h13v8a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V7Zm13 1h2a3 3 0 0 1 0 6h-2M7 3v1m4-1v1m4-1v1"/>',
'repeat':'<path d="m17 2 4 4-4 4M3 11V8a2 2 0 0 1 2-2h16M7 22l-4-4 4-4m14-1v3a2 2 0 0 1-2 2H3"/>'}

def icon(name,cls=''):
 return '<svg class="icon '+cls+'" viewBox="0 0 24 24" aria-hidden="true">'+ICONS.get(name,ICONS['spark'])+'</svg>'

def bird(name,alt='',cls='',loading='lazy'):
 return f'<img src="/assets/hummingbird-{name}.png" alt="{e(alt)}" class="{cls}" width="256" height="256" loading="{loading}" decoding="async">'

def brand():
 return '<a class="brand" href="/" aria-label="DewCue home"><img src="/assets/symbol.svg" alt="" width="30" height="30"><span>dewcue</span></a>'

def install(label='Get DewCue for Chrome',cls='btn-primary',small=False):
 c='btn '+cls+(' btn-small' if small else '')
 if CONFIG.get('storeUrl'):
  return f'<a class="{c}" href="{e(CONFIG["storeUrl"])}" rel="noopener" target="_blank">{icon("chrome")}{e(label)}</a>'
 return f'<button class="{c}" type="button" data-install>{icon("chrome")}{e(label)}</button>'

NAV=[('Features','/features/'),('Use cases','/use-cases/'),('Pricing','/pricing/'),('Guides','/guides/'),('Answers','/answers/')]
def header(path):
 nav=''.join(f'<a href="{url}"'+(' aria-current="page"' if path.startswith(url) else '')+f'>{label}</a>' for label,url in NAV)
 return f'<a class="skip-link" href="#main">Skip to content</a><header class="site-header"><div class="container header-inner">{brand()}<nav class="desktop-nav" aria-label="Main navigation">{nav}</nav><div class="header-actions">{install("Get DewCue",small=True)}<button type="button" class="icon-button menu-toggle" aria-label="Open menu" aria-expanded="false" aria-controls="mobile-menu">{icon("menu")}</button></div></div><nav id="mobile-menu" class="mobile-menu" aria-label="Mobile navigation" hidden>{nav}{install()}</nav></header>'

def footer():
 return f'''<footer class="site-footer"><div class="container"><div class="footer-main"><div class="footer-brand">{brand()}<p>Reminders, follow-ups and focus. Right inside Chrome.</p></div><div class="footer-column"><h2>Product</h2><a href="/features/">Explore features</a><a href="/pricing/">Plans & pricing</a><a href="/#demo">Try the demo</a><a href="/answers/">Your questions, answered</a></div><div class="footer-column"><h2>Use cases</h2><a href="/use-cases/work/">At work</a><a href="/use-cases/study/">While studying</a><a href="/use-cases/everyday-life/">Everyday life</a><a href="/use-cases/freelancers/">For freelancers</a></div><div class="footer-column"><h2>Resources</h2><a href="/about/">About DewCue</a><a href="/guides/">Practical guides</a><a href="/contact/">Talk to us</a><a href="/privacy/">Your privacy</a></div></div><div class="footer-bottom"><p>© 2026 DewCue. All rights reserved.</p><nav aria-label="Legal and site information"><a href="/terms/">Terms</a><a href="/privacy/">Privacy</a><a href="/refund/">Refunds</a><a href="/contact/">Contact</a><a href="/sitemap/">Sitemap</a></nav>{('<span class="preview-status">Website preview</span>' if PREVIEW else '<span>A little more headspace.</span>')}</div></div></footer>'''

def modals():
 return f'''<dialog id="install-dialog" class="modal" aria-labelledby="install-title"><div class="modal-inner"><button type="button" class="icon-button close-dialog" data-close-dialog aria-label="Close">{icon('close')}</button>{bird('good-morning',cls='modal-bird')}<h2 id="install-title">Your next little helper.</h2><p>{'This website preview is ready to explore. The verified Chrome Web Store link has not been connected yet.' if PREVIEW else 'Dewcue is arriving on the Chrome Web Store soon. In the meantime, take the interactive demo for a spin or drop us a line.'}</p><div class="modal-actions"><a class="btn btn-primary" href="/#demo" data-close-on-link>{icon('play')}Try the interactive demo</a><a class="btn btn-secondary" href="/contact/">Ask about availability {icon('arrow')}</a></div><small>{'Explore the design without installing anything.' if PREVIEW else 'No installation needed to try the demo.'}</small></div></dialog><dialog id="reminder-dialog" class="modal" aria-labelledby="reminder-title"><div class="modal-inner"><button type="button" class="icon-button close-dialog" data-close-dialog aria-label="Close">{icon('close')}</button><form id="demo-form" class="demo-form"><span class="eyebrow">A little space for your next task</span><h2 id="reminder-title">What’s on your mind?</h2><p>Add an example to the website demo.</p><label for="demo-title">Remind me to</label><input id="demo-title" name="title" type="text" maxlength="90" placeholder="Send the proposal" required autocomplete="off"><label for="demo-when">When</label><select id="demo-when" name="when"><option value="today">Today · 4:00 PM</option><option value="tomorrow">Tomorrow · 10:00 AM</option><option value="week">Next week · 9:00 AM</option></select><button class="btn btn-primary btn-wide" type="submit">Add to demo {icon('plus')}</button><small>This is a website demonstration. It does not schedule notifications or save reminders after you leave.</small></form></div></dialog><div id="toast" class="toast" role="status" aria-live="polite" hidden></div>'''

def breadcrumb(items):
 return '<nav class="container breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a>'+''.join(icon('chevron')+(f'<a href="{href}">{e(label)}</a>' if href else f'<span aria-current="page">{e(label)}</span>') for label,href in items)+'</nav>'

def pagehero(eyebrow,title,desc='',extra=''):
 return f'<section class="page-hero"><div class="container"><span class="eyebrow">{eyebrow}</span><h1>{title}</h1>'+ (f'<p>{desc}</p>' if desc else '')+extra+'</div></section>'

def finalcta():
 return f'''<section class="final-section"><div class="container"><div class="final-cta"><div><span class="eyebrow">Make room for what’s next</span><h2>Your day. A little clearer.</h2><p>Bring your reminders, follow-ups and focus time together in Chrome.</p></div><div class="cta-action">{install(cls="btn-light")}<small>Free to start · No account for reminders</small></div></div></div></section>'''

def faq_markup(ids=None,related=False):
 fs=[FAQS[x] for x in ids if x in FAQS] if ids else CONTENT['faqs']
 rows=[]
 for f in fs:
  link=f'<br><a class="text-link" href="{e(f["relatedHref"])}">{e(f["relatedLabel"])} {icon("arrow")}</a>' if related else ''
  rows.append(f'<details class="faq-anchor" id="{e(f["id"])}" data-question data-category="{e(f["category"])}"><summary>{e(f["question"])}</summary><div class="faq-answer">{e(f["answer"])}{link}</div></details>')
 return '<div class="faq-list">'+''.join(rows)+'</div>'

FEATURES=[
 {'id':'reminders','name':'Reminders','icon':'bell','eyebrow':'Natural-language reminders','title':'Set a reminder.<br>In your own words.','text':'“Pay rent on the 5th.” “Water every hour 9 to 6 weekdays.” Type it the way you’d say it, or tap a suggestion chip. When it’s time, a card appears right on your page with Done, Snooze and Reschedule, and it waits until you act.','href':'/guides/first-reminder/','link':'Meet your new reminder routine','points':['Everyday English','Suggestion chips','Cards that wait for you']},
 {'id':'email','name':'Email follow-ups','icon':'mail','eyebrow':'Email follow-ups','title':'Come back to<br>the conversation.','text':'Works on the webmail you already use. Tiny “Reply?”, “Follow up?” and “Due 3 PM” tags appear in your inbox list, and DewCue nudges you to check back. You read the reply and decide what to send. Your inbox stays yours.','href':'/guides/email-follow-ups/','link':'See how email follow-ups work','points':['Gmail, Outlook, Yahoo, Zoho & more','No email account access','You stay in control']},
 {'id':'buckets','name':'Buckets','icon':'folder','eyebrow':'Project notes & buckets','title':'Keep the context.<br>Know the next step.','text':'Keep a short update log for a client, a home project or a personal plan. Buckets bring your notes together, so the next step still makes sense when you come back. Search everything, or pause a bucket while it waits. Saved on this computer.','href':'/answers/#what-are-buckets','link':'A closer look at buckets','points':['Project update logs','Client notes','Stored locally']},
 {'id':'focus','name':'Focus & wellbeing','icon':'focus','eyebrow':'Focus & wellbeing','title':'Time to focus.<br>Space for a break.','text':'A stopwatch, a countdown with your own time, and Pomodoro live beside your reminders. The on-page ribbon keeps the timer in view, and a card lets you know when time’s up. Add optional nudges for water, posture, eyes or a break. Turn on what helps. Quiet the rest.','href':'/guides/focus-and-breaks/','link':'Build a focus and break routine','points':['Stopwatch, countdown & Pomodoro','Optional wellness nudges','Quiet hours & mute']}
]

def feature_visual(fid):
 if fid=='reminders':
  return '<div class="mini-window"><div class="mini-label">A thought, in your own words</div><div class="natural-input">Call mom <mark>tomorrow at 6</mark></div><div class="parsed-line">'+icon('clock')+' Tomorrow · 6:00 PM</div><div class="mini-save">Reminder ready</div><small>Check the time, then get on with your day.</small></div>'
 if fid=='email':
  return '<div class="mini-window"><div class="email-line"><span class="email-avatar">JD</span><div><strong>Website proposal</strong><small>Jamie Davis · Example email</small></div></div><div class="mini-label">A follow-up for your future self</div><div class="natural-input">Check back on the proposal</div><div class="follow-up-tag">'+icon('clock')+' Tomorrow · 10:00 AM</div><small>You check for a reply. DewCue reminds you.</small></div>'
 if fid=='buckets':
  return '<div class="mini-window"><div class="app-brand">'+icon('folder')+' Website project</div><div class="bucket-item">Shared the first design<small>Monday · Project update</small></div><div class="bucket-item">Client liked the new direction<small>Tuesday · A little progress</small></div><div class="bucket-item">Next: revise the home page<small>Ready when you come back</small></div></div>'
 return '<div class="mini-window centered"><div class="mini-label">A little time for deep work</div><div class="timer-dial"><strong data-timer-display>25:00</strong><span data-timer-label>Focus session</span></div><div class="timer-controls"><button type="button" class="btn btn-primary" data-timer-toggle>Start demo</button><button type="button" class="btn btn-secondary" data-timer-reset>Reset</button></div><small>Website timer demo · no notifications</small></div>'

def feature_panel(f,i=0,tabs=True):
 heading='h3' if tabs else 'h2'
 color={'email':'email-preview','buckets':'bucket-preview','focus':'focus-preview'}.get(f['id'],'')
 pts=''.join(f'<span>{icon("check")}{e(p)}</span>' for p in f['points'])
 attrs=f' id="feature-{f["id"]}" role="tabpanel" aria-labelledby="tab-{f["id"]}"'+(' hidden' if i else '') if tabs else ''
 return f'<div class="feature-panel"{attrs}><div class="feature-visual {color}">{feature_visual(f["id"])}</div><div class="feature-detail"><span class="eyebrow">{f["eyebrow"]}</span><{heading}>{f["title"]}</{heading}><p>{f["text"]}</p><div class="feature-points">{pts}</div><a href="{f["href"]}" class="text-link">{f["link"]}{icon("arrow")}</a></div></div>'

def smallcards(data):
 return '<div class="small-features">'+''.join(f'<article class="small-feature"><div class="small-icon">{icon(ic)}</div><div><h3>{title}</h3><p>{text}</p>'+(f'<a class="text-link" href="{href}">{label} {icon("arrow")}</a>' if href else '')+'</div></article>' for ic,title,text,href,label in data)+'</div>'

NEW_FEATURES=[
 ('bell','Cards that wait for you','Reminder cards appear at the top right of your page with Done, Snooze, Reschedule, Open page and Join for meeting links. They stay until you act, even after Chrome has been idle. Prefer system notifications? Choose those, or both.','/answers/#notification-options','Where reminders appear'),
 ('moon','While you were away','Stepped away for a while? A short summary shows the reminders you missed, so nothing slips quietly by.','/answers/#while-you-were-away','About the summary'),
 ('spark','A slim on-page ribbon','The hummingbird ribbon shows a running timer or your next reminder. Drag it where you like, or hide it on any site.','/answers/#on-page-ribbon','Meet the ribbon'),
 ('pen','Sticky notes on any page','Pin a note to a page and it reappears when you come back. Turn it into a reminder in one tap. 10 notes on Free, unlimited on Premium.','/answers/#page-sticky-notes','How sticky notes work'),
 ('mail','Follow-ups on any webmail','Gmail, Outlook, Yahoo, Zoho and Hostinger webmail. Small “Reply?”, “Follow up?” and “Due 3 PM” tags appear in your inbox list, with no access to your email account.','/guides/email-follow-ups/','See email follow-ups'),
 ('focus','Can’t miss mode <span class="plan-badge">Premium</span>','For the reminders that really matter, the chime repeats until you mark it done. Soft chimes, volume and quiet hours are yours to set.','/answers/#cant-miss-mode','About Can’t miss mode'),
 ('cup','Water & medicine log <span class="plan-badge">Premium</span>','Log a glass of water or a dose of medicine and watch a gentle streak grow. No pressure, just a kind nudge.','/pricing/','Compare plans'),
 ('clock','Calendar view & full history <span class="plan-badge">Premium</span>','See your reminders on a calendar and look back over everything you’ve done. Free keeps the last 7 days of history.','/pricing/','Compare plans'),
 ('globe','Made to fit your day','Side panel, right-click menu and the Alt+Shift+D shortcut. 12- or 24-hour clock, English, Hindi and Tamil, light and dark themes, with Sunrise, Sea and Ink on Premium.','/answers/#languages-and-shortcuts','Languages and shortcuts'),
]
def whatsnew(heading='h2'):
 return f'<div class="intro-heading" style="margin-top:72px"><span class="eyebrow">What’s new in DewCue</span><{heading}>Little helpers, right where you are.</{heading}><p>Fresh ways to keep the next step in view, without leaving the page you’re on.</p></div>'+smallcards(NEW_FEATURES)

def smallfeatures():
 data=[('panel','Keep your work in view','Keep the same reminders in Chrome’s side panel while the page stays in view.','/guides/chrome-side-panel/','Explore the side panel'),('moon','Quiet when you need it','Soft chimes with an on/off switch and volume, plus quiet hours. Make space for meetings, evenings and you.','/guides/focus-and-breaks/','Plan your focus routine'),('heart','Make time for the everyday','Birthdays, milestones and a glass of water. Backups run daily, and you can download, import or export to CSV.','/guides/birthdays-and-milestones/','Read about birthdays and milestones')]
 return smallcards(data)

CASE_NAMES={'work':('At work','work','Follow up. Keep promises. Clear your head.','See work reminders'),'study':('While studying','book','A place for deadlines, focus and fresh starts.','Find your study rhythm'),'everyday-life':('Everyday life','home','The small things that make a day feel good.','Make space for life'),'freelancers':('Freelance life','pen','Keep clients and the next step in the picture.','Bring your work together')}
def usecasecards(heading='h3'):
 examples={'work':'“Follow up on the proposal tomorrow.”','study':'“Review my notes at 7 tonight.”','everyday-life':'“Call mom tomorrow at 6.”','freelancers':'“Check the client feedback on Friday.”'}
 return '<div class="usecase-grid">'+''.join(f'<a href="/use-cases/{slug}/" class="usecase-card"><div class="case-card-top"><div class="case-icon">{icon(ic)}</div><span class="case-card-arrow">{icon("arrow")}</span></div><{heading}>{title}</{heading}><p>{desc}</p><div class="usecase-example">{examples[slug]}</div><span class="text-link">{label}{icon("arrow")}</span></a>' for slug,(title,ic,desc,label) in CASE_NAMES.items())+'</div>'

GUIDE_BIRDS={'first-reminder':'good-morning','email-follow-ups':'email','focus-and-breaks':'timer','browser-notifications':'task-done','reminders-from-web-pages':'saved-to-bucket','chrome-side-panel':'task-done','birthdays-and-milestones':'streak','backup-and-changing-computers':'while-you-were-away','activate-premium':'good-morning'}

def guidecards(limit=None,heading='h3'):
 gs=CONTENT['guides'][:limit] if limit else CONTENT['guides']
 return ''.join(f'<a class="guide-card" href="/guides/{g["slug"]}/"><div class="guide-art">{bird(GUIDE_BIRDS[g["slug"]])}</div><div class="guide-info"><div class="guide-meta"><span>{e(g["category"])}</span><span>·</span><span>{e(g["readTime"])}</span></div><{heading}>{e(g["title"])}</{heading}>'+ (f'<p>{e(g["description"])}</p>' if not limit else '')+f'<span class="text-link">Read the guide {icon("arrow")}</span></div></a>' for g in gs)

def guide_section(section,index):
 body=''.join('<p>'+e(p)+'</p>' for p in section.get('paragraphs',[]) if PREVIEW or not p.startswith('This is a website preview;'))
 if section.get('table'):
  table=section['table'];caption=table['caption']
  head='<thead><tr>'+''.join('<th scope="col">'+e(h)+'</th>' for h in table['headers'])+'</tr></thead>'
  rows=''.join('<tr><th scope="row">'+e(row[0])+'</th>'+''.join('<td>'+e(cell)+'</td>' for cell in row[1:])+'</tr>' for row in table['rows'])
  body+=f'<div class="article-table-wrap" role="region" aria-label="{e(caption)}" tabindex="0"><table class="article-table"><caption>{e(caption)}</caption>'+head+'<tbody>'+rows+'</tbody></table></div>'
 if section.get('steps'):
  body+='<ol>'+''.join('<li>'+e(step)+'</li>' for step in section['steps'])+'</ol>'
 if section.get('links'):
  body+='<ul class="article-links">'+''.join(f'<li><a href="{e(link["href"])}">{e(link["label"])}</a></li>' for link in section['links'])+'</ul>'
 return f'<section id="section-{index}"><h2>{e(section["heading"])}</h2>'+body+'</section>'

def guide_resources(guide):
 guides={g['slug']:g for g in CONTENT['guides']}
 related=guide.get('relatedGuides',[])
 body=''
 if related:
  body+='<section id="related-guides"><h2>Keep exploring</h2><ul class="article-links">'+''.join(f'<li><a href="/guides/{e(slug)}/">{e(guides[slug]["title"])}</a></li>' for slug in related)+'</ul></section>'
 sources=guide.get('sources',[{'label':'DewCue Privacy Policy','href':'/privacy/'},{'label':'DewCue Terms of Service','href':'/terms/'}])
 body+='<section class="article-sources" id="product-sources"><h2>Sources and product details</h2><p>This guide is based on DewCue’s published product information and the sources below.</p><ul class="article-links">'+''.join(f'<li><a href="{e(source["href"])}">{e(source["label"])}</a></li>' for source in sources)+'</ul></section>'
 return body

def pricing(comparison=False,heading='h3'):
 # USD is shown first. assets/pricing.js switches to INR for India (saved choice,
 # then a geo lookup, then the India timezone) and shows one currency at a time.
 currency='USD'
 initial={'free':'$0','premium':'$4.99','lifetime':'$99','saving':'Save 35%','premiumNote':'Billed monthly. Pay by card.','lifetimeNote':'Pay once by card. First 500 buyers.','paymentNote':'Secure card checkout by Razorpay. Start free, with a 14-day Premium trial and no card needed.'}
 def checks(items):return '<ul class="plan-features">'+''.join('<li>'+icon('check')+x+'</li>' for x in items)+'</ul>'
 free=checks(['Natural-language reminders & on-page cards','5 repeating reminders · 3 alarms','3 buckets for projects and notes','Stopwatch, custom countdown & Pomodoro','Email follow-up tags on any webmail · 10 captured emails each month','10 page sticky notes · on-page ribbon','2 wellness nudges · 5 birthdays · 1 milestone','Last 7 days of history · light & dark themes'])
 premium=checks(['Everything in Free, with the free limits removed','“Can’t miss” mode: the chime repeats until done','Full history and a calendar view','Water & medicine log with gentle streaks','Unlimited page sticky notes','Sunrise, Sea and Ink themes','Cancel any time; keep your paid-period access'])
 lifetime=checks(['Premium features for as long as the extension is offered','No monthly or yearly renewal','Limited offer for the first 500 buyers','7-day refund request window'])
 switch=f'<button type="button" class="text-link currency-switch" data-currency-switch>In India? Pay in ₹ with UPI {icon('arrow')}</button>'
 out=f'''<div class="price-controls" data-pricing><div class="segmented" role="group" aria-label="Billing period"><button type="button" data-billing="monthly" aria-pressed="true">Monthly</button><button type="button" data-billing="yearly" aria-pressed="false">Yearly <span class="save-label" data-save-label>{e(initial["saving"])}</span></button></div>{switch}</div><div class="pricing-grid"><article class="pricing-card"><div class="plan-label"><{heading}>Free</{heading}></div><p class="plan-intro">The essentials for your everyday tasks.</p><div class="plan-price"><span data-price="free">{e(initial["free"])}</span><span class="price-period">Free plan</span></div><p class="plan-note">For your everyday reminders.</p>{install('Start with Free','btn-secondary btn-wide')}{free}</article><article class="pricing-card featured"><div class="plan-label"><{heading}>Premium</{heading}><span class="plan-badge">14-day trial · no card</span></div><p class="plan-intro">More flexibility for a busy day.</p><div class="plan-price"><span data-price="premium">{e(initial["premium"])}</span><span class="price-period" data-premium-period>/ month</span></div><p class="plan-note" data-premium-note>{e(initial["premiumNote"])}</p>{install('Explore Premium','btn-primary btn-wide')}{premium}</article><article class="pricing-card"><div class="plan-label"><{heading}>Lifetime</{heading}><span class="plan-badge">First 500 offer</span></div><p class="plan-intro">Premium, with a single payment.</p><div class="plan-price"><span data-price="lifetime">{e(initial["lifetime"])}</span><span class="price-period">once</span></div><p class="plan-note" data-lifetime-note>{e(initial["lifetimeNote"])}</p>{install('Explore Lifetime','btn-secondary btn-wide')}{lifetime}</article></div><p class="pricing-note" data-payment-note>{e(initial["paymentNote"])}</p><p class="pricing-note"><a class="text-link" href="/refund/">7-day refund policy {icon('arrow')}</a></p>'''
 if comparison:
  rows=[('Natural-language reminders & on-page cards','Included','Included'),('Repeating reminders','5','Free limits removed'),('Alarms','3','Free limits removed'),('Buckets','3','Free limits removed'),('Page sticky notes','10','Unlimited'),('Email follow-up tags on webmail','Included','Included'),('Captured emails','10 per month','Free limits removed'),('Wellness nudges','2','Free limits removed'),('Birthdays / milestones','5 / 1','Free limits removed'),('Stopwatch, custom countdown & Pomodoro','Included','Included'),('On-page ribbon & “While you were away”','Included','Included'),('Backups, import & CSV export','Included','Included'),('History','Last 7 days','Full history'),('“Can’t miss” mode','Not included','Included'),('Water & medicine log with streaks','Not included','Included'),('Calendar view','Not included','Included'),('Themes','Light & dark','Plus Sunrise, Sea & Ink')]
  out+='<div class="pricing-comparison"><table class="comparison-table"><caption>A closer look at what’s included</caption><thead><tr><th scope="col">Feature</th><th scope="col">Free</th><th scope="col">Premium & Lifetime</th></tr></thead><tbody>'+''.join('<tr>'+f'<th scope="row">{a}</th><td>{b}</td><td>{c}</td></tr>' for a,b,c in rows)+'</tbody></table></div>'
  out+='<div class="answer-box" style="margin-top:32px"><h2>All published prices</h2><p data-currency-only="USD">Premium: $4.99/month or $39/year. Lifetime: $99 for the first 500 buyers. Prices in US dollars, paid by card through Razorpay. This preview has no live checkout or verified remaining Lifetime count.</p><p data-currency-only="INR" hidden>Premium: ₹199/month or ₹1,990/year. Lifetime: ₹4,990 for the first 500 buyers. All prices in India are plus 18% GST, paid with UPI or card through Razorpay. This preview has no live checkout or verified remaining Lifetime count.</p></div>'
 if not PREVIEW:
  out=out.replace(' This preview has no live checkout or verified remaining Lifetime count.',' Check current Lifetime availability before purchasing.')
 return out

def demo():
 rows=[('Drink a little water','10:30 AM · Every day','You','mint'),('Send the proposal','11:00 AM · Today','Work',''),('A moment away from the screen','12:00 PM · Every day','You','peach')]
 rowhtml=''.join(f'<div class="reminder-row"><button class="task-check" type="button" role="checkbox" aria-checked="false" aria-label="Complete {e(t)}" data-task="{i}"></button><div><div class="task-text">{t}</div><div class="task-meta">{icon("clock")}{m}</div></div><span class="task-tag {c}">{tag}</span></div>' for i,(t,m,tag,c) in enumerate(rows))
 return f'''<div class="hero-art" id="demo"><div class="art-backdrop" aria-hidden="true"></div><div class="app-window"><div class="window-topbar"><div class="window-dots" aria-hidden="true"><i></i><i></i><i></i></div><span>{icon('lock')}Your space in Chrome</span><span class="window-extension" aria-hidden="true">{icon('panel')}</span></div><div class="app-shell"><div class="app-rail" aria-hidden="true"><img src="/assets/symbol.svg" alt="" width="28" height="28"><span class="rail-item rail-active">{icon('bell')}</span><span class="rail-item">{icon('folder')}</span><span class="rail-item">{icon('focus')}</span><span class="rail-item rail-bottom">{icon('moon')}</span></div><div class="app-main"><div class="app-body"><div class="app-header"><span class="app-brand">dewcue</span><span class="demo-pill"><i aria-hidden="true"></i>Website demo</span></div><div class="app-greeting">Here’s what’s next.</div><p class="app-caption">Your reminders. One clear list.</p><div class="demo-tabs" role="tablist" aria-label="Demo reminders"><button type="button" class="demo-tab" role="tab" id="demo-tab-today" aria-controls="demo-list" aria-selected="true" data-demo-tab="today">Today <span class="demo-count" data-count="today">3</span></button><button type="button" class="demo-tab" role="tab" id="demo-tab-upcoming" aria-controls="demo-list" aria-selected="false" tabindex="-1" data-demo-tab="upcoming">Upcoming <span class="demo-count" data-count="upcoming">2</span></button><button type="button" class="demo-tab" role="tab" id="demo-tab-done" aria-controls="demo-list" aria-selected="false" tabindex="-1" data-demo-tab="done">Done <span class="demo-count" data-count="done">0</span></button></div><div id="demo-list" class="demo-list" role="tabpanel" aria-labelledby="demo-tab-today">{rowhtml}</div><button type="button" class="demo-add" data-add-reminder>{icon('plus')}Add a reminder<span>{icon('arrow')}</span></button></div><div class="app-bottom"><span>{icon('shield')}No account for reminders</span><button type="button" class="icon-button" data-reset-demo aria-label="Reset website demo">{icon('repeat')}</button></div></div></div></div><div class="floating-reminder">{bird('water')}<div><small>YOUR NEXT LITTLE NUDGE</small><strong>Time for a sip of water.</strong><p>Pause. Refresh. Carry on.</p></div><span class="notification-check" aria-hidden="true">{icon('check')}</span></div><p class="demo-caption">Try adding or completing a task. This website demo doesn’t schedule notifications.</p></div>'''

def homepage():
 tabs=''.join(f'<button type="button" class="feature-tab" role="tab" id="tab-{f["id"]}" aria-controls="feature-{f["id"]}" aria-selected="{str(i==0).lower()}"'+(' tabindex="-1"' if i else '')+f' data-feature-tab="{f["id"]}">{icon(f["icon"])}{f["name"]}</button>' for i,f in enumerate(FEATURES))
 return f'''
<section class="hero"><div class="container hero-grid"><div class="hero-copy"><span class="hero-badge">{icon('chrome')}REMINDER EXTENSION FOR CHROME</span><h1>Your reminders.<br><span class="hero-emphasis">Right inside Chrome.</span></h1><p class="hero-description">Set reminders in everyday English, follow up on emails, and make time to focus. Keep the next step close while you get on with your day.</p><ul class="hero-benefits"><li>{icon('check')}Your tasks and follow-ups, in one place</li><li>{icon('check')}On-page cards or system notifications</li><li>{icon('check')}No account needed for reminders</li></ul><div class="hero-ctas">{install()}<a href="#demo" class="btn btn-ghost" data-try-demo>{icon('play')}Try the demo</a></div><p class="hero-note">{icon('shield')}Free to start. Upgrade when you need more.</p></div>{demo()}</div></section>
<nav class="page-jumpbar" aria-label="Explore this page"><div class="container jumpbar-inner"><span>Explore DewCue</span><a href="#features">Features</a><a href="#how-it-works">How it works</a><a href="#use-cases">Use cases</a><a href="#pricing">Pricing</a><a href="#questions">FAQ</a></div></nav>
<section class="section intro-section" id="features"><div class="container"><div class="intro-heading"><span class="eyebrow">LESS SWITCHING. MORE DOING.</span><h2>One place for your next step.</h2><p>From a quick reminder to a focused afternoon. Find the tools that fit the way you work.</p></div><div class="feature-tabs" role="tablist" aria-label="Explore DewCue features">{tabs}</div>{''.join(feature_panel(f,i) for i,f in enumerate(FEATURES))}<p class="feature-footnote">Illustrative product screens. Explore the guides for feature details and plan limits.</p>{smallfeatures()}{whatsnew()}</div></section>
<section class="how-section section" id="how-it-works"><span id="how" aria-hidden="true"></span><div class="container"><div class="how-inner"><div class="how-intro"><span class="eyebrow">A SMALL HABIT. A CLEARER DAY.</span><h2>From “don’t forget”<br>to taken care of.</h2><p>Three simple steps to bring your next task back at the right time.</p></div><div class="steps"><article class="step"><span class="step-num">01</span><h3>Add DewCue to Chrome</h3><p>Get started with your reminders. There’s no DewCue account to create.</p><span class="step-icon" aria-hidden="true">{icon('chrome')}</span></article><article class="step"><span class="step-num">02</span><h3>Write it. Check the time.</h3><p>“Call mom tomorrow at 6.” Use your own words, then check the date and time.</p><span class="step-icon" aria-hidden="true">{icon('pen')}</span></article><article class="step"><span class="step-num">03</span><h3>Get the nudge you need</h3><p>Mark it done, snooze it, or remind yourself again. Carry on with your day.</p><span class="step-icon" aria-hidden="true">{icon('bell')}</span></article></div></div></div></section>
<section class="section usecase-section" id="use-cases"><div class="container"><div class="section-head"><div><span class="eyebrow">BUILT AROUND YOUR DAY</span><h2>Made for work.<br>Useful beyond it.</h2></div><a href="/use-cases/" class="text-link">Explore all use cases {icon('arrow')}</a></div>{usecasecards()}</div></section>
<section class="section privacy-section"><div class="container privacy-grid"><div class="privacy-art"><div class="privacy-card"><span class="privacy-card-icon">{icon('shield')}</span><p class="privacy-card-title">Privacy, made clear.</p><p>You choose what to save.</p><div class="storage-row"><span>{icon('bell')}Reminders</span><strong>Chrome sync</strong></div><div class="storage-row"><span>{icon('folder')}Notes & buckets</span><strong>This computer</strong></div><div class="storage-row"><span>{icon('mail')}Email account access</span><strong>Never needed</strong></div><a class="privacy-card-link" href="/privacy/">Read the full policy {icon('arrow')}</a></div><span class="privacy-label">{icon('lock')}Your day is your business.</span></div><div class="privacy-copy"><span class="eyebrow">YOUR INFORMATION. YOUR CHOICES.</span><h2>Useful reminders.<br>Clear boundaries.</h2><p>No account. No ads. No new-tab takeover. No browsing-history collection. Clear choices about the information you save.</p><ul class="privacy-list"><li>{icon('check')}Reminders and selected preferences can sync through Chrome.</li><li>{icon('check')}Buckets, notes, timers, history and backups stay on this computer.</li><li>{icon('check')}Email tags use only what’s visible on webmail pages you open, when you turn them on.</li></ul><a class="text-link" href="/privacy/">See what’s stored and where {icon('arrow')}</a></div></div></section>
<section class="section pricing-section" id="pricing"><div class="container"><div class="centered pricing-heading"><span class="eyebrow">A PLAN FOR THE WAY YOU WORK</span><h2>Start free.<br>Upgrade when you need more.</h2><p>Choose your plan. Keep your day moving.</p><div class="pricing-assurances"><span>{icon('check')}Free plan available</span><span>{icon('check')}14-day Premium trial</span><span>{icon('check')}7-day refund window</span></div></div>{pricing()}<div class="centered plan-detail-link"><a href="/pricing/" class="text-link">Compare all plan details {icon('arrow')}</a></div></div></section>
<section class="section faq-section" id="questions"><span id="faq" aria-hidden="true"></span><div class="container faq-layout"><div class="faq-intro"><span class="eyebrow">THE DETAILS THAT MATTER</span><h2>Your questions.<br>Answered.</h2><p>How it works, what’s included, and where your data lives. Get the useful details before you start.</p><a class="text-link" href="/answers/">Explore all {len(CONTENT['faqs'])} answers {icon('arrow')}</a><div class="faq-support">Still have a question?<br><a href="/contact/">Talk to us {icon('arrow')}</a></div></div>{faq_markup(['what-is-dewcue','account-required','capture-email-follow-up','sync-and-local-data','browser-closed-notifications','premium-trial'])}</div></section>
<section class="section guides-section"><div class="container"><div class="section-head"><div><span class="eyebrow">GET MORE FROM DEWCUE</span><h2>A good place to get started.</h2></div><a href="/guides/" class="text-link">View all guides {icon('arrow')}</a></div><div class="guides-grid">{guidecards(3)}</div></div></section>{finalcta()}'''

def page(path,title,description,body,crumbs=None,software=False,article=None):
 canon=BASE+path
 graph=[{'@type':'Organization','@id':BASE+'/#organization','name':'DewCue','url':BASE+'/about/','email':CONFIG.get('supportEmail'),'brand':{'@type':'Brand','name':'DewCue','logo':BASE+'/assets/symbol.svg'}}, {'@type':'WebSite','@id':BASE+'/#website','url':BASE+'/','name':'DewCue','description':'Gentle reminders, on-page cards, email follow-ups, sticky notes and focus timers for Chrome.','publisher':{'@id':BASE+'/#organization'}}, {'@type':'WebPage','@id':canon+'#webpage','url':canon,'name':title,'description':description,'isPartOf':{'@id':BASE+'/#website'},'inLanguage':'en'}]
 if crumbs:
  items=[{'@type':'ListItem','position':1,'name':'Home','item':BASE+'/'}]
  items.extend({'@type':'ListItem','position':i+2,'name':label,'item':BASE+(href or path)} for i,(label,href) in enumerate(crumbs))
  graph.append({'@type':'BreadcrumbList','itemListElement':items})
 if software:
  graph.append({'@type':'SoftwareApplication','@id':BASE+'/#software','name':'DewCue','url':BASE+'/','description':'Chrome reminder extension with natural-language reminders, on-page reminder cards, email follow-ups on webmail, page sticky notes, buckets and timers.','applicationCategory':'ProductivityApplication','softwareRequirements':'Google Chrome','publisher':{'@id':BASE+'/#organization'},'image':BASE+'/assets/social-card.png','featureList':['Natural-language reminders with suggestion chips','On-page reminder cards','System notifications','While you were away summary','On-page ribbon','Page sticky notes','Email follow-ups on any webmail','Stopwatch, countdown and Pomodoro timer','Project buckets','Side panel','English, Hindi and Tamil','Backups and CSV export']})
 if article:
  sources=article.get('sources',[{'href':'/privacy/'},{'href':'/terms/'}])
  graph.append({'@type':'Article','headline':article['title'],'description':article['description'],'mainEntityOfPage':{'@id':canon+'#webpage'},'author':{'@id':BASE+'/#organization'},'publisher':{'@id':BASE+'/#organization'},'inLanguage':'en','image':BASE+'/assets/social-card.png','dateModified':article.get('reviewedDate',CONFIG['sourceReviewed']),'citation':[BASE+s['href'] if s['href'].startswith('/') else s['href'] for s in sources]})
 robots='index, follow' if CONFIG['indexable'] else 'noindex, follow'
 basecrumb=breadcrumb(crumbs) if crumbs else ''
 html=f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>{e(title)}</title><meta name="description" content="{e(description)}"><meta name="robots" content="{robots}"><meta name="theme-color" content="#110c29"><meta name="referrer" content="strict-origin-when-cross-origin"><link rel="canonical" href="{e(canon)}"><link rel="icon" href="/assets/symbol.svg" type="image/svg+xml"><link rel="preload" href="/assets/dm-sans-latin.woff2" as="font" type="font/woff2" crossorigin><meta property="og:type" content="{'article' if article else 'website'}"><meta property="og:site_name" content="DewCue"><meta property="og:title" content="{e(title)}"><meta property="og:description" content="{e(description)}"><meta property="og:url" content="{e(canon)}"><meta property="og:image" content="{BASE}/assets/social-card.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="DewCue: Your reminders. Right inside Chrome."><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="{e(title)}"><meta name="twitter:description" content="{e(description)}"><meta name="twitter:image" content="{BASE}/assets/social-card.png"><link rel="stylesheet" href="/assets/site.css"><script type="application/ld+json">{json.dumps({'@context':'https://schema.org','@graph':graph},ensure_ascii=False).replace('</','<\\/')}</script><script src="/assets/site.js" defer></script><script src="/assets/pricing.js" defer></script></head><body class="{'page-home' if path=='/' else 'page-inner'}">{header(path)}<noscript><p class="nojs-note">You can read all pages without JavaScript. Interactive demos, price switches and answer filters need JavaScript.</p></noscript><main id="main">{basecrumb}{body}</main>{footer()}{modals()}</body></html>'''
 dest=DIST/('index.html' if path=='/' else path.lstrip('/') if path.endswith('.html') else path.lstrip('/')+'index.html')
 dest.parent.mkdir(parents=True,exist_ok=True);dest.write_text(html if path=='/404.html' else mount_html(html,path))
 if path!='/404.html': PAGES.append({'path':path,'title':title,'description':description})


def build():
 page('/','DewCue | Chrome Reminders, Email Follow-ups & Focus','Set Chrome reminders in everyday English. DewCue brings email follow-ups, project notes, focus timers and optional wellbeing nudges into one extension.',homepage(),software=True)
 page('/features/','DewCue Features | Reminders, Follow-ups, Timers & Buckets','Explore DewCue’s Chrome reminders, on-page cards, page sticky notes, email follow-ups on any webmail, buckets, timers and side panel. Clear features, clear limits.',pagehero('Your next step, within reach','Less to keep in your head.<br><em class="display">More ways to get it done.</em>','Reminders, follow-ups and everyday routines, together in Chrome. Pick the pieces that make your day feel lighter.')+'<section class="section-tight"><div class="container">'+''.join('<section class="feature-long">'+feature_panel(f,tabs=False)+'</section>' for f in FEATURES)+smallfeatures()+whatsnew()+'<p class="feature-footnote">DewCue works on Google Chrome. Free plan limits and Premium features are listed on the <a class="text-link" href="/pricing/">pricing page</a>.</p></div></section>'+finalcta(),[('Features',None)],software=True)
 page('/use-cases/','DewCue Use Cases | Work, Study & Everyday Reminders','See how DewCue helps you remember work follow-ups, study deadlines, everyday routines and freelance next steps. Practical examples for the day you have.',pagehero('Made for the day you have','Make room for<br><em class="display">your kind of day.</em>','A client to follow up with. A deadline to remember. A moment to look away from the screen. Start with what matters to you.')+'<section class="section-tight"><div class="container">'+usecasecards(heading='h2')+'</div></section>'+finalcta(),[('Use cases',None)])
 for c in CONTENT['useCases']:
  slug=c['slug'];name,ic,_,_=CASE_NAMES[slug]
  ex=f'<div class="case-hero-example">{bird("email" if slug=="freelancers" else "good-morning")}<div><small>An everyday example</small><strong>{e(c["example"])}</strong></div></div>'
  benefits='<section class="section-tight"><div class="container benefit-grid">'+''.join(f'<article class="benefit-card">{icon(ic)}<h2>{e(b["title"])}</h2><p>{e(b["text"])}</p></article>' for b in c['benefits'])+'</div></section>'
  faqs='<section class="section"><div class="container case-faqs"><span class="eyebrow">A little clarity before you start</span><h2>Your questions, answered.</h2>'+faq_markup(c['faqIds'],True)+'</div></section>'
  page('/use-cases/'+slug+'/',f'DewCue {name} | Practical Chrome Reminder Ideas',c['description'],pagehero(e(c['eyebrow']),e(c['title']),e(c['description']),ex)+benefits+faqs+finalcta(),[('Use cases','/use-cases/'),(name,None)])
 page('/pricing/','DewCue Pricing | Free, Premium & Lifetime Plans','Compare DewCue Free, Premium and Lifetime: $4.99/month, $39/year or $99 Lifetime for the first 500 buyers. Rupee prices with UPI in India. Free plan and 14-day trial.',pagehero('Choose the plan that fits','Start free.<br><em class="display">Make room for more.</em>','Start with Free. Your 14-day Premium trial begins the first time you exceed a free limit. No card required.')+'<section class="section-tight"><div class="container">'+pricing(True,heading='h2')+'</div></section><section class="section faq-section"><div class="container case-faqs"><h2 style="margin-bottom:28px">Before you choose a plan.</h2>'+faq_markup(['premium-trial','premium-pricing','lifetime-plan','get-premium-activation-code','remove-premium-without-deleting-reminders','cancel-premium','refund-policy','payment-provider'],True)+'</div></section>'+finalcta(),[('Pricing',None)])
 categories=list(dict.fromkeys(f['category'] for f in CONTENT['faqs']))
 search='<div class="answer-search">'+icon('search')+'<label class="sr-only" for="answer-search">Search DewCue answers</label><input id="answer-search" type="search" placeholder="Try “selected text”, “backup” or “activation”" autocomplete="off" aria-controls="answers-results"></div>'
 filters='<div class="answer-filterbar" role="group" aria-label="Filter answers by topic"><button class="answer-filter" type="button" data-answer-category="all" aria-pressed="true">All answers</button>'+''.join(f'<button class="answer-filter" type="button" data-answer-category="{e(c)}" aria-pressed="false">{e(c)}</button>' for c in categories)+'</div>'
 groups='<div class="answers-main" id="answers-results"><p class="answer-count" id="answer-count" role="status">'+str(len(CONTENT['faqs']))+' helpful answers</p>'+''.join(f'<section class="answer-group" data-answer-group><h2>{e(c)}</h2>'+faq_markup([f['id'] for f in CONTENT['faqs'] if f['category']==c],True)+'</section>' for c in categories)+'<div class="empty-answers" id="empty-answers" hidden><h2>Let’s try that another way.</h2><p>No matching answers yet. Try another word or reset the filters.</p><button class="btn btn-secondary btn-small" type="button" data-reset-answers style="margin-top:20px">Show all answers</button></div></div>'
 page('/answers/','DewCue Help & Answers | Reminders, Backups & Premium','Get clear DewCue answers about selected text, side panel reminders, birthdays, backups, changing computers, Premium activation, privacy and billing.',pagehero('Wondering about something?','Your questions.<br><em class="display">Answered.</em>','Useful details, honest limits and simple next steps. Find the answer you came for.',search)+'<section class="section-tight"><div class="container">'+filters+groups+'</div></section>'+finalcta(),[('Answers',None)])
 page('/guides/','DewCue Guides | Reminders, Backups & Premium Help','Practical guides for Chrome reminders, selected text, the side panel, birthdays, backups, changing computers and DewCue Premium activation.',pagehero('Get more from DewCue','Getting started.<br><em class="display">Made simple.</em>','From your first reminder to keeping your data safe and understanding Premium. Find a useful next step.')+'<section class="section-tight"><div class="container"><div class="guides-grid guide-collection">'+guidecards(heading='h2')+'</div></div></section>'+finalcta(),[('Guides',None)])
 for g in CONTENT['guides']:
  sidebar='<aside class="article-sidebar"><h2>In this guide</h2>'+''.join(f'<a href="#section-{i}">{e(s["heading"])}</a>' for i,s in enumerate(g['sections']))+'<a href="#related-questions">Related questions</a>'+('<a href="#related-guides">Keep exploring</a>' if g.get('relatedGuides') else '')+'<a href="#product-sources">Sources and product details</a></aside>'
  sections=''.join(guide_section(s,i) for i,s in enumerate(g['sections']))
  review_note='By DewCue. Published product information reviewed on 18 October 2026.'
  if PREVIEW:review_note+=' This guide describes documented behaviour. The extension’s controls have not been tested as part of this website preview.'
  body=f'<div class="answer-box"><h2>The useful answer</h2><p>{e(g["answer"])}</p></div>'+sections+'<section id="related-questions"><h2>A few related questions</h2>'+faq_markup(g['relatedFaqs'],True)+'</section>'+guide_resources(g)+'<div class="article-cta"><h2>Need a hand with your next step?</h2><p>Explore more answers or contact DewCue about a reminder, your data or a Premium licence.</p><div class="article-help-actions"><a class="btn btn-primary" href="/answers/">Explore answers '+icon('arrow')+'</a><a class="btn btn-secondary" href="/contact/">Contact DewCue</a></div></div><p class="article-note">'+e(review_note)+'</p>'
  meta=f'<div class="article-meta"><span>DewCue guides</span><span>·</span><span>{e(g["readTime"])}</span><span>·</span><span>Documentation reviewed 18 October 2026</span></div>'
  page('/guides/'+g['slug']+'/',g['title']+' | DewCue',g['description'],pagehero(e(g['category']),e(g['title']),e(g['description']),meta)+'<section class="section-tight"><div class="container article-layout">'+sidebar+'<article class="article-body">'+body+'</article></div></section>',[('Guides','/guides/'),(g['title'],None)],article=g)
 for slug,title in [('privacy','Privacy Policy'),('terms','Terms of Service'),('refund','Refund & Cancellation Policy')]:
  src=(ROOT/'source-reference'/f'{slug}.txt').read_text()
  raw=re.search(r'<main\b[^>]*>(.*?)</main>',src,re.S).group(1)
  raw=re.sub(r'<h1\b[^>]*>.*?</h1>','',raw,count=1,flags=re.S)
  raw=raw.replace('class="updated"','class="legal-meta"')
  for old,new in [('terms.html','/terms/'),('privacy.html','/privacy/'),('refund.html','/refund/'),('contact.html','/contact/'),('index.html#pricing','/pricing/'),('index.html','/')]:raw=raw.replace('href="'+old+'"','href="'+new+'"')
  desc={'privacy':'What DewCue saves, what can sync through Chrome, how email capture works, and what the Premium licence service stores. Read the full privacy policy.','terms':'Read the terms for using DewCue, including Premium licences, pricing, payment, cancellation, acceptable use and browser reminder limitations.','refund':'Read DewCue’s 7-day refund request window, cancellation rules, Razorpay refund process and trial details. Contact hello@dewcue.com for help.'}[slug]
  page('/'+slug+'/',title+' | DewCue',desc,pagehero('Clear terms. No guesswork.',title)+'<section class="section-tight"><div class="container legal-content">'+raw+'</div></section>',[(title,None)])
 about=pagehero('About DewCue','Built for the tasks<br><em class="display">that make up your day.</em>','DewCue is a Chrome extension for reminders, follow-ups, focus and the everyday things you mean to come back to.')+'<section class="section-tight"><div class="container article-layout"><aside class="article-sidebar"><h2>About DewCue</h2><a href="#the-idea">The idea</a><a href="#clear-boundaries">Clear boundaries</a><a href="#the-business">The business</a></aside><article class="article-body"><section id="the-idea"><h2>A small place for the next step.</h2><p>A reply to check. A client detail to keep. A little water between two busy hours. DewCue brings those moments into your browser with natural-language reminders, email follow-ups, page sticky notes, project buckets and timers.</p><p>Today, Upcoming and Overdue help give reminders a place. On-page cards or system notifications bring them back when it is time. The side panel gives the same list a little more room.</p></section><section id="clear-boundaries"><h2>Useful help, with clear boundaries.</h2><p>You do not need a DewCue account for reminders. Email follow-ups do not need access to your email account or send messages for you. Reminders and selected preferences can sync through Chrome; buckets, notes, timers and history stay on your computer.</p><p>Premium licence records are separate. The licence server stores only the email you enter and your licence key. The <a href="/privacy/">privacy policy</a> explains what is stored and where.</p></section><section id="the-business"><h2>Who’s behind DewCue?</h2><p>DewCue is a small, independent product made in India. The full published business details are available in the <a href="/terms/">Terms of Service</a> and the <a href="/privacy/">Privacy Policy</a>.</p><p>Questions, ideas or something that slipped? Email <a href="mailto:hello@dewcue.com">hello@dewcue.com</a>. The published support response time is 1–2 business days.</p></section></article></div></section>'+finalcta()
 page('/about/','About DewCue | A Gentle Reminder Extension for Chrome','Meet DewCue, a gentle reminder extension for Chrome. Learn about its reminder experience, privacy boundaries and how to contact the team.',about,[('About',None)])
 contact=pagehero('A real question deserves a real answer','How can<br><em class="display">we help you?</em>','Need a hand with a reminder, a licence or a payment? We’re a message away.')+f'''<section class="section-tight"><div class="container contact-grid"><div class="contact-primary">{icon('mail')}<h2>Write to DewCue.</h2><p>Tell us what you need help with. We reply within 1–2 business days.</p><a href="mailto:hello@dewcue.com" class="contact-email">hello@dewcue.com</a><div class="contact-tools"><a href="mailto:hello@dewcue.com" class="btn btn-primary">Open your email app {icon('arrow')}</a><button type="button" class="btn btn-secondary" data-copy-email>{icon('copy')}Copy email</button></div><p class="contact-note">You review and send the message in your email app. This website does not submit a support request.</p></div><div><section class="contact-detail"><h2>Something isn’t showing up?</h2><p>Include your Chrome version, notification choice and what happened. Please avoid sending private email content or sensitive reminder text.</p><a href="/guides/browser-notifications/" class="text-link">Check your notifications first {icon('arrow')}</a></section><section class="contact-detail"><h2>A licence, payment or refund?</h2><p>Use the email you entered at checkout so we can find the right purchase. Never send a card number, password or UPI PIN.</p><a href="/guides/activate-premium/" class="text-link">Read the Premium activation guide {icon('arrow')}</a><p class="contact-note">For cancellation or a refund, read the <a href="/refund/">refund policy</a>.</p></section><section class="contact-detail"><h2>A privacy question?</h2><p>See exactly what is stored locally, what can sync, and what is needed for a Premium licence.</p><a href="/privacy/" class="text-link">Explore your privacy {icon('arrow')}</a></section></div></div></section>'''
 page('/contact/','Contact DewCue | Product, Premium & Billing Help','Contact DewCue at hello@dewcue.com for reminders, licences, payments, refunds or privacy questions. Published support response time: 1–2 business days.',contact,[('Contact',None)])
 listings='<div class="sitemap-links">'+''.join(f'<a href="{p["path"]}">{e(p["title"].split(" | ")[0])}</a>' for p in PAGES)+'</div>'
 page('/sitemap/','DewCue Sitemap | Find Features, Guides & Answers','Find every DewCue feature, plan, practical guide, use case, answer and policy in one simple sitemap.',pagehero('Everything, easy to find','Find your way<br><em class="display">around DewCue.</em>')+'<section class="section-tight"><div class="container">'+listings+'</div></section>',[('Sitemap',None)])
 page('/404.html','Page Not Found | DewCue','This DewCue page could not be found. Return home or explore the help and answers.',f'<div class="container"><section class="not-found">{bird("while-you-were-away")}<span class="eyebrow">This one slipped away</span><h1>Let’s find your way back.</h1><p>The page you’re looking for isn’t here. There’s still plenty of DewCue to explore.</p><div class="hero-ctas"><a href="/" class="btn btn-primary">Back to DewCue {icon("arrow")}</a><a href="/answers/" class="btn btn-secondary">Explore answers</a></div></section></div>')
 xml='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+''.join(f'  <url><loc>{e(BASE+p["path"])}</loc></url>\n' for p in PAGES)+'</urlset>\n'
 (DIST/'sitemap.xml').write_text(xml)
 (DIST/'robots.txt').write_text('User-agent: *\nAllow: /\n\nSitemap: '+BASE+'/sitemap.xml\n' if CONFIG['indexable'] else '# When this folder is served from a subdirectory, this file is informational only.\n# Crawlers read robots.txt from the host root.\n# This public website preview has noindex directives on its HTML pages.\n# Noindex is not an access control.\n')
 (ROOT/'page-inventory.json').write_text(json.dumps(PAGES,indent=2,ensure_ascii=False)+'\n')
 print(f'Generated {len(PAGES)} pages + 404. Indexable: {CONFIG["indexable"]}. Canonical base: {BASE}')

def legacy_redirects():
 for slug,label in [('privacy','Privacy'),('terms','Terms'),('refund','Refunds'),('contact','Contact')]:
  target=BASE+'/'+slug+'/'
  html=f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>{label} page moved | DewCue</title><meta name="description" content="The DewCue {label.lower()} page has moved. Continue to the updated page.">{'' if CONFIG['indexable'] else '<meta name="robots" content="noindex, follow">'}<meta http-equiv="refresh" content="0; url={slug}/"><link rel="canonical" href="{e(target)}"><link rel="icon" href="/assets/symbol.svg" type="image/svg+xml"><link rel="stylesheet" href="/assets/site.css"></head><body class="page-inner"><main id="main" class="container"><section class="not-found"><span class="eyebrow">DewCue</span><h1>This page has moved.</h1><p>Continue to the updated {label.lower()} page.</p><a class="btn btn-primary" href="/{slug}/">Open {label.lower()}</a></section></main></body></html>'''
  (DIST/(slug+'.html')).write_text(mount_html(html,'/'+slug+'.html'))

if __name__=='__main__':
 build()
 legacy_redirects()

