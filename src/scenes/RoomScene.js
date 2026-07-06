import Phaser from 'phaser';

// Room decoration scene: pick furniture from the inventory bar at the
// bottom and place it anywhere in the room. Placed items are draggable;
// drop one back onto the bar to remove it. Furniture art comes from the
// Kenney "Furniture Kit" (CC0), side renders in public/assets/room/.
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
const REGISTRY_KEY = 'room-items';

export default class RoomScene extends Phaser.Scene {
  constructor() {
    super('RoomScene');
  }

  preload() {
    this.load.setPath('assets/room');
    ITEMS.forEach((item) => this.load.image(item.key, `${item.key}.png`));
  }

  create() {
    this.scale.once('resize', () => this.scene.restart());

    const { width, height } = this.scale;
    this.barTop = height - 190;

    this.drawRoom(width, height);
    this.drawInventoryBar(width, height);
    this.createBackButton();

    this.input.on('drag', (pointer, obj, dragX, dragY) => {
      obj.x = dragX;
      obj.y = dragY;
    });
    this.input.on('dragend', (pointer, obj) => {
      if (obj.y > this.barTop) {
        obj.destroy();
      }
      this.saveItems();
    });

    // Restore previously placed furniture
    (this.registry.get(REGISTRY_KEY) ?? []).forEach(({ key, x, y }) =>
      this.spawnItem(key, x, y),
    );
  }

  drawRoom(width, height) {
    const floorY = height * 0.7;
    const g = this.add.graphics();
    g.fillStyle(0xead9c2); // wall
    g.fillRect(0, 0, width, floorY);
    g.fillStyle(0xc9a1e8, 0.35); // wallpaper accent stripe
    for (let x = 60; x < width; x += 240) {
      g.fillRect(x, 0, 26, floorY);
    }
    g.fillStyle(0xb98a5e); // wooden floor
    g.fillRect(0, floorY, width, height - floorY);
    g.fillStyle(0x9e7048, 0.6); // floor boards
    for (let y = floorY + 44; y < height; y += 48) {
      g.fillRect(0, y, width, 4);
    }
    g.fillStyle(0xffffff, 0.5); // skirting board
    g.fillRect(0, floorY - 14, width, 14);

    this.add
      .text(width / 2, 52, 'My Room', {
        fontFamily: 'Georgia, serif',
        fontSize: '56px',
        color: '#5c3a4d',
      })
      .setOrigin(0.5);
  }

  drawInventoryBar(width, height) {
    const barHeight = height - this.barTop;
    this.add
      .rectangle(width / 2, this.barTop + barHeight / 2, width, barHeight, 0x3d2734)
      .setDepth(10);
    this.add
      .text(24, this.barTop + 12, 'Inventory — click to place, drag here to remove', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '22px',
        color: '#c9a7b8',
      })
      .setDepth(11);

    const slot = width / (ITEMS.length + 1);
    ITEMS.forEach((item, i) => {
      const x = slot * (i + 1);
      const y = this.barTop + barHeight / 2 + 14;
      const thumb = this.add
        .image(x, y, item.key)
        .setDepth(11)
        .setInteractive({ useHandCursor: true });
      const tex = this.textures.get(item.key).getSourceImage();
      thumb.setScale(Math.min(90 / tex.width, 90 / tex.height));

      thumb.on('pointerover', () => thumb.setTint(0xe8a7bf));
      thumb.on('pointerout', () => thumb.clearTint());
      thumb.on('pointerdown', () => {
        this.spawnItem(item.key, this.scale.width / 2, this.scale.height * 0.5);
        this.saveItems();
      });
    });
  }

  spawnItem(key, x, y) {
    const item = this.add
      .image(x, y, key)
      .setScale(ITEM_SCALE)
      .setInteractive({ draggable: true, useHandCursor: true });
    item.setData('furniture', true);
    return item;
  }

  saveItems() {
    const placed = this.children.list
      .filter((obj) => obj.getData && obj.getData('furniture') && obj.active)
      .map((obj) => ({ key: obj.texture.key, x: obj.x, y: obj.y }));
    this.registry.set(REGISTRY_KEY, placed);
  }

  createBackButton() {
    const bg = this.add
      .rectangle(140, 52, 220, 60, 0x8e5fd9)
      .setDepth(11)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(140, 52, '< Dress Up', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '28px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setDepth(12);

    bg.on('pointerover', () => bg.setFillStyle(0x7247b8));
    bg.on('pointerout', () => bg.setFillStyle(0x8e5fd9));
    bg.on('pointerdown', () => this.scene.start('DressUpScene'));
  }
}
