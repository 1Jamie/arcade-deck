import { GameList } from './components/gameList.js';
import { GameCarouselView } from './components/gameCarouselView.js';
import { GameForm } from './components/gameForm.js';
import { Settings } from './components/settings.js';
import { GameDetails } from './components/gameDetails.js';
import { gamepadManager } from './utils/gamepad.js';

// Main Application
class ArcadeDeckApp {
    constructor() {
        this.currentView = 'loading';
        this.games = [];
        this.viewMode = 'carousel'; // or 'list'
        
        // Component instances
        this.gameList = null;
        this.gameCarousel = null;
        this.gameForm = null;
        this.settings = null;
        this.gameDetails = null;
        
        // View elements
        this.views = {
            'loading': document.getElementById('loading-screen'),
            'game-list': document.getElementById('game-list-view'),
            'add-game': document.getElementById('add-game-view'),
            'settings': document.getElementById('settings-view'),
            'game-details': document.getElementById('game-details-view')
        };
        
        this.init();
    }

    async init() {
        console.log('Initializing Arcade Deck...');
        
        // Initialize gamepad
        gamepadManager.on((button) => this.handleInput(button));
        
        // Initialize components
        this.gameList = new GameList();
        this.gameCarousel = new GameCarouselView();
        this.gameForm = new GameForm();
        this.settings = new Settings();
        this.gameDetails = new GameDetails();
        
        // Load games
        await this.loadGames();
        
        // Show main view
        this.showView('game-list');
        
        console.log('Arcade Deck initialized');
    }

    async loadGames() {
        try {
            const { ipcRenderer } = require('electron');
            this.games = await ipcRenderer.invoke('get-games');
            
            this.updateGameView();
        } catch (error) {
            console.error('Failed to load games:', error);
            this.games = [];
            this.updateGameView();
        }
    }

    updateGameView() {
        console.log('App: updateGameView called, viewMode:', this.viewMode, 'games:', this.games.length);
        
        // Clear the container first
        const container = document.getElementById('games-container');
        if (!container) {
            console.error('App: games-container not found!');
            return;
        }
        
        container.innerHTML = '';
        container.style.display = 'block';

        if (this.viewMode === 'carousel') {
            console.log('App: Setting up carousel view');
            // Hide list elements and show carousel
            const emptyState = document.getElementById('empty-state');
            if (emptyState) emptyState.style.display = 'none';
            
            // Make sure Three.js is loaded before creating carousel
            if (typeof THREE === 'undefined') {
                console.error('App: Three.js not loaded yet, retrying...');
                setTimeout(() => this.updateGameView(), 100);
                return;
            }
            
            this.gameCarousel.setupCarousel();
            this.gameCarousel.setGames(this.games);
        } else {
            console.log('App: Setting up list view');
            // Show list view
            this.gameList.setGames(this.games);
        }
    }

    showView(viewName) {
        if (!this.views[viewName]) {
            console.error('Unknown view:', viewName);
            return;
        }

        // Hide all views
        Object.values(this.views).forEach(view => {
            view.classList.add('hidden');
        });

        // Show the requested view
        this.views[viewName].classList.remove('hidden');
        this.currentView = viewName;

        // Call component show methods if they exist
        switch (viewName) {
            case 'game-list':
                // Clear form when returning to game list
                if (this.gameForm) {
                    this.gameForm.clearForm();
                }
                break;
            case 'add-game':
                this.gameForm.show();
                break;
            case 'settings':
                this.settings.show();
                break;
            case 'game-details':
                // Game details will be shown by calling gameDetails.show(game) externally
                break;
        }

        // Setup close button for game details view
        if (viewName === 'game-details') {
            const closeBtn = document.getElementById('game-details-close-btn');
            if (closeBtn) {
                closeBtn.onclick = () => this.showView('game-list');
            }
        }
    }

    handleInput(button) {
        switch (this.currentView) {
            case 'game-list':
                this.handleGameListInput(button);
                break;
            case 'add-game':
                this.handleFormInput(button);
                break;
            case 'settings':
                this.handleSettingsInput(button);
                break;
            case 'game-details':
                if (this.gameDetails.handleInput(button)) {
                    // Input was handled by game details
                    return;
                }
                break;
        }
    }

