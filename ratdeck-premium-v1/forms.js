/* RATdeck static forms -> live WPForms on ratdeck.com (same forms the WordPress pages use).
   contact: WPForms #19500 on page 7686. fields: 1 name, 2 email, 3 phone, 4 website, 5 message
   review : WPForms #24698 on page 24700. fields: 1 name, 6 business, 4 website, 2 email, 3 phone, 7 city
   Flow: fetch a fresh time_token/token from the WP REST rendering of the page, then POST the
   standard WPForms payload to /index.php?page_id=<page> (served by WordPress, not the static file). */
(function(){
var C={contact:{id:19500,page:7686,title:'Contact',url:'https://ratdeck.com/contact/'},
       review:{id:24698,page:24700,title:'Get a Free AI Visibility Check',url:'https://ratdeck.com/free-review/'}};
var LIVE=/(^|\.)ratdeck\.com$/.test(location.hostname);
function q(f,s){return f.querySelector(s)}
document.querySelectorAll('form[data-wpf]').forEach(function(f){
 var c=C[f.getAttribute('data-wpf')];
 f.addEventListener('submit',function(e){
  e.preventDefault();
  var st=q(f,'.fstat'),btn=q(f,'button[type=submit]');
  if(!f.checkValidity()){f.reportValidity();return}
  function fail(){btn.disabled=false;st.innerHTML='Sorry, we could not send this. Please email <a href="mailto:info@ratdeck.com">info@ratdeck.com</a> or call <a href="tel:+17373063068">+1 (737) 306-3068</a>.'}
  if(!LIVE){st.textContent='Preview only: on ratdeck.com this sends your request straight to our team.';return}
  btn.disabled=true;st.textContent='Sending…';
  fetch('/wp-json/wp/v2/pages/'+c.page+'?_fields=content',{cache:'no-store',credentials:'same-origin'}).then(function(r){return r.json()}).then(function(j){
   var h=(j&&j.content&&j.content.rendered)||'',tt=(h.match(/wpforms\[time_token\]" value="([^"]+)"/)||[])[1]||'',tk=(h.match(/data-token="([^"]+)"/)||[])[1]||'';
   var fd=new FormData();
   f.querySelectorAll('[data-wf]').forEach(function(el){
    var v=el.value.trim(),n=el.getAttribute('data-wf');
    if(c.id===19500&&n==='5'){var s=q(f,'[data-svc]');if(s)v='Service: '+s.value+'\n\n'+v}
    if(c.id===24698&&n==='7'){var i=q(f,'[data-ind]');if(i)v=v+' | Industry: '+i.value}
    fd.append('wpforms[fields]['+n+']',v)});
   fd.append('ratdeck_company_url',(q(f,'[name=ratdeck_company_url]')||{}).value||'');
   fd.append('ratdeck_form_started','');
   fd.append('wpforms[id]',c.id);fd.append('wpforms[time_token]',tt);if(tk)fd.append('wpforms[token]',tk);
   fd.append('page_title',c.title);fd.append('page_url',c.url);fd.append('url_referer',document.referrer||'');
   fd.append('page_id',c.page);fd.append('wpforms[post_id]',c.page);fd.append('wpforms[submit]','wpforms-submit');
   return fetch('/index.php?page_id='+c.page,{method:'POST',body:fd,credentials:'same-origin'});
  }).then(function(r){return r.text().then(function(t){return{ok:r.ok,t:t}})}).then(function(x){
   if(x.ok&&!/wpforms-error|wpforms-field-required-error/.test(x.t)){f.reset();btn.disabled=false;st.textContent='Thanks! Your request was sent. We reply by 9 AM Eastern the next business day.';if(window.gtag)gtag('event','generate_lead',{form:c.id})}
   else fail()}).catch(fail);
 });
});
})();