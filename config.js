/* config.js */
window.GAME = window.GAME || {};
var GAME = window.GAME;

GAME.W = 640;
GAME.H = 480;
GAME.PLAY_LEFT = 128;
GAME.PLAY_RIGHT = 512;
GAME.PLAY_TOP = 16;
GAME.PLAY_BOTTOM = 464;
GAME.PLAY_W = GAME.PLAY_RIGHT - GAME.PLAY_LEFT;
GAME.PLAY_H = GAME.PLAY_BOTTOM - GAME.PLAY_TOP;

GAME.FPS = 60;
GAME.PLAYER_SPEED = 4.5;
GAME.PLAYER_FOCUS_SPEED = 2.0;
GAME.PLAYER_HITBOX = 3;
GAME.GRAZE_RADIUS = 24;

GAME.COLORS = {
  player: '#6cf',
  enemy: '#f6c',
  boss: '#f33',
  bulletRed: '#f44',
  bulletBlue: '#48f',
  bulletYellow: '#ff4',
  bulletGreen: '#4f4',
  bulletPurple: '#c4f',
  bulletWhite: '#fff',
  itemPower: '#f44',
  itemPoint: '#48f',
  itemBomb: '#4f4',
  itemLife: '#ff4',
};
GAME.MAX_BULLETS = 1800;
GAME.MAX_PARTICLES = 600;
GAME.MAX_ITEMS = 300;
GAME.STAGE_COUNT = 2;
GAME.GAME_SPEED = 0.85;

// 2 = alto, 1 = medio, 0 = baixo. Pode ser fixado via ?quality=low|medium|high
GAME.QUALITY = 2;
GAME.AUTO_QUALITY = true;
