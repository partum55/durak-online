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

// Game ID for "connections"
// Generate a game ID or get from localStorage
const gameId = localStorage.getItem('durakGameId') || Math.random().toString(36).substring(2, 10);
localStorage.setItem('durakGameId', gameId);

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

// Game state update timestamps
let lastStateUpdate = Date.now();
const STATE_UPDATE_COOLDOWN = 300; // ms between state updates to prevent race conditions

// Create toast container
const toastContainer = document.createElement('div');
toastContainer.className = 'toast-container';
document.body.appendChild(toastContainer);

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

// Reconnect button
const reconnectButton = document.createElement('button');
reconnectButton.id = 'btn-reconnect';
reconnectButton.className = 'btn btn-primary';
reconnectButton.textContent = 'Reconnect';
reconnectButton.style.display = 'none';

// Help button for rules
const helpButton = document.createElement('button');
helpButton.id = 'btn-help';
helpButton.className = 'btn btn-info';
helpButton.textContent = 'Game Rules';
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
backToGameButton.textContent = 'Return to Game';
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
    const dialog = document.createElement('div');
    dialog.className = 'instructions-dialog';
    dialog.id = 'instructions-dialog';
    
    dialog.innerHTML = `
        <div class="instructions-content">
            <div class="instructions-header">
                <h2>Durak Card Game Rules</h2>
                <button class="close-button" id="close-instructions">&times;</button>
            </div>
            
            <div class="instructions-section">
                <h3>Overview</h3>
                <p>Durak (which means "fool" in Russian) is a popular card game where the goal is to get rid of all your cards. The last player with cards is the "Durak" (Fool).</p>
            </div>
            
            <div class="instructions-section">
                <h3>Setup</h3>
                <ul>
                    <li>The game uses a 36-card deck (from 6 to Ace in each suit).</li>
                    <li>Each player initially receives 6 cards.</li>
                    <li>The last card in the deck is turned face up to determine the trump suit, which beats all other suits.</li>
                </ul>
            </div>
            
            <div class="instructions-section">
                <h3>Gameplay</h3>
                <ul>
                    <li><strong>Attack:</strong> The attacker starts by playing any card from their hand.</li>
                    <li><strong>Defense:</strong> The defender must beat each attack card with a higher card of the same suit or any trump card.</li>
                    <li><strong>Additional Attacks:</strong> If the defender successfully defends, the attacker can add more cards of the same ranks already in play.</li>
                    <li><strong>Taking Cards:</strong> If the defender cannot or does not want to defend, they must take all cards played in that round.</li>
                    <li><strong>Drawing:</strong> After each round, players draw cards to have at least 6 cards (attacker draws first).</li>
                    <li><strong>End of Round:</strong> If all attacks are defended, all played cards are discarded and the defender becomes the next attacker.</li>
                </ul>
            </div>
            
            <div class="instructions-section">
                <h3>Winning</h3>
                <p>The game continues until the deck is exhausted and one player has no cards left. The player who still has cards is the "Durak" (Fool) and loses the game.</p>
            </div>
            
            <div class="instructions-footer">
                <button class="btn btn-success" id="got-it-button">Got it!</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(dialog);
    
    // Event listeners for dialog buttons
    document.getElementById('close-instructions').addEventListener('click', () => {
        document.getElementById('instructions-dialog').classList.remove('show');
    });
    
    document.getElementById('got-it-button').addEventListener('click', () => {
        document.getElementById('instructions-dialog').classList.remove('show');
    });
}

// Show game rules
helpButton.addEventListener('click', () => {
    document.getElementById('instructions-dialog').classList.add('show');
});

// Set up session tracking with ping mechanism
function setupConnectionPing() {
    // Create a unique ID for this session
    const sessionId = Math.random().toString(36).substring(2, 15);
    localStorage.setItem('durakSessionId', sessionId);
    
    // Ping function to update last active time
    function pingConnection() {
        if (playerRole === 1) {
            localStorage.setItem('durakPlayer1LastActive', new Date().getTime());
        } else if (playerRole === 2) {
            localStorage.setItem('durakPlayer2LastActive', new Date().getTime());
        }
        
        // Also update session ID to show this is the active session
        if (playerRole) {
            localStorage.setItem(`durakPlayer${playerRole}SessionId`, sessionId);
        }
    }
    
    // Initial ping
    pingConnection();
    
    // Set up interval for continuous pings
    return setInterval(pingConnection, 2000);
}

// Connection ping interval
let connectionPingInterval = null;

// Track user interaction for auto-refresh safety
document.addEventListener('click', () => {
    lastInteractionTime = Date.now();
});

document.addEventListener('touchstart', () => {
    lastInteractionTime = Date.now();
});

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

// Update UI for empty waiting game
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

// Clear all ready states (useful on page refresh)
function clearAllReadyStates() {
    localStorage.setItem('durakPlayer1Ready', 'false');
    localStorage.setItem('durakPlayer2Ready', 'false');
}

// Initialize game state
(function initializeGame() {
    // Update connection indicator
    updateConnectionIndicator();
    
    // Check if player role is saved
    const savedPlayerRole = localStorage.getItem('durakPlayerRole');
    if (savedPlayerRole) {
        playerRole = parseInt(savedPlayerRole);
        inLobby = false;
        
        // Start connection ping
        connectionPingInterval = setupConnectionPing();
        
        // Auto select the saved player role
        selectPlayer();
    } else {
        // If no player role is saved, show empty game in lobby
        showEmptyGame();
        gameTableDiv.style.display = 'block';
        inLobby = true;
        waitingForPlayers = true;
    }
    
    // Check player connections
    checkPlayerConnections();
    checkActiveGame();
    
    // Start connection checking interval
    startConnectionChecking();
})();

// Start connection checking
function startConnectionChecking() {
    // Clear any existing interval
    if (connectionCheckInterval) {
        clearInterval(connectionCheckInterval);
    }
    
    // Check connections every 3 seconds
    connectionCheckInterval = setInterval(() => {
        checkPlayerConnections();
        updateConnectionIndicator();
        
        // If in lobby, also check for active game
        if (inLobby) {
            checkActiveGame();
        }
    }, CONNECTION_CHECK_INTERVAL);
}

// Select player role
playerOneButton.addEventListener('click', () => {
    if (!player1Connected) {
        playerRole = 1;
        localStorage.setItem('durakPlayerRole', playerRole);
        inLobby = false;
        
        // Start connection ping
        connectionPingInterval = setupConnectionPing();
        
        selectPlayer();
        showToast('You joined as Player 1', 'success');
    } else {
        const currentSessionId = localStorage.getItem('durakPlayer1SessionId');
        const mySessionId = localStorage.getItem('durakSessionId');
        
        // If it's the same session, allow to continue as this player
        if (currentSessionId === mySessionId) {
            playerRole = 1;
            localStorage.setItem('durakPlayerRole', playerRole);
            inLobby = false;
            selectPlayer();
            showToast('Resumed as Player 1', 'info');
        } else {
            showToast('Player 1 is already connected from another device or browser!', 'error');
        }
    }
});

playerTwoButton.addEventListener('click', () => {
    if (!player2Connected) {
        playerRole = 2;
        localStorage.setItem('durakPlayerRole', playerRole);
        inLobby = false;
        
        // Start connection ping
        connectionPingInterval = setupConnectionPing();
        
        selectPlayer();
        showToast('You joined as Player 2', 'success');
    } else {
        const currentSessionId = localStorage.getItem('durakPlayer2SessionId');
        const mySessionId = localStorage.getItem('durakSessionId');
        
        // If it's the same session, allow to continue as this player
        if (currentSessionId === mySessionId) {
            playerRole = 2;
            localStorage.setItem('durakPlayerRole', playerRole);
            inLobby = false;
            selectPlayer();
            showToast('Resumed as Player 2', 'info');
        } else {
            showToast('Player 2 is already connected from another device or browser!', 'error');
        }
    }
});

// Back to Game button handler
backToGameButton.addEventListener('click', () => {
    const gameState = localStorage.getItem('durakGameState');
    const savedRole = localStorage.getItem('durakPlayerRole');
    
    if (gameState && savedRole) {
        playerRole = parseInt(savedRole);
        inLobby = false;
        
        // Start connection ping
        if (!connectionPingInterval) {
            connectionPingInterval = setupConnectionPing();
        }
        
        selectPlayer();
        showToast('Returned to game', 'success');
    } else {
        showToast('No active game found!', 'error');
        backToGameButton.style.display = 'none';
    }
});

// Reconnect player
reconnectButton.addEventListener('click', () => {
    reconnectPlayer();
});

function reconnectPlayer() {
    if (playerRole) {
        // Update connection status
        markPlayerAsConnected(playerRole);
        
        // Restart connection ping
        if (connectionPingInterval) {
            clearInterval(connectionPingInterval);
        }
        connectionPingInterval = setupConnectionPing();
        
        // Update UI
        statusElement.textContent = "Reconnected! Game will resume shortly...";
        statusElement.className = 'status success';
        reconnectButton.style.display = 'none';
        
        // Sync game state
        syncGameState();
        
        // Hide reconnect button
        reconnectButton.style.display = 'none';
        
        showToast('Successfully reconnected to the game', 'success');
    } else {
        statusElement.textContent = "Please select a player to connect.";
        statusElement.className = 'status warning';
    }
}

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
                
                // Check if that player is still connected
                if ((roleNum === 1 && !player1Connected) || (roleNum === 2 && !player2Connected)) {
                    backToGameButton.textContent += " (Reconnect)";
                }
                
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
syncButton.addEventListener('click', () => {
    syncGameState();
    showToast('Game state synchronized', 'info');
});

// Auto-sync checkbox
autoSyncCheckbox.addEventListener('change', function() {
    if (this.checked) {
        startAutoSync();
        showToast('Auto-sync enabled', 'info');
    } else {
        stopAutoSync();
        showToast('Auto-sync disabled', 'info');
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
    statusElement.className = 'status warning';
    
    // Save game state
    saveGameState();
    
    // Force sync to notify other player
    syncGameState();
    
    // Check if both players are ready
    checkBothPlayersReady();
    
    showToast('You are ready to play!', 'success');
});

// Fold button
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
        
        // Reset ready states for next game
        resetReadyStates();
        
        // Save the game state
        saveGameState();
        
        // Force sync to notify other player
        syncGameState();
        
        // Update UI
        updateUI();
        toggleControls();
        
        showToast('You folded and lost the game', 'warning');
    }
});

// Change Player button
changePlayerButton.addEventListener('click', () => {
    if (gameActive && !confirm('Changing player will disconnect you from the current game. Continue?')) {
        return;
    }
    
    // Properly disconnect
    disconnectPlayer();
    
    // Return to lobby
    returnToLobby();
    
    showToast('Changed player', 'info');
});

// Back to Lobby button
backToLobbyButton.addEventListener('click', () => {
    if (gameActive && !confirm('Going back to the lobby will disconnect you from the current game. Continue?')) {
        return;
    }
    
    // We keep the player role here, just go back to lobby
    inLobby = true;
    returnToLobby();
    
    showToast('Returned to lobby', 'info');
});

// Disconnect button
disconnectButton.addEventListener('click', () => {
    if (confirm('Are you sure you want to disconnect from the game?')) {
        disconnectPlayer();
        
        // Show a message to let the user know they've been disconnected
        showToast('You have been disconnected from the game', 'error');
        
        // Update UI to show disconnected state
        statusElement.textContent = "You are disconnected. Choose a player to reconnect.";
        statusElement.className = 'status alert';
        
        // Return to lobby
        inLobby = true;
        returnToLobby();
    }
});

// Disconnect player function
function disconnectPlayer() {
    // Stop connection ping
    if (connectionPingInterval) {
        clearInterval(connectionPingInterval);
        connectionPingInterval = null;
    }
    
    // Remove player connection marker
    if (playerRole === 1) {
        localStorage.removeItem('durakPlayer1LastActive');
        localStorage.removeItem('durakPlayer1SessionId');
        localStorage.removeItem('durakPlayer1Ready');
        player1Connected = false;
        player1Ready = false;
    } else if (playerRole === 2) {
        localStorage.removeItem('durakPlayer2LastActive');
        localStorage.removeItem('durakPlayer2SessionId');
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
    helpButton.style.display = 'inline-block';
    
    // Hide reconnect button
    reconnectButton.style.display = 'none';
    
    // Setup auto-sync if checked
    if (autoSyncCheckbox.checked) {
        startAutoSync();
    }
    
    inLobby = false;
    
    // Highlight player's own hand
    highlightPlayerHand();
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
            showToast('Game is starting!', 'success');
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
        updatePlayerStatusDisplay();
    } else if (role === 2) {
        localStorage.setItem('durakPlayer2LastActive', timestamp);
        player2Connected = true;
        updatePlayerStatusDisplay();
    }
}

// Check player connections
function checkPlayerConnections() {
    const currentTime = new Date().getTime();
    const inactiveThreshold = 10000; // 10 seconds
    
    // Previous connection states
    const wasPlayer1Connected = player1Connected;
    const wasPlayer2Connected = player2Connected;
    
    // Check Player 1
    const player1LastActive = localStorage.getItem('durakPlayer1LastActive');
    if (player1LastActive && (currentTime - parseInt(player1LastActive)) < inactiveThreshold) {
        player1Connected = true;
    } else {
        player1Connected = false;
    }
    
    // Check Player 2
    const player2LastActive = localStorage.getItem('durakPlayer2LastActive');
    if (player2LastActive && (currentTime - parseInt(player2LastActive)) < inactiveThreshold) {
        player2Connected = true;
    } else {
        player2Connected = false;
    }
    
    // Update the player status displays
    updatePlayerStatusDisplay();
    
    // Check if current player is connected
    let currentlyConnected = false;
    if (playerRole === 1 && player1Connected) currentlyConnected = true;
    if (playerRole === 2 && player2Connected) currentlyConnected = true;
    
    // If currently playing and not in lobby, keep marking as active
    if (playerRole && !inLobby) {
        // If my connection was lost (but we have playerRole), show reconnect button
        if (!currentlyConnected) {
            reconnectButton.style.display = 'inline-block';
            statusElement.textContent = "Connection lost. Please reconnect to continue.";
            statusElement.className = 'status alert';
        } else {
            markPlayerAsConnected(playerRole);
            reconnectButton.style.display = 'none';
        }
    }
    
    // Update status when waiting for players
    if (waitingForPlayers && !gameActive && !inLobby) {
        updateEmptyGameUI();
    }
    
    // Check if player disconnect/reconnect affects the game
    if (gameActive && !inLobby) {
        if (!player1Connected || !player2Connected) {
            statusElement.textContent = "Game paused: waiting for all players to reconnect...";
            statusElement.className = 'status warning';
            battleAreaElement.classList.remove('active');
        } else if ((!wasPlayer1Connected || !wasPlayer2Connected) && player1Connected && player2Connected) {
            // Both players are now connected, resume game
            statusElement.textContent = `Game resumed. ${currentPlayer === 'player1' ? 'Player 1' : 'Player 2'}'s turn.`;
            statusElement.className = 'status success';
            battleAreaElement.classList.add('active');
            showToast('All players connected. Game resumed!', 'success');
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
    // Prevent too frequent updates (race conditions)
    const now = Date.now();
    if (now - lastStateUpdate < STATE_UPDATE_COOLDOWN) {
        return;
    }
    lastStateUpdate = now;
    
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
    
    try {
        localStorage.setItem('durakGameState', JSON.stringify(gameState));
        localStorage.setItem('durakGameStateTimestamp', new Date().getTime());
    } catch (e) {
        console.error("Error saving game state:", e);
        showToast("Error saving game state. Your browser storage might be full.", "error");
    }
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
                
                // Highlight battle area if game is active
                battleAreaElement.classList.add('active');
            } else if (waitingForPlayers) {
                updateEmptyGameUI();
                
                // Remove highlight from battle area
                battleAreaElement.classList.remove('active');
            }
            
            toggleControls();
            
            return true;
        } catch (e) {
            console.error("Error parsing game state:", e);
            
            // Attempt to recover
            try {
                localStorage.removeItem('durakGameState');
                localStorage.removeItem('durakGameStateTimestamp');
                showToast("Game state was corrupted and has been reset.", "error");
            } catch (clearError) {
                console.error("Could not clear corrupted state:", clearError);
            }
            
            return false;
        }
    }
    
    return false;
}

