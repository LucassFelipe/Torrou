/* game.js */
var GAME = window.GAME;
var U = window.UTILS;
var E = window.ENT;
var P = window.PAT;
var ST = window.STAGE;
var I = window.INPUT;
var A = window.AUDIO;

window.GS = {};
var GS = window.GS;

GS.state = 'MENU'; // MENU, PLAYING, PAUSED, GAMEOVER, STAGECLEAR, CLEAR
GS.player = null;
GS.bullets = [];
GS.enemies = [];
GS.items = [];
GS.particles = [];
GS.boss = null;
GS.midboss = null;
GS.stageIndex = 0;
GS.stageTimer = 0;
GS.timeline = [];
GS.timelineIdx = 0;
GS.message = '';
GS.messageTimer = 0;
GS.shake = 0;
GS.stars = [];
GS.menuSelection = 0; // 0 start, 1 char? 
GS.charChoice = 0; // 0 reimu, 1 marisa
GS.shotChoice = 0;

// init stars
for(let i=0;i<120;i++){
  GS.stars.push({ x: Math.random()*GAME.W, y: Math.random()*GAME.H, s: Math.random()*1.5+0.5, sp: Math.random()*0.5+0.2, p: Math.random()*Math.PI*2 });
}

GS.reset = function(){
  GS.player = new E.Player();
  GS.player.char = GS.charChoice===0?'reimu':'marisa';
  GS.bullets = [];
  GS.enemies = [];
  GS.items = [];
  GS.particles = [];
  GS.boss = null;
  GS.midboss = null;
  GS.stageIndex = 0;
  GS.continues = 0;
  GS.continueTimer = 0;
  GS.spellCard = null;
  if(!GS.scores) GS.scores=[];
  GS.stageTimer = 0;
  GS.timeline = ST.buildTimeline(0);
  GS.timelineIdx = 0;
  GS.message=''; GS.messageTimer=0;
  GS.shake=0;
  GS.state='PLAYING';
  A.startMusic([{f:330,d:0.25,type:'triangle'},{f:392,d:0.25},{f:440,d:0.25},{f:392,d:0.25},{f:330,d:0.5},{f:0,d:0.25},{f:294,d:0.25},{f:330,d:0.25},{f:392,d:0.5}]);
};

GS.spawnExplosion = function(x,y,n,color){
  // efeitos sao o item mais caro: limita por qualidade e pelo teto global
  const q=GAME.QUALITY;
  if(q===0) n = Math.min(n, 3);
  else if(q===1) n = Math.min(n, Math.ceil(n*0.5));
  const room = GAME.MAX_PARTICLES - GS.particles.length;
  if(room <= 0) return;
  if(n > room) n = room;
  for(let i=0;i<n;i++){
    const a=Math.random()*Math.PI*2; const sp=U.rand(0.5,4);
    GS.particles.push(new E.Particle(x,y,Math.cos(a)*sp,Math.sin(a)*sp,color,U.rand(15,35), U.rand(1,3)));
  }
};

GS.clearBullets = function(){
  let fx=0;
  for(const b of GS.bullets){
    if(b.owner==='enemy'){
      b.dead=true;
      // nao criar centenas de particulas de uma vez (era um freeze garantido)
      if(fx<40){ fx++; GS.spawnExplosion(b.x,b.y,1,'#fff'); }
    }
  }
  U.compact(GS.bullets);
  GS.spawnExplosion(GS.player.x, GS.player.y, 24, '#fff');
};

GS.showMessage = function(text, dur){
  GS.message=text; GS.messageTimer=dur;
};

GS.triggerBomb = function(player){
  A.sfxBomb();
  // clear enemy bullets in radius, damage enemies
  const cx=player.x, cy=player.y;
  let fx=0;
  for(const b of GS.bullets){
    if(b.owner==='enemy'){
      const dx=b.x-cx, dy=b.y-cy;
      if(dx*dx+dy*dy<260*260){
        b.dead=true;
        if(fx<60){ fx++; GS.spawnExplosion(b.x,b.y,3,'#fff'); }
      }
    }
  }
  for(const en of GS.enemies){
    const dx=en.x-cx, dy=en.y-cy;
    if(dx*dx+dy*dy<260*260){ en.hp -= (en.maxHp||10)*0.15 + 50; if(en.hp<=0){ en.dead=true; GS.onEnemyKilled(en); } }
  }
  if(GS.boss){ const dx=GS.boss.x-cx, dy=GS.boss.y-cy; if(dx*dx+dy*dy<260*260){ GS.boss.damage(200, GS); } }
  GS.spawnExplosion(cx,cy,60,'#fff');
  GS.shake=20;
  // visual bomb circle
  GS.bombCircle = { x:cx, y:cy, r:0, maxR:260, life:30 };
};

GS.onEnemyKilled = function(en){
  // score
  GS.player.score += en.score || 100;
  // drops
  if(Math.random()<0.35){
    const it=new E.Item(en.x,en.y, Math.random()<0.5?'power':'point');
    GS.items.push(it);
  }
  if(en.type==='midboss'){
    // drop multiple
    for(let i=0;i<8;i++){ GS.items.push(new E.Item(en.x,en.y, i<2?'power':'point')); }
    GS.player.score += 5000;
    GS.showMessage('Midboss Defeated', 90);
  }
  GS.spawnExplosion(en.x,en.y, 18, en.color||'#f6c');
  A.sfxHit();
};

GS.bossDefeated = function(boss){
  A.sfxBoss();
  GS.player.score += 10000 * (GS.stageIndex+1);
  // drops
  for(let i=0;i<12;i++) GS.items.push(new E.Item(boss.x, boss.y, i<4?'power':'point'));
  GS.spawnExplosion(boss.x,boss.y,80,'#fff');
  GS.shake=30;
  GS.boss=null;
  GS.spellCard=null;
  // stage clear after delay
  GS.stageClearTimer = 180;
  GS.state='STAGECLEAR';
  A.stopMusic();
};

