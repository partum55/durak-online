// Card suits and values
const suits = ['♥', '♦', '♠', '♣'];
const values = ['6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

// Game state
let deck = [];
let playerOneHand = [];
let playerTwoHand = [];
let trumpSuit = '';
let trumpCard = null;
let attackCards = [];
let defenseCards = [];
let currentAttacker = null;
let currentDefender = null;
let currentPlayer = null;
let gameActive = false;
let gameStarted = false;
let waitingForPlayers = true;
let inLobby = true;
let lastInteractionTime = Date.now();

// Player ready status
let player1Ready = false;
let player2Ready = false;

// Player role (1 or 2)
let playerRole = null;

// Game ID for Firebase
let gameId = localStorage.getItem('durakGameId');
if (!gameId) {
    gameId = Math.random().toString(36).substring(2, 10);
    localStorage.setItem('durakGameId', gameId);
}

// Firebase reference for this game
const gameRef = database.ref(`durak_games/${gameId}`);
const playersRef = gameRef.child('players');
const gameStateRef = gameRef.child('gameState');

// Players connected status
let player1Connected = false;
let player2Connected = false;

// Used to track if we need to reconnect
let wasDisconnected = false;

// Auto-sync interval (2 seconds)
let autoSyncInterval = null;
const AUTO_SYNC_INTERVAL = 2000;

// Connection check interval (3 seconds)
let connectionCheckInterval = null;
const CONNECTION_CHECK_INTERVAL = 3000;

// Last sync timestamp
let lastSyncTime = null;

// Toast notification timeout
let toastTimeout = null;

// DOM elements
const playerSelectDiv = document.getElementById('player-select');
const gameTableDiv = document.getElementById('game-table');
const connectionInfoDiv = document.getElementById('connection-info');
const deckElement = document.querySelector('.deck');
const trumpCardElement = document.querySelector('.trump-card');
const playerOneHandElement = document.querySelector('.player-one-hand');
const playerTwoHandElement = document.querySelector('.player-two-hand');
const attackAreaElement = document.querySelector('.attack-area');
const defenseAreaElement = document.querySelector('.defense-area');
const statusElement = document.querySelector('.status');
const deckCountElement = document.querySelector('.deck-count');
const turnIndicatorElement = document.querySelector('.turn-indicator');
const playerOneInfoElement = document.getElementById('player-one-info');
const playerTwoInfoElement = document.getElementById('player-two-info');
const gameIdElement = document.getElementById('game-id-value');
const playerRoleDisplay = document.getElementById('player-role-display');
const lastSyncTimeElement = document.getElementById('last-sync-time');
const battleAreaElement = document.querySelector('.battle-area');

// Player status elements
const player1StatusElement = document.getElementById('player1-status');
const player2StatusElement = document.getElementById('player2-status');
const player1StatusGameElement = document.getElementById('player1-status-game');
const player2StatusGameElement = document.getElementById('player2-status-game');

// Buttons
const playerOneButton = document.getElementById('btn-player-one');
const playerTwoButton = document.getElementById('btn-player-two');
const takeButton = document.getElementById('btn-take');
const doneButton = document.getElementById('btn-done');
const startButton = document.getElementById('btn-start');
const syncButton = document.getElementById('btn-sync');
const autoSyncCheckbox = document.getElementById('auto-sync');

// Create toast container
const toastContainer = document.createElement('div');
toastContainer.className = 'toast-container';
document.body.appendChild(toastContainer);

// Add buttons for new features
const readyButton = document.createElement('button');
readyButton.id = 'btn-ready';
readyButton.className = 'btn btn-warning';
readyButton.innerHTML = '<i class="fas fa-check"></i> Ready to Play';
readyButton.style.display = 'none';

const foldButton = document.createElement('button');
foldButton.id = 'btn-fold';
foldButton.className = 'btn btn-danger';
foldButton.innerHTML = '<i class="fas fa-flag"></i> Fold Cards';
foldButton.style.display = 'none';

const changePlayerButton = document.createElement('button');
changePlayerButton.id = 'btn-change-player';
changePlayerButton.className = 'btn btn-secondary';
changePlayerButton.innerHTML = '<i class="fas fa-exchange-alt"></i> Change Player';
changePlayerButton.style.display = 'none';

// Back to lobby button
const backToLobbyButton = document.createElement('button');
backToLobbyButton.id = 'btn-back-to-lobby';
backToLobbyButton.className = 'btn btn-info';
backToLobbyButton.innerHTML = '<i class="fas fa-home"></i> Back to Lobby';
backToLobbyButton.style.display = 'none';

// Disconnect button
const disconnectButton = document.createElement('button');
disconnectButton.id = 'btn-disconnect';
disconnectButton.className = 'btn btn-danger';
disconnectButton.innerHTML = '<i class="fas fa-sign-out-alt"></i> Disconnect';
disconnectButton.style.display = 'none';

// Reconnect button
const reconnectButton = document.createElement('button');
reconnectButton.id = 'btn-reconnect';
reconnectButton.className = 'btn btn-primary';
reconnectButton.innerHTML = '<i class="fas fa-sign-in-alt"></i> Reconnect';
reconnectButton.style.display = 'none';

// Help button for rules
const helpButton = document.createElement('button');
helpButton.id = 'btn-help';
helpButton.className = 'btn btn-info';
helpButton.innerHTML = '<i class="fas fa-question-circle"></i> Game Rules';
helpButton.style.display = 'none';

// Add the new buttons to the controls section
const controlsSection = document.querySelector('.controls');
controlsSection.appendChild(readyButton);
controlsSection.appendChild(foldButton);
controlsSection.appendChild(changePlayerButton);
controlsSection.appendChild(backToLobbyButton);
controlsSection.appendChild(disconnectButton);
controlsSection.appendChild(reconnectButton);
controlsSection.appendChild(helpButton);

// Create "Back to Game" button for the lobby
const backToGameButton = document.createElement('button');
backToGameButton.id = 'btn-back-to-game';
backToGameButton.className = 'btn btn-success';
backToGameButton.innerHTML = '<i class="fas fa-play-circle"></i> Return to Game';
backToGameButton.style.display = 'none';

// Connection status indicator for lobby
const connectionStatusIndicator = document.createElement('div');
connectionStatusIndicator.id = 'lobby-connection-status';
connectionStatusIndicator.className = 'connection-indicator';
connectionStatusIndicator.innerHTML = 'Connection Status: <span class="connection-status-text">Checking...</span>';

// Add Back to Game button and connection status to player selection area
const playerButtonsDiv = document.querySelector('.player-buttons');
playerButtonsDiv.appendChild(backToGameButton);
playerSelectDiv.appendChild(connectionStatusIndicator);

// Create rules dialog
createRulesDialog();

// Display game ID
gameIdElement.textContent = gameId;

// Initialize Firebase structure
function initializeFirebase() {
    gameRef.once('value', (snapshot) => {
        if (!snapshot.exists()) {
            // Create initial game structure
            gameRef.set({
                gameId: gameId,
                created: Date.now(),
                players: {
                    player1: {
                        connected: false,
                        ready: false,
                        lastActive: 0
                    },
                    player2: {
                        connected: false,
                        ready: false,
                        lastActive: 0
                    }
                },
                gameState: {
                    active: false,
                    started: false,
                    waitingForPlayers: true,
                    lastUpdate: Date.now()
                }
            });
        }
    });
}

// Show toast notification
function showToast(message, type = 'info', duration = 3000) {
    // Clear any existing toast timeout
    if (toastTimeout) {
        clearTimeout(toastTimeout);
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        ${message}
        <div class="toast-progress"></div>
    `;
    
    // Add to container
    toastContainer.appendChild(toast);
    
    // Remove after duration
    toastTimeout = setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, duration);
}

// Create game rules dialog
function createRulesDialog() {
    // Your existing createRulesDialog function
    // No changes needed here
}

// Set up player connection monitoring
function setupPlayerConnection(role) {
    const playerPath = `player${role}`;
    const playerRef = playersRef.child(playerPath);
    
    // Set connected status
    playerRef.update({
        connected: true,
        lastActive: firebase.database.ServerValue.TIMESTAMP
    });
    
    // Set up disconnect handler
    playerRef.onDisconnect().update({
        connected: false
    });
    
    // Set up regular pings to update lastActive
    return setInterval(() => {
        playerRef.update({
            lastActive: firebase.database.ServerValue.TIMESTAMP
        });
    }, 5000);
}

// Listen for player connection changes
function listenForPlayerChanges() {
    playersRef.on('value', (snapshot) => {
        const players = snapshot.val();
        if (players) {
            // Update player1 status
            if (players.player1) {
                player1Connected = players.player1.connected;
                player1Ready = players.player1.ready;
            }
            
            // Update player2 status
            if (players.player2) {
                player2Connected = players.player2.connected;
                player2Ready = players.player2.ready;
            }
            
            // Update UI
            updatePlayerStatusDisplay();
            
            // Check if both players are ready
            if (player1Connected && player2Connected && player1Ready && player2Ready && !gameActive && !gameStarted) {
                // Initialize game
                initGame();
            }
            
            // Update game status based on connections
            updateGameStatusBasedOnConnections();
        }
    });
}

// Update game status based on player connections
function updateGameStatusBasedOnConnections() {
    if (gameActive) {
        if (!player1Connected || !player2Connected) {
            statusElement.textContent = "Game paused: waiting for all players to reconnect...";
            statusElement.className = 'status warning';
            battleAreaElement.classList.remove('active');
        } else {
            statusElement.textContent = `Game active. ${currentPlayer === 'player1' ? 'Player 1' : 'Player 2'}'s turn.`;
            statusElement.className = 'status success';
            battleAreaElement.classList.add('active');
        }
    }
}

