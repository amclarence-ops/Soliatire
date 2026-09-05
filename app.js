const SUITS = ['♥', '♦', '♣', '♠'];
const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

class Solitaire {
  constructor() {
    this.deck = [];
    this.stock = [];
    this.waste = [];
    this.foundations = [[], [], [], []];
    this.tableau = [[], [], [], [], [], [], []];
    this.draggedData = null;

    // Timer variables
    this.timerSeconds = 0;
    this.timerInterval = null;

    this.init();
  }

  init() {
    this.resetState();
    this.buildDeck();
    this.shuffle();
    this.deal();
    this.bindEvents();
    this.startTimer();
    this.render();
  }

  resetState() {
    this.stopTimer();
    this.timerSeconds = 0;
    this.updateTimerDisplay();
    this.deck = [];
    this.stock = [];
    this.waste = [];
    this.foundations = [[], [], [], []];
    this.tableau = [[], [], [], [], [], [], []];
    document.getElementById('win-modal').classList.add('hidden');
  }

  startTimer() {
    this.stopTimer();
    this.timerInterval = setInterval(() => {
      this.timerSeconds++;
      this.updateTimerDisplay();
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  updateTimerDisplay() {
    const mins = String(Math.floor(this.timerSeconds / 60)).padStart(2, '0');
    const secs = String(this.timerSeconds % 60).padStart(2, '0');
    document.getElementById('timer').textContent = `Time: ${mins}:${secs}`;
  }

  buildDeck() {
    this.deck = [];
    for (let suit of SUITS) {
      for (let value of VALUES) {
        const color = (suit === '♥' || suit === '♦') ? 'red' : 'black';
        this.deck.push({ suit, value, color, faceUp: false });
      }
    }
  }

  shuffle() {
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
    }
  }

  deal() {
    for (let i = 0; i < 7; i++) {
      for (let j = i; j < 7; j++) {
        const card = this.deck.pop();
        if (i === j) card.faceUp = true;
        this.tableau[j].push(card);
      }
    }
    this.stock = this.deck;
  }

  // --- RENDERING SYSTEM ---
  render() {
    this.renderStock();
    this.renderWaste();
    this.renderFoundations();
    this.renderTableau();
    this.checkWinCondition();
  }

  renderStock() {
    const stockEl = document.getElementById('stock');
    stockEl.innerHTML = '';
    if (this.stock.length > 0) {
      stockEl.classList.add('card-back');
    } else {
      stockEl.classList.remove('card-back');
    }
  }

  renderWaste() {
    const wasteEl = document.getElementById('waste');
    wasteEl.innerHTML = '';
    if (this.waste.length > 0) {
      const topCard = this.waste[this.waste.length - 1];
      const cardEl = this.createCardElement(topCard, 'waste', 0, this.waste.length - 1);
      wasteEl.appendChild(cardEl);
    }
  }

  renderFoundations() {
    const fElements = document.querySelectorAll('.foundation');
    fElements.forEach((el, fIndex) => {
      el.innerHTML = '';
      const pile = this.foundations[fIndex];
      if (pile.length > 0) {
        const topCard = pile[pile.length - 1];
        const cardEl = this.createCardElement(topCard, 'foundation', fIndex, pile.length - 1);
        el.appendChild(cardEl);
      }
    });
  }

  renderTableau() {
    const colElements = document.querySelectorAll('.tableau .column');
    colElements.forEach((colEl, colIndex) => {
      colEl.innerHTML = '';
      const pile = this.tableau[colIndex];
      pile.forEach((card, cardIndex) => {
        const cardEl = this.createCardElement(card, 'tableau', colIndex, cardIndex);
        cardEl.style.top = `${cardIndex * 34}px`;
        colEl.appendChild(cardEl);
      });
    });
  }

  createCardElement(card, sourcePile, pileIndex, cardIndex) {
    const cardEl = document.createElement('div');
    
    if (!card.faceUp) {
      cardEl.className = 'card card-back';
    } else {
      cardEl.className = `card ${card.color}`;
      cardEl.draggable = true;

      const isFaceCard = ['J', 'Q', 'K'].includes(card.value);

      cardEl.innerHTML = `
        <div class="card-corner top-left">
          <span>${card.value}</span>
          <span class="corner-suit">${card.suit}</span>
        </div>
        <div class="card-center">
          ${isFaceCard 
            ? `<div class="face-art">${card.value}</div>` 
            : `<span>${card.suit}</span>`}
        </div>
        <div class="card-corner bottom-right">
          <span>${card.value}</span>
          <span class="corner-suit">${card.suit}</span>
        </div>
      `;
    }

    cardEl.dataset.source = sourcePile;
    cardEl.dataset.pileIndex = pileIndex;
    cardEl.dataset.cardIndex = cardIndex;

    return cardEl;
  }

  // --- EVENTS & WIN CONDITION ---
  bindEvents() {
    // Prevent duplicate event listener bindings on restart
    if (this.eventsBound) return;

    document.getElementById('stock').addEventListener('click', () => this.drawStock());
    document.getElementById('restart-btn').addEventListener('click', () => this.init());
    document.getElementById('play-again-btn').addEventListener('click', () => this.init());

    document.body.addEventListener('dragstart', (e) => {
      const cardEl = e.target.closest('.card');
      if (!cardEl || cardEl.classList.contains('card-back')) return;

      const source = cardEl.dataset.source;
      const pileIndex = parseInt(cardEl.dataset.pileIndex);
      const cardIndex = parseInt(cardEl.dataset.cardIndex);

      this.draggedData = { source, pileIndex, cardIndex };
      e.dataTransfer.setData('text/plain', '');
    });

    document.body.addEventListener('dragover', (e) => {
      e.preventDefault();
    });

    document.body.addEventListener('drop', (e) => {
      e.preventDefault();
      if (!this.draggedData) return;

      const dropTarget = e.target.closest('.pile');
      if (!dropTarget) return;

      this.handleDrop(dropTarget);
      this.draggedData = null;
    });

    this.eventsBound = true;
  }

  checkWinCondition() {
    const totalFoundationCards = this.foundations.reduce((sum, pile) => sum + pile.length, 0);
    if (totalFoundationCards === 52) {
      this.stopTimer();
      document.getElementById('win-modal').classList.remove('hidden');
    }
  }

  drawStock() {
    if (this.stock.length > 0) {
      const card = this.stock.pop();
      card.faceUp = true;
      this.waste.push(card);
    } else {
      while (this.waste.length > 0) {
        const card = this.waste.pop();
        card.faceUp = false;
        this.stock.push(card);
      }
    }
    this.render();
  }

  handleDrop(dropTarget) {
    const { source, pileIndex, cardIndex } = this.draggedData;
    let cardsToMove = [];

    if (source === 'waste') {
      cardsToMove = [this.waste[this.waste.length - 1]];
    } else if (source === 'tableau') {
      cardsToMove = this.tableau[pileIndex].slice(cardIndex);
    } else if (source === 'foundation') {
      cardsToMove = [this.foundations[pileIndex][this.foundations[pileIndex].length - 1]];
    }

    if (!cardsToMove.length) return;
    const leadCard = cardsToMove[0];

    if (dropTarget.classList.contains('foundation')) {
      const targetFIndex = Array.from(document.querySelectorAll('.foundation')).indexOf(dropTarget);
      if (cardsToMove.length === 1 && this.isValidFoundationMove(leadCard, targetFIndex)) {
        this.executeMove(source, pileIndex, cardIndex, 'foundation', targetFIndex);
      }
    }

    if (dropTarget.classList.contains('column')) {
      const targetColIndex = parseInt(dropTarget.dataset.col);
      if (this.isValidTableauMove(leadCard, targetColIndex)) {
        this.executeMove(source, pileIndex, cardIndex, 'tableau', targetColIndex);
      }
    }
  }

  isValidTableauMove(card, targetColIndex) {
    const targetPile = this.tableau[targetColIndex];
    if (targetPile.length === 0) {
      return card.value === 'K';
    }
    const topCard = targetPile[targetPile.length - 1];
    const isOppositeColor = card.color !== topCard.color;
    const isOneRankLower = VALUES.indexOf(card.value) === VALUES.indexOf(topCard.value) - 1;

    return isOppositeColor && isOneRankLower;
  }

  isValidFoundationMove(card, foundationIndex) {
    const targetPile = this.foundations[foundationIndex];
    if (targetPile.length === 0) {
      return card.value === 'A';
    }
    const topCard = targetPile[targetPile.length - 1];
    const isSameSuit = card.suit === topCard.suit;
    const isOneRankHigher = VALUES.indexOf(card.value) === VALUES.indexOf(topCard.value) + 1;

    return isSameSuit && isOneRankHigher;
  }

  executeMove(source, sourceIndex, cardIndex, destType, destIndex) {
    let movedCards = [];

    if (source === 'waste') {
      movedCards = [this.waste.pop()];
    } else if (source === 'tableau') {
      movedCards = this.tableau[sourceIndex].splice(cardIndex);
      if (this.tableau[sourceIndex].length > 0) {
        this.tableau[sourceIndex][this.tableau[sourceIndex].length - 1].faceUp = true;
      }
    } else if (source === 'foundation') {
      movedCards = [this.foundations[sourceIndex].pop()];
    }

    if (destType === 'tableau') {
      this.tableau[destIndex].push(...movedCards);
    } else if (destType === 'foundation') {
      this.foundations[destIndex].push(...movedCards);
    }

    this.render();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Solitaire();
});