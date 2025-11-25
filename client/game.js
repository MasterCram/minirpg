const TILE_SIZE = 32;
const WORLD_WIDTH = 100;
const WORLD_HEIGHT = 100;
const GATHER_TIME = 3000; // 3 seconds

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
let socket;
let player;
let otherPlayers = {};
let gameMap = [];
let obstacleGrid = [];
let resourceObjects = {};
let inventory = {
    wood: 0,
    stone: 0
};
let inventoryUI;
let currentPath = [];
let pathIndex = 0;
let moveSpeed = 4; // Tiles per second
let isMoving = false;
let isGathering = false;
let gatheringProgress = null;
let currentScene;

function preload() {
    // We'll generate textures procedurally
}

function create() {
    const scene = this;
    currentScene = scene;

    this.cameras.main.setBounds(0, 0, WORLD_WIDTH * TILE_SIZE, WORLD_HEIGHT * TILE_SIZE);
    this.physics.world.setBounds(0, 0, WORLD_WIDTH * TILE_SIZE, WORLD_HEIGHT * TILE_SIZE);

    initializeObstacleGrid();

    socket = io('http://localhost:3000');

    socket.on('mapData', (mapData) => {
        generateMap(scene, mapData);
    });

    socket.on('currentPlayers', (players) => {
        Object.keys(players).forEach((id) => {
            if (id === socket.id) {
                addPlayer(scene, players[id], true);
                if (players[id].inventory) {
                    inventory = players[id].inventory;
                    updateInventoryUI();
                }
            } else {
                addPlayer(scene, players[id], false);
            }
        });
        updatePlayerCount();
    });

    socket.on('newPlayer', (playerInfo) => {
        addPlayer(scene, playerInfo, false);
        updatePlayerCount();
    });

    socket.on('playerMoved', (playerData) => {
        if (otherPlayers[playerData.id]) {
            scene.tweens.add({
                targets: otherPlayers[playerData.id].sprite,
                x: playerData.x,
                y: playerData.y,
                duration: 200,
                ease: 'Linear'
            });
        }
    });

    socket.on('playerDisconnected', (playerId) => {
        if (otherPlayers[playerId]) {
            otherPlayers[playerId].sprite.destroy();
            otherPlayers[playerId].nameText.destroy();
            delete otherPlayers[playerId];
        }
        updatePlayerCount();
    });

    socket.on('resourceGathered', (data) => {
        if (resourceObjects[data.resourceId]) {
            const resource = resourceObjects[data.resourceId];
            const gridX = Math.floor(resource.x / TILE_SIZE);
            const gridY = Math.floor(resource.y / TILE_SIZE);
            obstacleGrid[gridY][gridX] = 0;

            resource.destroy();
            delete resourceObjects[data.resourceId];
        }
    });

    socket.on('inventoryUpdate', (newInventory) => {
        inventory = newInventory;
        updateInventoryUI();
    });

    this.input.on('pointerdown', (pointer) => {
        if (isGathering) return;

        const worldX = pointer.worldX;
        const worldY = pointer.worldY;

        const gridX = Math.floor(worldX / TILE_SIZE);
        const gridY = Math.floor(worldY / TILE_SIZE);

        if (gridX >= 0 && gridX < WORLD_WIDTH && gridY >= 0 && gridY < WORLD_HEIGHT) {
            if (player) {
                const playerGridX = Math.floor(player.sprite.x / TILE_SIZE);
                const playerGridY = Math.floor(player.sprite.y / TILE_SIZE);

                const path = findPath(playerGridX, playerGridY, gridX, gridY);
                if (path && path.length > 0) {
                    currentPath = path;
                    pathIndex = 0;
                    isMoving = true;
                }
            }
        }
    });

    createInventoryUI(scene);
}

function initializeObstacleGrid() {
    obstacleGrid = [];
    for (let y = 0; y < WORLD_HEIGHT; y++) {
        obstacleGrid[y] = [];
        for (let x = 0; x < WORLD_WIDTH; x++) {
            obstacleGrid[y][x] = 0;
        }
    }
}

