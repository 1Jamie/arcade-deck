import { GameCarousel } from './gameCarousel.js';

export class GameCarouselView {
    constructor() {
        this.container = document.getElementById('games-container');
        this.emptyState = document.getElementById('empty-state');
        this.gameCount = document.getElementById('game-count');
        this.carousel = null;
        this.infoOverlay = null;
    }

    setupCarousel() {
        console.log('GameCarouselView: Setting up carousel...');
        
        // Clean up any existing carousel
        this.cleanup();
        
        // Clear container completely
        this.container.innerHTML = '';
        this.container.className = 'games-container'; // Reset classes
        
        // Set up container styles for full-screen carousel
        this.container.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: #1a1a1a;
            z-index: 1;
        `;
        
        // Create carousel container directly
        const carouselContainer = document.createElement('div');
        carouselContainer.id = 'game-carousel-container';
        carouselContainer.style.cssText = `
            width: 100%;
            height: calc(100vh - 200px);
            position: relative;
        `;
        
        this.container.appendChild(carouselContainer);

        // Initialize the 3D carousel immediately
        try {
            console.log('GameCarouselView: Creating GameCarousel...');
            this.carousel = new GameCarousel('game-carousel-container');
            console.log('GameCarouselView: GameCarousel created successfully');
        } catch (error) {
            console.error('GameCarouselView: Error creating GameCarousel:', error);
        }
        
        // Set up UI panel
        this.setupUIPanel();
    }

    cleanup() {
        console.log('GameCarouselView: Cleaning up...');
        
        // Clean up Three.js carousel
        if (this.carousel && this.carousel.dispose) {
            this.carousel.dispose();
        }
        
        // Remove UI panel
        if (this.uiPanel && this.uiPanel.parentNode) {
            this.uiPanel.parentNode.removeChild(this.uiPanel);
            this.uiPanel = null;
        }
        
        // Reset carousel reference
        this.carousel = null;
        this.infoLeft = null;
        this.infoRight = null;
    }

    setupUIPanel() {
        console.log('GameCarouselView: Setting up UI panel...');

        // Create the bottom UI panel
        this.uiPanel = document.createElement('div');
        this.uiPanel.className = 'game-ui-panel';
        
        // Game info section
        const infoSection = document.createElement('div');
        infoSection.className = 'game-info-section';
        
        const detailsLeft = document.createElement('div');
        detailsLeft.className = 'game-details-left';
        
        const detailsRight = document.createElement('div');
        detailsRight.className = 'game-details-right';
        
        infoSection.appendChild(detailsLeft);
        infoSection.appendChild(detailsRight);
        
        // Control hints
        const controlHints = document.createElement('div');
        controlHints.className = 'control-hints';
        controlHints.innerHTML = `
            <div class="control-hint">
                <span class="control-key">←→</span>
                <span class="control-label">Navigate</span>
            </div>
            <div class="control-hint">
                <span class="control-key">A</span>
                <span class="control-label">Launch</span>
            </div>
            <div class="control-hint">
                <span class="control-key">Select</span>
                <span class="control-label">Details</span>
            </div>
            <div class="control-hint">
                <span class="control-key">Y</span>
                <span class="control-label">View Mode</span>
            </div>
            <div class="control-hint">
                <span class="control-key">X</span>
                <span class="control-label">Add Game</span>
            </div>
            <div class="control-hint">
                <span class="control-key">L1/R1</span>
                <span class="control-label">Quick Scroll</span>
            </div>
            <div class="control-hint">
                <span class="control-key">Start</span>
                <span class="control-label">Settings</span>
            </div>
        `;
        
        this.uiPanel.appendChild(infoSection);
        this.uiPanel.appendChild(controlHints);
        document.body.appendChild(this.uiPanel);
        
        // Store references
        this.infoLeft = detailsLeft;
        this.infoRight = detailsRight;
    }

    async setGames(games) {
        console.log('GameCarouselView: setGames called with', games.length, 'games');
        
        if (games.length === 0) {
            this.showEmptyState();
            // Hide UI panel when no games
            if (this.uiPanel) {
                this.uiPanel.style.display = 'none';
            }
            return;
        }

        // Show UI panel when games exist
        if (this.uiPanel) {
            this.uiPanel.style.display = 'flex';
        }

        if (this.gameCount) {
            this.gameCount.textContent = `${games.length} Games`;
        }

        // Wait for carousel to be ready
        if (this.carousel) {
            console.log('GameCarouselView: Setting games on carousel with cached textures');
            await this.carousel.setGames(games);
            this.updateGameInfo(this.carousel.getCurrentGame());
            console.log('GameCarouselView: Carousel games set with cached textures');
        } else {
            console.log('GameCarouselView: Carousel not ready, waiting...');
            // Retry after carousel is created
            setTimeout(async () => {
                if (this.carousel) {
                    console.log('GameCarouselView: Carousel ready, setting games with cached textures');
                    await this.carousel.setGames(games);
                    this.updateGameInfo(this.carousel.getCurrentGame());
                    console.log('GameCarouselView: Carousel games set with cached textures');
                } else {
                    console.error('GameCarouselView: Carousel still not ready after timeout');
                }
            }, 200);
        }
    }

    showEmptyState() {
        this.container.innerHTML = `
            <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100vh; text-align: center; color: white;">
                <h2 style="margin-bottom: 1rem; opacity: 0.8;">No Games Found</h2>
                <p style="margin-bottom: 2rem; opacity: 0.6;">Add your first game using the Add Game button.</p>
                <div class="control-hint">
                    <span class="control-key">X</span>
                    <span class="control-label">Add Game</span>
                </div>
            </div>
        `;
        
        if (this.gameCount) {
            this.gameCount.textContent = '0 Games';
        }
    }

    updateGameInfo(game) {
        if (!game || !this.infoLeft || !this.infoRight) return;

        // Left side - main game info
        this.infoLeft.innerHTML = `
            <h2 class="game-title">${game.title}</h2>
            <div class="game-metadata">
                <span>${this.formatGenre(game.genre)}</span>
                ${game.releaseDate ? `<span>${game.releaseDate}</span>` : ''}
                <span>${this.formatPlayCount(game.playCount)}</span>
            </div>
            <p class="game-description">${game.description || 'No description available.'}</p>
        `;

        // Right side - technical details
        this.infoRight.innerHTML = `
            ${game.retroarchCore ? `<div class="core-badge">Core: ${game.retroarchCore.replace('_libretro.so', '')}</div>` : ''}
            ${game.isFavorite ? '<div style="color: #ffd700;">⭐ Favorite</div>' : ''}
            <div style="margin-top: auto; font-size: 0.8rem; opacity: 0.6;">
                ${game.executable ? `Path: ${game.executable.split('/').pop()}` : ''}
            </div>
        `;
    }

    navigate(direction) {
        switch (direction) {
            case 'left':
                this.carousel.previous();
                break;
            case 'right':
                this.carousel.next();
                break;
            case 'up':
            case 'down':
                return false;
        }

        this.updateGameInfo(this.carousel.getCurrentGame());
        return true;
    }

    getCurrentGame() {
        return this.carousel.getCurrentGame();
    }

    async launchGame(gameId) {
        try {
            const { ipcRenderer } = require('electron');
            const result = await ipcRenderer.invoke('launch-game', gameId);
            
            if (!result.success) {
                console.error('Failed to launch game:', result.error);
                // TODO: Show error message to user
            }
        } catch (error) {
            console.error('Error launching game:', error);
        }
    }

    async toggleFavorite(game) {
        try {
            const { ipcRenderer } = require('electron');
            game.isFavorite = !game.isFavorite;
            await ipcRenderer.invoke('update-game', game);
            this.updateGameInfo(game);
        } catch (error) {
            console.error('Failed to toggle favorite:', error);
        }
    }

    async deleteGame(gameId) {
        if (!confirm('Are you sure you want to delete this game?')) {
            return;
        }

        try {
            const { ipcRenderer } = require('electron');
            await ipcRenderer.invoke('delete-game', gameId);
            
            // Notify app to reload games
            window.app.loadGames();
        } catch (error) {
            console.error('Failed to delete game:', error);
        }
    }

    formatGenre(genre) {
        return genre || 'Unknown';
    }

    formatPlayCount(count) {
        return count > 0 ? `Played ${count} times` : 'Never played';
    }
}

// Make it globally available
window.GameCarouselView = GameCarouselView; 