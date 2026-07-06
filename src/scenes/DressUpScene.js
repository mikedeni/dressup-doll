import Phaser from 'phaser';
import { CATEGORIES, textureKey } from './../outfits.js';
import { createDollTextures } from './../textures.js';

// Layout is computed from the game size (1920x1080 base, Scale.FIT keeps
// the 16:9 aspect on any screen). The doll textures are 260x460, so the
// doll is scaled up to fill the left half of the frame.
const DOLL_SCALE = 1.9;

export default class DressUpScene extends Phaser.Scene {
  constructor() {
    super('DressUpScene');
    this.selection = {};
    this.layers = {};
    this.valueLabels = {};
  }

  create() {
    createDollTextures(this);

    // EXPAND mode grows the game size with the viewport; rebuild the
    // layout whenever it changes so the scene always fills the screen.
    this.scale.once('resize', () => this.scene.restart());

    const { width, height } = this.scale;
    this.dollX = width * 0.28;
    this.dollY = height * 0.56;
    this.panelX = width * 0.55;
    this.panelWidth = width * 0.36;

    this.add
      .text(width / 2, height * 0.07, 'Dress-Up Doll', {
        fontFamily: 'Georgia, serif',
        fontSize: '64px',
        color: '#5c3a4d',
      })
      .setOrigin(0.5);

    this.add.image(this.dollX, this.dollY, 'doll-body').setScale(DOLL_SCALE);

    const rowStart = height * 0.2;
    const rowGap = height * 0.14;

    CATEGORIES.forEach((category, row) => {
      this.selection[category.key] = 0;
      this.layers[category.key] = this.add
        .image(this.dollX, this.dollY, textureKey(category.key, 0))
        .setScale(DOLL_SCALE);
      this.createSelector(category, rowStart + row * rowGap);
    });

    this.createRandomizeButton(rowStart + CATEGORIES.length * rowGap);
  }

  createSelector(category, y) {
    this.add.text(this.panelX, y - 52, category.label, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '28px',
      color: '#8a6478',
    });

    this.createArrowButton(this.panelX + 32, y + 16, '<', () =>
      this.cycle(category, -1),
    );
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
    this.layers[category.key].setTexture(textureKey(category.key, index));
    this.valueLabels[category.key].setText(category.variants[index].name);

    this.tweens.add({
      targets: this.layers[category.key],
      scale: { from: DOLL_SCALE * 1.06, to: DOLL_SCALE },
      duration: 160,
      ease: 'Back.Out',
    });
  }
}
