class Resource {
    constructor(scene, resourceData) {
        this.scene = scene;
        this.id = resourceData.id;
        this.type = resourceData.type;
        this.x = resourceData.x;
        this.y = resourceData.y;
        this.sprite = null;

        this.createSprite();
    }

    createSprite() {
        const graphics = this.scene.add.graphics();

        if (this.type === 'tree') {
            // Tree trunk
            graphics.fillStyle(0x654321, 1);
            graphics.fillRect(10, 20, 12, 12);
            // Tree leaves
            graphics.fillStyle(0x228B22, 1);
            graphics.fillCircle(16, 12, 10);
        } else if (this.type === 'rock') {
            // Main rock
            graphics.fillStyle(0x808080, 1);
            graphics.fillCircle(16, 16, 12);
            // Rock detail
            graphics.fillStyle(0x696969, 1);
            graphics.fillCircle(12, 14, 6);
        }

        graphics.generateTexture(this.type + '-' + this.id, 32, 32);
        graphics.destroy();

        this.sprite = this.scene.add.sprite(this.x, this.y, this.type + '-' + this.id);
        this.sprite.setInteractive();
        this.sprite.setDepth(5);
        this.sprite.setData('resourceId', this.id);
        this.sprite.setData('resourceType', this.type);
    }

    setClickHandler(callback) {
        if (this.sprite) {
            this.sprite.on('pointerdown', (pointer) => {
                pointer.event.stopPropagation();
                callback(this);
            });
        }
    }

    getGridPosition(TILE_SIZE) {
        return {
            x: Math.floor(this.x / TILE_SIZE),
            y: Math.floor(this.y / TILE_SIZE)
        };
    }

    destroy() {
        if (this.sprite) {
            this.sprite.destroy();
            this.sprite = null;
        }
    }

    isDestroyed() {
        return this.sprite === null;
    }
}
