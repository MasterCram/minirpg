const CONFIG = require('../shared/config');

class MapGenerator {
    constructor() {
        this.gameMap = [];
        this.multiTileObjects = [];
    }

    generateMap() {
        console.log('Generating village map...');
        this.gameMap = [];
        this.multiTileObjects = [];

        // Fill entire map with grass and grass variants (village ground)
        for (let y = 0; y < CONFIG.WORLD_HEIGHT; y++) {
            this.gameMap[y] = [];
            for (let x = 0; x < CONFIG.WORLD_WIDTH; x++) {
                const grassVariant = Math.random();
                this.gameMap[y][x] = grassVariant < 0.8 ? 'grass' : 'grass_var';
            }
        }

        // Place trees around the village perimeter
        this.placeTreesAroundVillage();

        console.log('Village map generated successfully!');
    }

    placeTreesAroundVillage() {
        // Tree placement positions around the village
        // Top border
        for (let x = 0; x < CONFIG.WORLD_WIDTH; x += 6) {
            this.placeMultiTileTree(x, 0);
        }

        // Bottom border
        for (let x = 0; x < CONFIG.WORLD_WIDTH; x += 6) {
            this.placeMultiTileTree(x, CONFIG.WORLD_HEIGHT - 5);
        }

        // Left border
        for (let y = 6; y < CONFIG.WORLD_HEIGHT - 6; y += 6) {
            this.placeMultiTileTree(0, y);
        }

        // Right border
        for (let y = 6; y < CONFIG.WORLD_HEIGHT - 6; y += 6) {
            this.placeMultiTileTree(CONFIG.WORLD_WIDTH - 5, y);
        }

        console.log(`Placed ${this.multiTileObjects.length} multi-tile trees around village`);
    }

    placeMultiTileTree(startX, startY) {
        const treeTemplate = CONFIG.MULTI_TILE_OBJECTS.TREE;
        const treeHeight = treeTemplate.length;
        const treeWidth = treeTemplate[0].length;

        // Check if tree fits in map bounds
        if (startX + treeWidth > CONFIG.WORLD_WIDTH || startY + treeHeight > CONFIG.WORLD_HEIGHT) {
            return;
        }

        // Create multi-tile object
        const multiTileTree = {
            type: 'tree',
            x: startX,
            y: startY,
            width: treeWidth,
            height: treeHeight,
            tiles: []
        };

        // Build tile array
        for (let dy = 0; dy < treeHeight; dy++) {
            for (let dx = 0; dx < treeWidth; dx++) {
                const tileIndex = treeTemplate[dy][dx];
                if (tileIndex !== -1) {
                    multiTileTree.tiles.push({
                        x: startX + dx,
                        y: startY + dy,
                        tileIndex: tileIndex
                    });
                }
            }
        }

        this.multiTileObjects.push(multiTileTree);
    }

    getMap() {
        return this.gameMap;
    }

    getMultiTileObjects() {
        return this.multiTileObjects;
    }
}

module.exports = MapGenerator;
