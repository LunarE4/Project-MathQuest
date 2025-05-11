import { MathScene, RewardScene } from './scenes';

export const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 800,
  height: 600,
  scene: [MathScene, RewardScene],
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 0 } }
  }
};