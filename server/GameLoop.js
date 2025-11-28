const CONFIG = require('../shared/config');

class GameLoop {
    constructor(io, playerManager, resourceManager, droppedItemManager, instanceManager, townPathFinder, townMapGenerator) {
        this.io = io;
        this.playerManager = playerManager;
        this.resourceManager = resourceManager;
        this.droppedItemManager = droppedItemManager;
        this.instanceManager = instanceManager;
        this.townPathFinder = townPathFinder;
        this.townMapGenerator = townMapGenerator;
        this.lastUpdateTime = Date.now();
    }

    start() {
        setInterval(() => this.update(), CONFIG.SERVER_UPDATE_INTERVAL);
    }

    update() {
        const currentTime = Date.now();
        const deltaTime = currentTime - this.lastUpdateTime;
        this.lastUpdateTime = currentTime;

        const positionUpdates = [];
        const gatheringUpdates = [];

        const players = this.playerManager.getAllPlayers();

        Object.keys(players).forEach(playerId => {
            const player = players[playerId];

            // Update gathering progress
            this.updateGathering(player, playerId, currentTime, gatheringUpdates);

            // Update movement
            this.updateMovement(player, playerId, deltaTime, positionUpdates);
        });

        // Broadcast updates
        if (positionUpdates.length > 0) {
            this.io.emit('playersPositionUpdate', positionUpdates);
        }

        if (gatheringUpdates.length > 0) {
            this.io.emit('gatheringProgressUpdate', gatheringUpdates);
        }
    }

    updateGathering(player, playerId, currentTime, gatheringUpdates) {
        if (!player.isGathering || player.gatheringStartTime === null) return;

        const isPickingUpItem = player.gatheringItemId !== null;
        const isUsingWell = player.gatheringWellId !== null;
        const isUsingPortal = player.gatheringPortalId !== null;

        const duration = isPickingUpItem ? player.itemPickupDuration : player.gatheringDuration;
        const elapsed = currentTime - player.gatheringStartTime;
        const progress = Math.min(elapsed / duration, 1);

        let resourceId;
        if (isPickingUpItem) {
            resourceId = player.gatheringItemId;
        } else if (isUsingWell) {
            resourceId = player.gatheringWellId;
        } else if (isUsingPortal) {
            resourceId = player.gatheringPortalId;
        } else {
            resourceId = player.gatheringResourceId;
        }

        gatheringUpdates.push({
            playerId: playerId,
            resourceId: resourceId,
            progress: progress
        });

        // Check if gathering/pickup is complete
        if (progress >= 1) {
            if (isPickingUpItem) {
                this.completeItemPickup(player, playerId);
            } else if (isUsingWell) {
                this.completeWellUsage(player, playerId);
            } else if (isUsingPortal) {
                this.completePortalUsage(player, playerId);
            } else {
                this.completeResourceGathering(player, playerId);
            }
        }
    }

    completeItemPickup(player, playerId) {
        const item = this.droppedItemManager.findItem(player.gatheringItemId);

        if (item) {
            // Add to inventory
            const success = this.playerManager.addItemToInventory(playerId, item.type);

            if (success) {
                // Remove from dropped items
                this.droppedItemManager.removeItem(player.gatheringItemId);
                console.log(`${playerId} picked up ${item.type}`);
            }
        }

        this.playerManager.stopGathering(playerId);
    }

    completeWellUsage(player, playerId) {
        // Heal player to full health
        this.playerManager.healPlayer(playerId);
        this.playerManager.stopGathering(playerId);
        console.log(`${playerId} used the well and healed to full health`);
    }

