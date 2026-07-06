import Phaser from 'phaser';
import DressUpScene from './scenes/DressUpScene.js';
import RoomScene from './scenes/RoomScene.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#fdf1f5',
  scale: {
    mode: Phaser.Scale.EXPAND,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1920,
    height: 1080,
  },
  scene: [DressUpScene, RoomScene],
};

new Phaser.Game(config);
