# MiniRPG - 2D Multiplayer Game

A simple 2D multiplayer RPG game inspired by RuneScape, built with Phaser 3 and Node.js.

## Features

- **Full-Screen Gameplay**: Responsive game that fills your entire browser window
- **Mouse Click Movement**: Click anywhere to move - automatically snaps to grid centers
- **Real-time Multiplayer**: See other players move around in real-time
- **Procedurally Generated Map**: 100x100 tile world with grass and dirt terrain
- **Resource Gathering**: Click trees to gather wood, click rocks to gather stone
- **Inventory System**: Track your collected resources with a real-time UI
- **Resource Respawning**: Resources respawn after 5 seconds when gathered
- **Grid-based World**: Clean 32x32 tile-based movement and world
- **Color-coded Players**: You're blue, other players are red

## Tech Stack

- **Frontend**: Phaser 3 (HTML5 game framework)
- **Backend**: Node.js + Express + Socket.io
- **Real-time Communication**: WebSockets via Socket.io

## Project Structure

```
minirpg/
├── client/                 # Frontend game client
│   ├── index.html         # Main HTML file
│   └── game.js            # Phaser 3 game logic
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

### Client (`client/game.js`)

- Full-screen responsive game using Phaser 3
- Renders the procedurally generated tilemap
- Handles mouse click movement with pathfinding to grid centers
- Creates interactive tree and rock sprites
- Manages inventory UI display
- Communicates with server via Socket.io
- Updates other players' positions in real-time with smooth tweening

## Next Steps to Expand

Here are some ideas to enhance your game:

### Gameplay Features
- [x] Add inventory and items (wood, stone)
- [x] Implement resource gathering system
- [x] Implement a procedurally generated tilemap
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