function generateMap(scene, mapData) {
    gameMap = mapData;

    for (let y = 0; y < WORLD_HEIGHT; y++) {
        for (let x = 0; x < WORLD_WIDTH; x++) {
            const tile = gameMap[y][x];
            const posX = x * TILE_SIZE;
            const posY = y * TILE_SIZE;

            let color;
            if (tile === 'grass') {
                color = 0x228B22;
            } else if (tile === 'dirt') {
                color = 0x8B7355;
            }

            const tileRect = scene.add.rectangle(posX, posY, TILE_SIZE, TILE_SIZE, color);
            tileRect.setOrigin(0, 0);
            tileRect.setStrokeStyle(1, 0x000000, 0.1);
        }
    }

    const gridGraphics = scene.add.graphics();
    gridGraphics.lineStyle(1, 0x000000, 0.1);
    for (let x = 0; x <= WORLD_WIDTH; x++) {
        gridGraphics.lineBetween(x * TILE_SIZE, 0, x * TILE_SIZE, WORLD_HEIGHT * TILE_SIZE);
    }
    for (let y = 0; y <= WORLD_HEIGHT; y++) {
        gridGraphics.lineBetween(0, y * TILE_SIZE, WORLD_WIDTH * TILE_SIZE, y * TILE_SIZE);
    }
}

function addPlayer(scene, playerInfo, isMainPlayer) {
    const sprite = scene.physics.add.sprite(playerInfo.x, playerInfo.y, null);

    const graphics = scene.add.graphics();
    graphics.fillStyle(isMainPlayer ? 0x0000ff : 0xff0000, 1);
    graphics.fillCircle(16, 16, 12);
    graphics.generateTexture('player-' + playerInfo.id, 32, 32);
    graphics.destroy();

    sprite.setTexture('player-' + playerInfo.id);
    sprite.setCollideWorldBounds(true);
    sprite.setDepth(10);

    const nameText = scene.add.text(playerInfo.x, playerInfo.y - 25, playerInfo.username, {
        fontSize: '11px',
        fill: '#ffffff',
        backgroundColor: '#000000',
        padding: { x: 3, y: 2 }
    });
    nameText.setOrigin(0.5);
    nameText.setDepth(11);

    if (isMainPlayer) {
        player = {
            sprite: sprite,
            nameText: nameText,
            id: playerInfo.id
        };
        scene.cameras.main.startFollow(sprite, true, 0.1, 0.1);

        socket.emit('requestMap');
        socket.emit('requestResources');
    } else {
        otherPlayers[playerInfo.id] = {
            sprite: sprite,
            nameText: nameText
        };
    }
}

socket.on('resourcesData', (resources) => {
    const scene = game.scene.scenes[0];
    resources.forEach(resource => {
        createResource(scene, resource);
    });
});

function createResource(scene, resource) {
    const graphics = scene.add.graphics();

    if (resource.type === 'tree') {
        graphics.fillStyle(0x654321, 1);
        graphics.fillRect(10, 20, 12, 12);
        graphics.fillStyle(0x228B22, 1);
        graphics.fillCircle(16, 12, 10);
    } else if (resource.type === 'rock') {
        graphics.fillStyle(0x808080, 1);
        graphics.fillCircle(16, 16, 12);
        graphics.fillStyle(0x696969, 1);
        graphics.fillCircle(12, 14, 6);
    }

    graphics.generateTexture(resource.type + '-' + resource.id, 32, 32);
    graphics.destroy();

    const sprite = scene.add.sprite(resource.x, resource.y, resource.type + '-' + resource.id);
    sprite.setInteractive();
    sprite.setDepth(5);
    sprite.setData('resourceId', resource.id);
    sprite.setData('resourceType', resource.type);

    const gridX = Math.floor(resource.x / TILE_SIZE);
    const gridY = Math.floor(resource.y / TILE_SIZE);
    obstacleGrid[gridY][gridX] = 1;

    sprite.on('pointerdown', (pointer) => {
        pointer.event.stopPropagation();

        if (player && !isGathering) {
            const playerGridX = Math.floor(player.sprite.x / TILE_SIZE);
            const playerGridY = Math.floor(player.sprite.y / TILE_SIZE);

            const resourceGridX = Math.floor(sprite.x / TILE_SIZE);
            const resourceGridY = Math.floor(sprite.y / TILE_SIZE);

            const distance = Math.abs(playerGridX - resourceGridX) + Math.abs(playerGridY - resourceGridY);

            if (distance <= 1) {
                startGathering(scene, resource.id, sprite);
            } else {
                const adjacentTiles = [
                    { x: resourceGridX - 1, y: resourceGridY },
                    { x: resourceGridX + 1, y: resourceGridY },
                    { x: resourceGridX, y: resourceGridY - 1 },
                    { x: resourceGridX, y: resourceGridY + 1 }
                ];

                let closestTile = null;
                let minDistance = Infinity;

                for (const tile of adjacentTiles) {
                    if (tile.x >= 0 && tile.x < WORLD_WIDTH && tile.y >= 0 && tile.y < WORLD_HEIGHT) {
                        if (obstacleGrid[tile.y][tile.x] === 0) {
                            const dist = Math.abs(playerGridX - tile.x) + Math.abs(playerGridY - tile.y);
                            if (dist < minDistance) {
                                minDistance = dist;
                                closestTile = tile;
                            }
                        }
                    }
                }

                if (closestTile) {
                    const path = findPath(playerGridX, playerGridY, closestTile.x, closestTile.y);
                    if (path && path.length > 0) {
                        currentPath = path;
                        pathIndex = 0;
                        isMoving = true;
                        player.targetResource = resource.id;
                    }
                }
            }
        }
    });

    resourceObjects[resource.id] = sprite;
}

