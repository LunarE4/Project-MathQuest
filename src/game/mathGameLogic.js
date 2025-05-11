import Phaser from 'phaser';

export function initializeMathGame(containerId, onCorrectAnswer) {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent: containerId,
    width: 800,
    height: 600,
    scene: {
      preload() {
        this.load.image('background', 'assets/game-bg.png');
      },
      create() {
        // Background
        this.add.image(400, 300, 'background');
        
        // Problem text
        const problem = this.add.text(400, 200, "5 + 3 = ?", { 
          fontSize: '48px', 
          fill: '#FFFFFF',
          fontFamily: 'Arial'
        }).setOrigin(0.5);
        
        // Answer buttons
        const answers = [6, 8, 10];
        answers.forEach((ans, i) => {
          const btn = this.add.rectangle(300 + (i * 200), 400, 150, 80, 0x4CAF50)
            .setInteractive()
            .on('pointerdown', () => {
              if (ans === 8) { // Correct answer
                onCorrectAnswer(); // Callback to update XP
                this.add.text(400, 500, "+10 XP!", { 
                  fontSize: '32px', 
                  fill: '#FFD700' 
                }).setOrigin(0.5);
              }
            });
          
          this.add.text(btn.x, btn.y, ans, { 
            fontSize: '32px', 
            fill: '#FFFFFF' 
          }).setOrigin(0.5);
        });
      }
    }
  });
}