class DroppedItem {
    constructor(scene, itemData) {
        this.scene = scene;
        this.id = itemData.id;
        this.type = itemData.type;
        this.x = itemData.x;
        this.y = itemData.y;
        this.sprite = null;
        this.textLabel = null;

        this.createSprite();
    }

    createSprite() {
        // Create a small sprite for the dropped item
        const graphics = this.scene.add.graphics();

        if (this.type === 'wood') {
            graphics.fillStyle(0x654321, 1);
        } else if (this.type === 'stone') {
            graphics.fillStyle(0x808080, 1);
        }

        graphics.fillCircle(12, 12, 8);
        graphics.generateTexture('dropped-' + this.id, 24, 24);
        graphics.destroy();

        this.sprite = this.scene.add.sprite(this.x, this.y, 'dropped-' + this.id);
        this.sprite.setInteractive();
        this.sprite.setDepth(5);
        this.sprite.setData('droppedItemId', this.id);

        // Add text label
        const label = this.type === 'wood' ? 'Wood' : 'Stone';
        this.textLabel = this.scene.add.text(this.x, this.y - 15, label, {
            fontSize: '10px',
            fill: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 2, y: 1 }
        });
        this.textLabel.setOrigin(0.5);
        this.textLabel.setDepth(6);
    }

    setClickHandler(callback) {
        if (this.sprite) {
            this.sprite.on('pointerdown', (pointer) => {
                pointer.event.stopPropagation();
                callback(this);
            });
        }
    }

    destroy() {
        if (this.sprite) {
            this.sprite.destroy();
            this.sprite = null;
        }
        if (this.textLabel) {
            this.textLabel.destroy();
            this.textLabel = null;
        }
    }

    isDestroyed() {
        return this.sprite === null;
    }
}
