// CONFIG is loaded from shared/config.js

const config = {
    type: Phaser.AUTO,
    scale: {
        mode: Phaser.Scale.RESIZE,
        parent: 'game-container',
        width: '100%',
        height: '100%'
    },
    physics: {
        default: 'arcade',
        arcade: {
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    },
    disableContextMenu: true,
    // Keep game running when tab is not focused
    pauseOnBlur: false
};

const game = new Phaser.Game(config);

// Game state
let socket;
let currentScene;
let mainPlayer;
let otherPlayers = {};
let resources = {};
let droppedItems = {};
let inventoryUI;
let gameMap = [];
let pathDots = []; // Visual path indicators

function preload() {
    // Load tileset - 16x16 grid, each tile is 128x128 pixels
    this.load.spritesheet('tileset', 'assets/Grassland.png', {
        frameWidth: 128,
        frameHeight: 128
    });

    // Add error handler for loading
    this.load.on('loaderror', (file) => {
        console.error('Error loading file:', file.src);
    });
}

function create() {
    currentScene = this;

    this.physics.world.setBounds(0, 0, CONFIG.WORLD_WIDTH * CONFIG.TILE_SIZE, CONFIG.WORLD_HEIGHT * CONFIG.TILE_SIZE);

    // Initialize systems
    // Note: PathFinder is now server-side for authoritative movement
    inventoryUI = new InventoryUI();
    inventoryUI.setDropItemCallback((slotIndex) => {
        if (socket) {
            socket.emit('dropItem', { slotIndex });
        }
    });
    inventoryUI.setSwapItemsCallback((fromSlot, toSlot) => {
        if (socket) {
            socket.emit('swapItems', { fromSlot, toSlot });
        }
    });

    // Setup socket connection
    setupSocketConnection(this);

    // Setup input handlers
    setupInputHandlers(this);
}

function setupSocketConnection(scene) {
    console.log('Setting up socket connection...');
    socket = io('http://localhost:3000');

    socket.on('connect', () => {
        console.log('Socket connected! ID:', socket.id);
    });

    socket.on('disconnect', () => {
        console.log('Socket disconnected!');
    });

    socket.on('mapData', (mapData) => {
        console.log('Received map data:', mapData.length, 'rows');
        generateMap(scene, mapData);
    });

    socket.on('currentPlayers', (players) => {
        console.log('Received currentPlayers:', Object.keys(players).length, 'players');
        Object.keys(players).forEach((id) => {
            if (id === socket.id) {
                console.log('Creating main player:', players[id]);
                mainPlayer = new Player(scene, players[id], true);
                console.log('Main player created successfully!', mainPlayer);
                if (players[id].inventory) {
                    inventoryUI.update(players[id].inventory);
                }

                // Center camera on player with smooth following
                scene.cameras.main.startFollow(mainPlayer.sprite, true, 0.2, 0.2);
                scene.cameras.main.setFollowOffset(0, 0);

                // Ensure camera is centered immediately
                scene.cameras.main.centerOn(mainPlayer.sprite.x, mainPlayer.sprite.y);

                socket.emit('requestMap');
                socket.emit('requestResources');
                socket.emit('requestDroppedItems');
            } else {
                console.log('Creating other player:', id);
                otherPlayers[id] = new Player(scene, players[id], false);
            }
        });
        updatePlayerCount();
    });

    socket.on('newPlayer', (playerInfo) => {
        if (playerInfo.id !== socket.id) {
            otherPlayers[playerInfo.id] = new Player(scene, playerInfo, false);
            updatePlayerCount();
        }
    });

    socket.on('playerMoved', (playerData) => {
        if (otherPlayers[playerData.id]) {
            otherPlayers[playerData.id].updatePosition(playerData.x, playerData.y);
        }
    });

    socket.on('playerDisconnected', (playerId) => {
        if (otherPlayers[playerId]) {
            otherPlayers[playerId].destroy();
            delete otherPlayers[playerId];
            updatePlayerCount();
        }
    });

    socket.on('resourcesData', (resourcesData) => {
        resourcesData.forEach(resourceData => {
            createResource(scene, resourceData);
        });
    });

    socket.on('resourceGathered', (data) => {
        removeResource(data.resourceId);
    });

    socket.on('inventoryUpdate', (newInventory) => {
        if (mainPlayer) {
            mainPlayer.updateInventory(newInventory);
        }
        inventoryUI.update(newInventory);
    });

    // Listen for path updates from server
    socket.on('playerPath', (data) => {
        const { playerId, path, targetResourceId } = data;
        console.log(`Received path for player ${playerId}:`, path?.length, 'waypoints');

        const player = playerId === socket.id ? mainPlayer : otherPlayers[playerId];

        if (!player) {
            console.log('Player not found:', playerId);
            return;
        }

        if (path && path.length > 0) {
            // Clear and create path dots only for main player
            if (playerId === socket.id) {
                clearPathDots();
                createPathDots(scene, path);
            }

            // Set path for the player (for visual reference, actual movement is server-driven)
            player.setPath(path);

            // If this is for main player and targeting a resource
            if (playerId === socket.id && targetResourceId !== null && targetResourceId !== undefined) {
                player.targetResource = targetResourceId;
            }
        } else if (path === null) {
            console.log('No path found - blocked');
        }
    });

    // Listen for position updates from server (server-authoritative)
    socket.on('playersPositionUpdate', (updates) => {
        updates.forEach(update => {
            const player = update.id === socket.id ? mainPlayer : otherPlayers[update.id];
            if (player) {
                player.updatePosition(update.x, update.y);

                // Update path dots for main player
                if (update.id === socket.id && update.pathIndex !== undefined) {
                    removePathDot(update.pathIndex);
                }
            }
        });
    });

    // Listen for player started gathering (broadcast from server)
    socket.on('playerStartedGathering', (data) => {
        const { playerId, resourceId, duration } = data;
        const player = playerId === socket.id ? mainPlayer : otherPlayers[playerId];

        if (player) {
            if (playerId === socket.id) {
                clearPathDots();
            }
            player.startGatheringVisual(resourceId, duration);
        }
    });

    // Listen for gathering progress updates
    socket.on('gatheringProgressUpdate', (updates) => {
        updates.forEach(update => {
            const player = update.playerId === socket.id ? mainPlayer : otherPlayers[update.playerId];
            if (player) {
                player.updateGatheringProgress(update.progress);
            }
        });
    });

    // Listen for player finished gathering
    socket.on('playerFinishedGathering', (data) => {
        const { playerId } = data;
        const player = playerId === socket.id ? mainPlayer : otherPlayers[playerId];

        if (player) {
            player.stopGathering();
        }
    });

    // Listen for dropped items data
    socket.on('droppedItemsData', (itemsData) => {
        itemsData.forEach(itemData => {
            createDroppedItem(scene, itemData);
        });
    });

    // Listen for new dropped item
    socket.on('itemDropped', (itemData) => {
        createDroppedItem(scene, itemData);
    });

    // Listen for item picked up
    socket.on('itemPickedUp', (data) => {
        removeDroppedItem(data.itemId);
    });
}

function setupInputHandlers(scene) {
    scene.input.on('pointerdown', (pointer) => {
        console.log('Click detected - mainPlayer:', !!mainPlayer, 'isGathering:', mainPlayer?.isGathering, 'isMoving:', mainPlayer?.isMoving);

        if (!mainPlayer || mainPlayer.isGathering) {
            console.log('Click blocked - no player or gathering');
            return;
        }

        const worldX = pointer.worldX;
        const worldY = pointer.worldY;

        const gridX = Math.floor(worldX / CONFIG.TILE_SIZE);
        const gridY = Math.floor(worldY / CONFIG.TILE_SIZE);

        console.log('Click at grid:', gridX, gridY);

        if (gridX >= 0 && gridX < CONFIG.WORLD_WIDTH && gridY >= 0 && gridY < CONFIG.WORLD_HEIGHT) {
            const playerPos = mainPlayer.getGridPosition();
            console.log('Player at grid:', playerPos.x, playerPos.y);

            // Skip if already at destination
            if (playerPos.x === gridX && playerPos.y === gridY) {
                console.log('Already at destination');
                return;
            }

            // Request path from server
            console.log('Requesting path from server...');
            socket.emit('requestPath', {
                startX: playerPos.x,
                startY: playerPos.y,
                endX: gridX,
                endY: gridY,
                targetResourceId: null
            });
        }
    });
}

function createPathDots(scene, path) {
    pathDots = [];

    for (let i = 0; i < path.length; i++) {
        const waypoint = path[i];
        const dotX = waypoint.x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
        const dotY = waypoint.y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;

        const dot = scene.add.circle(dotX, dotY, 3, 0xffffff, 0.8);
        dot.setDepth(9);
        pathDots.push(dot);
    }
}

function clearPathDots() {
    pathDots.forEach(dot => {
        if (dot) dot.destroy();
    });
    pathDots = [];
}

function removePathDot(index) {
    if (pathDots[index]) {
        pathDots[index].destroy();
        pathDots[index] = null;
    }
}

function generateMap(scene, mapData) {
    gameMap = mapData;

    // Tile indices from Grassland.png tileset (16x16 grid, 128x128 per tile)
    const TILE_GRASS = 17;        // Main grass tile
    const TILE_GRASS_VAR = 19;    // Grass variant (less common)
    const TILE_DIRT = 50;         // Dirt tile
    const TILE_SAND = CONFIG.TILES.SAND; // Grass with sand

    // Debug: Check if tileset is loaded
    if (!scene.textures.exists('tileset')) {
        console.error('Tileset not loaded! Check that Grassland.png is in client/assets/');
        return;
    }
    console.log('Tileset loaded successfully. Generating map...');

    for (let y = 0; y < CONFIG.WORLD_HEIGHT; y++) {
        for (let x = 0; x < CONFIG.WORLD_WIDTH; x++) {
            const tile = gameMap[y][x];
            const posX = x * CONFIG.TILE_SIZE;
            const posY = y * CONFIG.TILE_SIZE;

            let tileIndex;
            if (tile === 'grass') {
                tileIndex = TILE_GRASS;
            } else if (tile === 'grass_var') {
                tileIndex = TILE_GRASS_VAR;
            } else if (tile === 'dirt') {
                tileIndex = TILE_DIRT;
            } else if (tile === 'grass_with_sand') {
                tileIndex = TILE_SAND;
            } else {
                tileIndex = TILE_GRASS; // Default to grass
            }

            // Create sprite from tileset and scale from 128x128 to 32x32
            const tileSprite = scene.add.sprite(posX, posY, 'tileset', tileIndex);
            tileSprite.setOrigin(0, 0);
            tileSprite.setDisplaySize(CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
            tileSprite.setDepth(0);
        }
    }

    // Draw grid lines
    const gridGraphics = scene.add.graphics();
    gridGraphics.lineStyle(1, 0x000000, 0.1);
    gridGraphics.setDepth(1);
    for (let x = 0; x <= CONFIG.WORLD_WIDTH; x++) {
        gridGraphics.lineBetween(x * CONFIG.TILE_SIZE, 0, x * CONFIG.TILE_SIZE, CONFIG.WORLD_HEIGHT * CONFIG.TILE_SIZE);
    }
    for (let y = 0; y <= CONFIG.WORLD_HEIGHT; y++) {
        gridGraphics.lineBetween(0, y * CONFIG.TILE_SIZE, CONFIG.WORLD_WIDTH * CONFIG.TILE_SIZE, y * CONFIG.TILE_SIZE);
    }
}

function createResource(scene, resourceData) {
    if (resources[resourceData.id]) {
        return; // Resource already exists
    }

    const resource = new Resource(scene, resourceData);

    // Note: Obstacles are now managed server-side

    // Set click handler for resource
    resource.setClickHandler((clickedResource) => {
        handleResourceClick(clickedResource);
    });

    resources[resourceData.id] = resource;
}

function handleResourceClick(resource) {
    if (!mainPlayer || mainPlayer.isGathering) return;

    const playerPos = mainPlayer.getGridPosition();
    const resourcePos = resource.getGridPosition();

    // Calculate Manhattan distance
    const distance = Math.abs(playerPos.x - resourcePos.x) + Math.abs(playerPos.y - resourcePos.y);

    if (distance <= 1) {
        // Adjacent to resource, request gathering from server
        socket.emit('startGathering', { resourceId: resource.id });
    } else {
        // Get adjacent tiles (simple calculation, no pathfinding needed)
        const adjacentTiles = [
            { x: resourcePos.x - 1, y: resourcePos.y },
            { x: resourcePos.x + 1, y: resourcePos.y },
            { x: resourcePos.x, y: resourcePos.y - 1 },
            { x: resourcePos.x, y: resourcePos.y + 1 }
        ].filter(tile =>
            tile.x >= 0 && tile.x < CONFIG.WORLD_WIDTH &&
            tile.y >= 0 && tile.y < CONFIG.WORLD_HEIGHT
        );

        // Find closest adjacent tile
        let closestTile = null;
        let minDistance = Infinity;

        for (const tile of adjacentTiles) {
            const dist = Math.abs(playerPos.x - tile.x) + Math.abs(playerPos.y - tile.y);
            if (dist < minDistance) {
                minDistance = dist;
                closestTile = tile;
            }
        }

        if (closestTile) {
            // Check if player is already at the destination tile
            if (playerPos.x === closestTile.x && playerPos.y === closestTile.y) {
                // Already adjacent, start gathering
                mainPlayer.startGathering(resource.id);
                return;
            }

            // Request path from server
            console.log('Requesting path to resource from server...');
            socket.emit('requestPath', {
                startX: playerPos.x,
                startY: playerPos.y,
                endX: closestTile.x,
                endY: closestTile.y,
                targetResourceId: resource.id
            });
        } else {
            console.log('No adjacent tiles available for resource');
        }
    }
}

function removeResource(resourceId) {
    if (resources[resourceId]) {
        const resource = resources[resourceId];

        // Note: Obstacles are now managed server-side

        resource.destroy();
        delete resources[resourceId];
    }
}

function createDroppedItem(scene, itemData) {
    if (droppedItems[itemData.id]) {
        return; // Item already exists
    }

    const item = new DroppedItem(scene, itemData);

    // Set click handler
    item.setClickHandler((clickedItem) => {
        handleDroppedItemClick(clickedItem);
    });

    droppedItems[itemData.id] = item;
}

function handleDroppedItemClick(item) {
    if (!mainPlayer || mainPlayer.isGathering) return;

    // Request pickup from server (will start gathering animation)
    socket.emit('pickupItem', { itemId: item.id });
}

function removeDroppedItem(itemId) {
    if (droppedItems[itemId]) {
        droppedItems[itemId].destroy();
        delete droppedItems[itemId];
    }
}

function update(time, delta) {
    if (!mainPlayer) return;

    // Update name text positions for all players (server handles all logic)
    mainPlayer.nameText.setPosition(mainPlayer.sprite.x, mainPlayer.sprite.y - 25);

    Object.values(otherPlayers).forEach(player => {
        player.nameText.setPosition(player.sprite.x, player.sprite.y - 25);
    });
}

function updatePlayerCount() {
    const count = 1 + Object.keys(otherPlayers).length;
    const playerCountElement = document.getElementById('player-count');
    if (playerCountElement) {
        playerCountElement.textContent = `Players online: ${count}`;
    }
}
