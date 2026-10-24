/* entities.js */
var GAME = window.GAME;
var U = window.UTILS;
window.ENT = {};
var E = window.ENT;

// ---- Bullet ----
E.Bullet = function (x,y,vx,vy,color,r,type,owner){
  this.x=x;this.y=y;this.vx=vx;this.vy=vy;this.color=color;this.r=r||4;this.type=type||'small';this.owner=owner||'enemy'; // enemy or player
  this.dead=false; this.grazed=false;
};
E.Bullet.prototype.update = function(dt){
  this.x+=this.vx*dt; this.y+=this.vy*dt;
  if(this.x<GAME.PLAY_LEFT-40||this.x>GAME.PLAY_RIGHT+40||this.y<GAME.PLAY_TOP-40||this.y>GAME.PLAY_BOTTOM+40) this.dead=true;
};

// ---- Particle ----
E.Particle = function(x,y,vx,vy,color,life,size){
  this.x=x;this.y=y;this.vx=vx;this.vy=vy;this.color=color;this.life=life;this.maxLife=life;this.size=size||2;this.dead=false;
};
E.Particle.prototype.update = function(dt){
  this.x+=this.vx*dt; this.y+=this.vy*dt;
  this.vx*=0.96; this.vy*=0.96; this.vy+=0.05*dt;
  this.life-=dt;
  if(this.life<=0) this.dead=true;
};

// ---- Item ----
E.Item = function(x,y,type){
  this.x=x;this.y=y;this.type=type; // power, point, bomb, life
  this.vy=1.2; this.vx=0; this.dead=false; this.age=0;
  this.r=8;
};
E.Item.prototype.update = function(dt, player){
  this.age+=dt;
  // homing toward player if focus? EoSD: items fall, then if player high, auto-collect. Simple: fall, slight homing if near
  if(player){
    const d=U.dist(this.x,this.y,player.x,player.y);
    if(d<90){ const a=U.angle(this.x,this.y,player.x,player.y); this.vx+=Math.cos(a)*0.15; this.vy+=Math.sin(a)*0.15; }
  }
  this.vx=U.clamp(this.vx,-2,2); this.vy=U.clamp(this.vy,0.5,3);
  this.x+=this.vx*dt; this.y+=this.vy*dt;
  if(this.y>GAME.PLAY_BOTTOM+20) this.dead=true;
  // keep in playfield
  if(this.x<GAME.PLAY_LEFT+8){this.x=GAME.PLAY_LEFT+8;this.vx=Math.abs(this.vx);}
  if(this.x>GAME.PLAY_RIGHT-8){this.x=GAME.PLAY_RIGHT-8;this.vx=-Math.abs(this.vx);}
};

// ---- Player ----
E.Player = function(){
  this.x=(GAME.PLAY_LEFT+GAME.PLAY_RIGHT)/2;
  this.y=GAME.PLAY_BOTTOM-60;
  this.speed=GAME.PLAYER_SPEED;
  this.power=1.0; // 0..4
  this.lives=3;
  this.bombs=3;
  this.score=0;
  this.graze=0;
  this.pointValue=10000;
  this.shootTimer=0;
  this.invuln=0;
  this.bombActive=0;
  this.dead=false;
  this.focus=false;
  this.char='reimu'; // reimu/marisa
  this.shotType=0;
  this.spritePhase=0;
};
E.Player.prototype.update = function(dt, game){
  const I=window.INPUT;
  this.focus = I.focus();
  const sp = this.focus ? GAME.PLAYER_FOCUS_SPEED : GAME.PLAYER_SPEED;
  let mx=0,my=0;
  if(I.left()) mx-=1; if(I.right()) mx+=1; if(I.up()) my-=1; if(I.down()) my+=1;
  if(mx&&my){ const n=U.norm(mx,my); mx=n[0]; my=n[1]; }
  this.x += mx*sp*dt; this.y += my*sp*dt;
  this.x=U.clamp(this.x, GAME.PLAY_LEFT+8, GAME.PLAY_RIGHT-8);
  this.y=U.clamp(this.y, GAME.PLAY_TOP+8, GAME.PLAY_BOTTOM-8);
  if(this.invuln>0) this.invuln-=dt;
  if(this.bombActive>0) this.bombActive-=dt;
  this.spritePhase+=dt*0.2;
  // shooting
  this.shootTimer-=dt;
  if(I.shoot() && this.shootTimer<=0){
    this.shootTimer = this.focus ? 4 : 5;
    this.fire(game);
  }
  // bomb
  if(I.bomb() && this.bombs>0 && this.bombActive<=0 && this.invuln<=0){
    this.bombs--;
    this.bombActive=90;
    this.invuln=90;
    game.triggerBomb(this);
  }
};
E.Player.prototype.fire = function(game){
  const p=this.power;
  const a = window.AUDIO;
  a.sfxShoot();
  // forward shots
  const baseAngle = -Math.PI/2;
  const shots = [];
  if(this.char==='reimu'){
    // reimu: homing-ish straight + spread
    shots.push({a:baseAngle, sp:14});
    if(p>=1){ shots.push({a:baseAngle-0.08, sp:14}); shots.push({a:baseAngle+0.08, sp:14}); }
    if(p>=2){ shots.push({a:baseAngle-0.16, sp:14}); shots.push({a:baseAngle+0.16, sp:14}); }
    if(p>=3){ 
      // side needles
      shots.push({a:baseAngle-0.35, sp:13}); shots.push({a:baseAngle+0.35, sp:13});
    }
    if(p>=4){
      shots.push({a:baseAngle-0.5, sp:12}); shots.push({a:baseAngle+0.5, sp:12});
    }
  } else {
    shots.push({a:baseAngle, sp:15});
    if(p>=1){ shots.push({a:baseAngle, sp:15}); } // double
    if(p>=2){ shots.push({a:baseAngle-0.12, sp:15}); shots.push({a:baseAngle+0.12, sp:15}); }
    if(p>=3){ shots.push({a:baseAngle-0.25, sp:15}); shots.push({a:baseAngle+0.25, sp:15}); }
    if(p>=4){ shots.push({a:baseAngle-0.4, sp:15}); shots.push({a:baseAngle+0.4, sp:15}); }
  }
  for(const s of shots){
    const b=new E.Bullet(this.x+Math.cos(s.a)*10, this.y+Math.sin(s.a)*10, Math.cos(s.a)*s.sp, Math.sin(s.a)*s.sp, '#fff', 3, 'needle', 'player');
    game.bullets.push(b);
  }
  // options for reimu at high power? skip
};
E.Player.prototype.hit = function(game){
  if(this.invuln>0 || this.bombActive>0) return false;
  this.lives--;
  this.invuln=120;
  this.power=Math.max(1.0, this.power-1.0);
  // drop power items
  for(let i=0;i<4;i++){
    const it=new E.Item(this.x, this.y, 'power');
    it.vx=U.rand(-2,2); it.vy=U.rand(-3,-1);
    game.items.push(it);
  }
  // clear bullets on screen when hit
  if(game.clearBullets) game.clearBullets();
  window.AUDIO.sfxDeath();
  game.spawnExplosion(this.x,this.y,30,'#f6c');
  if(this.lives<=0){ this.lives=0; game.triggerContinue(); }
  return true;
};

