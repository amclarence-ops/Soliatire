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

    this.init();
  }

  init() {
    this.buildDeck();
    this.shuffle();
    this.deal();
    this.bindEvents();
    this.render();
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

  // --- RENDERING ENGINE ---
  render() {
    this.renderStock();
    this.renderWaste();
    this.renderFoundations();
    this.renderTableau();
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
        cardEl.style.top = `${cardIndex * 24}px`; // Vertical overlap
        colEl.appendChild(cardEl);
      });
    });
  }

  createCardElement(card, sourcePile, pileIndex, cardIndex) {
    const cardEl = document.createElement('div');
    cardEl.className = `card ${card.faceUp ? '' : 'card-back'} ${card.color}`;
    if (card.faceUp) {
      cardEl.textContent = `${card.value} ${card.suit}`;
      cardEl.draggable = true;
    }

    cardEl.dataset.source = sourcePile;
    cardEl.dataset.pileIndex = pileIndex;
    cardEl.dataset.cardIndex = cardIndex;

    return cardEl;
  }

  // --- DRAG AND DROP & EVENT BINDING ---
  bindEvents() {
    // Stock click logic
    document.getElementById('stock').addEventListener('click', () => this.drawStock());

    // Event Delegation for Dragging
    document.body.addEventListener('dragstart', (e) => {
      if (!e.target.classList.contains('card')) return;
      
      const source = e.target.dataset.source;
      const pileIndex = parseInt(e.target.dataset.pileIndex);
      const cardIndex = parseInt(e.target.dataset.cardIndex);

      this.draggedData = { source, pileIndex, cardIndex };
      e.dataTransfer.setData('text/plain', ''); // Firefox drag compatibility
    });

    document.body.addEventListener('dragover', (e) => {
      e.preventDefault(); // Required to allow drop
    });

    document.body.addEventListener('drop', (e) => {
      e.preventDefault();
      if (!this.draggedData) return;

      const dropTarget = e.target.closest('.pile');
      if (!dropTarget) return;

      this.handleDrop(dropTarget);
      this.draggedData = null;
    });
  }

  drawStock() {
    if (this.stock.length > 0) {
      const card = this.stock.pop();
      card.faceUp = true;
      this.waste.push(card);
    } else {
      // Recycle waste back to stock
      while (this.waste.length > 0) {
        const card = this.waste.pop();
        card.faceUp = false;
        this.stock.push(card);
      }
    }
    this.render();
  }

  // --- RULE VALIDATION AND DROP HANDLING ---
  handleDrop(dropTarget) {
    const { source, pileIndex, cardIndex } = this.draggedData;
    let cardsToMove = [];

    // Get cards moving array
    if (source === 'waste') {
      cardsToMove = [this.waste[this.waste.length - 1]];
    } else if (source === 'tableau') {
      cardsToMove = this.tableau[pileIndex].slice(cardIndex);
    } else if (source === 'foundation') {
      cardsToMove = [this.foundations[pileIndex][this.foundations[pileIndex].length - 1]];
    }

    const leadCard = cardsToMove[0];

    // Case 1: Dropped on Foundation
    if (dropTarget.classList.contains('foundation')) {
      const targetFIndex = Array.from(document.querySelectorAll('.foundation')).indexOf(dropTarget);
      if (cardsToMove.length === 1 && this.isValidFoundationMove(leadCard, targetFIndex)) {
        this.executeMove(source, pileIndex, cardIndex, 'foundation', targetFIndex);
      }
    }

    // Case 2: Dropped on Tableau Column
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
      return card.value === 'K'; // Kings only on empty columns
    }
    const topCard = targetPile[targetPile.length - 1];
    const isOppositeColor = card.color !== topCard.color;
    const isOneRankLower = VALUES.indexOf(card.value) === VALUES.indexOf(topCard.value) - 1;

    return isOppositeColor && isOneRankLower;
  }

  isValidFoundationMove(card, foundationIndex) {
    const targetPile = this.foundations[foundationIndex];
    if (targetPile.length === 0) {
      return card.value === 'A'; // Aces first
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
      // Flip new top card if face down
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

// Initialize game on launch
window.addEventListener('DOMContentLoaded', () => {
  new Solitaire();
});