GS.qualifiesScore = function(score){
  const scores = GS.scores || [];
  if(scores.length < 10) return score > 0;
  return score > scores[scores.length-1].score;
};
GS.startNameEntry = function(score){
  GS.nameEntry = { score: score, letters:['A','A','A'], pos:0 };
  GS.state = 'NAMEENTRY';
  A.stopMusic();
};
GS.saveScore = function(name, score){
  const scores = GS.scores || [];
  scores.push({ name: name, score: score });
  scores.sort((a,b)=> b.score - a.score);
  if(scores.length > 10) scores.length = 10;
  GS.scores = scores;
  try { localStorage.setItem('th06_scores', JSON.stringify(scores)); } catch(e){}
  const hi = scores.length ? scores[0].score : 0;
  GS.highScore = Math.max(GS.highScore || 0, score, hi);
  try { localStorage.setItem('th06_highscore', String(GS.highScore)); } catch(e){}
};
GS.gameOver = function(){
  A.stopMusic();
  A.sfxDeath();
  if(GS.qualifiesScore(GS.player.score)){
    GS.startNameEntry(GS.player.score);
  } else {
    GS.state='GAMEOVER';
  }
};

GS.triggerContinue = function(){
  if(GS.continues >= 3){
    GS.gameOver();
    return;
  }
  GS.state = 'CONTINUE';
  GS.continueTimer = 600;
  GS.clearBullets();
  A.stopMusic();
};

GS.doContinue = function(){
  GS.continues++;
  const pl = GS.player;
  pl.lives = 3;
  pl.bombs = 3;
  pl.power = 1.0;
  pl.x = (GAME.PLAY_LEFT+GAME.PLAY_RIGHT)/2;
  pl.y = GAME.PLAY_BOTTOM-60;
  pl.invuln = 180;
  pl.bombActive = 0;
  GS.clearBullets();
  GS.spellCard = null;
  GS.message = '';
  GS.state = 'PLAYING';
  GS.showMessage('CONTINUE x'+GS.continues, 90);
};

GS.nextStage = function(){
  GS.stageIndex++;
  if(GS.stageIndex >= GAME.STAGE_COUNT){
    if(GS.qualifiesScore(GS.player.score)){
      GS.startNameEntry(GS.player.score);
    } else {
      GS.state='CLEAR';
      GS.showMessage('All Clear!', 9999);
    }
    return;
  }
  GS.bullets=[]; GS.enemies=[]; GS.items=[]; GS.particles=[];
  GS.boss=null; GS.midboss=null; GS.spellCard=null;
  GS.stageTimer=0;
  GS.timeline = ST.buildTimeline(GS.stageIndex);
  GS.timelineIdx=0;
  GS.state='PLAYING';
  // music
  A.startMusic([{f:294,d:0.25},{f:349,d:0.25},{f:392,d:0.25},{f:440,d:0.25},{f:392,d:0.5},{f:0,d:0.25}]);
};

// collision handling
GS.handleCollisions = function(){
  const pl=GS.player;
  const px=pl.x, py=pl.y;
  // player bullets vs enemies
  for(const b of GS.bullets){
    if(b.dead || b.owner!=='player') continue;
    // vs enemies
    for(const en of GS.enemies){
      if(en.dead) continue;
      const dx=b.x-en.x, dy=b.y-en.y, rr=b.r+en.r;
      if(dx*dx+dy*dy <= rr*rr){
        b.dead=true;
        en.hp -= 1; // damage
        if(en.hp<=0){ en.dead=true; GS.onEnemyKilled(en); }
        else { GS.spawnExplosion(b.x,b.y,2,'#fff'); }
      }
    }
    // vs boss
    if(GS.boss && !GS.boss.dead){
      const dx=b.x-GS.boss.x, dy=b.y-GS.boss.y, rr=b.r+GS.boss.r;
      if(dx*dx+dy*dy <= rr*rr){
        b.dead=true;
        if(GS.boss.damage(1, GS)) { /* ok */ }
        GS.spawnExplosion(b.x,b.y,2,'#fff');
      }
    }
  }
  // enemy bullets vs player
  if(pl.invuln<=0 && pl.bombActive<=0){
    for(const b of GS.bullets){
      if(b.dead || b.owner!=='enemy') continue;
      const dx=b.x-px, dy=b.y-py;
      const d2=dx*dx+dy*dy;
      const hr = GAME.PLAYER_HITBOX + b.r;
      if(d2 <= hr*hr){
        b.dead=true;
        pl.hit(GS);
        GS.shake=12;
        break;
      }
      // graze
      if(!b.grazed){
        const gr = GAME.GRAZE_RADIUS + b.r;
        if(d2 <= gr*gr){
          b.grazed=true;
          pl.graze++;
          pl.score += 10;
          A.sfxGraze();
          GS.spawnExplosion(b.x,b.y,1,'#fff');
        }
      }
    }
  }
  // enemy body vs player
  if(pl.invuln<=0 && pl.bombActive<=0){
    for(const en of GS.enemies){
      if(en.dead) continue;
      const dx=px-en.x, dy=py-en.y, rr=GAME.PLAYER_HITBOX+en.r;
      if(dx*dx+dy*dy <= rr*rr){
        pl.hit(GS); GS.shake=12; en.hp=0; en.dead=true; GS.onEnemyKilled(en); break;
      }
    }
    if(GS.boss && !GS.boss.dead){
      const dx=px-GS.boss.x, dy=py-GS.boss.y, rr=GAME.PLAYER_HITBOX+GS.boss.r;
      if(dx*dx+dy*dy <= rr*rr){
        pl.hit(GS); GS.shake=12;
      }
    }
  }
  // items vs player / POC
  for(const it of GS.items){
    if(it.dead) continue;
    // auto collect if player high (POC line y=PLAY_TOP+80) and item above? EoSD POC: if player at top, items auto. Simpler: collect on contact or if item.y < playTop+60 and player anywhere? 
    const dx=it.x-px, dy=it.y-py;
    if(dx*dx+dy*dy<576){
      it.dead=true;
      GS.collectItem(it);
    } else if(py < GAME.PLAY_TOP+100 && it.y < py){
      // vacuum
      const a=U.angle(it.x,it.y,pl.x,pl.y);
      it.vx += Math.cos(a)*0.6; it.vy += Math.sin(a)*0.6;
    }
  }
};

