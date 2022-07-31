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

    return gameInfo;
}

function getCssRuleBySelectorRegex(cssRuleList, regexSelector) {
    let matchedRules = [];
    for (let rule of cssRuleList) {
        if (regexSelector.test(rule.selectorText)) {
            matchedRules.push(rule);
        }
    }
    return matchedRules;
}

function getCssRuleBySelectorExact(cssRuleList, stringSelector) {
    let matchedRules = [];
    for (let rule of cssRuleList) {
        if (stringSelector === rule.selectorText) {
            matchedRules.push(rule);
        }
    }
    return matchedRules;
}

function getCssRuleIndexBySelector(cssRuleList, stringSelectorExactMatch) {
    let matchedIndexes = [];
    for (let i = 0; i < cssRuleList.length; ++i) {
        if (stringSelectorExactMatch === cssRuleList[i].selectorText) {
            matchedIndexes.push(i);
        }
    }
    return matchedIndexes;
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
                    gameInfo.connectedPlayers = {};
                    gameInfo.connectedPlayers[gameInfo.username] = 0;
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
                if (joinGame === 'yes') {
                    gameInfo.connectedPlayers = connectedPlayers;
                    gameInfo.playersRequired = playersRequired;
                    console.log(gameInfo);
                    createWaitingScreen(gameInfo);
                } else if (joinGame === 'repeated-username') {
                    alert(`User "${gameInfo.username}" has already join the game.`);
                    window.location.href = '/Truco/public/index.html';
                } else {
                    alert(`Room ${gameInfo.gameRoom} doesn't exists.`);
                    window.location.href = '/Truco/public/index.html';
                }
            });
        }
    });

    socket.on('user-joined', remoteUser => {
        console.log('User connected: ' + remoteUser);
        gameInfo.connectedPlayers[remoteUser] = 0;
        
        let playerList = document.querySelector('.connected-players > ul');
        let player = document.createElement('li');
        player.id = remoteUser;
        player.textContent = remoteUser;
        playerList.appendChild(player);

        let connectedPlayersCounter = document.getElementById('connected-players-counter');
        connectedPlayersCounter.textContent = parseInt(connectedPlayersCounter.textContent) + 1;
    });

    socket.on('all-players-connected', () => {
        console.log('All players connected.')
        let waitingMessage = document.querySelector('div.waiting-message');
        waitingMessage.querySelector('h3').textContent = 'All players connected, select your team by clicking your username.';
        removeAllSiblings(waitingMessage.querySelector('h3'));
    })
    
    socket.on('user-left', remoteUser => {
        console.log('User disconnected: ' + remoteUser);
        delete gameInfo.connectedPlayers[remoteUser];
        document.getElementById(remoteUser).remove();

        let connectedPlayersCounter = document.getElementById('connected-players-counter');
        connectedPlayersCounter.textContent = parseInt(connectedPlayersCounter.textContent) - 1;
    });

    socket.on('update-teams', (remoteUser, newTeam) => {
        console.log(`Player ${remoteUser} changed teams to ${newTeam}`);
        document.getElementById(remoteUser).className = '';
        document.getElementById(remoteUser).classList.add('team-' + newTeam);
        gameInfo.connectedPlayers[remoteUser] = newTeam;
    })

    socket.on('teams-selected', delaySeconds => {
        document.getElementById(gameInfo.username).removeEventListener('click', playerTeamChange);
        document.getElementById(gameInfo.username).classList.remove('local-player');
        console.log(`Game will start in ${delaySeconds} seconds.`)
        let waitingMessage = document.querySelector('div.waiting-message');
        waitingMessage.querySelector('h3').textContent = 'Teams selected. Starting game in';
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
    
    socket.on('start-game', (connectedPlayers, playingOrder) => {
        removeAllChildNodes(document.body);
        gameInfo.connectedPlayers = connectedPlayers;
        gameInfo.playingOrder = playingOrder;
        console.log(gameInfo);
        const game = new Game(gameInfo);
        console.log('Local player: ', game.player);
        console.log('Remote players: ', game.otherPlayers);
        game.start();
        // game.player.useCard(1);
    })
    
    
    socket.on('server-message', message => console.log(message));
    socket.on('server-shutdown', message => {
        alert(message);
        window.location.href = '/Truco/public/index.html';
    });
    // let game = new Game();
    // game.start();
    // let p1 = new Player(1, 'Franco');
    // p1.connectToSocket();
});

