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

// Player ready status
let player1Ready = false;
let player2Ready = false;

// Player role (1 or 2)
let playerRole = null;

// Game ID for "connections"
// Generate a game ID or get from localStorage
const gameId = localStorage.getItem('durakGameId') || Math.random().toString(36).substring(2, 10);
localStorage.setItem('durakGameId', gameId);

// Players connected status
let player1Connected = false;
let player2Connected = false;

// Auto-sync interval (2 seconds)
let autoSyncInterval = null;
const AUTO_SYNC_INTERVAL = 2000;

// Last sync timestamp
let lastSyncTime = null;

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

// Add buttons for new features
const readyButton = document.createElement('button');
readyButton.id = 'btn-ready';
readyButton.className = 'btn btn-warning';
readyButton.textContent = 'Ready to Play';
readyButton.style.display = 'none';

const foldButton = document.createElement('button');
foldButton.id = 'btn-fold';
foldButton.className = 'btn btn-danger';
foldButton.textContent = 'Fold Cards';
foldButton.style.display = 'none';

const changePlayerButton = document.createElement('button');
changePlayerButton.id = 'btn-change-player';
changePlayerButton.className = 'btn btn-secondary';
changePlayerButton.textContent = 'Change Player';
changePlayerButton.style.display = 'none';

// Back to lobby button
const backToLobbyButton = document.createElement('button');
backToLobbyButton.id = 'btn-back-to-lobby';
backToLobbyButton.className = 'btn btn-info';
backToLobbyButton.textContent = 'Back to Lobby';
backToLobbyButton.style.display = 'none';

// Disconnect button
const disconnectButton = document.createElement('button');
disconnectButton.id = 'btn-disconnect';
disconnectButton.className = 'btn btn-danger';
disconnectButton.textContent = 'Disconnect';
disconnectButton.style.display = 'none';

// Add the new buttons to the controls section
const controlsSection = document.querySelector('.controls');
controlsSection.appendChild(readyButton);
controlsSection.appendChild(foldButton);
controlsSection.appendChild(changePlayerButton);
controlsSection.appendChild(backToLobbyButton);
controlsSection.appendChild(disconnectButton);

// Create "Back to Game" button for the lobby
const backToGameButton = document.createElement('button');
backToGameButton.id = 'btn-back-to-game';
backToGameButton.className = 'btn btn-success';
backToGameButton.textContent = 'Return to Game';
backToGameButton.style.display = 'none';

// Add Back to Game button to player selection area
const playerButtonsDiv = document.querySelector('.player-buttons');
playerButtonsDiv.appendChild(backToGameButton);

// Display game ID
gameIdElement.textContent = gameId;

// Show waiting area and empty game
function showEmptyGame() {
    // Create empty deck
    if (deck.length === 0) {
        deck = createDeck();
        trumpCard = deck[0];
        trumpSuit = trumpCard.suit;
    }
    
    // Update UI for empty game
    updateEmptyGameUI();
}

// Update UI for empty waiting game
function updateEmptyGameUI() {
    // Update deck count
    deckCountElement.textContent = deck.length;
    
    // Display trump card
    displayCard(trumpCardElement, trumpCard, true);
    
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
    } else if (!player1Ready || !player2Ready) {
        statusElement.textContent = "Waiting for both players to be ready...";
    }
}

// Clear all ready states (useful on page refresh)
function clearAllReadyStates() {
    localStorage.setItem('durakPlayer1Ready', 'false');
    localStorage.setItem('durakPlayer2Ready', 'false');
}

// Check if player role is saved
const savedPlayerRole = localStorage.getItem('durakPlayerRole');
if (savedPlayerRole) {
    playerRole = parseInt(savedPlayerRole);
    inLobby = false;
    // Auto select the saved player role
    selectPlayer();
} else {
    // If no player role is saved, show empty game
    showEmptyGame();
    gameTableDiv.style.display = 'block';
    inLobby = true;
    waitingForPlayers = true;
}

// Check player connections and active game
checkPlayerConnections();
checkActiveGame();

