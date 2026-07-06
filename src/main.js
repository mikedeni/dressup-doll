import Phaser from 'phaser';
import DressUpScene from './scenes/DressUpScene.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#fdf1f5',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 900,
    height: 640,
  },
  scene: [DressUpScene],
};

new Phaser.Game(config);
