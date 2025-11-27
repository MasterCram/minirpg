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

        // Place house at middle right
        this.placeHouse(CONFIG.WORLD_WIDTH - 7 - 1, Math.floor(CONFIG.WORLD_HEIGHT / 2) - 4);

        // Place house at bottom left
        this.placeHouse(1, CONFIG.WORLD_HEIGHT - 9 - 1);

        // Place well on top right
        this.placeWell();

        // Place portal at middle top
        this.placePortal();

        console.log('Village map generated successfully!');
    }

    getMap() {
        return this.gameMap;
    }

    getMultiTileObjects() {
        return this.multiTileObjects;
    }

    placeHouse(customX = null, customY = null) {
        const houseTemplate = CONFIG.MULTI_TILE_OBJECTS.HOUSE;
        const houseHeight = houseTemplate.length;
        const houseWidth = houseTemplate[0].length;

        // Use custom position or default to top-left
        const startX = customX !== null ? customX : 1;
        const startY = customY !== null ? customY : 1;

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
        console.log(`Placed house at (${startX}, ${startY})`);
    }

    placeWell() {
        const wellTemplate = CONFIG.MULTI_TILE_OBJECTS.WELL;
        const wellHeight = wellTemplate.length;
        const wellWidth = wellTemplate[0].length;

        // Place well at top-right, then move 3 left, 2 down
        const startX = CONFIG.WORLD_WIDTH - wellWidth - 1 - 3;
        const startY = 1 + 2;

        const multiTileWell = {
            type: 'well',
            tileset: 'town',
            x: startX,
            y: startY,
            width: wellWidth,
            height: wellHeight,
            tiles: []
        };

        for (let dy = 0; dy < wellHeight; dy++) {
            for (let dx = 0; dx < wellWidth; dx++) {
                const tileIndex = wellTemplate[dy][dx];
                if (tileIndex !== -1) {
                    multiTileWell.tiles.push({
                        x: startX + dx,
                        y: startY + dy,
                        tileIndex: tileIndex,
                        row: dy
                    });
                }
            }
        }

        this.multiTileObjects.push(multiTileWell);
        console.log('Placed well at top-right of village');
    }

    placePortal() {
        const portalTemplate = CONFIG.MULTI_TILE_OBJECTS.PORTAL;
        const portalHeight = portalTemplate.length;
        const portalWidth = portalTemplate[0].length;

        // Place portal at middle top
        const startX = Math.floor((CONFIG.WORLD_WIDTH - portalWidth) / 2);
        const startY = 0;

        const multiTilePortal = {
            type: 'portal',
            tileset: 'town',
            x: startX,
            y: startY,
            width: portalWidth,
            height: portalHeight,
            tiles: []
        };

        for (let dy = 0; dy < portalHeight; dy++) {
            for (let dx = 0; dx < portalWidth; dx++) {
                const tileIndex = portalTemplate[dy][dx];
                if (tileIndex !== -1) {
                    multiTilePortal.tiles.push({
                        x: startX + dx,
                        y: startY + dy,
                        tileIndex: tileIndex,
                        row: dy
                    });
                }
            }
        }

        this.multiTileObjects.push(multiTilePortal);
        console.log('Placed portal at middle top of village');
    }
}

module.exports = MapGenerator;
