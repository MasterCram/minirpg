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
        // Use tileset instead of generated graphics
        // Index 114 for rock, 115 for tree
        const tileIndex = this.type === 'rock' ? 114 : 115;

        this.sprite = this.scene.add.sprite(this.x, this.y, 'tileset', tileIndex);
        this.sprite.setOrigin(0.5, 0.5);
        this.sprite.setDisplaySize(32, 32);
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
