const TILE_SIZE = 32;
const WORLD_WIDTH = 100;
const WORLD_HEIGHT = 100;

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
let tileLayer;
let resourceObjects = {};
let inventory = {
    wood: 0,
    stone: 0
};
let inventoryUI;
let targetPosition = null;
let moveSpeed = 150;

function preload() {
    // We'll generate textures procedurally
}

function create() {
    const scene = this;

    this.cameras.main.setBounds(0, 0, WORLD_WIDTH * TILE_SIZE, WORLD_HEIGHT * TILE_SIZE);
    this.physics.world.setBounds(0, 0, WORLD_WIDTH * TILE_SIZE, WORLD_HEIGHT * TILE_SIZE);

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
            resourceObjects[data.resourceId].destroy();
            delete resourceObjects[data.resourceId];
        }
    });

    socket.on('inventoryUpdate', (newInventory) => {
        inventory = newInventory;
        updateInventoryUI();
    });

    this.input.on('pointerdown', (pointer) => {
        const worldX = pointer.worldX;
        const worldY = pointer.worldY;

        const gridX = Math.floor(worldX / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2;
        const gridY = Math.floor(worldY / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2;

        targetPosition = { x: gridX, y: gridY };
    });

    createInventoryUI(scene);
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

    sprite.on('pointerdown', () => {
        if (player) {
            const distance = Phaser.Math.Distance.Between(
                player.sprite.x,
                player.sprite.y,
                sprite.x,
                sprite.y
            );

            if (distance <= TILE_SIZE * 2) {
                socket.emit('gatherResource', resource.id);
            } else {
                targetPosition = {
                    x: Math.floor(sprite.x / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2,
                    y: Math.floor(sprite.y / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2
                };
            }
        }
    });

    resourceObjects[resource.id] = sprite;
}

function update() {
    if (!player) return;

    if (targetPosition) {
        const distance = Phaser.Math.Distance.Between(
            player.sprite.x,
            player.sprite.y,
            targetPosition.x,
            targetPosition.y
        );

        if (distance > 4) {
            const angle = Phaser.Math.Angle.Between(
                player.sprite.x,
                player.sprite.y,
                targetPosition.x,
                targetPosition.y
            );

            player.sprite.setVelocity(
                Math.cos(angle) * moveSpeed,
                Math.sin(angle) * moveSpeed
            );

            socket.emit('playerMovement', {
                x: player.sprite.x,
                y: player.sprite.y
            });
        } else {
            player.sprite.setVelocity(0);
            player.sprite.setPosition(targetPosition.x, targetPosition.y);
            socket.emit('playerMovement', {
                x: targetPosition.x,
                y: targetPosition.y
            });
            targetPosition = null;
        }
    } else {
        player.sprite.setVelocity(0);
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
