// Game Configuration
const CONFIG = {
    CANVAS_WIDTH: 800,
    CANVAS_HEIGHT: 800, // Increased height for "zoomed out" feel (more floors visible)
    PLAYER_WIDTH: 32,   // Smaller player
    PLAYER_HEIGHT: 40,  // Smaller player
    FLOOR_HEIGHT: 16,   // Smaller floors
    FLOOR_MIN_WIDTH: 150,
    FLOOR_MAX_WIDTH: 350,
    FLOOR_VERTICAL_SPACING: 80, // Tighter spacing
    GRAVITY: 0.6,
    JUMP_POWER_BASE: 12,
    JUMP_POWER_MAX: 22,
    MOVE_ACCELERATION: 0.8,
    MOVE_MAX_SPEED: 10,
    AIR_CONTROL: 0.6,
    FRICTION: 0.85,
    WALL_BOUNCE_MULTIPLIER: 0.7,
    SCROLL_START_FLOOR: 5,
    SCROLL_SPEED_INITIAL: 0.5,
    SCROLL_SPEED_INCREMENT: 0.3,
    SCROLL_INTERVAL: 30000, // 30 seconds
    COMBO_TIMER: 3000, // 3 seconds
    COMBO_MIN_FLOORS: 2,
    COYOTE_TIME: 100, // ms
    SIMULATION_FPS: 120,
    THEME_INTERVAL: 100,
    MOVE_SPEED_MULTIPLIER: 1.0 // Default speed multiplier
};

const SKINS = [
    { id: 'default', name: 'Red Box', cost: 0, color: '#FF6347' },
    { id: 'blue', name: 'Blue Box', cost: 100, color: '#4169E1' },
    { id: 'green', name: 'Green Box', cost: 100, color: '#32CD32' },
    { id: 'gold', name: 'Golden Box', cost: 100, color: '#FFD700' },
    { id: 'ninja', name: 'Ninja', cost: 100, color: '#000000' }
];

// SHA-256 Hashes of the 10 coupons (1000 coins each)
const COUPON_HASHES = [
    '2a4d04dd777ff8035b8605067fb465ca24d3d69a3f18f243bce22cc261088a65',
    '4ff188ba2f513857d52f68fe980b54e55aa540646bbe00dae628fc9307fa7d16',
    'ef6301255bb49b6efb2dcadee0885b0e37a5217bed573f01ee6411ec05a7f515',
    'daa3d077be184b7499397dfefedbcc3c629892caa4ff93c6f9c19678b37253ec',
    'b6cfb3225752b7d551ab953258bcf92b6631ad9641a386023bf331e66c69f86e',
    '26fee03c6be15c350bf6ca3199811be0f474770424a1a2a1210b9f72d7e45e31',
    'cef25f82a630252b50569aa67c51df6614feb273c7f26e9d00ad3d418cb3fa38',
    '8e000442cc0e5755b8d0be4dc5602f710003237ebd0d1a8fdc10055cce9575a7',
    '27cef2adb3d1e3fb08abb1f51b62f6d965f8b66b15ee7592382be688b7b7c65f',
    'c1d2763d88ee1a30651a1b7204bb90685c339e4faad84bff5b9d8cc7c5823672'
];

async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Game State
class GameState {
    constructor() {
        this.reset();
        this.loadUserData();
    }

    loadUserData() {
        const data = JSON.parse(localStorage.getItem('brigadiros_user') || '{"coins": 0, "ownedSkins": ["default"], "currentSkin": "default", "redeemedCoupons": []}');
        this.coins = data.coins;
        this.ownedSkins = data.ownedSkins;
        this.currentSkin = data.currentSkin;
        this.redeemedCoupons = data.redeemedCoupons || [];
    }

    saveUserData() {
        const data = {
            coins: this.coins,
            ownedSkins: this.ownedSkins,
            currentSkin: this.currentSkin,
            redeemedCoupons: this.redeemedCoupons
        };
        localStorage.setItem('brigadiros_user', JSON.stringify(data));
    }