// Update the connection indicator in the lobby
function updateConnectionIndicator() {
    const statusText = document.querySelector('.connection-status-text');
    if (!statusText) return;
    
    if (navigator.onLine) {
        statusText.textContent = 'Connected';
        statusText.className = 'connection-status-text connected';
    } else {
        statusText.textContent = 'Offline';
        statusText.className = 'connection-status-text disconnected';
    }
    
    // Update player status
    updatePlayerStatusDisplay();
}

// Update player status indicators
function updatePlayerStatusDisplay() {
    // Update lobby player status
    if (player1Connected) {
        player1StatusElement.classList.add('player-connected');
        player1StatusElement.classList.remove('player-disconnected');
    } else {
        player1StatusElement.classList.remove('player-connected');
        player1StatusElement.classList.add('player-disconnected');
    }
    
    if (player2Connected) {
        player2StatusElement.classList.add('player-connected');
        player2StatusElement.classList.remove('player-disconnected');
    } else {
        player2StatusElement.classList.remove('player-connected');
        player2StatusElement.classList.add('player-disconnected');
    }
    
    // Update in-game player status if elements exist
    if (player1StatusGameElement) {
        if (player1Connected) {
            player1StatusGameElement.classList.add('player-connected');
            player1StatusGameElement.classList.remove('player-disconnected');
        } else {
            player1StatusGameElement.classList.remove('player-connected');
            player1StatusGameElement.classList.add('player-disconnected');
        }
    }
    
    if (player2StatusGameElement) {
        if (player2Connected) {
            player2StatusGameElement.classList.add('player-connected');
            player2StatusGameElement.classList.remove('player-disconnected');
        } else {
            player2StatusGameElement.classList.remove('player-connected');
            player2StatusGameElement.classList.add('player-disconnected');
        }
    }
}

