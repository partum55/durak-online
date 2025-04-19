// Add this to the top of your script.js file
// Define JSON storage API for cross-device communication
const STORAGE_API_KEY = "durak-game-with-love"; // Replace with a unique identifier for your app
const STORAGE_API_URL = `https://api.jsonbin.io/v3/b`;
let binId = localStorage.getItem('durakGameBinId');

// Create or load a shared storage bin
async function initializeSharedStorage() {
    // If we already have a bin ID, use it
    if (binId) {
        return binId;
    }
    
    try {
        // Create a new bin
        const response = await fetch(STORAGE_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': '$2a$10$rW9BOsST1W9H0Ajn4.yxEe12FbnQfDIOX/0iiwje5syCKQu5DXvPi', // Replace with your actual API key
                'X-Bin-Name': `durak-game-${gameId}`
            },
            body: JSON.stringify({
                gameId: gameId,
                player1Connected: false,
                player2Connected: false,
                player1Ready: false,
                player2Ready: false,
                lastUpdate: new Date().getTime(),
                gameState: null
            })
        });
        
        const data = await response.json();
        binId = data.metadata.id;
        localStorage.setItem('durakGameBinId', binId);
        return binId;
    } catch (error) {
        console.error("Error creating shared storage:", error);
        showToast("Error setting up online connection. Falling back to local mode.", "error");
        return null;
    }
}