GS.collectItem = function(it){
  A.sfxItem();
  if(it.type==='power'){
    const wasMax = GS.player.power >= 4.0;
    GS.player.power = Math.min(4.0, GS.player.power+0.08);
    const nowMax = GS.player.power >= 4.0;
    if(wasMax){
      const pv = Math.max(100, Math.floor(GS.player.pointValue * (1 - (GS.player.y-GAME.PLAY_TOP)/GAME.PLAY_H *0.5)));
      GS.player.score += pv;
      GS.player.pointValue = Math.min(51200, GS.player.pointValue+100);
      GS.clearBullets();
      GS.showMessage('MAX POWER', 60);
    } else {
      GS.player.score += 10;
      if(nowMax){
        GS.clearBullets();
        GS.showMessage('MAX POWER', 90);
      }
    }
  } else if(it.type==='point'){
    const pv = Math.max(100, Math.floor(GS.player.pointValue * (1 - (GS.player.y-GAME.PLAY_TOP)/GAME.PLAY_H *0.5)));
    GS.player.score += pv;
    GS.player.pointValue = Math.min(51200, GS.player.pointValue+100);
  } else if(it.type==='bomb'){
    GS.player.bombs = Math.min(8, GS.player.bombs+1);
  } else if(it.type==='life'){
    GS.player.lives++;
  }
  GS.spawnExplosion(it.x,it.y,6, it.type==='power'?'#f44':it.type==='point'?'#48f':'#4f4');
};

GS.update = function(dt){
  dt = dt * (GAME.GAME_SPEED || 1);
  if(GS.state==='STAGECLEAR'){
    GS.stageClearTimer-=dt;
    if(GS.stageClearTimer<=0) GS.nextStage();
    // still update stars/particles
    for(const p of GS.particles){ if(!p.dead) p.update(dt); }
    U.compact(GS.particles);
    for(const s of GS.stars){ s.y += s.sp*dt*0.5; if(s.y>GAME.H){ s.y=0; s.x=Math.random()*GAME.W; } s.p+=0.05; }
    return;
  }
  if(GS.state!=='PLAYING') return;
  const pl=GS.player;
  pl.update(dt, GS);
  // stage timer & timeline
  GS.stageTimer += dt;
  while(GS.timelineIdx < GS.timeline.length && GS.stageTimer >= GS.timeline[GS.timelineIdx].at){
    const ev = GS.timeline[GS.timelineIdx++];
    try { ev.action(GS); } catch(e){ console.error(e); }
  }
  // update enemies
  for(const en of GS.enemies){
    if(en.dead) continue;
    if(en.update) en.update(dt, GS); else E.Enemy.prototype.update.call(en,dt,GS);
  }
  U.compact(GS.enemies);
  // update boss
  if(GS.boss && !GS.boss.dead){
    GS.boss.update(dt, GS);
  }
  // midboss cleanup
  if(GS.midboss && GS.midboss.dead){ GS.midboss=null; }
  // update bullets
  for(const b of GS.bullets){
    if(b.dead) continue;
    b.update(dt);
    P.updateCurved(b,dt);
  }
  U.compact(GS.bullets);
  if(GS.bullets.length > GAME.MAX_BULLETS) GS.bullets.length = GAME.MAX_BULLETS;
  // update items
  for(const it of GS.items){ if(!it.dead) it.update(dt, pl); }
  U.compact(GS.items);
  if(GS.items.length > GAME.MAX_ITEMS) GS.items.splice(0, GS.items.length-GAME.MAX_ITEMS);
  // update particles
  for(const p of GS.particles){ if(!p.dead) p.update(dt); }
  U.compact(GS.particles);
  if(GS.particles.length > GAME.MAX_PARTICLES) GS.particles.length = GAME.MAX_PARTICLES;
  // bomb circle
  if(GS.bombCircle){ GS.bombCircle.r += (GS.bombCircle.maxR-GS.bombCircle.r)*0.2; GS.bombCircle.life-=dt; if(GS.bombCircle.life<=0) GS.bombCircle=null; }
  // collisions
  GS.handleCollisions();
  // message timer
  if(GS.messageTimer>0) GS.messageTimer-=dt;
  // spell card timer
  if(GS.spellCard){ GS.spellCard.timer-=dt; if(GS.spellCard.timer<=0) GS.spellCard=null; }
  if(GS.shake>0) GS.shake-=1;
  // update stars
  for(const s of GS.stars){ s.y += s.sp*dt*0.5; if(s.y>GAME.H){ s.y=0; s.x=Math.random()*GAME.W; } s.p+=0.05; }
};

// rendering
GS.render = function(ctx){
  // escala interna (qualidade baixa renderiza em 480x360 e o CSS estica)
  const scale = GS.renderScale || 1;
  ctx.setTransform(scale,0,0,scale,0,0);
  // shake
  ctx.save();
  if(GS.shake>0){ ctx.translate((Math.random()-0.5)*GS.shake, (Math.random()-0.5)*GS.shake); }
  // background estatico pre-renderizado (sem criar gradientes por frame)
  if(GS.backdrop) ctx.drawImage(GS.backdrop,0,0);
  else { ctx.fillStyle='#0a0018'; ctx.fillRect(0,0,GAME.W,GAME.H); }
  // stars: um unico path/fill (twinkle via tamanho, sem trocar globalAlpha 120x)
  ctx.fillStyle='#fff';
  ctx.globalAlpha=0.7;
  ctx.beginPath();
  for(const s of GS.stars){
    const sz = s.s*(0.7+0.3*Math.sin(s.p));
    ctx.rect(s.x, s.y, sz, sz);
  }
  ctx.fill();
  ctx.globalAlpha=1;
  // playfield border
  ctx.strokeStyle='rgba(255,255,255,0.15)';
  ctx.strokeRect(GAME.PLAY_LEFT, GAME.PLAY_TOP, GAME.PLAY_W, GAME.PLAY_H);
  // mist overlay
  if(GAME.QUALITY>0){
    ctx.fillStyle='rgba(180,40,80,0.06)';
    ctx.fillRect(GAME.PLAY_LEFT, GAME.PLAY_TOP, GAME.PLAY_W, GAME.PLAY_H);
  }

  if(GS.state==='MENU'){
    GS.renderMenu(ctx);
    ctx.restore();
    return;
  }
  if(GS.state==='GAMEOVER'){
    GS.renderGame(ctx);
    GS.renderGameOver(ctx);
    // show high scores
    ctx.fillStyle='rgba(0,0,0,0.5)'; 
    let y = GAME.H/2+110;
    ctx.fillStyle='#fff'; ctx.font='12px monospace'; ctx.textAlign='center';
    ctx.fillText('HIGH SCORES', GAME.W/2, y); y+=16;
    (GS.scores||[]).slice(0,5).forEach((s,i)=>{
      ctx.fillText((i+1)+'. '+s.name+'  '+String(s.score).padStart(9,'0'), GAME.W/2, y); y+=14;
    });
    ctx.restore();
    return;
  }
  if(GS.state==='NAMEENTRY'){
    ctx.fillStyle='rgba(0,0,0,0.75)'; ctx.fillRect(0,0,GAME.W,GAME.H);
    ctx.fillStyle='#ff4'; ctx.font='bold 28px monospace'; ctx.textAlign='center';
    ctx.fillText('NAME ENTRY', GAME.W/2, GAME.H/2-80);
    ctx.fillStyle='#fff'; ctx.font='16px monospace';
    ctx.fillText('Score: '+String(GS.nameEntry.score).padStart(9,'0'), GAME.W/2, GAME.H/2-40);
    const ne=GS.nameEntry;
    ctx.font='bold 32px monospace';
    for(let i=0;i<3;i++){
      const x = GAME.W/2 - 40 + i*40;
      if(i===ne.pos){ ctx.fillStyle='#ff4'; } else { ctx.fillStyle='#fff'; }
      ctx.fillText(ne.letters[i], x, GAME.H/2+20);
    }
    ctx.fillStyle='#aaa'; ctx.font='12px monospace';
    ctx.fillText('Up/Down change  Left/Right move  Enter confirm', GAME.W/2, GAME.H/2+80);
    ctx.restore();
    return;
  }
  if(GS.state==='CONTINUE'){
    GS.renderGame(ctx);
    ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillRect(0,0,GAME.W,GAME.H);
    ctx.fillStyle='#ff4'; ctx.font='bold 32px monospace'; ctx.textAlign='center';
    ctx.fillText('CONTINUE?', GAME.W/2, GAME.H/2-20);
    ctx.fillStyle='#fff'; ctx.font='16px monospace';
    ctx.fillText('Press Enter', GAME.W/2, GAME.H/2+20);
    ctx.fillText('Time: '+Math.ceil(GS.continueTimer/60), GAME.W/2, GAME.H/2+50);
    ctx.restore();
    return;
  }
  if(GS.state==='CLEAR'){
    GS.renderGame(ctx);
    GS.renderClear(ctx);
    ctx.restore();
    return;
  }
  GS.renderGame(ctx);
  ctx.restore();
};

