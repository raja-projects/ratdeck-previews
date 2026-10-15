(function(){
var d=document,rm=matchMedia('(prefers-reduced-motion: reduce)').matches;
d.documentElement.classList.add('js');
var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{threshold:.12,rootMargin:'0px 0px -40px 0px'});
d.querySelectorAll('.rv,.foot').forEach(function(el){if(rm)el.classList.add('in');else io.observe(el)});
// services accordion
var cols=[].slice.call(d.querySelectorAll('.col')),mob=matchMedia('(max-width:820px)');
function open(c){cols.forEach(function(x){var o=x===c;x.classList.toggle('open',o);x.querySelector('.ct').setAttribute('aria-expanded',o)})}
cols.forEach(function(c){
 c.querySelector('.ct').addEventListener('click',function(){ if(mob.matches&&c.classList.contains('open')){c.classList.remove('open');this.setAttribute('aria-expanded',false)} else open(c)});
 c.addEventListener('mouseenter',function(){if(!mob.matches&&matchMedia('(hover:hover)').matches)open(c)});
});
// parallax
var img=d.getElementById('px');
if(!rm&&img){var t=false;function px(){var r=img.parentNode.getBoundingClientRect(),h=innerHeight;if(r.bottom>0&&r.top<h){var p=(h-r.top)/(h+r.height);img.style.transform='translate3d(0,'+(-p*15)+'%,0)'}t=false}
 addEventListener('scroll',function(){if(!t){t=true;requestAnimationFrame(px)}},{passive:true});px()}
// pill: hide over contact/footer/hero CTAs, forms, focused fields, keyboard
var pill=d.getElementById('pill');if(pill){
var vis={},fieldFocus=false,kbOpen=false;
function pillHide(){var block=fieldFocus||kbOpen||Object.keys(vis).some(function(k){return vis[k]});pill.classList.toggle('hide',!!block)}
function setVis(k,v){vis[k]=v;pillHide()}
// never sit over a button/CTA: hide while any CTA intersects the bar's resting band
var ovSel='main a.btn,main button,main .ctas a,main .more,main summary,main input,main select,main textarea,.foot a.btn',ovT=0;
function ovCheck(){ovT=0;var h=pill.offsetHeight,w=pill.offsetWidth,bt=innerHeight-22-h-8,bb=innerHeight-14,bl=(innerWidth-w)/2-8,br=bl+w+16,hit=false,els=d.querySelectorAll(ovSel);for(var i=0;i<els.length&&!hit;i++){var r=els[i].getBoundingClientRect();if(r.width&&r.bottom>bt&&r.top<bb&&r.right>bl&&r.left<br)hit=true}setVis('ov',hit)}
function ovQ(){if(!ovT)ovT=requestAnimationFrame(ovCheck)}
addEventListener('scroll',ovQ,{passive:true});addEventListener('resize',ovQ);setTimeout(ovCheck,50);
var po=new IntersectionObserver(function(es){es.forEach(function(e){setVis(e.target.dataset.k||e.target.className,e.isIntersecting)})},{threshold:0});
var hc=d.querySelector('.hero .ctas');if(hc){hc.dataset.k='hero';po.observe(hc)}
[d.querySelector('.contact'),d.querySelector('.foot')].forEach(function(x){if(x)po.observe(x)});
// any form in viewport
[].forEach.call(d.querySelectorAll('form'),function(f,i){f.dataset.k='form'+i;po.observe(f)});
// bottom-zone CTAs on small screens
if(matchMedia('(max-width:600px)').matches){
 var bz=new IntersectionObserver(function(es){es.forEach(function(e){setVis('b'+e.target.dataset.bi,e.isIntersecting)})},{rootMargin:-(innerHeight-120)+'px 0px 0px 0px'});
 [].forEach.call(d.querySelectorAll('main .btn,section .btn,.midcta a'),function(b,i){if(b.closest('.hero')||b.closest('form'))return;b.dataset.bi=i;bz.observe(b)});
}
// focus on inputs/textareas/selects
d.addEventListener('focusin',function(e){var t=e.target;if(t&&(t.matches('input,textarea,select')||t.closest('input,textarea,select'))){fieldFocus=true;pillHide()}});
d.addEventListener('focusout',function(e){var t=e.target;if(t&&t.matches('input,textarea,select')){setTimeout(function(){var a=d.activeElement;fieldFocus=!!(a&&a.matches&&a.matches('input,textarea,select'));pillHide()},0)}});
// keyboard via visualViewport shrink
function checkKb(){var vv=window.visualViewport;if(!vv){kbOpen=false;pillHide();return}kbOpen=vv.height<innerHeight*0.75;pillHide()}
if(window.visualViewport){visualViewport.addEventListener('resize',checkKb);visualViewport.addEventListener('scroll',checkKb)}
addEventListener('resize',checkKb);checkKb();
pill.classList.remove('hide');pillHide();
}
// dismiss iOS keyboard: tap outside fields, or scroll field out of view
function isField(el){return el&&el.matches&&el.matches('input,textarea,select')}
function blurField(){var a=d.activeElement;if(isField(a))a.blur()}
function outsideField(e){var t=e.target;if(isField(t)||(t&&t.closest&&t.closest('label,input,textarea,select,button,[contenteditable]')))return;blurField()}
d.addEventListener('touchstart',outsideField,{passive:true,capture:true});
d.addEventListener('pointerdown',outsideField,{passive:true,capture:true});
var scrollBlur=false;
addEventListener('scroll',function(){if(scrollBlur)return;scrollBlur=true;requestAnimationFrame(function(){scrollBlur=false;var a=d.activeElement;if(!isField(a))return;var r=a.getBoundingClientRect(),h=innerHeight;if(r.bottom<0||r.top>h)blurField()})},{passive:true});
})();

