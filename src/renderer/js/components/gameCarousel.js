export class GameCarousel {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error('GameCarousel: Container not found:', containerId);
            return;
        }
        
        console.log('GameCarousel: Container found, initializing with Three.js...', this.container);
        
        this.games = [];
        this.currentIndex = 0;
        this.cardWidth = 12;  // Larger size for better screen utilization
        this.cardHeight = 18; // Larger size for better screen utilization
        this.radius = 20;     // Larger radius for better spacing
        this.isAnimating = false;
        
        // Three.js specific properties
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.cards = [];
        
        // Texture management with proper isolation
        this.imageCache = new Map(); // URL -> Image data
        this.materialCache = new Map(); // gameId -> Material
        
        this.initializeThreeJS();
    }

    initializeThreeJS() {
        try {
            // Create scene
            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(0.1, 0.1, 0.1);
            
            // Create camera with container aspect ratio
            const containerRect = this.container.getBoundingClientRect();
            const aspect = (containerRect.width > 0 && containerRect.height > 0) 
                ? containerRect.width / containerRect.height 
                : 4/3; // Fallback aspect ratio
            this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 2000);
            this.camera.position.set(0, 2, 30);
            this.camera.lookAt(0, 0, 0);
            
            // Create renderer
            this.renderer = new THREE.WebGLRenderer({ 
                antialias: true,
                alpha: false,
                preserveDrawingBuffer: true
            });
            
            // Set renderer size and quality
            const pixelRatio = Math.max(window.devicePixelRatio || 1, 2); // High quality
            
            // Ensure container has proper dimensions
            if (containerRect.width === 0 || containerRect.height === 0) {
                console.warn('Container has zero dimensions, using fallback size');
                this.renderer.setSize(800, 600);
            } else {
                this.renderer.setSize(containerRect.width, containerRect.height);
            }
            this.renderer.setPixelRatio(pixelRatio);
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            this.renderer.shadowMap.autoUpdate = true;
            
            console.log('Canvas resolution:', containerRect.width * pixelRatio, 'x', containerRect.height * pixelRatio, 'at', pixelRatio + 'x pixel ratio');
            
            // Add renderer to container
            this.container.appendChild(this.renderer.domElement);
            this.renderer.domElement.style.cssText = `
                width: 100%;
                height: 100%;
                display: block;
                touch-action: none;
            `;
            
            // Add clean, simple lighting for one shadow per card
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.4); // Slightly more ambient light for depth
            this.scene.add(ambientLight);
            

            
            // Single main light for clean shadows
            const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
            mainLight.position.set(0, 15, 10);
            mainLight.castShadow = true;
            mainLight.shadow.mapSize.width = 4096;
            mainLight.shadow.mapSize.height = 4096;
            mainLight.shadow.camera.near = 0.1;
            mainLight.shadow.camera.far = 50;
            mainLight.shadow.camera.left = -25;
            mainLight.shadow.camera.right = 25;
            mainLight.shadow.camera.top = 25;
            mainLight.shadow.camera.bottom = -25;
            mainLight.shadow.bias = -0.0001;
            this.scene.add(mainLight);
            
            // Single subtle colored backlight (no shadows)
            const backlight = new THREE.DirectionalLight(0x4ecdc4, 0.4);
            backlight.position.set(0, 0, -15);
            backlight.castShadow = false; // No shadow from backlight
            this.scene.add(backlight);
            
            // Create layered rendering groups
            this.backgroundLayer = new THREE.Group();
            this.reflectionLayer = new THREE.Group();
            this.horizonLayer = new THREE.Group();
            this.mainCardLayer = new THREE.Group();
            
            // Add layers to scene in render order
            this.scene.add(this.backgroundLayer);
            this.scene.add(this.reflectionLayer);
            this.scene.add(this.horizonLayer);
            this.scene.add(this.mainCardLayer);
            
            // Create visible horizon with gradient for layered rendering
            const horizonGeometry = new THREE.PlaneGeometry(1000, 300);
            const horizonMaterial = new THREE.MeshBasicMaterial({ 
                color: 0x303030,
                transparent: true,
                opacity: 0.8
            });
            const horizon = new THREE.Mesh(horizonGeometry, horizonMaterial);
            horizon.rotation.x = -Math.PI / 2; // Rotate to be horizontal
            horizon.position.y = -20; // Positioned below reflections
            horizon.position.z = -10; // Behind everything for proper layering
            this.horizonLayer.add(horizon);
            
            // Add darker gradient overlay to horizon
            const gradientGeometry = new THREE.PlaneGeometry(1000, 150);
            const gradientMaterial = new THREE.MeshBasicMaterial({ 
                color: 0x101010,
                transparent: true,
                opacity: 0.6
            });
            const gradient = new THREE.Mesh(gradientGeometry, gradientMaterial);
            gradient.rotation.x = -Math.PI / 2; // Rotate to be horizontal
            gradient.position.y = -95; // Below horizon for gradient effect
            gradient.position.z = -10; // Same Z as horizon
            this.horizonLayer.add(gradient);
            

            
            // Store mirror reference for reflection cards
            this.reflectionCards = [];
            

            
            // Add subtle rim lights for card definition
            const rimLight1 = new THREE.DirectionalLight(0xffffff, 0.3);
            rimLight1.position.set(-10, 0, 10);
            this.scene.add(rimLight1);
            
            const rimLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
            rimLight2.position.set(10, 0, 10);
            this.scene.add(rimLight2);
            
            // Handle window resize
            window.addEventListener('resize', () => {
                const containerRect = this.container.getBoundingClientRect();
                this.camera.aspect = containerRect.width / containerRect.height;
                this.camera.updateProjectionMatrix();
                this.renderer.setSize(containerRect.width, containerRect.height);
            });
            
            // Start render loop
            this.animate();
            
            console.log('Three.js initialized successfully');
            console.log('Scene created:', !!this.scene);
            console.log('Camera created:', !!this.camera);
            console.log('Renderer created:', !!this.renderer);
            
        } catch (error) {
            console.error('Failed to initialize Three.js:', error);
        }
    }
    
    animate() {
        if (!this.renderer || !this.scene || !this.camera) return;
        
        // Static backlights - no animation to prevent weird moving shadows
        

        
        requestAnimationFrame(() => this.animate());
        this.renderer.render(this.scene, this.camera);
    }



    async setGames(games) {
        console.log('GameCarousel: setGames called with', games.length, 'games');
        
        // Ensure Three.js is properly initialized
        if (!this.scene || !this.renderer) {
            console.error('GameCarousel: Three.js scene or renderer not initialized');
            return;
        }
        
        // Show loading state
        this.showLoadingState();
        
        // Clean up existing cards
        this.cleanupCards();
        
        this.games = games;
        
        if (games.length === 0) {
            console.log('GameCarousel: No games to display');
            this.hideLoadingState();
            return;
        }
        
        try {
            // First, check if all images are already cached
            console.log('Checking if all images are cached...');
            const { ipcRenderer } = require('electron');
            const cacheCheck = await ipcRenderer.invoke('check-all-images-cached', games);
            
            if (!cacheCheck.success) {
                throw new Error(cacheCheck.error || 'Failed to check image cache');
            }
            
            if (!cacheCheck.allCached) {
                console.log(`Found ${cacheCheck.missingCount} missing images, downloading...`);
                this.updateLoadingMessage(`Downloading ${cacheCheck.missingCount} images...`);
            } else {
                console.log('All images are already cached!');
                this.updateLoadingMessage('Loading cached images...');
            }
            
            // Cache all images (this will skip already cached ones)
            console.log('Caching images before creating cards...');
            await this.cacheImages(games);
            
            // Small delay to ensure everything is settled
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // Create cards with direct texture loading
            console.log('Creating cards with Three.js...');
            this.updateLoadingMessage('Creating game cards...');
            this.cards = [];
            
            for (let i = 0; i < games.length; i++) {
                const card = await this.createGameCard(games[i], i);
                this.cards.push(card);
            }
            
            // Position cards in card rack layout
            this.positionCards();
            
            console.log('GameCarousel: Created', this.cards.length, 'cards with Three.js');
            console.log('Scene children count:', this.scene.children.length);
        console.log('Camera position:', this.camera.position);
            
            // Hide loading state and show carousel
            this.hideLoadingState();
            
        } catch (error) {
            console.error('GameCarousel: Error in setGames:', error);
            this.hideLoadingState();
        }
    }

    async cacheImages(games) {
        console.log('=== STARTING IMAGE CACHING PROCESS ===');
        
        const uniqueUrls = new Set();
        games.forEach(game => {
            if (game.boxArt && game.boxArt.trim() !== '') {
                uniqueUrls.add(game.boxArt);
            }
        });
        
        console.log('Found', uniqueUrls.size, 'unique image URLs to cache');
        console.log('URLs:', Array.from(uniqueUrls));
        
        // Create an array of promises for all image loading operations
        const imagePromises = [];
        
        for (const url of uniqueUrls) {
            console.log('Starting to load image:', url);
            
            // Always load the image, even if it's "cached" to ensure it's fully ready
            const imagePromise = this.loadImage(url).then(imageData => {
                console.log('SUCCESS: Image loaded and cached:', url);
                console.log('  - Local path:', imageData.localPath);
                console.log('  - Image dimensions:', imageData.image.naturalWidth, 'x', imageData.image.naturalHeight);
                this.imageCache.set(url, imageData);
                return { url, success: true, imageData };
            }).catch(error => {
                console.error('FAILED to cache image:', url, error);
                return { url, success: false, error };
            });
            
            imagePromises.push(imagePromise);
        }
        
        // Wait for ALL images to complete loading (success or failure)
        console.log('Waiting for all images to load...');
        const results = await Promise.all(imagePromises);
        
        const successCount = results.filter(r => r.success).length;
        const failureCount = results.filter(r => !r.success).length;
        
        console.log(`=== IMAGE CACHING SUMMARY ===`);
        console.log(`Successfully cached: ${successCount} images`);
        console.log(`Failed to cache: ${failureCount} images`);
        console.log(`Total in cache: ${this.imageCache.size} images`);
        
        // Verify that all successful images are actually in the cache
        const verifiedCount = Array.from(this.imageCache.values()).filter(data => 
            data && data.localPath && data.image && data.image.naturalWidth > 0
        ).length;
        
        console.log(`Verified fully loaded: ${verifiedCount} images`);
        
        if (verifiedCount < successCount) {
            console.warn(`WARNING: ${successCount - verifiedCount} images may not be fully ready`);
        }
        
        // Log all cached images for debugging
        console.log('=== CACHED IMAGES DETAILS ===');
        for (const [url, data] of this.imageCache.entries()) {
            console.log(`URL: ${url}`);
            console.log(`  Local: ${data.localPath}`);
            console.log(`  Dimensions: ${data.image.naturalWidth} x ${data.image.naturalHeight}`);
            console.log(`  Ready: ${data.image.complete ? 'YES' : 'NO'}`);
        }
        
        console.log('=== IMAGE CACHING COMPLETE ===');
    }

    async loadImage(url) {
        return new Promise(async (resolve, reject) => {
            try {
                console.log('Loading image:', url);
                
                const { ipcRenderer } = require('electron');
                
                // First check if image is already cached
                const checkResult = await ipcRenderer.invoke('check-image-cache', url);
                if (!checkResult.success) {
                    throw new Error(checkResult.error || 'Failed to check image cache');
                }
                
                let localPath = checkResult.localPath;
                
                // If not cached, download it
                if (!checkResult.exists) {
                    console.log('Image not cached, downloading:', url);
                    const downloadResult = await ipcRenderer.invoke('download-image', url);
                    
                    if (!downloadResult.success) {
                        console.error('Failed to download image:', downloadResult.error);
                        throw new Error(downloadResult.error || 'Failed to download image');
                    }
                    
                    localPath = downloadResult.localPath;
                    console.log('Image downloaded successfully to:', localPath);
                    
                    // Verify the downloaded file
                    const fs = require('fs');
                    if (!fs.existsSync(localPath)) {
                        throw new Error(`Downloaded file does not exist: ${localPath}`);
                    }
                    
                    const stats = fs.statSync(localPath);
                    if (stats.size === 0) {
                        throw new Error(`Downloaded file is empty: ${localPath}`);
                    }
                    
                    console.log('Verified downloaded file has size:', stats.size, 'bytes');
                } else {
                    console.log('Image already cached:', localPath, 'size:', checkResult.size, 'bytes');
                }
                
                // Now load the local high-quality image
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            img.onload = () => {
                    console.log('Local image loaded successfully:', img.naturalWidth, 'x', img.naturalHeight);
                    
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
                        dataUrl: canvas.toDataURL('image/png'),
                        localPath: localPath
                });
            };
            
                img.onerror = (error) => {
                    console.error('Failed to load local image:', localPath, error);
                    reject(new Error(`Failed to load local image: ${localPath}`));
                };
                
                // Use file:// protocol to load local image
                const localImageUrl = `file://${localPath}`;
                console.log('Loading local image from:', localImageUrl);
                img.src = localImageUrl;
                
            } catch (error) {
                console.error('Error in loadImage:', error);
                reject(error);
            }
        });
    }

    async createGameCard(game, index) {
        console.log('Creating Three.js card for', game.title);
        
        // Create card geometry
        const geometry = new THREE.BoxGeometry(this.cardWidth, this.cardHeight, 0.1);
        
        // Create material with high-quality texture
        let material;
        
        if (game.boxArt && game.boxArt.trim() !== '') {
            console.log(`=== CREATING CARD FOR: ${game.title} ===`);
            console.log(`Box art URL: ${game.boxArt}`);
            
            try {
                // Check if we have cached image data - this should always be true since we pre-load all images
                if (this.imageCache.has(game.boxArt)) {
                    const cachedData = this.imageCache.get(game.boxArt);
                    console.log('✓ Found cached image data for', game.title);
                    console.log('  - Local path:', cachedData.localPath);
                    console.log('  - Image dimensions:', cachedData.image.naturalWidth, 'x', cachedData.image.naturalHeight);
                    console.log('  - Image complete:', cachedData.image.complete);
                    
                    // Verify file exists on disk
                    const fs = require('fs');
                    if (fs.existsSync(cachedData.localPath)) {
                        const stats = fs.statSync(cachedData.localPath);
                        console.log('  - File exists, size:', stats.size, 'bytes');
                    } else {
                        console.error('❌ File does not exist on disk:', cachedData.localPath);
                        throw new Error(`Cached file not found: ${cachedData.localPath}`);
                    }
                    
                    // Create texture from local file path ONLY
                    const textureUrl = `file://${cachedData.localPath}`;
                    console.log('Creating texture from:', textureUrl);
                    
                    // Verify the image is actually loaded
                    if (!cachedData.image.complete) {
                        console.warn('⚠️ Image not complete, waiting...');
                        await new Promise((resolve) => {
                            cachedData.image.onload = resolve;
                            cachedData.image.onerror = resolve; // Also resolve on error to avoid hanging
                        });
                    }
                    
                    console.log('Image ready, creating texture...');
                    
                    // Create Three.js texture
                    const texture = new THREE.TextureLoader().load(textureUrl);
                    texture.minFilter = THREE.LinearFilter;
                    texture.magFilter = THREE.LinearFilter;
                texture.generateMipmaps = true;
                    texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
                    
                    // Create material with texture - simple and neutral
                    material = new THREE.MeshBasicMaterial({ 
                        map: texture,
                        transparent: false,
                        side: THREE.FrontSide
                    });
                    
                    console.log('✓ Applied high-quality texture for', game.title, '- texture ready');
                } else {
                    // This should never happen since we pre-load all images
                    console.error('❌ CRITICAL ERROR: No cached image found for', game.title);
                    console.error('Available cached URLs:', Array.from(this.imageCache.keys()));
                    throw new Error(`No cached image found for ${game.title}`);
                }
            } catch (error) {
                console.error('❌ Error applying texture for', game.title, ':', error);
                // Fallback to color material if texture fails
                const hue = (this.hashCode(game.id) % 360) / 360;
                const color = new THREE.Color().setHSL(hue, 0.7, 0.8);
                material = new THREE.MeshBasicMaterial({ color: color });
                console.log('Applied fallback color material for', game.title);
            }
        } else {
            // Fallback to unique color for games without box art
            const hue = (this.hashCode(game.id) % 360) / 360;
            const color = new THREE.Color().setHSL(hue, 0.7, 0.8);
            material = new THREE.MeshBasicMaterial({ color: color });
            console.log('Applied color material for', game.title, '(no box art)');
        }

        // Create mesh with geometry and material
        const mesh = new THREE.Mesh(geometry, material);
        
        // Enable shadows for dramatic effect
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        // Store game data
        mesh.userData = {
            game: game,
            cardIndex: index,
            gameId: game.id
        };
        
        // Add main card to main card layer
        this.mainCardLayer.add(mesh);
        
        // Create reflection card - perfectly mirrored below ground plane
        const reflectionMesh = mesh.clone();
        reflectionMesh.material = material.clone();
        reflectionMesh.material.transparent = true;
        reflectionMesh.material.opacity = 0.25; // More washed out reflection (reduced from 0.4)
        reflectionMesh.material.blending = THREE.NormalBlending;
        reflectionMesh.scale.y = -1; // Flip vertically for reflection
        // Calculate proper mirror position based on card edges
        // Card center is at y=2, card height is 18, so bottom edge is at y=2-9=-7
        // Ground plane is at y=0, so distance from bottom edge to ground = 7 units
        // Reflection top edge should be 7 units below ground = y=-7
        // Reflection center should be 9 units below top edge = y=-7-9=-16
        // Move reflections down by -1 to ensure they're below the surface
        reflectionMesh.position.y = -17; // Proper mirror position based on edges, moved down by -1
        reflectionMesh.position.z = 0; // Same Z position as the card
        reflectionMesh.castShadow = false;
        reflectionMesh.receiveShadow = false;
        // Add reflection to reflection layer
        this.reflectionLayer.add(reflectionMesh);
        
        // Store reflection reference
        this.reflectionCards.push(reflectionMesh);
        
        // Cache the material for this game
        this.materialCache.set(game.id, material);
        
        console.log('Three.js card created for', game.title);
        return mesh;
    }

    positionCards() {
        console.log('positionCards called with', this.cards.length, 'cards and', this.reflectionCards.length, 'reflections');
        if (this.cards.length === 0) return;
        
        this.cards.forEach((card, index) => {
            const relativeIndex = index - this.currentIndex;
            
            if (relativeIndex === 0) {
                // Active card at center, facing camera
                card.position.x = 0;
                card.position.y = 2; // Raised up from ground
                card.position.z = 0;
                card.rotation.x = 0;
                card.rotation.y = Math.PI; // Face camera
                card.rotation.z = 0;
                card.scale.set(1, 1, 1); // Full size
                
                // Position reflection card - perfect mirror based on edges
                if (this.reflectionCards[index]) {
                    this.reflectionCards[index].position.x = 0;
                    // Card center at y=2, bottom edge at y=2-9=-7, distance to ground=7
                    // Reflection top edge at y=-7, center at y=-7-9=-16
                    // Move reflections down by -1 to ensure they're below the surface
                    this.reflectionCards[index].position.y = -17;
                    this.reflectionCards[index].position.z = 0; // Same Z position as the card
                    this.reflectionCards[index].rotation.x = 0;
                    this.reflectionCards[index].rotation.y = Math.PI; // Face camera
                    this.reflectionCards[index].rotation.z = 0;
                    this.reflectionCards[index].scale.set(1, -1, 1); // Flip vertically for reflection
                    console.log(`Reflection ${index} positioned at Y: ${this.reflectionCards[index].position.y}`);
                }
                
                console.log(`Active card ${index}: at center (0,2,0) full size`);
            } else {
                // Calculate position for card rack effect
                const absRelativeIndex = Math.abs(relativeIndex);
                const sign = Math.sign(relativeIndex);
                
                // Base spacing for adjacent cards - increased for better screen utilization
                const baseSpacing = this.cardWidth * 1.5; // 150% of card width for better spacing
                
                // Calculate horizontal position (X) - cards spread out more horizontally
                const xOffset = sign * baseSpacing * (1 + (absRelativeIndex - 1) * 0.6);
                
                // Calculate depth position (Z) - cards curve back more for depth effect
                const zOffset = -Math.abs(relativeIndex) * 2.0;
                
                // Calculate rotation - cards face slightly toward center
                const rotationAngle = sign * Math.min(absRelativeIndex * 0.2, 0.6); // Max 0.6 radians
                
                // Calculate scaling - cards get smaller as they get further away
                const scaleFactor = Math.max(0.7, 1 - absRelativeIndex * 0.12); // Min 70% size for better visibility
                
                // Apply positioning
                card.position.x = xOffset;
                card.position.y = 2; // Raised up from ground
                card.position.z = zOffset;
                card.rotation.x = 0;
                card.rotation.y = Math.PI + rotationAngle; // Face camera with slight angle
                card.rotation.z = 0;
                card.scale.set(scaleFactor, scaleFactor, scaleFactor);
                
                // Position reflection card - perfect mirror based on edges
                if (this.reflectionCards[index]) {
                    this.reflectionCards[index].position.x = xOffset;
                    // Calculate reflection position based on scaled card height
                    const scaledCardHeight = this.cardHeight * scaleFactor;
                    const cardBottomEdge = 2 - scaledCardHeight/2; // Card center at y=2
                    const distanceToGround = Math.abs(cardBottomEdge); // Distance from bottom edge to ground
                    const reflectionTopEdge = -distanceToGround; // Reflection top edge same distance below ground
                    const reflectionCenter = reflectionTopEdge - scaledCardHeight/2; // Reflection center
                    // Move reflections down by -1 to ensure they're below the surface
                    this.reflectionCards[index].position.y = reflectionCenter - 1;
                    this.reflectionCards[index].position.z = zOffset; // Same Z position as the card
                    this.reflectionCards[index].rotation.x = 0;
                    this.reflectionCards[index].rotation.y = Math.PI + rotationAngle; // Face camera with slight angle
                    this.reflectionCards[index].rotation.z = 0;
                    this.reflectionCards[index].scale.set(scaleFactor, -scaleFactor, scaleFactor); // Flip vertically for reflection
                }
                
                console.log(`Card ${index} (rel: ${relativeIndex}): pos(${xOffset.toFixed(2)}, 0, ${zOffset.toFixed(2)}), rot(${rotationAngle.toFixed(2)}), scale(${scaleFactor.toFixed(2)})`);
            }
        });
        
        console.log('Cards positioned in card rack layout');
    }

    rotateToIndex(index) {
        if (this.isAnimating || !this.cards.length) return;
        
        this.isAnimating = true;
        console.log('Animating carousel to index', index);
        
        const duration = 600; // ms - slightly longer for smoother animation
        const startTime = Date.now();
        
        // Store initial positions and scaling for interpolation
        const initialStates = this.cards.map((card, i) => {
            return {
                x: card.position.x,
                y: card.position.y,
                z: card.position.z,
                rotY: card.rotation.y,
                scaleX: card.scale.x,
                scaleY: card.scale.y,
                scaleZ: card.scale.z
            };
        });
        
        // Store initial reflection positions for interpolation
        const initialReflectionStates = this.reflectionCards.map((reflectionCard, i) => {
            return {
                x: reflectionCard.position.x,
                y: reflectionCard.position.y,
                z: reflectionCard.position.z,
                rotY: reflectionCard.rotation.y,
                scaleX: reflectionCard.scale.x,
                scaleY: reflectionCard.scale.y,
                scaleZ: reflectionCard.scale.z
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
                const startState = initialStates[i];
                const relativeIndex = i - index;
                
                // Calculate target positions using the same logic as positionCards
                let endX, endY, endZ, endRotY, endScale;
                
                if (relativeIndex === 0) {
                    // New active card at center
                    endX = 0;
                    endY = 2; // Raised up from ground
                    endZ = 0;
                    endRotY = Math.PI;
                    endScale = 1.0;
                } else {
                    // Calculate card rack positioning
                    const absRelativeIndex = Math.abs(relativeIndex);
                    const sign = Math.sign(relativeIndex);
                    
                    const baseSpacing = this.cardWidth * 1.5; // Match the positioning logic
                    endX = sign * baseSpacing * (1 + (absRelativeIndex - 1) * 0.6);
                    endY = 2; // Raised up from ground
                    endZ = -Math.abs(relativeIndex) * 2.0; // Match the positioning logic
                    endRotY = Math.PI + sign * Math.min(absRelativeIndex * 0.2, 0.6);
                    endScale = Math.max(0.7, 1 - absRelativeIndex * 0.12);
                }
                
                // Interpolate to target position
                card.position.x = startState.x + (endX - startState.x) * eased;
                card.position.y = startState.y + (endY - startState.y) * eased;
                card.position.z = startState.z + (endZ - startState.z) * eased;
                card.rotation.y = startState.rotY + (endRotY - startState.rotY) * eased;
                card.scale.x = startState.scaleX + (endScale - startState.scaleX) * eased;
                card.scale.y = startState.scaleY + (endScale - startState.scaleY) * eased;
                card.scale.z = startState.scaleZ + (endScale - startState.scaleZ) * eased;
            });
            
            // Animate reflection cards
            this.reflectionCards.forEach((reflectionCard, i) => {
                const startState = initialReflectionStates[i];
                const relativeIndex = i - index;
                
                // Calculate target reflection positions using the same logic as positionCards
                let endX, endY, endZ, endRotY, endScale;
                
                if (relativeIndex === 0) {
                    // New active card reflection at center
                    endX = 0;
                    // Card center at y=2, bottom edge at y=2-9=-7, distance to ground=7
                    // Reflection top edge at y=-7, center at y=-7-9=-16
                    // Move reflections down by -1 to ensure they're below the surface
                    endY = -17;
                    endZ = 0; // Same Z position as the card
                    endRotY = Math.PI;
                    endScale = 1.0;
                } else {
                    // Calculate reflection rack positioning
                    const absRelativeIndex = Math.abs(relativeIndex);
                    const sign = Math.sign(relativeIndex);
                    
                    const baseSpacing = this.cardWidth * 1.5; // Match the positioning logic
                    endX = sign * baseSpacing * (1 + (absRelativeIndex - 1) * 0.6);
                    endZ = -Math.abs(relativeIndex) * 2.0; // Match the positioning logic
                    endRotY = Math.PI + sign * Math.min(absRelativeIndex * 0.2, 0.6);
                    endScale = Math.max(0.7, 1 - absRelativeIndex * 0.12);
                    
                    // Calculate reflection position based on scaled card height
                    const scaledCardHeight = this.cardHeight * endScale;
                    const cardBottomEdge = 2 - scaledCardHeight/2; // Card center at y=2
                    const distanceToGround = Math.abs(cardBottomEdge); // Distance from bottom edge to ground
                    const reflectionTopEdge = -distanceToGround; // Reflection top edge same distance below ground
                    const reflectionCenter = reflectionTopEdge - scaledCardHeight/2; // Reflection center
                    // Move reflections down by -1 to ensure they're below the surface
                    endY = reflectionCenter - 1;
                }
                
                // Interpolate reflection to target position
                reflectionCard.position.x = startState.x + (endX - startState.x) * eased;
                reflectionCard.position.y = startState.y + (endY - startState.y) * eased;
                reflectionCard.position.z = startState.z + (endZ - startState.z) * eased;
                reflectionCard.rotation.y = startState.rotY + (endRotY - startState.rotY) * eased;
                reflectionCard.scale.x = startState.scaleX + (endScale - startState.scaleX) * eased;
                reflectionCard.scale.y = startState.scaleY + (-endScale - startState.scaleY) * eased; // Keep Y scale negative for reflection
                reflectionCard.scale.z = startState.scaleZ + (endScale - startState.scaleZ) * eased;
            });
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.isAnimating = false;
                this.currentIndex = index;
                console.log('Carousel animation complete');
            }
        };
        
        requestAnimationFrame(animate);
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
        return currentCard ? currentCard.userData.game : null;
    }

    cleanupCards() {
        if (this.cards) {
            this.cards.forEach(card => {
                if (card.material) {
                    card.material.dispose();
                }
                if (card.geometry) {
                    card.geometry.dispose();
                }
                this.mainCardLayer.remove(card);
            });
            this.cards = [];
        }
        
        // Clean up reflection cards
        if (this.reflectionCards) {
            this.reflectionCards.forEach(reflectionCard => {
                if (reflectionCard.material) {
                    reflectionCard.material.dispose();
                }
                if (reflectionCard.geometry) {
                    reflectionCard.geometry.dispose();
                }
                this.reflectionLayer.remove(reflectionCard);
            });
            this.reflectionCards = [];
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

    showLoadingState() {
        // Hide the carousel container and show loading message
        if (this.container) {
            this.container.style.opacity = '0.3';
            
            // Create or update loading message
            let loadingElement = this.container.querySelector('.loading-message');
            if (!loadingElement) {
                loadingElement = document.createElement('div');
                loadingElement.className = 'loading-message';
                loadingElement.style.cssText = `
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    color: white;
                    font-size: 18px;
                    z-index: 1000;
                    text-align: center;
                `;
                this.container.appendChild(loadingElement);
            }
            loadingElement.textContent = 'Loading high-quality images...';
            loadingElement.style.display = 'block';
        }
    }
    
    updateLoadingMessage(message) {
        if (this.container) {
            const loadingElement = this.container.querySelector('.loading-message');
            if (loadingElement) {
                loadingElement.textContent = message;
            }
        }
    }
    
    hideLoadingState() {
        // Show the carousel container and hide loading message
        if (this.container) {
            this.container.style.opacity = '1';
            
            const loadingElement = this.container.querySelector('.loading-message');
            if (loadingElement) {
                loadingElement.style.display = 'none';
            }
        }
    }

    dispose() {
        this.cleanupCards();
        
        if (this.materialCache) {
            this.materialCache.forEach(material => {
                material.dispose();
            });
            this.materialCache.clear();
        }
        
        if (this.renderer) {
            this.renderer.dispose();
        }
        
        console.log('Three.js GameCarousel disposed');
    }
} 