// Update connections every 5 seconds
setInterval(checkPlayerConnections, 5000);

// Check for active game every 2 seconds
setInterval(checkActiveGame, 2000);

// Select player role
playerOneButton.addEventListener('click', () => {
    if (!player1Connected) {
        playerRole = 1;
        localStorage.setItem('durakPlayerRole', playerRole);
        inLobby = false;
        selectPlayer();
    } else {
        alert('Player 1 is already connected!');
    }
});

playerTwoButton.addEventListener('click', () => {
    if (!player2Connected) {
        playerRole = 2;
        localStorage.setItem('durakPlayerRole', playerRole);
        inLobby = false;
        selectPlayer();
    } else {
        alert('Player 2 is already connected!');
    }
});

// Back to Game button handler
backToGameButton.addEventListener('click', () => {
    const gameState = localStorage.getItem('durakGameState');
    const savedRole = localStorage.getItem('durakPlayerRole');
    
    if (gameState && savedRole) {
        playerRole = parseInt(savedRole);
        inLobby = false;
        selectPlayer();
    } else {
        alert('No active game found!');
        backToGameButton.style.display = 'none';
    }
});

// Check if there's an active game to return to
function checkActiveGame() {
    const gameState = localStorage.getItem('durakGameState');
    const savedRole = localStorage.getItem('durakPlayerRole');
    
    if (gameState && savedRole && inLobby) {
        try {
            const parsedState = JSON.parse(gameState);
            
            // Only show the button if there's an active game to return to
            if (parsedState.gameActive || parsedState.waitingForPlayers) {
                backToGameButton.style.display = 'inline-block';
                
                // Show which player they were
                const roleNum = parseInt(savedRole);
                backToGameButton.textContent = `Return to Game as Player ${roleNum}`;
                
                return true;
            }
        } catch (e) {
            console.error("Error checking for active game:", e);
        }
    }
    
    // No active game, hide the button
    backToGameButton.style.display = 'none';
    return false;
}

// Sync game button
syncButton.addEventListener('click', syncGameState);

// Auto-sync checkbox
autoSyncCheckbox.addEventListener('change', function() {
    if (this.checked) {
        startAutoSync();
    } else {
        stopAutoSync();
    }
});

// Ready button
readyButton.addEventListener('click', () => {
    if (playerRole === 1) {
        player1Ready = true;
        localStorage.setItem('durakPlayer1Ready', 'true');
    } else if (playerRole === 2) {
        player2Ready = true;
        localStorage.setItem('durakPlayer2Ready', 'true');
    }
    
    readyButton.disabled = true;
    readyButton.textContent = 'Ready ✓';
    
    statusElement.textContent = 'Waiting for the other player to be ready...';
    
    // Save game state
    saveGameState();
    
    // Force sync to notify other player
    syncGameState();
    
    // Check if both players are ready
    checkBothPlayersReady();
});

// Fold button
foldButton.addEventListener('click', () => {
    if (!gameActive) return;
    
    if (confirm('Are you sure you want to fold your cards and forfeit the game?')) {
        // Declare the other player as winner
        if (playerRole === 1) {
            statusElement.textContent = "Player 1 folded. Player 2 wins!";
        } else {
            statusElement.textContent = "Player 2 folded. Player 1 wins!";
        }
        
        // End the game
        gameActive = false;
        
        // Reset ready states for next game
        resetReadyStates();
        
        // Save the game state
        saveGameState();
        
        // Force sync to notify other player
        syncGameState();
        
        // Update UI
        updateUI();
        toggleControls();
    }
});

// Change Player button
changePlayerButton.addEventListener('click', () => {
    if (gameActive && !confirm('Changing player will disconnect you from the current game. Continue?')) {
        return;
    }
    
    // Remove player connection
    if (playerRole === 1) {
        localStorage.removeItem('durakPlayer1LastActive');
    } else if (playerRole === 2) {
        localStorage.removeItem('durakPlayer2LastActive');
    }
    
    // Clear player role
    localStorage.removeItem('durakPlayerRole');
    playerRole = null;
    
    // Return to lobby
    returnToLobby();
});