    reset() {
        this.player = {
            x: CONFIG.CANVAS_WIDTH / 2,
            y: CONFIG.CANVAS_HEIGHT - 200,
            vx: 0,
            vy: 0,
            onGround: false,
            lastGroundTime: 0
        };
        this.floors = [];
        this.camera = { y: 0 };
        this.currentFloor = 1;
        this.highestFloor = 1;
        this.score = 0;
        this.scrollSpeed = 0;
        this.scrollActive = false;
        this.speedLevel = 0;
        this.lastSpeedIncrease = Date.now();
        this.combo = {
            active: false,
            count: 0,
            floors: 0,
            lastLandTime: 0,
            maxCombo: 0
        };
        this.gameStartTime = Date.now();
        this.isPaused = false;
        this.practiceMode = false;
        this.practiceSettings = { startFloor: 1, fixedSpeed: false };
        this.keys = {};
        this.gameOver = false;
        
        this.generateInitialFloors();
    }

    generateInitialFloors() {
        // Ground floor
        this.floors.push({
            y: CONFIG.CANVAS_HEIGHT - 100,
            width: CONFIG.CANVAS_WIDTH,
            x: 0,
            floorNumber: 1,
            theme: 0
        });

        // Generate floors upward
        for (let i = 2; i <= 30; i++) {
            const lastFloor = this.floors[this.floors.length - 1];
            const width = CONFIG.FLOOR_MIN_WIDTH + Math.random() * (CONFIG.FLOOR_MAX_WIDTH - CONFIG.FLOOR_MIN_WIDTH);
            const x = Math.random() * (CONFIG.CANVAS_WIDTH - width);
            const y = lastFloor.y - CONFIG.FLOOR_VERTICAL_SPACING;
            const theme = Math.floor((i - 1) / CONFIG.THEME_INTERVAL);
            
            this.floors.push({ x, y, width, floorNumber: i, theme });
        }
    }

    addFloorIfNeeded() {
        const topFloor = this.floors[this.floors.length - 1];
        const cameraTop = this.camera.y - CONFIG.CANVAS_HEIGHT;
        
        while (topFloor.y > cameraTop - 500) {
            const lastFloor = this.floors[this.floors.length - 1];
            const width = CONFIG.FLOOR_MIN_WIDTH + Math.random() * (CONFIG.FLOOR_MAX_WIDTH - CONFIG.FLOOR_MIN_WIDTH);
            const x = Math.random() * (CONFIG.CANVAS_WIDTH - width);
            const y = lastFloor.y - CONFIG.FLOOR_VERTICAL_SPACING;
            const floorNumber = lastFloor.floorNumber + 1;
            const theme = Math.floor((floorNumber - 1) / CONFIG.THEME_INTERVAL);
            
            this.floors.push({ x, y, width, floorNumber, theme });
        }
    }

    removeOldFloors() {
        const cameraBottom = this.camera.y + CONFIG.CANVAS_HEIGHT + 200;
        this.floors = this.floors.filter(floor => floor.y < cameraBottom);
    }
}

