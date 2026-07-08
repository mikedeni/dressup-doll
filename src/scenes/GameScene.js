import Phaser from 'phaser';
import { CATEGORIES, textureKey } from './../outfits.js';

// Single scene: the doll stands inside the room. Two edit modes — "Dress
// Up" shows the outfit panel, "Room" shows the furniture inventory bar.
// Doll art: Kenney "Modular Characters"; furniture: Kenney "Furniture
// Kit" (both CC0). Everything persists to localStorage (normalised
// coordinates, so refreshing at another window size still restores).
const PART_OFFSETS = {
  neck: { x: 0, y: -76 },
  torso: { x: 0, y: 15 },
  head: { x: 0, y: -180 },
  face: { x: 0, y: -226 },
  hairTop: { x: 0, y: -272 },
  arm: { x: 78, y: -5 },
  hand: { x: 125, y: 70 },
  hip: { x: 0, y: 100 },
  leg: { x: 36, y: 190 },
  shoe: { x: 48, y: 282 },
};
const DOLL_SPAN = 575; // hair top to shoe bottom, in asset pixels
const DOLL_FOOT_Y = 303; // shoe bottom offset from container origin

const ITEMS = [
  { key: 'loungeSofa', name: 'Sofa' },
  { key: 'bedSingle', name: 'Bed' },
  { key: 'table', name: 'Table' },
  { key: 'chairCushion', name: 'Chair' },
  { key: 'bookcaseOpen', name: 'Bookcase' },
  { key: 'tableCoffee', name: 'Coffee Table' },
  { key: 'lampRoundFloor', name: 'Lamp' },
  { key: 'pottedPlant', name: 'Plant' },
  { key: 'televisionModern', name: 'TV' },
  { key: 'cabinetTelevision', name: 'TV Cabinet' },
  { key: 'loungeChair', name: 'Lounge Chair' },
  { key: 'radio', name: 'Radio' },
];
const ITEM_SCALE = 2.4;
const STORAGE_KEY = 'dressup-doll-save';

const DEPTH = { doll: 5, ui: 10, uiText: 12 };

