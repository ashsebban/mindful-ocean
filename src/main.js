import { Game } from './game.js';

const sketch = (p) => {
  const game = new Game(p);
  p.setup           = () => game.setup();
  p.draw            = () => game.draw();
  p.windowResized   = () => game.windowResized();
  p.mousePressed    = () => { game.handlePress(p.mouseX, p.mouseY); return false; };
  p.touchStarted    = (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    for (let i = 0; i < p.touches.length; i++) game.handlePress(p.touches[i].x, p.touches[i].y);
    return false;
  };
};

new p5(sketch);
