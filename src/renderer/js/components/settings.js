// Settings Component
export class Settings {
    constructor() {
        this.saveBtn = document.getElementById('save-settings-btn');
        this.messageElement = document.getElementById('settings-message');
        this.settings = {};
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Close button
        document.getElementById('settings-close-btn').addEventListener('click', () => {
            window.app.showView('game-list');
        });

        // Save button
        this.saveBtn.addEventListener('click', () => {
            this.saveSettings();
        });

        // Scan cores button
        document.getElementById('scan-cores-btn').addEventListener('click', () => {
            this.scanCores();
        });

        // System controls
        document.getElementById('reboot-btn').addEventListener('click', () => {
            this.rebootSystem();
        });

        document.getElementById('shutdown-btn').addEventListener('click', () => {
            this.shutdownSystem();
        });

        // Path browse buttons
        document.getElementById('browse-retroarch').addEventListener('click', () => {
            this.browsePath('retroarchPath', { properties: ['openFile'] });
        });

        document.getElementById('browse-cores').addEventListener('click', () => {
            this.browsePath('coresPath', { properties: ['openDirectory'] });
        });

        document.getElementById('browse-roms').addEventListener('click', () => {
            this.browsePath('romsPath', { properties: ['openDirectory'] });
        });
    }

    async show() {
        await this.loadSettings();
    }

    async loadSettings() {
        try {
            const { ipcRenderer } = require('electron');
            const settings = await ipcRenderer.invoke('get-settings');
            this.settings = settings;
            this.populateForm();
            console.log('Settings loaded:', settings);
        } catch (error) {
            console.error('Failed to load settings:', error);
            this.showMessage('Failed to load settings: ' + error.message, 'error');
        }
    }

    populateForm() {
        document.getElementById('retroarchPath').value = this.settings.retroarchPath || '';
        document.getElementById('coresPath').value = this.settings.coresPath || '';
        document.getElementById('romsPath').value = this.settings.romsPath || '';
        document.getElementById('theme').value = this.settings.theme || 'default';
        document.getElementById('performanceProfile').value = this.settings.performanceProfile || 'balanced';
        document.getElementById('soundEnabled').checked = this.settings.soundEnabled !== false;
    }

    async saveSettings() {
        this.clearMessage();
        this.setSaving(true);

        try {
            // Get form data
            const formData = {
                retroarchPath: document.getElementById('retroarchPath').value.trim(),
                coresPath: document.getElementById('coresPath').value.trim(),
                romsPath: document.getElementById('romsPath').value.trim(),
                theme: document.getElementById('theme').value,
                performanceProfile: document.getElementById('performanceProfile').value,
                soundEnabled: document.getElementById('soundEnabled').checked
            };

            // Validate paths
            if (!formData.retroarchPath) {
                throw new Error('RetroArch executable path is required');
            }
            if (!formData.coresPath) {
                throw new Error('RetroArch cores directory is required');
            }
            if (!formData.romsPath) {
                throw new Error('ROMs directory is required');
            }

            // Update local settings
            this.settings = { ...this.settings, ...formData };

            // Save to database via IPC
            const { ipcRenderer } = require('electron');
            await ipcRenderer.invoke('update-settings', this.settings);

            // Rescan cores with new path
            await this.scanCores();

            this.showMessage('Settings saved successfully!', 'success');
        } catch (error) {
            this.showMessage('Failed to save settings: ' + error.message, 'error');
        } finally {
            this.setSaving(false);
        }
    }

    async browsePath(inputId, options) {
        try {
            const { ipcRenderer } = require('electron');
            const result = await ipcRenderer.invoke('show-dialog', options);
            
            if (!result.canceled && result.filePaths.length > 0) {
                document.getElementById(inputId).value = result.filePaths[0];
            }
        } catch (error) {
            console.error('Failed to browse path:', error);
        }
    }

    async scanCores() {
        try {
            const { ipcRenderer } = require('electron');
            const cores = await ipcRenderer.invoke('scan-retroarch-cores');
            console.log('Found RetroArch cores:', cores);
            this.showMessage(`Found ${cores.length} RetroArch cores`, 'success');
        } catch (error) {
            console.error('Failed to scan cores:', error);
            this.showMessage('Failed to scan cores: ' + error.message, 'error');
        }
    }

    async rebootSystem() {
        if (confirm('Are you sure you want to reboot the system?')) {
            const { ipcRenderer } = require('electron');
            await ipcRenderer.invoke('system-control', 'reboot');
        }
    }

    async shutdownSystem() {
        if (confirm('Are you sure you want to shut down the system?')) {
            const { ipcRenderer } = require('electron');
            await ipcRenderer.invoke('system-control', 'shutdown');
        }
    }

    showMessage(message, type = 'info') {
        this.messageElement.textContent = message;
        this.messageElement.className = `message message-${type}`;
    }

    clearMessage() {
        this.messageElement.textContent = '';
        this.messageElement.className = 'message';
    }

    setSaving(saving) {
        this.saveBtn.disabled = saving;
        this.saveBtn.textContent = saving ? 'Saving...' : 'Save Settings';
    }
}

export default Settings; 