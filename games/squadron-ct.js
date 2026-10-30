// Procedural non-contrast CT (stone protocol) for Stone Squadron's mission prep. Fictional anatomy, no patient data.
// Each slice is drawn in Hounsfield units on a scratch canvas (red channel = (HU + 1024) / 12), then blurred a touch
// (partial volume), given correlated quantum noise and windowed. The ROI tool reads the same noisy HU a scanner would,
// and stones fade at their top and bottom slices the way real ones do.
// Image orientation is radiological: patient's left on the image's right. 1 px = 1 mm, z = mm from the top of the kidneys.
const N = 360, THICK = 3, ZMAX = 348;
export const SLICES = Math.round(ZMAX / THICK) + 1;
export const zOf = i => i * THICK;
export const imOf = z => Math.round(z / THICK) + 1; // "image number" as a read quotes it (1-based)

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const prof = (z, a, b) => { if (z <= a || z >= b) return 0; const u = 2 * (z - a) / (b - a) - 1; return Math.sqrt(1 - u * u); }; // ellipsoid cross-section
function rng(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const enc = hu => clamp(Math.round((hu + 1024) / 12), 0, 255);
const col = hu => `rgb(${enc(hu)},0,0)`;

// ───────── fixed anatomy (mm)
const MID = 180;
const KID = { 1: { x: MID + 70, y: 232, z0: 12, z1: 142 }, [-1]: { x: MID - 72, y: 236, z0: 26, z1: 156 } }; // side +1 = patient's left
const hilZ = s => KID[s].z0 + 0.55 * (KID[s].z1 - KID[s].z0);
// left ureter course: (z, distance from midline, y) — off the renal pelvis, down the psoas, over the iliac vessels, round the pelvic wall into the bladder
const UK = [[hilZ(1) + 6, 53, 226], [150, 46, 222], [200, 41, 218], [226, 36, 212], [260, 52, 228], [300, 61, 236], [324, 44, 226], [338, 30, 220]];
export function ureterXY(z, side = 1) {
  let k = 0; while (k < UK.length - 2 && z > UK[k + 1][0]) k++;
  const a = UK[k], b = UK[k + 1], t = clamp((z - a[0]) / (b[0] - a[0]), 0, 1), u = t * t * (3 - 2 * t);
  return { x: MID + side * lerp(a[1], b[1], u), y: lerp(a[2], b[2], u) };
}
const URETER_Z0 = UK[0][0], URETER_Z1 = UK[UK.length - 1][0];
// where things sit in the left kidney (calyx stones, the renal pelvis)
function kidneySpot(at) {
  const k = KID[1], len = k.z1 - k.z0;
  if (at === 'upper') return { x: k.x + 6, y: k.y + 6, z: k.z0 + 0.2 * len };
  if (at === 'lower') return { x: k.x + 4, y: k.y + 5, z: k.z0 + 0.82 * len };
  if (at === 'inter') return { x: k.x + 10, y: k.y - 2, z: k.z0 + 0.5 * len };
  return { x: k.x - 17, y: k.y - 6, z: hilZ(1) }; // renal pelvis
}

// ───────── drawing helpers (all in HU)
function E(g, cx, cy, rx, ry, hu, rot = 0) { if (rx < 0.3 || ry < 0.3) return; g.fillStyle = col(hu); g.beginPath(); g.ellipse(cx, cy, rx, ry, rot, 0, 6.2832); g.fill(); }
function R(g, cx, cy, rx, ry, w, hu, rot = 0, a0 = 0, a1 = 6.2832) { if (rx < 0.3 || ry < 0.3) return; g.strokeStyle = col(hu); g.lineWidth = w; g.beginPath(); g.ellipse(cx, cy, rx, ry, rot, a0, a1); g.stroke(); }
function P(g, pts, w, hu) { g.strokeStyle = col(hu); g.lineWidth = w; g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke(); }
// body outline: a superellipse, rounder in front, flatter across the back (supine on the table)
function bodyPath(g, cx, cy, rx, ry) {
  g.beginPath();
  for (let i = 0; i <= 96; i++) {
    const a = i / 96 * 6.2832, c = Math.cos(a), sn = Math.sin(a), n = sn > 0 ? 3.4 : 2.3;
    const x = cx + rx * Math.sign(c) * Math.abs(c) ** (2 / n), y = cy + ry * Math.sign(sn) * Math.abs(sn) ** (2 / n);
    i ? g.lineTo(x, y) : g.moveTo(x, y);
  }
  g.closePath();
}
function fillBody(g, cx, cy, rx, ry, hu) { g.fillStyle = col(hu); bodyPath(g, cx, cy, rx, ry); g.fill(); }
function bone(g, cx, cy, rx, ry, rot = 0, marrow = 260) { E(g, cx, cy, rx, ry, 1150, rot); E(g, cx, cy, rx - 2.4, ry - 2.4, marrow, rot); }
// additive HU (partial volume): adds (hu - bg) on top of whatever is there
function addHU(g, cx, cy, r, dhu) { if (r < 0.25) return; g.globalCompositeOperation = 'lighter'; g.fillStyle = `rgb(${clamp(Math.round(dhu / 12), 0, 255)},0,0)`; g.beginPath(); g.arc(cx, cy, r, 0, 6.2832); g.fill(); g.globalCompositeOperation = 'source-over'; }

// spec: { seed, hydro (0–1, left side), obstructZ (dilated above this z), stent, stones: [{ i, at: 'ureter'|'pelvis'|'upper'|'lower'|'inter', z?, d, hu }] }
export function makeCT(spec) {
  const r = rng((spec.seed | 0) ^ 0x5ca1ab1e), rr = (a, b) => a + (b - a) * r();
  const A = { loops: [], dots: [], gas: [], calc: [], phleb: [] };
  for (let i = 0; i < 190; i++) { // small-bowel loops: short tubes drifting with z, packed into the front of the abdomen
    const kind = r();
    A.loops.push({ x: rr(86, 274), y: rr(98, 212), zc: rr(56, 300), zh: rr(12, 32), r: rr(9, 16), ph: rr(0, 6), gas: kind < 0.18, flat: kind > 0.86 });
  }
  // low-frequency parenchymal texture (soft tissue is never perfectly flat)
  A.lf = new Float32Array(N * N);
  { const w = Array.from({ length: 6 }, () => [rr(0.02, 0.09), rr(0.02, 0.09), rr(0, 6.28), rr(1.5, 3.5)]);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { let v = 0; for (const [a, b, c, m] of w) v += m * Math.sin(a * x + b * y + c); A.lf[y * N + x] = v; } }
  for (let i = 0; i < 40; i++) A.dots.push({ x: rr(110, 250), y: rr(120, 210), z0: rr(40, 280), len: rr(15, 60), r: rr(0.8, 1.6) }); // mesenteric vessels
  for (let i = 0; i < 70; i++) A.gas.push({ ang: rr(0, 6.28), rad: rr(0, 0.75), z: rr(40, 348), r: rr(1.5, 4.5), hu: r() < 0.6 ? -900 : rr(-150, 40) }); // colonic gas + stool
  for (let i = 0; i < 9; i++) A.calc.push({ z0: rr(120, 230), len: rr(4, 14), a: rr(0, 6.28), w: rr(0.4, 1.1) }); // aortic wall calcification
  // pelvic phleboliths: round, smooth, lucent centre — one sits near the left ureter, the classic look-alike
  const ph = [{ z: rr(306, 322), side: 1, near: true }, { z: rr(296, 334), side: -1 }, { z: rr(300, 336), side: r() < 0.5 ? 1 : -1 }];
  for (const p of ph) {
    let x, y;
    if (p.near) { const u = ureterXY(p.z); x = u.x + rr(9, 13); y = u.y + rr(-6, 6); } else { x = MID + p.side * rr(52, 66); y = rr(214, 238); }
    A.phleb.push({ x, y, z: p.z, r: rr(1.6, 2.4) });
  }
  const stones = spec.stones.map(s => {
    const at = s.at === 'ureter' ? Object.assign(ureterXY(s.z), { z: s.z }) : kidneySpot(s.at);
    return { i: s.i, x: at.x, y: at.y, z: at.z, r: s.d / 2, d: s.d, hu: s.hu, at: s.at };
  });
  const hydro = clamp(spec.hydro || 0, 0, 1), obstructZ = spec.obstructZ || 0, stent = !!spec.stent;
  const can = document.createElement('canvas'); can.width = can.height = N;
  const g = can.getContext('2d', { willReadFrequently: true });
  let last = null, lastIdx = -1;

  function draw(z) {
    g.globalCompositeOperation = 'source-over'; g.lineCap = 'round'; g.lineJoin = 'round';
    g.fillStyle = col(-1000); g.fillRect(0, 0, N, N);
    // scanner table
    g.strokeStyle = col(260); g.lineWidth = 4; g.beginPath(); g.moveTo(24, 314); g.quadraticCurveTo(MID, 332, 336, 314); g.stroke();
    g.strokeStyle = col(-350); g.lineWidth = 6; g.beginPath(); g.moveTo(30, 321); g.quadraticCurveTo(MID, 339, 330, 321); g.stroke();
    // body wall
    const pel = smooth(200, 262, z);
    const bx = lerp(154, 160, pel), by = lerp(106, 102, pel), bc = lerp(196, 200, pel);
    fillBody(g, MID, bc, bx, by, 30); fillBody(g, MID, bc, bx - 2, by - 2, -105);
    fillBody(g, MID, bc + 2, bx - 19, by - 14, 50); fillBody(g, MID, bc + 2, bx - 26, by - 21, -95);
    E(g, MID - 17, bc - by + 20, 15, 6, 52, 0.1); E(g, MID + 17, bc - by + 20, 15, 6, 52, -0.1); // rectus muscles
    g.save(); bodyPath(g, MID, bc + 2, bx - 26, by - 21); g.clip(); // organs and bowel stay inside the abdominal wall
    // back muscles
    if (z < 268) for (const s of [-1, 1]) {
      E(g, MID + s * 23, 280, 21, 15, 50);
      if (z > 40 && z < 210) E(g, MID + s * 58, 270, 13 * prof(z, 30, 220) + 2, 9, 50, s * 0.4); // quadratus lumborum
    }
    // liver, gallbladder, spleen, stomach, pancreas
    const lq = 1 - smooth(48, 120, z) * 0.97;
    if (z < 122) { E(g, lerp(80, 50, smooth(30, 120, z)), 182, 108 * lq, 96 * lq, 60, 0.2); if (z > 48 && z < 92) E(g, 140, 150, 11 * prof(z, 46, 94), 13 * prof(z, 46, 94), 8); } // liver hugs the right wall
    if (z < 66) { const q = 1 - smooth(20, 66, z); E(g, 312, 214, 44 * q, 52 * q, 48, -0.5); } // spleen hugs the left posterior wall
    if (z < 58) { const q = 1 - smooth(18, 58, z); E(g, 236, 146, 40 * q, 28 * q, 18); g.save(); g.beginPath(); g.ellipse(236, 146, 40 * q, 28 * q, 0, 0, 6.2832); g.clip(); g.fillStyle = col(-1000); g.fillRect(150, 100, 180, 146 - 6 - 100); g.restore(); R(g, 236, 146, 40 * q, 28 * q, 2.5, 48); }
    if (z > 38 && z < 84) { const q = prof(z, 36, 86); P(g, [[148, 206], [190, 200], [236, 192]], 12 * q, 42); }
    // colon: ascending (image left), descending (image right), transverse, sigmoid, rectum
    const colon = (cx, cy, rad, z0, z1, salt) => {
      if (z < z0 || z > z1 || rad < 1) return;
      E(g, cx, cy, rad, rad * 0.9, 45); E(g, cx, cy, rad - 1.8, rad * 0.9 - 1.8, -120);
      for (const b of A.gas) if (Math.abs(b.z - z + salt) < b.r) { const rb = Math.sqrt(b.r * b.r - (b.z - z + salt) ** 2); E(g, cx + Math.cos(b.ang) * b.rad * rad * 0.7, cy + Math.sin(b.ang) * b.rad * rad * 0.7, rb, rb, b.hu); }
    };
    colon(62, 206, 15, 80, 242, 0); colon(298, 212, 12, 36, 232, 37);
    if (z > 44 && z < 86) { const q = prof(z, 42, 88); E(g, MID, 114, 76 * q, 13 * q, 45); E(g, MID, 114, 74 * q, 11 * q, -880); }
    if (z > 232 && z < 296) { const t = smooth(232, 296, z); colon(lerp(282, 214, t), lerp(214, 226, t), 13, 0, 999, 71); }
    if (z > 286) colon(MID, 240, 14 - 3 * smooth(320, 348, z), 0, 999, 113);
    // small bowel
    for (const L of A.loops) {
      const dz = z - L.zc; if (Math.abs(dz) >= L.zh) continue;
      const q = Math.sqrt(1 - (dz / L.zh) ** 2), rad = L.r * (0.55 + 0.45 * q) * (L.flat ? 0.5 : 1), x = L.x + Math.cos(dz * 0.06 + L.ph) * 7, y = L.y + Math.sin(dz * 0.05 + L.ph) * 5;
      if (z > 262 && y > 168) continue; // the bladder fills the low pelvis
      E(g, x, y, rad, rad * 0.92, 46);
      if (!L.flat) { E(g, x, y, rad - 1.6, rad * 0.92 - 1.6, 14); if (L.gas) { g.save(); g.beginPath(); g.ellipse(x, y, rad - 1.6, rad * 0.92 - 1.6, 0, 0, 6.2832); g.clip(); g.fillStyle = col(-990); g.fillRect(x - rad, y - rad, rad * 2, rad * 0.8); g.restore(); } }
    }
    for (const d of A.dots) if (z > d.z0 && z < d.z0 + d.len) E(g, d.x + (z - d.z0) * 0.05, d.y, d.r, d.r, 42);
    g.restore();
    // spine / sacrum
    if (z < 236) {
      const vr = 19 + 4 * smooth(0, 230, z), cy = 238, ph = (z + 12) % 36, disc = ph < 8;
      if (disc) E(g, MID, cy, vr, vr * 0.86, 88);
      else {
        bone(g, MID, cy, vr, vr * 0.86, 0, 240);
        const ky = cy + vr * 0.86 + 9;
        R(g, MID, ky, 12.5, 11.5, 5, 950, 0, -0.35, Math.PI + 0.35); // neural arch: pedicles + laminae
        P(g, [[MID, ky + 13], [MID, ky + 30]], 6, 750); // spinous process
        if (ph > 14 && ph < 26) for (const s of [-1, 1]) P(g, [[MID + s * 12, ky - 3], [MID + s * (30 + 5 * smooth(0, 120, z)), ky + 4]], 5, 650); // transverse processes
      }
      E(g, MID, cy + vr * 0.86 + 9, 8, 7, 12); // canal
    } else if (z < 330) {
      const t = smooth(236, 330, z), sx = lerp(48, 14, t), sy = lerp(17, 9, t), cy = lerp(262, 284, t);
      bone(g, MID, cy, sx, sy, 0, 300);
      for (const s of [-1, 1]) E(g, MID + s * sx * 0.45, cy - 1, 3.2 * (1 - t) + 0.5, 3, 20); // sacral foramina
    }
    // iliac wings → acetabulum → femoral heads, pubis
    for (const s of [-1, 1]) {
      if (z > 196 && z < 302) { const t = smooth(230, 300, z), q = prof(z, 194, 304); bone(g, MID + s * lerp(104, 74, t), lerp(208, 240, t), 9 + 3 * t, Math.max(4, 44 * q), s * lerp(0.45, 0.2, t), 320); if (z > 236) E(g, MID + s * lerp(104, 74, t) - s * 13, lerp(208, 240, t) - 4, 9 * q, 30 * q, 50, s * 0.4); } // + iliacus
      if (z > 300) { const q = prof(z, 296, 360); R(g, MID + s * 80, 226, 27 * q + 2, 27 * q + 2, 4, 1100); bone(g, MID + s * 80, 226, 22 * q + 1, 22 * q + 1, 0, 280); }
      if (z > 330) bone(g, MID + s * 24, 166, 14, 6, s * -0.2, 300);
    }
    // psoas
    if (z > 30 && z < 312) for (const s of [-1, 1]) {
      const gr = smooth(30, 220, z), lo = smooth(232, 300, z);
      E(g, MID + s * lerp(26 + 12 * gr, 62, lo), lerp(240, 222, lo), 6 + 13 * gr - 4 * lo, 7 + 11 * gr - 3 * lo, 50, s * 0.3);
    }
    // aorta + IVC → iliac arteries and veins, renal vessels
    if (z < 202) {
      E(g, MID + 14, 208, 11, 11, 42); E(g, MID - 18, 210, 12, 8.5, 38);
      for (const c of A.calc) if (z > c.z0 && z < c.z0 + c.len) R(g, MID + 14, 208, 10.4, 10.4, 1.6, 700, 0, c.a, c.a + c.w);
      if (z > hilZ(1) - 8 && z < hilZ(1) + 6) P(g, [[MID + 14, 206], [KID[1].x - 22, KID[1].y - 10]], 5, 40);
      if (z > hilZ(-1) - 10 && z < hilZ(-1) + 4) P(g, [[MID - 18, 210], [KID[-1].x + 22, KID[-1].y - 10]], 6, 38);
    } else for (const s of [-1, 1]) {
      const t = smooth(200, 300, z), dx = lerp(8, 64, smooth(200, 262, z)) + 4 * t, yy = lerp(212, 214, t) - 22 * smooth(300, 346, z);
      E(g, MID + s * dx, yy, 6.5, 6.5, 42); E(g, MID + s * (dx - 6), yy + 9, 8, 6.5, 38);
    }
    // kidneys
    for (const s of [-1, 1]) {
      const k = KID[s], p = prof(z, k.z0, k.z1); if (p <= 0) continue;
      const len = k.z1 - k.z0, t = (z - k.z0) / len, h = s === 1 ? hydro : 0, rot = s * 0.55;
      E(g, k.x, k.y, 26 * p, 31 * p, 36, rot);
      const sp = prof(t, 0.18, 0.86);
      if (sp > 0) E(g, k.x - s * 8, k.y - 5, 10 * sp, 14 * sp, -72, rot); // sinus fat
      for (const ct of [0.2, 0.5, 0.82]) { const q = prof(z, k.z0 + ct * len - 9, k.z0 + ct * len + 9); if (q > 0) for (const off of [-9, 8]) E(g, k.x + s * 3, k.y + off, (1.2 + 4.5 * h) * q, (1.4 + 4 * h) * q, h > 0.1 ? 0 : 18, rot); } // calyces
      const pz = hilZ(s), pp = prof(z, pz - 12 - 8 * h, pz + 10 + 8 * h);
      if (pp > 0) E(g, k.x - s * (16 + 4 * h), k.y - 6, (4 + 9 * h) * pp, (5 + 7 * h) * pp, 0, rot); // renal pelvis
      if (s === 1 && stent && Math.abs(z - pz) < 7) R(g, k.x - s * 17, k.y - 6, 5, 4.5, 1.6, 1300, 0, z * 0.5, z * 0.5 + 4.2); // proximal stent coil
      if (s === 1 && h > 0 && z > pz - 25 && z < pz + 15) for (let i = 0; i < 6; i++) { const a = i * 1.05 + z * 0.03; P(g, [[k.x + Math.cos(a) * (28 * p + 2), k.y + Math.sin(a) * (33 * p + 2)], [k.x + Math.cos(a) * (28 * p + 9), k.y + Math.sin(a) * (33 * p + 9)]], 0.8, -40); } // perinephric stranding
    }
    // bladder
    if (z > 266) { const q = prof(z, 262, 352), cy = 196; E(g, MID, cy, 50 * q, 36 * q, 38); E(g, MID, cy, 50 * q - 2, 36 * q - 2, 6); if (stent && z > 322 && z < 340) R(g, MID + 20, cy + 14, 6, 5.5, 1.6, 1300, 0, z * 0.45, z * 0.45 + 4); }
    // ureters (left one carries the story: dilated above the obstruction, stent, stones with their tissue rim)
    for (const s of [-1, 1]) {
      if (z < URETER_Z0 || z > URETER_Z1) continue;
      const u = ureterXY(z, s), dil = s === 1 && z < obstructZ ? hydro : 0, lr = 1 + 2.8 * dil;
      if (s === 1 && obstructZ && Math.abs(z - obstructZ) < 22) E(g, u.x, u.y, 11, 9, -62); // periureteral stranding
      E(g, u.x, u.y, lr + 1.2, lr + 1.2, 36); E(g, u.x, u.y, lr, lr, 9);
      if (s === 1 && stent) E(g, u.x, u.y, 0.95, 0.95, 1300);
    }
    // stones (summed over the 3 mm slab = partial volume) and phleboliths
    for (const st of stones) {
      const dz = Math.abs(st.z - z); if (dz > st.r + THICK / 2) continue;
      if (st.at === 'ureter') E(g, st.x, st.y, Math.sqrt(Math.max(0, st.r * st.r - Math.min(dz, st.r) ** 2)) + 1.7, Math.sqrt(Math.max(0, st.r * st.r - Math.min(dz, st.r) ** 2)) + 1.7, 44); // ureteral wall rim
      for (const o of [-1, 0, 1]) { const d2 = st.r * st.r - (st.z - (z + o)) ** 2; if (d2 > 0) addHU(g, st.x, st.y, Math.sqrt(d2), (st.hu - 20) / 3); }
    }
    for (const p of A.phleb) for (const o of [-1, 0, 1]) { const d2 = p.r * p.r - (p.z - (z + o)) ** 2; if (d2 > 0) { addHU(g, p.x, p.y, Math.sqrt(d2), 680 / 3); } }
    for (const p of A.phleb) { const dz = Math.abs(p.z - z); if (dz < p.r * 0.7) E(g, p.x, p.y, p.r * 0.38, p.r * 0.38, 120); } // lucent centre
  }

  // HU field for slice idx: blur (partial volume) + correlated noise, more in bone
  function field(idx) {
    if (idx === lastIdx) return last;
    const z = zOf(idx); draw(z);
    const d = g.getImageData(0, 0, N, N).data, a = new Float32Array(N * N), b = new Float32Array(N * N), w = new Float32Array(N * N);
    for (let i = 0; i < N * N; i++) a[i] = d[i * 4] * 12 - 1024;
    blur(a, b);
    const nr = rng(idx * 7919 + (spec.seed | 0));
    for (let i = 0; i < N * N; i += 2) { const u = Math.max(1e-9, nr()), v = nr(), m = Math.sqrt(-2 * Math.log(u)); w[i] = m * Math.cos(6.2832 * v) * 40; w[i + 1] = m * Math.sin(6.2832 * v) * 40; }
    blur(w, a);
    for (let i = 0; i < N * N; i++) { const v = b[i]; b[i] = v + a[i] * (v > 180 ? 2.2 : v < -900 ? 0.6 : 1) + (v > -200 && v < 150 ? A.lf[i] : 0); }
    last = b; lastIdx = idx; return b;
  }
  function blur(src, dst) { // separable [1 2 1] / 4
    const t = new Float32Array(N * N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const i = y * N + x, l = x ? src[i - 1] : src[i], r2 = x < N - 1 ? src[i + 1] : src[i]; t[i] = (l + 2 * src[i] + r2) / 4; }
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const i = y * N + x, u = y ? t[i - N] : t[i], d2 = y < N - 1 ? t[i + N] : t[i]; dst[i] = (u + 2 * t[i] + d2) / 4; }
  }
  // paint slice idx into a 2D context (N × N) with window W / level L
  function render(ctx, idx, W, L) {
    const f = field(idx), im = ctx.createImageData(N, N), o = im.data, lo = L - W / 2;
    for (let i = 0; i < N * N; i++) { const v = clamp((f[i] - lo) / W, 0, 1) * 255; o[i * 4] = o[i * 4 + 1] = o[i * 4 + 2] = v; o[i * 4 + 3] = 255; }
    ctx.putImageData(im, 0, 0);
  }
  // ROI: mean / SD of a small circle (r px) on slice idx
  function roi(idx, x, y, rad = 2) {
    const f = field(idx); let s = 0, s2 = 0, n = 0;
    for (let yy = Math.round(y - rad); yy <= y + rad; yy++) for (let xx = Math.round(x - rad); xx <= x + rad; xx++) {
      if (xx < 0 || yy < 0 || xx >= N || yy >= N || (xx - x) ** 2 + (yy - y) ** 2 > rad * rad) continue;
      const v = f[yy * N + xx]; s += v; s2 += v * v; n++;
    }
    const m = n ? s / n : 0; return { mean: m, sd: n ? Math.sqrt(Math.max(0, s2 / n - m * m)) : 0 };
  }
  return { N, SLICES, stones, phleb: A.phleb, render, roi, zOf, imOf };
}