function playerTeamChange() {
    this.classList.remove('team-' + this.team);
    // Alternate between team 1 and 2.
    this.team = this.team%2 + 1;
    this.classList.add('team-' + this.team);
    socket.emit('team-change', this.team);
}

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
    connectedPlayersCounter.textContent = Object.keys(gameInfo.connectedPlayers).length;
    connectedPlayersMsg.appendChild(connectedPlayersCounter);
    connectedPlayersMsg.innerHTML += '/' + gameInfo.playersRequired;
    connectedPlayersBox.appendChild(connectedPlayersMsg);

    let playerList = document.createElement('ul');
    for (let username of Object.keys(gameInfo.connectedPlayers)) {
        let playerElement = document.createElement('li');
        playerElement.id = username;
        playerElement.classList.add('team-' + gameInfo.connectedPlayers[username]);
        if (username === gameInfo.username) {
            playerElement.classList.add('local-player');
            playerElement.team = 0;
            playerElement.addEventListener('click', playerTeamChange);
        }
        playerElement.textContent = username;

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

class CardBackside {
    constructor() {
        this.node = this.createNode();
    }

    get url() {
        return `./images/backside.png`;
    }

    createNode() {
        let node = document.createElement('img');
        node.src = this.url;
        node.alt = 'Backside of card';
        node.classList.add('card-remote');
        return node;
    }
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
        node.classList.add('card-local');
        node.onclick = event => console.log(event); // Placeholder.
        return node;
    }
}

class Player {
    constructor(username, team, isLocal=false) {
        this.username = username;
        this.team = team;
        this.isLocal = isLocal;
        this.cardsInHand = [];
        this.usedCards = [];
        this.totalPoints = 0;
        this.roundPoints = 0;
        this.tieneElQuiero = false;
        this.optionsNode = this.createOptionsNode();
        [this.handNode, this.usedCardsNode] = this.createHandAndUsedCardsNodes();
        this.playerContainerNode = this.createPlayerContainerNode();
    }