function loadSave() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {};
  } catch {
    return {};
  }
}

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
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
    this.load.setPath('assets/room');
    ITEMS.forEach((item) => this.load.image(item.key, `${item.key}.png`));
    this.load.setPath('assets');
    this.load.image('room-bg', 'room-bg.png');
  }

  create() {
    this.scale.once('resize', () => this.scene.restart());

    const { width, height } = this.scale;
    this.barTop = height - 190;
    this.parts = {};
    this.valueLabels = {};

    const save = loadSave();
    this.selection = {};
    CATEGORIES.forEach((category) => {
      this.selection[category.key] = save.outfit?.[category.key] ?? 0;
    });

    this.drawRoom(width, height);
    this.createDoll(save);
    (save.furniture ?? []).forEach(({ key, x, y }) => {
      if (ITEMS.some((item) => item.key === key)) {
        this.spawnItem(key, x * width, y * height);
      }
    });

    this.buildDressPanel(width, height);
    this.buildInventoryBar(width, height);
    this.buildTopButtons(width);
    this.setupDrag();

    this.setMode(save.mode === 'room' ? 'room' : 'dress');
  }

  // --- persistence ---

  saveState() {
    const { width, height } = this.scale;
    const furniture = this.children.list
      .filter((obj) => obj.getData && obj.getData('furniture') && obj.active)
      .map((obj) => ({ key: obj.texture.key, x: obj.x / width, y: obj.y / height }));
    const data = {
      outfit: this.selection,
      furniture,
      doll: { x: this.doll.x / width, y: this.doll.y / height },
      mode: this.mode,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  // --- room ---

  drawRoom(width, height) {
    const roomH = this.barTop;
    const bg = this.add.image(width / 2, roomH / 2, 'room-bg');
    const tex = bg.texture.getSourceImage();
    const scale = Math.max(width / tex.width, roomH / tex.height);
    bg.setScale(scale).setDepth(-10);

    this.add
      .text(width / 2, 52, 'Dress-Up Doll', {
        fontFamily: 'Georgia, serif',
        fontSize: '56px',
        color: '#5c3a4d',
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.uiText);
  }

  spawnItem(key, x, y) {
    const item = this.add
      .image(x, y, key)
      .setScale(ITEM_SCALE)
      .setInteractive({ draggable: true, useHandCursor: true });
    item.setData('furniture', true);
    return item;
  }

  // --- doll ---

  createDoll(save) {
    const { width, height } = this.scale;
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
    this.parts.face = img('face-0', P.face.x, P.face.y).setOrigin(0.5, 0);
    this.parts.hair = img('hair-0', P.hairTop.x, P.hairTop.y).setOrigin(0.5, 0);

    this.dollScale = (height * 0.42) / DOLL_SPAN;
    const x = save.doll ? save.doll.x * width : width * 0.22;
    const y = save.doll
      ? save.doll.y * height
      : height * 0.86 - DOLL_FOOT_Y * this.dollScale;

    this.doll = this.add
      .container(x, y, Object.values(this.parts))
      .setScale(this.dollScale)
      .setDepth(DEPTH.doll);
    this.doll.setInteractive(
      new Phaser.Geom.Rectangle(-160, -290, 320, 610),
      Phaser.Geom.Rectangle.Contains,
    );
    this.input.setDraggable(this.doll);

    CATEGORIES.forEach((category) => {
      this.applyVariant(category, this.selection[category.key]);
    });
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

  setVariant(category, index) {
    this.selection[category.key] = index;
    this.applyVariant(category, index);
    this.valueLabels[category.key].setText(category.variants[index].name);
    this.saveState();

    this.tweens.add({
      targets: this.doll,
      scale: { from: this.dollScale * 1.04, to: this.dollScale },
      duration: 160,
      ease: 'Back.Out',
    });
  }

  // --- drag handling ---

  setupDrag() {
    this.input.on('drag', (pointer, obj, dragX, dragY) => {
      obj.x = dragX;
      obj.y = dragY;
    });
    this.input.on('dragend', (pointer, obj) => {
      const isFurniture = obj.getData && obj.getData('furniture');
      if (isFurniture && this.mode === 'room' && obj.y > this.barTop) {
        obj.destroy();
      }
      this.saveState();
    });
  }

  // --- dress-up panel ---

  buildDressPanel(width, height) {
    this.dressUI = this.add.container(0, 0).setDepth(DEPTH.ui);
    this.panelX = width * 0.56;
    this.panelWidth = width * 0.34;

    const panelBg = this.add
      .rectangle(
        this.panelX + this.panelWidth / 2,
        height * 0.53,
        this.panelWidth + 120,
        height * 0.82,
        0xfdf1f5,
        0.94,
      )
      .setStrokeStyle(3, 0xe8a7bf);
    this.dressUI.add(panelBg);

    const rowStart = height * 0.2;
    const rowGap = height * 0.125;

    CATEGORIES.forEach((category, row) => {
      this.createSelector(category, rowStart + row * rowGap);
    });
    this.createRandomizeButton(rowStart + CATEGORIES.length * rowGap);
  }

  createSelector(category, y) {
    const label = this.add.text(this.panelX, y - 52, category.label, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '28px',
      color: '#8a6478',
    });

    const left = this.createArrowButton(this.panelX + 32, y + 16, '<', () =>
      this.cycle(category, -1),
    );
    const right = this.createArrowButton(
      this.panelX + this.panelWidth - 32,
      y + 16,
      '>',
      () => this.cycle(category, 1),
    );

    const value = this.add
      .text(
        this.panelX + this.panelWidth / 2,
        y + 16,
        category.variants[this.selection[category.key]].name,
        {
          fontFamily: 'Arial, sans-serif',
          fontSize: '32px',
          color: '#3d2734',
        },
      )
      .setOrigin(0.5);
    this.valueLabels[category.key] = value;

    this.dressUI.add([label, ...left, ...right, value]);
  }

  createArrowButton(x, y, label, onClick) {
    const bg = this.add
      .rectangle(x, y, 64, 64, 0xe8a7bf)
      .setInteractive({ useHandCursor: true });
    const text = this.add
      .text(x, y, label, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '36px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    bg.on('pointerover', () => bg.setFillStyle(0xd9779c));
    bg.on('pointerout', () => bg.setFillStyle(0xe8a7bf));
    bg.on('pointerdown', onClick);
    return [bg, text];
  }

  createRandomizeButton(y) {
    const x = this.panelX + this.panelWidth / 2;
    const bg = this.add
      .rectangle(x, y, 320, 76, 0x8e5fd9)
      .setInteractive({ useHandCursor: true });
    const text = this.add
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
    this.dressUI.add([bg, text]);
  }

  cycle(category, direction) {
    const count = category.variants.length;
    const index = (this.selection[category.key] + direction + count) % count;
    this.setVariant(category, index);
  }

  // --- inventory bar ---

  buildInventoryBar(width, height) {
    this.roomUI = this.add.container(0, 0).setDepth(DEPTH.ui);
    const barHeight = height - this.barTop;

    const bar = this.add.rectangle(
      width / 2,
      this.barTop + barHeight / 2,
      width,
      barHeight,
      0x3d2734,
    );
    const hint = this.add.text(
      24,
      this.barTop + 12,
      'Inventory — click to place, drag here to remove',
      {
        fontFamily: 'Arial, sans-serif',
        fontSize: '22px',
        color: '#c9a7b8',
      },
    );
    this.roomUI.add([bar, hint]);

    const slot = width / (ITEMS.length + 1);
    ITEMS.forEach((item, i) => {
      const x = slot * (i + 1);
      const y = this.barTop + barHeight / 2 + 14;
      const thumb = this.add
        .image(x, y, item.key)
        .setInteractive({ useHandCursor: true });
      const tex = this.textures.get(item.key).getSourceImage();
      thumb.setScale(Math.min(90 / tex.width, 90 / tex.height));

      thumb.on('pointerover', () => thumb.setTint(0xe8a7bf));
      thumb.on('pointerout', () => thumb.clearTint());
      thumb.on('pointerdown', () => {
        this.spawnItem(item.key, width / 2, height * 0.5);
        this.saveState();
      });
      this.roomUI.add(thumb);
    });
  }

  // --- top buttons ---

  buildTopButtons(width) {
    this.tabDress = this.makeButton(120, 52, 200, 'Dress Up', () =>
      this.setMode('dress'),
    );
    this.tabRoom = this.makeButton(330, 52, 160, 'Room', () => this.setMode('room'));
    this.makeButton(width - 110, 52, 160, 'Reset', () => this.resetAll(), 0xd9534f);
  }

  makeButton(x, y, w, label, onClick, color = 0x8e5fd9) {
    const bg = this.add
      .rectangle(x, y, w, 60, color)
      .setDepth(DEPTH.ui)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(x, y, label, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '28px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.uiText);
    bg.setData('baseColor', color);
    bg.on('pointerover', () => bg.setFillStyle(0x7247b8));
    bg.on('pointerout', () => this.tintTab(bg));
    bg.on('pointerdown', onClick);
    return bg;
  }

  tintTab(bg) {
    bg.setFillStyle(bg.getData('active') ? 0x5c3a8c : bg.getData('baseColor'));
  }

  setMode(mode) {
    this.mode = mode;
    this.dressUI.setVisible(mode === 'dress');
    this.roomUI.setVisible(mode === 'room');
    this.tabDress.setData('active', mode === 'dress');
    this.tabRoom.setData('active', mode === 'room');
    this.tintTab(this.tabDress);
    this.tintTab(this.tabRoom);
    this.saveState();
  }

  resetAll() {
    localStorage.removeItem(STORAGE_KEY);
    this.scene.restart();
  }
}
