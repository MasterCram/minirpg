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
let equipmentUI;
let gameMap = [];
let pathDots = []; // Visual path indicators
let transparentObjects = []; // Track object sprites for transparency management (trees, houses, etc.)

function preload() {
    // Load tileset - 16x16 grid, each tile is 128x128 pixels
    this.load.spritesheet('tileset', 'assets/Grassland.png', {
        frameWidth: 128,
        frameHeight: 128
    });

    // Load town tileset for houses and buildings
    this.load.spritesheet('town', 'assets/Town.png', {
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

    equipmentUI = new EquipmentUI();

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

    socket.on('multiTileObjectsData', (multiTileObjects) => {
        console.log('Received multi-tile objects:', multiTileObjects.length, 'objects');
        renderMultiTileObjects(scene, multiTileObjects);
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
                if (players[id].equipment) {
                    equipmentUI.update(players[id].equipment);
                }

                // Center camera on player with smooth following
                scene.cameras.main.startFollow(mainPlayer.sprite, true, 0.2, 0.2);
                scene.cameras.main.setFollowOffset(0, 0);

                // Ensure camera is centered immediately
                scene.cameras.main.centerOn(mainPlayer.sprite.x, mainPlayer.sprite.y);

                socket.emit('requestMap');
                socket.emit('requestMultiTileObjects');
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

    socket.on('equipmentUpdate', (newEquipment) => {
        if (equipmentUI) {
            equipmentUI.update(newEquipment);
        }
    });

    socket.on('inventoryFull', (data) => {
        showTemporaryMessage(data.message);
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

function renderMultiTileObjects(scene, multiTileObjects) {
    console.log('Rendering multi-tile objects...');

    // Clear previous transparent objects
    transparentObjects = [];

    multiTileObjects.forEach(obj => {
        // Determine which tileset to use
        const tileset = obj.tileset || 'tileset';

        // Check if tileset exists
        if (!scene.textures.exists(tileset)) {
            console.error(`Tileset ${tileset} not loaded!`);
            return;
        }

        // Get transparency configuration for this object type
        const transparencyConfig = CONFIG.OBJECT_TRANSPARENCY[obj.type.toUpperCase()];
        const transparentRows = transparencyConfig ? transparencyConfig.transparentRows : [];

        // Create a group for this object's transparent tiles
        const transparentTiles = [];

        // Calculate depth based on object's bottom Y position
        // Objects further down (higher Y) render on top
        // Base depth for bottom parts: 100, top parts: 200
        // Add object's max Y to make lower objects render on top
        const objectBottomY = obj.y + obj.height - 1;
        const bottomDepth = 100 + objectBottomY;
        const topDepth = 200 + objectBottomY;

        // Render each tile of the object
        obj.tiles.forEach(tile => {
            const posX = tile.x * CONFIG.TILE_SIZE;
            const posY = tile.y * CONFIG.TILE_SIZE;

            const tileSprite = scene.add.sprite(posX, posY, tileset, tile.tileIndex);
            tileSprite.setOrigin(0, 0);
            tileSprite.setDisplaySize(CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);

            // Determine if this tile is in a transparent row
            const isTransparentRow = transparentRows.includes(tile.row);

            if (isTransparentRow) {
                // Top part of object (transparent when player behind)
                tileSprite.setDepth(topDepth);

                // Store this transparent tile
                transparentTiles.push({
                    sprite: tileSprite,
                    gridX: tile.x,
                    gridY: tile.y
                });
            } else {
                // Bottom part of object (always opaque)
                tileSprite.setDepth(bottomDepth);
            }
        });

        // Store transparent tiles with object reference
        if (transparentTiles.length > 0) {
            transparentObjects.push({
                obj: obj,
                transparentTiles: transparentTiles
            });
        }
    });

    console.log(`Rendered ${multiTileObjects.length} multi-tile objects`);
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

    // Update object transparency based on player positions (trees, houses, etc.)
    updateObjectTransparency();
}

function updateObjectTransparency() {
    if (!mainPlayer) return;

    // Get all player positions
    const allPlayers = [mainPlayer, ...Object.values(otherPlayers)];

    // For each object (tree, house, etc.), check if any player is behind it
    transparentObjects.forEach(objGroup => {
        let playerBehindObject = false;

        const obj = objGroup.obj;
        const objStartX = obj.x;
        const objStartY = obj.y;
        const objEndX = obj.x + obj.width;
        const objEndY = obj.y + obj.height;

        // Check if any player is within this object's bounds
        for (const player of allPlayers) {
            const playerGridPos = player.getGridPosition();

            // Player is behind object if they're within the object's X and Y range
            if (playerGridPos.x >= objStartX && playerGridPos.x < objEndX &&
                playerGridPos.y >= objStartY && playerGridPos.y < objEndY) {
                playerBehindObject = true;
                break;
            }
        }

        // Set transparency for all transparent tiles of this object
        objGroup.transparentTiles.forEach(tile => {
            tile.sprite.setAlpha(playerBehindObject ? 0.5 : 1.0);
        });
    });
}

function updatePlayerCount() {
    const count = 1 + Object.keys(otherPlayers).length;
    const playerCountElement = document.getElementById('player-count');
    if (playerCountElement) {
        playerCountElement.textContent = `Players online: ${count}`;
    }
}

function showTemporaryMessage(message) {
    // Create message element
    const messageElement = document.createElement('div');
    messageElement.textContent = message;
    messageElement.style.position = 'fixed';
    messageElement.style.top = '50%';
    messageElement.style.left = '50%';
    messageElement.style.transform = 'translate(-50%, -50%)';
    messageElement.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
    messageElement.style.color = '#ff4444';
    messageElement.style.padding = '20px 40px';
    messageElement.style.borderRadius = '8px';
    messageElement.style.fontSize = '18px';
    messageElement.style.fontWeight = 'bold';
    messageElement.style.zIndex = '10000';
    messageElement.style.border = '2px solid #ff4444';
    messageElement.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.5)';

    document.body.appendChild(messageElement);

    // Remove after 2 seconds
    setTimeout(() => {
        messageElement.remove();
    }, 2000);
}
