const CONFIG = require('../shared/config');

class PlayerManager {
    constructor(io) {
        this.io = io;
        this.players = {};
    }

    createPlayer(socketId) {
        const spawnX = Math.floor(Math.random() * CONFIG.WORLD_WIDTH) * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
        const spawnY = Math.floor(Math.random() * CONFIG.WORLD_HEIGHT) * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;

        this.players[socketId] = {
            id: socketId,
            x: spawnX,
            y: spawnY,
            username: `Player${Math.floor(Math.random() * 1000)}`,
            inventory: Array(CONFIG.INVENTORY_SLOTS).fill(null),
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

        this.io.emit('playerFinishedGathering', { playerId: socketId });
    }
}

module.exports = PlayerManager;
