function getRandomNumber(min, max) {
    return Math.random() * (max - min) + min;
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

function removeAllChildNodes(parent) {
    while (parent.firstChild) {parent.removeChild(parent.firstChild);}
}

function removeAllSiblings(element) {
    while (element.nextSibling) {element.nextSibling.remove();}
    while (element.previousSibling) {element.previousSibling.remove();}
}

function getGameInfo(url) {
    let data = url.match(/(?<=\?).*/)[0];
    data = data.split('&');
    let gameInfo = {};
    data.forEach(ele => {
        let pair = decodeURIComponent(ele.split('=')).split(',');
        gameInfo[pair[0]] = pair[1];
    });
    gameInfo.connectedPlayers = [gameInfo.username];
    console.log(gameInfo);

    return gameInfo;
}

// Esto sería necesario si tuviera descargada la socket.io-client library, pero como usé el cnd
// no necesito importar el módulo.
// import { io } from '/socket.io-client';

const socket = io('http://localhost:3000',
                  {transports: ['websocket', 'polling', 'flashsocket']});
// window.socket = socket;

// const socket = io('https://ae57-2800-40-39-1e5d-6104-10db-2c4d-f033.sa.ngrok.io',
//                   {transports: ['websocket', 'polling', 'flashsocket']});


window.addEventListener('load', () => {
    let gameInfo = getGameInfo(window.location.href);

    socket.on('connect', () => {
        console.log(`Connected to room: ${gameInfo.gameRoom}`);
        if (gameInfo.gameType.match(/new-game/i)) {
            console.log('Emit: new-game');
            socket.emit('new-game', gameInfo, createRoom => {
                if (createRoom) {
                    console.log(gameInfo);
                    createWaitingScreen(gameInfo);
                } else {
                    alert(`Room ${gameInfo.gameRoom} already exists, choose another room name`);
                    window.location.href = '/Truco/public/index.html';
                }
            });
        }
        else {
            console.log('Emit: join-game');
            socket.emit('join-game', gameInfo, (connectedPlayers, playersRequired, joinGame) => {
                if (joinGame) {
                    gameInfo.connectedPlayers = connectedPlayers;
                    gameInfo.playersRequired = playersRequired;
                    console.log(gameInfo);
                    createWaitingScreen(gameInfo);
                } else {
                    alert(`User "${gameInfo.username}" has already join the game.`);
                    window.location.href = '/Truco/public/index.html';
                }
            });
        }
    });

    socket.on('user-joined', remoteUsername => {
        console.log('User connected: ' + remoteUsername);
        gameInfo.connectedPlayers.push(remoteUsername);
        
        let playerList = document.querySelector('.connected-players > ul');
        let player = document.createElement('li');
        player.id = remoteUsername;
        player.textContent = remoteUsername;
        playerList.appendChild(player);

        let connectedPlayersCounter = document.getElementById('connected-players-counter');
        connectedPlayersCounter.textContent = parseInt(connectedPlayersCounter.textContent) + 1;
    });
    
    socket.on('user-left', remoteUsername => {
        console.log('User disconnected: ' + remoteUsername);
        gameInfo.connectedPlayers.splice(gameInfo.connectedPlayers.indexOf(remoteUsername), 1);
        document.getElementById(remoteUsername).remove();

        let connectedPlayersCounter = document.getElementById('connected-players-counter');
        connectedPlayersCounter.textContent = parseInt(connectedPlayersCounter.textContent) - 1;
    });

    socket.on('server-shutdown', message => {
        alert(message);
        window.location.href = '/Truco/public/index.html';
    });

    socket.on('start-game', delaySeconds => {
        console.log(`All players connected. Game will start y ${delaySeconds} seconds.`)
        let waitingMessage = document.querySelector('div.waiting-message');
        waitingMessage.querySelector('h3').textContent = 'All players connected. Starting game in';
        removeAllSiblings(waitingMessage.querySelector('h3'));
        let countDown = document.createElement('p');
        countDown.classList.add('count-down');
        countDown.textContent = delaySeconds;
        waitingMessage.appendChild(countDown);

        let tid = setInterval(() => {
            if (delaySeconds <= 0) {
                clearInterval(tid);
            } else {
                countDown.textContent = --delaySeconds;
            }
        }, 1000);
        
    });
    
    socket.on('server-message', message => console.log(message));
    // let game = new Game();
    // game.start();
    // let p1 = new Player(1, 'Franco');
    // p1.connectToSocket();
});

function createWaitingScreen(gameInfo) {
    let container = document.createDocumentFragment();

    let gameRoom = document.createElement('p');
    gameRoom.classList.add('game-room');
    gameRoom.textContent = `Game Room: ${gameInfo.gameRoom}`;
    container.appendChild(gameRoom);

    let waitingScreen = document.createElement('div');
    waitingScreen.classList.add('waiting-screen');
    let waitingMessage = document.createElement('div');
    waitingMessage.classList.add('waiting-message');
    waitingMessage.appendChild(document.createElement('h3'));
    waitingMessage.querySelector('h3').textContent = 'Waiting for other players';
    let waitingDots = [];
    for (let i = 0; i < 3; i++) {
        let dot = document.createElement('div');
        dot.classList.add('waiting-dot');
        waitingMessage.appendChild(dot);
        waitingDots.push(dot);
    }
    waitingScreen.appendChild(waitingMessage);
    let connectedPlayersBox = document.createElement('div');
    connectedPlayersBox.classList.add('connected-players');

    let connectedPlayersMsg = document.createElement('h4');
    connectedPlayersMsg.textContent = 'Players connected ';
    let connectedPlayersCounter = document.createElement('span');
    connectedPlayersCounter.id = 'connected-players-counter';
    connectedPlayersCounter.textContent = gameInfo.connectedPlayers.length;
    connectedPlayersMsg.appendChild(connectedPlayersCounter);
    connectedPlayersMsg.innerHTML += '/' + gameInfo.playersRequired;
    connectedPlayersBox.appendChild(connectedPlayersMsg);

    let playerList = document.createElement('ul');
    for (let player of gameInfo.connectedPlayers) {
        let playerElement = document.createElement('li');
        playerElement.id = player;
        playerElement.textContent = player;
        playerList.appendChild(playerElement);
        connectedPlayersBox.appendChild(playerList);
    }

    waitingScreen.appendChild(connectedPlayersBox);

    container.appendChild(waitingScreen);

    document.body.appendChild(container);

    let blinkInterval = 600;
    setInterval((function x() {
        for (let [i, dot] of waitingDots.entries()) {
            setTimeout(() => dot.style.visibility = dot.style.visibility ? '' : 'hidden', blinkInterval * i + 500);
        }
        return x;
    })(), 3 * blinkInterval);
}

class Card {
    constructor(number, suit) {
        this.number = number;
        this.suit = suit;
        this.node = this.createNode();
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

    get url() {
        let number = this.number.toString().length < 2 ? '0' + this.number : this.number;
        return `./images/${this.suit.toLowerCase()}-${number}.png`;
    }

    createNode() {
        let node = document.createElement('img');
        node.src = this.url;
        node.alt = this.cardName;
        node.classList.add('card');
        node.onclick = event => console.log(event); // Placeholder.
        return node;
    }
}

class Deck {
    static numbers = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];
    static suits = ['espada', 'oro', 'basto', 'copa'];
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
    }

    addCard(card) {
        this.deck.push(card);
    }
}

