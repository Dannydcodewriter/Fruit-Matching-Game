"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";

interface FruitType {
	emoji: string;
	size: number;
	points: number;
	name: string;
	color: string;
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
	rotation: number;
	angularVelocity: number;
}

interface Particle {
	x: number;
	y: number;
	vx: number;
	vy: number;
	size: number;
	alpha: number;
	color: string;
	lifetime: number;
	text?: string;
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

	const fruitsRef = useRef<Fruit[]>([]);
	const particlesRef = useRef<Particle[]>([]);
	const scoreRef = useRef(0);
	const gameRunningRef = useRef(true);
	const nextFruitTypeRef = useRef(0);
	const dropPositionRef = useRef(150);

	const animationFrameRef = useRef<number>(0);
	const [soundEnabled, setSoundEnabled] = useState(true);

	const fruitTypes: FruitType[] = [
		{ emoji: "🍒", size: 18, points: 1, name: "Cherry", color: "#FF0000" },
		{ emoji: "🍓", size: 22, points: 3, name: "Strawberry", color: "#FF4040" },
		{ emoji: "🍇", size: 26, points: 6, name: "Grape", color: "#800080" },
		{ emoji: "🍊", size: 30, points: 10, name: "Orange", color: "#FFA500" },
		{ emoji: "🍎", size: 34, points: 15, name: "Apple", color: "#FF3030" },
		{ emoji: "🍐", size: 38, points: 21, name: "Pear", color: "#C5E17A" },
		{ emoji: "🍑", size: 42, points: 28, name: "Peach", color: "#FF9999" },
		{ emoji: "🍍", size: 46, points: 36, name: "Pineapple", color: "#FFC107" },
		{ emoji: "🍈", size: 50, points: 45, name: "Melon", color: "#90EE90" },
		{ emoji: "🍉", size: 54, points: 55, name: "Watermelon", color: "#FF5E62" },
	];

	const gravity = 0.5;
	const bounce = 0.7;
	const friction = 0.99;
	const gameOverLine = 100;
	const spawnY = 40;
	const canvasWidth = 400;
	const canvasHeight = 500;

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
			// Silently fail
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

	const playWinSound = () => {
		playSound(400, 0.4, "sine");
		setTimeout(() => playSound(600, 0.4, "sine"), 200);
	};