// Sync game state - improved to handle potential race conditions
function syncGameState() {
    // Don't sync if offline
    if (!navigator.onLine) {
        lastSyncTimeElement.textContent = "Offline";
        return;
    }
    
    // Don't sync if there was recent user interaction (to prevent race conditions)
    const timeSinceLastInteraction = Date.now() - lastInteractionTime;
    if (timeSinceLastInteraction < 500) {
        return;
    }
    
    try {
        const localTimestamp = localStorage.getItem('durakGameStateTimestamp');
        const remoteTimestamp = localStorage.getItem('durakGameStateTimestamp_remote');
        
        // Get the local game state
        const localGameState = localStorage.getItem('durakGameState');
        const remoteGameState = localStorage.getItem('durakGameState_remote');
        
        // If both states exist, compare and use the newer one
        if (localGameState && remoteGameState) {
            // If local is newer than remote
            if (localTimestamp && (!remoteTimestamp || parseInt(localTimestamp) > parseInt(remoteTimestamp))) {
                // Local is newer, save to remote
                localStorage.setItem('durakGameStateTimestamp_remote', localTimestamp);
                localStorage.setItem('durakGameState_remote', localGameState);
            } 
            // If remote is newer than local
            else if (remoteTimestamp && (!localTimestamp || parseInt(remoteTimestamp) > parseInt(localTimestamp))) {
                // Remote is newer, save to local
                localStorage.setItem('durakGameStateTimestamp', remoteTimestamp);
                localStorage.setItem('durakGameState', remoteGameState);
                loadGameState();
            }
        }
        // If only one exists, use that one
        else if (localGameState) {
            localStorage.setItem('durakGameState_remote', localGameState);
            localStorage.setItem('durakGameStateTimestamp_remote', localTimestamp || new Date().getTime());
        }
        else if (remoteGameState) {
            localStorage.setItem('durakGameState', remoteGameState);
            localStorage.setItem('durakGameStateTimestamp', remoteTimestamp || new Date().getTime());
            loadGameState();
        }
        
        // Update last sync time
        lastSyncTime = new Date();
        lastSyncTimeElement.textContent = lastSyncTime.toLocaleTimeString();
        
        // Check player ready status
        checkPlayerReadyStates();
        
        // Check if there's an active game to return to (for lobby display)
        checkActiveGame();
    } catch (e) {
        console.error("Error syncing game state:", e);
        lastSyncTimeElement.textContent = "Error";
    }
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
            updateUI();
            toggleControls();
            
            // Save game state after move
            saveGameState();
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
                updateUI();
                toggleControls();
            }
            
            // Save game state after move
            saveGameState();
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
            showToast(`${currentPlayer === 'player1' ? 'Player 1' : 'Player 2'} attacked with ${card.value}${card.suit}`, "info");
        } else {
            defenseCards.push(card);
            statusElement.textContent = `${currentPlayer === 'player1' ? 'Player 1' : 'Player 2'} defended with ${card.value}${card.suit}`;
            statusElement.className = 'status';
            showToast(`${currentPlayer === 'player1' ? 'Player 1' : 'Player 2'} defended with ${card.value}${card.suit}`, "info");
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
    // Update last interaction time
    lastInteractionTime = Date.now();
    
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
    
    updateUI();
    toggleControls();
    
    // Save game state
    saveGameState();
    
    // Check if game ended
    checkGameEnd();
}

// End round (all attacks defended)
function endRound() {
    // Update last interaction time
    lastInteractionTime = Date.now();
    
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
    
    updateUI();
    toggleControls();
    
    // Save game state
    saveGameState();
    
    // Check if game ended
    checkGameEnd();
}