// Listen for browser online/offline events
window.addEventListener('online', () => {
    updateConnectionIndicator();
    showToast('You are back online!', 'success');
    if (wasDisconnected) {
        reconnectPlayer();
        wasDisconnected = false;
    }
});

window.addEventListener('offline', () => {
    updateConnectionIndicator();
    wasDisconnected = true;
    statusElement.textContent = "You are offline. Reconnect to continue playing.";
    statusElement.className = 'status alert';
    showToast('You are offline. Game will resume when connection is restored.', 'error');
});

// Initialize game on page load
(function initialize() {
    // Initialize Firebase structure
    initializeFirebase();
    
    // Update connection indicator
    updateConnectionIndicator();
    
    // Check if player role is saved
    const savedPlayerRole = localStorage.getItem('durakPlayerRole');
    if (savedPlayerRole) {
        playerRole = parseInt(savedPlayerRole);
        inLobby = false;
        
        // Listen for player changes
        listenForPlayerChanges();
        
        // Auto select the saved player role
        selectPlayer();
    } else {
        // If no player role is saved, show empty game in lobby
        showEmptyGame();
        gameTableDiv.style.display = 'block';
        inLobby = true;
        waitingForPlayers = true;
        
        // Listen for player changes even in lobby
        listenForPlayerChanges();
    }
})();

// Select player 1
playerOneButton.addEventListener('click', () => {
    if (!player1Connected) {
        playerRole = 1;
        localStorage.setItem('durakPlayerRole', playerRole);
        inLobby = false;
        
        // Set up player connection
        setupPlayerConnection(1);
        
        selectPlayer();
        showToast('You joined as Player 1', 'success');
    } else {
        showToast('Player 1 is already connected!', 'error');
    }
});

// Select player 2
playerTwoButton.addEventListener('click', () => {
    if (!player2Connected) {
        playerRole = 2;
        localStorage.setItem('durakPlayerRole', playerRole);
        inLobby = false;
        
        // Set up player connection
        setupPlayerConnection(2);
        
        selectPlayer();
        showToast('You joined as Player 2', 'success');
    } else {
        showToast('Player 2 is already connected!', 'error');
    }
});

// Mark player as ready
readyButton.addEventListener('click', () => {
    if (playerRole) {
        // Update Firebase
        playersRef.child(`player${playerRole}`).update({
            ready: true
        });
        
        // Update local state
        if (playerRole === 1) {
            player1Ready = true;
        } else {
            player2Ready = true;
        }
        
        // Update UI
        readyButton.disabled = true;
        readyButton.innerHTML = '<i class="fas fa-check-double"></i> Ready ✓';
        showToast('You are ready to play!', 'success');
    }
});

// Disconnect player
disconnectButton.addEventListener('click', () => {
    if (confirm('Are you sure you want to disconnect from the game?')) {
        disconnectPlayer();
        
        // Show a message to let the user know they've been disconnected
        showToast('You have been disconnected from the game', 'error');
        
        // Return to lobby
        inLobby = true;
        returnToLobby();
    }
});

// Disconnect player function
function disconnectPlayer() {
    if (playerRole) {
        // Update Firebase
        playersRef.child(`player${playerRole}`).update({
            connected: false,
            ready: false
        });
        
        // Update local state
        if (playerRole === 1) {
            player1Connected = false;
            player1Ready = false;
        } else {
            player2Connected = false;
            player2Ready = false;
        }
        
        // Clear player role
        localStorage.removeItem('durakPlayerRole');
        playerRole = null;
    }
}

// Reconnect player
reconnectButton.addEventListener('click', () => {
    reconnectPlayer();
});

function reconnectPlayer() {
    if (playerRole) {
        // Update Firebase
        playersRef.child(`player${playerRole}`).update({
            connected: true,
            lastActive: firebase.database.ServerValue.TIMESTAMP
        });
        
        // Update local state
        if (playerRole === 1) {
            player1Connected = true;
        } else {
            player2Connected = true;
        }
        
        // Setup connection monitoring
        setupPlayerConnection(playerRole);
        
        // Update UI
        statusElement.textContent = "Reconnected! Game will resume shortly...";
        statusElement.className = 'status success';
        reconnectButton.style.display = 'none';
        
        showToast('Successfully reconnected to the game', 'success');
    }
}

