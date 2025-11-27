// Shared configuration for both server and client
(function(global) {
  const CONFIG = {
    // World settings
    TILE_SIZE: 32,
    WORLD_WIDTH: 25,
    WORLD_HEIGHT: 25,

    // Movement settings
    MOVE_SPEED: 150, // Pixels per second

    // Resource generation
    TREE_COUNT: 50,   // Reduced from 150
    ROCK_COUNT: 30,   // Reduced from 100

    // Resource respawn
    RESOURCE_RESPAWN_TIME: 5000, // 5 seconds

    // Gathering settings
    GATHERING_DURATION: 3000,      // 3 seconds
    ITEM_PICKUP_DURATION: 1000,    // 1 second

    // Inventory settings
    INVENTORY_SLOTS: 28,

    // Tile indices
    TILES: {
      ROCK: 114,
      TREE: 115,
      SAND: 18
    },

    // Multi-tile object templates
    MULTI_TILE_OBJECTS: {
      TREE: [
        [176, 177, 178, 179, 180],
        [192, 193, 194, 195, 196],
        [208, 209, 210, 211, 212],
        [-1, 225, 226, 227, -1],
        [-1, 241, 242, 243, -1]
      ]
    },

    // Map generation probabilities
    MAP_GEN: {
      GRASS_CHANCE: 0.80,      // 80% grass
      DIRT_CHANCE: 0.15,       // 15% dirt
      SAND_CHANCE: 0.05        // 5% grass with sand
    },

    // Server update rate
    SERVER_UPDATE_INTERVAL: 16 // ~60fps
  };

  // Export for Node.js
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
  }

  // Export for browser
  if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
  }

  // Export for global scope
  global.CONFIG = CONFIG;
})(typeof window !== 'undefined' ? window : global);