function startGathering(scene, resourceId, sprite) {
    isGathering = true;
    isMoving = false;
    currentPath = [];

    const progressBarBg = scene.add.rectangle(
        player.sprite.x,
        player.sprite.y - 40,
        60,
        8,
        0x000000
    );
    progressBarBg.setDepth(12);

    const progressBarFill = scene.add.rectangle(
        player.sprite.x - 30,
        player.sprite.y - 40,
        0,
        6,
        0x00ff00
    );
    progressBarFill.setOrigin(0, 0.5);
    progressBarFill.setDepth(13);

    gatheringProgress = {
        bg: progressBarBg,
        fill: progressBarFill,
        startTime: Date.now(),
        resourceId: resourceId
    };
}

function findPath(startX, startY, endX, endY) {
    if (obstacleGrid[endY][endX] === 1) {
        return null;
    }

    const openSet = [];
    const closedSet = new Set();
    const cameFrom = new Map();
    const gScore = new Map();
    const fScore = new Map();

    const startKey = `${startX},${startY}`;
    const endKey = `${endX},${endY}`;

    openSet.push({ x: startX, y: startY, key: startKey });
    gScore.set(startKey, 0);
    fScore.set(startKey, heuristic(startX, startY, endX, endY));

    while (openSet.length > 0) {
        openSet.sort((a, b) => fScore.get(a.key) - fScore.get(b.key));
        const current = openSet.shift();

        if (current.key === endKey) {
            return reconstructPath(cameFrom, current.key, startX, startY);
        }

        closedSet.add(current.key);

        const neighbors = [
            { x: current.x - 1, y: current.y },
            { x: current.x + 1, y: current.y },
            { x: current.x, y: current.y - 1 },
            { x: current.x, y: current.y + 1 }
        ];

        for (const neighbor of neighbors) {
            if (neighbor.x < 0 || neighbor.x >= WORLD_WIDTH || neighbor.y < 0 || neighbor.y >= WORLD_HEIGHT) {
                continue;
            }

            const neighborKey = `${neighbor.x},${neighbor.y}`;

            if (closedSet.has(neighborKey)) {
                continue;
            }

            if (obstacleGrid[neighbor.y][neighbor.x] === 1 && neighborKey !== endKey) {
                continue;
            }

            const tentativeGScore = gScore.get(current.key) + 1;

            if (!openSet.find(n => n.key === neighborKey)) {
                openSet.push({ x: neighbor.x, y: neighbor.y, key: neighborKey });
            } else if (tentativeGScore >= (gScore.get(neighborKey) || Infinity)) {
                continue;
            }

            cameFrom.set(neighborKey, current.key);
            gScore.set(neighborKey, tentativeGScore);
            fScore.set(neighborKey, tentativeGScore + heuristic(neighbor.x, neighbor.y, endX, endY));
        }
    }

    return null;
}