// ---- Enemy ----
E.Enemy = function(x,y,type,hp,color){
  this.x=x;this.y=y;this.type=type;this.hp=hp;this.maxHp=hp;this.color=color||'#f6c';
  this.r= (type==='boss')? 24 : (type==='midboss'?16:10);
  this.vx=0;this.vy=0;this.dead=false;this.score=100;
  this.shootTimer=U.rand(30,60);this.pattern='aimed';this.age=0;
  this.phase=0;
};
E.Enemy.prototype.update = function(dt, game){
  this.age+=dt;
  this.x+=this.vx*dt; this.y+=this.vy*dt;
  this.shootTimer-=dt;
  if(this.shootTimer<=0){
    this.shootTimer = this.fireRate||60;
    this.fire(game);
  }
  if(this.x<GAME.PLAY_LEFT+this.r){ this.x=GAME.PLAY_LEFT+this.r; this.vx=Math.abs(this.vx); }
  if(this.x>GAME.PLAY_RIGHT-this.r){ this.x=GAME.PLAY_RIGHT-this.r; this.vx=-Math.abs(this.vx); }
  if(this.y<GAME.PLAY_TOP+this.r){ this.vy=Math.abs(this.vy); }
  if(this.y>GAME.PLAY_BOTTOM+60){ this.dead=true; } // off screen
};

// ---- Boss ----
E.Boss = function(x,y,name){
  this.x=x;this.y=y;this.name=name;
  this.r=32;this.dead=false;this.age=0;
  this.phases=[];this.phaseIndex=0;this.phase=null;
  this.hp=0;this.maxHp=0;this.invuln=0;
  this.shootTimer=0;this.moveTimer=0;
  this.vx=0;this.vy=0;this.baseX=(GAME.PLAY_LEFT+GAME.PLAY_RIGHT)/2;this.baseY=GAME.PLAY_TOP+120;
  this.spellActive=false;this.spellName='';
  this.dialogue=null;
};
E.Boss.prototype.setPhase = function(idx, game){
  if(idx>=this.phases.length){ this.dead=true; game.bossDefeated(this); return; }
  this.phaseIndex=idx;
  this.phase=this.phases[idx];
  this.hp=this.phase.hp; this.maxHp=this.phase.hp;
  this.spellActive=!!this.phase.spell;
  this.spellName=this.phase.name;
  this.invuln=60;
  this.shootTimer=30;
  this.moveTimer=0;
  this.vx=0; this.vy=0;
  this.spellIntro = this.phase.spell ? 180 : 40;
  if(this.phase.spell){
    game.spellCard = { name: this.phase.name, timer: 180, max: 180 };
    game.message=''; game.messageTimer=0;
    game.spawnExplosion(this.x,this.y,50,'#fff');
    game.shake = 18;
    if(window.AUDIO) window.AUDIO.sfxBoss();
  }
  if(this.phase.onEnter) this.phase.onEnter(this,game);
};
E.Boss.prototype.update = function(dt, game){
  this.age+=dt;
  if(this.invuln>0) this.invuln-=dt;
  if(this.spellIntro>0) this.spellIntro-=dt;
  // movement
  if(this.phase && this.phase.move) this.phase.move(this,dt,game);
  else {
    // default sine
    this.moveTimer+=dt;
    this.x = this.baseX + Math.sin(this.moveTimer*0.02)*80;
    this.y = this.baseY + Math.sin(this.moveTimer*0.013)*20;
  }
  this.shootTimer-=dt;
  if(this.shootTimer<=0 && this.invuln<=0 && this.spellIntro<=0){
    this.shootTimer = this.phase.fireRate||40;
    if(this.phase.pattern) this.phase.pattern(this,game);
  }
};
E.Boss.prototype.damage = function(dmg, game){
  if(this.invuln>0) return false;
  this.hp-=dmg;
  if(this.hp<=0){
    this.hp=0;
    this.setPhase(this.phaseIndex+1, game);
  }
  return true;
};
E.Boss.prototype.draw = function(ctx){
  // drawn in render
};
