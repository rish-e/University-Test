export type ShapeType = 'circle' | 'square' | 'triangle' | 'diamond' | 'hexagon' | 'star';

export interface PatternElement {
  shape: ShapeType;
  color: string;
  rotation: number;
  size: number; // 1 = normal, 0.5 = small, 1.5 = large
}

export interface PatternRound {
  id: number;
  difficulty: 1 | 2 | 3 | 4;
  sequence: PatternElement[]; // visible sequence (last is hidden = answer)
  answer: PatternElement;
  distractors: PatternElement[]; // 5 wrong options
}

const GREEN = '#13ec5b';
const BLUE = '#3B82F6';
const RED = '#EF4444';
const YELLOW = '#F59E0B';
const PURPLE = '#8B5CF6';
const PINK = '#EC4899';

// --- Difficulty 1: Shape-only patterns ---
export const patternRounds: PatternRound[] = [
  {
    id: 1,
    difficulty: 1,
    sequence: [
      { shape: 'circle', color: BLUE, rotation: 0, size: 1 },
      { shape: 'square', color: BLUE, rotation: 0, size: 1 },
      { shape: 'circle', color: BLUE, rotation: 0, size: 1 },
      { shape: 'square', color: BLUE, rotation: 0, size: 1 },
    ],
    answer: { shape: 'circle', color: BLUE, rotation: 0, size: 1 },
    distractors: [
      { shape: 'square', color: BLUE, rotation: 0, size: 1 },
      { shape: 'triangle', color: BLUE, rotation: 0, size: 1 },
      { shape: 'diamond', color: BLUE, rotation: 0, size: 1 },
      { shape: 'hexagon', color: BLUE, rotation: 0, size: 1 },
      { shape: 'star', color: BLUE, rotation: 0, size: 1 },
    ],
  },
  {
    id: 2,
    difficulty: 1,
    sequence: [
      { shape: 'triangle', color: GREEN, rotation: 0, size: 1 },
      { shape: 'triangle', color: GREEN, rotation: 0, size: 1 },
      { shape: 'square', color: GREEN, rotation: 0, size: 1 },
      { shape: 'triangle', color: GREEN, rotation: 0, size: 1 },
      { shape: 'triangle', color: GREEN, rotation: 0, size: 1 },
    ],
    answer: { shape: 'square', color: GREEN, rotation: 0, size: 1 },
    distractors: [
      { shape: 'triangle', color: GREEN, rotation: 0, size: 1 },
      { shape: 'circle', color: GREEN, rotation: 0, size: 1 },
      { shape: 'diamond', color: GREEN, rotation: 0, size: 1 },
      { shape: 'hexagon', color: GREEN, rotation: 0, size: 1 },
      { shape: 'star', color: GREEN, rotation: 0, size: 1 },
    ],
  },
  {
    id: 3,
    difficulty: 1,
    sequence: [
      { shape: 'circle', color: RED, rotation: 0, size: 1 },
      { shape: 'square', color: RED, rotation: 0, size: 1 },
      { shape: 'triangle', color: RED, rotation: 0, size: 1 },
      { shape: 'circle', color: RED, rotation: 0, size: 1 },
      { shape: 'square', color: RED, rotation: 0, size: 1 },
    ],
    answer: { shape: 'triangle', color: RED, rotation: 0, size: 1 },
    distractors: [
      { shape: 'circle', color: RED, rotation: 0, size: 1 },
      { shape: 'square', color: RED, rotation: 0, size: 1 },
      { shape: 'diamond', color: RED, rotation: 0, size: 1 },
      { shape: 'hexagon', color: RED, rotation: 0, size: 1 },
      { shape: 'star', color: RED, rotation: 0, size: 1 },
    ],
  },

  // --- Difficulty 2: Shape + Color ---
  {
    id: 4,
    difficulty: 2,
    sequence: [
      { shape: 'circle', color: RED, rotation: 0, size: 1 },
      { shape: 'circle', color: BLUE, rotation: 0, size: 1 },
      { shape: 'circle', color: GREEN, rotation: 0, size: 1 },
      { shape: 'circle', color: RED, rotation: 0, size: 1 },
      { shape: 'circle', color: BLUE, rotation: 0, size: 1 },
    ],
    answer: { shape: 'circle', color: GREEN, rotation: 0, size: 1 },
    distractors: [
      { shape: 'circle', color: RED, rotation: 0, size: 1 },
      { shape: 'circle', color: BLUE, rotation: 0, size: 1 },
      { shape: 'circle', color: YELLOW, rotation: 0, size: 1 },
      { shape: 'circle', color: PURPLE, rotation: 0, size: 1 },
      { shape: 'circle', color: PINK, rotation: 0, size: 1 },
    ],
  },
  {
    id: 5,
    difficulty: 2,
    sequence: [
      { shape: 'square', color: YELLOW, rotation: 0, size: 1 },
      { shape: 'diamond', color: PURPLE, rotation: 0, size: 1 },
      { shape: 'square', color: YELLOW, rotation: 0, size: 1 },
      { shape: 'diamond', color: PURPLE, rotation: 0, size: 1 },
    ],
    answer: { shape: 'square', color: YELLOW, rotation: 0, size: 1 },
    distractors: [
      { shape: 'diamond', color: PURPLE, rotation: 0, size: 1 },
      { shape: 'square', color: PURPLE, rotation: 0, size: 1 },
      { shape: 'diamond', color: YELLOW, rotation: 0, size: 1 },
      { shape: 'hexagon', color: YELLOW, rotation: 0, size: 1 },
      { shape: 'circle', color: PURPLE, rotation: 0, size: 1 },
    ],
  },
  {
    id: 6,
    difficulty: 2,
    sequence: [
      { shape: 'star', color: PINK, rotation: 0, size: 1 },
      { shape: 'hexagon', color: GREEN, rotation: 0, size: 1 },
      { shape: 'triangle', color: BLUE, rotation: 0, size: 1 },
      { shape: 'star', color: PINK, rotation: 0, size: 1 },
      { shape: 'hexagon', color: GREEN, rotation: 0, size: 1 },
    ],
    answer: { shape: 'triangle', color: BLUE, rotation: 0, size: 1 },
    distractors: [
      { shape: 'star', color: PINK, rotation: 0, size: 1 },
      { shape: 'hexagon', color: GREEN, rotation: 0, size: 1 },
      { shape: 'triangle', color: PINK, rotation: 0, size: 1 },
      { shape: 'star', color: BLUE, rotation: 0, size: 1 },
      { shape: 'hexagon', color: BLUE, rotation: 0, size: 1 },
    ],
  },

  // --- Difficulty 3: Shape + Color + Rotation ---
  {
    id: 7,
    difficulty: 3,
    sequence: [
      { shape: 'triangle', color: RED, rotation: 0, size: 1 },
      { shape: 'triangle', color: RED, rotation: 90, size: 1 },
      { shape: 'triangle', color: RED, rotation: 180, size: 1 },
      { shape: 'triangle', color: RED, rotation: 270, size: 1 },
    ],
    answer: { shape: 'triangle', color: RED, rotation: 0, size: 1 },
    distractors: [
      { shape: 'triangle', color: RED, rotation: 90, size: 1 },
      { shape: 'triangle', color: RED, rotation: 180, size: 1 },
      { shape: 'triangle', color: RED, rotation: 45, size: 1 },
      { shape: 'triangle', color: BLUE, rotation: 0, size: 1 },
      { shape: 'diamond', color: RED, rotation: 0, size: 1 },
    ],
  },
  {
    id: 8,
    difficulty: 3,
    sequence: [
      { shape: 'diamond', color: PURPLE, rotation: 0, size: 1 },
      { shape: 'diamond', color: BLUE, rotation: 45, size: 1 },
      { shape: 'diamond', color: PURPLE, rotation: 0, size: 1 },
      { shape: 'diamond', color: BLUE, rotation: 45, size: 1 },
      { shape: 'diamond', color: PURPLE, rotation: 0, size: 1 },
    ],
    answer: { shape: 'diamond', color: BLUE, rotation: 45, size: 1 },
    distractors: [
      { shape: 'diamond', color: PURPLE, rotation: 0, size: 1 },
      { shape: 'diamond', color: BLUE, rotation: 0, size: 1 },
      { shape: 'diamond', color: PURPLE, rotation: 45, size: 1 },
      { shape: 'square', color: BLUE, rotation: 45, size: 1 },
      { shape: 'diamond', color: GREEN, rotation: 45, size: 1 },
    ],
  },
  {
    id: 9,
    difficulty: 3,
    sequence: [
      { shape: 'star', color: YELLOW, rotation: 0, size: 1 },
      { shape: 'hexagon', color: GREEN, rotation: 30, size: 1 },
      { shape: 'star', color: YELLOW, rotation: 60, size: 1 },
      { shape: 'hexagon', color: GREEN, rotation: 90, size: 1 },
      { shape: 'star', color: YELLOW, rotation: 120, size: 1 },
    ],
    answer: { shape: 'hexagon', color: GREEN, rotation: 150, size: 1 },
    distractors: [
      { shape: 'hexagon', color: GREEN, rotation: 90, size: 1 },
      { shape: 'hexagon', color: GREEN, rotation: 0, size: 1 },
      { shape: 'star', color: GREEN, rotation: 150, size: 1 },
      { shape: 'hexagon', color: YELLOW, rotation: 150, size: 1 },
      { shape: 'hexagon', color: GREEN, rotation: 120, size: 1 },
    ],
  },

  // --- Difficulty 4: Shape + Color + Rotation + Size ---
  {
    id: 10,
    difficulty: 4,
    sequence: [
      { shape: 'circle', color: BLUE, rotation: 0, size: 0.5 },
      { shape: 'circle', color: BLUE, rotation: 0, size: 1 },
      { shape: 'circle', color: BLUE, rotation: 0, size: 1.5 },
      { shape: 'circle', color: RED, rotation: 0, size: 0.5 },
      { shape: 'circle', color: RED, rotation: 0, size: 1 },
    ],
    answer: { shape: 'circle', color: RED, rotation: 0, size: 1.5 },
    distractors: [
      { shape: 'circle', color: RED, rotation: 0, size: 1 },
      { shape: 'circle', color: RED, rotation: 0, size: 0.5 },
      { shape: 'circle', color: BLUE, rotation: 0, size: 1.5 },
      { shape: 'square', color: RED, rotation: 0, size: 1.5 },
      { shape: 'circle', color: GREEN, rotation: 0, size: 1.5 },
    ],
  },
  {
    id: 11,
    difficulty: 4,
    sequence: [
      { shape: 'triangle', color: GREEN, rotation: 0, size: 1.5 },
      { shape: 'square', color: PINK, rotation: 45, size: 1 },
      { shape: 'triangle', color: BLUE, rotation: 90, size: 0.5 },
      { shape: 'triangle', color: GREEN, rotation: 0, size: 1.5 },
      { shape: 'square', color: PINK, rotation: 45, size: 1 },
    ],
    answer: { shape: 'triangle', color: BLUE, rotation: 90, size: 0.5 },
    distractors: [
      { shape: 'triangle', color: GREEN, rotation: 0, size: 1.5 },
      { shape: 'square', color: PINK, rotation: 45, size: 1 },
      { shape: 'triangle', color: BLUE, rotation: 0, size: 0.5 },
      { shape: 'triangle', color: BLUE, rotation: 90, size: 1 },
      { shape: 'triangle', color: PINK, rotation: 90, size: 0.5 },
    ],
  },
  {
    id: 12,
    difficulty: 4,
    sequence: [
      { shape: 'hexagon', color: PURPLE, rotation: 0, size: 0.5 },
      { shape: 'star', color: YELLOW, rotation: 36, size: 1 },
      { shape: 'diamond', color: RED, rotation: 45, size: 1.5 },
      { shape: 'hexagon', color: PURPLE, rotation: 0, size: 0.5 },
      { shape: 'star', color: YELLOW, rotation: 36, size: 1 },
    ],
    answer: { shape: 'diamond', color: RED, rotation: 45, size: 1.5 },
    distractors: [
      { shape: 'diamond', color: RED, rotation: 0, size: 1.5 },
      { shape: 'diamond', color: RED, rotation: 45, size: 1 },
      { shape: 'diamond', color: YELLOW, rotation: 45, size: 1.5 },
      { shape: 'hexagon', color: RED, rotation: 45, size: 1.5 },
      { shape: 'star', color: RED, rotation: 45, size: 1.5 },
    ],
  },
];
