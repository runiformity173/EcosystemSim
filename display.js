const BIOMES = [
  { name: 'Deep Ocean',    color: '#0a2342' },
  { name: 'Shallow Water', color: '#1565a8' },
  { name: 'Beach',         color: '#c9a655' },
  { name: 'Grassland',     color: '#5a9e5a' },
  { name: 'Forest',        color: '#2d6e3f' },
  { name: 'Dense Forest',  color: '#1b4332' },
  { name: 'Desert',        color: '#c7922a' },
  { name: 'Tundra',        color: '#8ba5b3' },
  { name: 'Wetland',       color: '#3d5a44' },
  { name: 'Mountain',      color: '#6b6b6b' },
];

const FRAMES_PER_REDRAW = 60;
const HEX_SIZE  = 5;
const ZOOM_MAX = 16;
const ZOOM_MIN = 0.12;
const CELL_ZOOM_MIN = 4;

function hexToPixel(col, row, size) {
  const x = size * Math.sqrt(3) * (col + 0.5 * (row & 1));
  const y = size * 1.5 * row;
  return [x, y];
}

function hexPath(ctx, cx, cy, size) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    const x = cx + size * Math.cos(a);
    const y = cy + size * Math.sin(a);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
}

const canvas = document.getElementById("sim-canvas");
const ctx    = canvas.getContext('2d');

let ox = 0, oy = 0, scale = 1;
let dragging = false, dragX = 0, dragY = 0, baseOx = 0, baseOy = 0;
let lastTouchDist = 0;

function computeGridOrigin() {
    const [maxX] = hexToPixel(GRID_COLS - 1, GRID_ROWS - 2, HEX_SIZE);
    const [, maxY] = hexToPixel(GRID_COLS - 1, GRID_ROWS - 1, HEX_SIZE);
    return [maxX / 2, maxY / 2];
}
function screenToWorld(sx, sy) {
    const [gox, goy] = computeGridOrigin();
    return [
        (sx - canvas.width  / 2 - ox) / scale + gox,
        (sy - canvas.height / 2 - oy) / scale + goy,
    ];
}
function worldToHex(wx, wy) {
    const q = (Math.sqrt(3) / 3 * wx - wy / 3) / HEX_SIZE;
    const r = (2 / 3 * wy) / HEX_SIZE;
    let cx = q, cz = r, cy = -cx - cz;
    let rx = Math.round(cx), ry = Math.round(cy), rz = Math.round(cz);
    const dx = Math.abs(rx - cx), dy = Math.abs(ry - cy), dz = Math.abs(rz - cz);
    if      (dx > dy && dx > dz) rx = -ry - rz;
    else if (dy > dz)            ry = -rx - rz;
    else                         rz = -rx - ry;
    const row = rz;
    const col = rx + Math.floor(rz / 2);

    if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return null;
    return cells[row][col];
}
function screenToHex(sx, sy) {
    return worldToHex(...screenToWorld(sx, sy));
}
let highlightedCell = null;
let trackedCell = null;

function draw() {
    canvas.width  = canvas.offsetWidth  || canvas.clientWidth;
    canvas.height = canvas.offsetHeight || canvas.clientHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const [gox, goy] = computeGridOrigin();

    ctx.save();
    ctx.translate(canvas.width / 2 + ox, canvas.height / 2 + oy);
    ctx.scale(scale, scale);
    ctx.translate(-gox, -goy);
    for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
            const [px, py] = hexToPixel(c, r, HEX_SIZE);
            const cell = cells[r][c];
            hexPath(ctx, px, py, HEX_SIZE);
            ctx.fillStyle = cell.isLand ? "green" : "blue";
            ctx.fill();
            if (scale > CELL_ZOOM_MIN && highlightedCell?.row == r && highlightedCell?.col == c) {
                ctx.fillStyle = "rgba(255,255,255,0.25)"
                ctx.fill();
            }
            ctx.strokeStyle = (scale >= CELL_ZOOM_MIN) ? 'rgba(0,0,0,0.3)' : ctx.fillStyle;
            ctx.lineWidth = (2 / scale);
            ctx.stroke();

            if (cell.getPopulation(1) > 0) {
            const rad = Math.min(Math.log(cell.getPopulation(1)) * 0.3, HEX_SIZE * 0.32);
            ctx.beginPath();
            ctx.arc(px, py, rad, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,255,255,0.88)';
            ctx.fill();
            }
        }
    }
    ctx.restore();
    updateZoom();
    document.getElementById("cell-info").innerHTML = trackedCell ? `
    Biome:${trackedCell.isLand}<br>
    ${Object.entries(trackedCell.population).map(o=>aName[o[0]] + ": " + o[1]).join("<br>")}
    ` : ""
}
function partialDraw() {
    const [gox, goy] = computeGridOrigin();
    ctx.save();
    ctx.translate(canvas.width / 2 + ox, canvas.height / 2 + oy);
    ctx.scale(scale, scale);
    ctx.translate(-gox, -goy);
    for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
            const cell = cells[r][c];
            if (cell.getPopulation(1) > 0) {
                const [px, py] = hexToPixel(c, r, HEX_SIZE);
                const rad = Math.min(Math.log(cell.getPopulation(1)) * 0.3, HEX_SIZE * 0.32);
                ctx.beginPath();
                ctx.arc(px, py, rad, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255,255,255,0.88)';
                ctx.fill();
            }
        }
    }
    ctx.restore();
    document.getElementById("cell-info").innerHTML = trackedCell ? `
    Biome:${trackedCell.isLand}<br>
    ${Object.entries(trackedCell.population).map(o=>aName[o[0]] + ": " + o[1]).join("<br>")}
    ` : ""
}