// Initialize the game
function initGame() {
    // Only initialize if not already started
    if (gameStarted) return;
    
    // Reset game state
    deck = createDeck();
    shuffleDeck(deck);
    
    playerOneHand = [];
    playerTwoHand = [];
    attackCards = [];
    defenseCards = [];
    
    // Set trump suit
    trumpCard = deck[0];
    trumpSuit = trumpCard.suit;
    
    // Move trump card to bottom of deck
    deck.shift();
    
    dealCards();
    
    // Put trump card back to the bottom of the deck
    deck.push(trumpCard);
    
    // Determine first attacker - player with lowest trump goes first
    determineFirstAttacker();
    
    // Set current player
    currentPlayer = currentAttacker;
    
    gameActive = true;
    gameStarted = true;
    waitingForPlayers = false;
    
    // Update Firebase game state
    gameStateRef.update({
        active: true,
        started: true,
        waitingForPlayers: false,
        currentPlayer: currentPlayer,
        currentAttacker: currentAttacker,
        currentDefender: currentDefender,
        deck: JSON.stringify(deck),
        playerOneHand: JSON.stringify(playerOneHand),
        playerTwoHand: JSON.stringify(playerTwoHand),
        trumpSuit: trumpSuit,
        trumpCard: JSON.stringify(trumpCard),
        attackCards: JSON.stringify(attackCards),
        defenseCards: JSON.stringify(defenseCards),
        lastUpdate: firebase.database.ServerValue.TIMESTAMP
    });
    
    // Display status message
    if (currentAttacker === 'player1') {
        statusElement.textContent = "Player 1 attacks first. Select a card to play.";
        statusElement.className = 'status';
        turnIndicatorElement.textContent = "Player 1's Turn";
    } else {
        statusElement.textContent = "Player 2 attacks first. Select a card to play.";
        statusElement.className = 'status';
        turnIndicatorElement.textContent = "Player 2's Turn";
    }
    
    // Highlight battle area when game is active
    battleAreaElement.classList.add('active');
    
    updateUI();
    toggleControls();
    updatePlayerInfoHighlight();
    
    showToast('Game is starting!', 'success');
}

// Listen for game state changes
function listenForGameStateChanges() {
    gameStateRef.on('value', (snapshot) => {
        const state = snapshot.val();
        if (state && state.active) {
            // Update game state from Firebase
            gameActive = state.active;
            gameStarted = state.started;
            waitingForPlayers = state.waitingForPlayers;
            currentPlayer = state.currentPlayer;
            currentAttacker = state.currentAttacker;
            currentDefender = state.currentDefender;
            deck = JSON.parse(state.deck || '[]');
            playerOneHand = JSON.parse(state.playerOneHand || '[]');
            playerTwoHand = JSON.parse(state.playerTwoHand || '[]');
            trumpSuit = state.trumpSuit;
            trumpCard = JSON.parse(state.trumpCard || 'null');
            attackCards = JSON.parse(state.attackCards || '[]');
            defenseCards = JSON.parse(state.defenseCards || '[]');
            
            // Update UI
            updateUI();
            toggleControls();
            updatePlayerInfoHighlight();
            
            // Update last sync time
            lastSyncTime = new Date();
            lastSyncTimeElement.textContent = lastSyncTime.toLocaleTimeString();
        } else if (state && !state.active && state.waitingForPlayers) {
            // Game not active but waiting for players
            waitingForPlayers = true;
            gameActive = false;
            gameStarted = false;
            
            // Show empty game UI
            updateEmptyGameUI();
        }
    });
}

// Select player function
function selectPlayer() {
    // Update UI
    playerSelectDiv.style.display = 'none';
    gameTableDiv.style.display = 'block';
    connectionInfoDiv.classList.remove('hidden');
    
    // Display player role
    playerRoleDisplay.textContent = playerRole === 1 ? 'Player 1' : 'Player 2';
    
    // Listen for game state changes
    listenForGameStateChanges();
    
    // If waiting for players and no game active, show empty game
    if (!gameActive && waitingForPlayers) {
        showEmptyGame();
    }
    
    // Show player control buttons
    changePlayerButton.style.display = 'inline-block';
    backToLobbyButton.style.display = 'inline-block';
    disconnectButton.style.display = 'inline-block';
    helpButton.style.display = 'inline-block';
    
    // Show ready button if game not started
    if (!gameActive && !gameStarted) {
        readyButton.style.display = 'inline-block';
    }
    
    // Hide reconnect button
    reconnectButton.style.display = 'none';
    
    inLobby = false;
    
    // Highlight player's own hand
    highlightPlayerHand();
}

// Show waiting area and empty game
function showEmptyGame() {
    // Create empty deck if needed
    if (deck.length === 0) {
        deck = createDeck();
        trumpCard = deck[0];
        trumpSuit = trumpCard.suit;
    }
    
    // Update UI for empty game
    updateEmptyGameUI();
}

// Return to lobby function
function returnToLobby() {
    // Hide game table, show player select
    gameTableDiv.style.display = 'none';
    playerSelectDiv.style.display = 'block';
    connectionInfoDiv.classList.add('hidden');
    
    inLobby = true;
}

// Create a new deck of cards (continued)
function createDeck() {
    const newDeck = [];
    for (let suit of suits) {
        for (let value of values) {
            newDeck.push({
                suit,
                value,
                rank: values.indexOf(value),
                color: (suit === '♥' || suit === '♦') ? 'red' : 'black'
            });
        }
    }
    return newDeck;
}

// Shuffle the deck
function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
}

// Deal cards to players
function dealCards() {
    // Deal 6 cards to each player
    for (let i = 0; i < 6; i++) {
        if (deck.length > 0) {
            playerOneHand.push(drawCard());
        }
        if (deck.length > 0) {
            playerTwoHand.push(drawCard());
        }
    }
    
    // Sort hands
    sortHand(playerOneHand);
    sortHand(playerTwoHand);
}

// Draw a card from the deck
function drawCard() {
    if (deck.length > 0) {
        return deck.pop();
    }
    return null;
}

// Sort hand by suit and rank
function sortHand(hand) {
    hand.sort((a, b) => {
        // Non-trump suits first, grouped by suit
        if (a.suit === trumpSuit && b.suit !== trumpSuit) return 1;
        if (a.suit !== trumpSuit && b.suit === trumpSuit) return -1;
        
        // Same suit, sort by rank
        if (a.suit === b.suit) return a.rank - b.rank;
        
        // Different suits, sort by suit order in the array
        return suits.indexOf(a.suit) - suits.indexOf(b.suit);
    });
}

