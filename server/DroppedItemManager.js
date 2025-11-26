const CONFIG = require('../shared/config');

class DroppedItemManager {
    constructor(io) {
        this.io = io;
        this.droppedItems = [];
        this.droppedItemIdCounter = 0;
    }

    dropItem(itemType, x, y) {
        // Snap to tile center
        const gridX = Math.floor(x / CONFIG.TILE_SIZE);
        const gridY = Math.floor(y / CONFIG.TILE_SIZE);

        const droppedItem = {
            id: this.droppedItemIdCounter++,
            type: itemType,
            x: gridX * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2,
            y: gridY * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2
        };

        this.droppedItems.push(droppedItem);
        this.io.emit('itemDropped', droppedItem);

        return droppedItem;
    }

    findItem(itemId) {
        return this.droppedItems.find(item => item.id === itemId);
    }

    removeItem(itemId) {
        const itemIndex = this.droppedItems.findIndex(item => item.id === itemId);
        if (itemIndex !== -1) {
            const item = this.droppedItems[itemIndex];
            this.droppedItems.splice(itemIndex, 1);
            this.io.emit('itemPickedUp', { itemId });
            return item;
        }
        return null;
    }

    getDroppedItems() {
        return this.droppedItems;
    }
}

module.exports = DroppedItemManager;
