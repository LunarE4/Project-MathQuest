import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Phaser from 'phaser';
import './GameWindow.css';
import { doc, updateDoc, increment as firestoreIncrement, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase/init';
import { ACHIEVEMENTS } from './achievements';

export default function GameWindow() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const gameContainer = useRef(null);
  const gameInstance = useRef(null);
  const reactEvents = useRef(new Phaser.Events.EventEmitter());
  const [loading, setLoading] = useState(true);
  const [lessonData, setLessonData] = useState(null);
  const [userProgress, setUserProgress] = useState({});

  const increment = (value) => firestoreIncrement(value);

  useEffect(() => {
    if (state?.lessonData) {
      setLessonData(state.lessonData);
      setUserProgress(state.userProgress || {});
      setLoading(false);
      sessionStorage.setItem('currentLesson', JSON.stringify(state.lessonData));
    } else {
      const savedLesson = sessionStorage.getItem('currentLesson');
      if (savedLesson) {
        setLessonData(JSON.parse(savedLesson));
        setLoading(false);
      } else {
        navigate('/dashboard');
      }
    }
  }, [state, navigate]);

  const updateUserProgress = async (updates) => {
    if (!user?.uid) {
      console.error("No user UID available");
      return;
    }

    try {
      const userRef = doc(db, 'users', user.uid);
      console.log("Attempting to update user doc:", user.uid, "with:", updates);
      await updateDoc(userRef, updates);
      console.log("Update successful");
      return true;
    } catch (error) {
      console.error("Firestore update error:", error);
      throw error;
    }
  };

  const handleLessonCompleted = async (results) => {
    if (!user || !lessonData) {
      console.error("User or lesson data missing");
      navigate('/dashboard');
      return;
    }
  
    try {
      const updates = {
        xp: firestoreIncrement(results.xpEarned),
        [`completedLessons.${lessonData.id}`]: {
          lessonId: lessonData.id,
          lessonTitle: lessonData.title,
          topic: lessonData.topic || 'general', // Make sure topic is included
          finalScore: results.finalScore,
          completedAt: serverTimestamp(),
          timeTaken: results.timeTaken,
          xpEarned: results.xpEarned,
          attempts: Object.values(results.attemptsPerProblem).reduce((a, b) => a + b, 0),
          achievements: results.lessonStats.achievements || []
        },
        lastActive: serverTimestamp()
      };
  
      // Add achievement updates
      results.lessonStats.achievements?.forEach(achId => {
        updates[`achievements.${achId}`] = {
          unlocked: true,
          date: serverTimestamp(),
          lessonId: lessonData.id,
          xpEarned: ACHIEVEMENTS[achId]?.xpReward || 0
        };
      });

      await updateUserProgress(updates);
  
      // Navigate with completion data
      navigate('/dashboard', {
        state: {
          lessonCompleted: true,
          lessonData: {
            id: lessonData.id,
            title: lessonData.title,
            topic: lessonData.topic,
            finalScore: results.finalScore,
            xpEarned: results.xpEarned
          },
          achievements: results.lessonStats.achievements?.map(achId => ({
            ...ACHIEVEMENTS[achId],
            unlocked: true
          })) || []
        }
      });
    } catch (error) {
      console.error("Progress update failed:", error);
    }
  };

  useEffect(() => {
    const handleCorrectAnswer = ({ problemIndex }) => {
      reactEvents.current.emit('xpEarned', {
        amount: Math.ceil(lessonData.xpReward / lessonData.problems.length)
      });
    };

    reactEvents.current.on('correctAnswer', handleCorrectAnswer);

    return () => {
      reactEvents.current.off('correctAnswer', handleCorrectAnswer);
    };
  }, [lessonData]);

  useEffect(() => {
    if (!lessonData || !gameContainer.current) return;

    const config = {
      type: Phaser.AUTO,
      parent: gameContainer.current,
      width: window.innerWidth,
      height: window.innerHeight,
      navigate: navigate,
      scene: [new LessonGameScene({
        lessonData,
        userProgress,
        reactEvents: reactEvents.current,
        onComplete: handleLessonCompleted,
        userId: user?.uid
      })],
      physics: {
        default: 'arcade',
        arcade: { gravity: { y: 0 } }
      },
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: '100%',
        height: '100%'
      }
    };

    gameInstance.current = new Phaser.Game(config);

    return () => {
      if (gameInstance.current) {
        gameInstance.current.destroy(true);
        gameInstance.current = null;
      }
      sessionStorage.removeItem('currentLesson');
    };
  }, [lessonData, userProgress]);

  if (loading) {
    return (
      <div className="loading-screen cosmic">
        <div className="cosmic-spinner"></div>
        <p>Warping to lesson space...</p>
      </div>
    );
  }

  return (
    <div className="game-container cosmic-theme">
      <div ref={gameContainer} className="game-canvas"></div>
      <div className="game-ui-overlay">
        <button 
          className="cosmic-button exit-button"
          onClick={() => navigate('/dashboard')}
        >
          <span className="button-icon">◄</span> Exit Warp
        </button>
        <div className="xp-counter">
          <span className="xp-icon">✦</span>
          <span className="xp-amount">
            +{Math.ceil(lessonData.xpReward / lessonData.problems.length)} XP per problem
          </span>
        </div>
      </div>
    </div>
  );
}