// Game Engine
class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.state = new GameState();
        this.lastFrameTime = Date.now();
        this.accumulator = 0;
        this.timestep = 1000 / CONFIG.SIMULATION_FPS;
        
        this.setupCanvas();
        this.setupEventListeners();
        this.showScreen('menu-screen');
    }

    setupCanvas() {
        this.canvas.width = CONFIG.CANVAS_WIDTH;
        this.canvas.height = CONFIG.CANVAS_HEIGHT;
    }

    setupEventListeners() {
        // Keyboard
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));

        // Menu buttons
        document.getElementById('play-btn').addEventListener('click', () => this.startGame());
        document.getElementById('practice-btn').addEventListener('click', () => this.showScreen('practice-screen'));
        document.getElementById('leaderboard-btn').addEventListener('click', () => this.showLeaderboard());
        document.getElementById('settings-btn').addEventListener('click', () => this.showScreen('settings-screen'));
        document.getElementById('store-btn').addEventListener('click', () => this.showStore());
        
        // Store buttons
        document.getElementById('store-back-btn').addEventListener('click', () => this.showScreen('menu-screen'));
        document.getElementById('redeem-btn').addEventListener('click', () => this.redeemCoupon());

        // Pause overlay
        document.getElementById('resume-btn').addEventListener('click', () => this.resumeGame());
        document.getElementById('restart-btn').addEventListener('click', () => this.restartGame());
        document.getElementById('menu-btn').addEventListener('click', () => this.returnToMenu());
        
        // Game over
        document.getElementById('retry-btn').addEventListener('click', () => this.startGame());
        document.getElementById('mainmenu-btn').addEventListener('click', () => this.returnToMenu());
        
        // Practice
        document.getElementById('practice-start-btn').addEventListener('click', () => this.startPractice());
        document.getElementById('practice-back-btn').addEventListener('click', () => this.showScreen('menu-screen'));
        
        // Settings
        document.getElementById('settings-back-btn').addEventListener('click', () => this.showScreen('menu-screen'));
        document.getElementById('game-speed').addEventListener('input', (e) => {
            CONFIG.MOVE_SPEED_MULTIPLIER = parseFloat(e.target.value);
            document.getElementById('speed-value').textContent = CONFIG.MOVE_SPEED_MULTIPLIER + 'x';
        });
        
        // Leaderboard
        document.getElementById('leaderboard-back-btn').addEventListener('click', () => this.showScreen('menu-screen'));
    }

    handleKeyDown(e) {
        this.state.keys[e.key] = true;
        
        if (e.key === 'Escape' && document.getElementById('game-screen').classList.contains('active')) {
            this.togglePause();
        }
    }

    handleKeyUp(e) {
        this.state.keys[e.key] = false;
    }

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');
    }

    showStore() {
        this.updateStoreUI();
        this.showScreen('store-screen');
    }

    updateStoreUI() {
        document.getElementById('player-coins').textContent = this.state.coins;
        const grid = document.getElementById('skins-grid');
        grid.innerHTML = SKINS.map(skin => {
            const owned = this.state.ownedSkins.includes(skin.id);
            const equipped = this.state.currentSkin === skin.id;
            let btnText = 'Buy';
            let btnClass = 'buy-btn';
            
            if (equipped) {
                btnText = 'Equipped';
                btnClass = 'equipped-btn';
            } else if (owned) {
                btnText = 'Equip';
                btnClass = 'equip-btn';
            } else {
                btnText = `Buy (${skin.cost})`;
            }

            return `
                <div class="skin-card ${owned ? 'owned' : ''} ${equipped ? 'equipped' : ''}" style="border-color: ${skin.color}">
                    <div class="skin-preview" style="background-color: ${skin.color}"></div>
                    <div class="skin-name">${skin.name}</div>
                    <button onclick="window.game.handleSkinAction('${skin.id}')" class="${btnClass}" ${equipped ? 'disabled' : ''}>${btnText}</button>
                </div>
            `;
        }).join('');
    }

    handleSkinAction(skinId) {
        const skin = SKINS.find(s => s.id === skinId);
        if (!skin) return;

        if (this.state.ownedSkins.includes(skinId)) {
            // Equip
            this.state.currentSkin = skinId;
            this.state.saveUserData();
            this.updateStoreUI();
        } else {
            // Buy
            if (this.state.coins >= skin.cost) {
                this.state.coins -= skin.cost;
                this.state.ownedSkins.push(skinId);
                this.state.saveUserData();
                this.updateStoreUI();
            } else {
                alert('Not enough coins!');
            }
        }
    }

    async redeemCoupon() {
        const input = document.getElementById('coupon-code');
        const code = input.value.trim();
        if (!code) return;

        const hash = await sha256(code);
        
        if (COUPON_HASHES.includes(hash)) {
            if (this.state.redeemedCoupons.includes(hash)) {
                alert('Coupon already redeemed!');
            } else {
                this.state.coins += 1000;
                this.state.redeemedCoupons.push(hash);
                this.state.saveUserData();
                this.updateStoreUI();
                alert('Redeemed 1000 coins!');
                input.value = '';
            }
        } else {
            alert('Invalid coupon code!');
        }
    }

    startGame() {
        this.state.reset();
        this.state.practiceMode = false;
        this.showScreen('game-screen');
        this.gameLoop();
    }

    startPractice() {
        this.state.reset();
        this.state.practiceMode = true;
        this.state.practiceSettings.startFloor = parseInt(document.getElementById('practice-floor').value) || 1;
        this.state.practiceSettings.fixedSpeed = document.getElementById('practice-fixed-speed').checked;
        
        // Adjust starting position
        if (this.state.practiceSettings.startFloor > 1) {
            this.state.currentFloor = this.state.practiceSettings.startFloor;
            this.state.highestFloor = this.state.practiceSettings.startFloor;
        }
        
        this.showScreen('game-screen');
        this.gameLoop();
    }

    togglePause() {
        if (this.state.gameOver) return;
        
        this.state.isPaused = !this.state.isPaused;
        const overlay = document.getElementById('pause-overlay');
        
        if (this.state.isPaused) {
            overlay.classList.remove('hidden');
        } else {
            overlay.classList.add('hidden');
            this.lastFrameTime = Date.now();
        }
    }

    resumeGame() {
        this.togglePause();
    }

    restartGame() {
        if (this.state.practiceMode) {
            this.startPractice();
        } else {
            this.startGame();
        }
    }

    returnToMenu() {
        this.state.isPaused = false;
        this.state.gameOver = false;
        document.getElementById('pause-overlay').classList.add('hidden');
        this.showScreen('menu-screen');
    }

    showLeaderboard() {
        this.updateLeaderboardDisplay();
        this.showScreen('leaderboard-screen');
    }

    updateLeaderboardDisplay() {
        const scores = this.loadScores();
        const listEl = document.getElementById('leaderboard-list');
        
        if (scores.length === 0) {
            listEl.innerHTML = '<div class="no-scores">No scores yet. Be the first to play!</div>';
            return;
        }

        listEl.innerHTML = scores.map((entry, index) => `
            <div class="leaderboard-entry ${index === 0 ? 'player' : ''}">
                <span>#${index + 1}</span>
                <span>Floor ${entry.floor} | Score ${entry.score} | Combo ${entry.combo}x</span>
                <span>${new Date(entry.date).toLocaleDateString()}</span>
            </div>
        `).join('');
    }

    loadScores() {
        try {
            return JSON.parse(localStorage.getItem('brigadiros_scores') || '[]');
        } catch {
            return [];
        }
    }

    saveScore() {
        const scores = this.loadScores();
        scores.push({
            floor: this.state.highestFloor,
            score: this.state.score,
            combo: this.state.combo.maxCombo,
            date: Date.now()
        });
        scores.sort((a, b) => b.score - a.score);
        scores.splice(10); // Keep top 10
        localStorage.setItem('brigadiros_scores', JSON.stringify(scores));
    }

    gameLoop() {
        if (this.state.gameOver || this.state.isPaused) {
            if (!this.state.gameOver && !this.state.isPaused) {
                requestAnimationFrame(() => this.gameLoop());
            }
            return;
        }

        const currentTime = Date.now();
        const deltaTime = Math.min(currentTime - this.lastFrameTime, 100);
        this.lastFrameTime = currentTime;
        this.accumulator += deltaTime;

        // Fixed timestep simulation
        while (this.accumulator >= this.timestep) {
            this.update(this.timestep);
            this.accumulator -= this.timestep;
        }

        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }

    update(dt) {
        this.updatePlayer(dt);
        this.updateCamera();
        this.updateScrolling();
        this.updateCombo();
        this.updateUI();
        this.state.addFloorIfNeeded();
        this.state.removeOldFloors();
        this.checkGameOver();
    }

    updatePlayer(dt) {
        const player = this.state.player;
        const speedMult = CONFIG.MOVE_SPEED_MULTIPLIER;
        
        // Horizontal movement
        if (this.state.keys['ArrowLeft']) {
            if (player.onGround) {
                player.vx -= CONFIG.MOVE_ACCELERATION * speedMult;
            } else {
                player.vx -= CONFIG.MOVE_ACCELERATION * CONFIG.AIR_CONTROL * speedMult;
            }
        }
        if (this.state.keys['ArrowRight']) {
            if (player.onGround) {
                player.vx += CONFIG.MOVE_ACCELERATION * speedMult;
            } else {
                player.vx += CONFIG.MOVE_ACCELERATION * CONFIG.AIR_CONTROL * speedMult;
            }
        }

        // Apply friction
        if (player.onGround) {
            player.vx *= CONFIG.FRICTION;
        }

        // Clamp horizontal speed
        const maxSpeed = CONFIG.MOVE_MAX_SPEED * speedMult;
        player.vx = Math.max(-maxSpeed, Math.min(maxSpeed, player.vx));

        // Jump
        const canJump = player.onGround || (Date.now() - player.lastGroundTime < CONFIG.COYOTE_TIME);
        if (this.state.keys[' '] && canJump && player.vy >= 0) {
            const speed = Math.abs(player.vx);
            const jumpPower = CONFIG.JUMP_POWER_BASE + (speed / maxSpeed) * (CONFIG.JUMP_POWER_MAX - CONFIG.JUMP_POWER_BASE);
            player.vy = -jumpPower;
            player.onGround = false;
            this.state.keys[' '] = false; // Prevent holding
        }

        // Gravity
        if (!player.onGround) {
            player.vy += CONFIG.GRAVITY;
        }

        // Update position
        player.x += player.vx;
        player.y += player.vy;

        // Wall collision
        if (player.x < 0) {
            player.x = 0;
            player.vx = -player.vx * CONFIG.WALL_BOUNCE_MULTIPLIER;
        } else if (player.x + CONFIG.PLAYER_WIDTH > CONFIG.CANVAS_WIDTH) {
            player.x = CONFIG.CANVAS_WIDTH - CONFIG.PLAYER_WIDTH;
            player.vx = -player.vx * CONFIG.WALL_BOUNCE_MULTIPLIER;
        }

        // Floor collision
        player.onGround = false;
        for (const floor of this.state.floors) {
            if (player.vy >= 0 && // Moving down
                player.y + CONFIG.PLAYER_HEIGHT >= floor.y &&
                player.y + CONFIG.PLAYER_HEIGHT <= floor.y + CONFIG.FLOOR_HEIGHT + 10 &&
                player.x + CONFIG.PLAYER_WIDTH > floor.x &&
                player.x < floor.x + floor.width) {
                
                player.y = floor.y - CONFIG.PLAYER_HEIGHT;
                player.vy = 0;
                player.onGround = true;
                player.lastGroundTime = Date.now();
                
                this.handleFloorLanding(floor);
                break;
            }
        }
    }

    handleFloorLanding(floor) {
        if (floor.floorNumber > this.state.currentFloor) {
            const floorDiff = floor.floorNumber - this.state.currentFloor;
            this.state.currentFloor = floor.floorNumber;
            
            if (floor.floorNumber > this.state.highestFloor) {
                this.state.highestFloor = floor.floorNumber;
                this.state.score += floor.floorNumber;
            }

            // Combo system
            if (floorDiff >= CONFIG.COMBO_MIN_FLOORS) {
                if (!this.state.combo.active) {
                    this.state.combo.active = true;
                    this.state.combo.count = 1;
                    this.state.combo.floors = floorDiff;
                } else {
                    this.state.combo.count++;
                    this.state.combo.floors += floorDiff;
                }
                this.state.combo.lastLandTime = Date.now();
                this.state.score += floorDiff * 10 * this.state.combo.count;
                
                if (this.state.combo.count > this.state.combo.maxCombo) {
                    this.state.combo.maxCombo = this.state.combo.count;
                }
            } else {
                this.endCombo();
            }
        }
    }

    endCombo() {
        this.state.combo.active = false;
        this.state.combo.count = 0;
        this.state.combo.floors = 0;
    }

    updateCamera() {
        const targetY = this.state.player.y + CONFIG.PLAYER_HEIGHT - CONFIG.CANVAS_HEIGHT / 2;
        this.state.camera.y = Math.max(0, targetY);
    }

    updateScrolling() {
        if (this.state.practiceSettings.fixedSpeed && this.state.practiceMode) {
            return;
        }

        if (!this.state.scrollActive && this.state.currentFloor >= CONFIG.SCROLL_START_FLOOR) {
            this.state.scrollActive = true;
            this.state.scrollSpeed = CONFIG.SCROLL_SPEED_INITIAL;
            this.state.lastSpeedIncrease = Date.now();
        }

        if (this.state.scrollActive) {
            // Increase scroll speed over time
            if (Date.now() - this.state.lastSpeedIncrease >= CONFIG.SCROLL_INTERVAL) {
                this.state.scrollSpeed += CONFIG.SCROLL_SPEED_INCREMENT;
                this.state.speedLevel++;
                this.state.lastSpeedIncrease = Date.now();
                this.showHurryBanner();
            }

            // Apply scrolling
            for (const floor of this.state.floors) {
                floor.y += this.state.scrollSpeed;
            }
            this.state.player.y += this.state.scrollSpeed;
        }
    }

    showHurryBanner() {
        const banner = document.getElementById('hurry-banner');
        banner.classList.remove('hurry-hidden');
        setTimeout(() => banner.classList.add('hurry-hidden'), 1000);
    }

    updateCombo() {
        if (this.state.combo.active) {
            const elapsed = Date.now() - this.state.combo.lastLandTime;
            if (elapsed >= CONFIG.COMBO_TIMER) {
                this.endCombo();
            }
        }
    }

    updateUI() {
        document.getElementById('current-floor').textContent = this.state.currentFloor;
        document.getElementById('best-floor').textContent = this.state.highestFloor;
        document.getElementById('score').textContent = this.state.score;
        document.getElementById('speed-level').textContent = this.state.speedLevel;

        const comboDisplay = document.getElementById('combo-display');
        if (this.state.combo.active) {
            comboDisplay.classList.remove('combo-hidden');
            document.getElementById('combo-count').textContent = this.state.combo.count;
            
            const elapsed = Date.now() - this.state.combo.lastLandTime;
            const remaining = Math.max(0, CONFIG.COMBO_TIMER - elapsed);
            const percentage = (remaining / CONFIG.COMBO_TIMER) * 100;
            document.getElementById('combo-timer-fill').style.width = percentage + '%';
        } else {
            comboDisplay.classList.add('combo-hidden');
        }
    }

    checkGameOver() {
        const screenBottom = this.state.camera.y + CONFIG.CANVAS_HEIGHT;
        if (this.state.player.y > screenBottom) {
            this.endGame();
        }
    }

    endGame() {
        this.state.gameOver = true;
        this.saveScore();
        
        const elapsed = Date.now() - this.state.gameStartTime;
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        
        document.getElementById('final-floor').textContent = this.state.highestFloor;
        document.getElementById('final-score').textContent = this.state.score;
        document.getElementById('final-combo').textContent = this.state.combo.maxCombo;
        document.getElementById('final-time').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        this.showScreen('gameover-screen');
    }

    render() {
        this.ctx.clearRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
        
        // Background
        const gradient = this.ctx.createLinearGradient(0, 0, 0, CONFIG.CANVAS_HEIGHT);
        gradient.addColorStop(0, '#87CEEB');
        gradient.addColorStop(1, '#E0F6FF');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

        // Floors
        for (const floor of this.state.floors) {
            const screenY = floor.y - this.state.camera.y;
            if (screenY > -50 && screenY < CONFIG.CANVAS_HEIGHT + 50) {
                const colors = ['#8B4513', '#A0522D', '#CD853F', '#DEB887'];
                this.ctx.fillStyle = colors[floor.theme % colors.length];
                this.ctx.fillRect(floor.x, screenY, floor.width, CONFIG.FLOOR_HEIGHT);
                
                // Floor number
                if (floor.width > 80) {
                    this.ctx.fillStyle = '#FFF';
                    this.ctx.font = 'bold 14px Arial';
                    this.ctx.textAlign = 'center';
                    this.ctx.fillText(floor.floorNumber, floor.x + floor.width / 2, screenY + 14);
                }
            }
        }

        // Player
        const playerScreenY = this.state.player.y - this.state.camera.y;
        
        // Get current skin color
        const skin = SKINS.find(s => s.id === this.state.currentSkin) || SKINS[0];
        this.ctx.fillStyle = skin.color;
        
        this.ctx.fillRect(
            this.state.player.x,
            playerScreenY,
            CONFIG.PLAYER_WIDTH,
            CONFIG.PLAYER_HEIGHT
        );
        
        // Player face (adjust based on skin if needed, for now simple)
        this.ctx.fillStyle = '#000'; // Eyes always black
        
        if (skin.id === 'ninja') {
            // Ninja band
            this.ctx.fillStyle = '#FF0000';
            this.ctx.fillRect(this.state.player.x, playerScreenY + 10, CONFIG.PLAYER_WIDTH, 10);
            this.ctx.fillStyle = '#FFF'; // White eyes
        }
        
        // Eyes
        this.ctx.fillRect(this.state.player.x + 8, playerScreenY + 15, 5, 5);
        this.ctx.fillRect(this.state.player.x + 20, playerScreenY + 15, 5, 5);
        
        // Mouth
        if (skin.id !== 'ninja') {
            this.ctx.fillStyle = '#000';
            this.ctx.fillRect(this.state.player.x + 8, playerScreenY + 30, 16, 3);
        }
    }
}

// Global hook for button clicks
window.game = null;
window.addEventListener('load', () => {
    window.game = new Game();
});
