const TILE_SIZE = 32;
const WORLD_WIDTH = 25;
const WORLD_HEIGHT = 25;

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
    }
};

const game = new Phaser.Game(config);

// Game state
let socket;
let currentScene;
let mainPlayer;
let otherPlayers = {};
let resources = {};
let pathFinder;
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

    this.cameras.main.setBounds(0, 0, WORLD_WIDTH * TILE_SIZE, WORLD_HEIGHT * TILE_SIZE);
    this.physics.world.setBounds(0, 0, WORLD_WIDTH * TILE_SIZE, WORLD_HEIGHT * TILE_SIZE);

    // Initialize systems
    pathFinder = new PathFinder(WORLD_WIDTH, WORLD_HEIGHT);
    inventoryUI = new InventoryUI();

    // Setup socket connection
    setupSocketConnection(this);

    // Setup input handlers
    setupInputHandlers(this);
}

function setupSocketConnection(scene) {
    socket = io('http://localhost:3000');

    socket.on('mapData', (mapData) => {
        generateMap(scene, mapData);
    });

    socket.on('currentPlayers', (players) => {
        Object.keys(players).forEach((id) => {
            if (id === socket.id) {
                mainPlayer = new Player(scene, players[id], true);
                if (players[id].inventory) {
                    inventoryUI.update(players[id].inventory);
                }
                scene.cameras.main.startFollow(mainPlayer.sprite, true, 0.1, 0.1);

                socket.emit('requestMap');
                socket.emit('requestResources');
            } else {
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

        const gridX = Math.floor(worldX / TILE_SIZE);
        const gridY = Math.floor(worldY / TILE_SIZE);

        console.log('Click at grid:', gridX, gridY);

        if (gridX >= 0 && gridX < WORLD_WIDTH && gridY >= 0 && gridY < WORLD_HEIGHT) {
            const playerPos = mainPlayer.getGridPosition(TILE_SIZE);
            console.log('Player at grid:', playerPos.x, playerPos.y);

            // Skip if already at destination
            if (playerPos.x === gridX && playerPos.y === gridY) {
                console.log('Already at destination');
                return;
            }

            const path = pathFinder.findPath(playerPos.x, playerPos.y, gridX, gridY);
            console.log('Path found:', path?.length, 'waypoints');

            // Only set path if it exists and has waypoints
            if (path && path.length > 0) {
                clearPathDots();
                createPathDots(scene, path);
                mainPlayer.setPath(path);
                console.log('Path set successfully');
            } else if (path === null) {
                console.log('No path found to destination - obstacle or blocked');
            }
        }
    });
}

function createPathDots(scene, path) {
    pathDots = [];

    for (let i = 0; i < path.length; i++) {
        const waypoint = path[i];
        const dotX = waypoint.x * TILE_SIZE + TILE_SIZE / 2;
        const dotY = waypoint.y * TILE_SIZE + TILE_SIZE / 2;

        const dot = scene.add.circle(dotX, dotY, 3, 0xffffff, 0.8);
        dot.setDepth(9);
        pathDots.push(dot);
    }
}

function clearPathDots() {
    pathDots.forEach(dot => dot.destroy());
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

    // Debug: Check if tileset is loaded
    if (!scene.textures.exists('tileset')) {
        console.error('Tileset not loaded! Check that Grassland.png is in client/assets/');
        return;
    }
    console.log('Tileset loaded successfully. Generating map...');

    for (let y = 0; y < WORLD_HEIGHT; y++) {
        for (let x = 0; x < WORLD_WIDTH; x++) {
            const tile = gameMap[y][x];
            const posX = x * TILE_SIZE;
            const posY = y * TILE_SIZE;

            let tileIndex;
            if (tile === 'grass') {
                tileIndex = TILE_GRASS;
            } else if (tile === 'grass_var') {
                tileIndex = TILE_GRASS_VAR;
            } else if (tile === 'dirt') {
                tileIndex = TILE_DIRT;
            } else {
                tileIndex = TILE_GRASS; // Default to grass
            }

            // Create sprite from tileset and scale from 128x128 to 32x32
            const tileSprite = scene.add.sprite(posX, posY, 'tileset', tileIndex);
            tileSprite.setOrigin(0, 0);
            tileSprite.setDisplaySize(TILE_SIZE, TILE_SIZE);
            tileSprite.setDepth(0);
        }
    }

    // Draw grid lines
    const gridGraphics = scene.add.graphics();
    gridGraphics.lineStyle(1, 0x000000, 0.1);
    gridGraphics.setDepth(1);
    for (let x = 0; x <= WORLD_WIDTH; x++) {
        gridGraphics.lineBetween(x * TILE_SIZE, 0, x * TILE_SIZE, WORLD_HEIGHT * TILE_SIZE);
    }
    for (let y = 0; y <= WORLD_HEIGHT; y++) {
        gridGraphics.lineBetween(0, y * TILE_SIZE, WORLD_WIDTH * TILE_SIZE, y * TILE_SIZE);
    }
}

function createResource(scene, resourceData) {
    if (resources[resourceData.id]) {
        return; // Resource already exists
    }

    const resource = new Resource(scene, resourceData);
    const gridPos = resource.getGridPosition(TILE_SIZE);

    // Mark as obstacle in pathfinder
    pathFinder.setObstacle(gridPos.x, gridPos.y, true);

    // Set click handler for resource
    resource.setClickHandler((clickedResource) => {
        handleResourceClick(clickedResource);
    });

    resources[resourceData.id] = resource;
}

function handleResourceClick(resource) {
    if (!mainPlayer || mainPlayer.isGathering) return;

    const playerPos = mainPlayer.getGridPosition(TILE_SIZE);
    const resourcePos = resource.getGridPosition(TILE_SIZE);

    // Calculate Manhattan distance
    const distance = Math.abs(playerPos.x - resourcePos.x) + Math.abs(playerPos.y - resourcePos.y);

    if (distance <= 1) {
        // Adjacent to resource, start gathering immediately
        mainPlayer.startGathering(resource.id);
    } else {
        // Find nearest adjacent tile to resource
        const adjacentTiles = pathFinder.getAdjacentTiles(resourcePos.x, resourcePos.y);

        let closestTile = null;
        let minDistance = Infinity;

        for (const tile of adjacentTiles) {
            if (!pathFinder.isObstacle(tile.x, tile.y)) {
                const dist = Math.abs(playerPos.x - tile.x) + Math.abs(playerPos.y - tile.y);
                if (dist < minDistance) {
                    minDistance = dist;
                    closestTile = tile;
                }
            }
        }

        if (closestTile) {
            // Check if player is already at the destination tile
            if (playerPos.x === closestTile.x && playerPos.y === closestTile.y) {
                // Already adjacent, start gathering
                mainPlayer.startGathering(resource.id);
                return;
            }

            const path = pathFinder.findPath(playerPos.x, playerPos.y, closestTile.x, closestTile.y);
            if (path && path.length > 0) {
                clearPathDots();
                createPathDots(currentScene, path);
                mainPlayer.setPath(path);
                mainPlayer.targetResource = resource.id;
            } else if (path === null) {
                console.log('Cannot reach resource - no path available');
            } else {
                // Empty path means already at destination
                mainPlayer.startGathering(resource.id);
            }
        } else {
            console.log('Resource is completely surrounded by obstacles');
        }
    }
}

function removeResource(resourceId) {
    if (resources[resourceId]) {
        const resource = resources[resourceId];
        const gridPos = resource.getGridPosition(TILE_SIZE);

        // Remove obstacle from pathfinder
        pathFinder.setObstacle(gridPos.x, gridPos.y, false);

        resource.destroy();
        delete resources[resourceId];
    }
}

function update(time, delta) {
    if (!mainPlayer) return;

    // Update main player
    mainPlayer.updateGathering((resourceId) => {
        socket.emit('gatherResource', resourceId);
    });

    const pathCompleted = mainPlayer.update(
        delta,
        TILE_SIZE,
        (x, y) => {
            socket.emit('playerMovement', { x, y });
        },
        (waypointIndex) => {
            removePathDot(waypointIndex);
        }
    );

    // If path completed, clear any remaining dots
    if (pathCompleted) {
        clearPathDots();

        // If player has a target resource, start gathering
        if (mainPlayer.targetResource) {
            const targetResource = resources[mainPlayer.targetResource];
            if (targetResource && !targetResource.isDestroyed()) {
                const playerPos = mainPlayer.getGridPosition(TILE_SIZE);
                const resourcePos = targetResource.getGridPosition(TILE_SIZE);
                const distance = Math.abs(playerPos.x - resourcePos.x) + Math.abs(playerPos.y - resourcePos.y);

                if (distance <= 1) {
                    mainPlayer.startGathering(mainPlayer.targetResource);
                }
            }
            mainPlayer.targetResource = null;
        }
    }

    // Update other players
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
