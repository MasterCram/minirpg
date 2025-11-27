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

        // Use custom village ground matrix
        const villageGround = CONFIG.VILLAGE_GROUND;

        for (let y = 0; y < CONFIG.WORLD_HEIGHT; y++) {
            this.gameMap[y] = [];
            for (let x = 0; x < CONFIG.WORLD_WIDTH; x++) {
                // Use tile index from matrix
                this.gameMap[y][x] = villageGround[y][x];
            }
        }

        // Place house on top left
        this.placeHouse();

        console.log('Village map generated successfully!');
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
