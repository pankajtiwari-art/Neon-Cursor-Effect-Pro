const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let width, height;
let points = [];
let sparkles = []; // Array for magic dust

// Configuration
let config = {
  numPoints: 40,
  curveLerp1: 0.15, 
  curveLerp2: 0.5,  
  lineRadius: 3,
  glowRadius: 20,
  theme: 'velocity', 
  hasSparkles: true, // NEW
  isLighterBlend: true, // NEW
  
  // Sleep mode configs
  sleepRadiusX: 150,
  sleepRadiusY: 75,
  sleepTimeScale1: 0.0015,
  sleepTimeScale2: 0.003,
};

let mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
let target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
let lastMouseMoved = Date.now();

// --- MENU TOGGLE LOGIC (Bulletproof) ---
const menuToggleBtn = document.getElementById('menu-toggle');
const menuCloseBtn = document.getElementById('menu-close');
const settingsPanel = document.getElementById('settings-panel');

menuToggleBtn.onclick = () => settingsPanel.classList.add('open');
menuCloseBtn.onclick = () => settingsPanel.classList.remove('open');

// --- CANVAS LOGIC ---
function init() {
  resize();
  points = [];
  sparkles = [];
  for (let i = 0; i < config.numPoints; i++) {
    points.push({ x: width / 2, y: height / 2 });
  }
}

function updateTrailLength(newLength) {
  if (newLength > points.length) {
    const lastPoint = points[points.length - 1] || { x: width/2, y: height/2 };
    while (points.length < newLength) points.push({ x: lastPoint.x, y: lastPoint.y });
  } else if (newLength < points.length) {
    points.length = newLength;
  }
  config.numPoints = newLength;
}

function resize() {
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = width;
  canvas.height = height;
}

window.addEventListener('resize', resize);
window.addEventListener('mousemove', (e) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
  lastMouseMoved = Date.now();
});
window.addEventListener('touchmove', (e) => {
  mouse.x = e.touches[0].clientX;
  mouse.y = e.touches[0].clientY;
  lastMouseMoved = Date.now();
});