// Determine who attacks first
function determineFirstAttacker() {
    // Player with lowest trump goes first
    let playerOneLowestTrump = getLowestTrump(playerOneHand);
    let playerTwoLowestTrump = getLowestTrump(playerTwoHand);
    
    if (playerOneLowestTrump && playerTwoLowestTrump) {
        currentAttacker = (playerOneLowestTrump.rank < playerTwoLowestTrump.rank) ? 'player1' : 'player2';
    } else if (playerOneLowestTrump) {
        currentAttacker = 'player1';
    } else if (playerTwoLowestTrump) {
        currentAttacker = 'player2';
    } else {
        // No trumps, random
        currentAttacker = Math.random() < 0.5 ? 'player1' : 'player2';
    }
    
    currentDefender = currentAttacker === 'player1' ? 'player2' : 'player1';
}

// Get lowest trump card from hand
function getLowestTrump(hand) {
    let trumpCards = hand.filter(card => card.suit === trumpSuit);
    if (trumpCards.length > 0) {
        return trumpCards.reduce((lowest, card) => 
            card.rank < lowest.rank ? card : lowest, trumpCards[0]);
    }
    return null;
}

// Update the UI based on player role
function updateUI() {
    // Update deck count
    deckCountElement.textContent = deck.length;
    
    // Display trump card if available
    if (trumpCard) {
        displayCard(trumpCardElement, trumpCard, true);
        
        // Add trump indicator
        const trumpCardElem = trumpCardElement.querySelector('.card');
        if (trumpCardElem) {
            trumpCardElem.classList.add('trump');
        }
    } else {
        trumpCardElement.innerHTML = '';
    }
    
    // Display player hands based on role
    if (playerRole === 1) {
        // Show player 1's hand with full visibility
        displayHand(playerOneHandElement, playerOneHand, true);
        
        // Show player 2's hand as card backs
        displayHand(playerTwoHandElement, playerTwoHand, false);
    } else if (playerRole === 2) {
        // Show player 1's hand as card backs
        displayHand(playerOneHandElement, playerOneHand, false);
        
        // Show player 2's hand with full visibility
        displayHand(playerTwoHandElement, playerTwoHand, true);
    }
    
    // Update turn indicator
    if (currentPlayer) {
        turnIndicatorElement.textContent = currentPlayer === 'player1' ? "Player 1's Turn" : "Player 2's Turn";
    } else {
        turnIndicatorElement.textContent = "Waiting for game to start";
    }
    
    // Display attack and defense cards
    updateBattleArea();
    
    // Update player info highlighting
    updatePlayerInfoHighlight();
    
    // Highlight playable cards for current player
    highlightPlayableCards();
    
    // Highlight player's own hand
    highlightPlayerHand();
}

// Update game UI for empty waiting game
function updateEmptyGameUI() {
    // Update deck count
    deckCountElement.textContent = deck.length;
    
    // Display trump card
    displayCard(trumpCardElement, trumpCard, true);
    
    // Add trump indicator
    if (trumpCard) {
        const trumpCardElem = trumpCardElement.querySelector('.card');
        if (trumpCardElem) {
            trumpCardElem.classList.add('trump');
        }
    }
    
    // Empty player hands
    playerOneHandElement.innerHTML = '';
    playerTwoHandElement.innerHTML = '';
    
    // Clear battle area
    attackAreaElement.innerHTML = '';
    defenseAreaElement.innerHTML = '';
    
    // Set waiting message
    turnIndicatorElement.textContent = "Waiting for players";
    
    // Update status message based on connections
    if (!player1Connected || !player2Connected) {
        statusElement.textContent = "Waiting for both players to connect...";
        statusElement.className = 'status warning';
    } else if (!player1Ready || !player2Ready) {
        statusElement.textContent = "Waiting for both players to be ready...";
        statusElement.className = 'status warning';
    }
    
    // Show help button
    helpButton.style.display = 'inline-block';
}

// Display a card
function displayCard(container, card, isVisible = true) {
    container.innerHTML = '';
    
    if (!card) return;
    
    const cardElement = document.createElement('div');
    cardElement.className = `card ${isVisible ? card.color : 'card-back'}`;
    cardElement.dataset.suit = card.suit;
    cardElement.dataset.value = card.value;
    
    // Add trump indicator
    if (card.suit === trumpSuit) {
        cardElement.classList.add('trump');
    }
    
    if (isVisible) {
        cardElement.innerHTML = `
            <div class="card-value">${card.value}${card.suit}</div>
            <div class="card-center">${card.suit}</div>
            <div class="card-value-bottom">${card.value}${card.suit}</div>
        `;
    }
    
    container.appendChild(cardElement);
}

// Display a hand of cards
function displayHand(container, hand, isVisible) {
    container.innerHTML = '';
    
    if (!hand || hand.length === 0) return;
    
    hand.forEach(card => {
        const cardElement = document.createElement('div');
        cardElement.className = `card ${isVisible ? card.color : 'card-back'}`;
        
        // Add trump indicator
        if (card.suit === trumpSuit) {
            cardElement.classList.add('trump');
        }
        
        if (isVisible) {
            cardElement.innerHTML = `
                <div class="card-value">${card.value}${card.suit}</div>
                <div class="card-center">${card.suit}</div>
                <div class="card-value-bottom">${card.value}${card.suit}</div>
            `;
            
            // Add event listener for player cards
            cardElement.addEventListener('click', () => handleCardClick(card));
        }
        
        cardElement.dataset.index = hand.indexOf(card);
        container.appendChild(cardElement);
    });
}

