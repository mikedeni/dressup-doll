import Phaser from 'phaser';

// Procedural face features drawn on the doll's plain head skin, so brows,
// eyes, nose and mouth can each be customised independently — the flat baked
// face art (face-N.png) can't. Coordinates below are in doll-container space;
// GameScene shifts the drawing origin into the neck-pivoted head rig.
export const FACE = {
  eyeLX: -28,
  eyeRX: 28,
  eyeY: -186,
  eyeW: 28, // sclera ellipse
  eyeH: 22,
  browY: -206,
  noseY: -166,
  mouthY: -148,
};

const BROW_COL = 0x5a3d2b;
const MOUTH_COL = 0xb5473f;

const deg = (d) => Phaser.Math.DegToRad(d);

// One eyebrow, mirrored per eye. `cx` is the eye's x; the inner end points
// toward the nose so raised/angry/worried tilt the right way on both sides.
export function drawBrow(g, cx, cy, v) {
  g.clear();
  const hw = 16;
  const th = v.thick ? 9 : 6;
  const toCenter = cx < 0 ? 1 : -1;
  const innerX = cx + toCenter * hw;
  const outerX = cx - toCenter * hw;
  g.lineStyle(th, BROW_COL, 1);

  if (v.shape === 'arched') {
    g.beginPath();
    g.moveTo(innerX, cy + 1);
    g.lineTo(cx, cy - 7);
    g.lineTo(outerX, cy + 1);
    g.strokePath();
    return;
  }

  let innerY = cy;
  let outerY = cy;
  if (v.shape === 'raised') {
    innerY = cy + 3;
    outerY = cy - 5;
  } else if (v.shape === 'angry') {
    innerY = cy + 5;
    outerY = cy - 2;
  } else if (v.shape === 'worried') {
    innerY = cy - 5;
    outerY = cy + 2;
  }
  g.beginPath();
  g.moveTo(innerX, innerY);
  g.lineTo(outerX, outerY);
  g.strokePath();
}

export function drawNose(g, cx, cy, v) {
  g.clear();
  if (v.shape === 'none') return;
  const col = 0xcf8f5e;
  if (v.shape === 'button') {
    g.fillStyle(col, 1);
    g.fillCircle(cx, cy, 4);
    return;
  }
  g.lineStyle(4, col, 1);
  if (v.shape === 'line') {
    g.beginPath();
    g.moveTo(cx, cy - 8);
    g.lineTo(cx, cy + 4);
    g.strokePath();
  } else if (v.shape === 'curve') {
    g.beginPath();
    g.moveTo(cx - 1, cy - 8);
    g.lineTo(cx - 1, cy + 2);
    g.lineTo(cx + 6, cy + 4);
    g.strokePath();
  }
}

export function drawMouth(g, cx, cy, v) {
  g.clear();
  g.lineStyle(6, MOUTH_COL, 1);
  if (v.shape === 'neutral') {
    g.beginPath();
    g.moveTo(cx - 14, cy);
    g.lineTo(cx + 14, cy);
    g.strokePath();
  } else if (v.shape === 'smile') {
    g.beginPath();
    g.arc(cx, cy - 10, 16, deg(25), deg(155), false);
    g.strokePath();
  } else if (v.shape === 'frown') {
    g.beginPath();
    g.arc(cx, cy + 12, 16, deg(205), deg(335), false);
    g.strokePath();
  } else if (v.shape === 'open') {
    g.fillStyle(0x7a2b2b, 1);
    g.fillEllipse(cx, cy, 24, 18);
    g.fillStyle(0xe8879a, 1);
    g.fillEllipse(cx, cy + 4, 14, 8);
  } else if (v.shape === 'grin') {
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(cx - 15, cy - 6, 30, 13, 5);
    g.lineStyle(4, MOUTH_COL, 1);
    g.strokeRoundedRect(cx - 15, cy - 6, 30, 13, 5);
    g.beginPath();
    g.moveTo(cx - 15, cy);
    g.lineTo(cx + 15, cy);
    g.strokePath();
  }
}