function heuristic(x1, y1, x2, y2) {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

function reconstructPath(cameFrom, currentKey, startX, startY) {
    const path = [];
    const startKey = `${startX},${startY}`;

    while (currentKey !== startKey) {
        const [x, y] = currentKey.split(',').map(Number);
        path.unshift({
            x: x * TILE_SIZE + TILE_SIZE / 2,
            y: y * TILE_SIZE + TILE_SIZE / 2
        });
        currentKey = cameFrom.get(currentKey);
    }

    return path;
}

function update(time, delta) {
    if (!player) return;

    if (isGathering && gatheringProgress) {
        const elapsed = Date.now() - gatheringProgress.startTime;
        const progress = Math.min(elapsed / GATHER_TIME, 1);

        gatheringProgress.fill.width = progress * 60;
        gatheringProgress.bg.setPosition(player.sprite.x, player.sprite.y - 40);
        gatheringProgress.fill.setPosition(player.sprite.x - 30, player.sprite.y - 40);

        if (progress >= 1) {
            socket.emit('gatherResource', gatheringProgress.resourceId);

            gatheringProgress.bg.destroy();
            gatheringProgress.fill.destroy();
            gatheringProgress = null;
            isGathering = false;
            player.targetResource = null;
        }
    } else if (isMoving && currentPath.length > 0) {
        const target = currentPath[pathIndex];
        const distance = Phaser.Math.Distance.Between(
            player.sprite.x,
            player.sprite.y,
            target.x,
            target.y
        );

        if (distance < 2) {
            player.sprite.setPosition(target.x, target.y);

            socket.emit('playerMovement', {
                x: target.x,
                y: target.y
            });

            pathIndex++;

            if (pathIndex >= currentPath.length) {
                isMoving = false;
                currentPath = [];
                pathIndex = 0;

                if (player.targetResource) {
                    const resourceSprite = resourceObjects[player.targetResource];
                    if (resourceSprite) {
                        startGathering(currentScene, player.targetResource, resourceSprite);
                    }
                    player.targetResource = null;
                }
            }
        } else {
            const speed = (moveSpeed * TILE_SIZE * delta) / 1000;
            const angle = Phaser.Math.Angle.Between(
                player.sprite.x,
                player.sprite.y,
                target.x,
                target.y
            );

            player.sprite.x += Math.cos(angle) * speed;
            player.sprite.y += Math.sin(angle) * speed;
        }
    }

    player.nameText.setPosition(player.sprite.x, player.sprite.y - 25);

    Object.keys(otherPlayers).forEach((id) => {
        const other = otherPlayers[id];
        other.nameText.setPosition(other.sprite.x, other.sprite.y - 25);
    });
}

function createInventoryUI(scene) {
    const uiContainer = document.createElement('div');
    uiContainer.id = 'inventory';
    uiContainer.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 15px;
        border-radius: 8px;
        font-family: Arial, sans-serif;
        min-width: 200px;
        border: 2px solid #444;
    `;

    uiContainer.innerHTML = `
        <h3 style="margin: 0 0 10px 0; font-size: 16px; border-bottom: 1px solid #666; padding-bottom: 5px;">Inventory</h3>
        <div style="display: flex; align-items: center; margin-bottom: 8px;">
            <span style="width: 30px; height: 30px; background: #654321; display: inline-block; margin-right: 10px; border-radius: 4px;"></span>
            <span>Wood: <strong id="wood-count">0</strong></span>
        </div>
        <div style="display: flex; align-items: center;">
            <span style="width: 30px; height: 30px; background: #808080; display: inline-block; margin-right: 10px; border-radius: 4px;"></span>
            <span>Stone: <strong id="stone-count">0</strong></span>
        </div>
    `;

    document.body.appendChild(uiContainer);
    inventoryUI = uiContainer;
}

function updateInventoryUI() {
    if (inventoryUI) {
        document.getElementById('wood-count').textContent = inventory.wood;
        document.getElementById('stone-count').textContent = inventory.stone;
    }
}

function updatePlayerCount() {
    const count = 1 + Object.keys(otherPlayers).length;
    document.getElementById('player-count').textContent = `Players online: ${count}`;
}