// Back to Lobby button
backToLobbyButton.addEventListener('click', () => {
    if (gameActive && !confirm('Going back to the lobby will disconnect you from the current game. Continue?')) {
        return;
    }
    
    // We keep the player role here, just go back to lobby
    inLobby = true;
    returnToLobby();
});

// Disconnect button
disconnectButton.addEventListener('click', () => {
    if (confirm('Are you sure you want to disconnect from the game?')) {
        disconnectPlayer();
        
        // Show a message to let the user know they've been disconnected
        alert('You have been disconnected from the game');
        
        // Update UI to show disconnected state
        statusElement.textContent = "You are disconnected. Choose a player to reconnect.";
        
        // Return to lobby
        inLobby = true;
        returnToLobby();
    }
});

// Disconnect player function
function disconnectPlayer() {
    // Remove player connection marker
    if (playerRole === 1) {
        localStorage.removeItem('durakPlayer1LastActive');
        localStorage.removeItem('durakPlayer1Ready');
        player1Connected = false;
        player1Ready = false;
    } else if (playerRole === 2) {
        localStorage.removeItem('durakPlayer2LastActive');
        localStorage.removeItem('durakPlayer2Ready');
        player2Connected = false;
        player2Ready = false;
    }
    
    // Clear player role
    localStorage.removeItem('durakPlayerRole');
    playerRole = null;
    
    // Update connection status in UI
    checkPlayerConnections();
    
    // Force a sync to notify the other player
    saveGameState();
    syncGameState();
}

// Return to lobby function
function returnToLobby() {
    // Hide game table, show player select
    gameTableDiv.style.display = 'none';
    playerSelectDiv.style.display = 'block';
    connectionInfoDiv.classList.add('hidden');
    
    // Reset UI for next selection
    checkPlayerConnections();
    
    // Check if there's an active game to return to
    checkActiveGame();
    
    inLobby = true;
}

function selectPlayer() {
    // Update connection status
    markPlayerAsConnected(playerRole);
    
    // Update UI
    playerSelectDiv.style.display = 'none';
    gameTableDiv.style.display = 'block';
    connectionInfoDiv.classList.remove('hidden');
    
    // Display player role
    playerRoleDisplay.textContent = playerRole === 1 ? 'Player 1' : 'Player 2';
    
    // Load game state
    loadGameState();
    
    // Check player ready states
    checkPlayerReadyStates();
    
    // If waiting for players and no game active, show empty game
    if (!gameActive && waitingForPlayers) {
        showEmptyGame();
    }
    
    // Show player control buttons
    changePlayerButton.style.display = 'inline-block';
    backToLobbyButton.style.display = 'inline-block';
    disconnectButton.style.display = 'inline-block';
    
    // Setup auto-sync if checked
    if (autoSyncCheckbox.checked) {
        startAutoSync();
    }
    
    inLobby = false;
}

// Check if players are ready
function checkPlayerReadyStates() {
    // Get stored ready states
    player1Ready = localStorage.getItem('durakPlayer1Ready') === 'true';
    player2Ready = localStorage.getItem('durakPlayer2Ready') === 'true';
    
    // Update ready button display
    if ((playerRole === 1 && player1Ready) || (playerRole === 2 && player2Ready)) {
        readyButton.disabled = true;
        readyButton.textContent = 'Ready ✓';
    } else {
        readyButton.disabled = false;
        readyButton.textContent = 'Ready to Play';
    }
    
    // Show ready button if game not active
    if (!gameActive) {
        readyButton.style.display = 'inline-block';
    } else {
        readyButton.style.display = 'none';
    }
    
    // Check if both players are ready
    checkBothPlayersReady();
}

