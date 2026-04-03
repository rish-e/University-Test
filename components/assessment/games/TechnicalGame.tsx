import React, { useState, useCallback, useEffect, useRef } from 'react';
import { GameComponentProps, GameResult, AssessmentProgress } from '../../../types';
import { GameIntro } from '../shared/GameIntro';
import { ProgressTrack } from '../shared/ProgressTrack';

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

type GamePhase = 'intro' | 'spreadsheet' | 'sql' | 'summary';

interface CellData {
  value: string;
  isHeader?: boolean;
  isEditable?: boolean;
  highlight?: boolean;
}

interface SpreadsheetChallenge {
  id: string;
  title: string;
  description: string;
  grid: CellData[][];
  targetCell: { row: number; col: number };
  acceptedAnswers: string[];
  hint: string;
  points: number;
}

interface TableColumn {
  name: string;
  type: string;
  isPK?: boolean;
  isFK?: string;
}

interface SchemaTable {
  name: string;
  columns: TableColumn[];
}

interface SQLChallenge {
  id: string;
  title: string;
  description: string;
  tables: SchemaTable[];
  sampleData: Record<string, Record<string, string | number>[]>;
  expectedOutput: Record<string, string | number>[];
  requiredTokens: string[];
  acceptedPatterns: string[];
  hint: string;
  points: number;
}

interface SpreadsheetState {
  solved: boolean;
  attempts: number;
  pointsEarned: number;
}

interface SQLState {
  solved: boolean;
  attempts: number;
  pointsEarned: number;
  hintUsed: boolean;
}

// ─────────────────────────────────────────────
// INLINE DATA: Spreadsheet Challenges
// ─────────────────────────────────────────────

const spreadsheetChallenges: SpreadsheetChallenge[] = [
  {
    id: 'sum',
    title: 'SUM Formula',
    description: 'The total sales cell is broken. Write a SUM formula to add up Q1, Q2, and Q3 sales.',
    grid: [
      [
        { value: '', isHeader: true },
        { value: 'A', isHeader: true },
        { value: 'B', isHeader: true },
        { value: 'C', isHeader: true },
        { value: 'D', isHeader: true },
      ],
      [
        { value: '1', isHeader: true },
        { value: '120' },
        { value: '135' },
        { value: '162' },
        { value: '#ERROR', isEditable: true, highlight: true },
      ],
      [
        { value: '2', isHeader: true },
        { value: 'Q1 Sales' },
        { value: 'Q2 Sales' },
        { value: 'Q3 Sales' },
        { value: 'Total' },
      ],
    ],
    targetCell: { row: 1, col: 4 },
    acceptedAnswers: [
      '=SUM(A1:C1)',
      '=sum(a1:c1)',
      '=A1+B1+C1',
      '=a1+b1+c1',
      '417',
    ],
    hint: 'Use =SUM(A1:C1) to add all three quarterly values, or type the individual sum.',
    points: 17,
  },
  {
    id: 'vlookup',
    title: 'VLOOKUP Formula',
    description: 'Look up the price of the product in A2 using the reference table in columns D-E.',
    grid: [
      [
        { value: '', isHeader: true },
        { value: 'A', isHeader: true },
        { value: 'B', isHeader: true },
        { value: 'C', isHeader: true },
        { value: 'D', isHeader: true },
        { value: 'E', isHeader: true },
      ],
      [
        { value: '1', isHeader: true },
        { value: 'Product' },
        { value: 'Qty' },
        { value: 'Price' },
        { value: 'Product' },
        { value: 'Price' },
      ],
      [
        { value: '2', isHeader: true },
        { value: 'Widget' },
        { value: '10' },
        { value: '?', isEditable: true, highlight: true },
        { value: 'Gadget' },
        { value: '29.99' },
      ],
      [
        { value: '3', isHeader: true },
        { value: '' },
        { value: '' },
        { value: '' },
        { value: 'Widget' },
        { value: '14.50' },
      ],
      [
        { value: '4', isHeader: true },
        { value: '' },
        { value: '' },
        { value: '' },
        { value: 'Bolt' },
        { value: '3.25' },
      ],
    ],
    targetCell: { row: 2, col: 3 },
    acceptedAnswers: [
      '=VLOOKUP(A2,D1:E4,2,FALSE)',
      '=vlookup(a2,d1:e4,2,false)',
      '=VLOOKUP(A2,D:E,2,FALSE)',
      '=vlookup(a2,d:e,2,false)',
      '=VLOOKUP(A2,D1:E4,2,0)',
      '=vlookup(a2,d1:e4,2,0)',
      '14.50',
      '14.5',
    ],
    hint: 'VLOOKUP(lookup_value, table_array, col_index, [range_lookup]). Look up A2 in the D:E range, return column 2, exact match.',
    points: 17,
  },
  {
    id: 'if',
    title: 'IF Formula',
    description: 'Calculate whether the student passes or fails. Score > 70 = "Pass", otherwise "Fail".',
    grid: [
      [
        { value: '', isHeader: true },
        { value: 'A', isHeader: true },
        { value: 'B', isHeader: true },
      ],
      [
        { value: '1', isHeader: true },
        { value: 'Score' },
        { value: 'Result' },
      ],
      [
        { value: '2', isHeader: true },
        { value: '85' },
        { value: '#ERROR', isEditable: true, highlight: true },
      ],
      [
        { value: '3', isHeader: true },
        { value: '62' },
        { value: '' },
      ],
    ],
    targetCell: { row: 2, col: 2 },
    acceptedAnswers: [
      '=IF(A2>70,"Pass","Fail")',
      '=if(a2>70,"pass","fail")',
      '=IF(A2>70,"Pass","Fail")',
      '=IF(A2>=71,"Pass","Fail")',
      'Pass',
    ],
    hint: 'Use =IF(condition, value_if_true, value_if_false). The condition tests if A2 is greater than 70.',
    points: 17,
  },
  {
    id: 'sumif',
    title: 'SUMIF Formula',
    description: 'Sum all sales amounts for the "North" region.',
    grid: [
      [
        { value: '', isHeader: true },
        { value: 'A', isHeader: true },
        { value: 'B', isHeader: true },
        { value: 'C', isHeader: true },
        { value: 'D', isHeader: true },
        { value: 'E', isHeader: true },
      ],
      [
        { value: '1', isHeader: true },
        { value: 'Region' },
        { value: 'Amount' },
        { value: '' },
        { value: 'North Total:' },
        { value: '?', isEditable: true, highlight: true },
      ],
      [
        { value: '2', isHeader: true },
        { value: 'North' },
        { value: '5200' },
        { value: '' },
        { value: '' },
        { value: '' },
      ],
      [
        { value: '3', isHeader: true },
        { value: 'South' },
        { value: '3100' },
        { value: '' },
        { value: '' },
        { value: '' },
      ],
      [
        { value: '4', isHeader: true },
        { value: 'North' },
        { value: '4800' },
        { value: '' },
        { value: '' },
        { value: '' },
      ],
      [
        { value: '5', isHeader: true },
        { value: 'East' },
        { value: '2900' },
        { value: '' },
        { value: '' },
        { value: '' },
      ],
    ],
    targetCell: { row: 1, col: 5 },
    acceptedAnswers: [
      '=SUMIF(A:A,"North",B:B)',
      '=sumif(a:a,"north",b:b)',
      '=SUMIF(A2:A5,"North",B2:B5)',
      '=sumif(a2:a5,"north",b2:b5)',
      '=SUMIF(A1:A5,"North",B1:B5)',
      '10000',
    ],
    hint: 'SUMIF(range, criteria, sum_range). The range is column A, criteria is "North", and sum_range is column B.',
    points: 16,
  },
  {
    id: 'absolute',
    title: 'Absolute Reference',
    description: 'Multiply each quantity by the tax rate in B1. The formula in C2 must lock the reference to B1 so it can be copied down.',
    grid: [
      [
        { value: '', isHeader: true },
        { value: 'A', isHeader: true },
        { value: 'B', isHeader: true },
        { value: 'C', isHeader: true },
      ],
      [
        { value: '1', isHeader: true },
        { value: 'Quantity' },
        { value: '1.08' },
        { value: 'With Tax' },
      ],
      [
        { value: '2', isHeader: true },
        { value: '250' },
        { value: '' },
        { value: '?', isEditable: true, highlight: true },
      ],
      [
        { value: '3', isHeader: true },
        { value: '180' },
        { value: '' },
        { value: '' },
      ],
      [
        { value: '4', isHeader: true },
        { value: '320' },
        { value: '' },
        { value: '' },
      ],
    ],
    targetCell: { row: 2, col: 3 },
    acceptedAnswers: [
      '=A2*$B$1',
      '=a2*$b$1',
      '=$B$1*A2',
      '=$b$1*a2',
      '270',
    ],
    hint: 'Use $ signs to lock a cell reference: $B$1 means "always refer to B1" even when the formula is copied. Multiply A2 by $B$1.',
    points: 16,
  },
  {
    id: 'concatenate',
    title: 'CONCATENATE / Text Join',
    description: 'Combine the first name in A1 and last name in B1 into a full name in C1 with a space between them.',
    grid: [
      [
        { value: '', isHeader: true },
        { value: 'A', isHeader: true },
        { value: 'B', isHeader: true },
        { value: 'C', isHeader: true },
      ],
      [
        { value: '1', isHeader: true },
        { value: 'Jane' },
        { value: 'Smith' },
        { value: '?', isEditable: true, highlight: true },
      ],
      [
        { value: '2', isHeader: true },
        { value: 'John' },
        { value: 'Doe' },
        { value: '' },
      ],
    ],
    targetCell: { row: 1, col: 3 },
    acceptedAnswers: [
      '=A1&" "&B1',
      '=a1&" "&b1',
      '=CONCATENATE(A1," ",B1)',
      '=concatenate(a1," ",b1)',
      '=CONCAT(A1," ",B1)',
      '=concat(a1," ",b1)',
      'Jane Smith',
    ],
    hint: 'Use the & operator: =A1&" "&B1, or the CONCATENATE function: =CONCATENATE(A1," ",B1).',
    points: 17,
  },
];

