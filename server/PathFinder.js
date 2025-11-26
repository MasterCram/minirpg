// PathFinder class for server-side pathfinding
class PathFinder {
    constructor(worldWidth, worldHeight) {
        this.worldWidth = worldWidth;
        this.worldHeight = worldHeight;
        this.obstacleGrid = [];
        this.initializeGrid();
    }

    initializeGrid() {
        this.obstacleGrid = [];
        for (let y = 0; y < this.worldHeight; y++) {
            this.obstacleGrid[y] = [];
            for (let x = 0; x < this.worldWidth; x++) {
                this.obstacleGrid[y][x] = 0;
            }
        }
    }

    setObstacle(x, y, isObstacle) {
        if (x >= 0 && x < this.worldWidth && y >= 0 && y < this.worldHeight) {
            this.obstacleGrid[y][x] = isObstacle ? 1 : 0;
        }
    }

    isObstacle(x, y) {
        if (x < 0 || x >= this.worldWidth || y < 0 || y >= this.worldHeight) {
            return true;
        }
        return this.obstacleGrid[y][x] === 1;
    }

    findPath(startX, startY, endX, endY) {
        // Clamp coordinates to valid range
        startX = Math.max(0, Math.min(startX, this.worldWidth - 1));
        startY = Math.max(0, Math.min(startY, this.worldHeight - 1));
        endX = Math.max(0, Math.min(endX, this.worldWidth - 1));
        endY = Math.max(0, Math.min(endY, this.worldHeight - 1));

        // If already at destination, return empty path
        if (startX === endX && startY === endY) {
            return [];
        }

        // Check if destination is blocked
        if (this.isObstacle(endX, endY)) {
            return null;
        }

        const openSet = [];
        const closedSet = new Set();
        const cameFrom = new Map();
        const gScore = new Map();
        const fScore = new Map();

        const startKey = `${startX},${startY}`;
        const endKey = `${endX},${endY}`;

        openSet.push({ x: startX, y: startY, key: startKey });
        gScore.set(startKey, 0);
        fScore.set(startKey, this.heuristic(startX, startY, endX, endY));

        while (openSet.length > 0) {
            openSet.sort((a, b) => fScore.get(a.key) - fScore.get(b.key));
            const current = openSet.shift();

            if (current.key === endKey) {
                return this.reconstructPath(cameFrom, current.key, startX, startY);
            }

            closedSet.add(current.key);

            const neighbors = [
                { x: current.x - 1, y: current.y },
                { x: current.x + 1, y: current.y },
                { x: current.x, y: current.y - 1 },
                { x: current.x, y: current.y + 1 }
            ];

            for (const neighbor of neighbors) {
                if (neighbor.x < 0 || neighbor.x >= this.worldWidth ||
                    neighbor.y < 0 || neighbor.y >= this.worldHeight) {
                    continue;
                }

                const neighborKey = `${neighbor.x},${neighbor.y}`;

                if (closedSet.has(neighborKey)) {
                    continue;
                }

                // Don't treat destination as obstacle, but treat all other obstacles as blocked
                if (this.obstacleGrid[neighbor.y][neighbor.x] === 1 && neighborKey !== endKey) {
                    continue;
                }

                const tentativeGScore = gScore.get(current.key) + 1;

                if (!openSet.find(n => n.key === neighborKey)) {
                    openSet.push({ x: neighbor.x, y: neighbor.y, key: neighborKey });
                } else if (tentativeGScore >= (gScore.get(neighborKey) || Infinity)) {
                    continue;
                }

                cameFrom.set(neighborKey, current.key);
                gScore.set(neighborKey, tentativeGScore);
                fScore.set(neighborKey, tentativeGScore + this.heuristic(neighbor.x, neighbor.y, endX, endY));
            }
        }

        return null;
    }

    heuristic(x1, y1, x2, y2) {
        return Math.abs(x1 - x2) + Math.abs(y1 - y2);
    }

    reconstructPath(cameFrom, currentKey, startX, startY) {
        const path = [];
        const startKey = `${startX},${startY}`;

        while (currentKey !== startKey) {
            const [x, y] = currentKey.split(',').map(Number);
            path.unshift({ x, y });
            currentKey = cameFrom.get(currentKey);
        }

        return path;
    }

    getAdjacentTiles(x, y) {
        return [
            { x: x - 1, y: y },
            { x: x + 1, y: y },
            { x: x, y: y - 1 },
            { x: x, y: y + 1 }
        ].filter(tile =>
            tile.x >= 0 && tile.x < this.worldWidth &&
            tile.y >= 0 && tile.y < this.worldHeight
        );
    }
}

module.exports = PathFinder;