// Update battle area
function updateBattleArea() {
    attackAreaElement.innerHTML = '';
    defenseAreaElement.innerHTML = '';
    
    for (let i = 0; i < attackCards.length; i++) {
        const attackCard = attackCards[i];
        const defenseCard = defenseCards[i];
        
        if (attackCard) {
            const pairDiv = document.createElement('div');
            pairDiv.className = 'card-pair';
            
            displayCard(pairDiv, attackCard, true);
            
            if (defenseCard) {
                const defenseDiv = document.createElement('div');
                displayCard(defenseDiv, defenseCard, true);
                pairDiv.appendChild(defenseDiv);
            }
            
            attackAreaElement.appendChild(pairDiv);
        }
    }
}

// Update player info highlighting based on current player
function updatePlayerInfoHighlight() {
    playerOneInfoElement.classList.remove('active-player');
    playerTwoInfoElement.classList.remove('active-player');
    
    if (currentPlayer === 'player1') {
        playerOneInfoElement.classList.add('active-player');
    } else if (currentPlayer === 'player2') {
        playerTwoInfoElement.classList.add('active-player');
    }
    
    // Also update player indicator sections
    const player1Indicator = document.querySelector('.player-one-indicator');
    const player2Indicator = document.querySelector('.player-two-indicator');
    
    if (player1Indicator) {
        player1Indicator.classList.remove('active');
        if (currentPlayer === 'player1') {
            player1Indicator.classList.add('active');
        }
    }
    
    if (player2Indicator) {
        player2Indicator.classList.remove('active');
        if (currentPlayer === 'player2') {
            player2Indicator.classList.add('active');
        }
    }
}

// Highlight the current player's hand
function highlightPlayerHand() {
    // Remove highlights first
    playerOneHandElement.classList.remove('active-player');
    playerTwoHandElement.classList.remove('active-player');
    
    // Add highlight based on player role
    if (playerRole === 1) {
        playerOneHandElement.classList.add('active-player');
    } else if (playerRole === 2) {
        playerTwoHandElement.classList.add('active-player');
    }
}

// Highlight playable cards for current player
function highlightPlayableCards() {
    if (!gameActive) return;
    
    // Check if it's this player's turn
    const playerNumber = playerRole === 1 ? 'player1' : 'player2';
    if (currentPlayer !== playerNumber) return;
    
    // Get all card elements
    const handElement = playerNumber === 'player1' ? playerOneHandElement : playerTwoHandElement;
    const cardElements = handElement.querySelectorAll('.card');
    
    // Remove playable class from all cards
    cardElements.forEach(card => {
        card.classList.remove('playable');
    });
    
    // Get current player's hand
    const currentHand = currentPlayer === 'player1' ? playerOneHand : playerTwoHand;
    
    // For each card in hand, check if it's playable
    currentHand.forEach((card, index) => {
        let isPlayable = false;
        
        // Attack phase
        if (currentPlayer === currentAttacker) {
            if (attackCards.length === 0 || canAddAttackCard(card)) {
                isPlayable = true;
            }
        } 
        // Defense phase
        else if (currentPlayer === currentDefender) {
            const attackCard = attackCards[defenseCards.length];
            if (canDefendWithCard(card, attackCard)) {
                isPlayable = true;
            }
        }
        
        // Add playable class to card element if it's playable
        if (isPlayable && cardElements[index]) {
            cardElements[index].classList.add('playable');
        }
    });
}

// Handle card click
function handleCardClick(card) {
    if (!gameActive) return;
    
    // Update last interaction time
    lastInteractionTime = Date.now();
    
    // Check if game is paused due to player disconnection
    if (!player1Connected || !player2Connected) {
        statusElement.textContent = "Cannot play: waiting for all players to reconnect...";
        statusElement.className = 'status warning';
        showToast("Cannot play: waiting for all players to reconnect...", "warning");
        return;
    }
    
    // Check if it's this player's turn
    const playerNumber = playerRole === 1 ? 'player1' : 'player2';
    if (currentPlayer !== playerNumber) {
        statusElement.textContent = "It's not your turn.";
        statusElement.className = 'status warning';
        showToast("It's not your turn", "warning");
        return;
    }
    
    // Get current player's hand
    const currentHand = currentPlayer === 'player1' ? playerOneHand : playerTwoHand;
    
    // Attack phase
    if (currentPlayer === currentAttacker) {
        if (attackCards.length === 0 || canAddAttackCard(card)) {
            playCard(currentHand, card, 'attack');
            
            // Switch to defender
            currentPlayer = currentDefender;
            
            // Update Firebase
            updateGameState();
            
            updateUI();
            toggleControls();
            
            showToast(`You attacked with ${card.value}${card.suit}`, "info");
        } else {
            statusElement.textContent = "You can only play cards with values already in play.";
            statusElement.className = 'status warning';
            showToast("Invalid move: You can only play cards with values already in play", "warning");
        }
    } 
    // Defense phase
    else if (currentPlayer === currentDefender) {
        const attackCard = attackCards[defenseCards.length];
        if (canDefendWithCard(card, attackCard)) {
            playCard(currentHand, card, 'defense');
            
            // If all attacks defended, attacker can add more or end turn
            if (attackCards.length === defenseCards.length) {
                currentPlayer = currentAttacker;
                
                // Update Firebase
                updateGameState();
                
                updateUI();
                toggleControls();
            } else {
                // Update Firebase
                updateGameState();
            }
            
            showToast(`You defended with ${card.value}${card.suit}`, "info");
        } else {
            statusElement.textContent = "This card cannot defend against the attack.";
            statusElement.className = 'status warning';
            showToast("Invalid move: This card cannot defend against the attack", "warning");
        }
    }
    
    checkGameEnd();
}

