/* patterns.js */
var GAME = window.GAME;
var U = window.UTILS;
var E = window.ENT;
window.PAT = {};
var P = window.PAT;

function addBullet(game,x,y,vx,vy,color,r,type){
  if(game.bullets.length >= GAME.MAX_BULLETS) return;
  game.bullets.push(new E.Bullet(x,y,vx,vy,color,r||4,type||'small','enemy'));
}

// aimed at player
P.aimed = function(src, game, speed=5, count=1, spread=0, color='#f44'){
  const pl=game.player;
  const base=U.angle(src.x,src.y,pl.x,pl.y);
  for(let i=0;i<count;i++){
    const a=base + (i-(count-1)/2)*spread;
    addBullet(game, src.x, src.y, Math.cos(a)*speed, Math.sin(a)*speed, color, 4, 'small');
  }
};

P.ring = function(src, game, n, speed, color, offset=0){
  for(let i=0;i<n;i++){
    const a = offset + (Math.PI*2*i)/n;
    addBullet(game, src.x, src.y, Math.cos(a)*speed, Math.sin(a)*speed, color, 4, 'small');
  }
};

P.fan = function(src, game, n, speed, centerAngle, totalSpread, color){
  const start = centerAngle - totalSpread/2;
  for(let i=0;i<n;i++){
    const a = start + (totalSpread/(n-1||1))*i;
    addBullet(game, src.x, src.y, Math.cos(a)*speed, Math.sin(a)*speed, color, 4, 'small');
  }
};

P.spiral = function(src, game, speed, color, state){
  // state is object with angle
  if(!state.a) state.a=0;
  const a=state.a;
  addBullet(game, src.x, src.y, Math.cos(a)*speed, Math.sin(a)*speed, color, 4, 'small');
  state.a += 0.25;
};

P.random = function(src, game, n, speed, color){
  for(let i=0;i<n;i++){
    const a=Math.random()*Math.PI*2;
    const s=U.rand(speed*0.6, speed);
    addBullet(game, src.x, src.y, Math.cos(a)*s, Math.sin(a)*s, color, 4, 'small');
  }
};

P.laser = function(src, game, angle, length, color){
  // represented as fast thin bullet? Use a series of small bullets along line
  const sp=18;
  for(let i=0;i<8;i++){
    addBullet(game, src.x+Math.cos(angle)*i*8, src.y+Math.sin(angle)*i*8, Math.cos(angle)*sp, Math.sin(angle)*sp, color, 3, 'rice');
  }
};

// curved bullets: store angular velocity in bullet? We'll add 'angVel' property
P.curvedRing = function(src, game, n, speed, angVel, color, offset=0){
  for(let i=0;i<n;i++){
    const a = offset + (Math.PI*2*i)/n;
    const b = new E.Bullet(src.x,src.y, Math.cos(a)*speed, Math.sin(a)*speed, color,4,'small','enemy');
    b.angVel=angVel;
    if(game.bullets.length<GAME.MAX_BULLETS) game.bullets.push(b);
  }
};

// update curved bullets globally handled in game loop
P.updateCurved = function(b,dt){
  if(b.angVel){
    const sp=Math.hypot(b.vx,b.vy); if(sp>0){
      let a=Math.atan2(b.vy,b.vx); a+=b.angVel*dt;
      b.vx=Math.cos(a)*sp; b.vy=Math.sin(a)*sp;
    }
  }
};
// boss movement helpers
P.moveSine = function(boss, dt, ampX=90, ampY=20, speed=0.02){
  boss.moveTimer += dt;
  boss.x = boss.baseX + Math.sin(boss.moveTimer*speed)*ampX;
  boss.y = boss.baseY + Math.sin(boss.moveTimer*speed*0.7)*ampY;
};
P.moveCircle = function(boss, dt, r=60, speed=0.03){
  boss.moveTimer += dt;
  boss.x = boss.baseX + Math.cos(boss.moveTimer*speed)*r;
  boss.y = boss.baseY + Math.sin(boss.moveTimer*speed)*r;
};
P.moveBounce = function(boss, dt){
  boss.x += boss.vx*dt; boss.y += boss.vy*dt;
  if(boss.x<GAME.PLAY_LEFT+boss.r || boss.x>GAME.PLAY_RIGHT-boss.r) boss.vx*=-1;
  if(boss.y<GAME.PLAY_TOP+boss.r+20 || boss.y>GAME.PLAY_TOP+180) boss.vy*=-1;
};