// ─────────────────────────────────────────────
// INLINE DATA: SQL Challenges
// ─────────────────────────────────────────────

const sqlChallenges: SQLChallenge[] = [
  {
    id: 'basic-select',
    title: 'Basic SELECT',
    description: 'Select all products from the products table, ordered by price from highest to lowest.',
    tables: [
      {
        name: 'products',
        columns: [
          { name: 'id', type: 'INT', isPK: true },
          { name: 'name', type: 'VARCHAR' },
          { name: 'price', type: 'DECIMAL' },
          { name: 'category', type: 'VARCHAR' },
        ],
      },
    ],
    sampleData: {
      products: [
        { id: 1, name: 'Laptop', price: 999.99, category: 'Electronics' },
        { id: 2, name: 'Desk Chair', price: 249.00, category: 'Furniture' },
        { id: 3, name: 'Keyboard', price: 79.99, category: 'Electronics' },
        { id: 4, name: 'Monitor', price: 449.00, category: 'Electronics' },
      ],
    },
    expectedOutput: [
      { id: 1, name: 'Laptop', price: 999.99, category: 'Electronics' },
      { id: 4, name: 'Monitor', price: 449.00, category: 'Electronics' },
      { id: 2, name: 'Desk Chair', price: 249.00, category: 'Furniture' },
      { id: 3, name: 'Keyboard', price: 79.99, category: 'Electronics' },
    ],
    requiredTokens: ['SELECT', 'FROM', 'ORDER BY'],
    acceptedPatterns: [
      'SELECT\\s+\\*\\s+FROM\\s+products\\s+ORDER\\s+BY\\s+price\\s+DESC',
      'SELECT\\s+.+\\s+FROM\\s+products\\s+ORDER\\s+BY\\s+price\\s+DESC',
    ],
    hint: 'Use SELECT * FROM table_name ORDER BY column_name DESC to sort results in descending order.',
    points: 20,
  },
  {
    id: 'where-filter',
    title: 'WHERE Filter',
    description: 'Find all employees in the "Engineering" department who earn more than $80,000.',
    tables: [
      {
        name: 'employees',
        columns: [
          { name: 'id', type: 'INT', isPK: true },
          { name: 'name', type: 'VARCHAR' },
          { name: 'department', type: 'VARCHAR' },
          { name: 'salary', type: 'INT' },
        ],
      },
    ],
    sampleData: {
      employees: [
        { id: 1, name: 'Alice', department: 'Engineering', salary: 95000 },
        { id: 2, name: 'Bob', department: 'Marketing', salary: 72000 },
        { id: 3, name: 'Carol', department: 'Engineering', salary: 88000 },
        { id: 4, name: 'Dave', department: 'Engineering', salary: 76000 },
        { id: 5, name: 'Eve', department: 'Sales', salary: 91000 },
      ],
    },
    expectedOutput: [
      { id: 1, name: 'Alice', department: 'Engineering', salary: 95000 },
      { id: 3, name: 'Carol', department: 'Engineering', salary: 88000 },
    ],
    requiredTokens: ['SELECT', 'FROM', 'WHERE', 'AND'],
    acceptedPatterns: [
      "SELECT\\s+.+\\s+FROM\\s+employees\\s+WHERE\\s+department\\s*=\\s*['\"]Engineering['\"]\\s+AND\\s+salary\\s*>\\s*80000",
      "SELECT\\s+.+\\s+FROM\\s+employees\\s+WHERE\\s+salary\\s*>\\s*80000\\s+AND\\s+department\\s*=\\s*['\"]Engineering['\"]",
    ],
    hint: 'Use WHERE with AND to combine two conditions: department = "Engineering" AND salary > 80000.',
    points: 20,
  },
  {
    id: 'inner-join',
    title: 'INNER JOIN',
    description: 'Join the orders and customers tables to show each customer\'s name alongside their order total.',
    tables: [
      {
        name: 'orders',
        columns: [
          { name: 'id', type: 'INT', isPK: true },
          { name: 'customer_id', type: 'INT', isFK: 'customers.id' },
          { name: 'total', type: 'DECIMAL' },
        ],
      },
      {
        name: 'customers',
        columns: [
          { name: 'id', type: 'INT', isPK: true },
          { name: 'name', type: 'VARCHAR' },
          { name: 'city', type: 'VARCHAR' },
        ],
      },
    ],
    sampleData: {
      orders: [
        { id: 101, customer_id: 1, total: 250.00 },
        { id: 102, customer_id: 2, total: 175.50 },
        { id: 103, customer_id: 1, total: 89.99 },
      ],
      customers: [
        { id: 1, name: 'Acme Corp', city: 'New York' },
        { id: 2, name: 'Globex Inc', city: 'Chicago' },
        { id: 3, name: 'Initech', city: 'Austin' },
      ],
    },
    expectedOutput: [
      { name: 'Acme Corp', total: 250.00 },
      { name: 'Globex Inc', total: 175.50 },
      { name: 'Acme Corp', total: 89.99 },
    ],
    requiredTokens: ['SELECT', 'JOIN', 'ON'],
    acceptedPatterns: [
      'SELECT\\s+.+\\s+FROM\\s+orders\\s+(INNER\\s+)?JOIN\\s+customers\\s+ON\\s+orders\\.customer_id\\s*=\\s*customers\\.id',
      'SELECT\\s+.+\\s+FROM\\s+customers\\s+(INNER\\s+)?JOIN\\s+orders\\s+ON\\s+customers\\.id\\s*=\\s*orders\\.customer_id',
      'SELECT\\s+.+\\s+FROM\\s+orders\\s+(INNER\\s+)?JOIN\\s+customers\\s+ON\\s+customers\\.id\\s*=\\s*orders\\.customer_id',
      'SELECT\\s+.+\\s+FROM\\s+customers\\s+(INNER\\s+)?JOIN\\s+orders\\s+ON\\s+orders\\.customer_id\\s*=\\s*customers\\.id',
    ],
    hint: 'Use JOIN ... ON to connect two tables: SELECT columns FROM orders JOIN customers ON orders.customer_id = customers.id.',
    points: 20,
  },
  {
    id: 'group-by',
    title: 'GROUP BY + Aggregate',
    description: 'Calculate the total sales amount for each region.',
    tables: [
      {
        name: 'sales',
        columns: [
          { name: 'id', type: 'INT', isPK: true },
          { name: 'product', type: 'VARCHAR' },
          { name: 'region', type: 'VARCHAR' },
          { name: 'amount', type: 'DECIMAL' },
        ],
      },
    ],
    sampleData: {
      sales: [
        { id: 1, product: 'Widget', region: 'North', amount: 1200 },
        { id: 2, product: 'Gadget', region: 'South', amount: 800 },
        { id: 3, product: 'Widget', region: 'North', amount: 950 },
        { id: 4, product: 'Bolt', region: 'East', amount: 1500 },
        { id: 5, product: 'Gadget', region: 'South', amount: 600 },
      ],
    },
    expectedOutput: [
      { region: 'North', total_amount: 2150 },
      { region: 'South', total_amount: 1400 },
      { region: 'East', total_amount: 1500 },
    ],
    requiredTokens: ['SELECT', 'SUM', 'GROUP BY'],
    acceptedPatterns: [
      'SELECT\\s+region\\s*,\\s*SUM\\s*\\(\\s*amount\\s*\\)\\s+(AS\\s+\\w+\\s+)?FROM\\s+sales\\s+GROUP\\s+BY\\s+region',
      'SELECT\\s+region\\s*,\\s*SUM\\s*\\(\\s*amount\\s*\\)\\s*\\w*\\s+FROM\\s+sales\\s+GROUP\\s+BY\\s+region',
    ],
    hint: 'Use SUM(amount) with GROUP BY region to get totals per region: SELECT region, SUM(amount) FROM sales GROUP BY region.',
    points: 20,
  },
  {
    id: 'having',
    title: 'HAVING Clause',
    description: 'Find customers who have placed more than 3 orders.',
    tables: [
      {
        name: 'orders',
        columns: [
          { name: 'id', type: 'INT', isPK: true },
          { name: 'customer_id', type: 'INT' },
          { name: 'total', type: 'DECIMAL' },
        ],
      },
    ],
    sampleData: {
      orders: [
        { id: 1, customer_id: 101, total: 50 },
        { id: 2, customer_id: 102, total: 75 },
        { id: 3, customer_id: 101, total: 120 },
        { id: 4, customer_id: 101, total: 30 },
        { id: 5, customer_id: 103, total: 200 },
        { id: 6, customer_id: 101, total: 95 },
        { id: 7, customer_id: 102, total: 60 },
      ],
    },
    expectedOutput: [
      { customer_id: 101, order_count: 4 },
    ],
    requiredTokens: ['SELECT', 'COUNT', 'GROUP BY', 'HAVING'],
    acceptedPatterns: [
      'SELECT\\s+customer_id\\s*,\\s*COUNT\\s*\\(\\s*\\*\\s*\\)\\s+(AS\\s+\\w+\\s+)?FROM\\s+orders\\s+GROUP\\s+BY\\s+customer_id\\s+HAVING\\s+COUNT\\s*\\(\\s*\\*\\s*\\)\\s*>\\s*3',
      'SELECT\\s+customer_id\\s*,\\s*COUNT\\s*\\(\\s*id\\s*\\)\\s+(AS\\s+\\w+\\s+)?FROM\\s+orders\\s+GROUP\\s+BY\\s+customer_id\\s+HAVING\\s+COUNT\\s*\\(\\s*id\\s*\\)\\s*>\\s*3',
      'SELECT\\s+customer_id\\s*,\\s*COUNT\\s*\\(\\s*\\*\\s*\\)\\s*\\w*\\s*FROM\\s+orders\\s+GROUP\\s+BY\\s+customer_id\\s+HAVING\\s+COUNT\\s*\\(\\s*\\*\\s*\\)\\s*>\\s*3',
      'SELECT\\s+customer_id\\s*,\\s*COUNT\\s*\\(\\s*id\\s*\\)\\s*\\w*\\s*FROM\\s+orders\\s+GROUP\\s+BY\\s+customer_id\\s+HAVING\\s+COUNT\\s*\\(\\s*id\\s*\\)\\s*>\\s*3',
    ],
    hint: 'GROUP BY customer_id, then use HAVING COUNT(*) > 3 to filter groups. HAVING is like WHERE but for aggregated results.',
    points: 20,
  },
];

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────