/* v5 merge: letter hover + cursor ring */
(()=>{const h=document.getElementById('hh');if(h&&!h.querySelector('.sr-only')){const _t=h.textContent.replace(/\s+/g,' ').trim();const wrap=n=>{if(n.nodeType===3){const f=document.createDocumentFragment();n.textContent.split(/(\s+)/).forEach(w=>{if(!w)return;if(/^\s+$/.test(w)){f.append(' ');return}const ws=document.createElement('span');ws.className='w';[...w].forEach(c=>{const l=document.createElement('span');l.className='l';l.textContent=c;ws.append(l)});f.append(ws)});n.replaceWith(f)}else[...n.childNodes].forEach(wrap)};[...h.childNodes].forEach(wrap);h.querySelectorAll('.w').forEach(w=>w.setAttribute('aria-hidden','true'));const _s=document.createElement('span');_s.className='sr-only';_s.textContent=_t;h.append(_s);
const ls=[...h.querySelectorAll('.l')];ls.forEach((l,i)=>l.addEventListener('mouseenter',()=>{ls.forEach(x=>x.classList.remove('fade','dots'));l.classList.add('fade');ls[i+1]&&ls[i+1].classList.add('dots');clearTimeout(l._t);l._t=setTimeout(()=>{l.classList.remove('fade');ls[i+1]&&ls[i+1].classList.remove('dots')},600)}))}
const r=document.getElementById('cring');if(r&&matchMedia('(prefers-reduced-motion: reduce)').matches){r.style.display='none'}else if(r&&matchMedia('(hover:hover)').matches){let x=-100,y=-100,cx=x,cy=y;addEventListener('mousemove',e=>{x=e.clientX-13;y=e.clientY-13});document.querySelectorAll('a,button,#hh').forEach(el=>{el.addEventListener('mouseenter',()=>r.classList.add('big'));el.addEventListener('mouseleave',()=>r.classList.remove('big'))});(function t(){if(!document.hidden&&(Math.abs(x-cx)>.1||Math.abs(y-cy)>.1)){cx+=(x-cx)*.2;cy+=(y-cy)*.2;r.style.transform=`translate(${cx}px,${cy}px)`}requestAnimationFrame(t)})()}})();

/* fix6: hamburger + pill never over headings */
(function(){var d=document,n=d.querySelector('header.nav'),b=n&&n.querySelector('.navt');
if(b){function set(o){n.classList.toggle('open',o);b.setAttribute('aria-expanded',o);b.setAttribute('aria-label',o?'Close menu':'Open menu')}
b.addEventListener('click',function(){set(!n.classList.contains('open'))});
d.addEventListener('keydown',function(e){if(e.key==='Escape'&&n.classList.contains('open')){set(false);b.focus()}});
d.addEventListener('click',function(e){if(n.classList.contains('open')&&!n.contains(e.target))set(false)});
n.querySelectorAll('.links a').forEach(function(a){a.addEventListener('click',function(){set(false)})});
matchMedia('(min-width:901px)').addEventListener('change',function(m){if(m.matches)set(false)})}
var p=d.getElementById('pill');if(!p)return;
var heroVis=false,t=0;
function chk(){t=0;var r=p.getBoundingClientRect(),hit=heroVis||(n&&n.classList.contains('open'));
 if(!hit){var els=d.querySelectorAll('main h1,main h2,main h3,main .btn,main button,main input,main select,main textarea,main summary,main .more,.contact .btn');
 for(var i=0;i<els.length&&!hit;i++){var q=els[i].getBoundingClientRect();if(q.width&&q.bottom>r.top-12&&q.top<r.bottom+12&&q.right>r.left&&q.left<r.right)hit=true}}
 p.classList.toggle('hide2',hit)}
function qq(){if(!t)t=requestAnimationFrame(chk)}
var hero=d.querySelector('main .hero, main h1');
if(hero&&window.IntersectionObserver){new IntersectionObserver(function(es){heroVis=es[0].isIntersecting;qq()},{threshold:0}).observe(hero.closest('section')||hero)}
addEventListener('scroll',qq,{passive:true});addEventListener('resize',qq);if(n&&n.querySelector('.navt'))n.querySelector('.navt').addEventListener('click',function(){setTimeout(qq,0)});setTimeout(chk,60);
})();
