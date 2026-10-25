/* utils.js */
var GAME = window.GAME;
window.UTILS = {};
var U = window.UTILS;

U.clamp = (v,a,b)=> Math.max(a, Math.min(b, v));
U.lerp = (a,b,t)=> a+(b-a)*t;
// Math.hypot e' bem mais lento que sqrt em loops de colisao.
U.dist = (x1,y1,x2,y2)=>{ const dx=x2-x1, dy=y2-y1; return Math.sqrt(dx*dx+dy*dy); };
U.dist2 = (x1,y1,x2,y2)=>{ const dx=x2-x1, dy=y2-y1; return dx*dx+dy*dy; };
U.angle = (x1,y1,x2,y2)=> Math.atan2(y2-y1, x2-x1);
U.deg = (d)=> d*Math.PI/180;
U.rand = (a,b)=> a + Math.random()*(b-a);
U.randInt = (a,b)=> Math.floor(U.rand(a,b+1));
U.choice = (arr)=> arr[Math.floor(Math.random()*arr.length)];
U.norm = (x,y)=> { const d=Math.hypot(x,y)||1; return [x/d,y/d]; };

// simple seeded? no
U.circleHit = (x1,y1,r1,x2,y2,r2)=>{ const dx=x2-x1, dy=y2-y1, r=r1+r2; return dx*dx+dy*dy <= r*r; };

// remove dead items in place
U.compact = (arr)=> { let w=0; for(let i=0;i<arr.length;i++){ if(!arr[i].dead){ arr[w++]=arr[i]; } } arr.length=w; };

U.formatScore = (n)=> String(n).padStart(9,'0');
