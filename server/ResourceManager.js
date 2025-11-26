const CONFIG = require('../shared/config');

class ResourceManager {
    constructor(pathFinder, io) {
        this.pathFinder = pathFinder;
        this.io = io;
        this.resources = [];
        this.resourceIdCounter = 0;
    }

    generateResources() {
        console.log('Generating resources...');
        this.resources = [];
        this.resourceIdCounter = 0;

        const occupiedTiles = new Set();

        // Helper function to check if tile is occupied
        const isTileOccupied = (gridX, gridY) => {
            return occupiedTiles.has(`${gridX},${gridY}`);
        };

        // Generate trees
        let treesGenerated = 0;
        let attempts = 0;
        while (treesGenerated < CONFIG.TREE_COUNT && attempts < CONFIG.TREE_COUNT * 3) {
            const gridX = Math.floor(Math.random() * CONFIG.WORLD_WIDTH);
            const gridY = Math.floor(Math.random() * CONFIG.WORLD_HEIGHT);

            if (!isTileOccupied(gridX, gridY)) {
                const x = gridX * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
                const y = gridY * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;

                const resource = {
                    id: this.resourceIdCounter++,
                    type: 'tree',
                    x: x,
                    y: y
                };

                this.resources.push(resource);
                occupiedTiles.add(`${gridX},${gridY}`);
                this.pathFinder.setObstacle(gridX, gridY, true);
                treesGenerated++;
            }
            attempts++;
        }

        // Generate rocks
        let rocksGenerated = 0;
        attempts = 0;
        while (rocksGenerated < CONFIG.ROCK_COUNT && attempts < CONFIG.ROCK_COUNT * 3) {
            const gridX = Math.floor(Math.random() * CONFIG.WORLD_WIDTH);
            const gridY = Math.floor(Math.random() * CONFIG.WORLD_HEIGHT);

            if (!isTileOccupied(gridX, gridY)) {
                const x = gridX * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
                const y = gridY * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;

                const resource = {
                    id: this.resourceIdCounter++,
                    type: 'rock',
                    x: x,
                    y: y
                };

                this.resources.push(resource);
                occupiedTiles.add(`${gridX},${gridY}`);
                this.pathFinder.setObstacle(gridX, gridY, true);
                rocksGenerated++;
            }
            attempts++;
        }

        console.log(`Generated ${treesGenerated} trees and ${rocksGenerated} rocks`);
    }

    getResources() {
        return this.resources;
    }

    findResource(resourceId) {
        return this.resources.find(r => r.id === resourceId);
    }

    removeResource(resourceId) {
        const resourceIndex = this.resources.findIndex(r => r.id === resourceId);
        if (resourceIndex !== -1) {
            const resource = this.resources[resourceIndex];

            // Remove obstacle from pathfinder
            const gridX = Math.floor(resource.x / CONFIG.TILE_SIZE);
            const gridY = Math.floor(resource.y / CONFIG.TILE_SIZE);
            this.pathFinder.setObstacle(gridX, gridY, false);

            // Remove resource
            this.resources.splice(resourceIndex, 1);

            // Broadcast resource removal
            this.io.emit('resourceGathered', { resourceId });

            return resource;
        }
        return null;
    }

    respawnResource(resourceType) {
        setTimeout(() => {
            let respawned = false;
            let attempts = 0;

            while (!respawned && attempts < 100) {
                const gridX = Math.floor(Math.random() * CONFIG.WORLD_WIDTH);
                const gridY = Math.floor(Math.random() * CONFIG.WORLD_HEIGHT);

                // Check if tile is already occupied
                const occupied = this.resources.some(r => {
                    const rGridX = Math.floor(r.x / CONFIG.TILE_SIZE);
                    const rGridY = Math.floor(r.y / CONFIG.TILE_SIZE);
                    return rGridX === gridX && rGridY === gridY;
                });

                if (!occupied) {
                    const newResource = {
                        id: this.resourceIdCounter++,
                        type: resourceType,
                        x: gridX * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2,
                        y: gridY * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2
                    };
                    this.resources.push(newResource);
                    this.pathFinder.setObstacle(gridX, gridY, true);
                    this.io.emit('resourcesData', [newResource]);
                    console.log(`Respawned ${resourceType} at (${newResource.x}, ${newResource.y})`);
                    respawned = true;
                }
                attempts++;
            }
        }, CONFIG.RESOURCE_RESPAWN_TIME);
    }
}

module.exports = ResourceManager;
