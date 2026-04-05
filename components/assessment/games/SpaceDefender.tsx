import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameComponentProps, GameResult } from '../../../types';
import { GameIntro } from '../shared/GameIntro';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type GamePhase = 'intro' | 'countdown' | 'playing' | 'gameover' | 'complete';

interface Vec2 { x: number; y: number; }

interface Asteroid {
  id: number;
  x: number; y: number;
  vx: number; vy: number;
  radius: number;
  rotation: number;
  rotSpeed: number;
  vertices: number[]; // radii offsets for irregular shape
}

interface Alien {
  id: number;
  x: number; y: number;
  baseX: number;
  speed: number;
  amplitude: number;
  phase: number;
  health: number;
  lastShot: number;
  shotInterval: number;
}

interface Bullet {
  id: number;
  x: number; y: number;
  vx: number; vy: number;
  isPlayer: boolean;
}

interface PowerUp {
  id: number;
  x: number; y: number;
  vy: number;
  type: 'shield' | 'rapid' | 'fuel';
  pulse: number;
}

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface BehaviorEvent {
  timestamp: number;
  type: 'dodge' | 'shoot' | 'collect' | 'hit' | 'death' | 'position' | 'strategy_shift';
  data: any;
}

interface GameState {
  player: { x: number; y: number; width: number; height: number };
  lives: number;
  score: number;
  fuel: number;
  maxFuel: number;
  asteroids: Asteroid[];
  aliens: Alien[];
  playerBullets: Bullet[];
  alienBullets: Bullet[];
  powerUps: PowerUp[];
  particles: Particle[];
  shieldActive: boolean;
  shieldTimer: number;
  rapidFireActive: boolean;
  rapidFireTimer: number;
  lastShotTime: number;
  enemiesDestroyed: number;
  powerUpsCollected: number;
  shotsFired: number;
  shotsHit: number;
  dodgeCount: number;
  nearMissTotal: number;
  riskEvents: number;
  shieldPickups: number;
  rapidPickups: number;
  fuelPickups: number;
  invincibleTimer: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const CANVAS_W = 800;
const CANVAS_H = 600;
const GAME_DURATION = 180; // seconds
const PLAYER_SPEED = 5;
const BULLET_SPEED = 8;
const SHOT_COOLDOWN = 250; // ms
const RAPID_SHOT_COOLDOWN = 100;
const SHIELD_DURATION = 5000;
const RAPID_DURATION = 6000;
const FUEL_DRAIN_RATE = 0.08; // per frame (~60fps)
const FUEL_MAX = 100;
const NEAR_MISS_THRESHOLD = 30; // px
const INVINCIBLE_AFTER_HIT = 1500; // ms

// ---------------------------------------------------------------------------
// Star background (static)
// ---------------------------------------------------------------------------
function generateStars(count: number): { x: number; y: number; size: number; brightness: number }[] {
  const stars = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * CANVAS_W,
      y: Math.random() * CANVAS_H,
      size: Math.random() * 2 + 0.5,
      brightness: Math.random() * 0.6 + 0.4,
    });
  }
  return stars;
}

