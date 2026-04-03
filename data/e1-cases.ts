export interface CaseBrief {
  id: number;
  clientName: string;
  industry: string;
  briefTitle: string;
  briefSections: { heading: string; content: string; highlight?: string }[];
  decisions: CaseDecision[];
}

export interface CaseDecision {
  id: number;
  question: string;
  context: string;
  options: CaseOption[];
}

export interface CaseOption {
  text: string;
  satisfaction: number;
  impact: number;
  dimensions: {
    analytical?: number;
    decisiveness?: number;
    empathy?: number;
    vision?: number;
  };
}

export const caseBriefs: CaseBrief[] = [
  {
    id: 1,
    clientName: 'VaultSync Technologies',
    industry: 'Cloud Software / Data Privacy',
    briefTitle: 'User Trust Crisis: Data Handling Incident Response',
    briefSections: [
      {
        heading: 'Background',
        content:
          'VaultSync Technologies is a B2B cloud storage and collaboration platform serving 14,000 enterprise clients and over 2.3 million end users. Founded in 2019, the company achieved $180M ARR by focusing on military-grade encryption and a "zero-knowledge" architecture where even VaultSync engineers cannot access customer data. The company is preparing for a Series D round at a $1.4B valuation.',
        highlight: '$180M ARR | 14,000 enterprise clients',
      },
      {
        heading: 'The Incident',
        content:
          'A security researcher publicly disclosed that a VaultSync API endpoint was returning unencrypted metadata -- including file names, timestamps, and collaborator email addresses -- for approximately 340,000 user accounts. While the actual file contents remained encrypted, the metadata exposure contradicts VaultSync\'s core "zero-knowledge" promise. The vulnerability existed for an estimated 11 months before discovery. No evidence of malicious exploitation has been found, but the researcher\'s blog post has already been shared over 8,000 times on social media.',
        highlight: '340,000 accounts affected | 11 months undetected',
      },
      {
        heading: 'Current Situation',
        content:
          'The engineering team patched the API endpoint within 6 hours of disclosure. However, three enterprise clients representing $4.2M in combined ARR have already demanded emergency calls with the CEO. The company\'s VP of Communications has drafted two possible public statements: one that minimizes the incident by emphasizing that no file contents were exposed, and another that fully acknowledges the metadata breach and outlines a remediation plan. Meanwhile, a reporter from TechCrunch has reached out for comment with a 24-hour deadline.',
        highlight: '$4.2M ARR at immediate risk',
      },
      {
        heading: 'Key Metrics',
        content:
          'Customer churn rate (pre-incident): 3.2% annually. Net Promoter Score: 62. Enterprise contract renewal rate: 94%. The security team consists of 18 engineers. Legal counsel estimates potential GDPR fines of up to EUR 8M if EU regulators determine the metadata exposure constitutes a personal data breach. The Series D term sheet has not yet been signed.',
        highlight: 'GDPR fine risk: up to EUR 8M',
      },
      {
        heading: 'Stakeholder Pressures',
        content:
          'The board of directors is divided: two members want to delay the public response until a full forensic audit is complete (estimated 3 weeks), while three others want an immediate, transparent disclosure. The head of sales reports that two prospective enterprise deals worth $1.8M are "on hold" pending the company\'s response. The engineering team is confident the fix is complete but has not yet conducted a comprehensive audit of other API endpoints.',
      },
    ],
    decisions: [
      {
        id: 1,
        question: 'How should VaultSync handle its public communication?',
        context:
          'The TechCrunch reporter\'s deadline is in 18 hours. Social media discussion is accelerating. Three major clients are waiting for a response.',
        options: [
          {
            text: 'Release the full-transparency statement immediately: acknowledge the metadata exposure, detail the timeline, explain the fix, and commit to a third-party security audit within 30 days.',
            satisfaction: 25,
            impact: 30,
            dimensions: { decisiveness: 15, empathy: 10, analytical: -5 },
          },
          {
            text: 'Release the minimized statement emphasizing that no file contents were accessed, while quietly notifying affected enterprise clients directly via their account managers.',
            satisfaction: 5,
            impact: -10,
            dimensions: { analytical: 15, decisiveness: -10, vision: 5 },
          },
          {
            text: 'Wait for the full forensic audit to complete before making any public statement, and request the TechCrunch reporter hold the story until the investigation concludes.',
            satisfaction: -15,
            impact: -5,
            dimensions: { vision: 10, empathy: -15, decisiveness: 10 },
          },
        ],
      },
      {
        id: 2,
        question: 'What remediation should be offered to affected users and enterprise clients?',
        context:
          'Legal has outlined the cost implications of various remediation paths. The board wants to protect the Series D valuation while maintaining client trust.',
        options: [
          {
            text: 'Offer affected enterprise clients a 20% discount on their next renewal, provide all 340,000 affected users with 6 months of free premium features, and establish a $2M bug bounty program.',
            satisfaction: 20,
            impact: 15,
            dimensions: { empathy: 15, vision: -10, decisiveness: 10 },
          },
          {
            text: 'Offer all affected enterprise clients a free third-party security assessment of their VaultSync deployment, extend contracts by 3 months at no cost, and create a dedicated incident response liaison for each enterprise account.',
            satisfaction: 30,
            impact: 25,
            dimensions: { analytical: 10, empathy: 10, vision: 5, decisiveness: -10 },
          },
          {
            text: 'Issue a formal apology letter to all affected accounts and provide a detailed technical report of the vulnerability, but defer any financial remediation until after the Series D closes to protect the valuation.',
            satisfaction: -10,
            impact: 10,
            dimensions: { vision: 15, analytical: 10, empathy: -15 },
          },
        ],
      },
      {
        id: 3,
        question: 'How should VaultSync address the Series D fundraise in light of the incident?',
        context:
          'The lead investor has seen the social media coverage and emailed the CEO asking for an update. The term sheet has not been signed. The company has 14 months of runway remaining.',
        options: [
          {
            text: 'Proactively brief the lead investor on the incident, the response plan, and the third-party audit timeline. Request a 60-day extension on the term sheet to demonstrate that churn remains stable post-incident.',
            satisfaction: 15,
            impact: 30,
            dimensions: { analytical: 10, vision: 10, empathy: 5, decisiveness: -10 },
          },
          {
            text: 'Downplay the incident to the investor, emphasizing that no actual file contents were compromised, and push to close the round as quickly as possible before any churn data materializes.',
            satisfaction: -20,
            impact: -15,
            dimensions: { decisiveness: 15, empathy: -15, analytical: -10 },
          },
          {
            text: 'Withdraw from the Series D entirely and self-fund through operational revenue, using the incident as a catalyst to restructure the company around a smaller, security-first product offering.',
            satisfaction: 5,
            impact: -10,
            dimensions: { vision: 15, decisiveness: 10, analytical: -10, empathy: -5 },
          },
        ],
      },
    ],
  },
  {
    id: 2,
    clientName: 'Pinnacle Freight Solutions',
    industry: 'Logistics & Transportation',
    briefTitle: 'Fleet Electrification: Navigating the EV Transition',
    briefSections: [
      {
        heading: 'Background',
        content:
          'Pinnacle Freight Solutions is a mid-market logistics company operating 1,200 Class 6 and Class 8 delivery trucks across the eastern United States. Founded in 2001, the company generates $420M in annual revenue with a 6.8% net margin. Pinnacle serves 3,200 commercial clients, primarily in retail distribution and food service. The average age of its fleet is 7.4 years, and diesel fuel represents 31% of total operating costs ($130M annually).',
        highlight: '$420M revenue | 1,200 trucks | 31% fuel cost ratio',
      },
      {
        heading: 'Market Pressure',
        content:
          'Three of Pinnacle\'s top ten clients (representing $62M in combined revenue) have announced Scope 3 emissions reduction targets that require their logistics partners to reduce carbon intensity by 40% by 2029. The state of New York has enacted regulations mandating that 30% of new commercial vehicle purchases be zero-emission by 2028. Pinnacle\'s largest competitor, GreenHaul Logistics, announced a partnership with a major EV truck manufacturer and plans to deploy 300 electric trucks by 2027, generating significant positive press coverage.',
        highlight: '$62M revenue tied to client emissions mandates',
      },
      {
        heading: 'The EV Landscape',
        content:
          'Current Class 6 electric trucks cost approximately $285,000 per unit compared to $145,000 for diesel equivalents. However, total cost of ownership over 8 years is estimated to be 15-22% lower for EVs due to reduced fuel and maintenance costs. The effective range of available EV trucks is 180-250 miles per charge, which covers approximately 70% of Pinnacle\'s current daily routes. Charging infrastructure for a 50-truck depot costs approximately $2.8M to install, with 18-month lead times for utility grid upgrades. Federal tax credits currently offset up to $40,000 per qualifying commercial EV purchase.',
        highlight: 'EV TCO 15-22% lower over 8 years | 70% route coverage',
      },
      {
        heading: 'Financial Position',
        content:
          'Pinnacle has $35M in available credit and $18M in cash reserves. The company\'s current capital expenditure budget is $45M annually, primarily allocated to fleet replacement cycles and depot maintenance. Converting 30% of the fleet (360 trucks) to electric would require approximately $103M in vehicle costs alone (after tax credits), plus $16.8M for charging infrastructure across six depots. The CFO has modeled a scenario where full electrification by 2032 would require either $80M in additional debt financing or a strategic equity partner.',
        highlight: '$103M for 30% fleet conversion | $80M financing gap for full transition',
      },
      {
        heading: 'Workforce Considerations',
        content:
          'Pinnacle employs 340 diesel mechanics across its network. EV trucks require different maintenance expertise, and the company estimates it would need to retrain 60% of its maintenance staff and hire 45 new EV-specialized technicians over the next three years. The Teamsters local representing Pinnacle\'s drivers has expressed concerns about potential job displacement from autonomous EV technology, though Pinnacle has no autonomous vehicle plans.',
      },
    ],
    decisions: [
      {
        id: 1,
        question: 'What electrification strategy should Pinnacle pursue?',
        context:
          'The board has requested a 5-year fleet transition plan. Three strategic options have been developed by the operations team. The decision must balance client retention, financial feasibility, and competitive positioning.',
        options: [
          {
            text: 'Phased rollout: Convert 15% of the fleet (180 trucks) to EV over 3 years, prioritizing the six depots closest to clients with emissions mandates. Use savings from reduced fuel costs to fund subsequent phases. Target 45% EV by 2031.',
            satisfaction: 25,
            impact: 30,
            dimensions: { analytical: 15, vision: 10, decisiveness: -10 },
          },
          {
            text: 'Aggressive conversion: Secure $80M in debt financing and convert 40% of the fleet within 2 years to leapfrog GreenHaul\'s competitive position. Market Pinnacle as the industry leader in sustainable logistics.',
            satisfaction: 10,
            impact: 5,
            dimensions: { decisiveness: 15, vision: 10, analytical: -15 },
          },
          {
            text: 'Wait and watch: Defer EV investment for 2 years until truck prices decrease and charging infrastructure matures. Instead, invest $12M in route optimization software to reduce current diesel consumption by 10-15%.',
            satisfaction: -10,
            impact: -5,
            dimensions: { analytical: 10, empathy: -10, decisiveness: -10, vision: 5 },
          },
        ],
      },
      {
        id: 2,
        question: 'How should Pinnacle manage the workforce transition?',
        context:
          'The VP of Human Resources has flagged that the transition plan requires significant workforce changes. Union leadership has requested a meeting to discuss the impact on members.',
        options: [
          {
            text: 'Launch a "Pinnacle EV Academy": a paid 12-week retraining program for existing diesel mechanics, with a guaranteed role upon completion. Partner with a community college for EV certification. Offer early retirement packages to mechanics within 5 years of retirement age.',
            satisfaction: 30,
            impact: 25,
            dimensions: { empathy: 15, vision: 10, decisiveness: -10, analytical: 5 },
          },
          {
            text: 'Outsource all EV maintenance to the truck manufacturer\'s service network for the first 3 years. Gradually reduce the diesel mechanic workforce through attrition as the fleet transitions, backfilling with EV-trained hires.',
            satisfaction: -15,
            impact: 10,
            dimensions: { analytical: 10, decisiveness: 10, empathy: -15 },
          },
          {
            text: 'Hire 45 new EV technicians immediately from the automotive industry and run a parallel maintenance operation. Offer diesel mechanics the option to apply for retraining slots on a first-come-first-served basis.',
            satisfaction: 5,
            impact: 0,
            dimensions: { decisiveness: 15, empathy: -5, analytical: -5, vision: -5 },
          },
        ],
      },
      {
        id: 3,
        question: 'How should Pinnacle communicate its EV strategy to clients and the market?',
        context:
          'The marketing team has prepared three communication strategies. The top three clients with emissions mandates have upcoming contract renewals within 8 months.',
        options: [
          {
            text: 'Publish a detailed "Pinnacle Green Roadmap" with specific milestones, CO2 reduction targets, and client-facing dashboards showing per-shipment emissions data. Offer clients with sustainability mandates priority access to EV-serviced routes at a 5% premium.',
            satisfaction: 25,
            impact: 30,
            dimensions: { analytical: 10, vision: 10, empathy: 5, decisiveness: -5 },
          },
          {
            text: 'Issue a press release announcing the EV transition with aggressive headline targets (e.g., "100% green fleet by 2030") to generate media coverage and match GreenHaul\'s positioning, even though the internal plan targets 45% by 2031.',
            satisfaction: -5,
            impact: -15,
            dimensions: { decisiveness: 15, vision: 5, empathy: -10, analytical: -15 },
          },
          {
            text: 'Keep the transition strategy internal and only disclose EV capabilities when directly asked by clients during contract negotiations. Focus marketing spend on current service reliability and pricing advantages.',
            satisfaction: -10,
            impact: -5,
            dimensions: { analytical: 5, empathy: -10, vision: -10, decisiveness: 10 },
          },
        ],
      },
    ],
  },
  {
    id: 3,
    clientName: 'Harvest & Hearth',
    industry: 'Food & Beverage / DTC',
    briefTitle: 'Unit Economics Overhaul: Path to Sustainable Growth',
    briefSections: [
      {
        heading: 'Background',
        content:
          'Harvest & Hearth is a direct-to-consumer meal kit company specializing in locally sourced, seasonal ingredients delivered to homes within a 200-mile radius of its three regional fulfillment centers in Portland (OR), Austin (TX), and Raleigh (NC). Founded in 2021 by two former chefs, the company has grown to 28,000 active subscribers and generates $3.2M in monthly recurring revenue. Harvest & Hearth raised a $12M Series A in 2024 and has approximately 9 months of runway remaining at current burn rate.',
        highlight: '$3.2M MRR | 28,000 subscribers | 9 months runway',
      },
      {
        heading: 'The Unit Economics Problem',
        content:
          'The average customer pays $68 per week for a 4-meal kit. Cost of goods sold (ingredients, sourcing, and packaging) is $34.50 per kit, yielding a gross margin of 49.3%. However, the fully loaded cost per delivered kit -- including fulfillment labor ($8.20), cold-chain shipping ($11.40), last-mile delivery ($6.80), and packaging waste disposal ($1.60) -- brings the effective margin to just 7.9% ($5.50 per kit). Customer acquisition cost is $142, and average customer lifetime is 4.8 months, producing an LTV of $105.60 in gross profit but only $26.40 in contribution margin after delivery costs. The company is losing $36.40 per acquired customer.',
        highlight: 'Effective margin: 7.9% | LTV:CAC ratio: 0.19 | Losing $36.40/customer',
      },
      {
        heading: 'Operational Challenges',
        content:
          'The "locally sourced" promise requires partnerships with 140 small farms, creating supply chain complexity that large competitors avoid. Ingredient spoilage rate is 14% (industry average: 8%) because seasonal menus require frequent recipe changes and volatile ingredient volumes. The cold-chain shipping requirement limits delivery to a 3-day window, resulting in 6.2% of shipments arriving with quality issues. Customer service costs have risen 40% year-over-year due to replacement shipments and refund requests.',
        highlight: '14% spoilage rate | 6.2% delivery quality issues',
      },
      {
        heading: 'Market Context',
        content:
          'The meal kit market is projected to reach $27B by 2028, growing at 12% CAGR. However, the top three players (HelloFresh, Blue Apron, Marley Spoon) control 68% of the market and operate at scale with 3-5x lower per-unit shipping costs. Consumer surveys show that Harvest & Hearth customers rank "local sourcing" and "seasonal menus" as their top reasons for subscribing, but 42% cite "price" as their primary reason for canceling. The average churn rate is 18% monthly, meaning the company must acquire approximately 5,000 new subscribers each month just to maintain its current base.',
        highlight: '18% monthly churn | 5,000 new subscribers needed monthly to maintain base',
      },
      {
        heading: 'The Board\'s Directive',
        content:
          'With 9 months of runway, the board has mandated that Harvest & Hearth must reach contribution-margin breakeven within 6 months or begin exploring acquisition offers. Two potential acquirers have expressed preliminary interest: a national grocery chain and a larger meal kit competitor. The founders are resistant to an acquisition, believing the brand\'s local-sourcing mission would be compromised. The VP of Operations has proposed three cost-reduction pathways, and the VP of Growth has identified potential revenue optimization strategies.',
      },
    ],
    decisions: [
      {
        id: 1,
        question: 'How should Harvest & Hearth restructure its delivery model to improve unit economics?',
        context:
          'Shipping and fulfillment costs ($28 per kit) represent the largest drag on unit economics. The operations team has modeled three scenarios. Any change affects the customer experience and the brand\'s "fresh and local" promise.',
        options: [
          {
            text: 'Shift to a hub-and-spoke pickup model: partner with 120 local businesses (cafes, gyms, co-working spaces) as pickup points within each metro area. Offer a $8/week discount for pickup orders. Maintain home delivery as a premium option at +$6/week. Target: reduce average delivery cost from $18.20 to $7.50 per kit.',
            satisfaction: 25,
            impact: 30,
            dimensions: { vision: 15, analytical: 10, empathy: -5, decisiveness: -5 },
          },
          {
            text: 'Consolidate from 3 fulfillment centers to 1 centralized facility in Dallas to reduce overhead. Switch from cold-chain individual shipping to weekly batch deliveries using a third-party refrigerated logistics network. Accept that delivery windows will expand from 3 days to 5 days.',
            satisfaction: -15,
            impact: 10,
            dimensions: { analytical: 15, decisiveness: 10, empathy: -15 },
          },
          {
            text: 'Maintain the current delivery model but raise prices by $12/week across all plans. Invest $500K in marketing to reposition the brand as ultra-premium. Accept that subscriber count may drop 30% but aim for higher per-unit margins on the remaining base.',
            satisfaction: -5,
            impact: 5,
            dimensions: { decisiveness: 15, vision: 10, empathy: -10, analytical: -10 },
          },
        ],
      },
      {
        id: 2,
        question: 'How should the company address the 14% ingredient spoilage rate?',
        context:
          'Spoilage is nearly double the industry average, driven by the complexity of sourcing from 140 small farms with variable supply. The culinary team resists reducing the number of weekly recipes, arguing it is core to the brand.',
        options: [
          {
            text: 'Implement a demand-forecasting system that uses subscriber preference data and historical order patterns to predict ingredient volumes 2 weeks ahead. Reduce weekly menu options from 12 to 8, and allow farms to propose "surplus specials" that use whatever they have excess of at a discounted rate. Target: reduce spoilage to 8% within 4 months.',
            satisfaction: 20,
            impact: 30,
            dimensions: { analytical: 15, empathy: 5, vision: -5, decisiveness: -5 },
          },
          {
            text: 'Replace 60% of the small-farm partnerships with three regional wholesale distributors who can guarantee consistent supply and pricing. Maintain the "locally sourced" branding by defining "local" as within 500 miles rather than the current 200-mile radius.',
            satisfaction: -10,
            impact: 15,
            dimensions: { decisiveness: 15, analytical: 5, empathy: -15, vision: -5 },
          },
          {
            text: 'Accept the current spoilage rate as the cost of the brand\'s authenticity. Instead, launch a "zero waste" initiative that donates spoiled-but-safe ingredients to food banks, and use the charitable angle in marketing to justify premium pricing and improve retention.',
            satisfaction: 10,
            impact: -10,
            dimensions: { empathy: 15, vision: 10, analytical: -15 },
          },
        ],
      },
      {
        id: 3,
        question: 'What revenue strategy should Harvest & Hearth pursue to reach contribution-margin breakeven?',
        context:
          'The company needs to close the $36.40 per-customer contribution gap. The growth team has modeled options that combine pricing changes with new revenue streams. The board\'s 6-month deadline means the strategy must show results quickly.',
        options: [
          {
            text: 'Launch a tiered subscription: "Essentials" (4 meals, $62/week, simplified recipes with fewer premium ingredients), "Classic" (current offering at $72/week, a $4 increase), and "Chef\'s Table" (4 meals + 2 premium add-ons, $95/week). Simultaneously introduce a weekend "Brunch Box" add-on at $28 with 70% gross margins. Target: increase average revenue per user by 18% while giving price-sensitive customers a downgrade path instead of canceling.',
            satisfaction: 25,
            impact: 30,
            dimensions: { vision: 10, analytical: 10, empathy: 5, decisiveness: -10 },
          },
          {
            text: 'Freeze all customer acquisition spending immediately and focus exclusively on retaining the existing 28,000 subscribers. Redirect the $710K monthly marketing budget toward product improvements and a loyalty rewards program. Accept that the subscriber base will shrink to ~18,000 over 6 months but aim for contribution-positive on the remaining customers.',
            satisfaction: 5,
            impact: 0,
            dimensions: { analytical: 10, empathy: 10, decisiveness: -15, vision: -10 },
          },
          {
            text: 'Pivot to a B2B model: sell pre-portioned, locally sourced ingredient kits to restaurants and corporate cafeterias. Leverage existing farm relationships and fulfillment infrastructure. Wind down the DTC subscription over 12 months while building the B2B channel.',
            satisfaction: -10,
            impact: 5,
            dimensions: { vision: 15, decisiveness: 10, empathy: -10, analytical: -5 },
          },
        ],
      },
    ],
  },
];