	useEffect(() => {
		const handleResize = () => {
			if (containerRef.current && canvasRef.current) {
				const containerWidth = containerRef.current.clientWidth - 40;
				const scale = Math.min(1, containerWidth / canvasWidth);
				setCanvasScale(scale);

				const canvas = canvasRef.current;
				canvas.style.width = `${canvasWidth * scale}px`;
				canvas.style.height = `${canvasHeight * scale}px`;
			}
		};

		handleResize();
		window.addEventListener("resize", handleResize);

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
		fruit.vy += gravity;
		fruit.x += fruit.vx;
		fruit.y += fruit.vy;
		fruit.vx *= friction;
		fruit.vy *= friction;

		fruit.angularVelocity += (fruit.vx / fruit.size) * 0.1;
		fruit.rotation += fruit.angularVelocity;
		fruit.angularVelocity *= 0.98;

		if (fruit.x - fruit.size < 0) {
			fruit.x = fruit.size;
			fruit.vx = -fruit.vx * bounce;
			fruit.angularVelocity = -fruit.angularVelocity * bounce;
		}
		if (fruit.x + fruit.size > canvasWidth) {
			fruit.x = canvasWidth - fruit.size;
			fruit.vx = -fruit.vx * bounce;
			fruit.angularVelocity = -fruit.angularVelocity * bounce;
		}
		if (fruit.y + fruit.size > canvasHeight) {
			fruit.y = canvasHeight - fruit.size;
			fruit.vy = -fruit.vy * bounce;
			fruit.angularVelocity += (fruit.vx / fruit.size) * 0.5;
		}
	};

	const updateParticle = (particle: Particle): void => {
		particle.x += particle.vx;
		particle.y += particle.vy;
		if (!particle.text) {
			particle.vy += gravity * 0.2;
			particle.vx *= 0.98;
			particle.vy *= 0.98;
		} else {
			particle.vy = -1;
		}
		particle.alpha -= 1 / particle.lifetime;
	};

	const drawBackground = (ctx: CanvasRenderingContext2D): void => {
		const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
		gradient.addColorStop(0, "#87CEEB");
		gradient.addColorStop(0.7, "#98FB98");
		gradient.addColorStop(1, "#90EE90");
		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, canvasWidth, canvasHeight);

		ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
		ctx.beginPath();
		ctx.arc(60, 45, 18, 0, Math.PI * 2);
		ctx.arc(75, 45, 25, 0, Math.PI * 2);
		ctx.arc(90, 45, 18, 0, Math.PI * 2);
		ctx.fill();

		ctx.beginPath();
		ctx.arc(210, 30, 15, 0, Math.PI * 2);
		ctx.arc(220, 30, 22, 0, Math.PI * 2);
		ctx.arc(235, 30, 15, 0, Math.PI * 2);
		ctx.fill();

		ctx.beginPath();
		ctx.arc(260, 60, 12, 0, Math.PI * 2);
		ctx.arc(270, 60, 18, 0, Math.PI * 2);
		ctx.arc(280, 60, 12, 0, Math.PI * 2);
		ctx.fill();

		ctx.fillStyle = "#228B22";
		ctx.fillRect(0, canvasHeight - 25, canvasWidth, 25);

		ctx.fillStyle = "#32CD32";
		for (let i = 0; i < canvasWidth; i += 12) {
			ctx.fillRect(i, canvasHeight - 20, 2, 12);
			ctx.fillRect(i + 4, canvasHeight - 16, 1, 8);
			ctx.fillRect(i + 8, canvasHeight - 20, 2, 12);
		}

		ctx.fillStyle = "#FFD700";
		ctx.beginPath();
		ctx.arc(260, 40, 15, 0, Math.PI * 2);
		ctx.fill();

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
		ctx.rotate(fruit.rotation);

		ctx.globalAlpha = 0.2;
		ctx.fillStyle = "black";
		ctx.beginPath();
		ctx.arc(2, fruit.size + 2, fruit.size, 0, Math.PI * 2);
		ctx.fill();

		ctx.globalAlpha = 1;
		ctx.font = `${fruit.size * 1.8}px Arial`;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(fruitTypes[fruit.type].emoji, 0, 0);

		ctx.restore();
	};

	const drawParticle = (
		ctx: CanvasRenderingContext2D,
		particle: Particle
	): void => {
		if (particle.alpha <= 0) return;

		ctx.save();
		ctx.globalAlpha = particle.alpha;
		if (particle.text) {
			ctx.font = "20px Arial";
			ctx.fillStyle = particle.color;
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillText(particle.text, particle.x, particle.y);
		} else {
			ctx.fillStyle = particle.color;
			ctx.beginPath();
			ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
			ctx.fill();
		}
		ctx.restore();
	};

	const checkCollision = (fruit1: Fruit, fruit2: Fruit): boolean => {
		if (fruit1.merged || fruit2.merged) return false;

		const dx = fruit1.x - fruit2.x;
		const dy = fruit1.y - fruit2.y;
		const distance = Math.sqrt(dx * dx + dy * dy);
		const minDistance = fruit1.size + fruit2.size;

		if (distance < minDistance) {
			const overlap = minDistance - distance;
			const separateX = (dx / distance) * overlap * 0.5;
			const separateY = (dy / distance) * overlap * 0.5;

			fruit1.x += separateX;
			fruit1.y += separateY;
			fruit2.x -= separateX;
			fruit2.y -= separateY;

			const tempVx = fruit1.vx;
			const tempVy = fruit1.vy;
			fruit1.vx = fruit2.vx * bounce;
			fruit1.vy = fruit2.vy * bounce;
			fruit2.vx = tempVx * bounce;
			fruit2.vy = tempVy * bounce;

			const relativeVx = fruit2.vx - fruit1.vx;
			fruit1.angularVelocity += (relativeVx / fruit1.size) * 0.1;
			fruit2.angularVelocity -= (relativeVx / fruit2.size) * 0.1;

			return true;
		}

		return false;
	};

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

		const dx = fruit1.x - fruit2.x;
		const dy = fruit1.y - fruit2.y;
		const distance = Math.sqrt(dx * dx + dy * dy);
		const touchDistance = fruit1.size + fruit2.size;