class Player {
    constructor(id, username) {
        this.id = id;
        this.username = username;
        this.cards = [];
        this.totalPoints = 0;
        this.roundPoints = 0;
        this.tieneElQuiero = true;
        this.optionsNode = this.createOptionsNode();
        this.handNode = this.createHandNode();
        this.playerContainerNode = this.createPlayerContainerNode();
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
                envido = newEnvido > envido ? newEnvido : envido;
            }
        }

        return envido;
    }

    createPlayerContainerNode() {
        let playerContainer = document.createElement('div');
        playerContainer.id = this.id;
        playerContainer.classList.add('player-container');

        let username = document.createElement('h3');
        username.classList.add('username');
        username.textContent = this.username;
        playerContainer.appendChild(username);

        playerContainer.appendChild(this.handNode);
        playerContainer.appendChild(this.optionsNode);

        return playerContainer;
    }

    createHandNode() {
        let hand = document.createElement('div');
        hand.classList.add('hand');

        return hand;
    }

    createOptionsNode() {
        let optionsNode = document.createElement('div');
        optionsNode.classList.add('options');

        return optionsNode;
    }

    updateHand() {
        removeAllChildNodes(this.handNode);
        for (let card of this.cards) {
            this.handNode.appendChild(card.node);
        }
    }

    // updateOptions(options) {
    //     removeAllChildNodes(this.optionsNode);
    //     for (let option of options) {
    //         this.optionsNode.appendChild(option);
    //     } 
    // }

    printCards({ printIndexes = true } = {}) {
        let cardNames = '';
        let cardIndexes = '';
        let separator = '\t\t'
        for (const [i, card] of this.cards.entries()) {
            //console.log(`${card.cardName} --> Select with ${i}`);
            cardNames += card.cardName + separator;
            if (printIndexes) {
                for (let j = 1; j <= card.cardName.length; ++j) {
                    if (j === Math.floor(card.cardName.length / 2)) {
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

    connectToSocket() {
        io.connect('http://localhost:3000');
    }
}

class Game {
    static options = {
        envido: 'Envido',
        realEnvido: 'Real Envido!',
        faltaEnvido: 'Falta Envido!!',
        truco: 'Truco',
        retruco: 'Quiero Retruco!',
        valeCuatro: 'Quiero Vale Cuatro!',
        jugarCallado: 'Jugar Callado',
        quiero: 'Quiero.',
        noQuiero: 'No quiero...',
        irseAlMaso: 'Irse Al Maso'
    };


    constructor(numberOfPlayers = 2) {
        this.players = this.generatePlayers(numberOfPlayers); // Only implemented for two players.
        this.deck = new Deck();
        this.state = { truco: null, envido: null };
    }

    generatePlayers(numberOfPlayers = 2) {
        let players = [];
        for (let i = 0; i < numberOfPlayers; i++) {
            let id = `player-${i + 1}`;
            let username = id; //prompt(`${id}'s username: `);
            players.push(new Player(id, username));
        }
        return players;
    }

    getPlayerById(id) {
        for (let player of players) {
            if (player.id === id) return player;
        }
    }

    addPlayerContainersToHTML() {
        let container = document.createElement('div');
        container.classList.add('container');
        let separator = document.createElement('div');
        separator.classList.add('separator');

        for (let i = 0; i < this.players.length; i++) {
            container.appendChild(this.players[i].playerContainerNode);
            if (i < this.players.length - 1) container.appendChild(separator);
        }

        document.body.appendChild(container);
    }

    addHandsToHTML() {
        for (let player of this.players) {
            player.updateHand();
        }
    }

    printOptions({ envido = false,
        realEnvido = false,
        faltaEnvido = false,
        truco = false,
        retruco = false,
        valeCuatro = false,
        jugarCallado = false,
        quiero = false,
        noQuiero = false,
        irseAlMaso = false } = {}) {

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
                if (j === Math.floor(option.length / 2)) {
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

    setOptions(player, { envido = false,
        realEnvido = false,
        faltaEnvido = false,
        truco = false,
        retruco = false,
        valeCuatro = false,
        jugarCallado = false,
        quiero = false,
        noQuiero = false,
        irseAlMaso = false } = {}) {

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

        let optionsNode = document.createDocumentFragment();
        for (let option of options) {
            let button = document.createElement('button');
            button.name = option;
            button.textContent = option;
            button.onclick = this.parseOptions(player, option);

            optionsNode.appendChild(button);
        }
        removeAllChildNodes(player.optionsNode);
        player.optionsNode.appendChild(optionsNode);

        return options;
    }

    /* parseOptions(options, selectedOption, playerIndex) {
        switch (options[selectedOption]) {
            case Game.options.envido:
                this.envido(playerIndex);
                break;
        }
    } */
    parseOptions(player, option) {
        switch (option) {
            case Game.options.envido:
                return () => this.envido(player);
        }
    }

    /* envido(playerIndex,
           score = {siSeQuiere: 0, siNoSeQuiere: 0},
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
                score.siSeQuiere += 2;
                ++score.siNoSeQuiere;
                ++envidoCount.envido;
                break;
            case Game.options.realEnvido:
                playerSays = Game.options.realEnvido;
                score.siSeQuiere += 3;
                score.siNoSeQuiere < 2 ? ++score.siNoSeQuiere : score.siNoSeQuiere += 3;
                ++envidoCount.realEnvido;
                break;
            case Game.options.faltaEnvido:
                playerSays = Game.options.faltaEnvido;
                score.siSeQuiere += 999;
                score.siNoSeQuiere < 2 ? ++score.siNoSeQuiere : score.siNoSeQuiere += 2;
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
        console.log((playerIndex + 1)%2, score, envidoCount, playerSays);
        this.envido((playerIndex + 1)%2, score, envidoCount, playerSays);
    } */
    envido(player,
        score = { siSeQuiere: 0, siNoSeQuiere: 0 },
        envidoCount = { envido: 0, realEnvido: 0, faltaEnvido: 0 }) {

        // console.clear();
        // playerSays === '' ? null : console.log(`Player ${(playerIndex + 1)%2 + 1} says: ${playerSays}\n\n`);
        // console.log(`Player ${playerIndex+1}: \n`)
        // this.players[playerIndex].printCards({printIndexes: false});

        let options = [];
        if (envidoCount.faltaEnvido > 0)
            options = this.setOptions(player, { quiero: true, noQuiero: true, irseAlMaso: true });
        else if (envidoCount.realEnvido > 0)
            options = this.setOptions(player, { faltaEnvido: true, quiero: true, noQuiero: true, irseAlMaso: true });
        else if (envidoCount.envido > 1)
            options = this.setOptions(player, { realEnvido: true, faltaEnvido: true, quiero: true, noQuiero: true, irseAlMaso: true });
        else if (envidoCount.envido > 0)
            options = this.setOptions(player, { envido: true, realEnvido: true, faltaEnvido: true, quiero: true, noQuiero: true, irseAlMaso: true });
        else
            options = this.setOptions(player, { envido: true, realEnvido: true, faltaEnvido: true });
        console.log(options);
        return;
        let selectedOption = prompt('Choose an option:');
        switch (options[selectedOption]) {
            case Game.options.envido:
                playerSays = Game.options.envido;
                score.siSeQuiere += 2;
                ++score.siNoSeQuiere;
                ++envidoCount.envido;
                break;
            case Game.options.realEnvido:
                playerSays = Game.options.realEnvido;
                score.siSeQuiere += 3;
                score.siNoSeQuiere < 2 ? ++score.siNoSeQuiere : score.siNoSeQuiere += 3;
                ++envidoCount.realEnvido;
                break;
            case Game.options.faltaEnvido:
                playerSays = Game.options.faltaEnvido;
                score.siSeQuiere += 999;
                score.siNoSeQuiere < 2 ? ++score.siNoSeQuiere : score.siNoSeQuiere += 2;
                ++envidoCount.faltaEnvido;
                break;
            case Game.options.quiero:
                playerSays = Game.options.quiero;
                console.log(`Player ${playerIndex + 1} says: ${playerSays}`);
                console.log('Stuff...\n\n');
                return;
            case Game.options.noQuiero:
                playerSays = Game.options.noQuiero;
                console.log(`Player ${playerIndex + 1} says: ${playerSays}`);
                return;
            case Game.options.irseAlMaso:
                playerSays = Game.options.irseAlMaso;
                console.log(`Player ${playerIndex + 1} says: ${playerSays}`);
                return;

        }
        console.log((playerIndex + 1) % 2, score, envidoCount, playerSays);
        this.envido((playerIndex + 1) % 2, score, envidoCount, playerSays);
    }

    playRound() {
        this.deck.dealCards(this.players);
        this.addHandsToHTML();
        this.setOptions(this.players[0], { envido: true, truco: true, irseAlMaso: true });
        this.parseOptions()
        this.players[0].useCard(1);
        setTimeout(() => {
            this.players[0].updateHand();
        }, 2000);
    }

    start() {
        this.addPlayerContainersToHTML();
        this.playRound();
    }

    menu() {
        // let 
    }

    startNewGame() {

    }

    connectToExistingGame() {

    }
}