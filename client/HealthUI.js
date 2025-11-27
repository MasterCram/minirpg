class HealthUI {
    constructor() {
        this.health = 10;
        this.maxHealth = 10;
        this.container = null;
        this.healthBar = null;
        this.healthText = null;
        this.createUI();
    }

    createUI() {
        const uiContainer = document.createElement('div');
        uiContainer.id = 'health';
        uiContainer.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 10px;
            border-radius: 8px;
            font-family: Arial, sans-serif;
            border: 2px solid #444;
            width: 200px;
        `;

        const title = document.createElement('h3');
        title.style.cssText = 'margin: 0 0 8px 0; font-size: 14px; text-align: center;';
        title.textContent = 'Health';
        uiContainer.appendChild(title);

        // Health bar container
        const barContainer = document.createElement('div');
        barContainer.style.cssText = `
            width: 100%;
            height: 20px;
            background: #333;
            border: 2px solid #666;
            border-radius: 4px;
            overflow: hidden;
            position: relative;
        `;

        // Health bar fill
        this.healthBar = document.createElement('div');
        this.healthBar.style.cssText = `
            height: 100%;
            background: linear-gradient(to bottom, #ff4444, #cc0000);
            transition: width 0.3s ease;
            width: 100%;
        `;
        barContainer.appendChild(this.healthBar);

        // Health text overlay
        this.healthText = document.createElement('div');
        this.healthText.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: bold;
            color: white;
            text-shadow: 1px 1px 2px black;
        `;
        this.healthText.textContent = '10 / 10';
        barContainer.appendChild(this.healthText);

        uiContainer.appendChild(barContainer);
        document.body.appendChild(uiContainer);
        this.container = uiContainer;
    }

    update(health, maxHealth) {
        this.health = health;
        this.maxHealth = maxHealth;

        const percentage = (health / maxHealth) * 100;
        this.healthBar.style.width = `${percentage}%`;
        this.healthText.textContent = `${health} / ${maxHealth}`;

        // Change color based on health percentage
        if (percentage > 50) {
            this.healthBar.style.background = 'linear-gradient(to bottom, #ff4444, #cc0000)';
        } else if (percentage > 25) {
            this.healthBar.style.background = 'linear-gradient(to bottom, #ff8844, #dd4400)';
        } else {
            this.healthBar.style.background = 'linear-gradient(to bottom, #ffaa44, #ff4400)';
        }
    }

    getHealth() {
        return { health: this.health, maxHealth: this.maxHealth };
    }
}
