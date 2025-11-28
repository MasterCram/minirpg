const CONFIG = require('../shared/config');
const PathFinder = require('./PathFinder');
const ForestMapGenerator = require('./ForestMapGenerator');
const ResourceManager = require('./ResourceManager');

class InstanceManager {
    constructor(io) {
        this.io = io;
        this.instances = new Map();

        // Create the main town instance
        this.createTownInstance();
    }

    createTownInstance() {
        // Town instance is created in server.js and passed separately
        // This is just a placeholder - actual town setup is in server.js
        console.log('Town instance will be managed separately');
    }

    createForestInstance(playerId) {
        const instanceId = `forest_${playerId}`;

        if (this.instances.has(instanceId)) {
            // Instance already exists, return it
            return this.instances.get(instanceId);
        }

        console.log(`Creating new forest instance: ${instanceId}`);

        // Generate forest map
        const forestMapGenerator = new ForestMapGenerator();
        forestMapGenerator.generateForestMap();

        // Create pathfinder for this instance
        const pathFinder = new PathFinder(CONFIG.WORLD_WIDTH, CONFIG.WORLD_HEIGHT);

        // Create resource manager for this instance
        const resourceManager = new ResourceManager(pathFinder, this.io);
        resourceManager.setMultiTileObjects(forestMapGenerator.getMultiTileObjects());
        resourceManager.generateResources();

        // Mark multi-tile objects as obstacles
        const multiTileObjects = forestMapGenerator.getMultiTileObjects();
        multiTileObjects.forEach(obj => {
            if (obj.type === 'tree') {
                // Mark bottom 2 rows of trees as obstacles
                obj.tiles.forEach(tile => {
                    const relativeY = tile.y - obj.y;
                    if (relativeY >= 3) { // Bottom 2 rows of the 5-row tree
                        pathFinder.setObstacle(tile.x, tile.y, true);
                    }
                });
            } else if (obj.type === 'portal') {
                // Mark bottom tiles of portal as obstacles
                obj.tiles.forEach(tile => {
                    const relativeY = tile.y - obj.y;
                    if (relativeY >= 1) { // Bottom row of the 2-row portal
                        pathFinder.setObstacle(tile.x, tile.y, true);
                    }
                });
            }
        });

        const instance = {
            id: instanceId,
            type: 'forest',
            map: forestMapGenerator.getMap(),
            multiTileObjects: multiTileObjects,
            pathFinder: pathFinder,
            resourceManager: resourceManager,
            createdAt: Date.now()
        };

        this.instances.set(instanceId, instance);
        console.log(`Forest instance ${instanceId} created successfully`);

        return instance;
    }

    getInstance(instanceId) {
        return this.instances.get(instanceId);
    }

    deleteInstance(instanceId) {
        if (instanceId === 'town') {
            console.log('Cannot delete town instance');
            return false;
        }

        const instance = this.instances.get(instanceId);
        if (instance) {
            // Clean up resources
            instance.resourceManager = null;
            instance.pathFinder = null;
            this.instances.delete(instanceId);
            console.log(`Instance ${instanceId} deleted`);
            return true;
        }
        return false;
    }

    // Clean up old instances (optional, for memory management)
    cleanupOldInstances(maxAge = 3600000) { // 1 hour default
        const now = Date.now();
        const instancesToDelete = [];

        this.instances.forEach((instance, instanceId) => {
            if (instance.type === 'forest' && (now - instance.createdAt) > maxAge) {
                instancesToDelete.push(instanceId);
            }
        });

        instancesToDelete.forEach(instanceId => {
            this.deleteInstance(instanceId);
        });

        if (instancesToDelete.length > 0) {
            console.log(`Cleaned up ${instancesToDelete.length} old forest instances`);
        }
    }
}

module.exports = InstanceManager;
