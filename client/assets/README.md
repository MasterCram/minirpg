# Tileset Configuration

## Grassland.png Tileset

The game uses a custom tileset for terrain rendering.

### Specifications
- **File**: `Grassland.png`
- **Location**: `client/assets/Grassland.png`
- **Grid Size**: 15 × 15 tiles (225 tiles total)
- **Tile Size**: 128 × 128 pixels per tile
- **Total Image Size**: 1920 × 1920 pixels

### Tile Indices Used

Tiles are numbered from 0-224, starting from top-left, going left-to-right, top-to-bottom:

```
Row 0:  0  1  2  3  4  5  6  7  8  9  10 11 12 13 14
Row 1: 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29
Row 2: 30 31 32 33 34 35 36 37 38 39 40 41 42 43 44
Row 3: 45 46 47 48 49...
```

**Current Mapping:**
- **Tile 17**: Main grass tile (used 80% of the time)
- **Tile 19**: Grass variant (used 20% of the time)
- **Tile 48**: Dirt tile

### In-Game Rendering

The tileset tiles are automatically scaled from 128×128 pixels to 32×32 pixels to match the game's tile size.

### Adding the Tileset

1. Place your `Grassland.png` file in `client/assets/`
2. The game will automatically load it on startup
3. Tiles are rendered at runtime during map generation

If the tileset file is missing, the game will fail to load with an asset error.