// Check if a card can be played as an additional attack
function canAddAttackCard(card) {
    // Get defender's hand
    const defenderHand = currentDefender === 'player1' ? playerOneHand : playerTwoHand;
    
    // In Durak, you can only attack with as many cards as the defender has
    if (attackCards.length >= 6 || attackCards.length > defenseCards.length || attackCards.length >= defenderHand.length) {
        return false;
    }
    
    // Can only add cards that match a value already in play
    const valuesInPlay = [...attackCards, ...defenseCards].map(c => c.value);
    return valuesInPlay.includes(card.value);
}

// Check if card can defend against attack card
function canDefendWithCard(defenseCard, attackCard) {
    if (!attackCard || defenseCards.length >= attackCards.length) {
        return false;
    }
    
    // Same suit, higher rank
    if (defenseCard.suit === attackCard.suit && defenseCard.rank > attackCard.rank) {
        return true;
    }
    
    // Trump beats non-trump
    if (defenseCard.suit === trumpSuit && attackCard.suit !== trumpSuit) {
        return true;
    }
    
    return false;
}

// Play a card
function playCard(hand, card, type) {
    const index = hand.findIndex(c => c.suit === card.suit && c.value === card.value);
    if (index > -1) {
        hand.splice(index, 1);
        
        if (type === 'attack') {
            attackCards.push(card);
            statusElement.textContent = `${currentPlayer === 'player1' ? 'Player 1' : 'Player 2'} attacked with ${card.value}${card.suit}`;
            statusElement.className = 'status';
        } else {
            defenseCards.push(card);
            statusElement.textContent = `${currentPlayer === 'player1' ? 'Player 1' : 'Player 2'} defended with ${card.value}${card.suit}`;
            statusElement.className = 'status';
        }
        
        updateUI();
        toggleControls();
    }
}

// Update game state to Firebase
function updateGameState() {
    gameStateRef.update({
        active: gameActive,
        started: gameStarted,
        waitingForPlayers: waitingForPlayers,
        currentPlayer: currentPlayer,
        currentAttacker: currentAttacker,
        currentDefender: currentDefender,
        deck: JSON.stringify(deck),
        playerOneHand: JSON.stringify(playerOneHand),
        playerTwoHand: JSON.stringify(playerTwoHand),
        trumpSuit: trumpSuit,
        trumpCard: JSON.stringify(trumpCard),
        attackCards: JSON.stringify(attackCards),
        defenseCards: JSON.stringify(defenseCards),
        lastUpdate: firebase.database.ServerValue.TIMESTAMP
    });
}

// Take cards action
takeButton.addEventListener('click', () => {
    // Check if it's this player's turn
    const playerNumber = playerRole === 1 ? 'player1' : 'player2';
    if (currentPlayer !== playerNumber || currentPlayer !== currentDefender) {
        statusElement.textContent = "It's not your turn to take cards.";
        statusElement.className = 'status warning';
        showToast("It's not your turn to take cards", "warning");
        return;
    }
    
    const allCards = [...attackCards, ...defenseCards];
    
    // Current defender's hand
    const defenderHand = currentDefender === 'player1' ? playerOneHand : playerTwoHand;
    defenderHand.push(...allCards);
    
    // Sort the hand
    if (currentDefender === 'player1') {
        sortHand(playerOneHand);
    } else {
        sortHand(playerTwoHand);
    }
    
    // Defender remains the same, attacker gets another turn
    statusElement.textContent = `${currentDefender === 'player1' ? 'Player 1' : 'Player 2'} took the cards.`;
    statusElement.className = 'status';
    showToast(`${currentDefender === 'player1' ? 'Player 1' : 'Player 2'} took the cards`, "info");
    
    // Attacker remains the same for next round
    currentPlayer = currentAttacker;
    
    // Reset battle area
    attackCards = [];
    defenseCards = [];
    
    // Draw cards
    drawCardsAfterRound();
    
    // Update Firebase
    updateGameState();
    
    updateUI();
    toggleControls();
    
    // Check if game ended
    checkGameEnd();
});

// End round (all attacks defended)
doneButton.addEventListener('click', () => {
    // Check if it's appropriate to end round
    const playerNumber = playerRole === 1 ? 'player1' : 'player2';
    if (currentPlayer !== playerNumber) {
        statusElement.textContent = "It's not your turn.";
        statusElement.className = 'status warning';
        showToast("It's not your turn", "warning");
        return;
    }
    
    if (currentPlayer === currentAttacker && attackCards.length === 0) {
        statusElement.textContent = "You need to play at least one attack card.";
        statusElement.className = 'status warning';
        showToast("You need to play at least one attack card", "warning");
        return;
    }
    
    if (currentPlayer === currentDefender && attackCards.length !== defenseCards.length) {
        statusElement.textContent = "You need to defend against all attacks first.";
        statusElement.className = 'status warning';
        showToast("You need to defend against all attacks first", "warning");
        return;
    }
    
    // All cards go to discard pile (not to any player)
    attackCards = [];
    defenseCards = [];
    
    // Draw cards
    drawCardsAfterRound();
    
    // Defender becomes attacker for next round
    currentAttacker = currentDefender;
    currentDefender = currentAttacker === 'player1' ? 'player2' : 'player1';
    currentPlayer = currentAttacker;
    
    statusElement.textContent = `${currentAttacker === 'player1' ? 'Player 1' : 'Player 2'}'s turn to attack.`;
    statusElement.className = 'status success';
    showToast(`${currentAttacker === 'player1' ? 'Player 1' : 'Player 2'}'s turn to attack`, "success");
    
    // Update Firebase
    updateGameState();
    
    updateUI();
    toggleControls();
    
    // Check if game ended
    checkGameEnd();
});

