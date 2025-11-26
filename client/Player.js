class Player {
    constructor(scene, playerData, isMainPlayer) {
        this.scene = scene;
        this.id = playerData.id;
        this.username = playerData.username;
        this.isMainPlayer = isMainPlayer;
        this.inventory = playerData.inventory || { wood: 0, stone: 0 };

        this.currentPath = [];
        this.pathIndex = 0;
        this.isMoving = false;
        this.isGathering = false;
        this.targetResource = null;
        this.gatheringProgress = null;
        this.moveSpeed = 150; // Pixels per second (constant speed)

        this.createSprite(playerData.x, playerData.y);
    }

    createSprite(x, y) {
        const graphics = this.scene.add.graphics();
        graphics.fillStyle(this.isMainPlayer ? 0x0000ff : 0xff0000, 1);
        graphics.fillCircle(16, 16, 12);
        graphics.generateTexture('player-' + this.id, 32, 32);
        graphics.destroy();

        // Ensure the sprite is created exactly on grid center
        const TILE_SIZE = 32;
        const gridX = Math.round(x / TILE_SIZE);
        const gridY = Math.round(y / TILE_SIZE);
        const snapX = gridX * TILE_SIZE + TILE_SIZE / 2;
        const snapY = gridY * TILE_SIZE + TILE_SIZE / 2;

        this.sprite = this.scene.physics.add.sprite(snapX, snapY, 'player-' + this.id);
        this.sprite.setCollideWorldBounds(true);
        this.sprite.setDepth(10);

        this.nameText = this.scene.add.text(snapX, snapY - 25, this.username, {
            fontSize: '11px',
            fill: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 3, y: 2 }
        });
        this.nameText.setOrigin(0.5);
        this.nameText.setDepth(11);
    }

    setPath(path) {
        console.log('setPath called - isGathering:', this.isGathering, 'path length:', path.length);
        if (this.isGathering) return;

        // Simply replace the current path - allows mid-movement path changes
        this.currentPath = path;
        this.pathIndex = 0;
        this.isMoving = true;
        console.log('Path set - isMoving:', this.isMoving, 'currentPath:', this.currentPath.length, 'pathIndex:', this.pathIndex);
    }

    stopMovement() {
        console.log('stopMovement called - current state:', {isMoving: this.isMoving, pathLength: this.currentPath.length, pathIndex: this.pathIndex});
        this.isMoving = false;
        this.currentPath = [];
        this.pathIndex = 0;
        console.log('stopMovement complete - new state:', {isMoving: this.isMoving, pathLength: this.currentPath.length, pathIndex: this.pathIndex});
    }

    startGatheringVisual(resourceId, duration) {
        this.isGathering = true;
        this.stopMovement();

        const progressBarBg = this.scene.add.rectangle(
            this.sprite.x,
            this.sprite.y - 40,
            60,
            8,
            0x000000
        );
        progressBarBg.setDepth(12);

        const progressBarFill = this.scene.add.rectangle(
            this.sprite.x - 30,
            this.sprite.y - 40,
            0,
            6,
            0x00ff00
        );
        progressBarFill.setOrigin(0, 0.5);
        progressBarFill.setDepth(13);

        this.gatheringProgress = {
            bg: progressBarBg,
            fill: progressBarFill,
            resourceId: resourceId,
            duration: duration || 3000
        };
    }

    updateGatheringProgress(progress) {
        if (!this.isGathering || !this.gatheringProgress) return;

        this.gatheringProgress.fill.width = progress * 60;
        this.gatheringProgress.bg.setPosition(this.sprite.x, this.sprite.y - 40);
        this.gatheringProgress.fill.setPosition(this.sprite.x - 30, this.sprite.y - 40);
    }

    stopGathering() {
        if (this.gatheringProgress) {
            this.gatheringProgress.bg.destroy();
            this.gatheringProgress.fill.destroy();
            this.gatheringProgress = null;
        }
        this.isGathering = false;
        this.targetResource = null;
    }

    update(delta, TILE_SIZE, onPositionUpdate, onWaypointReached) {
        if (this.isGathering) {
            // Handled separately in updateGathering
        } else if (this.isMoving && this.currentPath.length > 0 && this.pathIndex < this.currentPath.length) {
            const target = this.currentPath[this.pathIndex];
            const targetX = target.x * TILE_SIZE + TILE_SIZE / 2;
            const targetY = target.y * TILE_SIZE + TILE_SIZE / 2;

            if (this.pathIndex === 0) {
                console.log('Moving - pathIndex:', this.pathIndex, 'to:', target.x, target.y);
            }

            const distance = Phaser.Math.Distance.Between(
                this.sprite.x,
                this.sprite.y,
                targetX,
                targetY
            );

            // Convert speed from pixels/second to pixels/frame
            // delta is in milliseconds, so divide by 1000 to get seconds
            const speed = (this.moveSpeed * delta) / 1000;

            // If very close or will overshoot, snap to exact position
            if (distance <= speed || distance < 1) {
                this.sprite.setPosition(targetX, targetY);

                if (onPositionUpdate) {
                    onPositionUpdate(targetX, targetY);
                }

                // Notify that waypoint was reached
                if (onWaypointReached) {
                    onWaypointReached(this.pathIndex);
                }

                this.pathIndex++;

                if (this.pathIndex >= this.currentPath.length) {
                    console.log('Path completed! Stopping movement.');
                    this.stopMovement();
                    return true; // Path completed
                }
            } else {
                // Move toward target with consistent speed
                const angle = Phaser.Math.Angle.Between(
                    this.sprite.x,
                    this.sprite.y,
                    targetX,
                    targetY
                );

                const moveX = Math.cos(angle) * speed;
                const moveY = Math.sin(angle) * speed;

                this.sprite.x += moveX;
                this.sprite.y += moveY;
            }
        }

        this.nameText.setPosition(this.sprite.x, this.sprite.y - 25);
        return false;
    }

    getGridPosition(TILE_SIZE) {
        return {
            x: Math.floor(this.sprite.x / TILE_SIZE),
            y: Math.floor(this.sprite.y / TILE_SIZE)
        };
    }

    updatePosition(x, y) {
        // Directly set position for other players to ensure they update even when tab is inactive
        this.sprite.setPosition(x, y);
    }

    updateInventory(inventory) {
        this.inventory = inventory;
    }

    destroy() {
        if (this.sprite) this.sprite.destroy();
        if (this.nameText) this.nameText.destroy();
        this.stopGathering();
    }
}