// Check if both players are ready to start
function checkBothPlayersReady() {
    // Get fresh ready states
    player1Ready = localStorage.getItem('durakPlayer1Ready') === 'true';
    player2Ready = localStorage.getItem('durakPlayer2Ready') === 'true';
    
    // Only initialize the game if both players are ready and the game isn't already active
    if (player1Ready && player2Ready && player1Connected && player2Connected && !gameActive && !gameStarted) {
        // Set gameStarted flag to prevent multiple initializations
        gameStarted = true;
        waitingForPlayers = false;
        
        // Initialize game after a short delay to allow syncing
        setTimeout(() => {
            initGame();
            // Hide ready button
            readyButton.style.display = 'none';
        }, 500);
    } else if (!gameActive) {
        // Update the empty UI while waiting
        updateEmptyGameUI();
    }
}

// Mark player as connected
function markPlayerAsConnected(role) {
    const timestamp = new Date().getTime();
    
    if (role === 1) {
        localStorage.setItem('durakPlayer1LastActive', timestamp);
        player1Connected = true;
        player1StatusElement.classList.remove('player-disconnected');
        player1StatusElement.classList.add('player-connected');
        player1StatusGameElement.classList.remove('player-disconnected');
        player1StatusGameElement.classList.add('player-connected');
    } else if (role === 2) {
        localStorage.setItem('durakPlayer2LastActive', timestamp);
        player2Connected = true;
        player2StatusElement.classList.remove('player-disconnected');
        player2StatusElement.classList.add('player-connected');
        player2StatusGameElement.classList.remove('player-disconnected');
        player2StatusGameElement.classList.add('player-connected');
    }
}

// Check player connections
function checkPlayerConnections() {
    const currentTime = new Date().getTime();
    const inactiveThreshold = 60000; // 1 minute
    
    // Previous connection states
    const wasPlayer1Connected = player1Connected;
    const wasPlayer2Connected = player2Connected;
    
    // Check Player 1
    const player1LastActive = localStorage.getItem('durakPlayer1LastActive');
    if (player1LastActive && (currentTime - parseInt(player1LastActive)) < inactiveThreshold) {
        player1Connected = true;
        player1StatusElement.classList.remove('player-disconnected');
        player1StatusElement.classList.add('player-connected');
        player1StatusGameElement.classList.remove('player-disconnected');
        player1StatusGameElement.classList.add('player-connected');
    } else {
        player1Connected = false;
        player1StatusElement.classList.remove('player-connected');
        player1StatusElement.classList.add('player-disconnected');
        player1StatusGameElement.classList.remove('player-connected');
        player1StatusGameElement.classList.add('player-disconnected');
    }
    
    // Check Player 2
    const player2LastActive = localStorage.getItem('durakPlayer2LastActive');
    if (player2LastActive && (currentTime - parseInt(player2LastActive)) < inactiveThreshold) {
        player2Connected = true;
        player2StatusElement.classList.remove('player-disconnected');
        player2StatusElement.classList.add('player-connected');
        player2StatusGameElement.classList.remove('player-disconnected');
        player2StatusGameElement.classList.add('player-connected');
    } else {
        player2Connected = false;
        player2StatusElement.classList.remove('player-connected');
        player2StatusElement.classList.add('player-disconnected');
        player2StatusGameElement.classList.remove('player-connected');
        player2StatusGameElement.classList.add('player-disconnected');
    }
    
    // If currently playing, keep marking as active
    if (playerRole && !inLobby) {
        markPlayerAsConnected(playerRole);
    }
    
    // Update status when waiting for players
    if (waitingForPlayers && !gameActive && !inLobby) {
        updateEmptyGameUI();
    }
    
    // Check if player disconnect/reconnect affects the game
    if (gameActive && !inLobby) {
        if (!player1Connected || !player2Connected) {
            statusElement.textContent = "Game paused: waiting for all players to reconnect...";
        } else if ((!wasPlayer1Connected || !wasPlayer2Connected) && player1Connected && player2Connected) {
            // Both players are now connected, resume game
            statusElement.textContent = `Game resumed. ${currentPlayer === 'player1' ? 'Player 1' : 'Player 2'}'s turn.`;
        }
    } else {
        // Check if both players are ready when they reconnect
        if (player1Connected && player2Connected && !inLobby) {
            checkBothPlayersReady();
        }
    }
}

