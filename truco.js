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
        this.tieneElQuiero = true;
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

    printCards({printIndexes = true} = {}) {
        let cardNames = '';
        let cardIndexes = '';
        let separator = '\t\t'
        for (const [i, card] of this.cards.entries()) {
            //console.log(`${card.cardName} --> Select with ${i}`);
            cardNames += card.cardName + separator;
            if (printIndexes) {
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
        }
        let padding = 1;
        printIndexes ? 
            console.log('\n'.repeat(padding) + cardNames + '\n' + cardIndexes + '\n'.repeat(padding + 1)) :
            console.log('\n'.repeat(padding) + cardNames + '\n'.repeat(padding + 1));
    }

    useCard(cardIndex) {
        return this.cards.splice(cardIndex, 1)[0];
    }
}

class Game {
    static options = {envido: 'Envido',
                      realEnvido: 'Real Envido!',
                      faltaEnvido: 'Falta Envido!!',
                      truco: 'Truco',
                      retruco: 'Quiero Retruco!',
                      valeCuatro: 'Quiero Vale Cuatro!',
                      jugarCallado: 'Jugar Callado',
                      quiero: 'Quiero.',
                      noQuiero: 'No quiero...',
                      irseAlMaso: 'Irse Al Maso'};

    
    constructor(numberOfPlayers = 2) {
        this.players = this.generatePlayers(numberOfPlayers);
        this.deck = new Deck();
        this.state = {truco: null, envido: null};
    }

    generatePlayers(numberOfPlayers = 2) {
        let players = [];
        for (let i = 0; i < numberOfPlayers; i++) {
            players.push(new Player());
        }
        
        return players;
    }

    printOptions({envido = false,
                  realEnvido = false,
                  faltaEnvido = false,
                  truco = false,
                  retruco = false,
                  valeCuatro = false,
                  jugarCallado = false,
                  quiero = false,
                  noQuiero = false,
                  irseAlMaso = false} = {}) {
        
        let options = [];
        if (envido) options.push(Game.options.envido);
        if (realEnvido) options.push(Game.options.realEnvido);
        if (faltaEnvido) options.push(Game.options.faltaEnvido);
        if (truco) options.push(Game.options.truco);
        if (retruco) options.push(Game.options.retruco);
        if (valeCuatro) options.push(Game.options.valeCuatro);
        if (jugarCallado) options.push(Game.options.jugarCallado);
        if (quiero) options.push(Game.options.quiero);
        if (noQuiero) options.push(Game.options.noQuiero);
        if (irseAlMaso) options.push(Game.options.irseAlMaso);

        let optString = '';
        let optionIndexes = '';
        let separator = '\t\t'
        for (const [i, option] of options.entries()) {
            optString += option + separator;
            for (let j = 1; j <= option.length; ++j) {
                if (j === Math.floor(option.length/2)) {
                    optionIndexes += `[${i}]`;
                    j += 2;
                }
                else {
                    optionIndexes += ' ';
                }
            }
            optionIndexes += separator;
        }
        let padding = 2;
        console.log('\n'.repeat(padding) + optString + '\n' + optionIndexes + '\n'.repeat(padding + 1));

        return options;
    }

    parseOptions(options, selectedOption, playerIndex) {
        switch (options[selectedOption]) {
            case Game.options.envido:
                this.envido(playerIndex);
                break;
        }
    }

    envido(playerIndex,
           puntaje = {siSeQuiere: 0, siNoSeQuiere: 0},
           envidoCount = {envido: 0, realEnvido: 0, faltaEnvido: 0},
           playerSays = '') {

        console.clear();
        playerSays === '' ? null : console.log(`Player ${(playerIndex + 1)%2 + 1} says: ${playerSays}\n\n`);
        console.log(`Player ${playerIndex+1}: \n`)
        this.players[playerIndex].printCards({printIndexes: false});

        let options = [];
        if (envidoCount.faltaEnvido > 0) 
            options = this.printOptions({quiero: true, noQuiero: true, irseAlMaso: true});
        else if (envidoCount.realEnvido > 0)
            options = this.printOptions({faltaEnvido: true, quiero: true, noQuiero: true, irseAlMaso: true});
        else if (envidoCount.envido > 1)
            options = this.printOptions({realEnvido: true, faltaEnvido: true, quiero: true, noQuiero: true, irseAlMaso: true});
        else if (envidoCount.envido > 0)
            options = this.printOptions({envido: true, realEnvido: true, faltaEnvido: true, quiero: true, noQuiero: true, irseAlMaso: true});
        else
            options = this.printOptions({envido: true, realEnvido: true, faltaEnvido: true});
        //console.log(options);
        
        let selectedOption = prompt('Choose an option:');
        switch (options[selectedOption]) {
            case Game.options.envido:
                playerSays = Game.options.envido;
                puntaje.siSeQuiere += 2;
                ++puntaje.siNoSeQuiere;
                ++envidoCount.envido;
                break;
            case Game.options.realEnvido:
                playerSays = Game.options.realEnvido;
                puntaje.siSeQuiere += 3;
                puntaje.siNoSeQuiere < 2 ? ++puntaje.siNoSeQuiere : puntaje.siNoSeQuiere += 3;
                ++envidoCount.realEnvido;
                break;
            case Game.options.faltaEnvido:
                playerSays = Game.options.faltaEnvido;
                puntaje.siSeQuiere += 999;
                puntaje.siNoSeQuiere < 2 ? ++puntaje.siNoSeQuiere : puntaje.siNoSeQuiere += 2;
                ++envidoCount.faltaEnvido;
                break;
            case Game.options.quiero:
                playerSays = Game.options.quiero;
                console.log(`Player ${playerIndex+1} says: ${playerSays}`);
                console.log('Stuff...\n\n');
                return;
            case Game.options.noQuiero:
                playerSays = Game.options.noQuiero;
                console.log(`Player ${playerIndex+1} says: ${playerSays}`);
                return;
            case Game.options.irseAlMaso:
                playerSays = Game.options.irseAlMaso;
                console.log(`Player ${playerIndex+1} says: ${playerSays}`);
                return;
                
        }
        console.log((playerIndex + 1)%2, puntaje, envidoCount, playerSays);
        this.envido((playerIndex + 1)%2, puntaje, envidoCount, playerSays);
        
    }

    playRound() {
        this.deck.dealCards(this.players);
        console.clear();
        for (let [i, player] of this.players.entries()) {
            console.log(`Player ${i+1}: \n`)
            player.printCards({printIndexes: false});
            let options = this.printOptions({envido: true, truco: true, jugarCallado: true, irseAlMaso: true});
            let selectedOption = prompt('Choose an option:');
            this.parseOptions(options, selectedOption, i);
            
            /*
            let playedCard = player.useCard(prompt('Which card do you wish to use?'));
            this.deck.addCard(playedCard);
            console.log(`Player ${i+1} dropped a: ${playedCard.cardName}`);
            */
        }
    }
}