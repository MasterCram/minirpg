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

// Server-side movement settings
const MOVE_SPEED = 150; // Pixels per second (matches client)
const UPDATE_INTERVAL = 16; // ~60fps server updates

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
  const occupiedTiles = new Set(); // Track occupied tiles

  // Helper function to check if tile is occupied
  const isTileOccupied = (gridX, gridY) => {
    return occupiedTiles.has(`${gridX},${gridY}`);
  };

  // Generate trees
  let treesGenerated = 0;
  let attempts = 0;
  while (treesGenerated < treeCount && attempts < treeCount * 3) {
    const gridX = Math.floor(Math.random() * WORLD_WIDTH);
    const gridY = Math.floor(Math.random() * WORLD_HEIGHT);

    if (!isTileOccupied(gridX, gridY)) {
      const x = gridX * TILE_SIZE + TILE_SIZE / 2;
      const y = gridY * TILE_SIZE + TILE_SIZE / 2;

      const resource = {
        id: resourceIdCounter++,
        type: 'tree',
        x: x,
        y: y
      };

      resources.push(resource);
      occupiedTiles.add(`${gridX},${gridY}`);
      pathFinder.setObstacle(gridX, gridY, true);
      treesGenerated++;
    }
    attempts++;
  }

  // Generate rocks
  let rocksGenerated = 0;
  attempts = 0;
  while (rocksGenerated < rockCount && attempts < rockCount * 3) {
    const gridX = Math.floor(Math.random() * WORLD_WIDTH);
    const gridY = Math.floor(Math.random() * WORLD_HEIGHT);

    if (!isTileOccupied(gridX, gridY)) {
      const x = gridX * TILE_SIZE + TILE_SIZE / 2;
      const y = gridY * TILE_SIZE + TILE_SIZE / 2;

      const resource = {
        id: resourceIdCounter++,
        type: 'rock',
        x: x,
        y: y
      };

      resources.push(resource);
      occupiedTiles.add(`${gridX},${gridY}`);
      pathFinder.setObstacle(gridX, gridY, true);
      rocksGenerated++;
    }
    attempts++;
  }

  console.log(`Generated ${treesGenerated} trees and ${rocksGenerated} rocks`);
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
    },
    // Server-side movement state
    path: [],
    pathIndex: 0,
    isMoving: false,
    targetResourceId: null,
    // Server-side gathering state
    isGathering: false,
    gatheringStartTime: null,
    gatheringResourceId: null,
    gatheringDuration: 3000
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

    if (!players[socket.id]) return;

    // Calculate path on server
    const path = pathFinder.findPath(startX, startY, endX, endY);

    if (path === null) {
      console.log('No path found - obstacle blocking');
      return;
    }

    if (path.length === 0) {
      console.log('Already at destination');
      return;
    }

    console.log(`Path found with ${path.length} waypoints`);

    // Set path on server-side player object
    players[socket.id].path = path;
    players[socket.id].pathIndex = 0;
    players[socket.id].isMoving = true;
    players[socket.id].targetResourceId = targetResourceId || null;

    // Broadcast path to all clients so they can show visual feedback
    io.emit('playerPath', {
      playerId: socket.id,
      path: path,
      targetResourceId: targetResourceId
    });
  });

  // playerMovement is now handled server-side in the game loop

  // Handle gathering request from client
  socket.on('startGathering', (data) => {
    const { resourceId } = data;
    const player = players[socket.id];

    if (!player || player.isGathering) return;

    const resource = resources.find(r => r.id === resourceId);
    if (!resource) return;

    // Verify player is adjacent to resource
    const playerGridX = Math.floor(player.x / TILE_SIZE);
    const playerGridY = Math.floor(player.y / TILE_SIZE);
    const resourceGridX = Math.floor(resource.x / TILE_SIZE);
    const resourceGridY = Math.floor(resource.y / TILE_SIZE);

    const distance = Math.abs(playerGridX - resourceGridX) + Math.abs(playerGridY - resourceGridY);

    if (distance > 1) {
      console.log('Player too far from resource');
      return;
    }

    // Start gathering
    player.isGathering = true;
    player.gatheringStartTime = Date.now();
    player.gatheringResourceId = resourceId;
    player.isMoving = false;
    player.path = [];

    // Broadcast to all clients
    io.emit('playerStartedGathering', {
      playerId: socket.id,
      resourceId: resourceId,
      duration: player.gatheringDuration
    });

    console.log(`${socket.id} started gathering resource ${resourceId}`);
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

// Server-side game loop for player movement simulation
let lastUpdateTime = Date.now();

setInterval(() => {
  const currentTime = Date.now();
  const deltaTime = currentTime - lastUpdateTime;
  lastUpdateTime = currentTime;

  let positionUpdates = [];
  let gatheringUpdates = [];

  // Update all players
  Object.keys(players).forEach(playerId => {
    const player = players[playerId];

    // Update gathering progress
    if (player.isGathering && player.gatheringStartTime !== null) {
      const elapsed = currentTime - player.gatheringStartTime;
      const progress = Math.min(elapsed / player.gatheringDuration, 1);

      gatheringUpdates.push({
        playerId: playerId,
        resourceId: player.gatheringResourceId,
        progress: progress
      });

      // Check if gathering is complete
      if (progress >= 1) {
        const resourceIndex = resources.findIndex(r => r.id === player.gatheringResourceId);

        if (resourceIndex !== -1) {
          const resource = resources[resourceIndex];

          // Remove obstacle from pathfinder
          const gridX = Math.floor(resource.x / TILE_SIZE);
          const gridY = Math.floor(resource.y / TILE_SIZE);
          pathFinder.setObstacle(gridX, gridY, false);

          // Update inventory
          if (resource.type === 'tree') {
            player.inventory.wood += 1;
          } else if (resource.type === 'rock') {
            player.inventory.stone += 1;
          }

          // Remove resource
          resources.splice(resourceIndex, 1);

          // Broadcast resource removal
          io.emit('resourceGathered', { resourceId: player.gatheringResourceId });

          // Send inventory update
          io.to(playerId).emit('inventoryUpdate', player.inventory);

          console.log(`${playerId} gathered ${resource.type}. New inventory:`, player.inventory);

          // Respawn resource after 5 seconds
          setTimeout(() => {
            let respawned = false;
            let attempts = 0;

            while (!respawned && attempts < 100) {
              const gridX = Math.floor(Math.random() * WORLD_WIDTH);
              const gridY = Math.floor(Math.random() * WORLD_HEIGHT);

              // Check if tile is already occupied
              const occupied = resources.some(r => {
                const rGridX = Math.floor(r.x / TILE_SIZE);
                const rGridY = Math.floor(r.y / TILE_SIZE);
                return rGridX === gridX && rGridY === gridY;
              });

              if (!occupied) {
                const newResource = {
                  id: resourceIdCounter++,
                  type: resource.type,
                  x: gridX * TILE_SIZE + TILE_SIZE / 2,
                  y: gridY * TILE_SIZE + TILE_SIZE / 2
                };
                resources.push(newResource);
                pathFinder.setObstacle(gridX, gridY, true);
                io.emit('resourcesData', [newResource]);
                console.log(`Respawned ${resource.type} at (${newResource.x}, ${newResource.y})`);
                respawned = true;
              }
              attempts++;
            }
          }, 5000);
        }

        // Reset gathering state
        player.isGathering = false;
        player.gatheringStartTime = null;
        player.gatheringResourceId = null;

        // Broadcast gathering complete
        io.emit('playerFinishedGathering', { playerId: playerId });
      }
    }

    // Update movement
    if (player.isMoving && player.path.length > 0 && player.pathIndex < player.path.length) {
      const target = player.path[player.pathIndex];
      const targetX = target.x * TILE_SIZE + TILE_SIZE / 2;
      const targetY = target.y * TILE_SIZE + TILE_SIZE / 2;

      const distance = Math.sqrt(
        Math.pow(targetX - player.x, 2) + Math.pow(targetY - player.y, 2)
      );

      const speed = (MOVE_SPEED * deltaTime) / 1000;

      if (distance <= speed || distance < 1) {
        // Snap to exact position
        player.x = targetX;
        player.y = targetY;
        player.pathIndex++;

        // Check if path is complete
        if (player.pathIndex >= player.path.length) {
          player.isMoving = false;
          player.path = [];
          player.pathIndex = 0;

          // Handle automatic resource gathering if applicable
          if (player.targetResourceId !== null) {
            const resourceId = player.targetResourceId;
            player.targetResourceId = null;

            const resource = resources.find(r => r.id === resourceId);
            if (resource) {
              // Start gathering automatically
              player.isGathering = true;
              player.gatheringStartTime = Date.now();
              player.gatheringResourceId = resourceId;

              io.emit('playerStartedGathering', {
                playerId: playerId,
                resourceId: resourceId,
                duration: player.gatheringDuration
              });
            }
          }
        }
      } else {
        // Move toward target
        const angle = Math.atan2(targetY - player.y, targetX - player.x);
        player.x += Math.cos(angle) * speed;
        player.y += Math.sin(angle) * speed;
      }

      // Add to position updates
      positionUpdates.push({
        id: playerId,
        x: player.x,
        y: player.y,
        pathIndex: player.pathIndex
      });
    }
  });

  // Broadcast all position updates to all clients
  if (positionUpdates.length > 0) {
    io.emit('playersPositionUpdate', positionUpdates);
  }

  // Broadcast gathering progress updates
  if (gatheringUpdates.length > 0) {
    io.emit('gatheringProgressUpdate', gatheringUpdates);
  }
}, UPDATE_INTERVAL);
