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

        // Place house on top left
        this.placeHouse();

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
            tileset: 'tileset',  // Use Grassland.png tileset
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
                        tileIndex: tileIndex,
                        row: dy  // Track which row this tile is in for transparency
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

    placeHouse() {
        const houseTemplate = CONFIG.MULTI_TILE_OBJECTS.HOUSE;
        const houseHeight = houseTemplate.length;
        const houseWidth = houseTemplate[0].length;

        // Place house at top-left (with small margin)
        const startX = 1;
        const startY = 1;

        // Check if house fits in map bounds
        if (startX + houseWidth > CONFIG.WORLD_WIDTH || startY + houseHeight > CONFIG.WORLD_HEIGHT) {
            console.warn('House does not fit in map bounds');
            return;
        }

        // Create multi-tile object
        const multiTileHouse = {
            type: 'house',
            tileset: 'town',  // Use Town.png tileset
            x: startX,
            y: startY,
            width: houseWidth,
            height: houseHeight,
            tiles: []
        };

        // Build tile array
        for (let dy = 0; dy < houseHeight; dy++) {
            for (let dx = 0; dx < houseWidth; dx++) {
                const tileIndex = houseTemplate[dy][dx];
                if (tileIndex !== -1) {
                    multiTileHouse.tiles.push({
                        x: startX + dx,
                        y: startY + dy,
                        tileIndex: tileIndex,
                        row: dy  // Track which row this tile is in for transparency
                    });
                }
            }
        }

        this.multiTileObjects.push(multiTileHouse);
        console.log('Placed house at top-left of village');
    }
}

module.exports = MapGenerator;