// Render Loop
function animate(time) {
  // Clear screen
  ctx.globalCompositeOperation = 'source-over';
  ctx.clearRect(0, 0, width, height);
  
  // Set Blend Mode for glowing effect
  if(config.isLighterBlend) {
    ctx.globalCompositeOperation = 'lighter';
  }

  const timeIdle = Date.now() - lastMouseMoved;
  const isSleeping = timeIdle > 2000; 

  if (isSleeping) {
    const cx = width / 2;
    const cy = height / 2;
    target.x = cx + Math.sin(time * config.sleepTimeScale1) * config.sleepRadiusX;
    target.y = cy + Math.cos(time * config.sleepTimeScale2) * config.sleepRadiusY;
  } else {
    target.x = mouse.x;
    target.y = mouse.y;
  }

  // Lerp logic
  points[0].x += (target.x - points[0].x) * config.curveLerp1;
  points[0].y += (target.y - points[0].y) * config.curveLerp1;

  for (let i = 1; i < config.numPoints; i++) {
    points[i].x += (points[i - 1].x - points[i].x) * config.curveLerp2;
    points[i].y += (points[i - 1].y - points[i].y) * config.curveLerp2;
  }

  // Calculate velocity
  const dx = points[0].x - points[1].x;
  const dy = points[0].y - points[1].y;
  const velocity = Math.sqrt(dx * dx + dy * dy);
  
  // Theme Logic
  let hue;
  switch(config.theme) {
    case 'velocity': hue = 190 + Math.min(velocity * 3, 120); break; // Cyan to Pink
    case 'fire': hue = 0 + Math.min(velocity * 2, 60); break; // Red to Yellow
    case 'sunset': hue = 20 + Math.min(velocity * 2, 260); break; // Orange to Purple
    case 'ocean': hue = 200 + Math.min(velocity * 2, 40); break; // Blue to Aqua
    case 'rainbow': hue = (time * 0.1) % 360; break;
  }

  // --- DRAW MAGIC SPARKLES ---
  if (config.hasSparkles && velocity > 1) {
    // Generate new sparkles when moving fast enough
    if (Math.random() > 0.4) {
      sparkles.push({
        x: points[0].x, y: points[0].y,
        vx: (Math.random() - 0.5) * 6, // Random scatter X
        vy: (Math.random() - 0.5) * 6, // Random scatter Y
        life: 1.0, 
        color: hue
      });
    }
  }

  // Animate and draw sparkles
  for (let i = sparkles.length - 1; i >= 0; i--) {
    let s = sparkles[i];
    s.x += s.vx;
    s.y += s.vy;
    s.life -= 0.02; // Fade out speed
    
    if (s.life <= 0) {
      sparkles.splice(i, 1);
    } else {
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.life * Math.max(config.lineRadius * 0.8, 1), 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${s.color}, 100%, 70%, ${s.life})`;
      ctx.shadowBlur = config.glowRadius * 0.5;
      ctx.shadowColor = `hsla(${s.color}, 100%, 50%, ${s.life})`;
      ctx.fill();
    }
  }

  // --- DRAW MAIN TRAIL ---
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  
  for (let i = 1; i < config.numPoints - 1; i++) {
    const xc = (points[i].x + points[i + 1].x) / 2;
    const yc = (points[i].y + points[i + 1].y) / 2;
    ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
  }

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = config.lineRadius;
  ctx.strokeStyle = `hsl(${hue}, 100%, 60%)`;
  ctx.shadowBlur = config.glowRadius;
  ctx.shadowColor = `hsl(${hue}, 100%, 50%)`;
  
  ctx.stroke();
  ctx.shadowBlur = 0; // Reset for next frame

  requestAnimationFrame(animate);
}

// --- UI EVENT LISTENERS ---
document.getElementById('color-theme').onchange = e => config.theme = e.target.value;
document.getElementById('trail-length').oninput = e => updateTrailLength(parseInt(e.target.value));
document.getElementById('lerp1').oninput = e => config.curveLerp1 = parseFloat(e.target.value);
document.getElementById('lerp2').oninput = e => config.curveLerp2 = parseFloat(e.target.value);
document.getElementById('line-radius').oninput = e => config.lineRadius = parseInt(e.target.value);
document.getElementById('glow-radius').oninput = e => config.glowRadius = parseInt(e.target.value);

// Effects Toggles
const btnSparkles = document.getElementById('btn-sparkles');
btnSparkles.onclick = () => {
  config.hasSparkles = !config.hasSparkles;
  btnSparkles.classList.toggle('active');
  btnSparkles.innerText = config.hasSparkles ? 'ON' : 'OFF';
};

const btnBlend = document.getElementById('btn-blend');
btnBlend.onclick = () => {
  config.isLighterBlend = !config.isLighterBlend;
  btnBlend.classList.toggle('active');
  btnBlend.innerText = config.isLighterBlend ? 'Lighter' : 'Normal';
};

// Idle Mode Buttons
const btnCircle = document.getElementById('btn-circle');
const btnInfinity = document.getElementById('btn-infinity');

btnCircle.onclick = () => {
  btnCircle.classList.add('active');
  btnInfinity.classList.remove('active');
  config.sleepRadiusX = 100; config.sleepRadiusY = 100;
  config.sleepTimeScale1 = 0.002; config.sleepTimeScale2 = 0.002; 
};

btnInfinity.onclick = () => {
  btnInfinity.classList.add('active');
  btnCircle.classList.remove('active');
  config.sleepRadiusX = 150; config.sleepRadiusY = 75;
  config.sleepTimeScale1 = 0.0015; config.sleepTimeScale2 = 0.003; 
};

init();
animate(0);