// Start auto sync
function startAutoSync() {
    if (autoSyncInterval) {
        clearInterval(autoSyncInterval);
    }
    
    autoSyncInterval = setInterval(() => {
        if (autoSyncCheckbox.checked) {
            syncGameState();
        }
    }, AUTO_SYNC_INTERVAL);
}

// Stop auto sync
function stopAutoSync() {
    if (autoSyncInterval) {
        clearInterval(autoSyncInterval);
        autoSyncInterval = null;
    }
}

// Save game state to localStorage
function saveGameState() {
    const gameState = {
        deck: deck,
        playerOneHand: playerOneHand,
        playerTwoHand: playerTwoHand,
        trumpSuit: trumpSuit,
        trumpCard: trumpCard,
        attackCards: attackCards,
        defenseCards: defenseCards,
        currentAttacker: currentAttacker,
        currentDefender: currentDefender,
        currentPlayer: currentPlayer,
        gameActive: gameActive,
        gameStarted: gameStarted,
        waitingForPlayers: waitingForPlayers,
        player1Ready: player1Ready,
        player2Ready: player2Ready
    };
    
    localStorage.setItem('durakGameState', JSON.stringify(gameState));
    localStorage.setItem('durakGameStateTimestamp', new Date().getTime());
}

// Load game state from localStorage
function loadGameState() {
    const gameStateJSON = localStorage.getItem('durakGameState');
    if (gameStateJSON) {
        try {
            const gameState = JSON.parse(gameStateJSON);
            
            deck = gameState.deck || [];
            playerOneHand = gameState.playerOneHand || [];
            playerTwoHand = gameState.playerTwoHand || [];
            trumpSuit = gameState.trumpSuit || '';
            trumpCard = gameState.trumpCard || null;
            attackCards = gameState.attackCards || [];
            defenseCards = gameState.defenseCards || [];
            currentAttacker = gameState.currentAttacker || null;
            currentDefender = gameState.currentDefender || null;
            currentPlayer = gameState.currentPlayer || null;
            gameActive = gameState.gameActive || false;
            gameStarted = gameState.gameStarted || false;
            waitingForPlayers = gameState.waitingForPlayers !== undefined ? gameState.waitingForPlayers : true;
            player1Ready = gameState.player1Ready || false;
            player2Ready = gameState.player2Ready || false;
            
            if (gameActive) {
                updateUI();
            } else if (waitingForPlayers) {
                updateEmptyGameUI();
            }
            
            toggleControls();
            
            return true;
        } catch (e) {
            console.error("Error parsing game state:", e);
            return false;
        }
    }
    
    return false;
}

// Sync game state
function syncGameState() {
    const localTimestamp = localStorage.getItem('durakGameStateTimestamp');
    const remoteTimestamp = localStorage.getItem('durakGameStateTimestamp_remote');
    
    // If local is newer than remote
    if (localTimestamp && (!remoteTimestamp || parseInt(localTimestamp) > parseInt(remoteTimestamp))) {
        // Local is newer, save to remote
        localStorage.setItem('durakGameStateTimestamp_remote', localTimestamp);
        localStorage.setItem('durakGameState_remote', localStorage.getItem('durakGameState'));
    } 
    // If remote is newer than local
    else if (remoteTimestamp && (!localTimestamp || parseInt(remoteTimestamp) > parseInt(localTimestamp))) {
        // Remote is newer, save to local
        localStorage.setItem('durakGameStateTimestamp', remoteTimestamp);
        localStorage.setItem('durakGameState', localStorage.getItem('durakGameState_remote'));
        loadGameState();
    }
    
    // Update last sync time
    lastSyncTime = new Date();
    lastSyncTimeElement.textContent = lastSyncTime.toLocaleTimeString();
    
    // Check player ready status
    checkPlayerReadyStates();
    
    // Check if there's an active game to return to (for lobby display)
    checkActiveGame();
}