// ---- sprite drawing helpers ----
GS.drawPlayer = function(ctx, pl){
  ctx.save();
  ctx.translate(pl.x, pl.y);
  const reimu = pl.char==='reimu';
  // shadow
  ctx.fillStyle='rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(0,10,10,4,0,0,Math.PI*2); ctx.fill();
  if(reimu){
    // hair back
    ctx.fillStyle='#2a1a3a';
    ctx.beginPath(); ctx.arc(0,-2,11,0,Math.PI*2); ctx.fill();
    // dress body
    ctx.fillStyle='#e22';
    ctx.beginPath(); ctx.moveTo(-9,2); ctx.lineTo(-12,14); ctx.lineTo(12,14); ctx.lineTo(9,2); ctx.closePath(); ctx.fill();
    // white collar
    ctx.fillStyle='#fff';
    ctx.beginPath(); ctx.moveTo(-7,2); ctx.lineTo(0,-1); ctx.lineTo(7,2); ctx.lineTo(0,5); ctx.closePath(); ctx.fill();
    // head
    ctx.fillStyle='#ffd9b3';
    ctx.beginPath(); ctx.arc(0,-4,6,0,Math.PI*2); ctx.fill();
    // hair front
    ctx.fillStyle='#2a1a3a';
    ctx.beginPath(); ctx.arc(0,-6,7,Math.PI,Math.PI*2); ctx.fill();
    ctx.fillRect(-7,-6,4,6); ctx.fillRect(3,-6,4,6);
    // eyes
    ctx.fillStyle='#222';
    ctx.beginPath(); ctx.arc(-2,-4,1.2,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(2,-4,1.2,0,Math.PI*2); ctx.fill();
    // red ribbon
    ctx.fillStyle='#e22';
    ctx.beginPath(); ctx.arc(0,-11,3,0,Math.PI*2); ctx.fill();
  } else {
    // marisa: black dress, blonde hair, witch hat
    ctx.fillStyle='#333';
    ctx.beginPath(); ctx.moveTo(-10,2); ctx.lineTo(-13,15); ctx.lineTo(13,15); ctx.lineTo(10,2); ctx.closePath(); ctx.fill();
    ctx.fillStyle='#fff';
    ctx.fillRect(-6,6,12,4);
    ctx.fillStyle='#ffd9b3';
    ctx.beginPath(); ctx.arc(0,-4,6,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#f5c542';
    ctx.beginPath(); ctx.arc(0,-6,7,Math.PI,Math.PI*2); ctx.fill();
    ctx.fillRect(-7,-6,4,5); ctx.fillRect(3,-6,4,5);
    ctx.fillStyle='#222';
    ctx.beginPath(); ctx.arc(-2,-4,1.2,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(2,-4,1.2,0,Math.PI*2); ctx.fill();
    // hat
    ctx.fillStyle='#222';
    ctx.beginPath(); ctx.moveTo(0,-18); ctx.lineTo(-12,-6); ctx.lineTo(12,-6); ctx.closePath(); ctx.fill();
    ctx.fillRect(-13,-6,26,3);
  }
  // focus hitbox
  if(pl.focus){
    ctx.strokeStyle='rgba(255,255,255,0.9)';
    ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.arc(0,0,GAME.PLAYER_HITBOX+2,0,Math.PI*2); ctx.stroke();
  } else {
    ctx.fillStyle='#fff';
    ctx.beginPath(); ctx.arc(0,0,GAME.PLAYER_HITBOX,0,Math.PI*2); ctx.fill();
  }
  ctx.restore();
};

GS.drawEnemy = function(ctx, en){
  ctx.save();
  ctx.translate(en.x, en.y);
  const c = en.color || '#f6c';
  // wings
  ctx.fillStyle='rgba(255,255,255,0.5)';
  ctx.beginPath(); ctx.ellipse(-en.r-6,0,8,4,-0.4,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(en.r+6,0,8,4,0.4,0,Math.PI*2); ctx.fill();
  // body
  ctx.fillStyle=c;
  ctx.beginPath(); ctx.arc(0,0,en.r,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,0.6)'; ctx.lineWidth=1; ctx.stroke();
  // face
  ctx.fillStyle='#fff';
  ctx.beginPath(); ctx.arc(-3,-2,2,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(3,-2,2,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#222';
  ctx.beginPath(); ctx.arc(-3,-2,1,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(3,-2,1,0,Math.PI*2); ctx.fill();
  ctx.restore();
  // hp bar
  if(en.maxHp && en.maxHp>10){
    ctx.fillStyle='rgba(0,0,0,0.5)';
    ctx.fillRect(en.x-20,en.y-en.r-8,40,4);
    ctx.fillStyle='#0f0';
    ctx.fillRect(en.x-20,en.y-en.r-8,40*(en.hp/en.maxHp),4);
  }
};

GS.drawRumiaBoss = function(ctx, b){
  ctx.save();
  ctx.translate(b.x, b.y);
  // dark aura (sprite pre-renderizado)
  if(GS.auraRumia) ctx.drawImage(GS.auraRumia,-60,-60);
  else { ctx.fillStyle='rgba(80,0,80,0.25)'; ctx.fillRect(-60,-60,120,120); }
  // wings (bat-like, dark)
  ctx.fillStyle='rgba(40,0,40,0.8)';
  ctx.beginPath(); ctx.moveTo(-b.r-8,0); ctx.lineTo(-b.r-24,-14); ctx.lineTo(-b.r-16,4); ctx.lineTo(-b.r-28,12); ctx.lineTo(-b.r-8,6); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(b.r+8,0); ctx.lineTo(b.r+24,-14); ctx.lineTo(b.r+16,4); ctx.lineTo(b.r+28,12); ctx.lineTo(b.r+8,6); ctx.closePath(); ctx.fill();
  // dress
  ctx.fillStyle='#1a0a1a';
  ctx.beginPath(); ctx.moveTo(-12,4); ctx.lineTo(-16,26); ctx.lineTo(16,26); ctx.lineTo(12,4); ctx.closePath(); ctx.fill();
  // head
  ctx.fillStyle='#ffd9b3';
  ctx.beginPath(); ctx.arc(0,-6,9,0,Math.PI*2); ctx.fill();
  // hair (dark, long)
  ctx.fillStyle='#1a0a1a';
  ctx.beginPath(); ctx.arc(0,-8,10,Math.PI,Math.PI*2); ctx.fill();
  ctx.fillRect(-10,-8,5,16); ctx.fillRect(5,-8,5,16);
  // eyes red
  ctx.fillStyle='#e22';
  ctx.beginPath(); ctx.arc(-3,-6,1.8,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(3,-6,1.8,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#222';
  ctx.beginPath(); ctx.arc(-3,-6,0.8,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(3,-6,0.8,0,Math.PI*2); ctx.fill();
  // crescent
  ctx.strokeStyle='#fa4'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.arc(0,-16,5,0.3,Math.PI-0.3); ctx.stroke();
  ctx.restore();
};

GS.drawFlandreBoss = function(ctx, b){
  ctx.save();
  ctx.translate(b.x, b.y);
  if(GS.auraFlandre) ctx.drawImage(GS.auraFlandre,-70,-70);
  else { ctx.fillStyle='rgba(255,60,60,0.2)'; ctx.fillRect(-70,-70,140,140); }
  // crystal wings
  const wingColors=['#f44','#fa4','#f4f','#4ff'];
  for(let i=0;i<4;i++){
    ctx.fillStyle=wingColors[i];
    ctx.beginPath();
    const ang = (i/4)*Math.PI*2 + (b.age||0)*0.02;
    ctx.moveTo(0,0);
    ctx.lineTo(Math.cos(ang)*40, Math.sin(ang)*40);
    ctx.lineTo(Math.cos(ang+0.3)*25, Math.sin(ang+0.3)*25);
    ctx.closePath();
    ctx.fill();
  }
  // dress
  ctx.fillStyle='#c22';
  ctx.beginPath(); ctx.moveTo(-14,4); ctx.lineTo(-20,30); ctx.lineTo(20,30); ctx.lineTo(14,4); ctx.closePath(); ctx.fill();
  ctx.fillStyle='#fff';
  ctx.fillRect(-8,10,16,6);
  // head
  ctx.fillStyle='#ffd9b3';
  ctx.beginPath(); ctx.arc(0,-6,10,0,Math.PI*2); ctx.fill();
  // hair blonde
  ctx.fillStyle='#f5c542';
  ctx.beginPath(); ctx.arc(0,-8,11,Math.PI,Math.PI*2); ctx.fill();
  ctx.fillRect(-11,-8,6,16); ctx.fillRect(5,-8,6,16);
  // eyes red
  ctx.fillStyle='#e22';
  ctx.beginPath(); ctx.arc(-3,-6,1.8,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(3,-6,1.8,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#222';
  ctx.beginPath(); ctx.arc(-3,-6,0.8,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(3,-6,0.8,0,Math.PI*2); ctx.fill();
  // hat with crystal
  ctx.fillStyle='#222';
  ctx.beginPath(); ctx.moveTo(0,-20); ctx.lineTo(-12,-8); ctx.lineTo(12,-8); ctx.closePath(); ctx.fill();
  ctx.fillStyle='#f44';
  ctx.beginPath(); ctx.arc(0,-20,4,0,Math.PI*2); ctx.fill();
  ctx.restore();
};

GS.drawParticles = function(ctx){
  const buckets=GS._pBuckets;
  const maxDraw = GAME.QUALITY===0 ? 150 : 99999;
  let count=0;
  for(let i=0;i<GS.particles.length;i++){
    const p=GS.particles[i];
    if(p.dead) continue;
    let a=p.life/p.maxLife;
    if(a<0) a=0; else if(a>1) a=1;
    buckets[(a*7.99)|0].push(p);
    if(++count>=maxDraw) break;
  }
  // 8 mudancas de globalAlpha em vez de uma por particula
  for(let bi=0;bi<8;bi++){
    const arr=buckets[bi];
    const n=arr.length;
    if(n){
      ctx.globalAlpha=(bi+1)/8;
      for(let i=0;i<n;i++){
        const p=arr[i];
        ctx.fillStyle=p.color;
        ctx.fillRect(p.x-p.size*0.5, p.y-p.size*0.5, p.size, p.size);
      }
      arr.length=0;
    }
  }
  ctx.globalAlpha=1;
};

GS.renderGame = function(ctx){
  const pl=GS.player;
  // items (sprites pre-renderizados: sem fillText/font por item)
  for(const it of GS.items){
    const sp=GS.itemSprites && GS.itemSprites[it.type];
    if(sp) ctx.drawImage(sp, it.x-10, it.y-10);
    else { ctx.fillStyle='#f44'; ctx.fillRect(it.x-it.r,it.y-it.r,it.r*2,it.r*2); }
  }
  // bullets
  const lowQ = GAME.QUALITY===0;
  let lastColor='';
  for(const b of GS.bullets){
    if(b.color!==lastColor){ ctx.fillStyle=b.color; lastColor=b.color; }
    if(lowQ || b.type==='laser'||b.type==='rice'){
      ctx.fillRect(b.x-b.r,b.y-b.r,b.r*2,b.r*2);
    } else {
      ctx.beginPath(); ctx.arc(b.x,b.y,b.r,0,Math.PI*2); ctx.fill();
    }
  }
  // particles
  GS.drawParticles(ctx);
  // enemies
  for(const en of GS.enemies){
    if(en.dead) continue;
    GS.drawEnemy(ctx, en);
  }
  // boss
  if(GS.boss && !GS.boss.dead){
    const b=GS.boss;
    if(b.kind==='rumia') GS.drawRumiaBoss(ctx,b);
    else if(b.kind==='flandre') GS.drawFlandreBoss(ctx,b);
    // hp bar top
    ctx.fillStyle='rgba(0,0,0,0.6)';
    ctx.fillRect(GAME.PLAY_LEFT, GAME.PLAY_TOP+2, GAME.PLAY_W, 6);
    ctx.fillStyle = b.phase && b.phase.spell ? '#f44' : '#fa4';
    ctx.fillRect(GAME.PLAY_LEFT, GAME.PLAY_TOP+2, GAME.PLAY_W*(b.hp/b.maxHp), 6);
    ctx.fillStyle='#fff'; ctx.font='10px monospace'; ctx.textAlign='left';
    ctx.fillText(b.spellName||b.name, GAME.PLAY_LEFT+4, GAME.PLAY_TOP);
  }
  // player
  if(pl.invuln<=0 || Math.floor(pl.invuln/6)%2===0){
    GS.drawPlayer(ctx, pl);
    // options
    if(pl.power>=3){
      ctx.fillStyle='rgba(255,255,255,0.4)';
      ctx.beginPath(); ctx.arc(pl.x-14,pl.y-4,4,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(pl.x+14,pl.y-4,4,0,Math.PI*2); ctx.fill();
    }
  }
  // bomb circle
  if(GS.bombCircle){
    ctx.strokeStyle='rgba(255,255,255,0.6)';
    ctx.lineWidth=3;
    ctx.beginPath(); ctx.arc(GS.bombCircle.x,GS.bombCircle.y,GS.bombCircle.r,0,Math.PI*2); ctx.stroke();
  }
  // HUD
  GS.renderHUD(ctx);
  // spell card banner
  if(GS.spellCard){
    const sc=GS.spellCard;
    const t=sc.timer; const max=sc.max;
    let alpha=1;
    if(t>max-30) alpha=(max-t)/30;
    if(t<30) alpha=t/30;
    alpha=Math.max(0,Math.min(1,alpha));
    ctx.globalAlpha=alpha;
    ctx.fillStyle='rgba(0,0,0,0.75)';
    ctx.fillRect(GAME.PLAY_LEFT, GAME.H/2-45, GAME.PLAY_W, 90);
    ctx.strokeStyle='#fff'; ctx.lineWidth=2;
    ctx.strokeRect(GAME.PLAY_LEFT+6, GAME.H/2-39, GAME.PLAY_W-12, 78);
    ctx.fillStyle='#ff4'; ctx.font='bold 20px monospace'; ctx.textAlign='center';
    ctx.fillText(sc.name, GAME.W/2, GAME.H/2+8);
    if(t>max-12){
      ctx.globalAlpha=(t-(max-12))/12*0.7;
      ctx.fillStyle='#fff';
      ctx.fillRect(0,0,GAME.W,GAME.H);
    }
    ctx.globalAlpha=1;
  }
  // message
  if(GS.messageTimer>0){
    ctx.fillStyle='rgba(0,0,0,0.6)';
    ctx.fillRect(GAME.PLAY_LEFT, GAME.H/2-20, GAME.PLAY_W, 40);
    ctx.fillStyle='#fff'; ctx.font='bold 16px monospace'; ctx.textAlign='center';
    ctx.fillText(GS.message, GAME.W/2, GAME.H/2+6);
  }
};

GS.renderHUD = function(ctx){
  const pl=GS.player;
  ctx.fillStyle='#fff'; ctx.font='12px monospace'; ctx.textAlign='left';
  ctx.fillText('SCORE', 8, 16);
  ctx.fillText(U.formatScore(pl.score), 8, 32);
  ctx.textAlign='right';
  ctx.fillText('HI', GAME.W-8, 16);
  ctx.fillText(String(GS.highScore||0).padStart(9,'0'), GAME.W-8, 32);
  ctx.textAlign='left';
  // lives (hearts)
  ctx.fillStyle='#fff'; ctx.fillText('LIFE', 8, GAME.H-72);
  for(let i=0;i<pl.lives;i++){
    const x=12+i*18, y=GAME.H-62;
    ctx.fillStyle='#f44';
    ctx.beginPath();
    ctx.moveTo(x, y+4);
    ctx.bezierCurveTo(x, y, x-6, y, x-6, y+4);
    ctx.bezierCurveTo(x-6, y+8, x, y+10, x, y+12);
    ctx.bezierCurveTo(x, y+10, x+6, y+8, x+6, y+4);
    ctx.bezierCurveTo(x+6, y, x, y, x, y+4);
    ctx.fill();
  }
  // bombs (bomb icon)
  ctx.fillStyle='#fff'; ctx.fillText('BOMB', 8, GAME.H-34);
  for(let i=0;i<pl.bombs;i++){
    const x=12+i*18, y=GAME.H-22;
    ctx.fillStyle='#4f4';
    ctx.beginPath(); ctx.arc(x,y,6,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='#fff'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(x+4,y-4); ctx.lineTo(x+6,y-9); ctx.stroke();
    ctx.fillStyle='#fa4';
    ctx.beginPath(); ctx.arc(x+6,y-9,2,0,Math.PI*2); ctx.fill();
  }
  // power
  ctx.fillStyle='#fff'; ctx.textAlign='right';
  ctx.fillText('POWER', GAME.W-8, GAME.H-40);
  ctx.fillStyle='rgba(255,255,255,0.2)';
  ctx.fillRect(GAME.W-108, GAME.H-30, 100, 8);
  ctx.fillStyle='#f44';
  ctx.fillRect(GAME.W-108, GAME.H-30, 100*(pl.power/4.0), 8);
  ctx.fillStyle='#fff'; ctx.fillText(pl.power.toFixed(2), GAME.W-8, GAME.H-14);
  // graze
  ctx.textAlign='right';
  ctx.fillText('GRAZE '+pl.graze, GAME.W-8, 48);
  // stage
  ctx.textAlign='center';
  ctx.fillText('STAGE '+(GS.stageIndex+1), GAME.W/2, 16);
};

GS.renderMenu = function(ctx){
  ctx.fillStyle='#fff'; ctx.font='bold 32px monospace'; ctx.textAlign='center';
  ctx.fillText('TORROU!', GAME.W/2, 120);
  ctx.font='14px monospace';
  ctx.fillText('Embodiment of Scarlet Devil - Web', GAME.W/2, 150);
  ctx.fillText('Prof. Choma, o clone ficou pronto (e sem Wine!)', GAME.W/2, 175);
  ctx.fillText('Arrow/WASD move  Shift focus  Z shoot  X bomb', GAME.W/2, 220);
  ctx.fillText('Enter start', GAME.W/2, 240);
  ctx.font='16px monospace';
  ctx.fillStyle = GS.charChoice===0?'#ff4':'#fff';
  ctx.fillText('Reimu  (Homing)', GAME.W/2, 300);
  ctx.fillStyle = GS.charChoice===1?'#ff4':'#fff';
  ctx.fillText('Marisa (Power)', GAME.W/2, 325);
  ctx.fillStyle='#888'; ctx.font='12px monospace';
  ctx.fillText('Up/Down choose character', GAME.W/2, 360);
  // blink
  if(Math.floor(Date.now()/500)%2===0){
    ctx.fillStyle='#fff'; ctx.font='bold 18px monospace';
    ctx.fillText('PRESS ENTER', GAME.W/2, 420);
  }
};

GS.renderGameOver = function(ctx){
  ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillRect(0,0,GAME.W,GAME.H);
  ctx.fillStyle='#f44'; ctx.font='bold 40px monospace'; ctx.textAlign='center';
  ctx.fillText('GAME OVER', GAME.W/2, GAME.H/2);
  ctx.fillStyle='#fff'; ctx.font='16px monospace';
  ctx.fillText('Score: '+U.formatScore(GS.player.score), GAME.W/2, GAME.H/2+40);
  ctx.fillText('Press Enter to retry', GAME.W/2, GAME.H/2+80);
  ctx.fillText('Prof. Choma, pelo menos um 5?', GAME.W/2, GAME.H/2+105);
};

GS.renderClear = function(ctx){
  ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillRect(0,0,GAME.W,GAME.H);
  ctx.fillStyle='#ff4'; ctx.font='bold 40px monospace'; ctx.textAlign='center';
  ctx.fillText('ALL CLEAR!', GAME.W/2, GAME.H/2);
  ctx.fillStyle='#fff'; ctx.font='16px monospace';
  ctx.fillText('Score: '+U.formatScore(GS.player.score), GAME.W/2, GAME.H/2+40);
  ctx.fillText('Press Enter', GAME.W/2, GAME.H/2+80);
};

// menu input
GS.handleMenuInput = function(){
  if(I.left()||I.right()){
    // debounce via wasPressed? INPUT doesn't track per-frame for arrows easily; use a timer
  }
  if(I.wasPressed('ArrowUp')||I.wasPressed('KeyW')) GS.charChoice=0;
  if(I.wasPressed('ArrowDown')||I.wasPressed('KeyS')) GS.charChoice=1;
  if(I.start()){
    GS.reset();
  }
};

// ---- performance / qualidade ----
GS.initGfx = function(){
  GS.canvas = document.getElementById('game');
  GS.ctx = GS.canvas.getContext('2d',{alpha:false, desynchronized:true}) || GS.canvas.getContext('2d');
  GS._pBuckets=[]; for(let i=0;i<8;i++) GS._pBuckets.push([]);
  GS.buildBackdrop();
  GS.buildItemSprites();
  GS.buildAuras();
  GS.applyQuality();
};
GS.buildBackdrop = function(){
  // fundo estatico (gradientes + nevoa) desenhado uma vez so
  const c=document.createElement('canvas'); c.width=GAME.W; c.height=GAME.H;
  const x=c.getContext('2d');
  const g=x.createLinearGradient(0,0,0,GAME.H);
  g.addColorStop(0,'#0a0018'); g.addColorStop(0.5,'#14002a'); g.addColorStop(1,'#1a0030');
  x.fillStyle=g; x.fillRect(0,0,GAME.W,GAME.H);
  const mg=x.createLinearGradient(0,GAME.H*0.5,0,GAME.H);
  mg.addColorStop(0,'rgba(180,40,80,0)'); mg.addColorStop(1,'rgba(180,40,80,0.15)');
  x.fillStyle=mg; x.fillRect(0,0,GAME.W,GAME.H);
  GS.backdrop=c;
};
GS.buildItemSprites = function(){
  // item = circulo + letra, antes redesenhado com fillText a cada frame
  const colors={power:'#f44',point:'#48f',bomb:'#4f4',life:'#ff4'};
  GS.itemSprites={};
  for(const t in colors){
    const s=document.createElement('canvas'); s.width=20; s.height=20;
    const g=s.getContext('2d');
    g.fillStyle=colors[t]; g.beginPath(); g.arc(10,10,8,0,Math.PI*2); g.fill();
    g.fillStyle='#fff'; g.font='8px monospace'; g.textAlign='center'; g.textBaseline='middle';
    g.fillText(t[0].toUpperCase(),10,11);
    GS.itemSprites[t]=s;
  }
};
GS.makeAura = function(r, inner){
  const d=r*2;
  const s=document.createElement('canvas'); s.width=d; s.height=d;
  const g=s.getContext('2d');
  const grd=g.createRadialGradient(r,r,0,r,r,r);
  grd.addColorStop(0,inner); grd.addColorStop(1,'rgba(0,0,0,0)');
  g.fillStyle=grd; g.fillRect(0,0,d,d);
  return s;
};
GS.buildAuras = function(){
  GS.auraRumia=GS.makeAura(60,'rgba(80,0,80,0.35)');
  GS.auraFlandre=GS.makeAura(70,'rgba(255,60,60,0.4)');
};
GS.applyQuality = function(){
  GAME.QUALITY = U.clamp(GAME.QUALITY|0,0,2);
  const scale = GAME.QUALITY===0 ? 0.75 : 1;
  GS.renderScale = scale;
  const w=Math.round(GAME.W*scale), h=Math.round(GAME.H*scale);
  if(GS.canvas.width!==w || GS.canvas.height!==h){ GS.canvas.width=w; GS.canvas.height=h; }
  document.body.classList.toggle('perf-low', GAME.QUALITY===0);
  document.body.classList.toggle('perf-med', GAME.QUALITY===1);
};

// main loop
let lastTime=0;
GS.perf = { ema:0, nextCheck:0 };
document.addEventListener('visibilitychange', ()=>{ if(!document.hidden) lastTime=0; });
GS.loop = function(ts){
  if(!lastTime) lastTime=ts;
  const rawDt = ts-lastTime;
  const dt = Math.min(2, rawDt/(1000/GAME.FPS));
  lastTime=ts;
  // qualidade adaptativa (tempo real, nao frames: em 2fps nao podemos esperar 3 minutos)
  if(rawDt>0 && rawDt<1000){
    const p=GS.perf;
    p.fps = p.fps ? p.fps*0.9 + (1000/rawDt)*0.1 : 1000/rawDt;
    if(GAME.AUTO_QUALITY){
      if(!p.nextCheck) p.nextCheck=ts+2500;
      p.ema = p.ema ? p.ema*0.92 + rawDt*0.08 : rawDt;
      if(ts>=p.nextCheck){
        if(p.ema>40 && GAME.QUALITY>0){
          GAME.QUALITY--; GS.applyQuality(); p.ema=0; p.nextCheck=ts+3000;
        } else if(p.ema<18 && GAME.QUALITY<2){
          GAME.QUALITY++; GS.applyQuality(); p.ema=0; p.nextCheck=ts+8000;
        } else {
          p.nextCheck=ts+1500;
        }
      }
    }
  }
  // state-specific input
  if(GS.state==='MENU'){ GS.handleMenuInput(); }
  else if(GS.state==='PLAYING'){
    if(I.pause()){ GS.state='PAUSED'; }
  } else if(GS.state==='PAUSED'){
    if(I.pause()||I.start()){ GS.state='PLAYING'; }
  } else if(GS.state==='GAMEOVER'){
    if(I.start()){ GS.reset(); }
  } else if(GS.state==='NAMEENTRY'){
    const ne = GS.nameEntry;
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if(I.wasPressed('ArrowUp')||I.wasPressed('KeyW')){
      const idx = letters.indexOf(ne.letters[ne.pos]);
      ne.letters[ne.pos] = letters[(idx+1)%letters.length];
    }
    if(I.wasPressed('ArrowDown')||I.wasPressed('KeyS')){
      const idx = letters.indexOf(ne.letters[ne.pos]);
      ne.letters[ne.pos] = letters[(idx-1+letters.length)%letters.length];
    }
    if(I.wasPressed('ArrowLeft')||I.wasPressed('KeyA')){
      ne.pos = Math.max(0, ne.pos-1);
    }
    if(I.wasPressed('ArrowRight')||I.wasPressed('KeyD')){
      ne.pos = Math.min(2, ne.pos+1);
    }
    if(I.start()){
      const name = ne.letters.join('');
      GS.saveScore(name, ne.score);
      GS.state = 'GAMEOVER';
    }
  } else if(GS.state==='CONTINUE'){
    GS.continueTimer -= dt;
    if(I.start()){ GS.doContinue(); }
    if(GS.continueTimer <= 0){ GS.gameOver(); }
  } else if(GS.state==='CLEAR'){
    if(I.start()){ GS.state='MENU'; }
  } else if(GS.state==='STAGECLEAR'){
    if(I.start()){ GS.nextStage(); }
  }
  if(GS.state==='PLAYING' || GS.state==='STAGECLEAR'){
    GS.update(dt);
  }
  GS.bgScroll = (GS.bgScroll||0) + 0.15;
  // render
  const ctx=GS.ctx;
  GS.render(ctx);
  if(GS.debug){
    const p=GS.perf;
    ctx.fillStyle='rgba(0,0,0,0.55)'; ctx.fillRect(4,4,178,42);
    ctx.fillStyle='#0f0'; ctx.font='10px monospace'; ctx.textAlign='left';
    ctx.fillText('FPS '+(p.fps||0).toFixed(0)+'  QUALITY '+GAME.QUALITY, 10, 18);
    ctx.fillText('bullets '+GS.bullets.length+'  particles '+GS.particles.length, 10, 34);
  }
  // paused overlay
  if(GS.state==='PAUSED'){
    ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillRect(0,0,GAME.W,GAME.H);
    ctx.fillStyle='#fff'; ctx.font='bold 24px monospace'; ctx.textAlign='center';
    ctx.fillText('PAUSED', GAME.W/2, GAME.H/2);
  }
  INPUT.endFrame();
  requestAnimationFrame(GS.loop);
};

GS.init = function(){
  A.init();
  // qualidade fixa opcional: index.html?quality=low|medium|high
  try {
    const qs=new URLSearchParams(location.search);
    const qp=(qs.get('quality')||'').toLowerCase();
    const qm={low:0, medium:1, high:2};
    if(qm[qp]!==undefined){ GAME.QUALITY=qm[qp]; GAME.AUTO_QUALITY=false; }
    GS.debug = qs.get('debug')==='1';
  } catch(e){}
  GS.initGfx();
  try { GS.highScore = parseInt(localStorage.getItem('th06_highscore')||'0',10); } catch(e){ GS.highScore=0; }
  try { GS.scores = JSON.parse(localStorage.getItem('th06_scores')||'[]'); } catch(e){ GS.scores=[]; }
  // unlock audio on first interaction
  const unlock=()=>{ A.init(); if(A.ctx && A.ctx.state==='suspended') A.ctx.resume(); };
  window.addEventListener('keydown', unlock, {once:true});
  window.addEventListener('click', unlock, {once:true});
  requestAnimationFrame(GS.loop);
};
window.addEventListener('DOMContentLoaded', GS.init);
