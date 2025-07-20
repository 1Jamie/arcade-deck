const path = require('path');
const fs = require('fs/promises');
const os = require('os');

class Database {
    constructor() {
        this.dbPath = path.join(os.homedir(), '.arcade-deck', 'db.json');
        this.db = null;
    }

    async init() {
        try {
            // Ensure the directory exists
            const dbDir = path.dirname(this.dbPath);
            await fs.mkdir(dbDir, { recursive: true });

            // Get default paths based on OS
            const isLinux = process.platform === 'linux';
            const homeDir = os.homedir();
            
            const defaultData = {
                games: [],
                settings: {
                    retroarchPath: isLinux ? '/usr/bin/retroarch' : '',
                    coresPath: isLinux ? path.join(homeDir, '.config/retroarch/cores') : '',
                    romsPath: isLinux ? path.join(homeDir, 'ROMs') : '',
                    theme: 'default',
                    soundEnabled: true,
                    performanceProfile: 'balanced'
                },
                themes: [],
                retroarchCores: []
            };

            // Use dynamic import for lowdb
            const { JSONPreset } = await import('lowdb/node');
            this.db = await JSONPreset(this.dbPath, defaultData);
            console.log(`Database initialized at: ${this.dbPath}`);
        } catch (error) {
            console.error('Failed to initialize database:', error);
            throw error;
        }
    }

    // Games CRUD operations
    async addGame(gameData) {
        const game = {
            id: this.generateId(),
            title: gameData.title,
            executable: gameData.executable,
            args: gameData.args || [],
            description: gameData.description || '',
            genre: gameData.genre || '',
            releaseDate: gameData.releaseDate || '',
            playerCount: gameData.playerCount || '',
            boxArt: gameData.boxArt || '',
            backgroundImage: gameData.backgroundImage || '',
            isFavorite: false,
            playCount: 0,
            lastPlayed: null,
            retroarchCore: gameData.retroarchCore || null,
            created: new Date().toISOString()
        };

        this.db.data.games.push(game);
        await this.db.write();
        return game;
    }

    async getGame(gameId) {
        return this.db.data.games.find(game => game.id === gameId);
    }

    async getAllGames() {
        return this.db.data.games;
    }

    async updateGame(gameId, updateData) {
        const gameIndex = this.db.data.games.findIndex(game => game.id === gameId);
        if (gameIndex === -1) return null;

        this.db.data.games[gameIndex] = {
            ...this.db.data.games[gameIndex],
            ...updateData,
            updated: new Date().toISOString()
        };

        await this.db.write();
        return this.db.data.games[gameIndex];
    }

    async deleteGame(gameId) {
        const gameIndex = this.db.data.games.findIndex(game => game.id === gameId);
        if (gameIndex === -1) return false;

        this.db.data.games.splice(gameIndex, 1);
        await this.db.write();
        return true;
    }

    // Settings operations
    async getSettings() {
        return this.db.data.settings;
    }

    async updateSettings(settingsData) {
        this.db.data.settings = {
            ...this.db.data.settings,
            ...settingsData
        };
        await this.db.write();
        return this.db.data.settings;
    }

    // RetroArch cores operations
    async getRetroArchCores() {
        return this.db.data.retroarchCores;
    }

    async setRetroArchCores(cores) {
        this.db.data.retroarchCores = cores;
        await this.db.write();
    }

    // Utility methods
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    async backup() {
        const backupPath = this.dbPath + '.backup.' + Date.now();
        await fs.copyFile(this.dbPath, backupPath);
        return backupPath;
    }

    async getGamesByGenre(genre) {
        return this.db.data.games.filter(game => game.genre === genre);
    }

    async getFavoriteGames() {
        return this.db.data.games.filter(game => game.isFavorite);
    }

    async getRecentlyPlayed(limit = 10) {
        return this.db.data.games
            .filter(game => game.lastPlayed)
            .sort((a, b) => new Date(b.lastPlayed) - new Date(a.lastPlayed))
            .slice(0, limit);
    }

    async updateGamePlayData(gameId) {
        const game = await this.getGame(gameId);
        if (game) {
            await this.updateGame(gameId, {
                playCount: (game.playCount || 0) + 1,
                lastPlayed: new Date().toISOString()
            });
        }
    }
}

module.exports = Database; 