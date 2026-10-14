/* RATdeck static forms -> live WPForms on ratdeck.com (same forms the WordPress pages use).
   contact: WPForms #19500 on page 7686. fields: 1 name, 2 email, 3 phone, 4 website, 5 message
   review : WPForms #24698 on page 24700. fields: 1 name, 6 business, 4 website, 2 email, 3 phone, 7 city
   Flow (fix6): as soon as the visitor touches the form, get fresh anti-spam tokens from
   admin-ajax.php?action=wpforms_get_token (fallback: WP REST rendering of the page). On submit,
   wait until the token is >= 4 s old (WPForms "minimum time to submit"), then POST to
   admin-ajax.php with action=wpforms_submit. WordPress answers JSON {success:true,data:{confirmation}}
   or {success:false,data:{errors}}, so success is read from JSON, never from page HTML.
   (fix1 bug: the old flow posted to /index.php?page_id=..., which DID deliver the lead, but the
   check /wpforms-error/ matched the theme's inline CSS on every response, so every send showed
   "Sorry, we could not send this".) */
(function(){
var C={contact:{id:19500,page:7686,title:'Contact',url:'https://ratdeck.com/contact/'},
       review:{id:24698,page:24700,title:'Get a Free AI Visibility Check',url:'https://ratdeck.com/free-review/'}};
var LIVE=/(^|\.)ratdeck\.com$/.test(location.hostname),AJAX='/wp-admin/admin-ajax.php',MIN=4000;
function q(f,s){return f.querySelector(s)}
function wait(ms){return new Promise(function(r){setTimeout(r,ms)})}
function getTok(c){
 var b=new URLSearchParams();b.append('action','wpforms_get_token');b.append('formId',c.id);
 return fetch(AJAX,{method:'POST',body:b,credentials:'same-origin'}).then(function(r){return r.json()}).then(function(j){
  if(j&&j.success&&j.data&&j.data.time_token)return{tk:j.data.token||'',tt:j.data.time_token,at:Date.now()};throw 0}).catch(function(){
  return fetch('/wp-json/wp/v2/pages/'+c.page+'?_fields=content',{cache:'no-store',credentials:'same-origin'}).then(function(r){return r.json()}).then(function(j){
   var h=(j&&j.content&&j.content.rendered)||'';
   return{tt:(h.match(/wpforms\[time_token\]" value="([^"]+)"/)||[])[1]||'',tk:(h.match(/data-token="([^"]+)"/)||[])[1]||'',at:Date.now()}})});
}
document.querySelectorAll('form[data-wpf]').forEach(function(f){
 var c=C[f.getAttribute('data-wpf')],tp=null;
 function prime(){if(LIVE&&!tp)tp=getTok(c).catch(function(){tp=null;return null})}
 f.addEventListener('focusin',prime);f.addEventListener('pointerdown',prime);
 f.addEventListener('submit',function(e){
  e.preventDefault();
  var st=q(f,'.fstat'),btn=q(f,'button[type=submit]');
  if(!f.checkValidity()){f.reportValidity();return}
  function fail(msg){btn.disabled=false;st.innerHTML=(msg?msg+' ':'')+'Sorry, we could not send this. Please email <a href="mailto:info@ratdeck.com">info@ratdeck.com</a> or call <a href="tel:+17373063068">+1 (737) 306-3068</a>.'}
  if(!LIVE){st.textContent='Preview only: on ratdeck.com this sends your request straight to our team.';return}
  btn.disabled=true;st.textContent='Sending…';prime();
  tp.then(function(t){if(!t||!t.tt)throw 0;var left=MIN-(Date.now()-t.at);return left>0?wait(left).then(function(){return t}):t}).then(function(t){
   var fd=new FormData();
   f.querySelectorAll('[data-wf]').forEach(function(el){
    var v=el.value.trim(),n=el.getAttribute('data-wf');
    if(c.id===19500&&n==='5'){var s=q(f,'[data-svc]');if(s)v='Service: '+s.value+'\n\n'+v}
    if(c.id===24698&&n==='7'){var i=q(f,'[data-ind]');if(i)v=v+' | Industry: '+i.value}
    fd.append('wpforms[fields]['+n+']',v)});
   fd.append('action','wpforms_submit');
   fd.append('ratdeck_company_url',(q(f,'[name=ratdeck_company_url]')||{}).value||'');
   fd.append('ratdeck_form_started',String(Math.floor(t.at/1000)));
   fd.append('wpforms[id]',c.id);fd.append('wpforms[time_token]',t.tt);if(t.tk)fd.append('wpforms[token]',t.tk);
   fd.append('page_title',c.title);fd.append('page_url',c.url);fd.append('url_referer',document.referrer||'');
   fd.append('page_id',c.page);fd.append('wpforms[post_id]',c.page);fd.append('wpforms[submit]','wpforms-submit');
   return fetch(AJAX,{method:'POST',body:fd,credentials:'same-origin'});
  }).then(function(r){return r.json()}).then(function(j){
   tp=null;
   if(j&&j.success){f.reset();btn.disabled=false;st.textContent='Thanks! Your request was sent. We reply by 9 AM Eastern the next business day.';if(window.gtag)gtag('event','generate_lead',{form:c.id});return}
   var er=j&&j.data&&j.data.errors,m='';
   if(er&&er.general){var d=document.createElement('div');d.innerHTML=Object.keys(er.general).map(function(k){return er.general[k]}).join(' ');m=d.textContent.trim()}
   fail(m)}).catch(function(){tp=null;fail()});
 });
});
})();