function generateAsteroidVertices(): number[] {
  const count = 8 + Math.floor(Math.random() * 5);
  const verts: number[] = [];
  for (let i = 0; i < count; i++) {
    verts.push(0.7 + Math.random() * 0.6); // radius multiplier 0.7-1.3
  }
  return verts;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export const SpaceDefender: React.FC<GameComponentProps> = ({ section, onComplete, onExit, onXPGain }) => {
  const [phase, setPhase] = useState<GamePhase>('intro');
  const [countdown, setCountdown] = useState(3);
  const [displayScore, setDisplayScore] = useState(0);
  const [displayTime, setDisplayTime] = useState(GAME_DURATION);
  const [displayLives, setDisplayLives] = useState(3);
  const [displayFuel, setDisplayFuel] = useState(100);
  const [finalStats, setFinalStats] = useState<{ score: number; time: number; enemies: number; powerUps: number } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useRef<GameState | null>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const touchRef = useRef<{ left: boolean; right: boolean; shoot: boolean }>({ left: false, right: false, shoot: false });
  const animFrameRef = useRef<number>(0);
  const gameStartTimeRef = useRef(0);
  const lastFrameTimeRef = useRef(0);
  const nextIdRef = useRef(1);
  const starsRef = useRef(generateStars(200));
  const behaviorLogRef = useRef<BehaviorEvent[]>([]);
  const lastPositionLogRef = useRef(0);
  const lastAsteroidSpawnRef = useRef(0);
  const lastAlienSpawnRef = useRef(0);
  const lastPowerUpSpawnRef = useRef(0);
  const phaseRef = useRef<GamePhase>('intro');
  const reactionTrackingRef = useRef<Map<number, number>>(new Map()); // threatId -> appearTime
  const reactionTimesRef = useRef<number[]>([]);
  const firstMinuteScoreRef = useRef(0);
  const firstMinuteAccuracyRef = useRef({ hits: 0, shots: 0 });
  const positionHistoryRef = useRef<number[]>([]); // x positions for heatmap

  const getId = () => nextIdRef.current++;

  // Keep phaseRef in sync
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // ----- Countdown -----
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdown <= 0) {
      setPhase('playing');
      return;
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  // ----- Keyboard listeners -----
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD', 'Space'].includes(e.code)) {
        e.preventDefault();
        keysRef.current.add(e.code);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.code);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // ----- Touch listeners -----
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = () => canvas.getBoundingClientRect();

    const handleTouch = (e: TouchEvent) => {
      e.preventDefault();
      const r = rect();
      touchRef.current = { left: false, right: false, shoot: false };
      for (let i = 0; i < e.touches.length; i++) {
        const t = e.touches[i];
        const relX = (t.clientX - r.left) / r.width;
        if (relX < 0.33) touchRef.current.left = true;
        else if (relX > 0.66) touchRef.current.right = true;
        else touchRef.current.shoot = true;
      }
    };
    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 0) {
        touchRef.current = { left: false, right: false, shoot: false };
      } else {
        handleTouch(e);
      }
    };

    canvas.addEventListener('touchstart', handleTouch, { passive: false });
    canvas.addEventListener('touchmove', handleTouch, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false });
    return () => {
      canvas.removeEventListener('touchstart', handleTouch);
      canvas.removeEventListener('touchmove', handleTouch);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [phase]);

  // ----- Log behavior event -----
  const logEvent = useCallback((type: BehaviorEvent['type'], data: any) => {
    const ts = Date.now() - gameStartTimeRef.current;
    behaviorLogRef.current.push({ timestamp: ts, type, data });
  }, []);

  // ----- Initialize game state -----
  const initGameState = useCallback((): GameState => {
    return {
      player: { x: CANVAS_W / 2, y: CANVAS_H - 60, width: 30, height: 36 },
      lives: 3,
      score: 0,
      fuel: FUEL_MAX,
      maxFuel: FUEL_MAX,
      asteroids: [],
      aliens: [],
      playerBullets: [],
      alienBullets: [],
      powerUps: [],
      particles: [],
      shieldActive: false,
      shieldTimer: 0,
      rapidFireActive: false,
      rapidFireTimer: 0,
      lastShotTime: 0,
      enemiesDestroyed: 0,
      powerUpsCollected: 0,
      shotsFired: 0,
      shotsHit: 0,
      dodgeCount: 0,
      nearMissTotal: 0,
      riskEvents: 0,
      shieldPickups: 0,
      rapidPickups: 0,
      fuelPickups: 0,
      invincibleTimer: 0,
    };
  }, []);

  // ----- Spawn helpers -----
  const spawnAsteroid = useCallback((difficulty: number): Asteroid => {
    const radius = 12 + Math.random() * 20;
    const speed = 1.5 + Math.random() * 2 + difficulty * 0.5;
    return {
      id: getId(),
      x: Math.random() * (CANVAS_W - 40) + 20,
      y: -radius,
      vx: (Math.random() - 0.5) * 2,
      vy: speed,
      radius,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.04,
      vertices: generateAsteroidVertices(),
    };
  }, []);

  const spawnAlien = useCallback((difficulty: number): Alien => {
    const x = Math.random() * (CANVAS_W - 60) + 30;
    return {
      id: getId(),
      x,
      y: -20,
      baseX: x,
      speed: 1 + difficulty * 0.3,
      amplitude: 60 + Math.random() * 40,
      phase: Math.random() * Math.PI * 2,
      health: 1 + Math.floor(difficulty * 0.5),
      lastShot: Date.now(),
      shotInterval: 2000 - difficulty * 200,
    };
  }, []);

  const spawnPowerUp = useCallback((): PowerUp => {
    const types: PowerUp['type'][] = ['shield', 'rapid', 'fuel'];
    return {
      id: getId(),
      x: Math.random() * (CANVAS_W - 40) + 20,
      y: -15,
      vy: 1.5 + Math.random(),
      type: types[Math.floor(Math.random() * types.length)],
      pulse: 0,
    };
  }, []);

  const spawnExplosion = useCallback((x: number, y: number, color: string, count: number): Particle[] => {
    const particles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 30 + Math.random() * 20,
        maxLife: 50,
        color,
        size: 2 + Math.random() * 3,
      });
    }
    return particles;
  }, []);

  // ----- Distance helper -----
  const dist = (a: Vec2, b: Vec2) => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);

  // ----- Compute behavioral metrics -----
  const computeMetrics = useCallback((gs: GameState, timeSurvivedSec: number) => {
    const log = behaviorLogRef.current;
    const reactionTimes = reactionTimesRef.current;

    // Average reaction time
    const avgReactionTime = reactionTimes.length > 0
      ? reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length
      : 2000;

    // Processing speed: successful dodges per threat (0-100)
    const totalThreats = gs.dodgeCount + (3 - gs.lives);
    const processingSpeed = totalThreats > 0
      ? Math.min(100, Math.round((gs.dodgeCount / Math.max(1, totalThreats)) * 100))
      : 50;

    // Multitasking: shooting accuracy while dodging (combined metric)
    const accuracy = gs.shotsFired > 0 ? gs.shotsHit / gs.shotsFired : 0;
    const survivalRate = totalThreats > 0 ? gs.dodgeCount / Math.max(1, totalThreats) : 0.5;
    const multitaskingScore = Math.min(100, Math.round((accuracy * 0.5 + survivalRate * 0.5) * 100));

    // Risk tolerance: narrow gaps + risky power-up grabs
    const riskTolerance = Math.min(100, Math.round(
      (gs.riskEvents / Math.max(1, timeSurvivedSec / 10)) * 25 +
      (gs.nearMissTotal / Math.max(1, gs.dodgeCount)) * 15
    ));

    // Defensive vs. Offensive: shield preference vs rapid fire preference
    const totalDefOff = gs.shieldPickups + gs.rapidPickups;
    const defensiveVsOffensive = totalDefOff > 0
      ? Math.round((gs.rapidPickups / totalDefOff) * 100)
      : 50; // 0 = pure defensive, 100 = pure offensive

    // Resource management: fuel efficiency
    const resourceManagement = Math.min(100, Math.round((gs.fuel / FUEL_MAX) * 50 + (timeSurvivedSec / GAME_DURATION) * 50));

    // Decision speed: based on reaction times
    const decisionSpeed = Math.min(100, Math.round(Math.max(0, 100 - (avgReactionTime - 200) / 10)));

    // Adaptability: strategy change detection
    const shootEvents = log.filter(e => e.type === 'shoot');
    const firstHalfShoots = shootEvents.filter(e => e.timestamp < timeSurvivedSec * 500).length;
    const secondHalfShoots = shootEvents.filter(e => e.timestamp >= timeSurvivedSec * 500).length;
    const shootRateChange = Math.abs(firstHalfShoots - secondHalfShoots) / Math.max(1, firstHalfShoots + secondHalfShoots);
    const collectEvents = log.filter(e => e.type === 'collect');
    const firstHalfCollects = collectEvents.filter(e => e.timestamp < timeSurvivedSec * 500).length;
    const secondHalfCollects = collectEvents.filter(e => e.timestamp >= timeSurvivedSec * 500).length;
    const collectRateChange = Math.abs(firstHalfCollects - secondHalfCollects) / Math.max(1, firstHalfCollects + secondHalfCollects);
    const adaptability = Math.min(100, Math.round((shootRateChange + collectRateChange) * 80 + 20));

    // Composure under pressure: final minute vs first minute performance
    const fm = firstMinuteScoreRef.current;
    const fmAcc = firstMinuteAccuracyRef.current;
    const firstMinutePerf = fmAcc.shots > 0 ? fmAcc.hits / fmAcc.shots : 0.5;
    const finalAccuracy = gs.shotsFired > fmAcc.shots
      ? (gs.shotsHit - fmAcc.hits) / Math.max(1, gs.shotsFired - fmAcc.shots)
      : firstMinutePerf;
    const composureUnderPressure = Math.min(100, Math.round(
      (finalAccuracy / Math.max(0.01, firstMinutePerf)) * 50 + 25
    ));

    // Position heatmap analysis
    const positions = positionHistoryRef.current;
    const centerCount = positions.filter(x => x > CANVAS_W * 0.3 && x < CANVAS_W * 0.7).length;
    const centerRatio = positions.length > 0 ? centerCount / positions.length : 0.5;

    return {
      avgReactionTime: Math.round(avgReactionTime),
      processingSpeed,
      multitaskingScore,
      riskTolerance,
      defensiveVsOffensive,
      resourceManagement,
      decisionSpeed,
      adaptability,
      composureUnderPressure,
      _accuracy: Math.round(accuracy * 100),
      _centerRatio: Math.round(centerRatio * 100),
      _firstMinuteScore: fm,
    };
  }, []);

  // ----- Start the game -----
  const handleStart = useCallback(() => {
    setCountdown(3);
    setPhase('countdown');
  }, []);

  // ----- Main game loop (runs when phase === 'playing') -----
  useEffect(() => {
    if (phase !== 'playing') return;

    const gs = initGameState();
    gameStateRef.current = gs;
    gameStartTimeRef.current = Date.now();
    lastFrameTimeRef.current = Date.now();
    behaviorLogRef.current = [];
    reactionTrackingRef.current = new Map();
    reactionTimesRef.current = [];
    firstMinuteScoreRef.current = 0;
    firstMinuteAccuracyRef.current = { hits: 0, shots: 0 };
    positionHistoryRef.current = [];
    lastPositionLogRef.current = 0;
    lastAsteroidSpawnRef.current = 0;
    lastAlienSpawnRef.current = 0;
    lastPowerUpSpawnRef.current = 0;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const stars = starsRef.current;

    // ----- Drawing functions -----
    const drawBackground = (elapsed: number) => {
      // Gradient background
      const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
      grad.addColorStop(0, '#0a0a1a');
      grad.addColorStop(0.5, '#0d1033');
      grad.addColorStop(1, '#090918');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Stars with twinkle
      for (const s of stars) {
        const twinkle = 0.5 + Math.sin(elapsed * 0.002 + s.x * 0.1) * 0.3;
        ctx.globalAlpha = s.brightness * twinkle;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(s.x, (s.y + elapsed * 0.02 * s.size) % CANVAS_H, s.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const drawPlayer = (px: number, py: number, pw: number, ph: number, shielded: boolean, invincible: boolean) => {
      ctx.save();
      ctx.translate(px, py);

      // Engine glow
      const engineGlow = ctx.createRadialGradient(0, ph * 0.4, 2, 0, ph * 0.5, 12);
      engineGlow.addColorStop(0, 'rgba(0, 200, 255, 0.8)');
      engineGlow.addColorStop(1, 'rgba(0, 100, 255, 0)');
      ctx.fillStyle = engineGlow;
      ctx.beginPath();
      ctx.arc(0, ph * 0.4, 12 + Math.random() * 4, 0, Math.PI * 2);
      ctx.fill();

      // Ship body
      if (invincible && Math.floor(Date.now() / 80) % 2 === 0) {
        ctx.globalAlpha = 0.4;
      }
      ctx.fillStyle = '#22c55e';
      ctx.strokeStyle = '#4ade80';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -ph / 2);           // nose
      ctx.lineTo(-pw / 2, ph / 2);      // bottom-left
      ctx.lineTo(-pw / 6, ph / 3);      // inner-left
      ctx.lineTo(pw / 6, ph / 3);       // inner-right
      ctx.lineTo(pw / 2, ph / 2);       // bottom-right
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Cockpit
      ctx.fillStyle = '#86efac';
      ctx.beginPath();
      ctx.ellipse(0, -ph * 0.1, pw * 0.15, ph * 0.15, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 1;

      // Shield bubble
      if (shielded) {
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, pw * 0.9, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
        ctx.fill();
      }

      ctx.restore();
    };

    const drawAsteroid = (a: Asteroid) => {
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(a.rotation);

      const verts = a.vertices;
      const step = (Math.PI * 2) / verts.length;
      ctx.beginPath();
      for (let i = 0; i < verts.length; i++) {
        const angle = step * i;
        const r = a.radius * verts[i];
        const px = Math.cos(angle) * r;
        const py = Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();

      ctx.fillStyle = '#555566';
      ctx.strokeStyle = '#888899';
      ctx.lineWidth = 1.5;
      ctx.fill();
      ctx.stroke();

      // Crater detail
      ctx.fillStyle = '#444455';
      ctx.beginPath();
      ctx.arc(a.radius * 0.2, -a.radius * 0.15, a.radius * 0.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    };

    const drawAlien = (a: Alien, elapsed: number) => {
      ctx.save();
      ctx.translate(a.x, a.y);

      // Body glow
      const glow = ctx.createRadialGradient(0, 0, 3, 0, 0, 20);
      glow.addColorStop(0, 'rgba(239, 68, 68, 0.4)');
      glow.addColorStop(1, 'rgba(239, 68, 68, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, 20, 0, Math.PI * 2);
      ctx.fill();

      // Alien body (inverted triangle)
      ctx.fillStyle = '#ef4444';
      ctx.strokeStyle = '#f87171';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, 12);       // bottom point
      ctx.lineTo(-14, -8);     // top-left
      ctx.lineTo(14, -8);      // top-right
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Eye
      const eyePulse = Math.sin(elapsed * 0.005 + a.phase) * 0.3 + 0.7;
      ctx.fillStyle = `rgba(255, 255, 100, ${eyePulse})`;
      ctx.beginPath();
      ctx.arc(0, -2, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    };

    const drawBullet = (b: Bullet) => {
      ctx.save();
      ctx.translate(b.x, b.y);

      if (b.isPlayer) {
        // Green with trail
        ctx.fillStyle = '#4ade80';
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();
        // Trail
        ctx.fillStyle = 'rgba(74, 222, 128, 0.3)';
        ctx.beginPath();
        ctx.arc(0, 4, 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Red alien bullet
        ctx.fillStyle = '#f87171';
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      ctx.restore();
    };

    const drawPowerUp = (p: PowerUp, elapsed: number) => {
      ctx.save();
      ctx.translate(p.x, p.y);

      const pulse = Math.sin(elapsed * 0.004 + p.pulse) * 0.2 + 1;
      const radius = 12 * pulse;

      let color: string;
      let icon: string;
      switch (p.type) {
        case 'shield': color = '#3b82f6'; icon = 'S'; break;
        case 'rapid':  color = '#eab308'; icon = 'R'; break;
        case 'fuel':   color = '#22c55e'; icon = 'F'; break;
      }

      // Outer glow
      const glow = ctx.createRadialGradient(0, 0, radius * 0.5, 0, 0, radius * 1.8);
      glow.addColorStop(0, color + '60');
      glow.addColorStop(1, color + '00');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 1.8, 0, Math.PI * 2);
      ctx.fill();

      // Circle
      ctx.fillStyle = color;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Label
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(icon, 0, 1);

      ctx.restore();
    };

    const drawParticles = () => {
      for (const p of gs.particles) {
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const drawHUD = (elapsed: number, timeLeft: number) => {
      // Fuel bar
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(15, 15, 160, 16);
      const fuelPct = gs.fuel / gs.maxFuel;
      const fuelColor = fuelPct > 0.5 ? '#22c55e' : fuelPct > 0.25 ? '#eab308' : '#ef4444';
      ctx.fillStyle = fuelColor;
      ctx.fillRect(15, 15, 160 * fuelPct, 16);
      ctx.strokeStyle = '#ffffff44';
      ctx.lineWidth = 1;
      ctx.strokeRect(15, 15, 160, 16);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('FUEL', 20, 23);

      // Score
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 18px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`SCORE: ${gs.score}`, CANVAS_W / 2, 26);

      // Timer
      const mins = Math.floor(timeLeft / 60);
      const secs = Math.floor(timeLeft % 60);
      ctx.fillStyle = timeLeft < 30 ? '#ef4444' : '#fff';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${mins}:${secs.toString().padStart(2, '0')}`, CANVAS_W - 15, 22);

      // Lives
      for (let i = 0; i < gs.lives; i++) {
        const hx = CANVAS_W - 60 + i * 18;
        drawHeart(hx, 40);
      }

      // Active power-ups
      let puY = 45;
      if (gs.shieldActive) {
        ctx.fillStyle = '#3b82f6';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'left';
        const remaining = Math.ceil(gs.shieldTimer / 1000);
        ctx.fillText(`SHIELD ${remaining}s`, 15, puY);
        puY += 15;
      }
      if (gs.rapidFireActive) {
        ctx.fillStyle = '#eab308';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'left';
        const remaining = Math.ceil(gs.rapidFireTimer / 1000);
        ctx.fillText(`RAPID FIRE ${remaining}s`, 15, puY);
      }
    };

    const drawHeart = (cx: number, cy: number) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(0, 3);
      ctx.bezierCurveTo(-5, -2, -9, -5, -5, -8);
      ctx.bezierCurveTo(-2, -10, 0, -8, 0, -5);
      ctx.bezierCurveTo(0, -8, 2, -10, 5, -8);
      ctx.bezierCurveTo(9, -5, 5, -2, 0, 3);
      ctx.fill();
      ctx.restore();
    };

    // ----- GAME LOOP -----
    const gameLoop = () => {
      if (phaseRef.current !== 'playing') return;

      const now = Date.now();
      const elapsed = now - gameStartTimeRef.current;
      const dt = Math.min(33, now - lastFrameTimeRef.current); // cap delta at ~30fps min
      const dtFactor = dt / 16.67; // normalize to 60fps
      lastFrameTimeRef.current = now;

      const timeLeft = GAME_DURATION - elapsed / 1000;
      const difficulty = Math.min(5, elapsed / 36000); // 0-5 over 3 minutes

      // --- UPDATE PLAYER ---
      const keys = keysRef.current;
      const touch = touchRef.current;
      const moveLeft = keys.has('ArrowLeft') || keys.has('KeyA') || touch.left;
      const moveRight = keys.has('ArrowRight') || keys.has('KeyD') || touch.right;
      const shooting = keys.has('Space') || touch.shoot;

      if (moveLeft) gs.player.x -= PLAYER_SPEED * dtFactor;
      if (moveRight) gs.player.x += PLAYER_SPEED * dtFactor;
      gs.player.x = Math.max(gs.player.width / 2, Math.min(CANVAS_W - gs.player.width / 2, gs.player.x));

      // --- SHOOT ---
      const cooldown = gs.rapidFireActive ? RAPID_SHOT_COOLDOWN : SHOT_COOLDOWN;
      if (shooting && now - gs.lastShotTime > cooldown) {
        gs.playerBullets.push({
          id: getId(),
          x: gs.player.x,
          y: gs.player.y - gs.player.height / 2,
          vx: 0,
          vy: -BULLET_SPEED,
          isPlayer: true,
        });
        gs.lastShotTime = now;
        gs.shotsFired++;
        logEvent('shoot', { x: gs.player.x, aimed: false }); // we'll determine aimed-ness below
      }

      // --- SPAWN ASTEROIDS ---
      const asteroidInterval = Math.max(400, 1200 - difficulty * 160);
      if (now - lastAsteroidSpawnRef.current > asteroidInterval) {
        gs.asteroids.push(spawnAsteroid(difficulty));
        lastAsteroidSpawnRef.current = now;
        reactionTrackingRef.current.set(gs.asteroids[gs.asteroids.length - 1].id, now);
      }

      // --- SPAWN ALIENS ---
      const alienInterval = Math.max(3000, 8000 - difficulty * 1000);
      if (now - lastAlienSpawnRef.current > alienInterval) {
        gs.aliens.push(spawnAlien(difficulty));
        lastAlienSpawnRef.current = now;
        reactionTrackingRef.current.set(gs.aliens[gs.aliens.length - 1].id, now);
      }

      // --- SPAWN POWER-UPS ---
      const puInterval = Math.max(6000, 12000 - difficulty * 500);
      if (now - lastPowerUpSpawnRef.current > puInterval) {
        gs.powerUps.push(spawnPowerUp());
        lastPowerUpSpawnRef.current = now;
      }

      // --- UPDATE ASTEROIDS ---
      for (const a of gs.asteroids) {
        a.x += a.vx * dtFactor;
        a.y += a.vy * dtFactor;
        a.rotation += a.rotSpeed * dtFactor;
      }
      gs.asteroids = gs.asteroids.filter(a => a.y < CANVAS_H + 40 && a.x > -40 && a.x < CANVAS_W + 40);

      // --- UPDATE ALIENS ---
      for (const a of gs.aliens) {
        a.y += a.speed * dtFactor;
        a.phase += 0.03 * dtFactor;
        a.x = a.baseX + Math.sin(a.phase) * a.amplitude;
        a.x = Math.max(15, Math.min(CANVAS_W - 15, a.x));

        // Alien shoots
        if (now - a.lastShot > Math.max(800, a.shotInterval)) {
          gs.alienBullets.push({
            id: getId(),
            x: a.x,
            y: a.y + 14,
            vx: (gs.player.x - a.x) * 0.01, // aim slightly at player
            vy: 4 + difficulty * 0.4,
            isPlayer: false,
          });
          a.lastShot = now;
        }
      }
      gs.aliens = gs.aliens.filter(a => a.y < CANVAS_H + 30);

      // --- UPDATE BULLETS ---
      for (const b of gs.playerBullets) {
        b.x += b.vx * dtFactor;
        b.y += b.vy * dtFactor;
      }
      gs.playerBullets = gs.playerBullets.filter(b => b.y > -10 && b.y < CANVAS_H + 10);

      for (const b of gs.alienBullets) {
        b.x += b.vx * dtFactor;
        b.y += b.vy * dtFactor;
      }
      gs.alienBullets = gs.alienBullets.filter(b => b.y > -10 && b.y < CANVAS_H + 10);

      // --- UPDATE POWER-UPS ---
      for (const p of gs.powerUps) {
        p.y += p.vy * dtFactor;
        p.pulse += 0.05;
      }
      gs.powerUps = gs.powerUps.filter(p => p.y < CANVAS_H + 20);

      // --- UPDATE PARTICLES ---
      for (const p of gs.particles) {
        p.x += p.vx * dtFactor;
        p.y += p.vy * dtFactor;
        p.life -= dtFactor;
      }
      gs.particles = gs.particles.filter(p => p.life > 0);

      // --- UPDATE TIMERS ---
      if (gs.shieldActive) {
        gs.shieldTimer -= dt;
        if (gs.shieldTimer <= 0) gs.shieldActive = false;
      }
      if (gs.rapidFireActive) {
        gs.rapidFireTimer -= dt;
        if (gs.rapidFireTimer <= 0) gs.rapidFireActive = false;
      }
      if (gs.invincibleTimer > 0) {
        gs.invincibleTimer -= dt;
      }

      // --- FUEL DRAIN ---
      gs.fuel -= FUEL_DRAIN_RATE * dtFactor;
      if (gs.fuel <= 0) {
        gs.fuel = 0;
        // Fuel death
        gs.lives--;
        logEvent('death', { cause: 'fuel', fuel: 0, score: gs.score, lives: gs.lives });
        gs.fuel = FUEL_MAX * 0.3; // partial refill on death
        gs.invincibleTimer = INVINCIBLE_AFTER_HIT;
        gs.particles.push(...spawnExplosion(gs.player.x, gs.player.y, '#eab308', 15));
        onXPGain(2, 'Fuel crisis survived');
      }

      // --- COLLISIONS: Player bullets vs Aliens ---
      for (let bi = gs.playerBullets.length - 1; bi >= 0; bi--) {
        const b = gs.playerBullets[bi];
        for (let ai = gs.aliens.length - 1; ai >= 0; ai--) {
          const a = gs.aliens[ai];
          if (dist(b, a) < 18) {
            a.health--;
            gs.playerBullets.splice(bi, 1);
            gs.shotsHit++;

            // Track reaction time
            const spawnTime = reactionTrackingRef.current.get(a.id);
            if (spawnTime) {
              reactionTimesRef.current.push(now - spawnTime);
              reactionTrackingRef.current.delete(a.id);
            }

            if (a.health <= 0) {
              gs.aliens.splice(ai, 1);
              gs.score += 10;
              gs.enemiesDestroyed++;
              gs.particles.push(...spawnExplosion(a.x, a.y, '#ef4444', 12));
              onXPGain(3, 'Alien destroyed');
            }
            break;
          }
        }
      }

      // --- COLLISIONS: Player bullets vs Asteroids ---
      for (let bi = gs.playerBullets.length - 1; bi >= 0; bi--) {
        const b = gs.playerBullets[bi];
        for (let ai = gs.asteroids.length - 1; ai >= 0; ai--) {
          const a = gs.asteroids[ai];
          if (dist(b, a) < a.radius) {
            gs.playerBullets.splice(bi, 1);
            // Small asteroids break, large ones just take a hit visually
            if (a.radius < 18) {
              gs.asteroids.splice(ai, 1);
              gs.score += 3;
              gs.particles.push(...spawnExplosion(a.x, a.y, '#888899', 6));
            } else {
              a.radius *= 0.8;
              gs.particles.push(...spawnExplosion(b.x, b.y, '#888899', 3));
            }
            break;
          }
        }
      }

      // --- COLLISIONS: Asteroids vs Player ---
      if (gs.invincibleTimer <= 0) {
        for (let ai = gs.asteroids.length - 1; ai >= 0; ai--) {
          const a = gs.asteroids[ai];
          const d = dist(gs.player, a);
          if (d < a.radius + gs.player.width * 0.4) {
            if (gs.shieldActive) {
              // Shield absorbs hit
              gs.shieldActive = false;
              gs.shieldTimer = 0;
              gs.asteroids.splice(ai, 1);
              gs.particles.push(...spawnExplosion(a.x, a.y, '#3b82f6', 10));
              logEvent('dodge', { method: 'shield', distance: d });
            } else {
              gs.lives--;
              gs.asteroids.splice(ai, 1);
              gs.invincibleTimer = INVINCIBLE_AFTER_HIT;
              gs.particles.push(...spawnExplosion(gs.player.x, gs.player.y, '#22c55e', 15));
              logEvent('hit', { source: 'asteroid', lives: gs.lives });
              logEvent('death', {
                cause: 'asteroid',
                score: gs.score,
                lives: gs.lives,
                threatsOnScreen: gs.asteroids.length + gs.aliens.length,
              });
              onXPGain(1, 'Took a hit');
            }
            break;
          } else if (d < a.radius + NEAR_MISS_THRESHOLD + gs.player.width * 0.4) {
            // Near miss tracking
            gs.dodgeCount++;
            gs.nearMissTotal += d;

            // Track reaction time for dodge
            const spawnTime = reactionTrackingRef.current.get(a.id);
            if (spawnTime) {
              reactionTimesRef.current.push(now - spawnTime);
              reactionTrackingRef.current.delete(a.id);
            }

            logEvent('dodge', {
              direction: gs.player.x < a.x ? 'left' : 'right',
              distance: Math.round(d - a.radius),
              asteroidRadius: a.radius,
            });
          }
        }
      }

      // --- COLLISIONS: Alien bullets vs Player ---
      if (gs.invincibleTimer <= 0) {
        for (let bi = gs.alienBullets.length - 1; bi >= 0; bi--) {
          const b = gs.alienBullets[bi];
          if (dist(gs.player, b) < gs.player.width * 0.5) {
            if (gs.shieldActive) {
              gs.shieldActive = false;
              gs.shieldTimer = 0;
              gs.alienBullets.splice(bi, 1);
              gs.particles.push(...spawnExplosion(b.x, b.y, '#3b82f6', 8));
              logEvent('dodge', { method: 'shield', source: 'alien_bullet' });
            } else {
              gs.lives--;
              gs.alienBullets.splice(bi, 1);
              gs.invincibleTimer = INVINCIBLE_AFTER_HIT;
              gs.particles.push(...spawnExplosion(gs.player.x, gs.player.y, '#ef4444', 12));
              logEvent('hit', { source: 'alien_bullet', lives: gs.lives });
              logEvent('death', {
                cause: 'alien_bullet',
                score: gs.score,
                lives: gs.lives,
                threatsOnScreen: gs.asteroids.length + gs.aliens.length,
              });
              onXPGain(1, 'Took a hit');
            }
            break;
          }
        }
      }

      // --- COLLISIONS: Player vs Power-ups ---
      for (let pi = gs.powerUps.length - 1; pi >= 0; pi--) {
        const p = gs.powerUps[pi];
        if (dist(gs.player, p) < 24) {
          gs.powerUpsCollected++;

          // Check if risky grab (asteroids nearby)
          const nearbyThreats = gs.asteroids.filter(a => dist(a, p) < 60).length;
          if (nearbyThreats > 0) gs.riskEvents++;

          switch (p.type) {
            case 'shield':
              gs.shieldActive = true;
              gs.shieldTimer = SHIELD_DURATION;
              gs.shieldPickups++;
              gs.score += 5;
              onXPGain(2, 'Shield activated');
              break;
            case 'rapid':
              gs.rapidFireActive = true;
              gs.rapidFireTimer = RAPID_DURATION;
              gs.rapidPickups++;
              gs.score += 5;
              onXPGain(2, 'Rapid fire');
              break;
            case 'fuel':
              gs.fuel = Math.min(gs.maxFuel, gs.fuel + 30);
              gs.fuelPickups++;
              gs.score += 5;
              onXPGain(2, 'Fuel cell collected');
              break;
          }

          logEvent('collect', {
            type: p.type,
            nearbyThreats,
            fuel: gs.fuel,
            lives: gs.lives,
          });

          gs.powerUps.splice(pi, 1);
          gs.particles.push(...spawnExplosion(p.x, p.y, '#ffffff', 8));
        }
      }

      // --- SURVIVAL SCORE ---
      if (Math.floor(elapsed / 1000) > Math.floor((elapsed - dt) / 1000)) {
        gs.score += 1; // +1 per second survived
      }

      // --- RECORD FIRST MINUTE DATA ---
      if (elapsed < 60000) {
        firstMinuteScoreRef.current = gs.score;
        firstMinuteAccuracyRef.current = { hits: gs.shotsHit, shots: gs.shotsFired };
      }

      // --- BEHAVIORAL POSITION LOG (every 500ms) ---
      if (elapsed - lastPositionLogRef.current > 500) {
        lastPositionLogRef.current = elapsed;
        positionHistoryRef.current.push(gs.player.x);
        logEvent('position', {
          x: Math.round(gs.player.x),
          threats: gs.asteroids.length + gs.aliens.length,
          fuel: Math.round(gs.fuel),
          score: gs.score,
        });
      }

      // --- UPDATE DISPLAY STATE ---
      setDisplayScore(gs.score);
      setDisplayTime(Math.max(0, Math.ceil(timeLeft)));
      setDisplayLives(gs.lives);
      setDisplayFuel(Math.round(gs.fuel));

      // --- CHECK GAME OVER ---
      if (gs.lives <= 0 || timeLeft <= 0) {
        const timeSurvivedSec = Math.round(elapsed / 1000);
        const stats = {
          score: gs.score,
          time: timeSurvivedSec,
          enemies: gs.enemiesDestroyed,
          powerUps: gs.powerUpsCollected,
        };
        setFinalStats(stats);
        setPhase('gameover');
        gameStateRef.current = gs;
        return; // stop the loop
      }

      // --- DRAW ---
      drawBackground(elapsed);

      // Draw game objects
      for (const a of gs.asteroids) drawAsteroid(a);
      for (const a of gs.aliens) drawAlien(a, elapsed);
      for (const p of gs.powerUps) drawPowerUp(p, elapsed);
      for (const b of gs.playerBullets) drawBullet(b);
      for (const b of gs.alienBullets) drawBullet(b);
      drawParticles();
      drawPlayer(
        gs.player.x, gs.player.y,
        gs.player.width, gs.player.height,
        gs.shieldActive,
        gs.invincibleTimer > 0
      );
      drawHUD(elapsed, timeLeft);

      animFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [phase, initGameState, spawnAsteroid, spawnAlien, spawnPowerUp, spawnExplosion, logEvent, onXPGain]);

  // ----- Handle finish / view results -----
  const handleViewResults = useCallback(() => {
    const gs = gameStateRef.current;
    if (!gs || !finalStats) return;

    const metrics = computeMetrics(gs, finalStats.time);

    // Normalized score: (enemies*10 + time + powerups*5) / theoretical max
    // Theoretical max: ~60 enemies * 10 + 180 seconds + ~20 power-ups * 5 = 880
    const theoreticalMax = 880;
    const rawScore = gs.enemiesDestroyed * 10 + finalStats.time + gs.powerUpsCollected * 5;
    const normalizedScore = Math.min(100, Math.round((rawScore / theoreticalMax) * 100));

    // Condense behavior log: keep key events, not every position log
    const condensedLog = behaviorLogRef.current.filter(
      e => e.type !== 'position' || (e.timestamp % 5000 < 500)
    );

    const result: GameResult = {
      score: normalizedScore,
      rawScore: gs.score,
      timeSpent: finalStats.time,
      type: 'game',
      metrics: {
        avgReactionTime: metrics.avgReactionTime,
        processingSpeed: metrics.processingSpeed,
        multitaskingScore: metrics.multitaskingScore,
        riskTolerance: metrics.riskTolerance,
        defensiveVsOffensive: metrics.defensiveVsOffensive,
        resourceManagement: metrics.resourceManagement,
        decisionSpeed: metrics.decisionSpeed,
        adaptability: metrics.adaptability,
        composureUnderPressure: metrics.composureUnderPressure,
      },
      data: {
        profile: metrics,
        behaviorLog: condensedLog,
        gameStats: {
          enemiesDestroyed: gs.enemiesDestroyed,
          powerUpsCollected: gs.powerUpsCollected,
          timeSurvived: finalStats.time,
          livesRemaining: gs.lives,
        },
      },
    };

    onComplete(result);
  }, [finalStats, computeMetrics, onComplete]);

  // ----- RENDER -----

  // Intro screen
  if (phase === 'intro') {
    return (
      <GameIntro
        title="Space Defender"
        description="Survive the asteroid field and defeat alien invaders"
        icon="rocket_launch"
        duration="3 minutes"
        rules={[
          'Use Arrow Keys or A/D to move your ship left and right',
          'Press Space to fire your weapons at enemies',
          'Dodge asteroids and destroy alien ships for points',
          'Collect power-ups: Shield (blue), Rapid Fire (yellow), Fuel (green)',
          'Keep your fuel gauge full by collecting fuel cells',
          'Survive as long as possible with 3 lives',
        ]}
        onStart={handleStart}
      />
    );
  }

  // Countdown screen
  if (phase === 'countdown') {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[500px] animate-[fadeIn_0.2s_ease-out]">
        <div className="text-center">
          <div className="text-8xl font-black text-primary mb-4 animate-[pulse_1s_ease-in-out_infinite]">
            {countdown > 0 ? countdown : 'GO!'}
          </div>
          <p className="text-text-muted text-lg">Get ready to defend the galaxy</p>
        </div>
      </div>
    );
  }

  // Game over screen
  if (phase === 'gameover') {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[500px] animate-[fadeIn_0.3s_ease-out]">
        <div className="bg-card-bg dark:bg-card-bg-dark p-10 rounded-3xl shadow-xl border border-text-main/5 dark:border-white/5 text-center max-w-md">
          <div className="size-16 mx-auto mb-4 rounded-2xl bg-red-500/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-4xl text-red-400">explosion</span>
          </div>
          <h2 className="text-3xl font-black text-text-main dark:text-white mb-2">Mission Complete</h2>
          <p className="text-text-muted mb-6">Your ship has returned to base</p>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-background-light dark:bg-white/5 rounded-xl p-4">
              <div className="text-2xl font-black text-primary">{finalStats?.score ?? 0}</div>
              <div className="text-xs text-text-muted mt-1">Final Score</div>
            </div>
            <div className="bg-background-light dark:bg-white/5 rounded-xl p-4">
              <div className="text-2xl font-black text-text-main dark:text-white">
                {finalStats ? `${Math.floor(finalStats.time / 60)}:${(finalStats.time % 60).toString().padStart(2, '0')}` : '0:00'}
              </div>
              <div className="text-xs text-text-muted mt-1">Time Survived</div>
            </div>
            <div className="bg-background-light dark:bg-white/5 rounded-xl p-4">
              <div className="text-2xl font-black text-red-400">{finalStats?.enemies ?? 0}</div>
              <div className="text-xs text-text-muted mt-1">Enemies Destroyed</div>
            </div>
            <div className="bg-background-light dark:bg-white/5 rounded-xl p-4">
              <div className="text-2xl font-black text-blue-400">{finalStats?.powerUps ?? 0}</div>
              <div className="text-xs text-text-muted mt-1">Power-Ups Collected</div>
            </div>
          </div>

          <button
            onClick={handleViewResults}
            className="w-full py-4 bg-primary text-black font-black text-lg rounded-2xl hover:bg-[#00d64b] active:scale-[0.98] transition-all shadow-lg shadow-primary/20"
          >
            View Results
          </button>
        </div>
      </div>
    );
  }

  // Playing state - render canvas
  return (
    <div className="flex flex-col items-center gap-3 w-full animate-[fadeIn_0.2s_ease-out]">
      {/* Mobile HUD (visible info outside canvas for small screens) */}
      <div className="flex items-center justify-between w-full max-w-[800px] px-2 sm:hidden">
        <div className="text-sm font-bold text-text-main dark:text-white">
          FUEL: {displayFuel}%
        </div>
        <div className="text-sm font-bold text-primary">
          SCORE: {displayScore}
        </div>
        <div className="text-sm font-bold text-text-main dark:text-white flex gap-1">
          {Array.from({ length: displayLives }).map((_, i) => (
            <span key={i} className="text-red-500">&#9829;</span>
          ))}
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        className="rounded-2xl border border-white/10 shadow-2xl w-full max-w-[800px] aspect-[4/3] bg-[#0a0a1a]"
        style={{ imageRendering: 'auto', touchAction: 'none' }}
      />

      <div className="flex items-center gap-6 text-xs text-text-muted">
        <span className="hidden sm:inline">Arrow Keys / A,D to move</span>
        <span className="hidden sm:inline">Space to shoot</span>
        <span className="sm:hidden">Tap left/right to move, center to shoot</span>
      </div>

      <button
        onClick={() => onExit({ step: 0, correctCount: 0, textInput: '', gameScore: displayScore, simState: null })}
        className="text-xs text-text-muted hover:text-text-main dark:hover:text-white transition-colors"
      >
        Exit Game
      </button>
    </div>
  );
};

export default SpaceDefender;
