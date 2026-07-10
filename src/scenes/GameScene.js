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
const SKIN = 0xffe0b1; // sampled from head.png, used for the blink eyelids

// Per face variant, in doll-container pixels (each face image bakes
// eyes+brows+mouth together with a top-centre origin at y=-226, and the
// variants differ in size/placement/colour). We hide the baked eyes under
// skin patches and redraw them ourselves so the doll can glance left/right
// and blink — neither of which the flat art can do. The mouth stays as the
// baked art. Measured off the source PNGs (see scripts in git history).
const FACES = [
  { lx: -34, rx: 28, ey: -180, er: 10, ecol: 0x694c39 },
  { lx: -20, rx: 27, ey: -178, er: 10, ecol: 0x396962 },
  { lx: -36, rx: 38, ey: -197, er: 8, ecol: 0x4d4743 },
  { lx: -34, rx: 31, ey: -193, er: 11, ecol: 0x4d4743 },
];
const LID_W = 30;
const LID_H = 26;
const GAZE_MAX = 4; // px the eyes slide when glancing
// The head group (head/face/hair/eyelids) lives in its own container pivoted
// here (near the neck) so the idle can nod it around the neck rather than
// spinning each piece about its own centre.
const NECK_PIVOT = -100;

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

    // Clock: 'real' follows the wall clock, 'sim' lets you scrub a set time.
    this.clockMode = save.clockMode === 'sim' ? 'sim' : 'real';
    this.simMin = Number.isFinite(save.simMin) ? save.simMin : 720; // noon

    this.drawRoom(width);
    this.createDoll(save);
    this.startIdle();
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
      clockMode: this.clockMode,
      simMin: this.simMin,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  // --- room ---

  drawRoom(width) {
    const roomH = this.barTop;
    const bg = this.add.image(width / 2, roomH / 2, 'room-bg');
    const tex = bg.texture.getSourceImage();
    const scale = Math.max(width / tex.width, roomH / tex.height);
    bg.setScale(scale).setDepth(-10);

    this.createWindow(width, roomH);

    this.add
      .text(width / 2, 52, 'Dress-Up Doll', {
        fontFamily: 'Georgia, serif',
        fontSize: '56px',
        color: '#5c3a4d',
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.uiText);
  }

  // A window on the wall showing the sky outside, tinted to match the real
  // time of day. Refreshes on a timer so it drifts with the real clock.
  createWindow(width, roomH) {
    const w = width * 0.2;
    const h = roomH * 0.32;
    const x = width * 0.62;
    const y = roomH * 0.34;

    this.win = this.add.container(x, y).setDepth(-5);

    this.winSky = this.add.rectangle(0, 0, w, h, 0x8ecae6);
    this.winSun = this.add.circle(w * 0.26, -h * 0.24, Math.min(w, h) * 0.16, 0xffd43b);
    this.winStars = Array.from({ length: 10 }, () =>
      this.add
        .circle(
          Phaser.Math.Between(-w / 2 + 12, w / 2 - 12),
          Phaser.Math.Between(-h / 2 + 12, h / 2 - 12),
          2,
          0xffffff,
        )
        .setDepth(1),
    );
    // Sill + a central mullion, so it reads as a window not a poster.
    const frame = this.add.rectangle(0, 0, w, h).setStrokeStyle(14, 0x6d4c41);
    const mullionV = this.add.rectangle(0, 0, 8, h, 0x6d4c41);
    const mullionH = this.add.rectangle(0, 0, w, 8, 0x6d4c41);

    this.win.add([this.winSky, ...this.winStars, this.winSun, frame, mullionV, mullionH]);

    // Clock lives in its own tidy card on the wall, clear of the window.
    this.buildClock(width * 0.11, 340);

    this.updateWindow();
    this.time.addEvent({
      delay: 15000,
      callback: this.updateWindow,
      callbackScope: this,
      loop: true,
    });
  }

  // A tidy clock card on the wall: a title bar with the (clickable) digital
  // time, an analog dial, and a controls row. Laid out in a padded panel so
  // nothing overlaps. In 'sim' mode −/+ scrub the time and the sky follows;
  // in 'real' mode it tracks the wall clock.
  buildClock(cx, cy) {
    const R = 30;
    const PW = 164;
    const PH = 196;
    this.clockUI = this.add.container(cx, cy).setDepth(DEPTH.ui);

    const panel = this.add
      .rectangle(0, 0, PW, PH, 0xfffaf0, 0.94)
      .setStrokeStyle(4, 0x6d4c41);

    // Digital readout in the header; click to type an exact HH:MM.
    this.clockText = this.add
      .text(0, -PH / 2 + 26, '', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '30px',
        color: '#5c3a4d',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.promptTime());

    // Analog dial, nested so hands pivot cleanly at its own centre.
    const dialY = -6;
    const dial = this.add.container(0, dialY);
    const face = this.add.circle(0, 0, R, 0xfff8e7).setStrokeStyle(4, 0x6d4c41);
    const ticks = this.add.graphics();
    ticks.lineStyle(3, 0x6d4c41, 1);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const sin = Math.sin(a);
      const cos = -Math.cos(a);
      ticks.lineBetween(sin * (R - 7), cos * (R - 7), sin * (R - 3), cos * (R - 3));
    }
    // Hands pivot at the centre (origin bottom) and point up at angle 0.
    this.clockHandH = this.add.rectangle(0, 0, 5, R * 0.5, 0x3a2b2b).setOrigin(0.5, 1);
    this.clockHandM = this.add.rectangle(0, 0, 3, R * 0.78, 0x3a2b2b).setOrigin(0.5, 1);
    const pin = this.add.circle(0, 0, 4, 0x6d4c41);
    dial.add([face, ticks, this.clockHandH, this.clockHandM, pin]);

    const rowY = PH / 2 - 26;
    const btn = (x, label, onClick) =>
      this.add
        .text(x, rowY, label, {
          fontFamily: 'Arial, sans-serif',
          fontSize: '15px',
          color: '#fdf3e3',
          backgroundColor: '#6d4c41',
          padding: { x: 7, y: 4 },
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', onClick);

    this.clockModeBtn = btn(0, '', () => this.toggleClockMode());
    this.clockMinus = btn(-58, '−1h', () => this.stepSim(-60));
    this.clockPlus = btn(58, '+1h', () => this.stepSim(60));

    this.clockUI.add([
      panel,
      this.clockText,
      dial,
      this.clockModeBtn,
      this.clockMinus,
      this.clockPlus,
    ]);
    this.refreshClockControls();
  }

  refreshClockControls() {
    const sim = this.clockMode === 'sim';
    this.clockModeBtn.setText(sim ? '⏱ Custom' : '🕐 Now');
    this.clockMinus.setVisible(sim);
    this.clockPlus.setVisible(sim);
  }

  toggleClockMode() {
    if (this.clockMode === 'real') {
      // Seed the custom time from the current wall clock so it starts here.
      const d = new Date();
      this.simMin = d.getHours() * 60 + d.getMinutes();
      this.clockMode = 'sim';
    } else {
      this.clockMode = 'real';
    }
    this.refreshClockControls();
    this.updateWindow();
    this.saveState();
  }

  stepSim(delta) {
    this.simMin = (this.simMin + delta + 1440) % 1440;
    this.updateWindow();
    this.saveState();
  }

  // Type an exact time; switches to custom mode. Accepts "HH:MM" or "HH".
  promptTime() {
    const { h, m } = this.effectiveTime();
    const cur = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    const input = window.prompt('Enter time (HH:MM)', cur);
    if (input == null) return;
    const match = input.trim().match(/^(\d{1,2})(?::(\d{1,2}))?$/);
    if (!match) return;
    const hh = Math.min(23, parseInt(match[1], 10));
    const mm = Math.min(59, parseInt(match[2] ?? '0', 10));
    this.simMin = hh * 60 + mm;
    this.clockMode = 'sim';
    this.refreshClockControls();
    this.updateWindow();
    this.saveState();
  }

  // Maps a 0–23 hour to a sky look. Night raises stars + a pale moon; day a
  // bright sun; dawn/dusk warm tones with a low sun.
  skyForHour(hour) {
    if (hour < 5 || hour >= 20)
      return { sky: 0x0b1026, sun: 0xf2f0d5, sunY: -0.24, stars: true };
    if (hour < 7) return { sky: 0xf7a072, sun: 0xffb703, sunY: 0.2, stars: false };
    if (hour < 17) return { sky: 0x8ecae6, sun: 0xffd43b, sunY: -0.24, stars: false };
    if (hour < 19) return { sky: 0xf4772e, sun: 0xff8600, sunY: 0.2, stars: false };
    return { sky: 0x3a2b5e, sun: 0xffd9a0, sunY: 0.2, stars: false };
  }

  // The time the window + clock currently show, honouring the chosen mode.
  effectiveTime() {
    if (this.clockMode === 'sim') {
      return { h: Math.floor(this.simMin / 60), m: this.simMin % 60 };
    }
    const d = new Date();
    return { h: d.getHours(), m: d.getMinutes() };
  }

  updateWindow() {
    const { h, m } = this.effectiveTime();
    const look = this.skyForHour(h);
    this.winSky.setFillStyle(look.sky);
    this.winSun.setFillStyle(look.sun);
    this.winSun.y = this.winSky.height * look.sunY;
    this.winStars.forEach((s) => s.setVisible(look.stars));
    // Analog hands: minute = 6°/min, hour = 30°/hr + 0.5°/min.
    this.clockHandM.setAngle(m * 6);
    this.clockHandH.setAngle((h % 12) * 30 + m * 0.5);
    this.clockText.setText(
      `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
    );
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

    // Live eyes, drawn on top of the flat art (positions/colours set per
    // variant in positionFace). Skin patches hide the baked eyes; the dots
    // are the movable eyes (look left/right); the eyelids blink. The mouth is
    // left as the baked face art.
    const p = this.parts;
    p.eyeCoverL = this.add.ellipse(0, 0, 36, 32, SKIN);
    p.eyeCoverR = this.add.ellipse(0, 0, 36, 32, SKIN);
    p.eyeDotL = this.add.circle(0, 0, 10, 0x000000);
    p.eyeDotR = this.add.circle(0, 0, 10, 0x000000);
    p.eyelidL = this.add.ellipse(0, 0, LID_W, LID_H, SKIN).setScale(1, 0);
    p.eyelidR = this.add.ellipse(0, 0, LID_W, LID_H, SKIN).setScale(1, 0);

    this.gaze = { v: 0 }; // current horizontal eye offset

    // Nest the head parts into a neck-pivoted rig so it can nod as one unit.
    const headBody = [p.head, p.face, p.hair];
    headBody.forEach((part) => (part.y -= NECK_PIVOT));
    this.headRig = this.add.container(0, NECK_PIVOT, [
      ...headBody,
      p.eyeCoverL,
      p.eyeCoverR,
      p.eyeDotL,
      p.eyeDotR,
      p.eyelidL,
      p.eyelidR,
    ]);

    this.dollScale = (height * 0.42) / DOLL_SPAN;
    const x = save.doll ? save.doll.x * width : width * 0.22;
    const y = save.doll
      ? save.doll.y * height
      : height * 0.86 - DOLL_FOOT_Y * this.dollScale;

    // Body parts sit flat in the doll; the head rig rides on top (drawn last).
    const body = [
      this.parts.neck,
      this.parts.armL,
      this.parts.armR,
      this.parts.handL,
      this.parts.handR,
      this.parts.legL,
      this.parts.legR,
      this.parts.shoeL,
      this.parts.shoeR,
      this.parts.hip,
      this.parts.torso,
    ];
    this.doll = this.add
      .container(x, y, [...body, this.headRig])
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
      this.positionFace(index);
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

    // Quick springy pop on the whole doll when the outfit changes.
    this.tweens.add({
      targets: this.doll,
      scale: { from: this.dollScale * 1.04, to: this.dollScale },
      duration: 160,
      ease: 'Back.Out',
    });
  }

  // Lay out the live-face overlays for the current face variant. Coordinates
  // in FACES are doll-space; the overlays live in the neck-pivoted head rig,
  // so shift every y by -NECK_PIVOT. Keeps eyelid scaleY as-is so a blink in
  // progress isn't reset by an outfit change.
  positionFace(index) {
    const f = FACES[index] ?? FACES[0];
    const p = this.parts;
    const ry = (y) => y - NECK_PIVOT;
    this.faceLayout = f;

    p.eyeCoverL.setPosition(f.lx, ry(f.ey));
    p.eyeCoverR.setPosition(f.rx, ry(f.ey));
    [p.eyeDotL, p.eyeDotR].forEach((d) => {
      d.setRadius(f.er).setFillStyle(f.ecol);
      d.y = ry(f.ey);
    });
    p.eyelidL.setPosition(f.lx, ry(f.ey));
    p.eyelidR.setPosition(f.rx, ry(f.ey));

    this.applyGaze();
  }

  // Slide both eyes to the current gaze offset (look left/right).
  applyGaze() {
    const f = this.faceLayout;
    if (!f) return;
    this.parts.eyeDotL.x = f.lx + this.gaze.v;
    this.parts.eyeDotR.x = f.rx + this.gaze.v;
  }

  // --- expressions ---

  lookAround() {
    const dir = Phaser.Utils.Array.GetRandom([-1, -0.5, 0.5, 1, 0]);
    this.tweens.add({
      targets: this.gaze,
      v: dir * GAZE_MAX,
      duration: 260,
      ease: 'Sine.InOut',
      hold: Phaser.Math.Between(500, 1400),
      yoyo: true, // glance, then return to centre
      onUpdate: () => this.applyGaze(),
    });
  }

  scheduleLook() {
    this.time.delayedCall(Phaser.Math.Between(3000, 7000), () => {
      this.lookAround();
      this.scheduleLook();
    });
  }

  // Idle life, built to read as breathing without disturbing the doll's
  // saved position/scale (which drag + persistence own). The legs/hips stay
  // planted; only the upper body is animated, so the doll never looks like
  // it's tipping over:
  //   - upper body floats up/down a few px (breath), synced with...
  //   - a chest rise/fall on the torso (local scaleY)
  //   - a slow head nod on the neck-pivoted rig, on its own rhythm
  //   - eyes that blink on their own eyelids at random intervals
  startIdle() {
    const upper = [
      this.parts.torso,
      this.parts.neck,
      this.parts.armL,
      this.parts.armR,
      this.parts.handL,
      this.parts.handR,
      this.headRig,
    ];
    this.tweens.add({
      targets: upper,
      y: '-=11',
      duration: 2300,
      ease: 'Sine.InOut',
      yoyo: true,
      repeat: -1,
    });
    this.tweens.add({
      targets: [this.parts.torso, this.parts.neck],
      scaleY: 1.06,
      duration: 2300,
      ease: 'Sine.InOut',
      yoyo: true,
      repeat: -1,
    });
    this.headRig.angle = -3;
    this.tweens.add({
      targets: this.headRig,
      angle: 3,
      duration: 4200,
      ease: 'Sine.InOut',
      yoyo: true,
      repeat: -1,
    });
    this.scheduleBlink();
    this.scheduleLook();
  }

  scheduleBlink() {
    this.time.delayedCall(Phaser.Math.Between(2500, 6000), () => {
      this.blink();
      // ~1 in 4 blinks is a quick double blink.
      if (Phaser.Math.Between(0, 3) === 0) {
        this.time.delayedCall(220, () => this.blink());
      }
      this.scheduleBlink();
    });
  }

  blink() {
    this.tweens.add({
      targets: [this.parts.eyelidL, this.parts.eyelidR],
      scaleY: { from: 0, to: 1 },
      duration: 90,
      hold: 40,
      yoyo: true,
      ease: 'Sine.InOut',
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
