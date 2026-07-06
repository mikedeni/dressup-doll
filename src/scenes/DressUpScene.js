import Phaser from 'phaser';
import { CATEGORIES, textureKey } from './../outfits.js';

// Doll is assembled from the Kenney "Modular Characters" pack (CC0)
// following the pack's instruction sheet. All part offsets below are in
// asset pixels, relative to the torso centre; the whole container is
// scaled to fit the viewport height.
const PART_OFFSETS = {
  neck: { x: 0, y: -76 },
  torso: { x: 0, y: 15 },
  head: { x: 0, y: -180 },
  face: { x: 0, y: -226 },
  hairTop: { x: 0, y: -272 }, // hair uses origin (0.5, 0) so styles of any length align at the head top
  arm: { x: 78, y: -5 },
  hand: { x: 125, y: 70 },
  hip: { x: 0, y: 100 },
  leg: { x: 36, y: 190 },
  shoe: { x: 48, y: 282 },
};
const DOLL_SPAN = 575; // hair top to shoe bottom, in asset pixels

export default class DressUpScene extends Phaser.Scene {
  constructor() {
    super('DressUpScene');
    this.selection = {};
    this.parts = {};
    this.valueLabels = {};
  }

  preload() {
    this.load.setPath('assets/doll');
    for (const key of ['head', 'neck', 'hand']) {
      this.load.image(key, `${key}.png`);
    }
    CATEGORIES.forEach((category) => {
      category.variants.forEach((variant, i) => {
        const base = textureKey(category.key, i);
        if (category.key === 'top') {
          this.load.image(base, `${base}.png`);
          this.load.image(`${base}-arm`, `${base}-arm.png`);
        } else if (category.key === 'bottom') {
          this.load.image(`${base}-hip`, `${base}-hip.png`);
          this.load.image(`${base}-leg`, `${base}-leg.png`);
        } else {
          this.load.image(base, `${base}.png`);
        }
      });
    });
  }

  create() {
    // EXPAND mode grows the game size with the viewport; rebuild the
    // layout whenever it changes so the scene always fills the screen.
    this.scale.once('resize', () => this.scene.restart());

    const { width, height } = this.scale;
    this.panelX = width * 0.55;
    this.panelWidth = width * 0.36;

    this.add
      .text(width / 2, height * 0.07, 'Dress-Up Doll', {
        fontFamily: 'Georgia, serif',
        fontSize: '64px',
        color: '#5c3a4d',
      })
      .setOrigin(0.5);

    this.createDoll(width * 0.28, height * 0.55, (height * 0.72) / DOLL_SPAN);

    const rowStart = height * 0.18;
    const rowGap = height * 0.125;

    CATEGORIES.forEach((category, row) => {
      this.selection[category.key] = 0;
      this.applyVariant(category, 0);
      this.createSelector(category, rowStart + row * rowGap);
    });

    this.createRandomizeButton(rowStart + CATEGORIES.length * rowGap);
    this.createRoomButton();
  }

