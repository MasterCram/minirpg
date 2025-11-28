const CONFIG = require('../shared/config');

class PlayerManager {
    constructor(io) {
        this.io = io;
        this.players = {};
    }

    createPlayer(socketId) {
        // Spawn in the safe zone (middle 5x5)
        const minSpawnGrid = CONFIG.SPAWN_ZONE.CENTER_X - CONFIG.SPAWN_ZONE.RADIUS;
        const maxSpawnGrid = CONFIG.SPAWN_ZONE.CENTER_X + CONFIG.SPAWN_ZONE.RADIUS;

        const spawnGridX = minSpawnGrid + Math.floor(Math.random() * (maxSpawnGrid - minSpawnGrid + 1));
        const spawnGridY = minSpawnGrid + Math.floor(Math.random() * (maxSpawnGrid - minSpawnGrid + 1));

        const spawnX = spawnGridX * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
        const spawnY = spawnGridY * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;

        this.players[socketId] = {
            id: socketId,
            x: spawnX,
            y: spawnY,
            username: `Player${Math.floor(Math.random() * 1000)}`,
            health: 10,
            maxHealth: 10,
            currentInstance: 'town', // Track which map instance player is in
            inventory: Array(CONFIG.INVENTORY_SLOTS).fill(null),
            equipment: {
                cape: null,
                helmet: null,
                amulet: null,
                ring1: null,
                ring2: null,
                gloves: null,
                chestplate: null,
                leggings: null,
                mainHand: null,
                offHand: null,
                boots: null,
                belt: null
            },
            skills: {
                combat: 1,
                mining: 1,
                smithing: 1,
                crafting: 1,
                foraging: 1,
                slayer: 1
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
            gatheringItemId: null,
            gatheringWellId: null,
            gatheringPortalId: null,
            gatheringDuration: CONFIG.GATHERING_DURATION,
            itemPickupDuration: CONFIG.ITEM_PICKUP_DURATION
        };

        return this.players[socketId];
    }

    getPlayer(socketId) {
        return this.players[socketId];
    }

    getAllPlayers() {
        return this.players;
    }

    removePlayer(socketId) {
        delete this.players[socketId];
    }

    addItemToInventory(socketId, itemType) {
        const player = this.players[socketId];
        if (!player) return false;

        const emptySlot = player.inventory.findIndex(slot => slot === null);
        if (emptySlot !== -1) {
            player.inventory[emptySlot] = itemType;
            this.io.to(socketId).emit('inventoryUpdate', player.inventory);
            return true;
        }
        return false;
    }

    addMultipleItemsToInventory(socketId, itemTypes) {
        const player = this.players[socketId];
        if (!player) return false;

        for (const itemType of itemTypes) {
            const emptySlot = player.inventory.findIndex(slot => slot === null);
            if (emptySlot !== -1) {
                player.inventory[emptySlot] = itemType;
            }
        }

        this.io.to(socketId).emit('inventoryUpdate', player.inventory);
        return true;
    }

    removeItemFromInventory(socketId, slotIndex) {
        const player = this.players[socketId];
        if (!player || slotIndex < 0 || slotIndex >= CONFIG.INVENTORY_SLOTS) {
            return null;
        }

        const itemType = player.inventory[slotIndex];
        if (itemType === null) return null;

        player.inventory[slotIndex] = null;
        this.io.to(socketId).emit('inventoryUpdate', player.inventory);

        return itemType;
    }

    swapInventoryItems(socketId, fromSlot, toSlot) {
        const player = this.players[socketId];
        if (!player) return false;
        if (fromSlot < 0 || fromSlot >= CONFIG.INVENTORY_SLOTS) return false;
        if (toSlot < 0 || toSlot >= CONFIG.INVENTORY_SLOTS) return false;

        const temp = player.inventory[fromSlot];
        player.inventory[fromSlot] = player.inventory[toSlot];
        player.inventory[toSlot] = temp;

        this.io.to(socketId).emit('inventoryUpdate', player.inventory);
        return true;
    }

    setPlayerPath(socketId, path, targetResourceId = null) {
        const player = this.players[socketId];
        if (!player) return;

        player.path = path;
        player.pathIndex = 0;
        player.isMoving = true;
        player.targetResourceId = targetResourceId;
    }

    startGathering(socketId, resourceId, duration) {
        const player = this.players[socketId];
        if (!player) return;

        player.isGathering = true;
        player.gatheringStartTime = Date.now();
        player.gatheringResourceId = resourceId;
        player.gatheringItemId = null;
        player.isMoving = false;
        player.path = [];

        this.io.emit('playerStartedGathering', {
            playerId: socketId,
            resourceId: resourceId,
            duration: duration
        });
    }

    startPickingUpItem(socketId, itemId, duration) {
        const player = this.players[socketId];
        if (!player) return;

        player.isGathering = true;
        player.gatheringStartTime = Date.now();
        player.gatheringItemId = itemId;
        player.gatheringResourceId = null;
        player.isMoving = false;
        player.path = [];

        this.io.emit('playerStartedGathering', {
            playerId: socketId,
            resourceId: itemId,
            duration: duration
        });
    }

    stopGathering(socketId) {
        const player = this.players[socketId];
        if (!player) return;

        player.isGathering = false;
        player.gatheringStartTime = null;
        player.gatheringResourceId = null;
        player.gatheringItemId = null;
        player.gatheringWellId = null;
        player.gatheringPortalId = null;

        this.io.emit('playerFinishedGathering', { playerId: socketId });
    }

    startUsingWell(socketId, duration) {
        const player = this.players[socketId];
        if (!player) return;

        player.isGathering = true;
        player.gatheringStartTime = Date.now();
        player.gatheringWellId = 'well';
        player.gatheringResourceId = null;
        player.gatheringItemId = null;
        player.gatheringPortalId = null;
        player.isMoving = false;
        player.path = [];

        this.io.emit('playerStartedGathering', {
            playerId: socketId,
            resourceId: 'well',
            duration: duration
        });
    }

    startUsingPortal(socketId, portalId, duration) {
        const player = this.players[socketId];
        if (!player) return;

        player.isGathering = true;
        player.gatheringStartTime = Date.now();
        player.gatheringPortalId = portalId;
        player.gatheringResourceId = null;
        player.gatheringItemId = null;
        player.gatheringWellId = null;
        player.isMoving = false;
        player.path = [];

        this.io.emit('playerStartedGathering', {
            playerId: socketId,
            resourceId: portalId,
            duration: duration
        });
    }

    healPlayer(socketId) {
        const player = this.players[socketId];
        if (!player) return false;

        player.health = player.maxHealth;
        this.io.to(socketId).emit('healthUpdate', { health: player.health, maxHealth: player.maxHealth });
        return true;
    }

    teleportPlayer(socketId, instanceId, x, y) {
        const player = this.players[socketId];
        if (!player) return false;

        player.currentInstance = instanceId;
        player.x = x;
        player.y = y;
        player.isMoving = false;
        player.path = [];
        player.pathIndex = 0;

        console.log(`Player ${socketId} teleported to instance ${instanceId} at (${x}, ${y})`);
        return true;
    }

    getPlayersInInstance(instanceId) {
        const playersInInstance = {};
        Object.keys(this.players).forEach(playerId => {
            if (this.players[playerId].currentInstance === instanceId) {
                playersInInstance[playerId] = this.players[playerId];
            }
        });
        return playersInInstance;
    }
}


module.exports = PlayerManager;
