import fs from 'fs/promises';
import path from 'path';
import chokidar from 'chokidar';

class GameManager {
    constructor(database) {
        this.db = database;
        this.fileWatcher = null;
        this.settings = null;
    }

    async init() {
        this.settings = await this.db.getSettings();
        console.log('GameManager initialized');
    }

    async getAllGames() {
        return await this.db.getAllGames();
    }

    async getGame(gameId) {
        return await this.db.getGame(gameId);
    }

    async addGame(gameData) {
        // Validate required fields
        if (!gameData.title || !gameData.executable) {
            throw new Error('Title and executable are required');
        }

        // Check if executable exists (for local files)
        if (!gameData.executable.startsWith('http') && !gameData.executable.includes('retroarch')) {
            try {
                await fs.access(gameData.executable);
            } catch (error) {
                throw new Error(`Executable not found: ${gameData.executable}`);
            }
        }

        return await this.db.addGame(gameData);
    }

    async updateGame(gameId, gameData) {
        return await this.db.updateGame(gameId, gameData);
    }

    async deleteGame(gameId) {
        return await this.db.deleteGame(gameId);
    }

    async launchGame(gameId) {
        const game = await this.db.getGame(gameId);
        if (!game) {
            throw new Error('Game not found');
        }

        // Update play statistics
        await this.db.updateGamePlayData(gameId);

        // Handle RetroArch games differently
        if (game.retroarchCore) {
            return this.launchRetroArchGame(game);
        }

        return {
            executable: game.executable,
            args: game.args || []
        };
    }

    launchRetroArchGame(game) {
        const retroarchPath = this.settings.retroarchPath;
        const args = [
            '-L', path.join(this.settings.coresPath, game.retroarchCore),
            game.executable,
            '--fullscreen'
        ];

        return {
            executable: retroarchPath,
            args: args
        };
    }

    async scanRetroArchCores() {
        try {
            const coresPath = this.settings.coresPath;
            const files = await fs.readdir(coresPath);
            
            const cores = files
                .filter(file => file.endsWith('_libretro.so'))
                .map(file => {
                    const coreName = file.replace('_libretro.so', '');
                    return {
                        name: coreName,
                        filename: file,
                        path: path.join(coresPath, file),
                        displayName: this.getCoreDisplayName(coreName)
                    };
                });

            await this.db.setRetroArchCores(cores);
            return cores;
        } catch (error) {
            console.error('Failed to scan RetroArch cores:', error);
            return [];
        }
    }

    getCoreDisplayName(coreName) {
        const coreDisplayNames = {
            'snes9x': 'Snes9x (Super Nintendo)',
            'nestopia': 'Nestopia (Nintendo Entertainment System)',
            'genesis_plus_gx': 'Genesis Plus GX (Genesis/Mega Drive)',
            'mupen64plus_next': 'Mupen64Plus Next (Nintendo 64)',
            'pcsx_rearmed': 'PCSX ReARMed (PlayStation)',
            'ppsspp': 'PPSSPP (PlayStation Portable)',
            'mgba': 'mGBA (Game Boy Advance)',
            'gambatte': 'Gambatte (Game Boy/Game Boy Color)',
            'picodrive': 'PicoDrive (Genesis/32X/CD)',
            'fbneo': 'FinalBurn Neo (Arcade)',
            'mame2003_plus': 'MAME 2003-Plus (Arcade)',
            'flycast': 'Flycast (Dreamcast)',
            'pcsx2': 'PCSX2 (PlayStation 2)',
            'dolphin': 'Dolphin (GameCube/Wii)'
        };

        return coreDisplayNames[coreName] || this.formatCoreName(coreName);
    }