// Reset player ready states
function resetReadyStates() {
    player1Ready = false;
    player2Ready = false;
    gameStarted = false;
    localStorage.setItem('durakPlayer1Ready', 'false');
    localStorage.setItem('durakPlayer2Ready', 'false');
    
    // Update ready button
    readyButton.disabled = false;
    readyButton.textContent = 'Ready to Play';
    readyButton.style.display = 'inline-block';
}

// Initialize the game
function initGame() {
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
    waitingForPlayers = false;
    
    // Display status message
    if (currentAttacker === 'player1') {
        statusElement.textContent = "Player 1 attacks first. Select a card to play.";
        turnIndicatorElement.textContent = "Player 1's Turn";
    } else {
        statusElement.textContent = "Player 2 attacks first. Select a card to play.";
        turnIndicatorElement.textContent = "Player 2's Turn";
    }
    
    updateUI();
    toggleControls();
    updatePlayerInfoHighlight();
    
    // Save game state
    saveGameState();
}

// Create a new deck of cards
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
}

// Display a card
function displayCard(container, card, isVisible = true) {
    container.innerHTML = '';
    
    if (!card) return;
    
    const cardElement = document.createElement('div');
    cardElement.className = `card ${isVisible ? card.color : 'card-back'}`;
    cardElement.dataset.suit = card.suit;
    cardElement.dataset.value = card.value;
    
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

// Handle card click
function handleCardClick(card) {
    if (!gameActive) return;
    
    // Check if game is paused due to player disconnection
    if (!player1Connected || !player2Connected) {
        statusElement.textContent = "Cannot play: waiting for all players to reconnect...";
        return;
    }
    
    // Check if it's this player's turn
    const playerNumber = playerRole === 1 ? 'player1' : 'player2';
    if (currentPlayer !== playerNumber) {
        statusElement.textContent = "It's not your turn.";
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
            updateUI();
            toggleControls();
            
            // Save game state after move
            saveGameState();
        } else {
            statusElement.textContent = "You can only play cards with values already in play.";
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
                updateUI();
                toggleControls();
            }
            
            // Save game state after move
            saveGameState();
        } else {
            statusElement.textContent = "This card cannot defend against the attack.";
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
        } else {
            defenseCards.push(card);
            statusElement.textContent = `${currentPlayer === 'player1' ? 'Player 1' : 'Player 2'} defended with ${card.value}${card.suit}`;
        }
        
        updateUI();
        toggleControls();
        
        // Check for win after each card play
        if (checkGameEnd()) {
            return; // Game ended, don't proceed
        }
    }
}

