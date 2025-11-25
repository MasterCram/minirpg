# MiniRPG - 2D Multiplayer Game

A simple 2D multiplayer RPG game inspired by RuneScape, built with Phaser 3 and Node.js.

## Features

- **Real-time Multiplayer**: See other players move around in real-time
- **Smooth Movement**: WASD or Arrow key controls
- **Multiplayer Sync**: Player positions synchronized across all clients
- **Grid-based World**: 1600x1200 game world with visual grid
- **Simple Graphics**: Color-coded player sprites (you're blue, others are red)

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

- **Movement**: WASD or Arrow Keys
- Move around the world and see other players in real-time!

## How It Works

### Server (`server/server.js`)

- Manages connected players
- Broadcasts player movements to all clients
- Handles player connections and disconnections
- Serves the static client files

### Client (`client/game.js`)

- Renders the game world using Phaser 3
- Handles player input (keyboard controls)
- Communicates with server via Socket.io
- Updates other players' positions in real-time

## Next Steps to Expand

Here are some ideas to enhance your game:

### Gameplay Features
- [ ] Add player sprites and animations
- [ ] Implement a proper tilemap (towns, dungeons, etc.)
- [ ] Add NPCs and enemies
- [ ] Create a combat system
- [ ] Add inventory and items
- [ ] Implement quests/missions
- [ ] Add character stats (HP, attack, defense)
- [ ] Create different character classes

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

Edit in `server/server.js`:
```javascript
const WORLD_WIDTH = 1600;
const WORLD_HEIGHT = 1200;
```

And in `client/game.js`:
```javascript
this.cameras.main.setBounds(0, 0, 1600, 1200);
this.physics.world.setBounds(0, 0, 1600, 1200);
```

### Change Player Speed

Edit in `client/game.js`:
```javascript
const speed = 200; // Change this value
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
