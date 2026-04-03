import { MetaProgress, PlayerLevel, XPEvent, StreakState, GameNotification } from '../types';

// --- LEVEL DEFINITIONS ---
const LEVELS: { level: number; title: string; xpRequired: number }[] = [
  { level: 1, title: 'Analyst Intern', xpRequired: 0 },
  { level: 2, title: 'Junior Analyst', xpRequired: 150 },
  { level: 3, title: 'Senior Analyst', xpRequired: 400 },
  { level: 4, title: 'Strategy Associate', xpRequired: 800 },
  { level: 5, title: 'Strategy Director', xpRequired: 1500 },
];

// --- XP AWARDS ---
export const XP_AWARDS = {
  CORRECT_ANSWER: 10,
  SPEED_BONUS: 5,
  SECTION_COMPLETE: 50,
  MODULE_COMPLETE: 200,
  PERFECT_SCORE: 100,
  GAME_TIER_1: 20, // score 40-69
  GAME_TIER_2: 40, // score 70-89
  GAME_TIER_3: 60, // score 90+
};

// --- STREAK MULTIPLIERS ---
export function getStreakMultiplier(streak: number): number {
  if (streak >= 8) return 3;
  if (streak >= 5) return 2;
  if (streak >= 3) return 1.5;
  return 1;
}

// --- INITIAL STATE ---
export function createInitialProgress(): MetaProgress {
  return {
    player: {
      level: 1,
      title: 'Analyst Intern',
      currentXP: 0,
      xpForNextLevel: LEVELS[1].xpRequired,
      totalXP: 0,
    },
    xpHistory: [],
    streak: { current: 0, best: 0, multiplier: 1, isOnFire: false },
    completedGames: [],
    notifications: [],
  };
}

// --- CORE FUNCTIONS (pure, return new state) ---

export function awardXP(
  state: MetaProgress,
  amount: number,
  source: string,
  sectionId: string
): { state: MetaProgress; notifications: GameNotification[] } {
  const notifications: GameNotification[] = [];
  const multipliedAmount = Math.round(amount * state.streak.multiplier);

  const event: XPEvent = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    amount: multipliedAmount,
    source,
    timestamp: Date.now(),
    sectionId,
  };

  const newTotalXP = state.player.totalXP + multipliedAmount;
  const newPlayer = computeLevel(newTotalXP, state.player);

  // Check for level up
  if (newPlayer.level > state.player.level) {
    notifications.push({
      id: `lvl-${Date.now()}`,
      type: 'level_up',
      message: `Level Up! You're now a ${newPlayer.title}`,
      amount: newPlayer.level,
      timestamp: Date.now(),
    });
  }

  notifications.push({
    id: event.id,
    type: 'xp_gain',
    message: `+${multipliedAmount} XP`,
    amount: multipliedAmount,
    timestamp: Date.now(),
  });

  return {
    state: {
      ...state,
      player: newPlayer,
      xpHistory: [...state.xpHistory, event],
    },
    notifications,
  };
}

export function recordAnswer(
  state: MetaProgress,
  isCorrect: boolean,
  timeMs: number,
  sectionId: string
): { state: MetaProgress; notifications: GameNotification[]; xpGained: number } {
  let newStreak: StreakState;
  const allNotifications: GameNotification[] = [];
  let totalXPGained = 0;

  if (isCorrect) {
    const newCurrent = state.streak.current + 1;
    const multiplier = getStreakMultiplier(newCurrent);
    newStreak = {
      current: newCurrent,
      best: Math.max(state.streak.best, newCurrent),
      multiplier,
      isOnFire: newCurrent >= 5,
    };

    // Base XP for correct answer
    const baseXP = XP_AWARDS.CORRECT_ANSWER;
    const { state: s1, notifications: n1 } = awardXP(
      { ...state, streak: newStreak },
      baseXP,
      'correct',
      sectionId
    );
    totalXPGained += Math.round(baseXP * newStreak.multiplier);
    allNotifications.push(...n1);

    // Speed bonus if answered in under 15 seconds
    if (timeMs < 15000) {
      const { state: s2, notifications: n2 } = awardXP(s1, XP_AWARDS.SPEED_BONUS, 'speed', sectionId);
      totalXPGained += Math.round(XP_AWARDS.SPEED_BONUS * newStreak.multiplier);
      allNotifications.push(...n2);
      return { state: s2, notifications: allNotifications, xpGained: totalXPGained };
    }

    return { state: s1, notifications: allNotifications, xpGained: totalXPGained };
  } else {
    // Streak broken
    newStreak = { ...state.streak, current: 0, multiplier: 1, isOnFire: false };
    return {
      state: { ...state, streak: newStreak },
      notifications: [],
      xpGained: 0,
    };
  }
}

export function completeSection(
  state: MetaProgress,
  sectionId: string,
  score: number
): { state: MetaProgress; notifications: GameNotification[] } {
  const allNotifications: GameNotification[] = [];
  let current = { ...state, completedGames: [...state.completedGames, sectionId] };

  // Section completion XP
  const { state: s1, notifications: n1 } = awardXP(current, XP_AWARDS.SECTION_COMPLETE, 'complete', sectionId);
  allNotifications.push(...n1);
  current = s1;

  // Bonus for high scores
  if (score >= 90) {
    const { state: s2, notifications: n2 } = awardXP(current, XP_AWARDS.GAME_TIER_3, 'excellence', sectionId);
    allNotifications.push(...n2);
    current = s2;
  } else if (score >= 70) {
    const { state: s3, notifications: n3 } = awardXP(current, XP_AWARDS.GAME_TIER_2, 'great', sectionId);
    allNotifications.push(...n3);
    current = s3;
  }

  // Perfect score bonus
  if (score === 100) {
    const { state: s4, notifications: n4 } = awardXP(current, XP_AWARDS.PERFECT_SCORE, 'perfect', sectionId);
    allNotifications.push(...n4);
    current = s4;
  }

  // Reset streak between sections
  current = { ...current, streak: { ...current.streak, current: 0, multiplier: 1, isOnFire: false } };

  return { state: current, notifications: allNotifications };
}

export function getStarRating(score: number): number {
  if (score >= 90) return 3;
  if (score >= 70) return 2;
  if (score >= 40) return 1;
  return 0;
}

// --- INTERNAL ---

function computeLevel(totalXP: number, current: PlayerLevel): PlayerLevel {
  let newLevel = 1;
  let title = LEVELS[0].title;

  for (const lvl of LEVELS) {
    if (totalXP >= lvl.xpRequired) {
      newLevel = lvl.level;
      title = lvl.title;
    }
  }

  const nextLevel = LEVELS.find(l => l.level === newLevel + 1);
  const xpForNext = nextLevel ? nextLevel.xpRequired : LEVELS[LEVELS.length - 1].xpRequired;

  return {
    level: newLevel,
    title,
    currentXP: totalXP - (LEVELS.find(l => l.level === newLevel)?.xpRequired || 0),
    xpForNextLevel: xpForNext - (LEVELS.find(l => l.level === newLevel)?.xpRequired || 0),
    totalXP,
  };
}

// --- PERSISTENCE ---

const STORAGE_KEY = 'tetr-trial-progress';

export function saveProgress(state: MetaProgress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save progress', e);
  }
}

export function loadProgress(): MetaProgress | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}
