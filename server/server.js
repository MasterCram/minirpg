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

// PathFinder class for server-side pathfinding
class PathFinder {
    constructor(worldWidth, worldHeight) {
        this.worldWidth = worldWidth;
        this.worldHeight = worldHeight;
        this.obstacleGrid = [];
        this.initializeGrid();
    }

    initializeGrid() {
        this.obstacleGrid = [];
        for (let y = 0; y < this.worldHeight; y++) {
            this.obstacleGrid[y] = [];
            for (let x = 0; x < this.worldWidth; x++) {
                this.obstacleGrid[y][x] = 0;
            }
        }
    }

    setObstacle(x, y, isObstacle) {
        if (x >= 0 && x < this.worldWidth && y >= 0 && y < this.worldHeight) {
            this.obstacleGrid[y][x] = isObstacle ? 1 : 0;
        }
    }

    isObstacle(x, y) {
        if (x < 0 || x >= this.worldWidth || y < 0 || y >= this.worldHeight) {
            return true;
        }
        return this.obstacleGrid[y][x] === 1;
    }

    findPath(startX, startY, endX, endY) {
        // Clamp coordinates to valid range
        startX = Math.max(0, Math.min(startX, this.worldWidth - 1));
        startY = Math.max(0, Math.min(startY, this.worldHeight - 1));
        endX = Math.max(0, Math.min(endX, this.worldWidth - 1));
        endY = Math.max(0, Math.min(endY, this.worldHeight - 1));

        // If already at destination, return empty path
        if (startX === endX && startY === endY) {
            return [];
        }

        // Check if destination is blocked
        if (this.isObstacle(endX, endY)) {
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
        fScore.set(startKey, this.heuristic(startX, startY, endX, endY));

        while (openSet.length > 0) {
            openSet.sort((a, b) => fScore.get(a.key) - fScore.get(b.key));
            const current = openSet.shift();

            if (current.key === endKey) {
                return this.reconstructPath(cameFrom, current.key, startX, startY);
            }

            closedSet.add(current.key);

            const neighbors = [
                { x: current.x - 1, y: current.y },
                { x: current.x + 1, y: current.y },
                { x: current.x, y: current.y - 1 },
                { x: current.x, y: current.y + 1 }
            ];

            for (const neighbor of neighbors) {
                if (neighbor.x < 0 || neighbor.x >= this.worldWidth ||
                    neighbor.y < 0 || neighbor.y >= this.worldHeight) {
                    continue;
                }

                const neighborKey = `${neighbor.x},${neighbor.y}`;

                if (closedSet.has(neighborKey)) {
                    continue;
                }

                // Don't treat destination as obstacle, but treat all other obstacles as blocked
                if (this.obstacleGrid[neighbor.y][neighbor.x] === 1 && neighborKey !== endKey) {
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
                fScore.set(neighborKey, tentativeGScore + this.heuristic(neighbor.x, neighbor.y, endX, endY));
            }
        }

        return null;
    }

    heuristic(x1, y1, x2, y2) {
        return Math.abs(x1 - x2) + Math.abs(y1 - y2);
    }

    reconstructPath(cameFrom, currentKey, startX, startY) {
        const path = [];
        const startKey = `${startX},${startY}`;

        while (currentKey !== startKey) {
            const [x, y] = currentKey.split(',').map(Number);
            path.unshift({ x, y });
            currentKey = cameFrom.get(currentKey);
        }

        return path;
    }

    getAdjacentTiles(x, y) {
        return [
            { x: x - 1, y: y },
            { x: x + 1, y: y },
            { x: x, y: y - 1 },
            { x: x, y: y + 1 }
        ].filter(tile =>
            tile.x >= 0 && tile.x < this.worldWidth &&
            tile.y >= 0 && tile.y < this.worldHeight
        );
    }
}

// Initialize pathfinder
const pathFinder = new PathFinder(WORLD_WIDTH, WORLD_HEIGHT);

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

    const resource = {
      id: resourceIdCounter++,
      type: 'tree',
      x: x,
      y: y
    };

    resources.push(resource);

    // Register as obstacle in pathfinder
    const gridX = Math.floor(x / TILE_SIZE);
    const gridY = Math.floor(y / TILE_SIZE);
    pathFinder.setObstacle(gridX, gridY, true);
  }

  for (let i = 0; i < rockCount; i++) {
    const x = Math.floor(Math.random() * WORLD_WIDTH) * TILE_SIZE + TILE_SIZE / 2;
    const y = Math.floor(Math.random() * WORLD_HEIGHT) * TILE_SIZE + TILE_SIZE / 2;

    const resource = {
      id: resourceIdCounter++,
      type: 'rock',
      x: x,
      y: y
    };

    resources.push(resource);

    // Register as obstacle in pathfinder
    const gridX = Math.floor(x / TILE_SIZE);
    const gridY = Math.floor(y / TILE_SIZE);
    pathFinder.setObstacle(gridX, gridY, true);
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

  // Handle path requests from clients
  socket.on('requestPath', (data) => {
    const { startX, startY, endX, endY, targetResourceId } = data;

    console.log(`Path request from ${socket.id}: (${startX},${startY}) -> (${endX},${endY})`);

    // Calculate path on server
    const path = pathFinder.findPath(startX, startY, endX, endY);

    if (path === null) {
      console.log('No path found - obstacle blocking');
      socket.emit('pathResult', { path: null, targetResourceId });
      return;
    }

    if (path.length === 0) {
      console.log('Already at destination');
      socket.emit('pathResult', { path: [], targetResourceId });
      return;
    }

    console.log(`Path found with ${path.length} waypoints`);

    // Broadcast path to all clients so they all see the same movement
    io.emit('playerPath', {
      playerId: socket.id,
      path: path,
      targetResourceId: targetResourceId
    });
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

      // Remove obstacle from pathfinder
      const gridX = Math.floor(resource.x / TILE_SIZE);
      const gridY = Math.floor(resource.y / TILE_SIZE);
      pathFinder.setObstacle(gridX, gridY, false);

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

        // Add new obstacle to pathfinder
        const newGridX = Math.floor(newResource.x / TILE_SIZE);
        const newGridY = Math.floor(newResource.y / TILE_SIZE);
        pathFinder.setObstacle(newGridX, newGridY, true);

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
