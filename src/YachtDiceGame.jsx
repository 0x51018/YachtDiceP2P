import Phaser from 'phaser';

export class YachtDiceGame extends Phaser.Scene {
  constructor(connection, peerId, isFirstPlayer = false) {
    super({ key: 'YachtDiceGame' });
    this.connection = connection;
    this.peerId = peerId;
    this.isFirstPlayer = isFirstPlayer;
    this.rollCount = 0;
    this.dice = [];
    this.holdDice = [];
    this.holdDiceSprites = [];
    this.scores = {
      player1: { ones: null, twos: null, threes: null, fours: null, fives: null, sixes: null, chance: null, threeOfAKind: null, fourOfAKind: null, fullHouse: null, smallStraight: null, largeStraight: null, yacht: null },
      player2: { ones: null, twos: null, threes: null, fours: null, fives: null, sixes: null, chance: null, threeOfAKind: null, fourOfAKind: null, fullHouse: null, smallStraight: null, largeStraight: null, yacht: null }
    };
    this.rollDiceSprites = [];
    this.isMyTurn = isFirstPlayer;
    this.setupConnectionListeners();
  }

  preload() {
    for (let i = 1; i <= 6; i++) this.load.image(`dice${i}`, `dice${i}.png`);
    this.load.image('rollButton', 'rollButton.png');
    this.load.image('diceLeft', 'diceLeft.png');
    this.load.image('diceSpace', 'diceSpace.png');
  }

  create() {
    this.createBackground();
    this.createDice();
    this.createRollButton();
    this.createScoreTable();
    this.createRollCountIndicators();
    this.updateTurnState();
  }

  setupConnectionListeners() {
    if (this.connection) {
      this.connection.on('data', data => data.type === 'action' && this.handleRemoteAction(data.action));
    }
  }

