/* stage.js */
var GAME = window.GAME;
var U = window.UTILS;
var E = window.ENT;
var P = window.PAT;
window.STAGE = {};
var ST = window.STAGE;

// Enemy factory helpers
ST.spawnFairy = function(game, x, y, type, hp, vx, vy, pattern, fireRate, score){
  const color = type==='blue'?'#48f': type==='green'?'#4f4': type==='yellow'?'#ff4': '#f6c';
  const en = new E.Enemy(x,y,'fairy',hp||8,color);
  en.vx=vx||0; en.vy=vy||1.2; en.pattern=pattern||'aimed'; en.fireRate=fireRate||90; en.score=score||100;
  en.fire = function(game){
    if(this.pattern==='aimed') P.aimed(this,game,4.5,1,0,this.color);
    else if(this.pattern==='spread3') P.fan(this,game,3,4,Math.PI/2,0.6,this.color);
    else if(this.pattern==='ring') P.ring(this,game,8,3.5,this.color);
    else if(this.pattern==='random') P.random(this,game,5,4,this.color);
  };
  // zigzag for some
  if(type==='green'){
    en._baseVx = en.vx;
    const orig=en.update.bind(en);
    en.update = function(dt,game){
      this.age+=dt;
      this.x += this.vx*dt; this.y += this.vy*dt;
      this.vx = Math.sin(this.age*0.05)*1.5 + (this._baseVx||0);
      // shoot timer handled below
      this.shootTimer-=dt;
      if(this.shootTimer<=0){ this.shootTimer=this.fireRate||60; this.fire(game); }
      if(this.x<GAME.PLAY_LEFT+this.r){this.x=GAME.PLAY_LEFT+this.r;this.vx=Math.abs(this.vx);}
      if(this.x>GAME.PLAY_RIGHT-this.r){this.x=GAME.PLAY_RIGHT-this.r;this.vx=-Math.abs(this.vx);}
      if(this.y>GAME.PLAY_BOTTOM+60) this.dead=true;
    };
  }
  game.enemies.push(en);
  return en;
};

// Rumia boss
ST.createRumiaBoss = function(stageIndex, game){
  const boss = new E.Boss((GAME.PLAY_LEFT+GAME.PLAY_RIGHT)/2, GAME.PLAY_TOP-60, 'Rumia');
  boss.kind='rumia';
  boss.color='#2a1a3a';
  boss.r=26;
  boss.baseX=(GAME.PLAY_LEFT+GAME.PLAY_RIGHT)/2;
  boss.baseY=GAME.PLAY_TOP+110;
  const hpBase = 700;
  boss.phases = [
    { name: 'Non-Spell 1', hp: hpBase, fireRate: 60, spell:false,
      move: (b,dt)=> P.moveSine(b,dt,50,10,0.018),
      pattern: (b,game)=> { P.aimed(b,game,3,1,0,'#fa4'); P.ring(b,game,6,2.2,'#f9c', b.age*0.02); }
    },
    { name: 'Spell Card: Moon Sign "Moonlight Ray"', hp: hpBase+150, fireRate: 55, spell:true,
      move: (b,dt)=> P.moveCircle(b,dt,35,0.02),
      pattern: (b,game)=> { P.ring(b,game,10,2.6,'#fa4', b.age*0.03); P.aimed(b,game,4,3,0.12,'#fff'); }
    },
    { name: 'Spell Card: Darkness Sign "Demarcation"', hp: hpBase+200, fireRate: 50, spell:true,
      move: (b,dt)=> P.moveSine(b,dt,70,15,0.025),
      pattern: (b,game)=> { P.ring(b,game,8,2.4,'#f9c', b.age*0.03); P.fan(b,game,5,3.5,Math.PI/2,0.7,'#fa4'); }
    },
  ];
  return boss;
};

