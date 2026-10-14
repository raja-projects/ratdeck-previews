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
// pill hide over contact/footer
var pill=d.getElementById('pill'),vis={};
var po=new IntersectionObserver(function(es){es.forEach(function(e){vis[e.target.dataset.k||e.target.className]=e.isIntersecting});pill.classList.toggle('hide',Object.keys(vis).some(function(k){return vis[k]}))},{threshold:0});
var hc=d.querySelector('.hero .ctas');if(hc){hc.dataset.k='hero';po.observe(hc)}if(matchMedia('(max-width:600px)').matches){var bz=new IntersectionObserver(function(es){es.forEach(function(e){vis['b'+e.target.dataset.bi]=e.isIntersecting});pill.classList.toggle('hide',Object.keys(vis).some(function(k){return vis[k]}))},{rootMargin:-(innerHeight-120)+'px 0px 0px 0px'});[].forEach.call(d.querySelectorAll('main .btn,section .btn,.midcta a'),function(b,i){if(b.closest('.hero'))return;b.dataset.bi=i;bz.observe(b)})}po.observe(d.querySelector('.contact'));po.observe(d.querySelector('.foot'));
})();

/* v5 merge: letter hover + cursor ring */
(()=>{const h=document.getElementById('hh');if(h){const wrap=n=>{if(n.nodeType===3){const f=document.createDocumentFragment();n.textContent.split(/(\s+)/).forEach(w=>{if(!w)return;if(/^\s+$/.test(w)){f.append(' ');return}const ws=document.createElement('span');ws.className='w';[...w].forEach(c=>{const l=document.createElement('span');l.className='l';l.textContent=c;ws.append(l)});f.append(ws)});n.replaceWith(f)}else[...n.childNodes].forEach(wrap)};[...h.childNodes].forEach(wrap);
const ls=[...h.querySelectorAll('.l')];ls.forEach((l,i)=>l.addEventListener('mouseenter',()=>{ls.forEach(x=>x.classList.remove('fade','dots'));l.classList.add('fade');ls[i+1]&&ls[i+1].classList.add('dots');clearTimeout(l._t);l._t=setTimeout(()=>{l.classList.remove('fade');ls[i+1]&&ls[i+1].classList.remove('dots')},600)}))}
const r=document.getElementById('cring');if(r&&matchMedia('(hover:hover)').matches){let x=-100,y=-100,cx=x,cy=y;addEventListener('mousemove',e=>{x=e.clientX-13;y=e.clientY-13});document.querySelectorAll('a,button,#hh').forEach(el=>{el.addEventListener('mouseenter',()=>r.classList.add('big'));el.addEventListener('mouseleave',()=>r.classList.remove('big'))});(function t(){cx+=(x-cx)*.2;cy+=(y-cy)*.2;r.style.transform=`translate(${cx}px,${cy}px)`;requestAnimationFrame(t)})()}})();
