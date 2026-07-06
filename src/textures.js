// Procedural textures for the doll and every clothing variant, generated
// with Graphics so the MVP needs no external art assets. All clothing
// textures share the doll's 260x460 canvas so layers align at the origin.

import { CATEGORIES, textureKey } from './outfits.js';

const W = 260;
const H = 460;
const SKIN = 0xf2c9a6;

function withCanvas(scene, key, draw) {
  const g = scene.add.graphics();
  draw(g);
  g.generateTexture(key, W, H);
  g.destroy();
}

function drawBody(g) {
  g.fillStyle(SKIN);
  // head, neck, torso, arms, legs
  g.fillCircle(130, 70, 44);
  g.fillRect(118, 108, 24, 20);
  g.fillRoundedRect(88, 126, 84, 130, 16);
  g.fillRoundedRect(62, 132, 24, 110, 10);
  g.fillRoundedRect(174, 132, 24, 110, 10);
  g.fillRoundedRect(98, 250, 26, 150, 10);
  g.fillRoundedRect(136, 250, 26, 150, 10);
  // face
  g.fillStyle(0x33261d);
  g.fillCircle(114, 64, 4);
  g.fillCircle(146, 64, 4);
  g.lineStyle(3, 0xba6b5c);
  g.beginPath();
  g.arc(130, 80, 12, 0.3, Math.PI - 0.3);
  g.strokePath();
}

function drawHair(g, { color, long }) {
  g.fillStyle(color);
  g.beginPath();
  g.arc(130, 66, 48, Math.PI, 2 * Math.PI);
  g.fillPath();
  g.fillRect(82, 60, 14, long ? 120 : 30);
  g.fillRect(164, 60, 14, long ? 120 : 30);
}

function drawTop(g, { color }) {
  g.fillStyle(color);
  g.fillRoundedRect(84, 122, 92, 120, 14);
  g.fillRoundedRect(58, 128, 30, 70, 10);
  g.fillRoundedRect(172, 128, 30, 70, 10);
}

function drawBottom(g, { color, skirt }) {
  g.fillStyle(color);
  if (skirt) {
    g.beginPath();
    g.moveTo(92, 240);
    g.lineTo(168, 240);
    g.lineTo(188, 320);
    g.lineTo(72, 320);
    g.closePath();
    g.fillPath();
  } else {
    g.fillRoundedRect(94, 240, 34, 150, 8);
    g.fillRoundedRect(132, 240, 34, 150, 8);
  }
}

function drawShoes(g, { color }) {
  g.fillStyle(color);
  g.fillRoundedRect(90, 392, 40, 22, 8);
  g.fillRoundedRect(130, 392, 40, 22, 8);
}

const PAINTERS = {
  hair: drawHair,
  top: drawTop,
  bottom: drawBottom,
  shoes: drawShoes,
};

export function createDollTextures(scene) {
  withCanvas(scene, 'doll-body', drawBody);

  for (const category of CATEGORIES) {
    const paint = PAINTERS[category.key];
    category.variants.forEach((variant, index) => {
      withCanvas(scene, textureKey(category.key, index), (g) => paint(g, variant));
    });
  }
}

export const DOLL_SIZE = { width: W, height: H };
