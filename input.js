/* input.js */
var GAME = window.GAME;
window.INPUT = { keys:{}, prev:{} };
var INPUT = window.INPUT;

window.addEventListener('keydown', (e)=>{
  if(!INPUT.keys[e.code]) INPUT.prev[e.code]=false;
  INPUT.keys[e.code]=true;
  // prevent scroll
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','KeyZ','KeyX','ShiftLeft','ShiftRight','Enter','Escape'].includes(e.code)) e.preventDefault();
});
window.addEventListener('keyup', (e)=>{ INPUT.keys[e.code]=false; });

INPUT.isDown = (code)=> !!INPUT.keys[code];
INPUT.wasPressed = (code)=> !!INPUT.keys[code] && !INPUT.prev[code];
INPUT.endFrame = ()=> { for(const k in INPUT.keys) INPUT.prev[k]=INPUT.keys[k]; };

// convenience
INPUT.left = ()=> INPUT.isDown('ArrowLeft')||INPUT.isDown('KeyA');
INPUT.right = ()=> INPUT.isDown('ArrowRight')||INPUT.isDown('KeyD');
INPUT.up = ()=> INPUT.isDown('ArrowUp')||INPUT.isDown('KeyW');
INPUT.down = ()=> INPUT.isDown('ArrowDown')||INPUT.isDown('KeyS');
INPUT.focus = ()=> INPUT.isDown('ShiftLeft')||INPUT.isDown('ShiftRight');
INPUT.shoot = ()=> INPUT.isDown('KeyZ');
INPUT.bomb = ()=> INPUT.wasPressed('KeyX');
INPUT.start = ()=> INPUT.wasPressed('Enter')||INPUT.wasPressed('Space');
INPUT.pause = ()=> INPUT.wasPressed('Escape')||INPUT.wasPressed('KeyP');
