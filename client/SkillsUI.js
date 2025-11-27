class SkillsUI {
    constructor() {
        this.skills = {
            combat: 1,
            mining: 1,
            smithing: 1,
            crafting: 1,
            foraging: 1,
            slayer: 1
        };
        this.container = null;
        this.skillElements = {};
        this.createUI();
    }

    createUI() {
        const uiContainer = document.createElement('div');
        uiContainer.id = 'skills';
        uiContainer.style.cssText = `
            position: fixed;
            bottom: 310px;
            right: 20px;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 15px;
            border-radius: 8px;
            font-family: Arial, sans-serif;
            border: 2px solid #444;
            width: 240px;
        `;

        const title = document.createElement('h3');
        title.style.cssText = 'margin: 0 0 10px 0; font-size: 16px; border-bottom: 1px solid #666; padding-bottom: 5px;';
        title.textContent = 'Skills';
        uiContainer.appendChild(title);

        const skillsContainer = document.createElement('div');
        skillsContainer.style.cssText = 'display: flex; flex-direction: column; gap: 8px;';

        // Skill configuration with icons
        const skillConfig = [
            { key: 'combat', label: 'Combat', icon: '⚔️' },
            { key: 'mining', label: 'Mining', icon: '⛏️' },
            { key: 'smithing', label: 'Smithing', icon: '🔨' },
            { key: 'crafting', label: 'Crafting', icon: '✂️' },
            { key: 'foraging', label: 'Foraging', icon: '🌿' },
            { key: 'slayer', label: 'Slayer', icon: '💀' }
        ];

        skillConfig.forEach(config => {
            const skillRow = document.createElement('div');
            skillRow.style.cssText = `
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 6px 8px;
                background: #2a2a2a;
                border-radius: 4px;
                border: 1px solid #555;
            `;

            const labelSection = document.createElement('div');
            labelSection.style.cssText = 'display: flex; align-items: center; gap: 8px;';

            const icon = document.createElement('span');
            icon.style.cssText = 'font-size: 18px;';
            icon.textContent = config.icon;
            labelSection.appendChild(icon);

            const label = document.createElement('span');
            label.style.cssText = 'font-size: 13px; font-weight: 500;';
            label.textContent = config.label;
            labelSection.appendChild(label);

            const levelDisplay = document.createElement('span');
            levelDisplay.style.cssText = `
                font-size: 13px;
                font-weight: bold;
                color: #4CAF50;
                padding: 2px 8px;
                background: #1a1a1a;
                border-radius: 3px;
            `;
            levelDisplay.textContent = `Lvl ${this.skills[config.key]}`;

            skillRow.appendChild(labelSection);
            skillRow.appendChild(levelDisplay);

            this.skillElements[config.key] = levelDisplay;
            skillsContainer.appendChild(skillRow);
        });

        uiContainer.appendChild(skillsContainer);
        document.body.appendChild(uiContainer);
        this.container = uiContainer;
    }

    update(skills) {
        this.skills = skills;

        Object.keys(skills).forEach(key => {
            const level = skills[key];
            const element = this.skillElements[key];

            if (element) {
                element.textContent = `Lvl ${level}`;
            }
        });
    }

    getSkills() {
        return this.skills;
    }
}
