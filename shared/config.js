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
    TREE_COUNT: 20,   // Further reduced
    ROCK_COUNT: 10,   // Further reduced

    // Spawn zone (center 5x5 area)
    SPAWN_ZONE: {
      CENTER_X: 12,  // Center of 25x25 map
      CENTER_Y: 12,
      RADIUS: 2      // 2 tiles from center = 5x5 area (10-14)
    },

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
      ],
      HOUSE: [
        [-1, -1, 2, 3, 4, -1, -1],
        [-1, 17, 18, 51, 20, 21, -1],
        [32, 33, 34, 35, 36, 37, 38],
        [48, 49, 50, 51, 52, 53, 54],
        [48, 49, 66, 67, 68, 53, 54],
        [48, 81, 82, 83, 84, 85, 54],
        [96, 97, 98, 99, 100, 101, 102],
        [-1, 113, 114, 11, 116, 117, -1],
        [-1, 129, 130, 27, 132, 133, -1]
      ]
    },

    // Object transparency settings (which rows should become transparent)
    OBJECT_TRANSPARENCY: {
      TREE: {
        transparentRows: [0, 1, 2]  // Top 3 rows (canopy)
      },
      HOUSE: {
        transparentRows: [0, 1, 2]  // Top 3 rows (roof and upper walls)
      }
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
