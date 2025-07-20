// Game List Component
export class GameList {
    constructor() {
        this.games = [];
        this.selectedIndex = 0;
        this.container = document.getElementById('games-container');
        this.emptyState = document.getElementById('empty-state');
        this.gameCount = document.getElementById('game-count');
        
        this.init();
    }

    init() {
        // Event listeners will be set up by the main app
    }

    setGames(games) {
        this.games = games;
        this.selectedIndex = Math.min(this.selectedIndex, Math.max(0, games.length - 1));
        this.render();
    }

    render() {
        // Update game count
        this.gameCount.textContent = `${this.games.length} Games`;

        if (this.games.length === 0) {
            this.emptyState.classList.remove('hidden');
            this.container.classList.add('hidden');
            return;
        }

        this.emptyState.classList.add('hidden');
        this.container.classList.remove('hidden');

        // Clear container
        this.container.innerHTML = '';

        // Render games
        this.games.forEach((game, index) => {
            const gameCard = this.createGameCard(game, index);
            this.container.appendChild(gameCard);
        });

        // Scroll to selected game
        this.scrollToSelected();
    }

    createGameCard(game, index) {
        const card = document.createElement('div');
        card.className = `game-card ${index === this.selectedIndex ? 'selected' : ''}`;
        card.dataset.gameId = game.id;
        card.dataset.index = index;

        // Game art
        const art = document.createElement('div');
        art.className = 'game-art';
        
        if (game.boxArt) {
            art.innerHTML = `<img src="${game.boxArt}" alt="${game.title}">`;
        } else {
            art.innerHTML = `<div class="placeholder-art"><span class="game-icon">🎮</span></div>`;
        }

        // Game info
        const info = document.createElement('div');
        info.className = 'game-info';

        const title = document.createElement('h3');
        title.className = 'game-title';
        title.textContent = game.title;

        const details = document.createElement('div');
        details.className = 'game-details';
        details.innerHTML = `
            <span class="genre">${this.formatGenre(game.genre)}</span>
            ${game.releaseDate ? `<span class="release-date">• ${game.releaseDate}</span>` : ''}
        `;

        const description = document.createElement('div');
        description.className = 'game-description';
        description.textContent = game.description || 'No description available';

        const stats = document.createElement('div');
        stats.className = 'game-stats';
        stats.innerHTML = `
            <span class="play-count">${this.formatPlayCount(game.playCount)}</span>
            ${game.isFavorite ? '<span class="favorite">⭐ Favorite</span>' : ''}
        `;

        info.appendChild(title);
        info.appendChild(details);
        info.appendChild(description);
        info.appendChild(stats);

        // Core info if RetroArch game
        if (game.retroarchCore) {
            const coreInfo = document.createElement('div');
            coreInfo.className = 'core-info';
            coreInfo.innerHTML = `
                <span class="core-label">Core:</span>
                <span class="core-name">${game.retroarchCore.replace('_libretro.so', '')}</span>
            `;
            info.appendChild(coreInfo);
        }

        // Actions for selected game
        if (index === this.selectedIndex) {
            const actions = document.createElement('div');
            actions.className = 'game-actions';
            actions.innerHTML = `
                <button class="action-btn launch" data-action="launch">▶ Launch</button>
                <button class="action-btn delete" data-action="delete">🗑 Delete</button>
            `;
            card.appendChild(actions);

            // Add event listeners to action buttons
            actions.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = e.target.dataset.action;
                if (action === 'launch') {
                    this.launchGame(game.id);
                } else if (action === 'delete') {
                    this.deleteGame(game.id);
                }
            });
        }

        card.appendChild(art);
        card.appendChild(info);

        // Add click event
        card.addEventListener('click', () => {
            this.launchGame(game.id);
        });

        return card;
    }

    scrollToSelected() {
        if (this.games.length === 0) return;

        const selectedCard = this.container.querySelector('.game-card.selected');
        if (selectedCard) {
            selectedCard.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        }
    }

    navigate(direction) {
        if (this.games.length === 0) return false;

        const oldIndex = this.selectedIndex;

        switch (direction) {
            case 'up':
                if (this.selectedIndex > 0) {
                    this.selectedIndex--;
                }
                break;
            case 'down':
                if (this.selectedIndex < this.games.length - 1) {
                    this.selectedIndex++;
                }
                break;
            default:
                return false;
        }

        if (oldIndex !== this.selectedIndex) {
            this.render();
            return true;
        }

        return false;
    }

    getCurrentGame() {
        if (this.games.length === 0 || this.selectedIndex < 0 || this.selectedIndex >= this.games.length) {
            return null;
        }
        return this.games[this.selectedIndex];
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

// Export the class
export default GameList; 