class InventoryUI {
    constructor() {
        this.inventory = Array(28).fill(null);
        this.container = null;
        this.slotElements = [];
        this.onDropItem = null;
        this.createUI();
    }

    createUI() {
        const uiContainer = document.createElement('div');
        uiContainer.id = 'inventory';
        uiContainer.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 15px;
            border-radius: 8px;
            font-family: Arial, sans-serif;
            border: 2px solid #444;
        `;

        const title = document.createElement('h3');
        title.style.cssText = 'margin: 0 0 10px 0; font-size: 16px; border-bottom: 1px solid #666; padding-bottom: 5px;';
        title.textContent = 'Inventory';
        uiContainer.appendChild(title);

        const slotsContainer = document.createElement('div');
        slotsContainer.style.cssText = `
            display: grid;
            grid-template-columns: repeat(7, 40px);
            gap: 4px;
        `;

        // Create 28 slots (4 rows of 7)
        for (let i = 0; i < 28; i++) {
            const slot = document.createElement('div');
            slot.className = 'inventory-slot';
            slot.dataset.slotIndex = i;
            slot.style.cssText = `
                width: 40px;
                height: 40px;
                background: #2a2a2a;
                border: 2px solid #444;
                border-radius: 4px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                font-size: 24px;
                transition: background 0.2s;
            `;

            slot.addEventListener('mouseenter', () => {
                if (this.inventory[i] !== null) {
                    slot.style.background = '#3a3a3a';
                }
            });

            slot.addEventListener('mouseleave', () => {
                slot.style.background = '#2a2a2a';
            });

            slot.addEventListener('click', () => {
                if (this.inventory[i] !== null && this.onDropItem) {
                    this.onDropItem(i);
                }
            });

            this.slotElements.push(slot);
            slotsContainer.appendChild(slot);
        }

        uiContainer.appendChild(slotsContainer);
        document.body.appendChild(uiContainer);
        this.container = uiContainer;
    }

    update(inventory) {
        this.inventory = inventory;

        for (let i = 0; i < 28; i++) {
            const slot = this.slotElements[i];
            const item = inventory[i];

            if (item === 'wood') {
                slot.textContent = '🌳';
                slot.title = 'Wood (click to drop)';
            } else if (item === 'stone') {
                slot.textContent = '⛰️';
                slot.title = 'Stone (click to drop)';
            } else {
                slot.textContent = '';
                slot.title = 'Empty slot';
            }
        }
    }

    setDropItemCallback(callback) {
        this.onDropItem = callback;
    }

    getInventory() {
        return this.inventory;
    }
}
