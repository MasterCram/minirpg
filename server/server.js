const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const CONFIG = require('../shared/config');
const PathFinder = require('./PathFinder');
const MapGenerator = require('./MapGenerator');
const ResourceManager = require('./ResourceManager');
const PlayerManager = require('./PlayerManager');
const DroppedItemManager = require('./DroppedItemManager');
const GameLoop = require('./GameLoop');

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
app.use('/shared', express.static(path.join(__dirname, '../shared')));

// Initialize game systems
const pathFinder = new PathFinder(CONFIG.WORLD_WIDTH, CONFIG.WORLD_HEIGHT);
const mapGenerator = new MapGenerator();
const resourceManager = new ResourceManager(pathFinder, io);
const playerManager = new PlayerManager(io);
const droppedItemManager = new DroppedItemManager(io);
const gameLoop = new GameLoop(io, playerManager, resourceManager, droppedItemManager);

// Generate initial world
mapGenerator.generateMap();

// Get multi-tile objects and pass to ResourceManager to avoid placing resources near trees
const multiTileObjects = mapGenerator.getMultiTileObjects();
resourceManager.setMultiTileObjects(multiTileObjects);

// Generate resources (will avoid multi-tile trees)
resourceManager.generateResources();

// Mark multi-tile object positions as obstacles in pathfinder
multiTileObjects.forEach(obj => {
  if (obj.type === 'house') {
    // Mark walls and base of house as obstacles (rows 3-8, top 3 rows are roof/transparent)
    obj.tiles.forEach(tile => {
      const relativeY = tile.y - obj.y;
      if (relativeY >= 3) { // Bottom 6 rows of the 9-row house
        pathFinder.setObstacle(tile.x, tile.y, true);
      }
    });
  } else if (obj.type === 'well') {
    // Mark all well tiles as obstacles (can't walk through well)
    obj.tiles.forEach(tile => {
      pathFinder.setObstacle(tile.x, tile.y, true);
    });
  }
});

// Start game loop
gameLoop.start();

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  // Create new player
  const player = playerManager.createPlayer(socket.id);

  // Send initial game state to client
  socket.emit('currentPlayers', playerManager.getAllPlayers());
  socket.broadcast.emit('newPlayer', player);

  // Handle map request
  socket.on('requestMap', () => {
    socket.emit('mapData', mapGenerator.getMap());
  });

  // Handle multi-tile objects request
  socket.on('requestMultiTileObjects', () => {
    socket.emit('multiTileObjectsData', mapGenerator.getMultiTileObjects());
  });

  // Handle resources request
  socket.on('requestResources', () => {
    socket.emit('resourcesData', resourceManager.getResources());
  });

  // Handle dropped items request
  socket.on('requestDroppedItems', () => {
    socket.emit('droppedItemsData', droppedItemManager.getDroppedItems());
  });

  // Handle path requests
  socket.on('requestPath', (data) => {
    const { startX, startY, endX, endY, targetResourceId } = data;

    console.log(`Path request from ${socket.id}: (${startX},${startY}) -> (${endX},${endY})`);

    const player = playerManager.getPlayer(socket.id);
    if (!player) return;

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
    playerManager.setPlayerPath(socket.id, path, targetResourceId);

    // Broadcast path to all clients
    io.emit('playerPath', {
      playerId: socket.id,
      path: path,
      targetResourceId: targetResourceId
    });
  });

  // Handle gathering request
  socket.on('startGathering', (data) => {
    const { resourceId } = data;
    const player = playerManager.getPlayer(socket.id);

    if (!player || player.isGathering) return;

    const resource = resourceManager.findResource(resourceId);
    if (!resource) return;

    // Verify player is adjacent to resource
    const playerGridX = Math.floor(player.x / CONFIG.TILE_SIZE);
    const playerGridY = Math.floor(player.y / CONFIG.TILE_SIZE);
    const resourceGridX = Math.floor(resource.x / CONFIG.TILE_SIZE);
    const resourceGridY = Math.floor(resource.y / CONFIG.TILE_SIZE);

    const distance = Math.abs(playerGridX - resourceGridX) + Math.abs(playerGridY - resourceGridY);

    if (distance > 1) {
      console.log('Player too far from resource');
      return;
    }

    // Check if inventory has space for the resource
    let requiredSlots = 0;
    if (resource.type === 'bush') {
      requiredSlots = 2; // Bushes give 2 woods
    } else if (resource.type === 'rock') {
      requiredSlots = 1; // Rocks give 1 stone
    }

    const emptySlots = player.inventory.filter(slot => slot === null).length;
    if (emptySlots < requiredSlots) {
      console.log(`${socket.id} inventory full - cannot start gathering`);
      socket.emit('inventoryFull', { message: 'Inventory is full!' });
      return;
    }

    // Start gathering
    playerManager.startGathering(socket.id, resourceId, CONFIG.GATHERING_DURATION);
    console.log(`${socket.id} started gathering resource ${resourceId}`);
  });

  // Handle dropping items
  socket.on('dropItem', (data) => {
    const { slotIndex } = data;
    const player = playerManager.getPlayer(socket.id);

    if (!player) return;

    const itemType = playerManager.removeItemFromInventory(socket.id, slotIndex);
    if (itemType) {
      droppedItemManager.dropItem(itemType, player.x, player.y);
      console.log(`${socket.id} dropped ${itemType} at (${player.x}, ${player.y})`);
    }
  });

  // Handle picking up items
  socket.on('pickupItem', (data) => {
    const { itemId } = data;
    const player = playerManager.getPlayer(socket.id);

    if (!player || player.isGathering) return;

    const item = droppedItemManager.findItem(itemId);
    if (!item) return;

    // Check distance
    const playerGridX = Math.floor(player.x / CONFIG.TILE_SIZE);
    const playerGridY = Math.floor(player.y / CONFIG.TILE_SIZE);
    const itemGridX = Math.floor(item.x / CONFIG.TILE_SIZE);
    const itemGridY = Math.floor(item.y / CONFIG.TILE_SIZE);

    const distance = Math.abs(playerGridX - itemGridX) + Math.abs(playerGridY - itemGridY);

    if (distance > 1) {
      console.log('Player too far from item');
      return;
    }

    // Find empty slot
    const emptySlot = player.inventory.findIndex(slot => slot === null);
    if (emptySlot === -1) {
      console.log('Inventory full');
      return;
    }

    // Start pickup
    playerManager.startPickingUpItem(socket.id, itemId, CONFIG.ITEM_PICKUP_DURATION);
    console.log(`${socket.id} started picking up ${item.type}`);
  });

  // Handle swapping items
  socket.on('swapItems', (data) => {
    const { fromSlot, toSlot } = data;
    const success = playerManager.swapInventoryItems(socket.id, fromSlot, toSlot);

    if (success) {
      console.log(`${socket.id} swapped items: slot ${fromSlot} <-> slot ${toSlot}`);
    }
  });

  // Handle well usage
  socket.on('useWell', () => {
    const success = playerManager.healPlayer(socket.id);
    if (!success) {
      socket.emit('wellCooldown', { message: 'Well is on cooldown (3 seconds)' });
    } else {
      console.log(`${socket.id} used the well and healed to full health`);
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    playerManager.removePlayer(socket.id);
    io.emit('playerDisconnected', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
  console.log(`Map size: ${CONFIG.WORLD_WIDTH}x${CONFIG.WORLD_HEIGHT} tiles (${CONFIG.WORLD_WIDTH * CONFIG.TILE_SIZE}x${CONFIG.WORLD_HEIGHT * CONFIG.TILE_SIZE} pixels)`);
});
