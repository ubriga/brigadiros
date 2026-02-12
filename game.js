// Game Configuration
const CONFIG = {
    CANVAS_WIDTH: 800,
    CANVAS_HEIGHT: 600,
    PLAYER_WIDTH: 40,
    PLAYER_HEIGHT: 50,
    FLOOR_HEIGHT: 20,
    FLOOR_MIN_WIDTH: 150,
    FLOOR_MAX_WIDTH: 350,
    FLOOR_VERTICAL_SPACING: 100,
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
    THEME_INTERVAL: 100
};

// Game State
class GameState {
    constructor() {
        this.reset();
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
        
        // Horizontal movement
        if (this.state.keys['ArrowLeft']) {
            if (player.onGround) {
                player.vx -= CONFIG.MOVE_ACCELERATION;
            } else {
                player.vx -= CONFIG.MOVE_ACCELERATION * CONFIG.AIR_CONTROL;
            }
        }
        if (this.state.keys['ArrowRight']) {
            if (player.onGround) {
                player.vx += CONFIG.MOVE_ACCELERATION;
            } else {
                player.vx += CONFIG.MOVE_ACCELERATION * CONFIG.AIR_CONTROL;
            }
        }

        // Apply friction
        if (player.onGround) {
            player.vx *= CONFIG.FRICTION;
        }

        // Clamp horizontal speed
        player.vx = Math.max(-CONFIG.MOVE_MAX_SPEED, Math.min(CONFIG.MOVE_MAX_SPEED, player.vx));

        // Jump
        const canJump = player.onGround || (Date.now() - player.lastGroundTime < CONFIG.COYOTE_TIME);
        if (this.state.keys[' '] && canJump && player.vy >= 0) {
            const speed = Math.abs(player.vx);
            const jumpPower = CONFIG.JUMP_POWER_BASE + (speed / CONFIG.MOVE_MAX_SPEED) * (CONFIG.JUMP_POWER_MAX - CONFIG.JUMP_POWER_BASE);
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
        this.ctx.fillStyle = '#FF6347';
        this.ctx.fillRect(
            this.state.player.x,
            playerScreenY,
            CONFIG.PLAYER_WIDTH,
            CONFIG.PLAYER_HEIGHT
        );
        
        // Player face
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(this.state.player.x + 10, playerScreenY + 15, 5, 5);
        this.ctx.fillRect(this.state.player.x + 25, playerScreenY + 15, 5, 5);
        this.ctx.fillRect(this.state.player.x + 10, playerScreenY + 30, 20, 3);
    }
}

// Initialize game when page loads
window.addEventListener('load', () => {
    new Game();
});