  createRoomButton() {
    const bg = this.add
      .rectangle(140, 52, 220, 60, 0x8e5fd9)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(140, 52, 'My Room >', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '28px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    bg.on('pointerover', () => bg.setFillStyle(0x7247b8));
    bg.on('pointerout', () => bg.setFillStyle(0x8e5fd9));
    bg.on('pointerdown', () => this.scene.start('RoomScene'));
  }

  createDoll(x, y, scale) {
    const P = PART_OFFSETS;
    const img = (key, px, py) => this.add.image(px, py, key);

    this.parts.neck = img('neck', P.neck.x, P.neck.y);
    this.parts.armL = img('top-0-arm', -P.arm.x, P.arm.y).setFlipX(true);
    this.parts.armR = img('top-0-arm', P.arm.x, P.arm.y);
    this.parts.handL = img('hand', -P.hand.x, P.hand.y).setFlipX(true);
    this.parts.handR = img('hand', P.hand.x, P.hand.y);
    this.parts.legL = img('bottom-0-leg', -P.leg.x, P.leg.y).setFlipX(true);
    this.parts.legR = img('bottom-0-leg', P.leg.x, P.leg.y);
    this.parts.shoeL = img('shoes-0', -P.shoe.x, P.shoe.y).setFlipX(true);
    this.parts.shoeR = img('shoes-0', P.shoe.x, P.shoe.y);
    this.parts.hip = img('bottom-0-hip', P.hip.x, P.hip.y);
    this.parts.torso = img('top-0', P.torso.x, P.torso.y);
    this.parts.head = img('head', P.head.x, P.head.y);
    // Faces vary in height, so anchor them at the eyebrow line (origin top)
    this.parts.face = img('face-0', P.face.x, P.face.y).setOrigin(0.5, 0);
    this.parts.hair = img('hair-0', P.hairTop.x, P.hairTop.y).setOrigin(0.5, 0);

    this.doll = this.add.container(x, y, Object.values(this.parts)).setScale(scale);
    this.dollScale = scale;
  }

  applyVariant(category, index) {
    const categoryKey = category.key;
    const variant = category.variants[index];
    const base = textureKey(categoryKey, index);
    if (categoryKey === 'hair') {
      this.parts.hair.setTexture(base);
      // Some hair assets are drawn off-centre; nudge per variant.
      this.parts.hair.x = PART_OFFSETS.hairTop.x + (variant.offsetX ?? 0);
    } else if (categoryKey === 'face') {
      this.parts.face.setTexture(base);
    } else if (categoryKey === 'top') {
      this.parts.torso.setTexture(base);
      this.parts.armL.setTexture(`${base}-arm`);
      this.parts.armR.setTexture(`${base}-arm`);
    } else if (categoryKey === 'bottom') {
      this.parts.hip.setTexture(`${base}-hip`);
      this.parts.legL.setTexture(`${base}-leg`);
      this.parts.legR.setTexture(`${base}-leg`);
    } else if (categoryKey === 'shoes') {
      this.parts.shoeL.setTexture(base);
      this.parts.shoeR.setTexture(base);
    }
  }

  createSelector(category, y) {
    this.add.text(this.panelX, y - 52, category.label, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '28px',
      color: '#8a6478',
    });

    this.createArrowButton(this.panelX + 32, y + 16, '<', () => this.cycle(category, -1));
    this.createArrowButton(this.panelX + this.panelWidth - 32, y + 16, '>', () =>
      this.cycle(category, 1),
    );

    this.valueLabels[category.key] = this.add
      .text(this.panelX + this.panelWidth / 2, y + 16, category.variants[0].name, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '32px',
        color: '#3d2734',
      })
      .setOrigin(0.5);
  }

  createArrowButton(x, y, label, onClick) {
    const bg = this.add
      .rectangle(x, y, 64, 64, 0xe8a7bf)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(x, y, label, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '36px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    bg.on('pointerover', () => bg.setFillStyle(0xd9779c));
    bg.on('pointerout', () => bg.setFillStyle(0xe8a7bf));
    bg.on('pointerdown', onClick);
  }

  createRandomizeButton(y) {
    const x = this.panelX + this.panelWidth / 2;
    const bg = this.add
      .rectangle(x, y, 320, 76, 0x8e5fd9)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(x, y, 'Randomize!', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '34px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    bg.on('pointerover', () => bg.setFillStyle(0x7247b8));
    bg.on('pointerout', () => bg.setFillStyle(0x8e5fd9));
    bg.on('pointerdown', () => {
      for (const category of CATEGORIES) {
        const index = Phaser.Math.Between(0, category.variants.length - 1);
        this.setVariant(category, index);
      }
    });
  }

  cycle(category, direction) {
    const count = category.variants.length;
    const index = (this.selection[category.key] + direction + count) % count;
    this.setVariant(category, index);
  }

  setVariant(category, index) {
    this.selection[category.key] = index;
    this.applyVariant(category, index);
    this.valueLabels[category.key].setText(category.variants[index].name);

    this.tweens.add({
      targets: this.doll,
      scale: { from: this.dollScale * 1.04, to: this.dollScale },
      duration: 160,
      ease: 'Back.Out',
    });
  }
}
