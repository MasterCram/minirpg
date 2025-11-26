const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, '../client')));

const TILE_SIZE = 32;
const WORLD_WIDTH = 25;
const WORLD_HEIGHT = 25;

const players = {};
let gameMap = [];
let resources = [];
let resourceIdCounter = 0;

function generateMap() {
  console.log('Generating game map...');
  gameMap = [];

  for (let y = 0; y < WORLD_HEIGHT; y++) {
    gameMap[y] = [];
    for (let x = 0; x < WORLD_WIDTH; x++) {
      const random = Math.random();
      if (random < 0.85) {
        // 80% regular grass, 20% grass variant
        const grassVariant = Math.random();
        gameMap[y][x] = grassVariant < 0.8 ? 'grass' : 'grass_var';
      } else {
        gameMap[y][x] = 'dirt';
      }
    }
  }

  console.log('Map generated successfully!');
}

function generateResources() {
  console.log('Generating resources...');
  resources = [];
  resourceIdCounter = 0;

  const treeCount = 150;
  const rockCount = 100;

  for (let i = 0; i < treeCount; i++) {
    const x = Math.floor(Math.random() * WORLD_WIDTH) * TILE_SIZE + TILE_SIZE / 2;
    const y = Math.floor(Math.random() * WORLD_HEIGHT) * TILE_SIZE + TILE_SIZE / 2;

    resources.push({
      id: resourceIdCounter++,
      type: 'tree',
      x: x,
      y: y
    });
  }

  for (let i = 0; i < rockCount; i++) {
    const x = Math.floor(Math.random() * WORLD_WIDTH) * TILE_SIZE + TILE_SIZE / 2;
    const y = Math.floor(Math.random() * WORLD_HEIGHT) * TILE_SIZE + TILE_SIZE / 2;

    resources.push({
      id: resourceIdCounter++,
      type: 'rock',
      x: x,
      y: y
    });
  }

  console.log(`Generated ${treeCount} trees and ${rockCount} rocks`);
}

generateMap();
generateResources();

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  const spawnX = Math.floor(Math.random() * WORLD_WIDTH) * TILE_SIZE + TILE_SIZE / 2;
  const spawnY = Math.floor(Math.random() * WORLD_HEIGHT) * TILE_SIZE + TILE_SIZE / 2;

  players[socket.id] = {
    id: socket.id,
    x: spawnX,
    y: spawnY,
    username: `Player${Math.floor(Math.random() * 1000)}`,
    inventory: {
      wood: 0,
      stone: 0
    }
  };

  socket.emit('currentPlayers', players);
  socket.broadcast.emit('newPlayer', players[socket.id]);

  socket.on('requestMap', () => {
    socket.emit('mapData', gameMap);
  });

  socket.on('requestResources', () => {
    socket.emit('resourcesData', resources);
  });

  socket.on('playerMovement', (movementData) => {
    if (players[socket.id]) {
      players[socket.id].x = movementData.x;
      players[socket.id].y = movementData.y;

      socket.broadcast.emit('playerMoved', {
        id: socket.id,
        x: movementData.x,
        y: movementData.y
      });
    }
  });

  socket.on('gatherResource', (resourceId) => {
    const resourceIndex = resources.findIndex(r => r.id === resourceId);

    if (resourceIndex !== -1) {
      const resource = resources[resourceIndex];

      if (resource.type === 'tree') {
        players[socket.id].inventory.wood += 1;
      } else if (resource.type === 'rock') {
        players[socket.id].inventory.stone += 1;
      }

      resources.splice(resourceIndex, 1);

      io.emit('resourceGathered', { resourceId: resourceId });

      socket.emit('inventoryUpdate', players[socket.id].inventory);

      console.log(`${socket.id} gathered ${resource.type}. New inventory:`, players[socket.id].inventory);

      setTimeout(() => {
        const newResource = {
          id: resourceIdCounter++,
          type: resource.type,
          x: Math.floor(Math.random() * WORLD_WIDTH) * TILE_SIZE + TILE_SIZE / 2,
          y: Math.floor(Math.random() * WORLD_HEIGHT) * TILE_SIZE + TILE_SIZE / 2
        };
        resources.push(newResource);
        io.emit('resourcesData', [newResource]);
        console.log(`Respawned ${resource.type} at (${newResource.x}, ${newResource.y})`);
      }, 5000);
    }
  });

  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    delete players[socket.id];
    io.emit('playerDisconnected', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
  console.log(`Map size: ${WORLD_WIDTH}x${WORLD_HEIGHT} tiles (${WORLD_WIDTH * TILE_SIZE}x${WORLD_HEIGHT * TILE_SIZE} pixels)`);
});
