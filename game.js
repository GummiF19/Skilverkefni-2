// Sækji anime.js
import { animate, createTimeline, svg } from 'https://cdn.jsdelivr.net/npm/animejs@4.5.0/+esm';

// Næ í hlutina úr SVG myndinni
const svgEl = document.getElementById('game');
const piece = document.getElementById('piece'); // Stjarna sem maður dregur
const rippleEl = document.getElementById('ripple'); // hringurinn sem kemur þegar fingri er lyft


document.addEventListener('gesturestart', (e) => e.preventDefault()); // svo að það zoomar ekki inn(iphone)

const HOLE = { x: 500, y: 310 };
const START = { x: 500, y: 800 }; // upphafsstaður stjörnunnar


const star = { x: START.x, y: START.y, scale: 1, rotate: 0 };

function render() {
  piece.setAttribute('transform',
    `translate(${star.x} ${star.y}) rotate(${star.rotate}) scale(${star.scale})`);
}

let busy = false;       // true á meðan fagnað er

// Breytir staðsetningu fingurs á skjá
function toSvg(e) {
  const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(svgEl.getScreenCTM().inverse());
  return { x: p.x, y: p.y };
}

let pointerId = null;
let lifted = false;
let holdAnim = null;    // titrings hreyfingin
let offset = { x: 0, y: 0 };

// Fingur snertir stjörnuna
piece.addEventListener('pointerdown', (e) => {
  if (busy || pointerId !== null) return; // bara einn fingur í einu
  pointerId = e.pointerId;
  stopShake(); // barnið er byrjað stjarnan hættir að hristast
  piece.setPointerCapture(e.pointerId);

  const p = toSvg(e);
  offset = { x: p.x - star.x, y: p.y - star.y };

  // Stjarnan titrar og minnkar á meðan haldið er inni.
  holdAnim = animate(star, {
    scale: 0.9,
    rotate: [0, -7, 7, -7, 7, -5, 5, 0],
    duration: 600,
    ease: 'linear',
    onUpdate: render,
    onComplete: lift,
  });
});

// stjarnan lyftist ef haldið er nogu lengi inni
function lift() {
  lifted = true;
  piece.style.filter = 'drop-shadow(0 25px 12px rgba(0,0,0,.3))';
  animate(star, { scale: 1.2, duration: 400, ease: 'outBack', onUpdate: render });
}

// stjarnan fylgir ef búið er að lyfta henni
piece.addEventListener('pointermove', (e) => {
  if (e.pointerId !== pointerId || !lifted) return;
  const p = toSvg(e);
  star.x = p.x - offset.x;
  star.y = p.y - offset.y;
  render();
});

// Fingri lyft af skjá
function release(e) {
  if (e.pointerId !== pointerId) return;
  pointerId = null;
  secondId = null; // seinni fingurinn hættir líka að snúa
  ripple(toSvg(e));
  piece.style.filter = '';
  scheduleShake(); // stjarnan hristist aftur ef ekkert gerist

  if (!lifted) {
    // hættir að titra og fer í venjulega stærð ef fingri er lyft of snemma
    holdAnim.pause();
    animate(star, { scale: 1, rotate: 0, duration: 300, ease: 'outBack', onUpdate: render });
    return;
  }

  lifted = false;
  const distance = Math.hypot(star.x - HOLE.x, star.y - HOLE.y);

  if (distance < 100) {
    celebrate();
  } else {
    animate(star, { x: START.x, y: START.y, scale: 1, rotate: 0, duration: 700, ease: 'outBack', onUpdate: render });
  }
}
piece.addEventListener('pointerup', release);
piece.addEventListener('pointercancel', release);

// Multi-touch
const fingers = {};   // staðsetning fingurs
let secondId = null;    
let startAngle = 0;     
let startRotate = 0;   


function fingerAngle() {
  const a = fingers[pointerId];
  const b = fingers[secondId];
  return Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
}


