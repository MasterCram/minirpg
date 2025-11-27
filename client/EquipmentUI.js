class EquipmentUI {
    constructor() {
        this.equipment = {
            helmet: null,
            amulet: null,
            ring1: null,
            ring2: null,
            gloves: null,
            chestplate: null,
            leggings: null,
            mainHand: null,
            offHand: null,
            boots: null,
            belt: null
        };
        this.container = null;
        this.slotElements = {};
        this.createUI();
    }

    createUI() {
        const uiContainer = document.createElement('div');
        uiContainer.id = 'equipment';
        uiContainer.style.cssText = `
            position: fixed;
            top: 20px;
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
        title.textContent = 'Equipment';
        uiContainer.appendChild(title);

        const slotsContainer = document.createElement('div');
        slotsContainer.style.cssText = `
            display: grid;
            grid-template-columns: repeat(3, 50px);
            gap: 6px;
        `;

        // Equipment slot configuration
        const slotConfig = [
            { key: 'helmet', label: 'Helmet', icon: '⛑️' },
            { key: 'amulet', label: 'Amulet', icon: '📿' },
            { key: 'chestplate', label: 'Chest', icon: '🛡️' },
            { key: 'gloves', label: 'Gloves', icon: '🧤' },
            { key: 'ring1', label: 'Ring 1', icon: '💍' },
            { key: 'ring2', label: 'Ring 2', icon: '💍' },
            { key: 'leggings', label: 'Legs', icon: '👖' },
            { key: 'boots', label: 'Boots', icon: '👢' },
            { key: 'belt', label: 'Belt', icon: '🔗' },
            { key: 'mainHand', label: 'Main', icon: '⚔️' },
            { key: 'offHand', label: 'Off', icon: '🛡️' }
        ];

        slotConfig.forEach(config => {
            const slot = document.createElement('div');
            slot.className = 'equipment-slot';
            slot.dataset.slotKey = config.key;
            slot.style.cssText = `
                width: 50px;
                height: 50px;
                background: #2a2a2a;
                border: 2px solid #444;
                border-radius: 4px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                font-size: 20px;
                transition: background 0.2s;
                position: relative;
            `;

            // Icon placeholder
            const icon = document.createElement('div');
            icon.style.cssText = 'font-size: 24px; opacity: 0.3;';
            icon.textContent = config.icon;
            slot.appendChild(icon);

            // Label
            const label = document.createElement('div');
            label.style.cssText = 'font-size: 8px; margin-top: 2px; opacity: 0.5;';
            label.textContent = config.label;
            slot.appendChild(label);

            slot.addEventListener('mouseenter', () => {
                slot.style.background = '#3a3a3a';
            });

            slot.addEventListener('mouseleave', () => {
                slot.style.background = '#2a2a2a';
            });

            this.slotElements[config.key] = { slot, icon, label };
            slotsContainer.appendChild(slot);
        });

        uiContainer.appendChild(slotsContainer);
        document.body.appendChild(uiContainer);
        this.container = uiContainer;
    }

    update(equipment) {
        this.equipment = equipment;

        Object.keys(this.equipment).forEach(key => {
            const item = this.equipment[key];
            const slotElement = this.slotElements[key];

            if (slotElement) {
                if (item) {
                    // Item equipped - show item, hide placeholder
                    slotElement.icon.style.opacity = '1';
                    slotElement.label.style.opacity = '1';
                    slotElement.slot.title = `${key}: ${item}`;
                } else {
                    // No item - show placeholder
                    slotElement.icon.style.opacity = '0.3';
                    slotElement.label.style.opacity = '0.5';
                    slotElement.slot.title = `Empty ${key} slot`;
                }
            }
        });
    }

    getEquipment() {
        return this.equipment;
    }
}
