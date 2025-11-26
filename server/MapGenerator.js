const CONFIG = require('../shared/config');

class MapGenerator {
    constructor() {
        this.gameMap = [];
    }

    generateMap() {
        console.log('Generating game map...');
        this.gameMap = [];

        for (let y = 0; y < CONFIG.WORLD_HEIGHT; y++) {
            this.gameMap[y] = [];
            for (let x = 0; x < CONFIG.WORLD_WIDTH; x++) {
                const random = Math.random();

                if (random < CONFIG.MAP_GEN.GRASS_CHANCE) {
                    // Grass or grass variant
                    const grassVariant = Math.random();
                    this.gameMap[y][x] = grassVariant < 0.8 ? 'grass' : 'grass_var';
                } else if (random < CONFIG.MAP_GEN.GRASS_CHANCE + CONFIG.MAP_GEN.DIRT_CHANCE) {
                    this.gameMap[y][x] = 'dirt';
                } else {
                    this.gameMap[y][x] = 'grass_with_sand';
                }
            }
        }

        console.log('Map generated successfully!');
    }

    getMap() {
        return this.gameMap;
    }
}

module.exports = MapGenerator;