    formatCoreName(coreName) {
        return coreName
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    async getExtensionCoreMapping() {
        const mapping = {
            '.sfc': 'snes9x_libretro.so',
            '.smc': 'snes9x_libretro.so',
            '.nes': 'nestopia_libretro.so',
            '.md': 'genesis_plus_gx_libretro.so',
            '.gen': 'genesis_plus_gx_libretro.so',
            '.z64': 'mupen64plus_next_libretro.so',
            '.n64': 'mupen64plus_next_libretro.so',
            '.v64': 'mupen64plus_next_libretro.so',
            '.cue': 'pcsx_rearmed_libretro.so',
            '.bin': 'pcsx_rearmed_libretro.so',
            '.iso': 'pcsx_rearmed_libretro.so',
            '.gba': 'mgba_libretro.so',
            '.gb': 'gambatte_libretro.so',
            '.gbc': 'gambatte_libretro.so',
            '.zip': 'fbneo_libretro.so'
        };

        return mapping;
    }

    async getCoreForFile(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        const mapping = await this.getExtensionCoreMapping();
        return mapping[ext] || null;
    }

    async startFileWatcher() {
        if (this.fileWatcher) {
            this.fileWatcher.close();
        }

        const romsPath = this.settings.romsPath;
        
        this.fileWatcher = chokidar.watch(romsPath, {
            ignored: /(^|[\/\\])\../, // ignore dotfiles
            persistent: true,
            ignoreInitial: false
        });

        this.fileWatcher
            .on('add', async (filePath) => {
                await this.handleNewROM(filePath);
            })
            .on('unlink', async (filePath) => {
                await this.handleRemovedROM(filePath);
            });

        console.log(`File watcher started for: ${romsPath}`);
    }

    async stopFileWatcher() {
        if (this.fileWatcher) {
            this.fileWatcher.close();
            this.fileWatcher = null;
        }
    }

    async handleNewROM(filePath) {
        try {
            // Check if this ROM is already in the database
            const games = await this.db.getAllGames();
            const existingGame = games.find(game => game.executable === filePath);
            
            if (existingGame) {
                return; // Already exists
            }

            // Get appropriate core for this file
            const core = await this.getCoreForFile(filePath);
            if (!core) {
                console.log(`No core found for file: ${filePath}`);
                return;
            }

            // Extract game title from filename
            const fileName = path.basename(filePath, path.extname(filePath));
            const title = this.cleanGameTitle(fileName);

            // Create game entry
            const gameData = {
                title: title,
                executable: filePath,
                retroarchCore: core,
                description: `Automatically added ROM: ${fileName}`,
                genre: this.guessGenreFromPath(filePath)
            };

            await this.addGame(gameData);
            console.log(`Added new ROM: ${title}`);
        } catch (error) {
            console.error(`Failed to add ROM ${filePath}:`, error);
        }
    }

    async handleRemovedROM(filePath) {
        try {
            const games = await this.db.getAllGames();
            const gameToRemove = games.find(game => game.executable === filePath);
            
            if (gameToRemove) {
                await this.db.deleteGame(gameToRemove.id);
                console.log(`Removed ROM: ${gameToRemove.title}`);
            }
        } catch (error) {
            console.error(`Failed to remove ROM ${filePath}:`, error);
        }
    }

    cleanGameTitle(fileName) {
        // Remove common ROM naming conventions
        return fileName
            .replace(/\([^)]*\)/g, '') // Remove parentheses content
            .replace(/\[[^\]]*\]/g, '') // Remove bracket content
            .replace(/[_-]/g, ' ') // Replace underscores and dashes with spaces
            .replace(/\s+/g, ' ') // Collapse multiple spaces
            .trim();
    }

    guessGenreFromPath(filePath) {
        const pathLower = filePath.toLowerCase();
        
        if (pathLower.includes('arcade') || pathLower.includes('mame')) {
            return 'Arcade';
        } else if (pathLower.includes('snes') || pathLower.includes('super nintendo')) {
            return 'Platform';
        } else if (pathLower.includes('nes') || pathLower.includes('nintendo')) {
            return 'Platform';
        } else if (pathLower.includes('genesis') || pathLower.includes('megadrive')) {
            return 'Action';
        } else if (pathLower.includes('psx') || pathLower.includes('playstation')) {
            return 'Various';
        }
        
        return 'Unknown';
    }
}

export default GameManager; 