		return distance <= touchDistance + 1;
	};

	const hasLineOfSight = (fruit1: Fruit, fruit2: Fruit): boolean => {
		const dx = fruit2.x - fruit1.x;
		const dy = fruit2.y - fruit1.y;
		const distance = Math.sqrt(dx * dx + dy * dy);

		for (const obstacle of fruitsRef.current) {
			if (obstacle === fruit1 || obstacle === fruit2 || obstacle.merged) {
				continue;
			}

			const A = dy;
			const B = -dx;
			const C = dx * fruit1.y - dy * fruit1.x;
			const distanceToLine =
				Math.abs(A * obstacle.x + B * obstacle.y + C) / distance;

			if (distanceToLine < obstacle.size) {
				const t =
					((obstacle.x - fruit1.x) * dx + (obstacle.y - fruit1.y) * dy) /
					(distance * distance);
				if (t > 0 && t < 1) {
					return false;
				}
			}
		}
		return true;
	};

	const createSplashParticles = (
		x: number,
		y: number,
		fruitType: number,
		points: number
	): void => {
		const particleCount = 20;
		const color = fruitTypes[fruitType].color;

		for (let i = 0; i < particleCount; i++) {
			const angle = Math.random() * Math.PI * 2;
			const speed = Math.random() * 5 + 2;
			const particle: Particle = {
				x,
				y,
				vx: Math.cos(angle) * speed,
				vy: Math.sin(angle) * speed - 2,
				size: Math.random() * 3 + 2,
				alpha: 1,
				color,
				lifetime: 60,
			};
			particlesRef.current.push(particle);
		}

		const scoreParticle: Particle = {
			x,
			y,
			vx: 0,
			vy: -1,
			size: 20,
			alpha: 1,
			color: "#000000",
			lifetime: 90,
			text: `+${points}`,
		};
		particlesRef.current.push(scoreParticle);
	};

	const checkMerges = (): void => {
		const toRemove: number[] = [];
		const toAdd: Fruit[] = [];

		for (let i = 0; i < fruitsRef.current.length; i++) {
			if (fruitsRef.current[i].merged) continue;

			for (let j = i + 1; j < fruitsRef.current.length; j++) {
				if (fruitsRef.current[j].merged) continue;

				if (
					canMerge(fruitsRef.current[i], fruitsRef.current[j]) &&
					hasLineOfSight(fruitsRef.current[i], fruitsRef.current[j])
				) {
					const mergeX = (fruitsRef.current[i].x + fruitsRef.current[j].x) / 2;
					const mergeY = (fruitsRef.current[i].y + fruitsRef.current[j].y) / 2;
					const newType = fruitsRef.current[i].type + 1;
					const points = fruitTypes[newType].points;

					createSplashParticles(
						mergeX,
						mergeY,
						fruitsRef.current[i].type,
						points
					);

					fruitsRef.current[i].merged = true;
					fruitsRef.current[j].merged = true;
					toRemove.push(i, j);

					const mergedFruit: Fruit = {
						x: mergeX,
						y: mergeY,
						type: newType,
						size: fruitTypes[newType].size,
						vx: 0,
						vy: -2,
						merged: false,
						age: 0,
						rotation: 0,
						angularVelocity: 0,
					};
					toAdd.push(mergedFruit);

					addScore(points);
					playMergeSound(newType);

					if (newType === fruitTypes.length - 1) {
						fruitsRef.current = [];
						particlesRef.current = [];
						scoreRef.current = 0;
						setScore(0);
						const newNextFruit = getRandomNextFruit();
						nextFruitTypeRef.current = newNextFruit;
						setNextFruitType(newNextFruit);
						dropPositionRef.current = canvasWidth / 2;
						setDropPosition(canvasWidth / 2);
						playWinSound();
					}

					break;
				}
			}
		}

		fruitsRef.current = fruitsRef.current.filter((fruit) => !fruit.merged);
		fruitsRef.current.push(...toAdd);
	};

	const hasPossibleMerges = (): boolean => {
		for (let i = 0; i < fruitsRef.current.length; i++) {
			if (fruitsRef.current[i].merged) continue;

			for (let j = i + 1; j < fruitsRef.current.length; j++) {
				if (fruitsRef.current[j].merged) continue;

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
		for (const fruit of fruitsRef.current) {
			const isSettled = Math.abs(fruit.vy) < 0.1 && Math.abs(fruit.vx) < 0.1;
			if (isSettled && fruit.y - fruit.size <= gameOverLine) {
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

		drawBackground(ctx);

		ctx.strokeStyle = "#ff6b6b";
		ctx.lineWidth = 2;
		ctx.setLineDash([5, 5]);
		ctx.beginPath();
		ctx.moveTo(0, gameOverLine);
		ctx.lineTo(canvasWidth, gameOverLine);
		ctx.stroke();
		ctx.setLineDash([]);

		if (gameRunningRef.current) {
			ctx.globalAlpha = 0.5;
			ctx.font = `${fruitTypes[nextFruitTypeRef.current].size * 1.8}px Arial`;
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillText(
				fruitTypes[nextFruitTypeRef.current].emoji,
				dropPositionRef.current,
				30
			);
			ctx.globalAlpha = 1;
		}

		particlesRef.current = particlesRef.current.filter((p) => p.alpha > 0);
		for (const particle of particlesRef.current) {
			updateParticle(particle);
			drawParticle(ctx, particle);
		}

		for (const fruit of fruitsRef.current) {
			updateFruit(fruit);
			drawFruit(ctx, fruit);
		}

		for (let i = 0; i < fruitsRef.current.length; i++) {
			for (let j = i + 1; j < fruitsRef.current.length; j++) {
				checkCollision(fruitsRef.current[i], fruitsRef.current[j]);
			}
		}

		checkMerges();

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
			y: spawnY,
			type: nextFruitTypeRef.current,
			size: fruitTypes[nextFruitTypeRef.current].size,
			vx: 0,
			vy: 0,
			merged: false,
			age: 0,
			rotation: 0,
			angularVelocity: Math.random() * 0.1 - 0.05,
		};

		fruitsRef.current.push(newFruit);
		playDropSound();

		const newNextFruit = getRandomNextFruit();
		nextFruitTypeRef.current = newNextFruit;
		setNextFruitType(newNextFruit);
	}, []);

	const restartGame = () => {
		fruitsRef.current = [];
		particlesRef.current = [];
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

	const handleCanvasTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
		e.preventDefault();
	};

	useEffect(() => {
		const newNextFruit = getRandomNextFruit();
		setNextFruitType(newNextFruit);
		nextFruitTypeRef.current = newNextFruit;

		animationFrameRef.current = requestAnimationFrame(gameLoop);

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
			<div className="absolute inset-0 bg-gradient-to-br from-pink-300 via-orange-200 to-yellow-300">
				<div className="absolute inset-0 opacity-20">
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

			<div
				ref={containerRef}
				className="bg-white/90 mt-20 backdrop-blur-sm rounded-3xl p-3 sm:p-5 shadow-2xl w-full max-w-lg relative z-10 border-4 border-orange-300"
			>
				<div className="text-center mb-4 sm:mb-5">
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

					<button
						onClick={() => setSoundEnabled(!soundEnabled)}
						className="mb-2 px-3 py-1 rounded-full text-black text-sm bg-gray-200 hover:bg-gray-300 transition-colors"
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
			</div>

			{showGameOver && (
				<div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
					<div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border-4 border-red-400 text-center">
						<div className="text-6xl mb-4 animate-bounce">💥</div>
						<h2 className="text-2xl sm:text-3xl font-bold text-red-500 mb-4">
							Game Over!
						</h2>
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

			<div className="absolute top-4 right-4 flex space-x-4">
				<div className="bg-white/80 backdrop-blur-sm rounded-2xl p-3 shadow-lg border-2 border-yellow-300">
					<div className="text-center">
						<div className="text-xs text-gray-600 mb-1">
							Your Highest Score:
						</div>
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
				<div className="bg-white/80 backdrop-blur-sm rounded-2xl p-3 shadow-lg border-2 border-yellow-300">
					<div className="text-center">
						<div className="text-xs text-gray-600 mb-1">
							Tournament Highest Score:
						</div>
						<div className="text-lg font-bold text-yellow-600">
							{typeof window !== "undefined"
								? parseInt(
										localStorage.getItem("watermelon-tournament-best") || "0"
								  )
								: 0}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default WatermelonClub;
