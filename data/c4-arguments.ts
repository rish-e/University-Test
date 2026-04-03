export type FlawType =
  | 'correlation_causation'
  | 'ad_hominem'
  | 'straw_man'
  | 'false_dilemma'
  | 'circular_reasoning'
  | 'appeal_to_fear'
  | 'appeal_to_authority'
  | 'hasty_generalization';

export interface ArgumentRound {
  id: number;
  context: string;
  clauses: string[];
  flawClauseIndex: number;
  flawType: FlawType;
  explanation: string;
}

export const FLAW_LABELS: Record<FlawType, string> = {
  correlation_causation: 'Correlation / Causation',
  ad_hominem: 'Ad Hominem',
  straw_man: 'Straw Man',
  false_dilemma: 'False Dilemma',
  circular_reasoning: 'Circular Reasoning',
  appeal_to_fear: 'Appeal to Fear',
  appeal_to_authority: 'Appeal to Authority',
  hasty_generalization: 'Hasty Generalization',
};

export const argumentRounds: ArgumentRound[] = [
  {
    id: 1,
    context: 'A VP of Marketing argues at a quarterly review:',
    clauses: [
      'Our social media engagement increased by 40% last quarter.',
      'During that same period, our retail sales rose by 12%.',
      'This proves that our social media strategy is directly driving in-store purchases.',
      'I recommend we double the social media budget and reduce traditional advertising spend accordingly.',
    ],
    flawClauseIndex: 2,
    flawType: 'correlation_causation',
    explanation:
      'The argument assumes that because social media engagement and retail sales both increased during the same period, the social media activity caused the sales increase. However, both could be influenced by seasonal trends, a new product launch, or other marketing efforts running simultaneously.',
  },
  {
    id: 2,
    context: 'A board member challenges a proposed merger during a shareholder meeting:',
    clauses: [
      'The CEO who proposed this merger was fired from his last company for poor financial management.',
      'His track record shows a pattern of reckless decision-making in executive roles.',
      'Therefore, this merger proposal is fundamentally flawed and will destroy shareholder value.',
      'We should reject it outright and explore partnerships with more conservative firms instead.',
    ],
    flawClauseIndex: 0,
    flawType: 'ad_hominem',
    explanation:
      'Instead of evaluating the merger on its strategic merits, financial projections, or market fit, the board member attacks the CEO\'s personal history. A proposal should be assessed on its own evidence, not dismissed because of the character of the person presenting it.',
  },
  {
    id: 3,
    context: 'A product manager pushes back on a remote-work policy during a leadership meeting:',
    clauses: [
      'The engineering team has proposed allowing employees to work from home two days per week.',
      'So essentially they want everyone to stop coming to the office entirely and never collaborate face-to-face again.',
      'Studies consistently show that in-person brainstorming sessions produce 20% more viable ideas.',
      'We need to maintain our five-day in-office policy to protect innovation.',
    ],
    flawClauseIndex: 1,
    flawType: 'straw_man',
    explanation:
      'The product manager distorts the original proposal of two days remote per week into "never collaborate face-to-face again." By exaggerating the position into an extreme version, it becomes easier to argue against -- but the argument is no longer addressing what was actually proposed.',
  },
  {
    id: 4,
    context: 'A CFO presents the annual budget strategy to the executive team:',
    clauses: [
      'Our operating costs have grown 18% year over year, outpacing revenue growth.',
      'We are at a critical inflection point that requires immediate action.',
      'Either we lay off 15% of the workforce or we accept that the company will be bankrupt within two years.',
      'I strongly recommend we proceed with the layoffs before the end of this fiscal quarter.',
    ],
    flawClauseIndex: 2,
    flawType: 'false_dilemma',
    explanation:
      'The CFO presents only two options -- mass layoffs or bankruptcy -- when many other strategies exist: renegotiating vendor contracts, pausing expansion, raising prices, restructuring debt, pivoting product lines, or reducing non-personnel expenses. This false binary pressures the audience into accepting a drastic measure.',
  },
  {
    id: 5,
    context: 'A startup founder pitches to venture capital investors:',
    clauses: [
      'Our platform is the best project management tool on the market for distributed teams.',
      'The reason it is the best is that no other tool has received the level of positive feedback we have from remote workers.',
      'Our Net Promoter Score among beta users is 72, which is in the top decile for SaaS products.',
      'We are seeking $8 million in Series A funding to scale to 50,000 paying users within 18 months.',
    ],
    flawClauseIndex: 1,
    flawType: 'circular_reasoning',
    explanation:
      'The founder claims the platform is the best because it gets the best feedback, which is essentially restating the claim as its own evidence. "It\'s the best because people say it\'s the best" is circular -- there is no independent proof of superiority, just a rephrasing of the original assertion.',
  },
  {
    id: 6,
    context: 'A cybersecurity vendor presents to a company\'s IT leadership:',
    clauses: [
      'Ransomware attacks increased 150% globally last year, with average payouts exceeding $1.5 million.',
      'If you do not purchase our enterprise security suite immediately, it is only a matter of time before your entire customer database is compromised and leaked to the dark web.',
      'Our solution uses AI-powered threat detection that monitors over 200 attack vectors in real time.',
      'We can have your organization fully protected within 72 hours of signing the contract.',
    ],
    flawClauseIndex: 1,
    flawType: 'appeal_to_fear',
    explanation:
      'While cybersecurity threats are real, the vendor uses fear rather than evidence to drive the purchasing decision. The claim that the company\'s database will inevitably be "leaked to the dark web" without this specific product is a scare tactic, not a rational analysis of the company\'s actual risk profile or the comparative effectiveness of available solutions.',
  },
  {
    id: 7,
    context: 'A consultant defends a pricing strategy change at a retail company:',
    clauses: [
      'Our competitor NovaMart increased their prices by 8% across all categories last month.',
      'According to Harvard Business School professor Dr. Ellen Marsh, premium pricing always signals higher quality to consumers.',
      'Therefore, raising our prices will directly improve our brand perception and customer loyalty.',
      'I propose we implement a 10% price increase on our top 50 SKUs starting next quarter.',
    ],
    flawClauseIndex: 1,
    flawType: 'appeal_to_authority',
    explanation:
      'The consultant cites a professor\'s blanket statement as definitive proof, but academic authority does not make a universal claim true in every market context. The assertion that premium pricing "always" signals quality ignores factors like customer price sensitivity, competitive dynamics, and the specific product category. An expert\'s general opinion is not evidence for a specific business decision.',
  },
  {
    id: 8,
    context: 'A regional sales director reports to the national sales team:',
    clauses: [
      'I visited three of our franchise locations in the Midwest last week.',
      'All three reported that customers were asking for plant-based menu options.',
      'This clearly means that consumer demand across our entire 200-location national chain has shifted toward plant-based food.',
      'We should overhaul 30% of our menu nationwide to feature plant-based alternatives within the next six months.',
    ],
    flawClauseIndex: 2,
    flawType: 'hasty_generalization',
    explanation:
      'Drawing a sweeping national conclusion from just three franchise locations is a hasty generalization. Three data points from one region cannot represent customer preferences across 200 locations in diverse markets. A proper analysis would require broader surveying, demographic segmentation, and regional sales data before making a nationwide menu change.',
  },
];
