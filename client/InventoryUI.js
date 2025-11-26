class InventoryUI {
    constructor() {
        this.inventory = Array(28).fill(null);
        this.container = null;
        this.slotElements = [];
        this.onDropItem = null;
        this.onSwapItems = null;
        this.contextMenu = null;
        this.draggedSlot = null;
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
                user-select: none;
            `;

            // Drag start
            slot.addEventListener('dragstart', (e) => {
                if (this.inventory[i] !== null) {
                    this.draggedSlot = i;
                    e.dataTransfer.effectAllowed = 'move';
                    slot.style.opacity = '0.5';
                }
            });

            // Drag end
            slot.addEventListener('dragend', (e) => {
                slot.style.opacity = '1';
                this.draggedSlot = null;
            });

            // Drag over
            slot.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
            });

            // Drop
            slot.addEventListener('drop', (e) => {
                e.preventDefault();
                if (this.draggedSlot !== null && this.draggedSlot !== i) {
                    // Swap items
                    if (this.onSwapItems) {
                        this.onSwapItems(this.draggedSlot, i);
                    }
                }
            });

            // Right-click context menu
            slot.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                if (this.inventory[i] !== null) {
                    this.showContextMenu(e.clientX, e.clientY, i);
                }
            });

            slot.addEventListener('mouseenter', () => {
                if (this.inventory[i] !== null) {
                    slot.style.background = '#3a3a3a';
                }
            });

            slot.addEventListener('mouseleave', () => {
                slot.style.background = '#2a2a2a';
            });

            this.slotElements.push(slot);
            slotsContainer.appendChild(slot);
        }

        uiContainer.appendChild(slotsContainer);
        document.body.appendChild(uiContainer);
        this.container = uiContainer;

        // Create context menu
        this.createContextMenu();

        // Close context menu when clicking anywhere
        document.addEventListener('click', () => {
            this.hideContextMenu();
        });
    }

    createContextMenu() {
        this.contextMenu = document.createElement('div');
        this.contextMenu.style.cssText = `
            position: fixed;
            background: rgba(0, 0, 0, 0.95);
            border: 2px solid #666;
            border-radius: 4px;
            padding: 5px 0;
            display: none;
            z-index: 10000;
            min-width: 100px;
        `;

        const dropOption = document.createElement('div');
        dropOption.textContent = 'Drop';
        dropOption.style.cssText = `
            padding: 8px 15px;
            cursor: pointer;
            color: white;
            font-size: 14px;
        `;

        dropOption.addEventListener('mouseenter', () => {
            dropOption.style.background = '#3a3a3a';
        });

        dropOption.addEventListener('mouseleave', () => {
            dropOption.style.background = 'transparent';
        });

        dropOption.addEventListener('click', () => {
            const slotIndex = parseInt(this.contextMenu.dataset.slotIndex);
            if (this.onDropItem) {
                this.onDropItem(slotIndex);
            }
            this.hideContextMenu();
        });

        this.contextMenu.appendChild(dropOption);
        document.body.appendChild(this.contextMenu);
    }

    showContextMenu(x, y, slotIndex) {
        this.contextMenu.style.left = x + 'px';
        this.contextMenu.style.top = y + 'px';
        this.contextMenu.style.display = 'block';
        this.contextMenu.dataset.slotIndex = slotIndex;
    }

    hideContextMenu() {
        if (this.contextMenu) {
            this.contextMenu.style.display = 'none';
        }
    }

    update(inventory) {
        this.inventory = inventory;

        for (let i = 0; i < 28; i++) {
            const slot = this.slotElements[i];
            const item = inventory[i];

            // Make draggable if has item
            if (item !== null) {
                slot.draggable = true;
                slot.style.cursor = 'grab';
            } else {
                slot.draggable = false;
                slot.style.cursor = 'default';
            }

            if (item === 'wood') {
                slot.textContent = '🌳';
                slot.title = 'Wood (right-click to drop)';
            } else if (item === 'stone') {
                slot.textContent = '⛰️';
                slot.title = 'Stone (right-click to drop)';
            } else {
                slot.textContent = '';
                slot.title = 'Empty slot';
            }
        }
    }

    setDropItemCallback(callback) {
        this.onDropItem = callback;
    }

    setSwapItemsCallback(callback) {
        this.onSwapItems = callback;
    }

    getInventory() {
        return this.inventory;
    }
}