// Flandre Scarlet boss
ST.createFlandreBoss = function(stageIndex, game){
  const boss = new E.Boss((GAME.PLAY_LEFT+GAME.PLAY_RIGHT)/2, GAME.PLAY_TOP-60, 'Flandre Scarlet');
  boss.kind='flandre';
  boss.color='#c22';
  boss.r=30;
  boss.baseX=(GAME.PLAY_LEFT+GAME.PLAY_RIGHT)/2;
  boss.baseY=GAME.PLAY_TOP+110;
  const hpBase = 900;
  boss.phases = [
    { name: 'Non-Spell 1', hp: hpBase, fireRate: 40, spell:false,
      move: (b,dt)=> P.moveSine(b,dt,80,18,0.025),
      pattern: (b,game)=> { P.fan(b,game,7,5,Math.PI/2,1.2,'#f44'); P.random(b,game,6,4,'#fa4'); }
    },
    { name: 'Spell Card: Taboo "Cranberry Trap"', hp: hpBase+250, fireRate: 32, spell:true,
      move: (b,dt)=> P.moveCircle(b,dt,60,0.03),
      pattern: (b,game)=> { P.ring(b,game,18,3,'#f44', b.age*0.05); P.ring(b,game,18,3,'#fff', b.age*0.05+Math.PI/18); P.aimed(b,game,6,5,0.1,'#ff4'); }
    },
    { name: 'Spell Card: Taboo "Laevenheim"', hp: hpBase+300, fireRate: 28, spell:true,
      move: (b,dt)=> P.moveBounce(b,dt),
      onEnter: (b)=>{ b.vx=2.5; b.vy=1.8; },
      pattern: (b,game)=> { P.spiral(b,game,4,'#f44',{a:b.age*0.1}); P.spiral(b,game,4,'#fff',{a:b.age*0.1+Math.PI}); P.curvedRing(b,game,22,2.8,0.06,'#fa4', b.age*0.02); }
    },
    { name: 'Spell Card: Secret "And Then Will There Be None?"', hp: hpBase+500, fireRate: 24, spell:true,
      move: (b,dt)=> P.moveSine(b,dt,100,25,0.03),
      pattern: (b,game)=> { P.ring(b,game,24,3.5,'#f44', b.age*0.06); P.ring(b,game,24,3.5,'#ff4', -b.age*0.06); P.aimed(b,game,7,7,0.08,'#fff'); P.random(b,game,8,4.5,'#fa4'); }
    },
  ];
  return boss;
};

// Stage timeline builder
ST.buildTimeline = function(stageIndex){
  const events = [];
  let t = 60;
  // waves of fairies
  const waveCount = 5 + stageIndex;
  for(let w=0; w<waveCount; w++){
    const time = 120 + w*300;
    events.push({ at: time, action: (game)=>{
      const n = 3 + Math.min(stageIndex,2);
      for(let i=0;i<n;i++){
        const x = GAME.PLAY_LEFT + 40 + (GAME.PLAY_W-80)*(i/(n-1||1));
        ST.spawnFairy(game, x, GAME.PLAY_TOP-20, 'red', 6+stageIndex*2, (i%2?0.6:-0.6)*0.5, 1.4+stageIndex*0.2, 
          i%3===0?'spread3':'aimed', 80, 100);
      }
    }});
    // second row
    events.push({ at: time+90, action: (game)=>{
      const n = 2 + stageIndex;
      for(let i=0;i<n;i++){
        const x = GAME.PLAY_LEFT + 60 + (GAME.PLAY_W-120)*(i/(n-1||1));
        ST.spawnFairy(game, x, GAME.PLAY_TOP-20, 'blue', 8+stageIndex*2, 0, 1.2, 'ring', 100, 150);
      }
    }});
  }
  // boss
  const bossTime = 120 + waveCount*300 + 120;
  events.push({ at: bossTime, action: (game)=>{
    const boss = (stageIndex===0) ? ST.createRumiaBoss(stageIndex, game) : ST.createFlandreBoss(stageIndex, game);
    boss.y = GAME.PLAY_TOP-60;
    game.boss = boss;
    game.showMessage('Boss: ' + boss.name, 120);
    boss.setPhase(0, game);
  }});
  events.sort((a,b)=>a.at-b.at);
  return events;
};