// Draw cards after a round
function drawCardsAfterRound() {
    // Attacker draws first, then defender
    drawCardsToHand(currentAttacker === 'player1' ? playerOneHand : playerTwoHand);
    drawCardsToHand(currentDefender === 'player1' ? playerOneHand : playerTwoHand);
}

// Draw cards to hand until it has 6 cards
function drawCardsToHand(hand) {
    while (hand.length < 6 && deck.length > 0) {
        hand.push(drawCard());
    }
    
    // Sort the hand
    sortHand(hand);
}

// Toggle control buttons based on game state
function toggleControls() {
    // Hide all action buttons initially
    takeButton.style.display = 'none';
    doneButton.style.display = 'none';
    foldButton.style.display = 'none';
    
    // Start button only shows if game not active
    startButton.style.display = gameActive ? 'none' : 'inline-block';
    
    // Ready button shows only when waiting for players
    readyButton.style.display = (!gameActive && waitingForPlayers) ? 'inline-block' : 'none';
    
    // If already ready, disable the button
    if (playerRole === 1 && player1Ready) {
        readyButton.disabled = true;
        readyButton.innerHTML = '<i class="fas fa-check-double"></i> Ready ✓';
    } else if (playerRole === 2 && player2Ready) {
        readyButton.disabled = true;
        readyButton.innerHTML = '<i class="fas fa-check-double"></i> Ready ✓';
    } else {
        readyButton.disabled = false;
        readyButton.innerHTML = '<i class="fas fa-check"></i> Ready to Play';
    }
    
    // Show action buttons based on game state
    if (gameActive) {
        const playerNumber = playerRole === 1 ? 'player1' : 'player2';
        
        // Fold button always available during game
        foldButton.style.display = 'inline-block';
        
        // Take button only for defender
        if (playerNumber === currentDefender && currentPlayer === playerNumber) {
            takeButton.style.display = 'inline-block';
        }
        
        // Done button based on situation
        if (
            // Attacker with at least one card played
            (playerNumber === currentAttacker && currentPlayer === playerNumber && attackCards.length > 0) ||
            // Defender with all attacks defended
            (playerNumber === currentDefender && currentPlayer === playerNumber && attackCards.length === defenseCards.length)
        ) {
            doneButton.style.display = 'inline-block';
        }
    }
}

// Check if the game has ended
function checkGameEnd() {
    // Game ends when:
    // 1. Deck is empty
    // 2. One player has no cards
    
    if (deck.length === 0) {
        // Check if any player has no cards
        if (playerOneHand.length === 0) {
            statusElement.textContent = "Player 1 wins! All cards played.";
            statusElement.className = 'status success';
            gameActive = false;
            // Update Firebase
            updateGameState();
            showToast("Player 1 wins!", "success");
            resetForNewGame();
            return true;
        }
        
        if (playerTwoHand.length === 0) {
            statusElement.textContent = "Player 2 wins! All cards played.";
            statusElement.className = 'status success';
            gameActive = false;
            // Update Firebase
            updateGameState();
            showToast("Player 2 wins!", "success");
            resetForNewGame();
            return true;
        }
    }
    
    return false;
}

// Reset for a new game
function resetForNewGame() {
    // Reset ready states
    playersRef.child('player1').update({ ready: false });
    playersRef.child('player2').update({ ready: false });
    
    // Show ready button
    readyButton.disabled = false;
    readyButton.innerHTML = '<i class="fas fa-check"></i> Ready to Play';
    readyButton.style.display = 'inline-block';
    
    // Hide action buttons
    takeButton.style.display = 'none';
    doneButton.style.display = 'none';
    foldButton.style.display = 'none';
    
    // Reset game state
    gameActive = false;
    gameStarted = false;
    waitingForPlayers = true;
    
    // Update Firebase
    gameStateRef.update({
        active: false,
        started: false,
        waitingForPlayers: true
    });
}

// Fold button (surrender)
foldButton.addEventListener('click', () => {
    if (!gameActive) return;
    
    if (confirm('Are you sure you want to fold your cards and forfeit the game?')) {
        // Declare the other player as winner
        if (playerRole === 1) {
            statusElement.textContent = "Player 1 folded. Player 2 wins!";
            statusElement.className = 'status alert';
        } else {
            statusElement.textContent = "Player 2 folded. Player 1 wins!";
            statusElement.className = 'status alert';
        }
        
        // End the game
        gameActive = false;
        
        // Update Firebase
        updateGameState();
        
        // Reset for new game
        resetForNewGame();
        
        showToast('You folded and lost the game', 'warning');
    }
});

// Start a new game
startButton.addEventListener('click', () => {
    if (player1Ready && player2Ready && player1Connected && player2Connected) {
        initGame();
    } else {
        statusElement.textContent = "Both players must be connected and ready to start.";
        statusElement.className = 'status warning';
        showToast("Both players must be connected and ready to start", "warning");
    }
});

// Sync game state button
syncButton.addEventListener('click', () => {
    if (gameStateRef) {
        gameStateRef.once('value', (snapshot) => {
            showToast('Game state synchronized', 'info');
            lastSyncTime = new Date();
            lastSyncTimeElement.textContent = lastSyncTime.toLocaleTimeString();
        });
    }
});

// Back to lobby button
backToLobbyButton.addEventListener('click', () => {
    if (gameActive && !confirm('Going back to the lobby will disconnect you from the current game. Continue?')) {
        return;
    }
    
    // We keep the player role here, just go back to lobby
    inLobby = true;
    returnToLobby();
    
    showToast('Returned to lobby', 'info');
});

// Initialize game with empty deck
showEmptyGame();