// Update the shared storage
async function updateSharedStorage(updates) {
    if (!binId) return;
    
    try {
        // First get the current state
        const currentState = await getSharedStorage();
        if (!currentState) return;
        
        // Merge updates with current state
        const newState = { ...currentState, ...updates, lastUpdate: new Date().getTime() };
        
        // Update the bin
        await fetch(`${STORAGE_API_URL}/${binId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': '$2a$10$YourAPIKeyHere' // Replace with your actual API key
            },
            body: JSON.stringify(newState)
        });
        
        return true;
    } catch (error) {
        console.error("Error updating shared storage:", error);
        return false;
    }
}

// Get the shared storage
async function getSharedStorage() {
    if (!binId) return null;
    
    try {
        const response = await fetch(`${STORAGE_API_URL}/${binId}`, {
            method: 'GET',
            headers: {
                'X-Master-Key': '$2a$10$YourAPIKeyHere' // Replace with your actual API key
            }
        });
        
        const data = await response.json();
        return data.record;
    } catch (error) {
        console.error("Error getting shared storage:", error);
        return null;
    }
}

// Modify the markPlayerAsConnected function to use the shared storage
async function markPlayerAsConnected(role) {
    const timestamp = new Date().getTime();
    
    // Update localStorage for local UI
    if (role === 1) {
        localStorage.setItem('durakPlayer1LastActive', timestamp);
        player1Connected = true;
    } else if (role === 2) {
        localStorage.setItem('durakPlayer2LastActive', timestamp);
        player2Connected = true;
    }
    
    // Update the shared storage
    await updateSharedStorage({
        [`player${role}Connected`]: true,
        [`player${role}LastActive`]: timestamp
    });
    
    updatePlayerStatusDisplay();
}

// Modify the disconnectPlayer function
async function disconnectPlayer() {
    // Stop connection ping
    if (connectionPingInterval) {
        clearInterval(connectionPingInterval);
        connectionPingInterval = null;
    }
    
    // Remove player connection marker from localStorage
    if (playerRole === 1) {
        localStorage.removeItem('durakPlayer1LastActive');
        localStorage.removeItem('durakPlayer1SessionId');
        localStorage.removeItem('durakPlayer1Ready');
        player1Connected = false;
        player1Ready = false;
        
        // Update shared storage
        await updateSharedStorage({
            player1Connected: false,
            player1Ready: false
        });
    } else if (playerRole === 2) {
        localStorage.removeItem('durakPlayer2LastActive');
        localStorage.removeItem('durakPlayer2SessionId');
        localStorage.removeItem('durakPlayer2Ready');
        player2Connected = false;
        player2Ready = false;
        
        // Update shared storage
        await updateSharedStorage({
            player2Connected: false,
            player2Ready: false
        });
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

// Modify the checkPlayerConnections function
async function checkPlayerConnections() {
    const currentTime = new Date().getTime();
    const inactiveThreshold = 10000; // 10 seconds
    
    // Previous connection states
    const wasPlayer1Connected = player1Connected;
    const wasPlayer2Connected = player2Connected;
    
    // Get the shared storage state
    const sharedState = await getSharedStorage();
    
    if (sharedState) {
        // Update connection states from shared storage
        if (sharedState.player1LastActive && (currentTime - sharedState.player1LastActive) < inactiveThreshold) {
            player1Connected = true;
            // Update local storage for UI consistency
            localStorage.setItem('durakPlayer1LastActive', sharedState.player1LastActive);
        } else {
            player1Connected = false;
        }
        
        if (sharedState.player2LastActive && (currentTime - sharedState.player2LastActive) < inactiveThreshold) {
            player2Connected = true;
            // Update local storage for UI consistency
            localStorage.setItem('durakPlayer2LastActive', sharedState.player2LastActive);
        } else {
            player2Connected = false;
        }
        
        // Update player ready states
        player1Ready = sharedState.player1Ready || false;
        player2Ready = sharedState.player2Ready || false;
        
        // Update local storage for consistency
        localStorage.setItem('durakPlayer1Ready', player1Ready ? 'true' : 'false');
        localStorage.setItem('durakPlayer2Ready', player2Ready ? 'true' : 'false');
    } else {
        // Fall back to localStorage if shared storage fails
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

// Modify the setupConnectionPing function
function setupConnectionPing() {
    // Create a unique ID for this session
    const sessionId = Math.random().toString(36).substring(2, 15);
    localStorage.setItem('durakSessionId', sessionId);
    
    // Ping function to update last active time
    async function pingConnection() {
        if (playerRole === 1) {
            const timestamp = new Date().getTime();
            localStorage.setItem('durakPlayer1LastActive', timestamp);
            await updateSharedStorage({
                player1Connected: true,
                player1LastActive: timestamp
            });
        } else if (playerRole === 2) {
            const timestamp = new Date().getTime();
            localStorage.setItem('durakPlayer2LastActive', timestamp);
            await updateSharedStorage({
                player2Connected: true,
                player2LastActive: timestamp
            });
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

// Modify the saveGameState function
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
        const gameStateJSON = JSON.stringify(gameState);
        localStorage.setItem('durakGameState', gameStateJSON);
        localStorage.setItem('durakGameStateTimestamp', new Date().getTime());
        
        // Also save to shared storage
        updateSharedStorage({
            gameState: gameStateJSON,
            gameStateTimestamp: new Date().getTime()
        });
    } catch (e) {
        console.error("Error saving game state:", e);
        showToast("Error saving game state. Your browser storage might be full.", "error");
    }
}

// Modify the syncGameState function
async function syncGameState() {
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
        // Get the shared storage state
        const sharedState = await getSharedStorage();
        
        if (sharedState && sharedState.gameState) {
            const localTimestamp = localStorage.getItem('durakGameStateTimestamp');
            const remoteTimestamp = sharedState.gameStateTimestamp;
            
            // If remote is newer than local
            if (remoteTimestamp && (!localTimestamp || parseInt(remoteTimestamp) > parseInt(localTimestamp))) {
                // Remote is newer, save to local
                localStorage.setItem('durakGameState', sharedState.gameState);
                localStorage.setItem('durakGameStateTimestamp', remoteTimestamp);
                loadGameState();
            } else if (localTimestamp && (!remoteTimestamp || parseInt(localTimestamp) > parseInt(remoteTimestamp))) {
                // Local is newer, update remote
                await updateSharedStorage({
                    gameState: localStorage.getItem('durakGameState'),
                    gameStateTimestamp: localTimestamp
                });
            }
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

// Modify the player select buttons to initialize shared storage
playerOneButton.addEventListener('click', async () => {
    await initializeSharedStorage();
    
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

playerTwoButton.addEventListener('click', async () => {
    await initializeSharedStorage();
    
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

// Modify the initializeGame function to check for shared storage
(async function initializeGame() {
    // Check if a bin ID already exists
    if (localStorage.getItem('durakGameBinId')) {
        binId = localStorage.getItem('durakGameBinId');
    }
    
    // Update connection indicator
    updateConnectionIndicator();
    
    // Check if player role is saved
    const savedPlayerRole = localStorage.getItem('durakPlayerRole');
    if (savedPlayerRole) {
        playerRole = parseInt(savedPlayerRole);
        inLobby = false;
        
        // Initialize shared storage if needed
        await initializeSharedStorage();
        
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
    await checkPlayerConnections();
    checkActiveGame();
    
    // Start connection checking interval
    startConnectionChecking();
})();

// Modify the startConnectionChecking function
function startConnectionChecking() {
    // Clear any existing interval
    if (connectionCheckInterval) {
        clearInterval(connectionCheckInterval);
    }
    
    // Check connections every 3 seconds
    connectionCheckInterval = setInterval(async () => {
        await checkPlayerConnections();
        updateConnectionIndicator();
        
        // If in lobby, also check for active game
        if (inLobby) {
            checkActiveGame();
        }
    }, CONNECTION_CHECK_INTERVAL);
}

// Modify the readyButton event listener
readyButton.addEventListener('click', async () => {
    if (playerRole === 1) {
        player1Ready = true;
        localStorage.setItem('durakPlayer1Ready', 'true');
        await updateSharedStorage({ player1Ready: true });
    } else if (playerRole === 2) {
        player2Ready = true;
        localStorage.setItem('durakPlayer2Ready', 'true');
        await updateSharedStorage({ player2Ready: true });
    }
    
    readyButton.disabled = true;
    readyButton.textContent = 'Ready ✓';
    
    statusElement.textContent = 'Waiting for the other player to be ready...';
    statusElement.className = 'status warning';
    
    // Save game state
    saveGameState();
    
    // Force sync to notify other player
    await syncGameState();
    
    // Check if both players are ready
    checkBothPlayersReady();
    
    showToast('You are ready to play!', 'success');
});