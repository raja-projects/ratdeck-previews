/* Pikvaa reel: curved gallery cards on a ring, bent by drag/scroll velocity. Plain WebGL, no libraries. */
(function(){
var root=document.querySelector('[data-reel]');if(!root)return;
var rm=window.matchMedia('(prefers-reduced-motion: reduce)');if(rm.matches)return;
var cv=root.querySelector('canvas'),gl=cv.getContext('webgl',{antialias:true,alpha:true,powerPreference:'low-power'});if(!gl)return;
var CARDS=[["#7cc8ff","#3b3fb8","Meena & Arun","Wedding · 300"],["#1f3f74","#0b1d3a","Reception","Album · P1"],["#C9B8FF","#7b3fe0","Haldi","142 selected"],["#6d7fa3","#24375e","Engagement","Delivered"],["#a98bff","#4a22a8","Baby shower","Album · P2"],["#d6e6ff","#5b7fd6","Birthday","3 GB pack"],["#355c9a","#0f2550","Pre-wedding","Love · 48"],["#8FD3FF","#6D4BF6","Temple wedding","PIN shared"],["#5a4f8f","#1a1540","Sangeet","Selecting"]];
var N=CARDS.length,STEP=0.56,R=4.6,W=2.05,H=1.48;
function tex(c){var k=document.createElement('canvas');k.width=512;k.height=368;var x=k.getContext('2d');
 var g=x.createLinearGradient(0,0,512,368);g.addColorStop(0,c[0]);g.addColorStop(1,c[1]);x.fillStyle=g;x.fillRect(0,0,512,368);
 for(var i=0;i<7;i++){var r=30+((i*53)%70),px=(i*97+40)%512,py=(i*71+60)%368;var b=x.createRadialGradient(px,py,0,px,py,r);b.addColorStop(0,'rgba(255,255,255,.28)');b.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=b;x.fillRect(px-r,py-r,2*r,2*r);}
 x.fillStyle='rgba(255,255,255,.18)';x.beginPath();x.arc(256,170,62,0,7);x.fill();x.fillRect(176,240,160,128);
 x.font='700 30px Nunito,Poppins,sans-serif';x.fillStyle='#fff';x.fillText(c[2],28,320);
 x.font='600 20px Nunito,Poppins,sans-serif';var w=x.measureText(c[3]).width+28;x.fillStyle='rgba(255,255,255,.92)';rr(x,512-w-22,22,w,36,18);x.fillStyle='#121E3F';x.fillText(c[3],512-w-8,47);
 var t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,k);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return t;}
function rr(x,a,b,w,h,r){x.beginPath();x.moveTo(a+r,b);x.arcTo(a+w,b,a+w,b+h,r);x.arcTo(a+w,b+h,a,b+h,r);x.arcTo(a,b+h,a,b,r);x.arcTo(a,b,a+w,b,r);x.fill();}
function prog(vs,fs){function sh(t,s){var o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);return o}var p=gl.createProgram();gl.attachShader(p,sh(gl.VERTEX_SHADER,vs));gl.attachShader(p,sh(gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);return gl.getProgramParameter(p,gl.LINK_STATUS)?p:null;}
var head='precision mediump float;uniform mat4 uP;';
var cardP=prog(head+'attribute vec2 a;uniform float uA,uV,uR,uW,uH;varying vec2 vU;varying float vE;void main(){vU=a+.5;float th=uA+a.x*uW/uR;float bow=uV*a.x*a.x*2.2;vec3 p=vec3(uR*sin(th),a.y*uH+bow+.05+uV*.25*a.x,-(uR+2.4)+uR*cos(th)+.45*a.x*a.x*4.);vE=th;gl_Position=uP*vec4(p,1.);}',
 'precision mediump float;uniform sampler2D uT;uniform float uV;varying vec2 vU;varying float vE;void main(){vec2 q=abs(vU-.5)*vec2(1.4,1.)-vec2(.7,.5)+.06;float d=length(max(q,0.))-.06;if(d>0.)discard;float s=uV*.012;vec3 c=vec3(texture2D(uT,vU+vec2(s,0)).r,texture2D(uT,vU).g,texture2D(uT,vU-vec2(s,0)).b);float f=1.-smoothstep(.25,1.3,abs(vE));float o=1.-smoothstep(.85,1.15,abs(vE));gl_FragColor=vec4(c*(.35+.65*f)*o,o);}');
var floorP=prog(head+'attribute vec2 a;varying vec2 vW;uniform float uO;void main(){vW=a*30.+vec2(uO*4.,0.);gl_Position=uP*vec4(a.x*30.,-1.35,a.y*30.-12.,1.);}',
 'precision mediump float;varying vec2 vW;void main(){vec2 g=abs(fract(vW*1.3)-.5);float l=1.-smoothstep(0.,.035,min(g.x,g.y));float fade=exp(-length(vW-vec2(0.,-12.))*.09);float k=l*fade*.6;gl_FragColor=vec4(mix(vec3(.05,.65,1.),vec3(.61,.17,.96),fract(vW.x*.02+.5))*k,k);}');
if(!cardP||!floorP)return;
var seg=40,v=[];for(var i=0;i<seg;i++){var x0=i/seg-.5,x1=(i+1)/seg-.5;v.push(x0,-.5,x1,-.5,x0,.5,x0,.5,x1,-.5,x1,.5);}
var cb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,cb);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(v),gl.STATIC_DRAW);
gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
var fb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,fb);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
var T=CARDS.map(tex);root.classList.add('reel-on');
function U(p,n){return gl.getUniformLocation(p,n)}
var off=0,tgt=0,vel=0,drag=null,lastY=window.scrollY,vis=false,raf=0,P=new Float32Array(16);
function persp(asp){var f=1/Math.tan(.42)*Math.min(1,asp/1.5),n=.1,fa=60;P.fill(0);P[0]=f/asp;P[5]=f;P[10]=(fa+n)/(n-fa);P[11]=-1;P[14]=2*fa*n/(n-fa);}
function size(){var d=Math.min(window.devicePixelRatio||1,innerWidth<700?1.25:1.6),w=cv.clientWidth,h=cv.clientHeight;cv.width=w*d|0;cv.height=h*d|0;gl.viewport(0,0,cv.width,cv.height);persp(w/h);}
function frame(){raf=0;var p=off;off+=(tgt-off)*.08;tgt+=.0012;vel+=((off-p)*14-vel)*.15;vel=Math.max(-1.2,Math.min(1.2,vel));
 gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
 gl.useProgram(floorP);gl.uniformMatrix4fv(U(floorP,'uP'),false,P);gl.uniform1f(U(floorP,'uO'),off);gl.bindBuffer(gl.ARRAY_BUFFER,fb);var la=gl.getAttribLocation(floorP,'a');gl.enableVertexAttribArray(la);gl.vertexAttribPointer(la,2,gl.FLOAT,false,0,0);gl.drawArrays(gl.TRIANGLES,0,6);
 gl.useProgram(cardP);gl.uniformMatrix4fv(U(cardP,'uP'),false,P);gl.uniform1f(U(cardP,'uV'),vel);gl.uniform1f(U(cardP,'uR'),R);gl.uniform1f(U(cardP,'uW'),W);gl.uniform1f(U(cardP,'uH'),H);
 gl.bindBuffer(gl.ARRAY_BUFFER,cb);la=gl.getAttribLocation(cardP,'a');gl.enableVertexAttribArray(la);gl.vertexAttribPointer(la,2,gl.FLOAT,false,0,0);
 var L=[];for(var i=0;i<N;i++){var a=((i*STEP-off)%(N*STEP)+N*STEP)%(N*STEP);if(a>N*STEP/2)a-=N*STEP;if(Math.abs(a)<1.2)L.push([a,i]);}
 L.sort(function(p,q){return Math.abs(q[0])-Math.abs(p[0])});
 L.forEach(function(c){gl.uniform1f(U(cardP,'uA'),c[0]);gl.bindTexture(gl.TEXTURE_2D,T[c[1]]);gl.drawArrays(gl.TRIANGLES,0,seg*6);});
 if(vis&&!document.hidden)raf=requestAnimationFrame(frame);}
function go(){if(!raf&&vis)raf=requestAnimationFrame(frame)}
new IntersectionObserver(function(e){vis=e[0].isIntersecting;go()}).observe(root);
document.addEventListener('visibilitychange',go);addEventListener('resize',size);size();
cv.addEventListener('pointerdown',function(e){drag={x:e.clientX,t:tgt};cv.setPointerCapture(e.pointerId)});
cv.addEventListener('pointermove',function(e){if(drag)tgt=drag.t-(e.clientX-drag.x)/cv.clientWidth*2.4});
['pointerup','pointercancel'].forEach(function(n){cv.addEventListener(n,function(){drag=null})});
cv.addEventListener('wheel',function(e){if(Math.abs(e.deltaX)>Math.abs(e.deltaY)){e.preventDefault();tgt+=e.deltaX*.004}},{passive:false});
addEventListener('scroll',function(){var y=window.scrollY;if(vis)tgt+=(y-lastY)*.0025;lastY=y},{passive:true});
rm.addEventListener&&rm.addEventListener('change',function(m){if(m.matches){vis=false;root.classList.remove('reel-on')}});
})();