    get envido() {
        let envido = 0;
        for (let i = 0; i < this.cardsInHand.length - 1; i++) {
            for (let j = i + 1; j < this.cardsInHand.length; j++) {
                let newEnvido = 0;
                if (this.cardsInHand[i].suit === this.cardsInHand[j].suit) {
                    newEnvido = this.cardsInHand[i].valueEnvido + this.cardsInHand[j].valueEnvido + 20;
                }
                else {
                    for (const card of this.cardsInHand) {
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
        playerContainer.id = this.username;
        playerContainer.classList.add('player-container');

        let username = document.createElement('h3');
        username.classList.add('username', 'team-' + this.team);
        username.textContent = this.username;
        playerContainer.appendChild(username);

        let handOptionsContainer = document.createElement('div');
        handOptionsContainer.classList.add('hand-options-container');
        handOptionsContainer.appendChild(this.handNode);
        handOptionsContainer.appendChild(this.optionsNode);
        playerContainer.appendChild(handOptionsContainer);

        playerContainer.appendChild(this.usedCardsNode);

        return playerContainer;
    }

    createHandAndUsedCardsNodes() {
        // This are hardcoded cause getting them dynamically was a pain
        // because apparently the image doesn't load fast enough.
        let naturalWidth = 360;
        let naturalHeight = 515;
        let rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
        let width = parseFloat(getCssRuleBySelectorRegex(document.styleSheets[0].cssRules, /\.card-local/)[0].style.width)*rem;
        let height = naturalHeight*width/naturalWidth;
        
        let handCssClass = getCssRuleBySelectorExact(document.styleSheets[0].cssRules, '.hand')[0];
        if (!handCssClass) {
            let index = document.styleSheets[0].insertRule('.hand {}', document.styleSheets[0].cssRules.length);
            handCssClass = document.styleSheets[0].cssRules[index];
        }
        handCssClass.style.width = width*2.3 + 'px';
        handCssClass.style.height = height*1.05 + 'px';

        let usedCardsCssClass = getCssRuleBySelectorExact(document.styleSheets[0].cssRules, '.used-cards')[0];
        if (!usedCardsCssClass) {
            let index = document.styleSheets[0].insertRule('.used-cards {}', document.styleSheets[0].cssRules.length);
            usedCardsCssClass = document.styleSheets[0].cssRules[index];
        }
        usedCardsCssClass.style.width = handCssClass.style.width;
        usedCardsCssClass.style.height = handCssClass.style.height;
        
        let handNode = document.createElement('div');
        handNode.classList.add('hand');
        let usedCardsNode = document.createElement('div');
        usedCardsNode.classList.add('used-cards');

        return [handNode, usedCardsNode];
    }

    createOptionsNode() {
        let optionsNode = document.createElement('div');
        optionsNode.classList.add('options');
        
        return optionsNode;
    }

    updateHand() {
        this.updateHandOrUsedCards('hand');
    }

    updateUsedCards() {
        this.updateHandOrUsedCards('usedCards');
    }

    updateHandOrUsedCards(handOrUsedCards) {
        let node; let cards; let cardClassEnding; let maxAngle;
        if (handOrUsedCards === 'hand') {
            node = this.handNode;
            cards = this.cardsInHand;
            cardClassEnding = 'in-hand';
            maxAngle = (cards.length > 1) ? 30 : 0;
        } else if (/used/i.test(handOrUsedCards)) {
            node = this.usedCardsNode;
            cards = this.usedCards;
            cardClassEnding = 'used';
            maxAngle = (cards.length > 1) ? 12 : 0;
        }
        let angleBetweenCards = (cards.length > 1) ? 2*maxAngle/(cards.length - 1) : 0;
        for (let [i, card] of cards.entries()) {
            let cardClass = `${this.username}-card-${i}-${cardClassEnding}`;
            let angle = -maxAngle + angleBetweenCards*i;
            let radius = '40%';
            let rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
            let width = parseFloat(getCssRuleBySelectorRegex(document.styleSheets[0].cssRules, /\.card-local/)[0].style.width)*rem;
            let rule = `.${cardClass} {
                            position: absolute;
                            left: ${(node.clientWidth - width)/2}px;
                            top: ${radius};
                            transform: rotate(${angle}deg) translateY(-${radius});
                        }`;
            let indexIfRuleAlreadyExisted = getCssRuleIndexBySelector(document.styleSheets[0].cssRules, '.' + cardClass)[0];
            if (indexIfRuleAlreadyExisted) {
                document.styleSheets[0].deleteRule(indexIfRuleAlreadyExisted);
            }
            document.styleSheets[0].insertRule(rule, document.styleSheets[0].cssRules.length);
            
            if (this.isLocal) {
                let ruleOnHover = `.${cardClass}:hover {
                    transform: rotate(${angle}deg) translateY(-${radius}) scale(1.1);
                    z-index: 1;
                }`;
                indexIfRuleAlreadyExisted = getCssRuleIndexBySelector(document.styleSheets[0].cssRules, `.${cardClass}:hover`)[0];
                if (indexIfRuleAlreadyExisted) {
                    document.styleSheets[0].deleteRule(indexIfRuleAlreadyExisted);
                }
                document.styleSheets[0].insertRule(ruleOnHover, document.styleSheets[0].cssRules.length);
            }

            // Remove any other class that may have been added in other updates.
            card.node.className = 'card-local';
            card.node.classList.add(cardClass);
            node.appendChild(card.node);
        }
    }

    /* updateOptions(options) {
        removeAllChildNodes(this.optionsNode);
        for (let option of options) {
            this.optionsNode.appendChild(option);
        } 
    } */

    /* printCards({ printIndexes = true } = {}) {
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
    } */

    useCard(cardIndex) {
        let usedCard = this.cardsInHand.splice(cardIndex, 1)[0];
        
        // Cloning removes event listeners.
        usedCard.node.remove();
        usedCard.node = usedCard.node.cloneNode();
        
        this.usedCards.push(usedCard);
        this.updateHand();
        this.updateUsedCards();
        return usedCard;
    }

    addUseCardEventListener() {
        for (let card of this.cardsInHand) {
            // card.addEventListener('click', this.useCard) // Wouldn't work because of the this parameter.
            card.node.addEventListener('click', () => {
                // Note: I had used a [i, card] .entries() forof before, but that added a fixed index as per
                // the original card order to the listener, which broke if I used cards in a random order.
                this.useCard(this.cardsInHand.indexOf(card));
            })
        }
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

    constructor(gameInfo) {
        this.gameInfo = gameInfo;
        this.player = new Player(gameInfo.username, /*team=*/gameInfo.connectedPlayers[gameInfo.username], /*isLocal=*/true);
        // this.teams = this.generateTeams();
        this.otherPlayers = this.generateOtherPlayers();
        // this.deck = new Deck();
        this.state = { truco: null, envido: null };
    }

    /* generateTeams() {
        let teams = [];
        for (let teamKey of this.gameInfo.teams) {
            let team = this.gameInfo.teams[teamKey];
            for (let username of team) {
                if (username === this.player.username) {
                    team.push(this.player);
                } else {
                    team.push(new Player(username));
                }
            }
            teams.push(team);
        }

        return teams;
    } */

    generateOtherPlayers() {
        let otherPlayers = [];
        for (let username of Object.keys(this.gameInfo.connectedPlayers)) {
            if (username !== this.player.username) {
                otherPlayers.push(new Player(username, /*team=*/this.gameInfo.connectedPlayers[username]));
            }
        }
        return otherPlayers;
    }

    addPlayerContainersToHTML() {
        let container = document.createElement('div');
        container.classList.add('container');

        let numberOfRows = 2;
        let playersPerRow = Math.ceil(this.gameInfo.playersRequired/numberOfRows);
        for (let i = 0; i < numberOfRows; ++i) {
            let row = document.createElement('div');
            let limit = playersPerRow*(i+1) <= this.gameInfo.playersRequired ?
                                               playersPerRow*(i+1) :
                                               this.gameInfo.playersRequired;
            for (let j = i*playersPerRow; j < limit; ++j) {
                let player = this.getPlayerByUsername(this.gameInfo.playingOrder[j]);
                row.appendChild(player.playerContainerNode);
            }
            container.appendChild(row);
        }

        // container.appendChild(this.player.playerContainerNode);
        // for (let player of this.otherPlayers) {
        //     container.appendChild(player.playerContainerNode);
        // }

        document.body.appendChild(container);
    }

    addHandsToHTML() {
        this.player.updateHand();
        for (let player of this.otherPlayers) {
            player.updateHand();
        }
    }

    getPlayerByUsername(username) {
        if (username === this.player.username) {
            return this.player;
        } else {
            for (let player of this.otherPlayers) {
                if (username === player.username) {
                    return player;
                }
            }
        }
    }

    /* printOptions({ envido = false,
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
    } */

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
        // this.deck.dealCards(this.players);
        // this.addHandsToHTML();
        socket.emit('get-hand', hand => {
            for (let card of hand) {
                this.player.cardsInHand.push(new Card(card.number, card.suit));
            }
            this.player.updateHand();
            this.player.addUseCardEventListener();
        });

        for (let player of this.otherPlayers) {
            let numberOfCards = 3;
            for (let i = 0; i < numberOfCards; i++) {
                player.cardsInHand.push(new CardBackside());
            }
            player.updateHand();
        }
        this.setOptions(this.player, { envido: true, truco: true, irseAlMaso: true });
        // this.parseOptions()
        // this.players[0].useCard(1);
        // setTimeout(() => {
        //     this.players[0].updateHand();
        // }, 2000);
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