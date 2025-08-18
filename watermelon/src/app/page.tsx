"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";

interface FruitType {
	emoji: string;
	size: number;
	points: number;
	name: string;
}

interface Fruit {
	x: number;
	y: number;
	type: number;
	size: number;
	vx: number;
	vy: number;
	merged: boolean;
	age: number;
}

const WatermelonClub: React.FC = () => {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const [score, setScore] = useState(0);
	const [gameRunning, setGameRunning] = useState(true);
	const [nextFruitType, setNextFruitType] = useState(0);
	const [showGameOver, setShowGameOver] = useState(false);
	const [dropPosition, setDropPosition] = useState(150);
	const [canvasScale, setCanvasScale] = useState(1);

	// Use refs for game state that needs to be accessed in animation loop
	const fruitsRef = useRef<Fruit[]>([]);
	const scoreRef = useRef(0);
	const gameRunningRef = useRef(true);
	const nextFruitTypeRef = useRef(0);
	const dropPositionRef = useRef(150);

	const animationFrameRef = useRef<number>();
	const [soundEnabled, setSoundEnabled] = useState(true);

	// Fruit types with emojis, sizes (reduced for smaller area), and points
	const fruitTypes: FruitType[] = [
		{ emoji: "🍒", size: 18, points: 1, name: "Cherry" },
		{ emoji: "🍓", size: 22, points: 3, name: "Strawberry" },
		{ emoji: "🍇", size: 26, points: 6, name: "Grape" },
		{ emoji: "🍊", size: 30, points: 10, name: "Orange" },
		{ emoji: "🍎", size: 34, points: 15, name: "Apple" },
		{ emoji: "🍐", size: 38, points: 21, name: "Pear" },
		{ emoji: "🍑", size: 42, points: 28, name: "Peach" },
		{ emoji: "🍍", size: 46, points: 36, name: "Pineapple" },
		{ emoji: "🍈", size: 50, points: 45, name: "Melon" },
		{ emoji: "🍉", size: 54, points: 55, name: "Watermelon" },
	];

	// Physics constants - adjusted for smaller area
	const gravity = 0.5;
	const bounce = 0.7;
	const friction = 0.99;
	const gameOverLine = 100; // Reduced for smaller area
	const spawnY = 40; // Reduced spawn distance
	const canvasWidth = 280; // Reduced from 400
	const canvasHeight = 300; // Reduced from 500

	// Keep refs in sync with state
	useEffect(() => {
		scoreRef.current = score;
	}, [score]);

	useEffect(() => {
		gameRunningRef.current = gameRunning;
	}, [gameRunning]);

	useEffect(() => {
		nextFruitTypeRef.current = nextFruitType;
	}, [nextFruitType]);

	useEffect(() => {
		dropPositionRef.current = dropPosition;
	}, [dropPosition]);

	// Sound effects
	const playSound = (
		frequency: number,
		duration: number,
		type: OscillatorType = "sine"
	) => {
		if (!soundEnabled) return;

		try {
			const audioContext = new (window.AudioContext ||
				(window as any).webkitAudioContext)();
			const oscillator = audioContext.createOscillator();
			const gainNode = audioContext.createGain();

			oscillator.connect(gainNode);
			gainNode.connect(audioContext.destination);

			oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
			oscillator.type = type;

			gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
			gainNode.gain.exponentialRampToValueAtTime(
				0.001,
				audioContext.currentTime + duration
			);

			oscillator.start(audioContext.currentTime);
			oscillator.stop(audioContext.currentTime + duration);
		} catch (e) {
			// Silently fail if audio context is not available
		}
	};

	const playDropSound = () => {
		playSound(220, 0.1, "triangle");
	};

	const playMergeSound = (fruitType: number) => {
		const baseFreq = 300 + fruitType * 50;
		playSound(baseFreq, 0.3, "sine");
		setTimeout(() => playSound(baseFreq * 1.5, 0.2, "sine"), 100);
	};

	const playGameOverSound = () => {
		playSound(150, 0.5, "sawtooth");
		setTimeout(() => playSound(100, 0.5, "sawtooth"), 200);
	};

	// Handle responsive canvas scaling
	useEffect(() => {
		const handleResize = () => {
			if (containerRef.current && canvasRef.current) {
				const containerWidth = containerRef.current.clientWidth - 40; // Account for padding
				const scale = Math.min(1, containerWidth / canvasWidth);
				setCanvasScale(scale);

				// Update canvas display size
				const canvas = canvasRef.current;
				canvas.style.width = `${canvasWidth * scale}px`;
				canvas.style.height = `${canvasHeight * scale}px`;
			}
		};

		handleResize();
		window.addEventListener("resize", handleResize);

		// Use ResizeObserver for more accurate container size changes
		let resizeObserver: ResizeObserver;
		if (containerRef.current && "ResizeObserver" in window) {
			resizeObserver = new ResizeObserver(handleResize);
			resizeObserver.observe(containerRef.current);
		}

		return () => {
			window.removeEventListener("resize", handleResize);
			if (resizeObserver) {
				resizeObserver.disconnect();
			}
		};
	}, []);

	const getRandomNextFruit = (): number => {
		return Math.floor(Math.random() * Math.min(5, fruitTypes.length));
	};

	const addScore = (points: number) => {
		scoreRef.current += points;
		setScore(scoreRef.current);
	};

	const updateFruit = (fruit: Fruit): void => {
		if (fruit.merged) return;

		fruit.age++;

		// Apply gravity
		fruit.vy += gravity;

		// Apply velocity
		fruit.x += fruit.vx;
		fruit.y += fruit.vy;

		// Apply friction
		fruit.vx *= friction;
		fruit.vy *= friction;

		// Boundary collision
		if (fruit.x - fruit.size < 0) {
			fruit.x = fruit.size;
			fruit.vx = -fruit.vx * bounce;
		}
		if (fruit.x + fruit.size > canvasWidth) {
			fruit.x = canvasWidth - fruit.size;
			fruit.vx = -fruit.vx * bounce;
		}
		if (fruit.y + fruit.size > canvasHeight) {
			fruit.y = canvasHeight - fruit.size;
			fruit.vy = -fruit.vy * bounce;
		}
	};

	// Draw background pattern - adjusted for smaller canvas
	const drawBackground = (ctx: CanvasRenderingContext2D): void => {
		// Sky gradient background
		const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
		gradient.addColorStop(0, "#87CEEB");
		gradient.addColorStop(0.7, "#98FB98");
		gradient.addColorStop(1, "#90EE90");
		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, canvasWidth, canvasHeight);

		// Draw clouds - adjusted positions for smaller canvas
		ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
		// Cloud 1
		ctx.beginPath();
		ctx.arc(60, 45, 18, 0, Math.PI * 2);
		ctx.arc(75, 45, 25, 0, Math.PI * 2);
		ctx.arc(90, 45, 18, 0, Math.PI * 2);
		ctx.fill();

		// Cloud 2
		ctx.beginPath();
		ctx.arc(210, 30, 15, 0, Math.PI * 2);
		ctx.arc(220, 30, 22, 0, Math.PI * 2);
		ctx.arc(235, 30, 15, 0, Math.PI * 2);
		ctx.fill();

		// Cloud 3
		ctx.beginPath();
		ctx.arc(260, 60, 12, 0, Math.PI * 2);
		ctx.arc(270, 60, 18, 0, Math.PI * 2);
		ctx.arc(280, 60, 12, 0, Math.PI * 2);
		ctx.fill();

		// Draw grass at bottom
		ctx.fillStyle = "#228B22";
		ctx.fillRect(0, canvasHeight - 25, canvasWidth, 25);

		// Draw small grass blades
		ctx.fillStyle = "#32CD32";
		for (let i = 0; i < canvasWidth; i += 12) {
			ctx.fillRect(i, canvasHeight - 20, 2, 12);
			ctx.fillRect(i + 4, canvasHeight - 16, 1, 8);
			ctx.fillRect(i + 8, canvasHeight - 20, 2, 12);
		}

		// Draw sun
		ctx.fillStyle = "#FFD700";
		ctx.beginPath();
		ctx.arc(260, 40, 15, 0, Math.PI * 2);
		ctx.fill();

		// Sun rays
		ctx.strokeStyle = "#FFD700";
		ctx.lineWidth = 1;
		for (let i = 0; i < 8; i++) {
			const angle = (i * Math.PI * 2) / 8;
			const x1 = 260 + Math.cos(angle) * 18;
			const y1 = 40 + Math.sin(angle) * 18;
			const x2 = 260 + Math.cos(angle) * 25;
			const y2 = 40 + Math.sin(angle) * 25;
			ctx.beginPath();
			ctx.moveTo(x1, y1);
			ctx.lineTo(x2, y2);
			ctx.stroke();
		}
	};

	const drawFruit = (ctx: CanvasRenderingContext2D, fruit: Fruit): void => {
		if (fruit.merged) return;

		ctx.save();
		ctx.translate(fruit.x, fruit.y);

		// Draw fruit shadow
		ctx.globalAlpha = 0.2;
		ctx.fillStyle = "black";
		ctx.beginPath();
		ctx.arc(2, fruit.size + 2, fruit.size, 0, Math.PI * 2);
		ctx.fill();

		// Draw fruit emoji
		ctx.globalAlpha = 1;
		ctx.font = `${fruit.size * 1.8}px Arial`;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(fruitTypes[fruit.type].emoji, 0, 0);

		ctx.restore();
	};

	// Improved collision detection with exact touching
	const checkCollision = (fruit1: Fruit, fruit2: Fruit): boolean => {
		if (fruit1.merged || fruit2.merged) return false;

		const dx = fruit1.x - fruit2.x;
		const dy = fruit1.y - fruit2.y;
		const distance = Math.sqrt(dx * dx + dy * dy);
		const minDistance = fruit1.size + fruit2.size;

		// Only collide when fruits actually overlap (distance < minDistance)
		if (distance < minDistance) {
			// Separate fruits
			const overlap = minDistance - distance;
			const separateX = (dx / distance) * overlap * 0.5;
			const separateY = (dy / distance) * overlap * 0.5;

			fruit1.x += separateX;
			fruit1.y += separateY;
			fruit2.x -= separateX;
			fruit2.y -= separateY;

			// Exchange velocities with bounce
			const tempVx = fruit1.vx;
			const tempVy = fruit1.vy;
			fruit1.vx = fruit2.vx * bounce;
			fruit1.vy = fruit2.vy * bounce;
			fruit2.vx = tempVx * bounce;
			fruit2.vy = tempVy * bounce;

			return true;
		}

		return false;
	};

	// Check if two fruits can merge with stricter conditions
	const canMerge = (fruit1: Fruit, fruit2: Fruit): boolean => {
		if (fruit1.type !== fruit2.type || fruit1.type >= fruitTypes.length - 1) {
			return false;
		}
		if (fruit1.merged || fruit2.merged) {
			return false;
		}
		if (fruit1.age <= 30 || fruit2.age <= 30) {
			return false;
		}

		// Calculate exact distance
		const dx = fruit1.x - fruit2.x;
		const dy = fruit1.y - fruit2.y;
		const distance = Math.sqrt(dx * dx + dy * dy);
		const touchDistance = fruit1.size + fruit2.size;

		// Only merge when fruits are actually touching (distance <= touchDistance)
		// Adding a small tolerance for floating point precision
		return distance <= touchDistance + 1;
	};

	// Improved line-of-sight check to prevent merging through other fruits
	const hasLineOfSight = (fruit1: Fruit, fruit2: Fruit): boolean => {
		const dx = fruit2.x - fruit1.x;
		const dy = fruit2.y - fruit1.y;
		const distance = Math.sqrt(dx * dx + dy * dy);

		// Check if any other fruit intersects the line between fruit1 and fruit2
		for (const obstacle of fruitsRef.current) {
			if (obstacle === fruit1 || obstacle === fruit2 || obstacle.merged) {
				continue;
			}

			// Calculate distance from obstacle center to the line between fruit1 and fruit2
			const A = dy;
			const B = -dx;
			const C = dx * fruit1.y - dy * fruit1.x;
			const distanceToLine =
				Math.abs(A * obstacle.x + B * obstacle.y + C) / distance;

			// Check if obstacle is close enough to the line to block it
			if (distanceToLine < obstacle.size) {
				// Also check if the obstacle is actually between the two fruits
				const t =
					((obstacle.x - fruit1.x) * dx + (obstacle.y - fruit1.y) * dy) /
					(distance * distance);
				if (t > 0 && t < 1) {
					return false; // Line of sight is blocked
				}
			}
		}
		return true; // No obstacles found
	};

	const checkMerges = (): void => {
		const toRemove: number[] = [];
		const toAdd: Fruit[] = [];

		for (let i = 0; i < fruitsRef.current.length; i++) {
			if (fruitsRef.current[i].merged) continue;

			for (let j = i + 1; j < fruitsRef.current.length; j++) {
				if (fruitsRef.current[j].merged) continue;

				// Check if fruits can merge and have line of sight
				if (
					canMerge(fruitsRef.current[i], fruitsRef.current[j]) &&
					hasLineOfSight(fruitsRef.current[i], fruitsRef.current[j])
				) {
					const mergeX = (fruitsRef.current[i].x + fruitsRef.current[j].x) / 2;
					const mergeY = (fruitsRef.current[i].y + fruitsRef.current[j].y) / 2;
					const newType = fruitsRef.current[i].type + 1;

					// Mark for removal
					fruitsRef.current[i].merged = true;
					fruitsRef.current[j].merged = true;
					toRemove.push(i, j);

					// Create new merged fruit
					const mergedFruit: Fruit = {
						x: mergeX,
						y: mergeY,
						type: newType,
						size: fruitTypes[newType].size,
						vx: 0,
						vy: -2, // Small upward bounce
						merged: false,
						age: 0,
					};
					toAdd.push(mergedFruit);

					// Add score
					addScore(fruitTypes[newType].points);
					playMergeSound(newType);

					break;
				}
			}
		}

		// Remove merged fruits
		fruitsRef.current = fruitsRef.current.filter((fruit) => !fruit.merged);

		// Add new merged fruits
		fruitsRef.current.push(...toAdd);
	};

	// Check if there are any possible merges available
	const hasPossibleMerges = (): boolean => {
		for (let i = 0; i < fruitsRef.current.length; i++) {
			if (fruitsRef.current[i].merged) continue;

			for (let j = i + 1; j < fruitsRef.current.length; j++) {
				if (fruitsRef.current[j].merged) continue;

				// Check if these fruits are the same type and can potentially merge
				if (
					fruitsRef.current[i].type === fruitsRef.current[j].type &&
					fruitsRef.current[i].type < fruitTypes.length - 1
				) {
					return true;
				}
			}
		}
		return false;
	};

	const checkGameOverCondition = (): void => {
		// Check if any settled fruit has its top edge at or above the game over line
		for (const fruit of fruitsRef.current) {
			// Consider a fruit "settled" if its velocity is very low
			const isSettled = Math.abs(fruit.vy) < 0.1 && Math.abs(fruit.vx) < 0.1;
			if (isSettled && fruit.y - fruit.size <= gameOverLine) {
				// Settled fruit reaches or crosses the game over line - end the game
				gameRunningRef.current = false;
				setGameRunning(false);
				setShowGameOver(true);
				playGameOverSound();
				return;
			}
		}
	};

	const gameLoop = useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		// Draw background
		drawBackground(ctx);

		// Draw game over line
		ctx.strokeStyle = "#ff6b6b";
		ctx.lineWidth = 2;
		ctx.setLineDash([5, 5]);
		ctx.beginPath();
		ctx.moveTo(0, gameOverLine);
		ctx.lineTo(canvasWidth, gameOverLine);
		ctx.stroke();
		ctx.setLineDash([]);

		// Draw drop preview
		if (gameRunningRef.current) {
			ctx.globalAlpha = 0.5;
			ctx.font = `${fruitTypes[nextFruitTypeRef.current].size * 1.8}px Arial`;
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillText(
				fruitTypes[nextFruitTypeRef.current].emoji,
				dropPositionRef.current,
				30 // Adjusted preview position for smaller canvas
			);
			ctx.globalAlpha = 1;
		}

		// Update and draw fruits
		for (const fruit of fruitsRef.current) {
			updateFruit(fruit);
			drawFruit(ctx, fruit);
		}

		// Check for collisions
		for (let i = 0; i < fruitsRef.current.length; i++) {
			for (let j = i + 1; j < fruitsRef.current.length; j++) {
				checkCollision(fruitsRef.current[i], fruitsRef.current[j]);
			}
		}

		// Check for merges
		checkMerges();

		// Check game over
		if (gameRunningRef.current) {
			checkGameOverCondition();
		}

		animationFrameRef.current = requestAnimationFrame(gameLoop);
	}, []);

	const dropFruit = useCallback((x: number) => {
		if (!gameRunningRef.current) return;

		const clampedX = Math.max(
			fruitTypes[nextFruitTypeRef.current].size,
			Math.min(canvasWidth - fruitTypes[nextFruitTypeRef.current].size, x)
		);

		const newFruit: Fruit = {
			x: clampedX,
			y: spawnY, // Use the new spawn point
			type: nextFruitTypeRef.current,
			size: fruitTypes[nextFruitTypeRef.current].size,
			vx: 0,
			vy: 0,
			merged: false,
			age: 0,
		};

		fruitsRef.current.push(newFruit);
		playDropSound();

		const newNextFruit = getRandomNextFruit();
		nextFruitTypeRef.current = newNextFruit;
		setNextFruitType(newNextFruit);
	}, []);

	const restartGame = () => {
		fruitsRef.current = [];
		scoreRef.current = 0;
		const newNextFruit = getRandomNextFruit();

		setGameRunning(true);
		setScore(0);
		setNextFruitType(newNextFruit);
		setShowGameOver(false);
		setDropPosition(canvasWidth / 2);

		gameRunningRef.current = true;
		nextFruitTypeRef.current = newNextFruit;
		dropPositionRef.current = canvasWidth / 2;
	};

	const getCanvasPosition = (clientX: number): number => {
		if (!canvasRef.current) return 0;
		const rect = canvasRef.current.getBoundingClientRect();
		const x = (clientX - rect.left) / canvasScale;
		return Math.max(
			fruitTypes[nextFruitTypeRef.current].size,
			Math.min(canvasWidth - fruitTypes[nextFruitTypeRef.current].size, x)
		);
	};

	const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
		if (!gameRunningRef.current) return;
		const clampedX = getCanvasPosition(e.clientX);
		setDropPosition(clampedX);
		dropPositionRef.current = clampedX;
	};

	const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
		const x = getCanvasPosition(e.clientX);
		dropFruit(x);
	};

	const handleCanvasTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
		e.preventDefault();
		if (!gameRunningRef.current || e.touches.length === 0) return;

		const touch = e.touches[0];
		const clampedX = getCanvasPosition(touch.clientX);
		setDropPosition(clampedX);
		dropPositionRef.current = clampedX;
	};

	const handleCanvasTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
		e.preventDefault();
		if (e.touches.length === 0) return;

		const touch = e.touches[0];
		const x = getCanvasPosition(touch.clientX);
		dropFruit(x);
	};

	// Prevent default touch behaviors that might interfere
	const handleCanvasTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
		e.preventDefault();
	};

	useEffect(() => {
		const newNextFruit = getRandomNextFruit();
		setNextFruitType(newNextFruit);
		nextFruitTypeRef.current = newNextFruit;

		// Start game loop
		animationFrameRef.current = requestAnimationFrame(gameLoop);

		// Prevent default touch behaviors on the document for better mobile experience
		const preventDefaultTouch = (e: TouchEvent) => {
			if (e.target === canvasRef.current) {
				e.preventDefault();
			}
		};

		document.addEventListener("touchstart", preventDefaultTouch, {
			passive: false,
		});
		document.addEventListener("touchmove", preventDefaultTouch, {
			passive: false,
		});
		document.addEventListener("touchend", preventDefaultTouch, {
			passive: false,
		});

		return () => {
			if (animationFrameRef.current) {
				cancelAnimationFrame(animationFrameRef.current);
			}
			document.removeEventListener("touchstart", preventDefaultTouch);
			document.removeEventListener("touchmove", preventDefaultTouch);
			document.removeEventListener("touchend", preventDefaultTouch);
		};
	}, [gameLoop]);

	return (
		<div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center p-2 sm:p-5">
			{/* Animated Fruity Background */}
			<div className="absolute inset-0 bg-gradient-to-br from-pink-300 via-orange-200 to-yellow-300">
				<div className="absolute inset-0 opacity-20">
					{/* Floating fruit decorations */}
					<div
						className="absolute top-10 left-10 text-4xl animate-bounce"
						style={{ animationDelay: "0s", animationDuration: "3s" }}
					>
						🍎
					</div>
					<div
						className="absolute top-20 right-16 text-3xl animate-bounce"
						style={{ animationDelay: "0.5s", animationDuration: "4s" }}
					>
						🍊
					</div>
					<div
						className="absolute top-32 left-1/4 text-5xl animate-bounce"
						style={{ animationDelay: "1s", animationDuration: "3.5s" }}
					>
						🍉
					</div>
					<div
						className="absolute top-40 right-1/3 text-3xl animate-bounce"
						style={{ animationDelay: "1.5s", animationDuration: "4.5s" }}
					>
						🍌
					</div>
					<div
						className="absolute bottom-32 left-8 text-4xl animate-bounce"
						style={{ animationDelay: "2s", animationDuration: "3s" }}
					>
						🍓
					</div>
					<div
						className="absolute bottom-20 right-12 text-3xl animate-bounce"
						style={{ animationDelay: "2.5s", animationDuration: "4s" }}
					>
						🍑
					</div>
					<div
						className="absolute bottom-40 left-1/3 text-5xl animate-bounce"
						style={{ animationDelay: "3s", animationDuration: "3.5s" }}
					>
						🍍
					</div>
					<div
						className="absolute top-1/2 left-4 text-3xl animate-bounce"
						style={{ animationDelay: "3.5s", animationDuration: "4.5s" }}
					>
						🥝
					</div>
					<div
						className="absolute top-1/3 right-8 text-4xl animate-bounce"
						style={{ animationDelay: "4s", animationDuration: "3s" }}
					>
						🍇
					</div>
					<div
						className="absolute bottom-1/2 right-4 text-3xl animate-bounce"
						style={{ animationDelay: "4.5s", animationDuration: "4s" }}
					>
						🥭
					</div>
					<div
						className="absolute top-1/4 left-1/2 text-4xl animate-bounce"
						style={{ animationDelay: "5s", animationDuration: "3.5s" }}
					>
						638
						🍒
					</div>
					<div
						className="absolute bottom-1/4 left-1/2 text-3xl animate-bounce"
						style={{ animationDelay: "5.5s", animationDuration: "4.5s" }}
					>
						🍐
					</div>
				</div>
			</div>

			{/* Game Container */}
			<div
				ref={containerRef}
				className="bg-white/90 backdrop-blur-sm rounded-3xl p-3 sm:p-5 shadow-2xl w-full max-w-lg relative z-10 border-4 border-orange-300"
			>
				<div className="text-center mb-3 sm:mb-5">
					<h1 className="text-2xl sm:text-4xl font-bold text-red-500 mb-2 drop-shadow-lg animate-pulse">
						🍉 Watermelon Club
					</h1>
					<div className="text-lg sm:text-2xl text-teal-500 mb-2 font-bold">
						Score: <span className="text-orange-500">{score}</span>
					</div>
					<div className="text-base sm:text-xl text-gray-700 mb-2">
						Next:{" "}
						<span className="text-xl sm:text-2xl animate-pulse">
							{fruitTypes[nextFruitType].emoji}
						</span>
					</div>

					{/* Sound Toggle Button */}
					<button
						onClick={() => setSoundEnabled(!soundEnabled)}
						className="mb-2 px-3 py-1 rounded-full text-sm bg-gray-200 hover:bg-gray-300 transition-colors"
					>
						{soundEnabled ? "🔊" : "🔇"} Sound
					</button>
				</div>

				<div className="flex justify-center mb-3 sm:mb-0">
					<canvas
						ref={canvasRef}
						width={canvasWidth}
						height={canvasHeight}
						className="border-4 border-red-400 rounded-2xl cursor-crosshair touch-none select-none shadow-lg"
						onMouseMove={handleCanvasMouseMove}
						onClick={handleCanvasClick}
						onTouchMove={handleCanvasTouchMove}
						onTouchStart={handleCanvasTouchStart}
						onTouchEnd={handleCanvasTouchEnd}
					/>
				</div>

				<div className="flex justify-center mt-3 sm:mt-5">
					<button
						onClick={restartGame}
						className="px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-red-400 to-pink-400 text-white font-bold rounded-full shadow-lg hover:from-red-500 hover:to-pink-500 transition-all duration-200 transform hover:scale-105 active:scale-95"
					>
						🔄 Restart Game
					</button>
				</div>

				{/* Game Instructions */}
				<div className="text-center mt-3 text-xs sm:text-sm text-gray-600">
					<p className="mb-1">🎯 Drop fruits to merge identical ones!</p>
					<p className="mb-1">🍉 Reach the watermelon to win!</p>
					<p>⚠️ Don't let fruits pile up to the red line!</p>
				</div>
			</div>

			{/* Game Over Modal */}
			{showGameOver && (
				<div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
					<div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border-4 border-red-400 text-center">
						<div className="text-6xl mb-4 animate-bounce">💥</div>
						<h2 className="text-2xl sm:text-3xl font-bold text-red-500 mb-4">
							Game Over!
						when the fruits pile up to the red line</h2>
						<div className="text-lg sm:text-xl text-gray-700 mb-6">
							Final Score:{" "}
							<span className="font-bold text-orange-500">{score}</span>
						</div>
						<div className="space-y-3">
							<button
								onClick={restartGame}
								className="w-full px-6 py-3 bg-gradient-to-r from-green-400 to-blue-400 text-white font-bold rounded-full shadow-lg hover:from-green-500 hover:to-blue-500 transition-all duration-200 transform hover:scale-105"
							>
								🎮 Play Again
							</button>
							<button
								onClick={() => setShowGameOver(false)}
								className="w-full px-6 py-3 bg-gray-300 text-gray-700 font-bold rounded-full shadow-lg hover:bg-gray-400 transition-all duration-200"
							>
								❌ Close
							</button>
						</div>
					</div>
				</div>
			)}

			{/* High Score Display (if you want to add this feature) */}
			<div className="absolute top-4 right-4 bg-white/80 backdrop-blur-sm rounded-2xl p-3 shadow-lg border-2 border-yellow-300">
				<div className="text-center">
					<div className="text-xs text-gray-600 mb-1">Best Score</div>
					<div className="text-lg font-bold text-yellow-600">
						{typeof window !== "undefined"
							? Math.max(
									score,
									parseInt(localStorage.getItem("watermelon-best") || "0")
							  )
							: score}
					</div>
				</div>
			</div>
		</div>
	);
};

export default WatermelonClub;