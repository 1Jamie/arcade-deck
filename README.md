# Arcade Deck

A modern, visually engaging 3D game launcher for Raspberry Pi 4 running Raspbian OS. Designed for a console-like "10-foot experience" with full gamepad navigation.

## Features (Phase 1 Implementation)

- ✅ **Electron-based application** with vanilla JavaScript frontend
- ✅ **Full gamepad navigation** with keyboard fallback for development
- ✅ **Manual game management** - Add, edit, and delete games
- ✅ **RetroArch integration** - Automatic core detection and ROM launching
- ✅ **Game library database** - JSON-based storage with lowdb
- ✅ **Modern UI** - Clean, dark theme with neon accents
- ✅ **Focus management** - Automatic return after game exit
- ✅ **System controls** - Shutdown and reboot from the interface
- ✅ **No build process** - Direct HTML/CSS/JS development

## Planned Features (Future Phases)

- 🔄 **3D Carousel Interface** - Smooth 3D game card navigation (Phase 2)
- 🔄 **Automatic ROM scanning** - Real-time file watching and metadata scraping (Phase 3)
- 🔄 **Theming system** - Customizable UI themes and layouts (Phase 4)
- 🔄 **Performance optimization** - Raspberry Pi 4 specific optimizations (Phase 5)

## Installation

### Prerequisites

- Raspberry Pi 4 with Raspbian OS
- Node.js 16 or higher
- npm or yarn package manager
- RetroArch installed (optional, for emulation)

### Setup

1. **Clone or extract the project:**
   ```bash
   cd /home/pi/arcade-deck
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the application:**
   ```bash
   npm start
   ```

   Or for development:
   ```bash
   npm run dev
   ```

5. **Package for distribution:**
   ```bash
   npm run package:arm64
   ```

## Controls

### Gamepad Controls
- **D-Pad/Left Stick**: Navigate menu
- **A Button**: Select/Launch game
- **B Button**: Back/Cancel
- **X Button**: Add new game
- **Y Button**: Game settings (future)
- **Start Button**: Open settings menu

### Keyboard Controls (Development)
- **Arrow Keys**: Navigate menu
- **Enter**: Select/Launch game
- **Escape**: Back/Cancel
- **Space**: Add new game
- **Tab**: Game settings
- **S**: Open settings menu

## Configuration

### RetroArch Setup

The application expects RetroArch to be installed in the standard RetroPie locations:

- **RetroArch executable**: `/opt/retropie/emulators/retroarch/bin/retroarch`
- **Cores directory**: `/opt/retropie/libretrocores`
- **ROMs directory**: `/home/pi/RetroPie/roms`

You can modify these paths in the Settings menu.

### Database Location

Game data is stored in: `~/.arcade-deck/db.json`

## Adding Games

### Manual Entry

1. Press **X** (or Space in development) to open the "Add Game" form
2. Fill in the required fields:
   - **Title**: Display name for the game
   - **Executable Path**: Path to the game executable or ROM file
   - **RetroArch Core**: Select if it's an emulated game
3. Optional fields:
   - **Genre, Release Date, Player Count**
   - **Description**
   - **Box Art and Background Image URLs**
4. Click "Add Game" to save

### RetroArch Games

For RetroArch games:
1. Set the **Executable Path** to your ROM file
2. Select the appropriate **RetroArch Core** from the dropdown
3. The application will automatically launch with RetroArch

### Native Games

For native Linux games:
1. Set the **Executable Path** to the game binary
2. Add any **Command Arguments** if needed
3. Leave **RetroArch Core** empty

## Development

### Project Structure

```
arcade-deck/
├── src/
│   ├── main.js                 # Electron main process
│   ├── services/
│   │   ├── database.js         # JSON database management
│   │   └── gameManager.js      # Game operations & RetroArch
│   └── renderer/
│       ├── index.html          # Main HTML file
│       ├── css/
│       │   └── styles.css      # All application styles
│       └── js/
│           ├── app.js          # Main application logic
│           ├── components/     # Component modules
│           │   ├── gameList.js
│           │   ├── gameForm.js
│           │   └── settings.js
│           └── utils/
│               └── gamepad.js  # Gamepad input handling
└── package.json               # Dependencies and scripts
```

### Available Scripts

- `npm start` - Run Electron app
- `npm run dev` - Run in development mode (same as start)
- `npm run package` - Create distributable packages
- `npm run package:linux` - Linux-specific package
- `npm run package:arm64` - ARM64 (Raspberry Pi) package

### Adding New Features

1. **Backend changes**: Modify `src/main.js` and `src/services/`
2. **Frontend changes**: Modify `src/renderer/` files directly
3. **Database changes**: Update `src/services/database.js`
4. **New components**: Add to `src/renderer/js/components/`
5. **Styles**: Update `src/renderer/css/styles.css`

**No build process required** - just refresh the Electron app to see changes!

## Troubleshooting

### Common Issues

1. **"Game not found" error**:
   - Check that the executable path exists
   - Verify file permissions

2. **RetroArch not launching**:
   - Verify RetroArch installation path in Settings
   - Check that the selected core exists
   - Ensure ROM file is compatible with the core

3. **Gamepad not working**:
   - Connect gamepad before starting the application
   - Check browser console for gamepad detection messages
   - Use keyboard controls as fallback

4. **Application won't start**:
   - Run `npm install` to ensure dependencies are installed
   - Check Node.js version (requires 16+)
   - Look for error messages in the terminal

### Debug Mode

Run in development mode to see detailed logs:
```bash
NODE_ENV=development npm run dev
```

## System Requirements

- **Raspberry Pi 4** (2GB+ RAM recommended)
- **Raspbian OS** (Bullseye or newer)
- **Node.js 16+**
- **Electron** (installed via npm)
- **RetroArch** (for emulation features)

## License

MIT License - see package.json for details

## Contributing

This project follows the 5-phase development plan outlined in `specs.txt`. Current implementation covers Phase 1 (Core Launcher). Future phases will add 3D interface, automation, theming, and optimization features.

Phase 2 (3D Interface) will integrate Three.js for the signature 3D carousel experience described in the specifications. 