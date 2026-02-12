# 🎮 Brigadiros

**A momentum-based vertical platformer inspired by Icy Tower**

[![Play Now](https://img.shields.io/badge/Play-Now-success?style=for-the-badge)](https://ubriga.github.io/brigadiros/)

## 🕹️ Play the Game

**[Click here to play Brigadiros!](https://ubriga.github.io/brigadiros/)**

The game runs entirely in your browser - no installation required!

## 🎯 About

Brigadiros is a vertical platformer where you climb an endless tower by building momentum and chaining multi-floor jumps. Race against the downward-scrolling screen, master wall bounces, and chain massive combos to reach the highest floor possible!

## 🎮 How to Play

### Controls
- **←/→ Arrow Keys**: Move left/right
- **Space**: Jump
- **Escape**: Pause

### Core Mechanics

**Momentum System**: Your horizontal speed determines jump height. Build speed by running across floors before jumping!

**Combo System**: Land jumps that gain 2+ floors to start a combo. Chain them within 3 seconds to multiply your score!

**Wall Bounce**: Hit side walls while moving to reverse direction and maintain momentum - crucial for tight spaces.

**The Scroll**: After reaching floor 5, the tower starts scrolling downward. Every 30 seconds, the speed increases. Don't fall behind!

### Scoring
- Base points for reaching new floors
- Bonus points for combo chains
- Higher combos = exponentially higher scores

## 🎨 Features

✅ **Faithful Classic Gameplay**
- Precise momentum-based physics
- Semi-permeable floor collisions
- Wall bouncing mechanics
- Coyote time for forgiving jumps

✅ **Modern Web Implementation**
- Fixed timestep physics (120Hz simulation)
- Consistent cross-browser performance
- Responsive design
- Local leaderboard storage

✅ **Game Modes**
- **Play**: Classic mode with progressive difficulty
- **Practice**: Start from any floor, optional fixed speed

✅ **Progression Systems**
- Local high score tracking
- Combo records
- Time survived statistics
- Visual floor themes every 100 floors

✅ **Accessibility**
- Reduced motion option
- Colorblind mode
- Customizable settings

## 🛠️ Technical Details

### Architecture
- **Pure Vanilla JavaScript** - No frameworks, maximum compatibility
- **HTML5 Canvas** - Hardware-accelerated rendering
- **Fixed Timestep Simulation** - Deterministic physics at 120Hz
- **Decoupled Render Loop** - Smooth visuals at any refresh rate

### Performance Targets
- Input latency: <50ms on desktop
- Fixed 120Hz physics simulation
- Variable refresh rate rendering
- Graceful degradation under load

### Physics Constants
```javascript
Gravity: 0.6
Base Jump Power: 12
Max Jump Power: 22 (speed-dependent)
Max Move Speed: 10
Combo Timer: 3 seconds
Scroll Start: Floor 5
Speed Increase: Every 30 seconds
```

## 📁 Project Structure

```
brigadiros/
├── index.html          # Main HTML structure
├── styles.css          # Complete styling
├── game.js            # Full game engine
└── README.md          # Documentation
```

## 🚀 Local Development

No build process required! Just:

1. Clone the repository:
   ```bash
   git clone https://github.com/ubriga/brigadiros.git
   cd brigadiros
   ```

2. Serve the files:
   ```bash
   # Python 3
   python -m http.server 8000
   
   # Python 2
   python -m SimpleHTTPServer 8000
   
   # Node.js
   npx http-server
   ```

3. Open `http://localhost:8000` in your browser

## 🎯 Game Design Philosophy

Brigadiros focuses on **skill expression through momentum management**:

1. **Risk vs. Reward**: Longer run-ups = higher jumps = bigger combos, but require more floor space and time
2. **Pressure Mechanics**: Increasing scroll speed forces faster decision-making
3. **Technical Skill**: Wall bounces and tight combo timing separate good runs from great ones
4. **Deterministic Physics**: Same inputs always produce same results - pure skill-based gameplay

## 📊 High Score Strategy

🏆 **Floor climbing** gives base points, but **combos are king**:

- Single floor jumps break combos
- 2+ floor jumps build combos
- Each combo jump multiplies your score
- Combo timer: 3 seconds between landings

**Pro tip**: Once the scroll starts, prioritize combo preservation over maximum height gains!

## 🔧 Configuration

All game constants are configurable in `game.js`:

```javascript
const CONFIG = {
    CANVAS_WIDTH: 800,
    CANVAS_HEIGHT: 600,
    PLAYER_WIDTH: 40,
    PLAYER_HEIGHT: 50,
    // ... and many more!
};
```

## 🐛 Known Limitations

- Leaderboards are stored locally (no server backend)
- No replay system yet (planned for v2)
- Mobile touch controls not implemented
- No multiplayer features

## 🗺️ Roadmap

### v1.0 (Current)
- [x] Core gameplay loop
- [x] Combo system
- [x] Practice mode
- [x] Local leaderboards
- [x] Settings menu

### v2.0 (Planned)
- [ ] Replay recording & playback
- [ ] Server-side leaderboards
- [ ] Mobile touch controls
- [ ] Additional tower variants
- [ ] Character cosmetics
- [ ] Anti-cheat measures

## 📝 License

MIT License - Feel free to fork and modify!

## 🎮 Credits

Inspired by the classic **Icy Tower** (Free Lunch Design, 2001)

---

**[🎮 Play Now!](https://ubriga.github.io/brigadiros/)** | **[Report Bug](https://github.com/ubriga/brigadiros/issues)** | **[Request Feature](https://github.com/ubriga/brigadiros/issues)**
