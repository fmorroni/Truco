function getRandomNumber(min, max) {
    return Math.random()*(max - min) + min;
}

function getRandomInt(min, max) {
    min = Math.floor(min);
    max = Math.floor(max);
    randInt = Math.floor(getRandomNumber(min, max + 1));
    // In case Math.random returns a 1.
    if (randInt == max + 1) {
        randInt = max;
    }
    
    return randInt;
}

class Card {
    constructor(number, suit) {
        this.number = number;
        this.suit = suit;
        // this.valueTruco = this.getValueTruco();
        // this.valueEnvido = this.getValueEnvido();
    }

    get valueTruco() {
        switch (this.number) {
            case 1:
                if (this.suit === Deck.suits[0]) {
                    return 14;
                }
                else if (this.suit === Deck.suits[2]) {
                    return 13; 
                }
                else {
                    return 8;
                }
           
            case 7:
                if (this.suit === Deck.suits[0]) {
                    return 12;
                }
                else if (this.suit === Deck.suits[1]) {
                    return 11; 
                }
                else {
                    return 4;
                }
            
            case 2:
                return 9;
           
            case 3:
                return 10;

            case 4:
                return 1;

            case 5:
                return 2;

            case 6:
                return 3;

            case 10:
                return 5;

            case 11:
                return 6;

            case 12:
                return 7;
        }
    }

    get valueEnvido() {
        if (this.number < 10) {
            return this.number;
        }
        else {
            return 0;
        }
    }

    get cardName() {
        return `${this.number} ${this.suit}`;
    }
}

class Deck {
    static numbers = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];
    static suits = ['Espada', 'Oro', 'Basto', 'Copa'];
    constructor() {
        this.deck = this.generateDeck();
    }

    generateDeck() {
        let deck = [];
        for (const number of Deck.numbers) {
            for (const suit of Deck.suits) {
                deck.push(new Card(number, suit));
            }
        }

        return deck;
    }

    dealCards(players) {
        for (let player of players) {
            // player = new Player(); // Comment this line. Just for autocompletion's sake.
            let cardsInHand = 3;
            for (let card = 0; card < cardsInHand; card++) {
                randInt = getRandomInt(0, this.deck.length - 1);
                player.cards.push(this.deck.splice(randInt, 1)[0]);
            }
        }
        /*console.log('Player 1: ');
        console.log(players[0].cards);
        console.log('Player 2: ');
        console.log(players[1].cards);*/
    }

    addCard(card) {
        this.deck.push(card);
    }
}

class Player {
    constructor() {
        this.cards = [];
        this.totalPoints = 0;
        this.roundPoints = 0;
    }

    get envido() {
        let envido = 0;
        for (let i = 0; i < this.cards.length - 1; i++) {
            for (let j = i + 1; j < this.cards.length; j++) {
                let newEnvido = 0;
                if (this.cards[i].suit === this.cards[j].suit) {
                    newEnvido = this.cards[i].valueEnvido + this.cards[j].valueEnvido + 20;
                }
                else {
                    for (const card of this.cards) {
                        newEnvido = (card.valueEnvido > newEnvido ? card.valueEnvido : newEnvido)
                    }                   
                }

                if (newEnvido > envido) {
                    envido = newEnvido;
                }
            }
        }
        
        return envido;
    }

    printCards() {
        let cardNames = '';
        let cardIndexes = '';
        let separator = '\t\t'
        for (const [i, card] of this.cards.entries()) {
            //console.log(`${card.cardName} --> Select with ${i}`);
            cardNames += card.cardName + separator;
            for (let j = 1; j <= card.cardName.length; ++j) {
                if (j === Math.floor(card.cardName.length/2)) {
                    cardIndexes += `[${i}]`;
                    j += 2;
                }
                else {
                    cardIndexes += ' ';
                }
            }
            cardIndexes += separator;
        }
        console.log(cardNames + '\n' + cardIndexes);
    }

    useCard(cardIndex) {
        return this.cards.splice(cardIndex, 1)[0];
    }
}

class Game {
    constructor(numberOfPlayers = 2) {
        this.players = this.generatePlayers(numberOfPlayers);
        this.deck = new Deck();
    }

    generatePlayers(numberOfPlayers) {
        let players = [];
        for (let i = 0; i < numberOfPlayers; i++) {
            players.push(new Player());
        }
        
        return players;
    }

    playRound() {
        this.deck.dealCards(this.players);
        for (let [i, player] of this.players.entries()) {
            player.printCards();
            let playedCard = player.useCard(prompt('Which card do you wish to use?'));
            this.deck.addCard(playedCard);
            console.log(`Player ${i+1} dropped a: ${playedCard.cardName}`);
        }
    }
}