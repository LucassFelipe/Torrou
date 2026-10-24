# Torrou!

Um clone fan-made e jogável no navegador inspirado em *Touhou Koumakyou ~ the Embodiment of Scarlet Devil* (Touhou 6), em estilo bullet hell (danmaku), feito do zero em HTML5 Canvas + JavaScript. Não inclui assets do jogo original (sprites procedurais).

Projeto desenvolvido na aula de **Programação de Sistemas Web** do professor **Choma**.

## Como jogar

Abra o arquivo `index.html` no navegador. Se o navegador bloquear o carregamento dos arquivos locais, use qualquer servidor HTTP local.

### Controles
- **Setas / WASD**: mover
- **Shift**: foco (movimento lento + hitbox visível)
- **Z**: atirar (segure)
- **X**: bomba (spell card)
- **Enter / Space**: iniciar / confirmar
- **Esc / P**: pausar

### Personagens
- **Reimu**: tiro homing/leque
- **Marisa**: tiro de poder concentrado

## Estrutura
- `index.html` - página principal
- `config.js`, `utils.js`, `input.js`, `audio.js`
- `entities.js` - Player, Enemy, Boss, Bullet, Item, Particle
- `patterns.js` - padrões de danmaku
- `stage.js` - fases, midboss e bosses
- `game.js` - loop, estados, colisões, renderização

## Aviso
Projeto não oficial, sem afiliação com Team Shanghai Alice. Touhou Project © ZUN / Team Shanghai Alice.
