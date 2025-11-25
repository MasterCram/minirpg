# MiniRPG - 2D Multiplayer Game

A simple 2D multiplayer RPG game inspired by RuneScape, built with Phaser 3 and Node.js.

## Features

- **Full-Screen Gameplay**: Responsive game that fills your entire browser window
- **Smart Pathfinding**: A* algorithm finds optimal routes around obstacles
- **Grid-Based Movement**: Movement restricted to 4 directions (no diagonals) with grid snapping
- **Obstacle Avoidance**: Automatically paths around trees and rocks
- **Real-time Multiplayer**: See other players move around in real-time
- **Procedurally Generated Map**: 100x100 tile world with grass and dirt terrain
- **Resource Gathering**: 3-second gathering with progress bar animation
- **Click-to-Gather**: Click resources from anywhere - auto-paths to nearest adjacent tile
- **Inventory System**: Track your collected resources with a real-time UI
- **Resource Respawning**: Resources respawn after 5 seconds when gathered
- **Class-Based Architecture**: Clean OOP design with separated concerns
- **Color-coded Players**: You're blue, other players are red

## Tech Stack

- **Frontend**: Phaser 3 (HTML5 game framework)
- **Backend**: Node.js + Express + Socket.io
- **Real-time Communication**: WebSockets via Socket.io
- **Architecture**: Class-based OOP design with separation of concerns

## Project Structure

```
minirpg/
├── client/                 # Frontend game client
│   ├── index.html         # Main HTML file
│   ├── game.js            # Main game scene and orchestration
│   ├── PathFinder.js      # A* pathfinding algorithm class
│   ├── Player.js          # Player entity and behavior class
│   ├── Resource.js        # Resource (tree/rock) entity class
│   └── InventoryUI.js     # Inventory UI management class
├── server/                # Backend server
│   ├── server.js          # Express + Socket.io server
│   └── package.json       # Server dependencies
└── README.md
```

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm (comes with Node.js)

### Installation

1. Navigate to the server directory and install dependencies:

```bash
cd server
npm install
```

### Running the Game

1. Start the server:

```bash
cd server
npm start
```

2. Open your browser and go to:

```
http://localhost:3000
```

3. Open multiple browser tabs/windows to see multiplayer in action!

### Development Mode

For automatic server restarts on code changes:

```bash
cd server
npm run dev
```

## Controls

- **Movement**: Click anywhere on the map to move (snaps to grid centers)
- **Gather Resources**: Click on trees or rocks when nearby to gather them
- **Camera**: Follows your player automatically
- Move around the world, gather resources, and see other players in real-time!

## How It Works

### Server (`server/server.js`)

- Generates a 100x100 tile procedural map with grass and dirt
- Spawns 150 trees and 100 rocks randomly across the map
- Manages connected players and their inventories
- Broadcasts player movements to all clients
- Handles resource gathering and respawning (5 second delay)
- Syncs inventory updates to clients
- Handles player connections and disconnections
- Serves the static client files

### Client (Class-based Architecture)

**PathFinder.js** - Pathfinding System
- A* algorithm implementation for optimal grid-based pathfinding
- Maintains obstacle grid synchronized with resource positions
- Provides Manhattan distance heuristic
- No diagonal movement - only up/down/left/right
- Finds paths around obstacles automatically

**Player.js** - Player Entity
- Manages player sprite, movement, and state
- Handles tile-by-tile pathfollowing
- Manages gathering progress bar and animations
- Tracks inventory and player stats
- Supports both main player and other players

**Resource.js** - Resource Entity
- Manages tree and rock sprites
- Handles interactive click events
- Tracks resource position and type
- Provides grid position calculations

**InventoryUI.js** - UI Management
- Creates and updates inventory display
- Real-time resource count updates
- Modular UI component

**game.js** - Main Game Scene
- Orchestrates all game systems
- Handles Socket.io communication
- Manages game state and player interactions
- Coordinates between all classes
- Renders procedurally generated tilemap

## Next Steps to Expand

Here are some ideas to enhance your game:

### Gameplay Features
- [x] Add inventory and items (wood, stone)
- [x] Implement resource gathering system with progress bar
- [x] Implement a procedurally generated tilemap
- [x] Implement A* pathfinding with obstacle avoidance
- [x] Add grid-based movement (no diagonals)
- [ ] Add player sprite animations
- [ ] Expand tilemap (towns, dungeons, water, etc.)
- [ ] Add NPCs and enemies
- [ ] Create a combat system
- [ ] Add crafting system (use wood/stone to build items)
- [ ] Implement quests/missions
- [ ] Add character stats (HP, attack, defense)
- [ ] Add experience and leveling system
- [ ] Create different character classes
- [ ] Add more resource types (iron, gold, gems)

### Multiplayer Features
- [ ] Add chat system
- [ ] Implement player trading
- [ ] Create parties/groups
- [ ] Add guilds/clans
- [ ] Show player levels/stats above heads

### Technical Improvements
- [ ] Add player authentication (login/register)
- [ ] Persist player data in a database
- [ ] Implement lag compensation
- [ ] Add server-side validation
- [ ] Create separate game rooms/instances
- [ ] Add mobile touch controls

### Content
- [ ] Design custom tilesets
- [ ] Create different zones/maps
- [ ] Add background music and sound effects
- [ ] Design equipment and weapons

## Code Architecture

The game follows a clean, class-based OOP architecture with clear separation of concerns:

### Class Responsibilities

- **PathFinder**: Handles all pathfinding logic (A* algorithm, obstacle detection)
- **Player**: Manages player state, movement, and gathering behavior
- **Resource**: Represents tree and rock entities
- **InventoryUI**: Handles all UI rendering and updates
- **game.js**: Orchestrates all systems and handles socket communication

### Benefits

- **Maintainability**: Each class has a single responsibility
- **Reusability**: Classes can be easily extended or modified
- **Testability**: Individual components can be tested in isolation
- **Readability**: Clear separation makes code easy to understand

## Customization

### Change World Size

The world is measured in tiles (not pixels). Each tile is 32x32 pixels.

Edit in both `server/server.js` and `client/game.js`:
```javascript
const WORLD_WIDTH = 100;  // Number of tiles wide
const WORLD_HEIGHT = 100; // Number of tiles tall
```

This creates a 100x100 tile world (3200x3200 pixels).

### Change Player Speed

Edit in `client/game.js`:
```javascript
const moveSpeed = 150; // Change this value (pixels per second)
```

### Change Resource Counts

Edit in `server/server.js` in the `generateResources()` function:
```javascript
const treeCount = 150;  // Number of trees to spawn
const rockCount = 100;  // Number of rocks to spawn
```

### Change Resource Respawn Time

Edit in `server/server.js` in the `gatherResource` event:
```javascript
setTimeout(() => {
  // ... respawn logic
}, 5000);  // Time in milliseconds (5000 = 5 seconds)
```

### Change Server Port

Edit in `server/server.js`:
```javascript
const PORT = process.env.PORT || 3000; // Change the default port
```

## Troubleshooting

**Players not connecting:**
- Make sure the server is running
- Check the browser console for errors
- Verify the Socket.io connection URL in `client/game.js`

**Players not syncing:**
- Check your firewall settings
- Ensure WebSocket connections are allowed
- Look at server console for connection logs

## License

MIT

## Contributing

Feel free to fork, modify, and expand this project! This is a learning template for building multiplayer games.

Have fun building your RPG! 🎮
