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
var po=new IntersectionObserver(function(es){es.forEach(function(e){vis[e.target.className]=e.isIntersecting});pill.classList.toggle('hide',Object.keys(vis).some(function(k){return vis[k]}))},{threshold:0});
po.observe(d.querySelector('.contact'));po.observe(d.querySelector('.foot'));
})();
