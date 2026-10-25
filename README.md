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

## Desempenho
O jogo reduz a qualidade sozinho quando o frame demora demais (primeiro remove efeitos, depois desce a resolução interna para 480×360). Para forçar um modo:

- `index.html?quality=high` — tudo ligado
- `index.html?quality=medium` — metade das partículas, sem brilho/blur
- `index.html?quality=low` — 480×360, balas como quadrados, menos partículas
- `index.html?debug=1` — mostra FPS, qualidade ativa e contagem de balas/partículas

Também foram aplicados: fundo e sprites pré-renderizados, partículas limitadas e agrupadas, colisões sem `Math.hypot`, teto de balas/itens, throttle de SFX e o canvas promovido para camada própria (evita repintar o fundo da página a cada frame).

## Aviso
Projeto não oficial, sem afiliação com Team Shanghai Alice. Touhou Project © ZUN / Team Shanghai Alice.
