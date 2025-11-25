const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
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
let cursors;
let wasd;

function preload() {
    this.load.setBaseURL('https://labs.phaser.io');
    this.load.image('tiles', 'assets/tilemaps/tiles/catastrophi_tiles_16.png');
}

function create() {
    const background = this.add.rectangle(0, 0, 1600, 1200, 0x228B22);
    background.setOrigin(0, 0);

    const gridGraphics = this.add.graphics();
    gridGraphics.lineStyle(1, 0x00ff00, 0.2);
    for (let x = 0; x < 1600; x += 32) {
        gridGraphics.lineBetween(x, 0, x, 1200);
    }
    for (let y = 0; y < 1200; y += 32) {
        gridGraphics.lineBetween(0, y, 1600, y);
    }

    this.cameras.main.setBounds(0, 0, 1600, 1200);
    this.physics.world.setBounds(0, 0, 1600, 1200);

    cursors = this.input.keyboard.createCursorKeys();
    wasd = {
        up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        down: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    };

    socket = io('http://localhost:3000');

    socket.on('currentPlayers', (players) => {
        Object.keys(players).forEach((id) => {
            if (id === socket.id) {
                addPlayer(this, players[id], true);
            } else {
                addPlayer(this, players[id], false);
            }
        });
        updatePlayerCount();
    });

    socket.on('newPlayer', (playerInfo) => {
        addPlayer(this, playerInfo, false);
        updatePlayerCount();
    });

    socket.on('playerMoved', (playerData) => {
        if (otherPlayers[playerData.id]) {
            otherPlayers[playerData.id].sprite.setPosition(playerData.x, playerData.y);
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
}

function addPlayer(scene, playerInfo, isMainPlayer) {
    const sprite = scene.physics.add.sprite(playerInfo.x, playerInfo.y, null);

    const graphics = scene.add.graphics();
    graphics.fillStyle(isMainPlayer ? 0x0000ff : 0xff0000, 1);
    graphics.fillCircle(16, 16, 16);
    graphics.generateTexture('player-' + playerInfo.id, 32, 32);
    graphics.destroy();

    sprite.setTexture('player-' + playerInfo.id);
    sprite.setCollideWorldBounds(true);

    const nameText = scene.add.text(playerInfo.x, playerInfo.y - 30, playerInfo.username, {
        fontSize: '12px',
        fill: '#ffffff',
        backgroundColor: '#000000',
        padding: { x: 4, y: 2 }
    });
    nameText.setOrigin(0.5);

    if (isMainPlayer) {
        player = {
            sprite: sprite,
            nameText: nameText,
            id: playerInfo.id
        };
        scene.cameras.main.startFollow(sprite);
    } else {
        otherPlayers[playerInfo.id] = {
            sprite: sprite,
            nameText: nameText
        };
    }
}

function update() {
    if (!player) return;

    const speed = 200;
    let moving = false;

    player.sprite.setVelocity(0);

    if (cursors.left.isDown || wasd.left.isDown) {
        player.sprite.setVelocityX(-speed);
        moving = true;
    } else if (cursors.right.isDown || wasd.right.isDown) {
        player.sprite.setVelocityX(speed);
        moving = true;
    }

    if (cursors.up.isDown || wasd.up.isDown) {
        player.sprite.setVelocityY(-speed);
        moving = true;
    } else if (cursors.down.isDown || wasd.down.isDown) {
        player.sprite.setVelocityY(speed);
        moving = true;
    }

    player.nameText.setPosition(player.sprite.x, player.sprite.y - 30);

    if (moving) {
        socket.emit('playerMovement', {
            x: player.sprite.x,
            y: player.sprite.y
        });
    }

    Object.keys(otherPlayers).forEach((id) => {
        const other = otherPlayers[id];
        other.nameText.setPosition(other.sprite.x, other.sprite.y - 30);
    });
}

function updatePlayerCount() {
    const count = 1 + Object.keys(otherPlayers).length;
    document.getElementById('player-count').textContent = `Players online: ${count}`;
}
