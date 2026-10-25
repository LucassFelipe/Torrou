/* audio.js */
var GAME = window.GAME;
window.AUDIO = { ctx:null, enabled:true, master:null };
var A = window.AUDIO;

A.init = function(){
  if(A.ctx) return;
  try {
    A.ctx = new (window.AudioContext||window.webkitAudioContext)();
    A.master = A.ctx.createGain();
    A.master.gain.value = 0.35;
    A.master.connect(A.ctx.destination);
  } catch(e){ A.enabled=false; }
};

A.beep = function(freq=440, dur=0.08, type='square', vol=0.3, slide=0){
  if(!A.enabled || !A.ctx) return;
  const c=A.ctx, t=c.currentTime;
  const o=c.createOscillator(); const g=c.createGain();
  o.type=type; o.frequency.setValueAtTime(freq,t);
  if(slide) o.frequency.exponentialRampToValueAtTime(Math.max(1, freq+slide), t+dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t+dur);
  o.connect(g); g.connect(A.master);
  o.start(t); o.stop(t+dur);
};

A.noise = function(dur=0.15, vol=0.2){
  if(!A.enabled||!A.ctx) return;
  const c=A.ctx, t=c.currentTime;
  if(!A._noiseBuf){
    const len=Math.floor(c.sampleRate);
    A._noiseBuf=c.createBuffer(1, len, c.sampleRate);
    const d=A._noiseBuf.getChannelData(0);
    for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*0.5;
  }
  dur=Math.min(dur,1);
  const src=c.createBufferSource(); src.buffer=A._noiseBuf;
  const g=c.createGain(); g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.001,t+dur);
  const f=c.createBiquadFilter(); f.type='lowpass'; f.frequency.value=1200;
  src.connect(f); f.connect(g); g.connect(A.master);
  src.start(t,0,dur); src.stop(t+dur);
};

// simple music: loop of notes
A.musicSeq = null;
A.startMusic = function(seq){
  A.stopMusic();
  if(!A.enabled||!A.ctx) return;
  A.musicSeq = { seq, idx:0, nextTime:A.ctx.currentTime+0.1, timer:null };
  const step = ()=>{
    const m=A.musicSeq; if(!m) return;
    const c=A.ctx;
    let guard=0;
    // guard + resync: se a aba ficou em segundo plano, nao tenta "recuperar" minutos de notas
    while(m.nextTime < c.currentTime+0.2 && guard++ < 32){
      const note = m.seq[m.idx % m.seq.length];
      const d = (note && note.d>0) ? note.d : 0.25;
      if(note && note.f>0){
        const o=c.createOscillator(); const g=c.createGain();
        o.type=note.type||'triangle'; o.frequency.value=note.f;
        g.gain.setValueAtTime(0.06, m.nextTime);
        g.gain.exponentialRampToValueAtTime(0.001, m.nextTime+d*0.9);
        o.connect(g); g.connect(A.master);
        o.start(m.nextTime); o.stop(m.nextTime+d);
      }
      m.nextTime += d; m.idx++;
    }
    if(m.nextTime < c.currentTime) m.nextTime = c.currentTime + 0.05;
    m.timer = setTimeout(step, 50);
  };
  step();
};
A.stopMusic = function(){ if(A.musicSeq){ clearTimeout(A.musicSeq.timer); A.musicSeq=null; } };

// Limita SFX repetidos para nao criar dezenas de nos de audio por frame em telas cheias.
A._lastSfx = {};
A._throttle = function(key, ms){
  const t=performance.now();
  if(A._lastSfx[key]!==undefined && t-A._lastSfx[key]<ms) return false;
  A._lastSfx[key]=t; return true;
};

// SFX helpers
A.sfxShoot = ()=> { if(A._throttle('shoot',40)) A.beep(880,0.04,'square',0.12,-200); };
A.sfxHit = ()=> { if(A._throttle('hit',30)) A.beep(220,0.1,'sawtooth',0.2,-100); };
A.sfxBomb = ()=> { A.noise(0.4,0.35); A.beep(120,0.4,'sawtooth',0.3,-80); };
A.sfxItem = ()=> { if(A._throttle('item',35)) A.beep(660,0.06,'triangle',0.15,400); };
A.sfxDeath = ()=> { A.noise(0.3,0.3); A.beep(80,0.4,'sawtooth',0.3,-60); };
A.sfxGraze = ()=> { if(A._throttle('graze',50)) A.beep(1200,0.03,'sine',0.06,0); };
A.sfxBoss = ()=> A.beep(330,0.12,'square',0.2,-120);