svgEl.addEventListener('pointerdown', (e) => {
  fingers[e.pointerId] = toSvg(e);
  if (lifted && e.pointerId !== pointerId && secondId === null) {
    secondId = e.pointerId;
    startAngle = fingerAngle();
    startRotate = star.rotate;
  }
});

svgEl.addEventListener('pointermove', (e) => {
  fingers[e.pointerId] = toSvg(e);
  if (secondId === null || !lifted) return;

  star.rotate = startRotate + fingerAngle() - startAngle;
  render();
});

function releaseFinger(e) {
  delete fingers[e.pointerId];
  if (e.pointerId === secondId) {
    secondId = null;
    ripple(toSvg(e));
  }
}
svgEl.addEventListener('pointerup', releaseFinger);
svgEl.addEventListener('pointercancel', releaseFinger);

// Formin skiptast á stjarna og hjarta
let isHeart = false;

// Stjarnan komin í gatið nokkrar hreyfingar í röð með timeline
function celebrate() {
  busy = true;

  // næsta form
  isHeart = !isHeart;
  let next = '#starShape';
  if (isHeart) {
    next = '#heartShape';
  }

  // path sem litla gula stjarnan flýgur eftir
  const path = svg.createMotionPath('#flight');

  createTimeline()
    // stjarnan dettur i gatið
    .add(star, { x: HOLE.x, y: HOLE.y, scale: 1, rotate: 0, duration: 350, ease: 'outBack', onUpdate: render })
    // brettið hoppar
    .add('#board', { scale: [1, 1.08, 1], duration: 400, ease: 'outQuad' })
    // stjarnan snýst og stækkar smá
    .add(star, { rotate: 360, scale: [1, 1.3, 1], duration: 900, ease: 'inOutQuad', onUpdate: render })
    // motion path: litla gula stjarnan flýgur eftir ferlinum
    .add('#flyer', {
      translateX: path.translateX,
      translateY: path.translateY,
      rotate: path.rotate,
      opacity: [1, 1, 1, 0],
      duration: 2000,
      ease: 'inOutQuad',
    })
    // morph gatið útlínan og stjörnurnar breytast í næsta form
    .add(['#hole', '#outline', piece], { d: svg.morphTo(next), duration: 800, ease: 'inOutQuad' })
    // stjarnan fer aftur á upphafsstað
    .add(star, { x: START.x, y: START.y, duration: 800, ease: 'inOutQuad', onUpdate: render })
    .call(() => {
      star.rotate = 0;
      busy = false;
      drawOutline(); // sýnir aftur hvar stjarnan á að fara
    });
}

// Útlína gatsins teiknast hringinn
const [outline] = svg.createDrawable('#outline');

function drawOutline() {
  animate(outline, { draw: ['0 0', '0 1'], duration: 1500, ease: 'inOutQuad' });
}

drawOutline(); // teiknað þegar leikurinn byrjar

// Stjarnan hristist svo barnið viti að það eigi að snerta hana
let shakeTimer = null;
let shakeAnim = null;

function shake() {
  if (busy || pointerId !== null) return scheduleShake();

  shakeAnim = animate(star, {
    rotate: [0, -12, 12, -12, 12, -6, 6, 0],
    duration: 900,
    ease: 'inOutQuad',
    onUpdate: render,
    onComplete: scheduleShake, // hristist aftur eftir smá stund
  });
}

// Stjarnan hristist eftir 4 sek ef barnið gerir ekkert
function scheduleShake() {
  clearTimeout(shakeTimer);
  shakeTimer = setTimeout(shake, 4000);
}

function stopShake() {
  clearTimeout(shakeTimer);
  if (shakeAnim) shakeAnim.pause();
}

shakeTimer = setTimeout(shake, 1500); 


// Hvítur hringur stækkar 
function ripple(p) {
  rippleEl.setAttribute('cx', p.x);
  rippleEl.setAttribute('cy', p.y);
  animate(rippleEl, { r: [20, 110], opacity: [0.9, 0], duration: 600, ease: 'outQuad' });
}

render();