const TOTAL_TIME_SECONDS = 25 * 60; // 25 minutes
const SPREADSHEET_COUNT = spreadsheetChallenges.length;
const SQL_COUNT = sqlChallenges.length;
const SPREADSHEET_MAX = spreadsheetChallenges.reduce((s, c) => s + c.points, 0);
const SQL_MAX = sqlChallenges.reduce((s, c) => s + c.points, 0);

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function normalize(s: string): string {
  return s.replace(/\s+/g, '').toLowerCase();
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ─────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────

export const TechnicalGame: React.FC<GameComponentProps> = ({
  section,
  onComplete,
  onExit,
  onXPGain,
}) => {
  // --- Core state ---
  const [phase, setPhase] = useState<GamePhase>('intro');
  const [startTime, setStartTime] = useState<number>(0);
  const [elapsed, setElapsed] = useState(0);

  // --- Spreadsheet state ---
  const [ssIndex, setSsIndex] = useState(0);
  const [ssInput, setSsInput] = useState('');
  const [ssStates, setSsStates] = useState<SpreadsheetState[]>(
    spreadsheetChallenges.map(() => ({ solved: false, attempts: 0, pointsEarned: 0 }))
  );
  const [ssCellStatus, setSsCellStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [ssSelectedCell, setSsSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const ssInputRef = useRef<HTMLInputElement>(null);

  // --- SQL state ---
  const [sqlIndex, setSqlIndex] = useState(0);
  const [sqlInput, setSqlInput] = useState('');
  const [sqlStates, setSqlStates] = useState<SQLState[]>(
    sqlChallenges.map(() => ({ solved: false, attempts: 0, pointsEarned: 0, hintUsed: false }))
  );
  const [sqlStatus, setSqlStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [sqlError, setSqlError] = useState('');
  const [sqlShowHint, setSqlShowHint] = useState(false);
  const [sqlShowExpected, setSqlShowExpected] = useState(true);
  const sqlTextareaRef = useRef<HTMLTextAreaElement>(null);

  // --- Derived scores ---
  const ssEarned = ssStates.reduce((s, c) => s + c.pointsEarned, 0);
  const sqlEarned = sqlStates.reduce((s, c) => s + c.pointsEarned, 0);
  const totalScore = ssEarned + sqlEarned;

  // --- Timer ---
  useEffect(() => {
    if (phase === 'intro' || phase === 'summary') return;
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [phase, startTime]);

  const timeRemaining = Math.max(0, TOTAL_TIME_SECONDS - elapsed);

  // Auto-finish on time out
  useEffect(() => {
    if (timeRemaining === 0 && (phase === 'spreadsheet' || phase === 'sql')) {
      setPhase('summary');
    }
  }, [timeRemaining, phase]);

  // --- Start game ---
  const handleStart = useCallback(() => {
    setStartTime(Date.now());
    setPhase('spreadsheet');
  }, []);

  // ─────────────────────────────────────────────
  // SPREADSHEET HANDLERS
  // ─────────────────────────────────────────────

  const handleSsCellClick = useCallback(
    (row: number, col: number, cell: CellData) => {
      if (cell.isEditable && !ssStates[ssIndex].solved) {
        setSsSelectedCell({ row, col });
        setTimeout(() => ssInputRef.current?.focus(), 50);
      }
    },
    [ssIndex, ssStates]
  );

  const advanceSpreadsheet = useCallback(() => {
    if (ssIndex < SPREADSHEET_COUNT - 1) {
      setSsIndex((i) => i + 1);
      setSsInput('');
      setSsCellStatus('idle');
      setSsSelectedCell(null);
    } else {
      // Move to SQL phase
      setPhase('sql');
    }
  }, [ssIndex]);

  const handleSsSubmit = useCallback(() => {
    const trimmed = ssInput.trim();
    if (!trimmed) return;

    const challenge = spreadsheetChallenges[ssIndex];
    const isCorrect = challenge.acceptedAnswers.some(
      (ans) => normalize(ans) === normalize(trimmed)
    );

    const attempts = ssStates[ssIndex].attempts + 1;
    // Deduct points for retries: first try = full, second = 75%, third+ = 50%
    const multiplier = attempts === 1 ? 1 : attempts === 2 ? 0.75 : 0.5;
    const earned = isCorrect ? Math.round(challenge.points * multiplier) : 0;

    setSsStates((prev) => {
      const updated = [...prev];
      updated[ssIndex] = {
        attempts,
        solved: isCorrect || updated[ssIndex].solved,
        pointsEarned: isCorrect ? earned : updated[ssIndex].pointsEarned,
      };
      return updated;
    });

    if (isCorrect) {
      setSsCellStatus('correct');
      onXPGain(earned, `tech-spreadsheet-${challenge.id}`);
      setTimeout(advanceSpreadsheet, 1200);
    } else {
      setSsCellStatus('wrong');
      setTimeout(() => setSsCellStatus('idle'), 600);
    }
  }, [ssInput, ssIndex, ssStates, advanceSpreadsheet, onXPGain]);

  const handleSsKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSsSubmit();
      }
    },
    [handleSsSubmit]
  );

  // ─────────────────────────────────────────────
  // SQL HANDLERS
  // ─────────────────────────────────────────────

  const advanceSql = useCallback(() => {
    if (sqlIndex < SQL_COUNT - 1) {
      setSqlIndex((i) => i + 1);
      setSqlInput('');
      setSqlStatus('idle');
      setSqlShowHint(false);
      setSqlError('');
      setSqlShowExpected(true);
    } else {
      setPhase('summary');
    }
  }, [sqlIndex]);

  const handleRunQuery = useCallback(() => {
    const trimmed = sqlInput.trim();
    if (!trimmed) return;

    const challenge = sqlChallenges[sqlIndex];
    const upper = trimmed.replace(/;$/, '').trim().toUpperCase();

    // Check required tokens
    const missing = challenge.requiredTokens.filter(
      (t) => !upper.includes(t.toUpperCase())
    );
    if (missing.length > 0) {
      setSqlStatus('wrong');
      setSqlError(`Missing required SQL keywords: ${missing.join(', ')}`);
      setTimeout(() => setSqlStatus('idle'), 800);

      setSqlStates((prev) => {
        const updated = [...prev];
        updated[sqlIndex] = {
          ...updated[sqlIndex],
          attempts: updated[sqlIndex].attempts + 1,
        };
        return updated;
      });
      return;
    }

    // Check against patterns
    const clean = trimmed.replace(/;$/, '').trim();
    const matchesPattern = challenge.acceptedPatterns.some((patStr) => {
      try {
        return new RegExp(patStr, 'i').test(clean);
      } catch {
        return false;
      }
    });

    if (!matchesPattern) {
      setSqlStatus('wrong');
      setSqlError('Query structure does not match the expected pattern. Check your syntax and column names.');
      setTimeout(() => setSqlStatus('idle'), 800);

      setSqlStates((prev) => {
        const updated = [...prev];
        updated[sqlIndex] = {
          ...updated[sqlIndex],
          attempts: updated[sqlIndex].attempts + 1,
        };
        return updated;
      });
      return;
    }

    // Correct
    const hintPenalty = sqlStates[sqlIndex].hintUsed
      ? Math.floor(challenge.points * 0.3)
      : 0;
    const earned = challenge.points - hintPenalty;

    setSqlStates((prev) => {
      const updated = [...prev];
      updated[sqlIndex] = {
        ...updated[sqlIndex],
        attempts: updated[sqlIndex].attempts + 1,
        solved: true,
        pointsEarned: earned,
      };
      return updated;
    });

    setSqlStatus('correct');
    setSqlError('');
    onXPGain(earned, `tech-sql-${challenge.id}`);
    setTimeout(advanceSql, 1800);
  }, [sqlInput, sqlIndex, sqlStates, advanceSql, onXPGain]);

  const handleSqlHint = useCallback(() => {
    setSqlStates((prev) => {
      const updated = [...prev];
      updated[sqlIndex] = { ...updated[sqlIndex], hintUsed: true };
      return updated;
    });
    setSqlShowHint(true);
  }, [sqlIndex]);

  const handleSqlKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleRunQuery();
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        const target = e.target as HTMLTextAreaElement;
        const start = target.selectionStart;
        const end = target.selectionEnd;
        setSqlInput(sqlInput.substring(0, start) + '  ' + sqlInput.substring(end));
        setTimeout(() => {
          target.selectionStart = target.selectionEnd = start + 2;
        }, 0);
      }
    },
    [handleRunQuery, sqlInput]
  );

  // ─────────────────────────────────────────────
  // EXIT + COMPLETE
  // ─────────────────────────────────────────────

  const handleExit = useCallback(() => {
    const ssSolved = ssStates.filter((c) => c.solved).length;
    const sqlSolved = sqlStates.filter((c) => c.solved).length;
    const progress: AssessmentProgress = {
      step: phase === 'spreadsheet' ? ssIndex : SPREADSHEET_COUNT + sqlIndex,
      correctCount: ssSolved + sqlSolved,
      textInput: '',
      gameScore: totalScore,
      simState: { phase },
      xpEarned: totalScore,
    };
    onExit(progress);
  }, [phase, ssIndex, sqlIndex, ssStates, sqlStates, totalScore, onExit]);

  const handleFinish = useCallback(() => {
    const ssNorm = SPREADSHEET_MAX > 0 ? (ssEarned / SPREADSHEET_MAX) * 100 : 0;
    const sqlNorm = SQL_MAX > 0 ? (sqlEarned / SQL_MAX) * 100 : 0;
    let overall = (ssNorm + sqlNorm) / 2;

    // Speed bonus: >30% time remaining adds 10%
    const timeRatio = timeRemaining / TOTAL_TIME_SECONDS;
    if (timeRatio > 0.3) {
      overall = Math.min(100, overall * 1.1);
    }

    const result: GameResult = {
      score: Math.round(overall),
      rawScore: ssEarned + sqlEarned,
      timeSpent: elapsed,
      metrics: {
        spreadsheetScore: Math.round(ssNorm),
        sqlScore: Math.round(sqlNorm),
        spreadsheetSolved: ssStates.filter((c) => c.solved).length,
        sqlSolved: sqlStates.filter((c) => c.solved).length,
        totalChallenges: SPREADSHEET_COUNT + SQL_COUNT,
        hintsUsed: sqlStates.filter((c) => c.hintUsed).length,
        speedBonus: timeRatio > 0.3 ? 10 : 0,
      },
      type: 'technical-game',
      data: {
        phase1Score: ssEarned,
        phase2Score: sqlEarned,
      },
    };
    onComplete(result);
  }, [ssEarned, sqlEarned, ssStates, sqlStates, elapsed, timeRemaining, onComplete]);

  // ─────────────────────────────────────────────
  // RENDER: INTRO
  // ─────────────────────────────────────────────

  if (phase === 'intro') {
    return (
      <GameIntro
        title="Tech Challenge"
        description="Fix broken spreadsheets and write database queries. Two phases testing your hands-on technical skills."
        icon="terminal"
        duration="~25 min"
        rules={[
          'Phase 1: Fix formulas in 6 broken spreadsheet challenges',
          'Phase 2: Write 5 SQL queries to match expected outputs',
          'Type formulas and queries directly \u2014 no multiple choice',
          'Hints available in SQL phase but reduce your score',
        ]}
        onStart={handleStart}
      />
    );
  }

  // ─────────────────────────────────────────────
  // RENDER: SUMMARY
  // ─────────────────────────────────────────────

  if (phase === 'summary') {
    const ssSolved = ssStates.filter((c) => c.solved).length;
    const sqlSolved = sqlStates.filter((c) => c.solved).length;
    const ssPercent = SPREADSHEET_MAX > 0 ? Math.round((ssEarned / SPREADSHEET_MAX) * 100) : 0;
    const sqlPercent = SQL_MAX > 0 ? Math.round((sqlEarned / SQL_MAX) * 100) : 0;
    const timeRatio = timeRemaining / TOTAL_TIME_SECONDS;
    let overallPercent = (ssPercent + sqlPercent) / 2;
    if (timeRatio > 0.3) {
      overallPercent = Math.min(100, Math.round(overallPercent * 1.1));
    } else {
      overallPercent = Math.round(overallPercent);
    }

    return (
      <div className="max-w-xl mx-auto mt-10 animate-[fadeIn_0.3s_ease-out]">
        <div className="bg-card-bg dark:bg-card-bg-dark p-10 rounded-3xl shadow-xl border border-text-main/5 dark:border-white/5">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="size-20 mx-auto mb-5 rounded-2xl bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-5xl text-primary">emoji_events</span>
            </div>
            <h2 className="text-2xl font-black text-text-main dark:text-white mb-1">Tech Challenge Complete</h2>
            <p className="text-text-muted text-sm">Here is your performance breakdown</p>
          </div>

          {/* Phase Scores */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-background-light dark:bg-white/5 rounded-2xl p-5 text-center">
              <span className="material-symbols-outlined text-2xl text-[#217346] mb-2">table_chart</span>
              <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">Phase 1: Spreadsheets</p>
              <p className="text-3xl font-black text-text-main dark:text-white">{ssPercent}%</p>
              <p className="text-xs text-text-muted mt-1">{ssSolved}/{SPREADSHEET_COUNT} solved</p>
            </div>
            <div className="bg-background-light dark:bg-white/5 rounded-2xl p-5 text-center">
              <span className="material-symbols-outlined text-2xl text-indigo-500 mb-2">database</span>
              <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">Phase 2: SQL</p>
              <p className="text-3xl font-black text-text-main dark:text-white">{sqlPercent}%</p>
              <p className="text-xs text-text-muted mt-1">{sqlSolved}/{SQL_COUNT} solved</p>
            </div>
          </div>

          {/* Overall */}
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 text-center mb-6">
            <p className="text-xs font-bold text-primary uppercase tracking-wider mb-1">Overall Score</p>
            <p className="text-5xl font-black text-primary">{overallPercent}%</p>
            <p className="text-xs text-text-muted mt-2">
              {ssSolved + sqlSolved} of {SPREADSHEET_COUNT + SQL_COUNT} challenges completed
              {timeRatio > 0.3 && (
                <span className="ml-1 text-primary font-bold">(+10% speed bonus!)</span>
              )}
            </p>
          </div>

          {/* Time */}
          <div className="flex items-center justify-center gap-2 text-sm text-text-muted mb-8">
            <span className="material-symbols-outlined text-base">timer</span>
            <span>Completed in {formatTime(elapsed)}</span>
          </div>

          {/* Finish button */}
          <button
            onClick={handleFinish}
            className="w-full py-4 bg-primary text-black font-black text-lg rounded-2xl hover:bg-[#00d64b] active:scale-[0.98] transition-all shadow-lg shadow-primary/20"
          >
            View Results
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // RENDER: PERSISTENT HUD
  // ─────────────────────────────────────────────

  const isSpreadsheet = phase === 'spreadsheet';
  const currentChallenge = isSpreadsheet ? ssIndex : sqlIndex;
  const currentTotal = isSpreadsheet ? SPREADSHEET_COUNT : SQL_COUNT;
  const phaseLabel = isSpreadsheet ? 'Phase 1: Spreadsheets' : 'Phase 2: SQL';
  const phaseIcon = isSpreadsheet ? 'table_chart' : 'database';

  const hud = (
    <div className="flex items-center justify-between mb-5 bg-card-bg dark:bg-card-bg-dark rounded-2xl border border-text-main/5 dark:border-white/5 px-4 py-3 shadow-sm">
      {/* Left: back + phase */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleExit}
          className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors text-text-muted"
          title="Exit"
        >
          <span className="material-symbols-outlined text-xl">arrow_back</span>
        </button>
        <div className="flex items-center gap-2">
          <span className={`material-symbols-outlined text-lg ${isSpreadsheet ? 'text-[#217346]' : 'text-indigo-500'}`}>
            {phaseIcon}
          </span>
          <span className="text-sm font-bold text-text-main dark:text-white">{phaseLabel}</span>
        </div>
      </div>

      {/* Center: progress */}
      <div className="flex items-center gap-4">
        <ProgressTrack current={currentChallenge} total={currentTotal} />
      </div>

      {/* Right: score + timer */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-sm font-bold text-primary tabular-nums">
          <span className="material-symbols-outlined text-base">star</span>
          {totalScore}
        </div>
        <div className={`flex items-center gap-1.5 text-sm font-bold tabular-nums ${
          timeRemaining < 120 ? 'text-red-500 animate-pulse' : 'text-text-muted'
        }`}>
          <span className="material-symbols-outlined text-base">timer</span>
          {formatTime(timeRemaining)}
        </div>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────
  // RENDER: SPREADSHEET PHASE
  // ─────────────────────────────────────────────

  if (phase === 'spreadsheet') {
    const challenge = spreadsheetChallenges[ssIndex];
    const state = ssStates[ssIndex];
    const cellRef = `${String.fromCharCode(64 + challenge.targetCell.col)}${challenge.targetCell.row}`;

    return (
      <div className="max-w-4xl mx-auto animate-[fadeIn_0.2s_ease-out]">
        {hud}

        {/* Challenge info */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center justify-center size-6 rounded-full bg-[#217346]/10 text-[#217346] text-xs font-black">
              {ssIndex + 1}
            </span>
            <h3 className="text-lg font-black text-text-main dark:text-white">{challenge.title}</h3>
          </div>
          <p className="text-sm text-text-muted ml-8">{challenge.description}</p>
        </div>

        {/* Formula bar */}
        <div className="flex items-center gap-2 mb-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2">
          <span className="text-xs font-mono font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
            {ssSelectedCell ? cellRef : '--'}
          </span>
          <span className="text-gray-300 dark:text-gray-600">|</span>
          <span className="text-xs font-mono italic text-gray-500 dark:text-gray-400 mr-1">fx</span>
          <input
            ref={ssInputRef}
            type="text"
            value={ssInput}
            onChange={(e) => setSsInput(e.target.value)}
            onKeyDown={handleSsKeyDown}
            placeholder="Click the highlighted cell and type a formula..."
            className="flex-1 bg-transparent text-sm font-mono text-text-main dark:text-white outline-none placeholder:text-gray-400"
            disabled={state.solved}
          />
        </div>

        {/* Spreadsheet grid */}
        <div className="overflow-x-auto border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 shadow-sm">
          <table className="w-full border-collapse">
            <tbody>
              {challenge.grid.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => {
                    const isTarget =
                      ri === challenge.targetCell.row && ci === challenge.targetCell.col;
                    const isSelected =
                      ssSelectedCell?.row === ri && ssSelectedCell?.col === ci;

                    let cellClasses =
                      'px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 transition-all duration-200';

                    if (ri === 0 && cell.isHeader) {
                      cellClasses +=
                        ' bg-[#217346] text-white font-bold text-center text-xs';
                    } else if (ci === 0 && cell.isHeader) {
                      cellClasses +=
                        ' bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-mono text-xs text-center w-10';
                    } else if (cell.highlight && !state.solved) {
                      cellClasses += ' bg-red-50 dark:bg-red-900/20 cursor-pointer';
                      if (ssCellStatus === 'correct' && isTarget) {
                        cellClasses = cellClasses.replace(
                          'bg-red-50 dark:bg-red-900/20',
                          'bg-green-50 dark:bg-green-900/30'
                        );
                      }
                      if (ssCellStatus === 'wrong' && isTarget) {
                        cellClasses += ' animate-[shake_0.3s_ease-in-out]';
                      }
                      if (isSelected) {
                        cellClasses += ' ring-2 ring-primary';
                      }
                    } else if (cell.highlight && state.solved) {
                      cellClasses += ' bg-green-50 dark:bg-green-900/30';
                    } else {
                      cellClasses += ' bg-white dark:bg-gray-900';
                    }

                    return (
                      <td
                        key={ci}
                        className={cellClasses}
                        onClick={() => handleSsCellClick(ri, ci, cell)}
                      >
                        {isTarget && cell.highlight && !state.solved ? (
                          <div className="flex items-center gap-1">
                            <span
                              className={`font-mono ${
                                cell.value.includes('ERROR') || cell.value === '?'
                                  ? 'text-red-500 font-bold'
                                  : ''
                              }`}
                            >
                              {isSelected ? (
                                <span className="text-primary font-mono">
                                  {ssInput || '|'}
                                </span>
                              ) : (
                                <>
                                  {cell.value}
                                  <span className="inline-block w-2 h-2 rounded-full bg-red-500 ml-1 animate-pulse" />
                                </>
                              )}
                            </span>
                          </div>
                        ) : isTarget && state.solved ? (
                          <span className="text-green-600 dark:text-green-400 font-bold font-mono flex items-center gap-1">
                            <span className="material-symbols-outlined text-base">
                              check
                            </span>
                            {ssInput || cell.value}
                          </span>
                        ) : (
                          <span className="font-mono">{cell.value}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Retry indicator */}
        {ssStates[ssIndex].attempts > 0 && !ssStates[ssIndex].solved && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 ml-1">
            Attempt {ssStates[ssIndex].attempts + 1} — retries reduce points earned
          </p>
        )}

        {/* Action row */}
        <div className="flex items-center justify-end mt-4 gap-3">
          <button
            onClick={handleSsSubmit}
            disabled={!ssInput.trim() || state.solved}
            className="px-6 py-2.5 bg-primary text-black font-bold text-sm rounded-xl hover:bg-[#00d64b] active:scale-[0.97] transition-all disabled:opacity-40 disabled:pointer-events-none shadow-sm flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">play_arrow</span>
            Execute
          </button>
        </div>

        {/* Hint */}
        <div className="mt-3">
          <button
            onClick={() => {}}
            className="text-sm text-text-muted hover:text-primary transition-colors flex items-center gap-1 group"
            onMouseEnter={(e) => {
              const el = e.currentTarget.nextElementSibling as HTMLElement | null;
              if (el) el.style.display = 'block';
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget.nextElementSibling as HTMLElement | null;
              if (el) el.style.display = 'none';
            }}
          >
            <span className="material-symbols-outlined text-base">lightbulb</span>
            Hover for hint
          </button>
          <div
            className="hidden mt-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-xl text-sm text-amber-800 dark:text-amber-200 animate-[fadeIn_0.2s_ease-out]"
          >
            <span className="material-symbols-outlined text-base mr-1 align-middle">tips_and_updates</span>
            {challenge.hint}
          </div>
        </div>

        <style>{`
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            20% { transform: translateX(-6px); }
            40% { transform: translateX(6px); }
            60% { transform: translateX(-4px); }
            80% { transform: translateX(4px); }
          }
        `}</style>
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // RENDER: SQL PHASE
  // ─────────────────────────────────────────────

  const sqlChallenge = sqlChallenges[sqlIndex];
  const sqlState = sqlStates[sqlIndex];
  const expectedCols =
    sqlChallenge.expectedOutput.length > 0
      ? Object.keys(sqlChallenge.expectedOutput[0])
      : [];

  return (
    <div className="max-w-6xl mx-auto animate-[fadeIn_0.2s_ease-out]">
      {hud}

      {/* Transition banner on first SQL challenge */}
      {sqlIndex === 0 && sqlState.attempts === 0 && sqlStatus === 'idle' && (
        <div className="mb-5 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700/50 rounded-2xl p-4 flex items-center gap-3 animate-[fadeIn_0.3s_ease-out]">
          <span className="material-symbols-outlined text-2xl text-indigo-500">database</span>
          <div>
            <p className="text-sm font-bold text-indigo-800 dark:text-indigo-200">Phase 2: Query Quest</p>
            <p className="text-xs text-indigo-600 dark:text-indigo-300">
              Write SQL queries against visual schema diagrams. Hints are available but cost 30% of that challenge's points.
            </p>
          </div>
        </div>
      )}

      {/* Challenge info */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-flex items-center justify-center size-6 rounded-full bg-indigo-500/10 text-indigo-500 text-xs font-black">
            {sqlIndex + 1}
          </span>
          <h3 className="text-lg font-black text-text-main dark:text-white">{sqlChallenge.title}</h3>
        </div>
        <p className="text-sm text-text-muted ml-8">{sqlChallenge.description}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* LEFT: Schema + Sample Data + Expected Output */}
        <div className="space-y-4">
          {/* Schema */}
          <div className="bg-card-bg dark:bg-card-bg-dark rounded-xl border border-text-main/5 dark:border-white/5 p-4">
            <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">Schema</p>
            <div className="flex flex-wrap gap-3">
              {sqlChallenge.tables.map((table) => (
                <div
                  key={table.name}
                  className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm min-w-[180px]"
                >
                  <div className="bg-indigo-600 text-white px-3 py-1.5 rounded-t-lg text-sm font-bold flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">table_rows</span>
                    {table.name}
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {table.columns.map((col) => (
                      <div
                        key={col.name}
                        className="flex items-center justify-between px-3 py-1.5 text-xs"
                      >
                        <div className="flex items-center gap-1.5">
                          {col.isPK && (
                            <span
                              className="material-symbols-outlined text-amber-500 text-xs"
                              title="Primary Key"
                            >
                              key
                            </span>
                          )}
                          {col.isFK && (
                            <span
                              className="material-symbols-outlined text-blue-500 text-xs"
                              title={`FK \u2192 ${col.isFK}`}
                            >
                              link
                            </span>
                          )}
                          <span
                            className={`font-mono ${
                              col.isPK
                                ? 'font-bold text-text-main dark:text-white'
                                : 'text-text-main dark:text-gray-300'
                            }`}
                          >
                            {col.name}
                          </span>
                        </div>
                        <span className="text-text-muted font-mono text-[10px]">
                          {col.type}
                        </span>
                      </div>
                    ))}
                  </div>
                  {table.columns.some((c) => c.isFK) && (
                    <div className="px-3 py-1 text-[10px] text-blue-500 dark:text-blue-400 border-t border-gray-100 dark:border-gray-800">
                      {table.columns
                        .filter((c) => c.isFK)
                        .map((c) => (
                          <span key={c.name}>
                            {c.name} &rarr; {c.isFK}
                          </span>
                        ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Sample Data */}
          <div className="bg-card-bg dark:bg-card-bg-dark rounded-xl border border-text-main/5 dark:border-white/5 p-4">
            <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">
              Sample Data
            </p>
            {Object.entries(sqlChallenge.sampleData).map(([tableName, rows]) => {
              const cols = rows.length > 0 ? Object.keys(rows[0]) : [];
              return (
                <div key={tableName} className="mb-3 last:mb-0">
                  <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-1 font-mono">
                    {tableName}
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr>
                          {cols.map((col) => (
                            <th
                              key={col}
                              className="px-2 py-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-mono font-bold text-left text-text-main dark:text-gray-300"
                            >
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row, ri) => (
                          <tr key={ri}>
                            {cols.map((col) => (
                              <td
                                key={col}
                                className="px-2 py-1 border border-gray-200 dark:border-gray-700 font-mono text-text-main dark:text-gray-300"
                              >
                                {String(row[col])}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Expected Output */}
          {sqlShowExpected && (
            <div className="bg-card-bg dark:bg-card-bg-dark rounded-xl border border-text-main/5 dark:border-white/5 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-text-muted uppercase tracking-wider">
                  Expected Output
                </p>
                <button
                  onClick={() => setSqlShowExpected(false)}
                  className="text-xs text-text-muted hover:text-text-main transition-colors"
                >
                  Hide
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr>
                      {expectedCols.map((col) => (
                        <th
                          key={col}
                          className="px-2 py-1 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 font-mono font-bold text-left text-green-800 dark:text-green-300"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sqlChallenge.expectedOutput.map((row, ri) => (
                      <tr key={ri}>
                        {expectedCols.map((col) => (
                          <td
                            key={col}
                            className="px-2 py-1 border border-green-200 dark:border-green-800 font-mono text-text-main dark:text-gray-300"
                          >
                            {String(row[col])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!sqlShowExpected && (
            <button
              onClick={() => setSqlShowExpected(true)}
              className="text-xs text-text-muted hover:text-primary transition-colors"
            >
              Show Expected Output
            </button>
          )}
        </div>

        {/* RIGHT: SQL Editor */}
        <div className="space-y-4">
          <div
            className={`rounded-xl overflow-hidden border-2 transition-colors ${
              sqlStatus === 'correct'
                ? 'border-green-500'
                : sqlStatus === 'wrong'
                ? 'border-red-500'
                : 'border-gray-300 dark:border-gray-600'
            }`}
          >
            {/* Editor header */}
            <div className="bg-gray-800 dark:bg-gray-950 px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="size-3 rounded-full bg-red-500" />
                  <div className="size-3 rounded-full bg-yellow-500" />
                  <div className="size-3 rounded-full bg-green-500" />
                </div>
                <span className="text-xs text-gray-400 ml-2 font-mono">query.sql</span>
              </div>
              <span className="text-[10px] text-gray-500 font-mono">
                Cmd/Ctrl + Enter to run
              </span>
            </div>

            {/* Textarea */}
            <textarea
              ref={sqlTextareaRef}
              value={sqlInput}
              onChange={(e) => setSqlInput(e.target.value)}
              onKeyDown={handleSqlKeyDown}
              placeholder="SELECT ..."
              rows={10}
              spellCheck={false}
              className="w-full bg-gray-900 dark:bg-gray-950 text-green-400 font-mono text-sm p-4 resize-none outline-none placeholder:text-gray-600 leading-relaxed"
              disabled={sqlState.solved}
            />
          </div>

          {/* Run + Hint buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleRunQuery}
              disabled={!sqlInput.trim() || sqlState.solved}
              className="flex-1 py-3 bg-primary text-black font-bold text-sm rounded-xl hover:bg-[#00d64b] active:scale-[0.97] transition-all disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2 shadow-sm"
            >
              <span className="material-symbols-outlined text-lg">play_arrow</span>
              Run Query
            </button>
            <button
              onClick={handleSqlHint}
              disabled={sqlState.hintUsed || sqlState.solved}
              className="px-4 py-3 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-bold text-sm rounded-xl hover:bg-amber-200 dark:hover:bg-amber-900/50 active:scale-[0.97] transition-all disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-base">lightbulb</span>
              Hint {!sqlState.hintUsed && '(-30%)'}
            </button>
          </div>

          {/* Error message */}
          {sqlError && sqlStatus !== 'correct' && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 rounded-xl text-sm text-red-700 dark:text-red-300 animate-[fadeIn_0.2s_ease-out]">
              <span className="material-symbols-outlined text-base mr-1 align-middle">
                error
              </span>
              {sqlError}
            </div>
          )}

          {/* Success message */}
          {sqlStatus === 'correct' && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/50 rounded-xl text-center animate-[fadeIn_0.2s_ease-out]">
              <span className="material-symbols-outlined text-4xl text-green-500 mb-1">
                check_circle
              </span>
              <p className="text-sm font-bold text-green-700 dark:text-green-300">
                Query Correct!
              </p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                +{sqlState.pointsEarned} points
                {sqlState.hintUsed && ' (hint penalty applied)'}
              </p>
            </div>
          )}

          {/* Hint */}
          {sqlShowHint && (
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-xl text-sm text-amber-800 dark:text-amber-200 animate-[fadeIn_0.2s_ease-out]">
              <span className="material-symbols-outlined text-base mr-1 align-middle">
                tips_and_updates
              </span>
              {sqlChallenge.hint}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