    handleGameListInput(button) {
        const gameComponent = this.viewMode === 'carousel' ? this.gameCarousel : this.gameList;

        switch (button) {
            case 'up':
            case 'down':
            case 'left':
            case 'right':
                if (gameComponent && gameComponent.navigate) {
                    gameComponent.navigate(button);
                }
                break;
            case 'a':
                // Launch current game
                if (gameComponent && gameComponent.getCurrentGame) {
                    const currentGame = gameComponent.getCurrentGame();
                    if (currentGame && gameComponent.launchGame) {
                        gameComponent.launchGame(currentGame.id);
                    }
                }
                break;
            case 'b':
                // Back/Exit (could minimize or show exit dialog)
                this.showExitDialog();
                break;
            case 'x':
                // Add game
                this.showView('add-game');
                break;
            case 'y':
                // Toggle view mode
                console.log('App: Toggling view mode from', this.viewMode);
                this.viewMode = this.viewMode === 'carousel' ? 'list' : 'carousel';
                console.log('App: New view mode:', this.viewMode);
                this.updateGameView();
                break;
            case 'l1':
            case 'r1':
                // Quick scroll (faster navigation)
                if (this.viewMode === 'carousel' && gameComponent && gameComponent.quickScroll) {
                    gameComponent.quickScroll(button === 'l1' ? -1 : 1);
                } else if (gameComponent && gameComponent.navigate) {
                    // Fallback to regular navigation
                    gameComponent.navigate(button === 'l1' ? 'left' : 'right');
                }
                break;
            case 'l2':
                // Previous page/fast rewind
                if (gameComponent && gameComponent.previousPage) {
                    gameComponent.previousPage();
                }
                break;
            case 'r2':
                // Next page/fast forward
                if (gameComponent && gameComponent.nextPage) {
                    gameComponent.nextPage();
                }
                break;
            case 'select':
                // Show game details/options
                if (gameComponent && gameComponent.getCurrentGame) {
                    const currentGame = gameComponent.getCurrentGame();
                    if (currentGame) {
                        this.gameDetails.show(currentGame);
                    }
                }
                break;
            case 'start':
                // Settings
                this.showView('settings');
                break;
        }
    }

    showExitDialog() {
        if (confirm('Exit Arcade Deck?')) {
            const { ipcRenderer } = require('electron');
            ipcRenderer.invoke('app-quit');
        }
    }

    handleFormInput(button) {
        switch (button) {
            case 'a':
                // Submit form or activate focused element
                const activeElement = document.activeElement;
                if (activeElement && activeElement.tagName === 'BUTTON') {
                    activeElement.click();
                } else if (activeElement && activeElement.tagName === 'INPUT' && activeElement.type === 'submit') {
                    activeElement.click();
                }
                break;
            case 'b':
                // Back to game list
                this.showView('game-list');
                break;
            case 'up':
                this.navigateForm(-1);
                break;
            case 'down':
                this.navigateForm(1);
                break;
            case 'x':
                // Clear form
                if (this.gameForm && this.gameForm.clearForm) {
                    this.gameForm.clearForm();
                }
                break;
        }
    }

    navigateForm(direction) {
        const formElements = Array.from(document.querySelectorAll('input, select, textarea, button')).filter(
            el => !el.disabled && el.offsetParent !== null
        );
        
        const currentIndex = formElements.indexOf(document.activeElement);
        let nextIndex = currentIndex + direction;
        
        if (nextIndex < 0) nextIndex = formElements.length - 1;
        if (nextIndex >= formElements.length) nextIndex = 0;
        
        if (formElements[nextIndex]) {
            formElements[nextIndex].focus();
        }
    }

    handleSettingsInput(button) {
        switch (button) {
            case 'a':
                // Activate focused element
                const activeElement = document.activeElement;
                if (activeElement && (activeElement.tagName === 'BUTTON' || activeElement.tagName === 'INPUT')) {
                    activeElement.click();
                }
                break;
            case 'b':
                // Back to game list
                this.showView('game-list');
                break;
            case 'up':
                this.navigateForm(-1);
                break;
            case 'down':
                this.navigateForm(1);
                break;
            case 'x':
                // Save settings
                if (this.settings && this.settings.saveSettings) {
                    this.settings.saveSettings();
                }
                break;
            case 'y':
                // Scan cores
                if (this.settings && this.settings.scanCores) {
                    this.settings.scanCores();
                }
                break;
        }
    }

    // Utility methods for components to call
    async reloadGames() {
        await this.loadGames();
    }
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new ArcadeDeckApp();
}); 