class LessonGameScene extends Phaser.Scene {
  constructor(config) {
    super({ key: 'LessonGameScene' });
    this.config = config;
    this.lesson = config.lessonData;
    this.userProgress = config.userProgress || {};
    this.reactEvents = config.reactEvents;
    this.onComplete = config.onComplete;
    this.userId = config.userId;
    this.currentProblemIndex = 0;
    this.correctAnswers = 0;
    this.problemElements = [];
    this.currentScore = 100;
    this.scoreDeduction = 10;
    this.minimumScore = 0;
    this.attemptsPerProblem = {};
    this.startTime = 0;
    this.unlockedAchievements = []; // Track achievements during lesson
  }

  preload() {
    // Empty -> No images used
  }

  create() {
    // Clear any default background
    this.cameras.main.setBackgroundColor('#00000000'); // Transparent
    
    // Create a container for all background elements at depth -1000
    this.cosmicBg = this.add.container(0, 0).setDepth(-1000);
    
    // 1. Create dark space background
    const space = this.add.rectangle(
        0, 0, 
        this.scale.width, this.scale.height, 
        0x0a0a2a
    ).setOrigin(0, 0);
    this.cosmicBg.add(space);
    
    // 2. Add radial gradient effect
    const gradient = this.add.graphics();
    gradient.fillGradientStyle(
        0x1a1a4a, 0x1a1a4a,  // Top color
        0x000000, 0x000000,  // Bottom color
        1, 1,                // Alpha values
        0, 0,                // X/Y of first point
        0, this.scale.height // X/Y of second point
    );
    gradient.fillRect(0, 0, this.scale.width, this.scale.height);
    this.cosmicBg.add(gradient);
    
    // 3. Add cosmic elements
    this.createNebula();
    this.createStarfield();
    
    // 4. Make sure our UI is on top
    this.createUI();
  }

  createUI() {
    this.startTime = Date.now();
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    this.add.text(centerX, centerY - 500, this.lesson.title, {
        fontSize: '36px',
        fill: '#FFFFFF',
        fontFamily: '"Poppins", sans-serif',
        backgroundColor: '#00000066',
        padding: { x: 20, y: 10 },
        stroke: '#4a4a5a',
        strokeThickness: 2
    }).setOrigin(0.5);

    this.problemCounter = this.add.text(30, 30, 
        `Problem ${this.currentProblemIndex + 1}/${this.lesson.problems.length}`, 
        {
            fontSize: '24px',
            fill: '#FFFFFF',
            fontFamily: '"Poppins", sans-serif'
        }
    );

    this.scoreText = this.add.text(
        30, 
        this.problemCounter.y + this.problemCounter.height + 10, 
        `Score: ${this.currentScore}%`,
        {
            fontSize: '24px',
            fill: this.getScoreColor(this.currentScore),
            fontFamily: '"Poppins", sans-serif',
            stroke: '#e0e0e8',
            strokeThickness: 2
        }
    );  

    this.displayCurrentProblem();
  }

