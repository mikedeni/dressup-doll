import Phaser from 'phaser';
import { CATEGORIES, textureKey } from './../outfits.js';
import { createDollTextures } from './../textures.js';

const DOLL_X = 300;
const DOLL_Y = 330;
const PANEL_X = 560;

export default class DressUpScene extends Phaser.Scene {
  constructor() {
    super('DressUpScene');
    this.selection = {};
    this.layers = {};
    this.valueLabels = {};
  }

  create() {
    createDollTextures(this);

    this.add
      .text(450, 44, 'Dress-Up Doll', {
        fontFamily: 'Georgia, serif',
        fontSize: '40px',
        color: '#5c3a4d',
      })
      .setOrigin(0.5);

    this.add.image(DOLL_X, DOLL_Y, 'doll-body');

    CATEGORIES.forEach((category, row) => {
      this.selection[category.key] = 0;
      this.layers[category.key] = this.add.image(
        DOLL_X,
        DOLL_Y,
        textureKey(category.key, 0),
      );
      this.createSelector(category, 140 + row * 90);
    });

    this.createRandomizeButton(140 + CATEGORIES.length * 90);
  }

  createSelector(category, y) {
    this.add.text(PANEL_X, y - 34, category.label, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      color: '#8a6478',
    });

    this.createArrowButton(PANEL_X + 20, y + 10, '<', () => this.cycle(category, -1));
    this.createArrowButton(PANEL_X + 280, y + 10, '>', () => this.cycle(category, 1));

    this.valueLabels[category.key] = this.add
      .text(PANEL_X + 150, y + 10, category.variants[0].name, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '20px',
        color: '#3d2734',
      })
      .setOrigin(0.5);
  }

  createArrowButton(x, y, label, onClick) {
    const bg = this.add
      .rectangle(x, y, 44, 44, 0xe8a7bf)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(x, y, label, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '24px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    bg.on('pointerover', () => bg.setFillStyle(0xd9779c));
    bg.on('pointerout', () => bg.setFillStyle(0xe8a7bf));
    bg.on('pointerdown', onClick);
  }

  createRandomizeButton(y) {
    const bg = this.add
      .rectangle(PANEL_X + 150, y, 220, 52, 0x8e5fd9)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(PANEL_X + 150, y, 'Randomize!', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '22px',
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
      scale: { from: 1.06, to: 1 },
      duration: 160,
      ease: 'Back.Out',
    });
  }
}