    completePortalUsage(player, playerId) {
        this.playerManager.stopGathering(playerId);

        const currentInstance = player.currentInstance;

        if (currentInstance === 'town') {
            // Teleport to forest instance
            const forestInstance = this.instanceManager.createForestInstance(playerId);

            // Teleport player to spawn point in forest (center of map)
            const spawnX = Math.floor(CONFIG.WORLD_WIDTH / 2) * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
            const spawnY = 2 * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2; // Top of map

            this.playerManager.teleportPlayer(playerId, forestInstance.id, spawnX, spawnY);

            // Send instance change to client
            this.io.to(playerId).emit('instanceChange', {
                instanceId: forestInstance.id,
                map: forestInstance.map,
                multiTileObjects: forestInstance.multiTileObjects,
                resources: forestInstance.resourceManager.getResources(),
                playerX: spawnX,
                playerY: spawnY
            });

            console.log(`${playerId} teleported to forest instance ${forestInstance.id}`);
        } else if (currentInstance.startsWith('forest_')) {
            // Teleport back to town
            const spawnX = Math.floor(CONFIG.WORLD_WIDTH / 2) * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
            const spawnY = Math.floor(CONFIG.WORLD_HEIGHT / 2) * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;

            this.playerManager.teleportPlayer(playerId, 'town', spawnX, spawnY);

            // Send instance change to client
            this.io.to(playerId).emit('instanceChange', {
                instanceId: 'town',
                map: this.townMapGenerator.getMap(),
                multiTileObjects: this.townMapGenerator.getMultiTileObjects(),
                resources: this.resourceManager.getResources(),
                playerX: spawnX,
                playerY: spawnY
            });

            console.log(`${playerId} teleported back to town from ${currentInstance}`);
        }
    }

    completeResourceGathering(player, playerId) {
        // Get correct resource manager based on player's instance
        let currentResourceManager = this.resourceManager;
        if (player.currentInstance !== 'town') {
            const instance = this.instanceManager.getInstance(player.currentInstance);
            if (instance && instance.resourceManager) {
                currentResourceManager = instance.resourceManager;
            }
        }

        const resource = currentResourceManager.findResource(player.gatheringResourceId);

        if (resource) {
            // Determine items to add
            let itemsToAdd = [];
            if (resource.type === 'bush') {
                itemsToAdd = ['wood', 'wood']; // Bushes give 2 woods
            } else if (resource.type === 'rock') {
                itemsToAdd = ['stone']; // Rocks give 1 stone
            } else if (resource.type === 'tree') {
                itemsToAdd = ['wood', 'wood', 'wood']; // Trees give 3 woods
            }

            // Check if inventory has enough space
            const emptySlots = player.inventory.filter(slot => slot === null).length;
            if (emptySlots < itemsToAdd.length) {
                console.log(`${playerId} inventory full - cannot gather`);
                this.io.to(playerId).emit('inventoryFull', { message: 'Inventory is full!' });
                this.playerManager.stopGathering(playerId);
                return;
            }

            // Add items to inventory
            this.playerManager.addMultipleItemsToInventory(playerId, itemsToAdd);

            // Remove resource and respawn
            currentResourceManager.removeResource(player.gatheringResourceId);
            currentResourceManager.respawnResource(resource.type);

            console.log(`${playerId} gathered ${resource.type}`);
        }

        this.playerManager.stopGathering(playerId);
    }

    updateMovement(player, playerId, deltaTime, positionUpdates) {
        if (!player.isMoving || player.path.length === 0 || player.pathIndex >= player.path.length) {
            return;
        }

        const target = player.path[player.pathIndex];
        const targetX = target.x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
        const targetY = target.y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;

        const distance = Math.sqrt(
            Math.pow(targetX - player.x, 2) + Math.pow(targetY - player.y, 2)
        );

        const speed = (CONFIG.MOVE_SPEED * deltaTime) / 1000;

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

                    // Get correct resource manager based on player's instance
                    let currentResourceManager = this.resourceManager;
                    if (player.currentInstance !== 'town') {
                        const instance = this.instanceManager.getInstance(player.currentInstance);
                        if (instance && instance.resourceManager) {
                            currentResourceManager = instance.resourceManager;
                        }
                    }

                    const resource = currentResourceManager.findResource(resourceId);
                    if (resource) {
                        this.playerManager.startGathering(playerId, resourceId, player.gatheringDuration);
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
}

module.exports = GameLoop;