  createBackground() {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x002055, 1).fillRect(0, 0, this.scale.width, this.scale.height);
    this.colorSection(graphics, 18, 13, 837, 672, 0x000000);
    this.colorSection(graphics, 30, 25, 835, 670, 0x939393);
    this.colorSection(graphics, 30, 25, 825, 660, 0x2e2e2e);
    this.colorSection(graphics, 60, 235, 765, 240, 0x000000);
    this.colorSection(graphics, 60 + 7, 235 + 6, 765 - 14, 240 - 12, 0xcdddff);
    this.colorSection(graphics, 927-28-20, 85, 296+28+63, 490 + 68, 0xffffff);
    this.colorSection(graphics, 933-28-20, 91, 284+28+63, 478 + 68, 0x000000);
    for (let i = 0; i < 16; i++) {
      let betx = 935 + 190;
      this.colorSection(graphics, 935-28-20, 93 + i * 34, betx - 935 - 1, 32, 0xf1edeb);
      if (i == 6 || i == 7 || i == 15) this.colorSection(graphics, 935-28-20, 93 + i * 34, betx - 935 - 1, 32, 0xcddbf7);
      this.colorSection(graphics, betx + 1-28-20, 93 + i * 34, 935 + 280 - betx - 1, 32, 0xf1edeb);
      this.colorSection(graphics, betx + 1-28+91-20, 93 + i * 34, 935 + 280 - betx - 1, 32, 0xf1edeb);
    }
    for (let i = 0; i < 5; i++) this.add.image(498 + (i - 2) * 150, 190, 'diceSpace').setScale(1);
  }

  colorSection(graphics, x, y, width, height, color) {
    graphics.fillStyle(color, 1).fillRect(x, y, width, height);
  }

  createDice() {
    for (let i = 0; i < 5; i++) {
      const x = 142 + i * 150;
      const y = 135;
      const dice = this.add.image(x, y, `dice1`).setScale(0.5).setVisible(false).setInteractive();
      dice.on('pointerdown', () => this.releaseDiceHandler(i));
      this.holdDiceSprites.push(dice);
    }

    for (let i = 0; i < 5; i++) {
      const x = 450 + (i - 2) * 130;
      const y = 357;
      const diceValue = Phaser.Math.Between(1, 6);
      const dice = this.add.image(x, y, `dice${diceValue}`).setScale(0.5).setVisible(false).setInteractive();
      dice.on('pointerdown', () => this.holdDiceHandler(i));
      this.dice.push(dice);
    }
  }

  createRollCountIndicators() {
    for (let i = 0; i < 3; i++) this.rollDiceSprites.push(this.add.image(390 + i * 50, 670, 'diceLeft').setScale(1));
    this.updateRollCountIndicators();
  }

  createRollButton() {
    this.rollButton = this.add.image(440, 560, 'rollButton').setScale(0.5).setInteractive();
    this.rollButton.on('pointerdown', this.rollDiceHandler, this);
  }

  createScoreTable() {
    const categories = [
      { key: 'ones', text: 'Ones' }, { key: 'twos', text: 'Twos' }, { key: 'threes', text: 'Threes' }, { key: 'fours', text: 'Fours' },
      { key: 'fives', text: 'Fives' }, { key: 'sixes', text: 'Sixes' }, { key: 'chance', text: 'Chance' }, { key: 'threeOfAKind', text: 'Three of Kind' },
      { key: 'fourOfAKind', text: 'Four of Kind' }, { key: 'fullHouse', text: 'Full House' }, { key: 'smallStraight', text: 'Small Straight' },
      { key: 'largeStraight', text: 'Large Straight' }, { key: 'yacht', text: 'Yacht' }
    ];

    this.scoreTexts = { player1: {}, player2: {} };
    
    categories.forEach((category, index) => {
      const y = 110 + index * 34 + (index > 5 ? 68 : 0);
      this.add.text(1000-20, y, category.text, { fontSize: '20px', fill: '#000', fontStyle: 'bold' }).setOrigin(0.5, 0.5);

      const score1Bg = this.add.rectangle(935+280-45-48, y-1, 89, 32, 0xf1edeb).setOrigin(0.5, 0.5).setInteractive();
      const score2Bg = this.add.rectangle(935+280-45-48+91, y-1, 89, 32, 0xf1edeb).setOrigin(0.5, 0.5).setInteractive();
      score1Bg.on('pointerout', () => score1Bg.setFillStyle(0xf1edeb));
      score2Bg.on('pointerout', () => score2Bg.setFillStyle(0xf1edeb));

      this.scoreTexts.player1[category.key] = this.add.text(1142-20, y, '-', { fontSize: '20px', fill: '#000', fontStyle: 'bold' }).setOrigin(0.5, 0.5).setInteractive();
      this.scoreTexts.player2[category.key] = this.add.text(1232-20, y, '-', { fontSize: '20px', fill: '#000', fontStyle: 'bold' }).setOrigin(0.5, 0.5).setInteractive();
      
      if(this.isFirstPlayer){
        score1Bg.on('pointerdown', () => this.confirmScore(category.key));
        score1Bg.on('pointerover', () => score1Bg.setFillStyle(0xffddeb));
        this.scoreTexts.player1[category.key].on('pointerdown', () => this.confirmScore(category.key));
        this.scoreTexts.player1[category.key].on('pointerover', () => score1Bg.setFillStyle(0xffddeb));
        this.scoreTexts.player1[category.key].on('pointerout', () => score1Bg.setFillStyle(0xf1edeb));
      }
      if(!this.isFirstPlayer){
        score2Bg.on('pointerdown', () => this.confirmScore(category.key));
        score2Bg.on('pointerover', () => score2Bg.setFillStyle(0xffddeb));
        this.scoreTexts.player2[category.key].on('pointerdown', () => this.confirmScore(category.key));
        this.scoreTexts.player2[category.key].on('pointerover', () => score2Bg.setFillStyle(0xffddeb));
        this.scoreTexts.player2[category.key].on('pointerout', () => score2Bg.setFillStyle(0xf1edeb));
      } 
    });

    this.sumText = {
      player1: this.add.text(1142-20, 110 + 34 * 6, '0', { fontSize: '20px', fill: '#000', fontStyle: 'bold' }).setOrigin(0.5, 0.5),
      player2: this.add.text(1232-20, 110 + 34 * 6, '0', { fontSize: '20px', fill: '#000', fontStyle: 'bold' }).setOrigin(0.5, 0.5)
    };
    this.bonusText = {
      player1: this.add.text(1142-20, 110 + 34 * 7, '0', { fontSize: '20px', fill: '#000', fontStyle: 'bold' }).setOrigin(0.5, 0.5),
      player2: this.add.text(1232-20, 110 + 34 * 7, '0', { fontSize: '20px', fill: '#000', fontStyle: 'bold' }).setOrigin(0.5, 0.5)
    };
    this.totalText = {
      player1: this.add.text(1142-20, 110 + 34 * 15, '0', { fontSize: '20px', fill: '#000', fontStyle: 'bold' }).setOrigin(0.5, 0.5),
      player2: this.add.text(1232-20, 110 + 34 * 15, '0', { fontSize: '20px', fill: '#000', fontStyle: 'bold' }).setOrigin(0.5, 0.5)
    };

    this.add.text(1000-20, 110 + 34 * 6, 'Sum', { fontSize: '20px', fill: '#000', fontStyle: 'bold' }).setOrigin(0.5, 0.5);
    this.add.text(1000-20, 110 + 34 * 7, 'Bonus', { fontSize: '20px', fill: '#000', fontStyle: 'bold' }).setOrigin(0.5, 0.5);
    this.add.text(1000-20, 110 + 34 * 15, 'Total', { fontSize: '20px', fill: '#000', fontStyle: 'bold' }).setOrigin(0.5, 0.5);
  }

  updateRollCountIndicators() {
    this.rollDiceSprites.forEach((sprite, index) => index < this.rollCount ? sprite.setTint(0x888888) : sprite.clearTint());
  }

  holdDiceHandler(index) {
    if (!this.isMyTurn) return;
    this.updateHoldDiceState(index);
    this.sendAction({ type: 'hold', index });
  }

  releaseDiceHandler(index) {
    if (!this.isMyTurn) return;
    this.updateReleaseDiceState(index);
    this.sendAction({ type: 'release', index });
  }

  rollDiceHandler = () => {
    if (!this.isMyTurn || this.rollCount >= 3) return;
    this.rollCount += 1;
    this.dice.forEach((dice, index) => {
      if (!this.holdDice.includes(index)) {
        dice.setVisible(true);
        this.animateDiceRoll(dice, index);
      }
    });

    this.time.delayedCall(300, () => {
      this.dice.forEach((dice, index) => {
        if (!this.holdDice.includes(index)) dice.setTexture(`dice${Phaser.Math.Between(1, 6)}`);
      });

      if (this.rollCount === 3) this.rollButton.setInteractive(false).setTint(0x888888);

      this.updateRollCountIndicators();
      this.updatePossibleScores();
      this.sendAction({
        type: 'roll',
        rollCount: this.rollCount,
        diceValues: this.dice.map(dice => dice.texture.key),
        holdDice: this.holdDice
      });
    });
  }

  animateDiceRoll(dice, index) {
    const rollAnimation = this.time.addEvent({
      delay: 30,
      repeat: 9,
      callback: () => dice.setTexture(`dice${Phaser.Math.Between(1, 6)}`),
      callbackScope: this,
    });

    this.time.delayedCall(rollAnimation.delay * (rollAnimation.repeat + 1), () => rollAnimation.remove(false));
  }

  updatePossibleScores() {
    const diceValues = this.dice.map((dice) => parseInt(dice.texture.key.replace('dice', ''), 10));
    const categories = this.getScoreCategories(diceValues);
    const currentPlayerKey = this.isMyTurn ? (this.isFirstPlayer ? 'player1' : 'player2') : (this.isFirstPlayer ? 'player2' : 'player1');

    Object.keys(categories).forEach((category) => {
      if (this.scores[currentPlayerKey][category] === null) {
        this.scoreTexts[currentPlayerKey][category].setText(categories[category]).setStyle({ fill: '#ff0000' });
      }
    });
  }

  confirmScore(category) {
    if (!this.isMyTurn) return;
    const diceValues = this.dice.map((dice) => parseInt(dice.texture.key.replace('dice', ''), 10));
    const categories = this.getScoreCategories(diceValues);
    const score = categories[category];
    const currentPlayerKey = this.isFirstPlayer ? 'player1' : 'player2';

    if (this.scores[currentPlayerKey][category] === null) {
      this.scores[currentPlayerKey][category] = score;
      this.scoreTexts[currentPlayerKey][category].setText(score).setStyle({ fill: '#000' });
      this.updateSumBonusTotal();
      this.sendAction({ type: 'confirm', category, score });
      this.endTurn();
    }
    this.resetRound();
  }

  updateSumBonusTotal() {
    const player1Key = 'player1';
    const player2Key = 'player2';
  
    const upperSectionKeys = ['ones', 'twos', 'threes', 'fours', 'fives', 'sixes'];
  
    const calculateSumBonusTotal = (playerKey) => {
      const upperSectionSum = upperSectionKeys.reduce((sum, key) => sum + (this.scores[playerKey][key] || 0), 0);
      const bonus = upperSectionSum >= 63 ? 35 : 0;
      const total = Object.values(this.scores[playerKey]).reduce((total, val) => total + (val || 0), 0) + bonus;
  
      this.sumText[playerKey].setText(upperSectionSum);
      this.bonusText[playerKey].setText(bonus);
      this.totalText[playerKey].setText(total);
    };
  
    calculateSumBonusTotal(player1Key);
    calculateSumBonusTotal(player2Key);
  }
  

  resetOpponentScores() {
    const opponentKey = this.isFirstPlayer ? 'player2' : 'player1';
    Object.keys(this.scores[opponentKey]).forEach((category) => {
      if (this.scores[opponentKey][category] === null) this.scoreTexts[opponentKey][category].setText('-').setStyle({ fill: '#fff' });
    });
  }

  resetRound() {
    this.rollCount = 0;
    this.holdDice = [];
    this.dice.forEach((dice) => dice.clearTint().setVisible(false));
    this.holdDiceSprites.forEach((sprite) => sprite.setVisible(false));
    if (this.isMyTurn) this.rollButton.setInteractive(true).clearTint();

    Object.keys(this.scoreTexts[this.isFirstPlayer ? 'player1' : 'player2']).forEach((category) => {
      if (this.scores[this.isFirstPlayer ? 'player1' : 'player2'][category] === null) {
        this.scoreTexts[this.isFirstPlayer ? 'player1' : 'player2'][category].setText('-').setStyle({ fill: '#fff' });
      }
    });

    this.updateRollCountIndicators();
  }

  getScoreCategories(diceValues) {
    const counts = {};
    diceValues.forEach((value) => counts[value] = (counts[value] || 0) + 1);

    const categories = {
      ones: counts[1] ? counts[1] * 1 : 0, twos: counts[2] ? counts[2] * 2 : 0, threes: counts[3] ? counts[3] * 3 : 0,
      fours: counts[4] ? counts[4] * 4 : 0, fives: counts[5] ? counts[5] * 5 : 0, sixes: counts[6] ? counts[6] * 6 : 0,
      chance: diceValues.reduce((a, b) => a + b, 0),
      threeOfAKind: Object.values(counts).some((count) => count >= 3) ? diceValues.reduce((a, b) => a + b, 0) : 0,
      fourOfAKind: Object.values(counts).some((count) => count >= 4) ? diceValues.reduce((a, b) => a + b, 0) : 0,
      fullHouse: Object.values(counts).includes(3) && Object.values(counts).includes(2) ? 25 : 0,
      smallStraight: new Set(diceValues).size >= 4 && this.isSmallStraight(diceValues) ? 30 : 0,
      largeStraight: new Set(diceValues).size === 5 && this.isLargeStraight(diceValues) ? 40 : 0,
      yacht: Object.values(counts).some((count) => count === 5) ? 50 : 0,
    };

    return categories;
  }

  isSmallStraight(diceValues) {
    let straights = [ [1, 2, 3, 4], [2, 3, 4, 5], [3, 4, 5, 6] ];
    return straights.some((straight) => straight.every((val) => diceValues.includes(val)));
  }

  isLargeStraight(diceValues) {
    let straights = [ [1, 2, 3, 4, 5], [2, 3, 4, 5, 6] ];
    return straights.some((straight) => straight.every((val) => diceValues.includes(val)));
  }

  updateTurnState() {
    this.isMyTurn ? (this.resetOpponentScores(), this.rollButton.setInteractive(true).clearTint()) : this.rollButton.setInteractive(false).setTint(0x888888);
  }

  endTurn() {
    this.isMyTurn = false;
    this.updateTurnState();
    this.sendAction({ type: 'turn', isMyTurn: true });
  }

  handleRemoteAction(action) {
    if (action.type === 'turn' && this.isMyTurn !== action.isMyTurn) { 
        this.isMyTurn = action.isMyTurn;
        this.updateTurnState();
    } else {
        switch (action.type) {
            case 'hold': this.updateHoldDiceState(action.index); break;
            case 'release': this.updateReleaseDiceState(action.index); break;
            case 'roll': this.updateRollState(action); break;
            case 'confirm': this.updateOpponentScore(action); break;
            default: break;
        }
    }
  }

  updateHoldDiceState(index) {
    const dice = this.dice[index];
    if (!this.holdDice.includes(index)) {
      this.holdDice.push(index);
      this.tweens.add({
        targets: dice,
        x: this.holdDiceSprites[index].x,
        y: this.holdDiceSprites[index].y,
        duration: 240,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          dice.x = 450 + (index - 2) * 130;
          dice.y = 357;
          dice.setVisible(false);
          this.holdDiceSprites[index].setTexture(dice.texture.key).setVisible(true);
        },
      });
    }
  }

  updateReleaseDiceState(index) {
    const dice = this.dice[index];
    const holdSprite = this.holdDiceSprites[index];
    if (this.holdDice.includes(index)) {
      this.holdDice = this.holdDice.filter((d) => d !== index);
      this.tweens.add({
        targets: holdSprite,
        x: dice.x,
        y: dice.y,
        duration: 240,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          holdSprite.x = 142 + index * 150;
          holdSprite.y = 135;
          dice.setVisible(true);
          holdSprite.setVisible(false);
        },
      });
    }
  }

  updateRollState(action) {
    this.rollCount = action.rollCount;
    this.holdDice = action.holdDice;
    action.diceValues.forEach((diceValue, index) => {
      this.dice[index].setTexture(diceValue).setVisible(!this.holdDice.includes(index));
      this.holdDice.includes(index)
        ? this.holdDiceSprites[index].setTexture(diceValue).setVisible(true)
        : this.holdDiceSprites[index].setVisible(false);
    });
    this.updateRollCountIndicators();
    this.updatePossibleScores();
  }

  updateOpponentScore(action) {
    const opponentKey = this.isFirstPlayer ? 'player2' : 'player1';
    this.scores[opponentKey][action.category] = action.score;
    this.scoreTexts[opponentKey][action.category].setText(action.score).setStyle({ fill: '#000' });
    this.updateSumBonusTotal();
    setTimeout(() => this.resetRound(), 500);
  }

  sendAction(action) {
    if (this.connection) this.connection.send({ type: 'action', action });
  }
}
