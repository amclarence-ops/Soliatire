const SUITS = ['♥', '♦', '♣', '♠'];
const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

class Solitaire {
  constructor() {
    this.deck = [];
    this.stock = [];
    this.waste = [];
    this.foundations = [[], [], [], []];
    this.tableau = [[], [], [], [], [], [], []];
    this.init();
  }

  init() {
    this.buildDeck();
    this.shuffle();
    this.deal();
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
}

const game = new Solitaire();