function updateZoom() {
    const el = document.getElementById('zoom-pct');
    if (el) el.textContent = Math.round(scale * 100) + '%';
}

const ro = new ResizeObserver(draw);
ro.observe(canvas);

canvas.addEventListener('mousedown', e => {
    if (e.button !== 0) return;
    dragging = true;
    dragX = e.clientX; dragY = e.clientY;
    baseOx = ox; baseOy = oy;
});
window.addEventListener('mousemove', e => {
    if (!dragging) return;
    ox = baseOx + (e.clientX - dragX);
    oy = baseOy + (e.clientY - dragY);
    draw();
});
window.addEventListener('mouseup', () => { dragging = false; });

canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const el = document.getElementById('coord-badge');
    highlightedCell = screenToHex(mx,my);
    let final = `x: ${Math.round((mx - canvas.width/2 - ox) / scale)}  y: ${Math.round((my - canvas.height/2 - oy) / scale)}`;
    final += " | " + JSON.stringify(highlightedCell);
    if (el) el.textContent = final;
    if (scale >= CELL_ZOOM_MIN) draw();
    else partialDraw();
});

canvas.addEventListener('click', e => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    highlightedCell = screenToHex(mx,my);
    if (scale >= CELL_ZOOM_MIN || true) { // remove the or statement to only allow clicking up close.
        trackedCell = highlightedCell;
        highlightedCell.clicked();
    }
});

canvas.addEventListener('wheel', e => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.08 : 1/1.08;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const oldScale = scale;
    scale = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, scale * factor));
    ox = mx - canvas.width / 2 + (ox - (mx - canvas.width / 2)) * scale / oldScale;
    oy = my - canvas.height / 2 + (oy - (my - canvas.height / 2)) * scale / oldScale;
    draw();
}, { passive: false });

canvas.addEventListener('touchstart', e => {
    if (e.touches.length === 1) {
    dragging = true;
    dragX = e.touches[0].clientX; dragY = e.touches[0].clientY;
    baseOx = ox; baseOy = oy;
    } else if (e.touches.length === 2) {
    lastTouchDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
    );
    }
}, { passive: true });
canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    if (e.touches.length === 1 && dragging) {
    ox = baseOx + (e.touches[0].clientX - dragX);
    oy = baseOy + (e.touches[0].clientY - dragY);
    draw();
    } else if (e.touches.length === 2) {
    const d = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
    );
    scale = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, scale * (d / lastTouchDist)));
    lastTouchDist = d;
    draw();
    }
}, { passive: false });
canvas.addEventListener('touchend', () => { dragging = false; });

document.getElementById('btn-zoom-in')?.addEventListener('click', () => {
    const rect = canvas.getBoundingClientRect();
    const oldScale = scale;
    scale = Math.min(ZOOM_MAX, scale * 1.25);
    ox = ox/oldScale*scale
    oy = oy/oldScale*scale
    draw();
});
document.getElementById('btn-zoom-out')?.addEventListener('click', () => {
    const rect = canvas.getBoundingClientRect();
    const oldScale = scale;
    scale = Math.max(ZOOM_MIN, scale / 1.25);
    ox = ox/oldScale*scale
    oy = oy/oldScale*scale
    draw();
});
document.getElementById('btn-reset-view')?.addEventListener('click', () => {
    ox = 0; oy = 0; scale = 1; draw();
});

let simRunning = false;
const playBtn = document.getElementById('btn-play');
playBtn?.addEventListener('click', () => {
    simRunning = !simRunning;
    if (playBtn) {
    if (simRunning) {
        playBtn.className = 'tb-btn pause-btn';
        playBtn.innerHTML = '<i class="bi bi-pause-fill"></i> Pause';
    } else {
        playBtn.className = 'tb-btn play-btn';
        playBtn.innerHTML = '<i class="bi bi-play-fill"></i> Play';
    }
    }
    (window).onSimPlay(simRunning);
});

document.getElementById('btn-step')?.addEventListener('click', () => {
    (window).onSimStep?.();
});

document.getElementById('speed-select')?.addEventListener('change', function(o) {
    (window).onSimSpeed(Number(o.value));
});

window.EcosimUI = {
    /** Force-redraw the hex canvas. Call after mutating cells. */
    redraw: draw,
    partialRedraw: partialDraw,
    /** The live 2-D cell array [col][row] — mutate in place. */
    cells,
    /** Biome metadata array. */
    BIOMES,
    /** Current view transform */
    getViewState: () => ({ ox, oy, scale }),
    /** Update the step counter badge in the toolbar. */
    setStep: (n) => {
    const el = document.getElementById('step-count');
    if (el) el.textContent = String(n);
    },
    /** Update population count badge. */
    setPopulation: (n) => {
    const el = document.getElementById('pop-count');
    if (el) el.textContent = String(n);
    },
};

draw();