  createNebula() {
    const colors = [0x4a148c, 0x311b92, 0x1a237e, 0x0d47a1, 0x01579b];
    
    for (let i = 0; i < 8; i++) {
        const x = Phaser.Math.Between(-100, this.scale.width + 100);
        const y = Phaser.Math.Between(-100, this.scale.height + 100);
        const radius = Phaser.Math.Between(100, 300);
        const color = Phaser.Math.RND.pick(colors);
        const alpha = Phaser.Math.FloatBetween(0.1, 0.25);
        
        const nebula = this.add.circle(x, y, radius, color, alpha)
            .setBlendMode(Phaser.BlendModes.ADD)
            .setDepth(-999);  // Just above background
            
        this.tweens.add({
            targets: nebula,
            x: x + Phaser.Math.Between(-100, 100),
            y: y + Phaser.Math.Between(-50, 50),
            radius: radius * Phaser.Math.FloatBetween(0.8, 1.2),
            alpha: alpha * Phaser.Math.FloatBetween(0.8, 1.2),
            duration: Phaser.Math.Between(8000, 15000),
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }
  }

  createStarfield() {
    for (let i = 0; i < 150; i++) {
        const x = Phaser.Math.Between(0, this.scale.width);
        const y = Phaser.Math.Between(0, this.scale.height);
        const size = Phaser.Math.FloatBetween(0.5, 2);
        const alpha = Phaser.Math.FloatBetween(0.5, 1);
        
        const star = this.add.circle(x, y, size, 0xffffff, alpha)
            .setBlendMode(Phaser.BlendModes.ADD)
            .setDepth(-500);  // Above nebulas but below UI
            
        this.tweens.add({
            targets: star,
            alpha: { from: alpha * 0.3, to: alpha },
            scale: { from: size * 0.5, to: size * 1.5 },
            duration: Phaser.Math.Between(2000, 5000),
            yoyo: true,
            repeat: -1,
            delay: Phaser.Math.Between(0, 3000)
        });
    }
    
    // Shooting stars
    this.time.addEvent({
        delay: 5000,
        callback: this.createShootingStar,
        callbackScope: this,
        loop: true
    });
  }

  createShootingStar() {
    const startX = Phaser.Math.Between(0, this.scale.width);
    const startY = Phaser.Math.Between(0, this.scale.height/3);
    const endX = startX + Phaser.Math.Between(150, 400);
    const endY = startY + Phaser.Math.Between(100, 200);
    
    const star = this.add.circle(startX, startY, 1.5, 0xffffff, 1)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(-400);
    
    const tail = this.add.graphics();
    
    this.tweens.add({
        targets: star,
        x: endX,
        y: endY,
        radius: 3,
        alpha: 0,
        duration: 800,
        ease: 'Cubic.easeOut',
        onUpdate: function() {
            tail.clear();
            tail.lineStyle(2, 0xffffff, 0.6);
            tail.lineBetween(startX, startY, star.x, star.y);
            tail.fillStyle(0x5d5dff, 0.2);
            tail.fillCircle(star.x, star.y, 10);
        },
        onComplete: function() {
            tail.destroy();
            star.destroy();
        }
    });
  }

  displayCurrentProblem() {
    this.clearProblemElements();
  
    const problem = this.lesson.problems[this.currentProblemIndex];
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;
  
    this.problemCounter.setText(
      `Problem ${this.currentProblemIndex + 1}/${this.lesson.problems.length}`
    );
  
    this.problemText = this.add.text(centerX, centerY - 360, problem.question, {
      fontSize: '32px',
      fill: '#FFFFFF',
      fontFamily: '"Poppins", sans-serif',
      backgroundColor: '#00000066',
      padding: { x: 20, y: 15 },
      wordWrap: { width: this.scale.width - 100 },
      align: 'center'
    }).setOrigin(0.5);
  
    this.problemElements.push(this.problemText);
    this.createAnswerButtons(problem, centerX, centerY);
  }

  createAnswerButtons(problem, centerX, centerY) {
    this.answerButtons = [];
    const answers = this.getAnswerOptions(problem);
    const buttonWidth = 320;  
    const buttonHeight = 90;   
    const buttonSpacing = 350; 
    const verticalSpacing = 140; 
    const startX = centerX - (buttonSpacing * (answers.length > 2 ? 0.5 : 0));
    const startY = centerY + 60; 
  
    const buttonColors = [
      0xA7C6DA , 
      0xEEFCCE ,  
      0x9EB25D ,  
      0xF5E57A  
    ];
    const buttonAlphas = [0.9, 0.9, 0.9, 0.9];
  
    answers.forEach((answer, index) => {
      const btnX = startX + (index % 2) * buttonSpacing;
      const btnY = startY + Math.floor(index / 2) * verticalSpacing;
      
      const btn = this.add.rectangle(
        btnX, btnY, 
        buttonWidth, buttonHeight, 
        buttonColors[index % buttonColors.length]
      )
        .setAlpha(buttonAlphas[index % buttonAlphas.length])
        .setInteractive({ useHandCursor: true })
        .setStrokeStyle(3, 0xFFFFFF, 1)
        .on('pointerover', () => {
          const color = Phaser.Display.Color.ColorToRGBA(
            buttonColors[index % buttonColors.length]
          );
          const brighter = Phaser.Display.Color.GetColor(
            Math.min(color.r + 30, 255),
            Math.min(color.g + 30, 255),
            Math.min(color.b + 30, 255)
          );
          btn.fillColor = brighter;
          btn.setScale(1.05);
        })
        .on('pointerout', () => {
          btn.fillColor = buttonColors[index % buttonColors.length];
          btn.setScale(1);
        })
        .on('pointerdown', () => this.checkAnswer(answer, problem));
  
      const btnText = this.add.text(btnX, btnY, answer.toString(), {
        fontSize: '28px',
        fontFamily: '"Poppins", sans-serif',
        color: '#FFFFFF',
        stroke: '#000000',
        strokeThickness: 3,
        shadow: {
          offsetX: 2,
          offsetY: 2,
          color: '#000000',
          blur: 2,
          stroke: true
        }
      }).setOrigin(0.5);
  
      this.answerButtons.push(btn);
      this.problemElements.push(btn, btnText);
    });
  }
  
  checkAnswer(selectedAnswer, problem) {
    if (!this.attemptsPerProblem[this.currentProblemIndex]) {
      this.attemptsPerProblem[this.currentProblemIndex] = 0;
    }
    this.attemptsPerProblem[this.currentProblemIndex]++;
    
    this.answerButtons.forEach(btn => btn.disableInteractive());
    
    const { isCorrect, partialCredit } = this.validateAnswer(selectedAnswer, problem.answer);
    
    if (isCorrect) {
      this.handleCorrectAnswer();
    } else if (partialCredit) {
      this.handlePartialCredit(partialCredit);
    } else {
      this.handleIncorrectAnswer();
    }
  }

  validateAnswer(selected, correct) {
    if (typeof correct === 'number' && typeof selected === 'number') {
      const difference = Math.abs(selected - correct);
      const tolerance = correct * 0.1;
      
      if (difference <= tolerance && difference !== 0) {
        return {
          isCorrect: false,
          partialCredit: 5
        };
      }
    }
    
    if (Array.isArray(correct)) {
      return {
        isCorrect: correct.includes(selected),
        partialCredit: 0
      };
    }
    
    return {
      isCorrect: selected == correct,
      partialCredit: 0
    };
  }

  handleCorrectAnswer() {
    this.correctAnswers++;
    this.reactEvents.emit('correctAnswer', {
      problemIndex: this.currentProblemIndex
    });
  
    this.answerButtons.forEach(btn => {
      btn.setFillStyle(0x38a169);
      this.tweens.add({
        targets: btn,
        scale: { from: 1.1, to: 1 },
        duration: 500,
        ease: 'Back.easeOut'
      });
    });
    
    const celebration = this.add.text(
      this.scale.width / 2,
      this.scale.height / 2 - 50,
      '✓ Correct!',
      {
        fontSize: '48px',
        fill: '#38a169',
        fontFamily: '"Poppins", sans-serif'
      }
    ).setOrigin(0.5);
    
    this.problemElements.push(celebration);
  
    this.time.delayedCall(1000, () => {
      celebration.destroy();
      this.currentProblemIndex++;
      if (this.currentProblemIndex < this.lesson.problems.length) {
        this.displayCurrentProblem();
      } else {
        this.completeLesson();
      }
    });
  }

  handlePartialCredit(credit) {
    const deduction = this.scoreDeduction - credit;
    this.currentScore = Math.max(this.minimumScore, this.currentScore - deduction);
    this.updateScoreDisplay();
    
    const centerX = this.scale.width / 2;
    const feedback = this.add.text(
      centerX,
      this.scale.height / 2 - 100,
      `Close! -${deduction}%`,
      {
        fontSize: '32px',
        fill: '#f5b700',
        fontFamily: '"Poppins", sans-serif'
      }
    ).setOrigin(0.5);
    
    this.tweens.add({
      targets: feedback,
      y: feedback.y - 50,
      alpha: 0,
      duration: 1000,
      onComplete: () => feedback.destroy()
    });
    
    this.time.delayedCall(1000, () => {
      this.answerButtons.forEach(btn => btn.setInteractive());
    });
  }

  handleIncorrectAnswer() {
    this.currentScore = Math.max(this.minimumScore, this.currentScore - this.scoreDeduction);
    this.updateScoreDisplay();
    this.showScoreDeduction();
    
    this.cameras.main.shake(100, 0.01);
    this.tweens.add({
      targets: this.answerButtons,
      x: '+=5',
      yoyo: true,
      duration: 100,
      repeat: 2
    });
    
    this.time.delayedCall(1000, () => {
      this.answerButtons.forEach(btn => btn.setInteractive());
    });
  }

  showScoreDeduction() {
    const centerX = this.scale.width / 2;
    const deductionText = this.add.text(
      centerX,
      this.scale.height / 2 - 100,
      `-${this.scoreDeduction}%`,
      {
        fontSize: '32px',
        fill: '#e53e3e',
        fontFamily: '"Poppins", sans-serif'
      }
    ).setOrigin(0.5);
    
    this.tweens.add({
      targets: deductionText,
      y: deductionText.y - 50,
      alpha: 0,
      duration: 1000,
      onComplete: () => deductionText.destroy()
    });
  }

  updateScoreDisplay() {
    this.scoreText.setText(`Score: ${this.currentScore}%`);
    this.scoreText.setFill(this.getScoreColor(this.currentScore));
    
    this.tweens.add({
      targets: this.scoreText,
      scale: { from: 1.2, to: 1 },
      duration: 500,
      ease: 'Back.easeOut'
    });
  }

  checkAchievements() {
    const achievements = [];
    const timeTaken = (Date.now() - this.startTime) / 1000;
    const lessonId = this.lesson.id;
    const topic = this.lesson.topic;
  
    // Perfect Score Achievement (100% score)
    if (this.currentScore === 100) {
      achievements.push('perfectScore');
    }
  
    // First Try Master (all problems correct on first attempt)
    const allFirstTry = Object.values(this.attemptsPerProblem).every(attempt => attempt === 1);
    if (allFirstTry) {
      achievements.push('firstTryMaster');
    }
  
    // Speed Runner (completed under time limit)
    const timeLimit = this.lesson.problems.length * 15; // 15 seconds per problem
    if (timeTaken < timeLimit) {
      achievements.push('speedRunner');
    }
  
    // Topic-specific achievements
    if (topic === 'algebra' && this.currentScore >= 90) {
      achievements.push('algebraProdigy');
    }

    if (topic === 'geometry' && this.currentScore >= 90) {
      achievements.push('geometryProdigy');
    }

    if (topic === 'calculus' && this.currentScore >= 90) {
      achievements.push('calculusProdigy');
    }
  
    // Check for exclusive achievements
    Object.keys(ACHIEVEMENTS).forEach(achId => {
      const ach = ACHIEVEMENTS[achId];
      if (ach.exclusiveTo && ach.exclusiveTo.includes(lessonId)) {
        if (this.currentScore >= 90) { 
          achievements.push(achId);
        }
      }
    });
  
    // Filter out duplicates and achievements not applicable to this lesson
    this.unlockedAchievements = achievements.filter((achId, index, self) => {
      const ach = ACHIEVEMENTS[achId];
      return self.indexOf(achId) === index && // Unique
        (!ach.exclusiveTo || ach.exclusiveTo.includes(lessonId));
    });
  
    return this.unlockedAchievements;
  }

  completeLesson() {
    const finalScore = this.currentScore;
    const timeTaken = (Date.now() - this.startTime) / 1000;
    const achievements = this.checkAchievements();

    // Prepare results for the completion handler
    this.completionResults = {
        finalScore,
        timeTaken,
        xpEarned: Math.floor((finalScore / 100) * this.lesson.xpReward),
        lessonStats: {
            lessonId: this.lesson.id,
            topic: this.lesson.topic,
            completedAt: new Date(),
            timeTaken,
            attemptsPerProblem: this.attemptsPerProblem,
            achievements: this.unlockedAchievements,
            xpEarned: Math.floor((finalScore / 100) * this.lesson.xpReward)
        },
        attemptsPerProblem: this.attemptsPerProblem
    };

    // Show completion screen 
    const baseXP = Math.floor((finalScore / 100) * this.lesson.xpReward);
    const bonusXP = this.unlockedAchievements.reduce((total, achId) => {
        const ach = ACHIEVEMENTS[achId];
        return total + (ach?.xpReward || 0);
    }, 0);
    const totalXP = baseXP + bonusXP;

    const overlay = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 0.7)
        .setOrigin(0)
        .setDepth(100);

    const panel = this.add.container(this.scale.width / 2, this.scale.height / 2)
        .setDepth(110);

    const panelHeight = 400 + (this.unlockedAchievements.length > 0 ? 
        (this.unlockedAchievements.length * 100) + 40 : 0);

    const panelBg = this.add.graphics()
      .fillStyle(0x1a1a2e)
      .fillRoundedRect(-350, -panelHeight/2, 700, panelHeight, 20)
      .lineStyle(4, 0x4CAF50)
      .strokeRoundedRect(-350, -panelHeight/2, 700, panelHeight, 20);
    panel.add(panelBg);

    const title = this.add.text(0, -panelHeight/2 + 50, 'Lesson Complete!', { 
      fontSize: '42px', 
      fill: '#4CAF50',
      fontFamily: 'Poppins',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5);
    panel.add(title);

    const scoreText = this.add.text(0, -panelHeight/2 + 110, `Final Score: ${finalScore}%`, {
      fontSize: '32px',
      fill: this.getScoreColor(finalScore),
      fontFamily: 'Poppins',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5);
    panel.add(scoreText);

    const xpText = this.add.text(0, -panelHeight/2 + 160, `XP Earned: ${baseXP}${bonusXP > 0 ? ` + ${bonusXP} (bonus)` : ''}`, {
      fontSize: '28px', 
      fill: '#FFD700',
      fontFamily: 'Poppins',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5);
    panel.add(xpText);

    if (this.unlockedAchievements.length > 0) { 
      const achievementsTitle = this.add.text(0, -panelHeight/2 + 220, '─ NEW ACHIEVEMENTS ─', {
        fontSize: '24px',
        fill: '#FFFFFF',
        fontFamily: 'Poppins',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      panel.add(achievementsTitle);

      this.unlockedAchievements.forEach((achId, index) => { 
        const ach = ACHIEVEMENTS[achId];
        const yPos = -panelHeight/2 + 280 + (index * 100);
        
        const achievement = this.add.container(0, yPos);
        
        const bg = this.add.graphics()
          .fillStyle(0xFFFFFF, 0.1)
          .fillRoundedRect(-300, -40, 600, 80, 15)
          .lineStyle(2, Phaser.Display.Color.HexStringToColor(ach.color).color)
          .strokeRoundedRect(-300, -40, 600, 80, 15);
        achievement.add(bg);

        const icon = this.add.text(-270, 0, ach.icon, {
          fontSize: '48px',
          fill: ach.color,
          stroke: '#000000',
          strokeThickness: 3
        }).setOrigin(0.5);
        achievement.add(icon);

        const name = this.add.text(-220, -15, ach.name, {
          fontSize: '24px',
          fill: ach.color,
          fontFamily: 'Poppins',
          fontStyle: 'bold'
        }).setOrigin(0, 0.5);
        achievement.add(name);

        const desc = this.add.text(-220, 20, ach.description, {
          fontSize: '18px',
          fill: '#CCCCCC',
          fontFamily: 'Poppins'
        }).setOrigin(0, 0.5);
        achievement.add(desc);

        const xpBadge = this.add.text(250, 0, `+${ach.xpReward} XP`, {
          fontSize: '20px',
          fill: '#FFD700',
          backgroundColor: '#00000066',
          padding: { x: 15, y: 5 }
        }).setOrigin(0.5);
        achievement.add(xpBadge);

        panel.add(achievement);
        achievement.setScale(0);
        this.tweens.add({
          targets: achievement,
          scale: 1,
          duration: 300,
          delay: index * 150,
          ease: 'Back.easeOut'
        });
      });
    }

    const continueBtnY = panelHeight/2 - 70;
    const continueBtn = this.add.graphics()
        .fillStyle(0x4CAF50)
        .fillRoundedRect(-125, continueBtnY - 30, 250, 60, 10)
        .lineStyle(2, 0xFFFFFF)
        .strokeRoundedRect(-125, continueBtnY - 30, 250, 60, 10)
        .setInteractive(
            new Phaser.Geom.Rectangle(-125, continueBtnY - 30, 250, 60),
            Phaser.Geom.Rectangle.Contains
        );
    
    const btnText = this.add.text(0, continueBtnY, 'CONTINUE', {
        fontSize: '24px', 
        fill: '#FFFFFF',
        fontFamily: 'Poppins',
        fontStyle: 'bold'
    }).setOrigin(0.5);

    continueBtn.on('pointerover', () => {
        continueBtn.clear()
            .fillStyle(0x3E8E41)
            .fillRoundedRect(-125, continueBtnY - 30, 250, 60, 10)
            .lineStyle(2, 0xFFFFFF)
            .strokeRoundedRect(-125, continueBtnY - 30, 250, 60, 10);
        btnText.setScale(1.05);
    });

    continueBtn.on('pointerout', () => {
        continueBtn.clear()
            .fillStyle(0x4CAF50)
            .fillRoundedRect(-125, continueBtnY - 30, 250, 60, 10)
            .lineStyle(2, 0xFFFFFF)
            .strokeRoundedRect(-125, continueBtnY - 30, 250, 60, 10);
        btnText.setScale(1);
    });

    // Only call onComplete when the user clicks continue
    continueBtn.on('pointerdown', async () => {
        if (typeof this.config.onComplete === 'function') {
            await this.config.onComplete(this.completionResults);
        }
        this.scene.stop();
    });

    panel.add(continueBtn);
    panel.add(btnText);
    
    panel.setScale(0);
    this.tweens.add({
        targets: panel,
        scale: 1,
        duration: 300,
        ease: 'Back.easeOut'
    });
  }

  getScoreColor(score) {
    if (score >= 80) return '#4CAF50';
    if (score >= 50) return '#FFC107';
    return '#F44336';
  }

  clearProblemElements() {
    this.problemElements.forEach(element => element.destroy());
    this.answerButtons = [];
    this.problemElements = [];
  }

  getAnswerOptions(problem) {
    if (problem.options) return problem.options;
    
    const options = [problem.answer];
    while (options.length < 4) {
      const wrongAnswer = this.generateWrongAnswer(problem.answer);
      if (!options.includes(wrongAnswer)) {
        options.push(wrongAnswer);
      }
    }
    return Phaser.Utils.Array.Shuffle(options);
  }

  generateWrongAnswer(correctAnswer) {
    if (typeof correctAnswer === 'number') {
      return correctAnswer + Phaser.Math.Between(-3, 3);
    }
    return `Incorrect${Phaser.Math.Between(1, 5)}`;
  }
}