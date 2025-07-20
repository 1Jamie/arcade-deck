// Gamepad Manager for vanilla JavaScript
class GamepadManager {
    constructor() {
        this.gamepads = {};
        this.listeners = new Set();
        this.lastInputTime = {};
        this.inputDelay = 150; // ms
        this.keyboardMap = {
            'ArrowUp': 'up',
            'ArrowDown': 'down',
            'ArrowLeft': 'left',
            'ArrowRight': 'right',
            'Enter': 'a',
            'Escape': 'b',
            ' ': 'x', // Space
            'Tab': 'y',
            's': 'start',
            'q': 'select',
            'l': 'l1',
            'r': 'r1'
        };
        
        this.init();
    }

    init() {
        // Gamepad events
        window.addEventListener('gamepadconnected', (e) => this.onGamepadConnected(e));
        window.addEventListener('gamepaddisconnected', (e) => this.onGamepadDisconnected(e));
        
        // Keyboard fallback
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
        
        // Start polling for gamepad input
        this.pollGamepads();
        
        console.log('Controls: Arrow keys (navigation), Enter (A), Escape (B), Space (X), Tab (Y), S (Start), Q (Select)');
    }

    onGamepadConnected(event) {
        console.log('Gamepad connected:', event.gamepad);
        this.gamepads[event.gamepad.index] = event.gamepad;
    }

    onGamepadDisconnected(event) {
        console.log('Gamepad disconnected:', event.gamepad);
        delete this.gamepads[event.gamepad.index];
    }

    onKeyDown(event) {
        // Ignore if typing in an input
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
            return;
        }
        
        const button = this.keyboardMap[event.key.toLowerCase()];
        if (button) {
            event.preventDefault();
            this.emit(button);
        }
    }

    pollGamepads() {
        // Get fresh gamepad data
        const gamepads = navigator.getGamepads();
        
        for (const gamepad of gamepads) {
            if (!gamepad) continue;

            // Check buttons
            gamepad.buttons.forEach((button, index) => {
                if (button.pressed) {
                    this.handleGamepadButton(index);
                }
            });

            // Check axes
            const [leftX, leftY, rightX, rightY] = gamepad.axes;
            const threshold = 0.5;

            if (Math.abs(leftX) > threshold) {
                this.emit(leftX > 0 ? 'right' : 'left');
            }
            if (Math.abs(leftY) > threshold) {
                this.emit(leftY > 0 ? 'down' : 'up');
            }
        }

        // Continue polling
        requestAnimationFrame(() => this.pollGamepads());
    }

    handleGamepadButton(index) {
        // Standard gamepad mapping
        const buttonMap = {
            0: 'a',      // A/Cross
            1: 'b',      // B/Circle
            2: 'x',      // X/Square
            3: 'y',      // Y/Triangle
            4: 'l1',     // Left Bumper
            5: 'r1',     // Right Bumper
            6: 'l2',     // Left Trigger
            7: 'r2',     // Right Trigger
            8: 'select', // Select/Back
            9: 'start',  // Start
            10: 'l3',    // Left Stick Click
            11: 'r3',    // Right Stick Click
            12: 'up',    // D-pad up
            13: 'down',  // D-pad down
            14: 'left',  // D-pad left
            15: 'right'  // D-pad right
        };

        const button = buttonMap[index];
        if (button) {
            this.emit(button);
        }
    }

    on(callback) {
        this.listeners.add(callback);
    }

    off(callback) {
        this.listeners.delete(callback);
    }

    emit(button) {
        // Debounce input to prevent rapid firing
        const now = Date.now();
        if (this.lastInputTime[button] && now - this.lastInputTime[button] < this.inputDelay) {
            return;
        }
        this.lastInputTime[button] = now;

        for (const listener of this.listeners) {
            if (typeof listener === 'function') {
                try {
                    listener(button);
                } catch (error) {
                    console.error('Error in gamepad listener:', error);
                }
            }
        }
    }
}

// Create and export the singleton instance
export const gamepadManager = new GamepadManager();
export default gamepadManager; 