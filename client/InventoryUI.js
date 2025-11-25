class InventoryUI {
    constructor() {
        this.inventory = { wood: 0, stone: 0 };
        this.container = null;
        this.createUI();
    }

    createUI() {
        const uiContainer = document.createElement('div');
        uiContainer.id = 'inventory';
        uiContainer.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 15px;
            border-radius: 8px;
            font-family: Arial, sans-serif;
            min-width: 200px;
            border: 2px solid #444;
        `;

        uiContainer.innerHTML = `
            <h3 style="margin: 0 0 10px 0; font-size: 16px; border-bottom: 1px solid #666; padding-bottom: 5px;">Inventory</h3>
            <div style="display: flex; align-items: center; margin-bottom: 8px;">
                <span style="width: 30px; height: 30px; background: #654321; display: inline-block; margin-right: 10px; border-radius: 4px;"></span>
                <span>Wood: <strong id="wood-count">0</strong></span>
            </div>
            <div style="display: flex; align-items: center;">
                <span style="width: 30px; height: 30px; background: #808080; display: inline-block; margin-right: 10px; border-radius: 4px;"></span>
                <span>Stone: <strong id="stone-count">0</strong></span>
            </div>
        `;

        document.body.appendChild(uiContainer);
        this.container = uiContainer;
    }

    update(inventory) {
        this.inventory = inventory;
        if (this.container) {
            const woodCount = document.getElementById('wood-count');
            const stoneCount = document.getElementById('stone-count');

            if (woodCount) woodCount.textContent = inventory.wood;
            if (stoneCount) stoneCount.textContent = inventory.stone;
        }
    }

    getInventory() {
        return this.inventory;
    }
}
