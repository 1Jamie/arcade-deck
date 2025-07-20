export class GameCarousel {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error('GameCarousel: Container not found:', containerId);
            return;
        }
        
        console.log('GameCarousel: Container found, initializing with Babylon.js...', this.container);
        
        this.games = [];
        this.currentIndex = 0;
        this.cardWidth = 6;   // Moderate size
        this.cardHeight = 9;  // Moderate size
        this.radius = 12;     // Smaller radius so cards stay in view
        this.isAnimating = false;
        
        // Babylon.js specific properties
        this.engine = null;
        this.scene = null;
        this.camera = null;
        this.cards = [];
        
        // Texture management with proper isolation
        this.imageCache = new Map(); // URL -> Image data
        this.materialCache = new Map(); // gameId -> Material
        
        this.initializeBabylon();
    }

    initializeBabylon() {
        try {
            // Create canvas element for Babylon.js
            const canvas = document.createElement('canvas');
            
            // Set maximum resolution for crisp rendering
            const containerRect = this.container.getBoundingClientRect();
            const pixelRatio = Math.max(window.devicePixelRatio || 1, 3); // Force at least 3x resolution
            canvas.width = containerRect.width * pixelRatio;
            canvas.height = containerRect.height * pixelRatio;
            
            console.log('Canvas resolution:', canvas.width, 'x', canvas.height, 'at', pixelRatio + 'x pixel ratio');
            
            canvas.style.cssText = `
                width: 100%;
                height: 100%;
                display: block;
                touch-action: none;
            `;
            this.container.appendChild(canvas);
            
            // Create Babylon.js engine with pixel-perfect settings
            this.engine = new BABYLON.Engine(canvas, true, {
                preserveDrawingBuffer: true,
                stencil: true,
                antialias: false, // Disable anti-aliasing for crisp edges
                powerPreference: "high-performance",
                adaptToDeviceRatio: true,
                premultipliedAlpha: false,
                depth: true,
                alpha: false
            });
            
            // Set high quality rendering options
            this.engine.setHardwareScalingLevel(1.0);
            this.engine.loadingUIBackgroundColor = "#1a1a1a";
            
            // Create scene with pixel-perfect settings
            this.scene = new BABYLON.Scene(this.engine);
            this.scene.clearColor = new BABYLON.Color3(0.1, 0.1, 0.1);
            
            // Ensure pixel-perfect rendering
            this.engine.setHardwareScalingLevel(1.0); // No downscaling
            this.scene.imageProcessingConfiguration.contrast = 1.0;
            this.scene.imageProcessingConfiguration.exposure = 1.0;
            
            // Verify scene was created
            if (!this.scene) {
                throw new Error('Failed to create Babylon.js scene');
            }
            
            // Create camera positioned to look at origin from positive Z
            this.camera = new BABYLON.FreeCamera("camera", new BABYLON.Vector3(0, 0, 15), this.scene);
            this.camera.setTarget(BABYLON.Vector3.Zero());
            
            // Set field of view for better visibility
            this.camera.fov = Math.PI / 3;
            
            // Limit camera movement for better UX
            this.camera.lowerAlphaLimit = -Math.PI * 0.1;
            this.camera.upperAlphaLimit = Math.PI * 0.1;
            this.camera.lowerBetaLimit = Math.PI / 6;
            this.camera.upperBetaLimit = Math.PI / 3;
            this.camera.lowerRadiusLimit = 12;
            this.camera.upperRadiusLimit = 25;
            
            // Add lights for better visibility
            const hemisphericLight = new BABYLON.HemisphericLight(
                "hemiLight", 
                new BABYLON.Vector3(0, 1, 0), 
                this.scene
            );
            hemisphericLight.intensity = 1.0;
            hemisphericLight.diffuse = new BABYLON.Color3(1, 1, 1);
            
            const directionalLight = new BABYLON.DirectionalLight(
                "dirLight", 
                new BABYLON.Vector3(0, -1, -1), 
                this.scene
            );
            directionalLight.intensity = 0.8;
            directionalLight.position = new BABYLON.Vector3(0, 10, 5);
            
            // Add a front light to illuminate the active card
            const frontLight = new BABYLON.DirectionalLight(
                "frontLight",
                new BABYLON.Vector3(0, 0, -1),
                this.scene
            );
            frontLight.intensity = 0.6;
            frontLight.position = new BABYLON.Vector3(0, 0, 15);
            
            // Handle window resize with high quality
            window.addEventListener('resize', () => {
                const containerRect = this.container.getBoundingClientRect();
                const pixelRatio = window.devicePixelRatio || 1;
                const canvas = this.engine.getRenderingCanvas();
                
                canvas.width = containerRect.width * pixelRatio;
                canvas.height = containerRect.height * pixelRatio;
                
                this.engine.resize();
            });
            
            // Start render loop
            this.engine.runRenderLoop(() => {
                this.scene.render();
            });
            
            console.log('Babylon.js engine initialized successfully');
            console.log('Scene created:', !!this.scene);
            console.log('Engine created:', !!this.engine);
            console.log('Camera created:', !!this.camera);
            
        } catch (error) {
            console.error('Failed to initialize Babylon.js:', error);
        }
    }

    async setGames(games) {
        console.log('GameCarousel: setGames called with', games.length, 'games');
        
        // Ensure Babylon.js is properly initialized
        if (!this.scene || !this.engine) {
            console.error('GameCarousel: Babylon.js scene or engine not initialized');
            return;
        }
        
        // Clean up existing cards
        this.cleanupCards();
        
        this.games = games;
        
        if (games.length === 0) {
            console.log('GameCarousel: No games to display');
            return;
        }
        
        try {
            // Create cards with direct texture loading
            console.log('Creating cards with Babylon.js...');
            this.cards = [];
            
            for (let i = 0; i < games.length; i++) {
                const card = await this.createGameCard(games[i], i);
                this.cards.push(card);
            }
            
            // Position cards in a circle
            this.positionCards();
            
            console.log('GameCarousel: Created', this.cards.length, 'cards with Babylon.js');
        console.log('Scene meshes count:', this.scene.meshes.length);
        console.log('Camera position:', this.camera.position);
        console.log('Camera target:', this.camera.getTarget());
            
        } catch (error) {
            console.error('GameCarousel: Error in setGames:', error);
        }
    }

    async cacheImages(games) {
        console.log('Caching images for Babylon.js materials...');
        
        const uniqueUrls = new Set();
        games.forEach(game => {
            if (game.boxArt && game.boxArt.trim() !== '') {
                uniqueUrls.add(game.boxArt);
            }
        });
        
        console.log('Found', uniqueUrls.size, 'unique image URLs to cache');
        
        for (const url of uniqueUrls) {
            if (this.imageCache.has(url)) {
                continue;
            }
            
            try {
                const imageData = await this.loadImage(url);
                this.imageCache.set(url, imageData);
                console.log('Cached image:', url);
            } catch (error) {
                console.error('Failed to cache image:', url, error);
            }
        }
        
        console.log('Image caching complete. Cached', this.imageCache.size, 'images');
    }

    async loadImage(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            img.onload = () => {
                // Preserve original image resolution - don't force specific size
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth;   // Use actual image width
                canvas.height = img.naturalHeight; // Use actual image height
                const ctx = canvas.getContext('2d');
                
                // Disable smoothing to preserve crisp pixels
                ctx.imageSmoothingEnabled = false;
                
                // Draw image at its native resolution (no scaling)
                ctx.drawImage(img, 0, 0);
                
                resolve({
                    canvas: canvas,
                    image: img,
                    dataUrl: canvas.toDataURL('image/png')
                });
            };
            
            img.onerror = () => {
                reject(new Error(`Failed to load image: ${url}`));
            };
            
            img.src = url;
        });
    }

    async createGameCard(game, index) {
        console.log('Creating Babylon.js card for', game.title);
        
        // Create card geometry with proper UV mapping
        const box = BABYLON.MeshBuilder.CreateBox(
            `card_${game.id}`, 
            {
                width: this.cardWidth,
                height: this.cardHeight,
                depth: 0.1,
                faceUV: [
                    new BABYLON.Vector4(0, 0, 1, 1), // back
                    new BABYLON.Vector4(0, 0, 1, 1), // front - full texture
                    new BABYLON.Vector4(0, 0, 0, 0), // right - no texture
                    new BABYLON.Vector4(0, 0, 0, 0), // left - no texture
                    new BABYLON.Vector4(0, 0, 0, 0), // top - no texture
                    new BABYLON.Vector4(0, 0, 0, 0)  // bottom - no texture
                ]
            }, 
            this.scene
        );
        
        // Create materials for each face
        const materials = [];
        
        // Create material with high-quality texture
        const material = new BABYLON.StandardMaterial(`material_${game.id}`, this.scene);
        
        if (game.boxArt && game.boxArt.trim() !== '') {
            // Load image first to get dimensions, then create texture
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                console.log('Image loaded:', img.naturalWidth, 'x', img.naturalHeight);
                
                // Create texture at native resolution
                const texture = new BABYLON.Texture(game.boxArt, this.scene, false, false, BABYLON.Texture.NEAREST_SAMPLINGMODE);
                texture.invertY = true; // Flip texture to correct orientation
                
                // Configure for pixel-perfect rendering
                texture.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
                texture.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;
                texture.magFilter = BABYLON.Texture.NEAREST_SAMPLINGMODE;
                texture.minFilter = BABYLON.Texture.NEAREST_SAMPLINGMODE;
                texture.generateMipmaps = false;
                
                // Apply to material
                material.diffuseTexture = texture;
                material.needUpdate = true;
                
                console.log('Applied pixel-perfect texture for', game.title);
            };
            img.src = game.boxArt;
            
            // Set fallback color while loading
            material.diffuseColor = new BABYLON.Color3(0.8, 0.8, 0.8);
        } else {
            // Fallback to unique color for games without box art
            const hue = (this.hashCode(game.id) % 360) / 360;
            material.diffuseColor = BABYLON.Color3.FromHSV(hue * 360, 0.7, 0.8);
            console.log('Applied color material for', game.title);
        }
        
        // Set material properties for clean, crisp rendering
        material.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05); // Minimal shine
        material.emissiveColor = new BABYLON.Color3(0, 0, 0); // No emission
        material.roughness = 1.0; // Completely matte surface
        material.metallicFactor = 0.0; // Non-metallic
        
        // Apply material to the box
        box.material = material;
        
        // Material is already applied above
        
        // Store game data
        box.metadata = {
            game: game,
            cardIndex: index,
            gameId: game.id
        };
        
        // Cache the material for this game
        this.materialCache.set(game.id, material);
        
        console.log('Babylon.js card created for', game.title);
        return box;
    }

    positionCards() {
        if (this.cards.length === 0) return;
        
        const angleStep = (2 * Math.PI) / this.cards.length;
        
        this.cards.forEach((card, index) => {
            if (index === this.currentIndex) {
                // Active card at origin facing camera (which is at positive Z)
                card.position.x = 0;
                card.position.y = 0;
                card.position.z = 0;
                card.rotation.x = 0;
                card.rotation.y = Math.PI; // Rotate 180 degrees to face positive Z (camera)
                card.rotation.z = 0;
                console.log(`Active card ${index}: at origin (0,0,0) facing camera at positive Z`);
            } else {
                // Other cards arranged in circle around the active card
                const relativeIndex = index - this.currentIndex;
                const angle = angleStep * relativeIndex;
                
                card.position.x = this.radius * Math.sin(angle);
                card.position.y = 0;
                card.position.z = this.radius * Math.cos(angle);
                
                // Face toward center (where active card is)
                card.rotation.x = 0;
                card.rotation.y = -angle; // Face toward center
                card.rotation.z = 0;
                
                console.log(`Card ${index} (rel: ${relativeIndex}): pos(${card.position.x.toFixed(2)}, ${card.position.y.toFixed(2)}, ${card.position.z.toFixed(2)}), rot(${card.rotation.y.toFixed(2)})`);
            }
        });
        
        console.log('Cards positioned with active card at origin (0,0,0)');
    }

    rotateToIndex(index) {
        if (this.isAnimating || !this.cards.length) return;
        
        this.isAnimating = true;
        const angleStep = (2 * Math.PI) / this.cards.length;
        const deltaAngle = angleStep * (index - this.currentIndex);
        
        console.log('Rotating carousel to index', index, 'deltaAngle:', deltaAngle);
        
        // Simple animation using setTimeout for now (can be improved later)
        const duration = 500; // ms
        const startTime = Date.now();
        
        // Store initial positions for interpolation
        const initialPositions = this.cards.map((card, i) => {
            return {
                x: card.position.x,
                y: card.position.y,
                z: card.position.z,
                rotY: card.rotation.y
            };
        });
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function (ease-in-out)
            const eased = progress < 0.5 
                ? 2 * progress * progress 
                : 1 - Math.pow(-2 * progress + 2, 3) / 2;
            
                         this.cards.forEach((card, i) => {
                const startPos = initialPositions[i];
                let endX, endY, endZ, endRotY;
                
                if (i === index) {
                    // New active card moves to origin
                    endX = 0;
                    endY = 0;
                    endZ = 0;
                    endRotY = Math.PI; // Face camera at positive Z
                } else {
                    // Other cards position around the new active card
                    const relativeIndex = i - index;
                    const targetAngle = angleStep * relativeIndex;
                    
                    endX = this.radius * Math.sin(targetAngle);
                    endY = 0;
                    endZ = this.radius * Math.cos(targetAngle);
                    endRotY = -targetAngle; // Face toward center
                }
                
                // Interpolate to target position
                card.position.x = startPos.x + (endX - startPos.x) * eased;
                card.position.y = startPos.y + (endY - startPos.y) * eased;
                card.position.z = startPos.z + (endZ - startPos.z) * eased;
                card.rotation.y = startPos.rotY + (endRotY - startPos.rotY) * eased;
            });
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.isAnimating = false;
                console.log('Carousel rotation complete');
            }
        };
        
        requestAnimationFrame(animate);
        this.currentIndex = index;
    }

    next() {
        const nextIndex = (this.currentIndex + 1) % this.cards.length;
        this.rotateToIndex(nextIndex);
    }

    previous() {
        const prevIndex = (this.currentIndex - 1 + this.cards.length) % this.cards.length;
        this.rotateToIndex(prevIndex);
    }

    quickScroll(direction) {
        const step = 5;
        let targetIndex;
        
        if (direction > 0) {
            targetIndex = (this.currentIndex + step) % this.cards.length;
        } else {
            targetIndex = (this.currentIndex - step + this.cards.length) % this.cards.length;
        }
        
        this.rotateToIndex(targetIndex);
    }

    getCurrentGame() {
        if (this.cards.length === 0) return null;
        const currentCard = this.cards[this.currentIndex];
        return currentCard ? currentCard.metadata.game : null;
    }

    cleanupCards() {
        if (this.cards) {
            this.cards.forEach(card => {
                if (card.material) {
                    card.material.dispose();
                }
                card.dispose();
            });
            this.cards = [];
        }
        
        // Don't dispose cached materials - they can be reused
        console.log('Cleanup complete, materials cached for reuse');
    }

    hashCode(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash);
    }

    dispose() {
        this.cleanupCards();
        
        if (this.materialCache) {
            this.materialCache.forEach(material => {
                material.dispose();
            });
            this.materialCache.clear();
        }
        
        if (this.scene) {
            this.scene.dispose();
        }
        
        if (this.engine) {
            this.engine.dispose();
        }
        
        console.log('Babylon.js GameCarousel disposed');
    }
} 