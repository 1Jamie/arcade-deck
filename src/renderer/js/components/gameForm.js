export class GameForm {
    constructor() {
        this.form = document.getElementById('game-form');
        this.submitBtn = document.getElementById('submit-btn');
        this.editingGame = null;
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitGame();
        });

        // Browse button for executable path
        const browseBtn = document.getElementById('browse-btn');
        if (browseBtn) {
            browseBtn.addEventListener('click', () => {
                this.browseExecutable();
            });
        }

        // Clear button
        const clearBtn = document.getElementById('clear-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearForm();
            });
        }

        // Cancel button
        const cancelBtn = document.getElementById('cancel-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                window.app.showView('game-list');
            });
        }
    }

    async browseExecutable() {
        try {
            const { ipcRenderer } = require('electron');
            const result = await ipcRenderer.invoke('show-dialog', {
                properties: ['openFile'],
                filters: [
                    { name: 'Executable Files', extensions: ['exe', 'sh', 'bin', 'AppImage'] },
                    { name: 'ROM Files', extensions: ['nes', 'snes', 'sfc', 'gb', 'gbc', 'gba', 'md', 'gen', 'smd', 'n64', 'z64', 'v64', 'iso', 'cue', 'bin'] },
                    { name: 'All Files', extensions: ['*'] }
                ]
            });
            
            if (!result.canceled && result.filePaths.length > 0) {
                document.getElementById('executable').value = result.filePaths[0];
            }
        } catch (error) {
            console.error('Failed to browse for executable:', error);
            alert('Failed to open file browser: ' + error.message);
        }
    }

    show() {
        console.log('show() called, editingGame:', this.editingGame);
        // Only clear if we're not editing
        if (!this.editingGame) {
            console.log('Not editing, clearing form');
            this.clearForm();
            
            // Focus on the first input
            const firstInput = this.form.querySelector('input[type="text"]');
            if (firstInput) {
                firstInput.focus();
            }
        } else {
            console.log('Show called while editing, not clearing form');
        }
    }

    clearForm() {
        console.log('clearForm called, editingGame:', this.editingGame);
        this.form.reset();
        this.editingGame = null;
        
        // Reset form title and button text
        const formTitle = document.querySelector('#add-game-view h2');
        if (formTitle) {
            formTitle.textContent = 'Add New Game';
        }

        const submitBtn = document.getElementById('submit-btn');
        if (submitBtn) {
            submitBtn.textContent = '🎮 Add Game';
        }
    }

    async submitGame() {
        try {
            const formData = new FormData(this.form);
            const gameData = {
                title: formData.get('title')?.trim(),
                executable: formData.get('executable')?.trim(),
                args: formData.get('args')?.trim(),
                genre: formData.get('genre')?.trim(),
                description: formData.get('description')?.trim(),
                releaseDate: formData.get('releaseDate')?.trim(),
                playerCount: formData.get('playerCount')?.trim(),
                boxArt: formData.get('boxArt')?.trim(),
                backgroundImage: formData.get('backgroundImage')?.trim(),
                retroarchCore: formData.get('retroarchCore') || null
            };

            // Validation
            if (!gameData.title) {
                alert('Game title is required!');
                return;
            }

            if (!gameData.executable) {
                alert('Executable path is required!');
                return;
            }

            // Convert args string to array if present
            if (gameData.args) {
                gameData.args = gameData.args.split(' ').filter(arg => arg.length > 0);
            } else {
                gameData.args = [];
            }

            const { ipcRenderer } = require('electron');
            
            if (this.editingGame) {
                // Update existing game
                await ipcRenderer.invoke('update-game', this.editingGame.id, gameData);
            } else {
                // Add new game
                await ipcRenderer.invoke('add-game', gameData);
            }
            
            // Show success message
            if (this.editingGame) {
                alert('Game updated successfully!');
            } else {
                alert('Game added successfully!');
            }
            
            // Return to game list and reload
            window.app.showView('game-list');
            window.app.reloadGames();
        } catch (error) {
            console.error('Failed to add game:', error);
            alert('Failed to add game: ' + error.message);
        }
    }



    populateForEdit(game) {
        this.editingGame = game;
        
        // Populate form fields
        document.getElementById('title').value = game.title || '';
        document.getElementById('executable').value = game.executable || '';
        document.getElementById('args').value = game.args ? game.args.join(' ') : '';
        document.getElementById('genre').value = game.genre || '';
        document.getElementById('releaseDate').value = game.releaseDate || '';
        document.getElementById('playerCount').value = game.playerCount || '';
        document.getElementById('description').value = game.description || '';
        document.getElementById('boxArt').value = game.boxArt || '';
        document.getElementById('backgroundImage').value = game.backgroundImage || '';
        
        // Set RetroArch core if available
        const coreSelect = document.getElementById('retroarch-core');
        if (coreSelect && game.retroarchCore) {
            coreSelect.value = game.retroarchCore;
        }

        // Update form title and button text with multiple attempts
        setTimeout(() => {
            const formTitle = document.querySelector('#add-game-view h2');
            if (formTitle) {
                console.log('Updating form title to:', `Edit Game: ${game.title}`);
                formTitle.textContent = `Edit Game: ${game.title}`;
            } else {
                console.error('Form title element not found');
                // Try alternative selector
                const altTitle = document.querySelector('.form-header h2');
                if (altTitle) {
                    console.log('Using alternative selector for title');
                    altTitle.textContent = `Edit Game: ${game.title}`;
                }
            }

            const submitBtn = document.getElementById('submit-btn');
            if (submitBtn) {
                console.log('Updating submit button to: Update Game');
                submitBtn.textContent = '💾 Update Game';
            } else {
                console.error('Submit button element not found');
            }
        }, 50);
    }
}

export default GameForm; 