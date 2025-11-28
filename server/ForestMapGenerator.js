const CONFIG = require('../shared/config');

class ForestMapGenerator {
    constructor() {
        this.forestMap = [];
        this.multiTileObjects = [];
    }

    generateForestMap() {
        console.log('Generating forest map...');
        this.forestMap = [];
        this.multiTileObjects = [];

        // Create forest ground - use grass tiles from Grassland.png
        const grassTiles = [169, 172, 173, 190, 191]; // Various grass tiles

        for (let y = 0; y < CONFIG.WORLD_HEIGHT; y++) {
            this.forestMap[y] = [];
            for (let x = 0; x < CONFIG.WORLD_WIDTH; x++) {
                // Random grass tile
                this.forestMap[y][x] = grassTiles[Math.floor(Math.random() * grassTiles.length)];
            }
        }

        // Place trees (3-5 trees)
        const treeCount = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < treeCount; i++) {
            this.placeTree();
        }

        // Place return portal at bottom center
        this.placeReturnPortal();

        console.log('Forest map generated successfully!');
    }

    placeTree() {
        const treeTemplate = CONFIG.MULTI_TILE_OBJECTS.TREE;
        const treeHeight = treeTemplate.length;
        const treeWidth = treeTemplate[0].length;

        // Random position, avoiding edges
        const maxAttempts = 10;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const startX = 2 + Math.floor(Math.random() * (CONFIG.WORLD_WIDTH - treeWidth - 4));
            const startY = 2 + Math.floor(Math.random() * (CONFIG.WORLD_HEIGHT - treeHeight - 8)); // Leave space at bottom for portal

            // Check if position overlaps with existing objects
            if (this.checkOverlap(startX, startY, treeWidth, treeHeight)) {
                continue;
            }

            // Create multi-tile tree
            const multiTileTree = {
                type: 'tree',
                tileset: 'tileset',
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
                            row: dy
                        });
                    }
                }
            }

            this.multiTileObjects.push(multiTileTree);
            console.log(`Placed tree at (${startX}, ${startY})`);
            return;
        }

        console.log('Failed to place tree after max attempts');
    }

    placeReturnPortal() {
        const portalTemplate = CONFIG.MULTI_TILE_OBJECTS.PORTAL;
        const portalHeight = portalTemplate.length;
        const portalWidth = portalTemplate[0].length;

        // Place portal at bottom center
        const startX = Math.floor((CONFIG.WORLD_WIDTH - portalWidth) / 2);
        const startY = CONFIG.WORLD_HEIGHT - portalHeight - 1;

        const multiTilePortal = {
            type: 'portal',
            tileset: 'town',
            x: startX,
            y: startY,
            width: portalWidth,
            height: portalHeight,
            tiles: [],
            destination: 'town' // This portal goes back to town
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
        console.log('Placed return portal at bottom center of forest');
    }

    checkOverlap(x, y, width, height) {
        // Check if position overlaps with any existing objects
        for (const obj of this.multiTileObjects) {
            const objRight = obj.x + obj.width;
            const objBottom = obj.y + obj.height;
            const newRight = x + width;
            const newBottom = y + height;

            // Check for overlap with padding
            const padding = 2;
            if (!(x - padding >= objRight || newRight + padding <= obj.x ||
                  y - padding >= objBottom || newBottom + padding <= obj.y)) {
                return true; // Overlap detected
            }
        }
        return false;
    }

    getMap() {
        return this.forestMap;
    }

    getMultiTileObjects() {
        return this.multiTileObjects;
    }
}

module.exports = ForestMapGenerator;