// Take cards action
function takeCards() {
    // Check if it's this player's turn
    const playerNumber = playerRole === 1 ? 'player1' : 'player2';
    if (currentPlayer !== playerNumber || currentPlayer !== currentDefender) {
        statusElement.textContent = "It's not your turn to take cards.";
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
    
    // Attacker remains the same for next round
    currentPlayer = currentAttacker;
    
    // Reset battle area
    attackCards = [];
    defenseCards = [];
    
    // Draw cards
    drawCardsAfterRound();
    
    updateUI();
    toggleControls();
    
    // Save game state
    saveGameState();
    
    // Check if game ended
    checkGameEnd();
}

// End round (all attacks defended)
function endRound() {
    // Check if it's appropriate to end round
    const playerNumber = playerRole === 1 ? 'player1' : 'player2';
    if (currentPlayer !== playerNumber) {
        statusElement.textContent = "It's not your turn.";
        return;
    }
    
    if (currentPlayer === currentAttacker && attackCards.length === 0) {
        statusElement.textContent = "You need to play at least one attack card.";
        return;
    }
    
    if (currentPlayer === currentDefender && attackCards.length !== defenseCards.length) {
        statusElement.textContent = "You need to defend against all attacks first.";
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
    
    updateUI();
    toggleControls();
    
    // Save game state
    saveGameState();
    
    // Check if game ended
    checkGameEnd();
}

// Draw cards after a round
function drawCardsAfterRound() {
    // Attacker draws first
    const attackerHand = currentAttacker === 'player1' ? playerOneHand : playerTwoHand;
    while (attackerHand.length < 6 && deck.length > 0) {
        attackerHand.push(drawCard());
    }
    
    // Then defender
    const defenderHand = currentDefender === 'player1' ? playerOneHand : playerTwoHand;
    while (defenderHand.length < 6 && deck.length > 0) {
        defenderHand.push(drawCard());
    }
    
    sortHand(playerOneHand);
    sortHand(playerTwoHand);
}

// Toggle controls based on game state and player role
function toggleControls() {
    const playerNumber = playerRole === 1 ? 'player1' : 'player2';
    const isPlayerTurn = currentPlayer === playerNumber;
    
    // Hide all buttons by default (except for change player, disconnect and back to lobby)
    takeButton.style.display = 'none';
    doneButton.style.display = 'none';
    startButton.style.display = 'none';
    readyButton.style.display = 'none';
    foldButton.style.display = 'none';
    
    // Always show player control buttons if player is connected
    if (playerRole) {
        changePlayerButton.style.display = 'inline-block';
        backToLobbyButton.style.display = 'inline-block';
        disconnectButton.style.display = 'inline-block';
    } else {
        changePlayerButton.style.display = 'none';
        backToLobbyButton.style.display = 'none';
        disconnectButton.style.display = 'none';
    }
    
    // Show appropriate buttons based on game state and player turn
    if (gameActive) {
        // Show fold button during active game
        foldButton.style.display = 'inline-block';
        
        if (isPlayerTurn) {
            if (currentPlayer === currentDefender && attackCards.length > defenseCards.length) {
                // Defender's turn with attacks to defend
                takeButton.style.display = 'inline-block';
            }
            
            if ((currentPlayer === currentAttacker && attackCards.length > 0) || 
                (currentPlayer === currentDefender && attackCards.length === defenseCards.length)) {
                // Attacker with cards on table or defender who defended all attacks
                doneButton.style.display = 'inline-block';
            }
        }
    } else {
        // Show ready button when game is not active
        if (playerRole) {
            readyButton.style.display = 'inline-block';
        }
        
        // Show start button if game ended and needs to be restarted
        if (playerRole && player1Connected && player2Connected) {
            startButton.style.display = 'inline-block';
        }
    }
}

// Check if game has ended
function checkGameEnd() {
    if (!gameActive) return false;
    
    // Check if a player has no cards left
    if (playerOneHand.length === 0) {
        statusElement.textContent = "Player 1 wins! Player 2 is the durak.";
        gameActive = false;
        gameStarted = false;
        waitingForPlayers = true;
        resetReadyStates();
        toggleControls();
        saveGameState();
        return true;
    } else if (playerTwoHand.length === 0) {
        statusElement.textContent = "Player 2 wins! Player 1 is the durak.";
        gameActive = false;
        gameStarted = false;
        waitingForPlayers = true;
        resetReadyStates();
        toggleControls();
        saveGameState();
        return true;
    }
    
    // Check if deck is empty and one player has no cards
    if (deck.length === 0) {
        // Continue the game until someone wins
        toggleControls();
    }
    
    return false;
}

// Event listeners for buttons
takeButton.addEventListener('click', () => {
    takeCards();
});

doneButton.addEventListener('click', () => {
    if ((currentPlayer === currentDefender && attackCards.length === defenseCards.length) ||
        (currentPlayer === currentAttacker && attackCards.length > 0)) {
        endRound();
    }
});

startButton.addEventListener('click', () => {
    // Reset ready states
    resetReadyStates();
    gameStarted = false;
    waitingForPlayers = true;
    statusElement.textContent = "Waiting for both players to be ready...";
    saveGameState();
    syncGameState(); // Force sync to notify other player
    toggleControls();
});

// Add window closing/reloading event to mark player as disconnected
window.addEventListener('beforeunload', () => {
    if (playerRole === 1) {
        localStorage.removeItem('durakPlayer1LastActive');
    } else if (playerRole === 2) {
        localStorage.removeItem('durakPlayer2LastActive');
    }
});