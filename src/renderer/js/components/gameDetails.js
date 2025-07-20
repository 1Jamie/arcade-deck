export class GameDetails {
    constructor() {
        this.currentGame = null;
        this.isEditing = false;
        this.focusedButtonIndex = 0;
        this.buttons = [];
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Button clicks
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('action-button')) {
                this.handleButtonClick(e.target.dataset.action);
            }
        });
    }

    handleInput(button) {
        if (!this.isVisible()) return false;

        switch (button) {
            case 'left':
                this.navigateButtons(-1);
                return true;
            case 'right':
                this.navigateButtons(1);
                return true;
            case 'a':
                this.activateButton();
                return true;
            case 'b':
                this.goBack();
                return true;
            case 'x':
                if (!this.isEditing) {
                    this.toggleEdit();
                }
                return true;
            case 'y':
                if (!this.isEditing) {
                    this.deleteGame();
                }
                return true;
            default:
                return false;
        }
    }

    isVisible() {
        const view = document.getElementById('game-details-view');
        return view && !view.classList.contains('hidden');
    }

    navigateButtons(direction) {
        this.buttons = Array.from(document.querySelectorAll('.action-button'));
        if (this.buttons.length === 0) return;

        // Remove current focus
        this.buttons.forEach(btn => btn.classList.remove('focused'));

        // Update focus index
        this.focusedButtonIndex += direction;
        if (this.focusedButtonIndex < 0) {
            this.focusedButtonIndex = this.buttons.length - 1;
        } else if (this.focusedButtonIndex >= this.buttons.length) {
            this.focusedButtonIndex = 0;
        }

        // Add focus to new button
        if (this.buttons[this.focusedButtonIndex]) {
            this.buttons[this.focusedButtonIndex].classList.add('focused');
        }
    }

    activateButton() {
        if (this.buttons[this.focusedButtonIndex]) {
            const action = this.buttons[this.focusedButtonIndex].dataset.action;
            this.handleButtonClick(action);
        }
    }

    handleButtonClick(action) {
        console.log('handleButtonClick called with action:', action);
        switch (action) {
            case 'edit':
                console.log('Edit action triggered');
                this.toggleEdit();
                break;
            case 'delete':
                this.deleteGame();
                break;
            case 'save':
                this.saveGame();
                break;
            case 'cancel':
                this.cancelEdit();
                break;
            case 'back':
                this.goBack();
                break;
        }
    }

    goBack() {
        window.app.showView('game-list');
    }

    updateButtonFocus() {
        this.buttons = Array.from(document.querySelectorAll('.action-button'));
        this.buttons.forEach((btn, index) => {
            btn.classList.toggle('focused', index === this.focusedButtonIndex);
        });
    }

    async show(game) {
        this.currentGame = { ...game }; // Create a copy
        this.isEditing = false;
        
        // Show the details view
        window.app.showView('game-details');
        
        this.renderGameDetails();
    }

    renderGameDetails() {
        const container = document.getElementById('game-details-content');
        if (!container) return;

        this.renderViewMode();
    }

    renderViewMode() {
        const container = document.getElementById('game-details-content');
        container.innerHTML = `
            <div class="game-details-header">
                <h2>${this.currentGame.title}</h2>
            </div>
            
            <div class="game-details-body">
                <div class="detail-section">
                    <h3>Game Information</h3>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <label>Title</label>
                            <span>${this.currentGame.title}</span>
                        </div>
                        <div class="detail-item">
                            <label>Genre</label>
                            <span>${this.currentGame.genre || 'Not specified'}</span>
                        </div>
                        <div class="detail-item">
                            <label>Release Date</label>
                            <span>${this.currentGame.releaseDate || 'Not specified'}</span>
                        </div>
                        <div class="detail-item">
                            <label>Player Count</label>
                            <span>${this.currentGame.playerCount || 'Not specified'}</span>
                        </div>
                    </div>
                </div>

                <div class="detail-section">
                    <h3>Technical Details</h3>
                    <div class="detail-grid">
                        <div class="detail-item full-width">
                            <label>Executable Path</label>
                            <span class="path-text">${this.currentGame.executable}</span>
                        </div>
                        <div class="detail-item">
                            <label>Arguments</label>
                            <span>${this.currentGame.args && this.currentGame.args.length > 0 ? this.currentGame.args.join(' ') : 'None'}</span>
                        </div>
                        <div class="detail-item">
                            <label>RetroArch Core</label>
                            <span>${this.currentGame.retroarchCore ? this.currentGame.retroarchCore.replace('_libretro.so', '') : 'None (native game)'}</span>
                        </div>
                    </div>
                </div>

                ${this.currentGame.description || this.currentGame.boxArt || this.currentGame.backgroundImage ? `
                <div class="detail-section">
                    <h3>Media & Description</h3>
                    <div class="detail-grid">
                        ${this.currentGame.description ? `
                        <div class="detail-item full-width">
                            <label>Description</label>
                            <span>${this.currentGame.description}</span>
                        </div>
                        ` : ''}
                        ${this.currentGame.boxArt ? `
                        <div class="detail-item">
                            <label>Box Art</label>
                            <span>${this.currentGame.boxArt}</span>
                        </div>
                        ` : ''}
                        ${this.currentGame.backgroundImage ? `
                        <div class="detail-item">
                            <label>Background Image</label>
                            <span>${this.currentGame.backgroundImage}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
                ` : ''}
            </div>

            <div class="details-actions">
                <div class="details-actions-left">
                    <button class="action-button back focused" data-action="back">← Back</button>
                </div>
                <div class="details-actions-center">
                    <button class="action-button" data-action="edit">✏️ Edit</button>
                    <button class="action-button delete" data-action="delete">🗑️ Delete</button>
                </div>
            </div>
        `;

        this.focusedButtonIndex = 0;
        this.updateButtonFocus();
    }

    toggleEdit() {
        console.log('toggleEdit called with game:', this.currentGame);
        // Store current game for edit
        if (this.currentGame) {
            console.log('Switching to add-game view for editing');
            
            // Set editing mode first
            if (window.app.gameForm) {
                window.app.gameForm.editingGame = this.currentGame;
            }
            
            // Switch to add-game view
            window.app.showView('add-game');
            
            // Pre-populate the form with current game data
            setTimeout(() => {
                console.log('Populating form for edit');
                if (window.app.gameForm && window.app.gameForm.populateForEdit) {
                    window.app.gameForm.populateForEdit(this.currentGame);
                } else {
                    console.error('gameForm or populateForEdit not available');
                }
            }, 200);
        } else {
            console.error('No current game to edit');
        }
    }



    cancelEdit() {
        this.isEditing = false;
        this.renderGameDetails();
    }

    async loadRetroArchCores() {
        try {
            const { ipcRenderer } = require('electron');
            const cores = await ipcRenderer.invoke('scan-retroarch-cores');
            
            const select = document.getElementById('edit-retroarch-core');
            if (select) {
                // Clear existing options except first
                select.innerHTML = '<option value="">No RetroArch core (native game)</option>';
                
                cores.forEach(core => {
                    const option = document.createElement('option');
                    option.value = core.filename;
                    option.textContent = core.displayName;
                    option.selected = core.filename === this.currentGame.retroarchCore;
                    select.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Failed to load RetroArch cores:', error);
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
                document.getElementById('edit-executable').value = result.filePaths[0];
            }
        } catch (error) {
            console.error('Failed to browse for executable:', error);
        }
    }

    async saveGame() {
        try {
            const formData = {
                id: this.currentGame.id,
                title: document.getElementById('edit-title').value.trim(),
                genre: document.getElementById('edit-genre').value.trim(),
                releaseDate: document.getElementById('edit-release-date').value.trim(),
                playerCount: document.getElementById('edit-player-count').value.trim(),
                executable: document.getElementById('edit-executable').value.trim(),
                args: document.getElementById('edit-args').value.trim(),
                retroarchCore: document.getElementById('edit-retroarch-core').value,
                boxArt: document.getElementById('edit-box-art').value.trim(),
                backgroundImage: document.getElementById('edit-background-image').value.trim(),
                description: document.getElementById('edit-description').value.trim()
            };

            // Validation
            if (!formData.title) {
                alert('Game title is required!');
                return;
            }

            if (!formData.executable) {
                alert('Executable path is required!');
                return;
            }

            // Convert args string to array
            if (formData.args) {
                formData.args = formData.args.split(' ').filter(arg => arg.length > 0);
            } else {
                formData.args = [];
            }

            const { ipcRenderer } = require('electron');
            await ipcRenderer.invoke('update-game', formData);
            
            alert('Game updated successfully!');
            
            // Return to game list and reload
            window.app.showView('game-list');
            window.app.reloadGames();
            
        } catch (error) {
            console.error('Failed to save game:', error);
            alert('Failed to save game: ' + error.message);
        }
    }

    async deleteGame() {
        if (!confirm(`Are you sure you want to delete "${this.currentGame.title}"? This action cannot be undone.`)) {
            return;
        }

        try {
            const { ipcRenderer } = require('electron');
            await ipcRenderer.invoke('delete-game', this.currentGame.id);
            
            alert('Game deleted successfully!');
            
            // Return to game list and reload
            window.app.showView('game-list');
            window.app.reloadGames();
            
        } catch (error) {
            console.error('Failed to delete game:', error);
            alert('Failed to delete game: ' + error.message);
        }
    }
}

export default GameDetails; 