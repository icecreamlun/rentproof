import {
  ComparisonResult,
  ContractAnalysis,
  DemandLetter,
  LandlordIntel,
  LawCitation,
  PhotoInventory,
} from './types';

/**
 * Every route falls back to these when the matching API key is absent, so the
 * full flow is clickable before a single credential is pasted in. Anything
 * served from here is tagged `mock: true` in the response and the UI says so.
 */

export const mockContract: ContractAnalysis = {
  assetType: 'apartment',
  jurisdiction: 'California, USA',
  jurisdictionCode: 'US-CA',
  depositAmount: 3150,
  monthlyRent: 3150,
  currency: 'USD',
  returnWindowDays: 21,
  parties: {
    tenant: 'Franklin Li',
    landlord: 'Bayview Property Group',
    landlordEmail: 'billing@bayviewpg.example',
    landlordPhone: '+14158023379',
  },
  overallRiskScore: 74,
  summary:
    'A fairly standard California residential lease with three clauses that push costs onto you beyond what state law allows. The deposit is at the statutory maximum and the cleaning clause is not enforceable as written.',
  redFlags: [
    {
      clause: 'Tenant shall pay a not refundable cleaning fee of $435 upon vacating.',
      issue:
        'California does not recognize not refundable deposits or fees on residential leases. Cleaning can only be deducted for the cost of returning the unit to its move in cleanliness.',
      risk: 'high',
      lawNote: 'Cal. Civ. Code § 1950.5(m)',
      suggestedPushback:
        'Ask for this clause to be struck, or documented as a refundable deposit line item with receipts.',
    },
    {
      clause: 'Tenant is responsible for all carpet replacement at end of tenancy.',
      issue:
        'Blanket carpet replacement shifts normal wear and tear onto the tenant. Carpet has an expected useful life and only the unamortized portion of actual damage is chargeable.',
      risk: 'high',
      lawNote: 'Cal. Civ. Code § 1950.5(b)(2); CA DCA useful life guidance',
      suggestedPushback:
        'Request the clause be limited to damage beyond normal wear and tear, prorated over the carpet’s useful life.',
    },
    {
      clause: 'Landlord may retain the deposit for 45 days after move out.',
      issue: 'State law requires an itemized statement and refund within 21 days.',
      risk: 'medium',
      lawNote: 'Cal. Civ. Code § 1950.5(g)',
      suggestedPushback: 'Note in writing that the statutory deadline is 21 days regardless of the lease term.',
    },
  ],
  photoChecklist: [
    'All carpeted floors, wide shot plus a closeup of any existing stains',
    'Every wall at eye level — nail holes, scuffs, paint condition',
    'Kitchen appliances inside and out, including oven interior and fridge seals',
    'Bathroom grout, caulking, and under sink cabinet',
    'Window blinds, screens, and sills',
    'Front door, closet doors, and all door hardware',
  ],
};

export const mockInventory: PhotoInventory = {
  summary:
    'Six areas documented. Two existing defects found that you should get on record now — they are the most common things landlords try to charge for later.',
  findings: [
    {
      area: 'Living room carpet — north wall',
      condition: 'Two faint traffic path discolorations, no fibers missing',
      severity: 'minor',
      preexisting: true,
      note: 'Consistent with normal aging. Photograph again at move out from the same angle.',
    },
    {
      area: 'Kitchen counter near sink',
      condition: 'Small chip in laminate edge, roughly 1cm',
      severity: 'minor',
      preexisting: true,
      note: 'Existing. This is exactly the kind of item that reappears on a deduction list.',
    },
    {
      area: 'Bedroom wall',
      condition: 'Four nail holes, previously filled and painted over unevenly',
      severity: 'minor',
      preexisting: true,
      note: 'Nail holes are normal wear and tear in California.',
    },
    {
      area: 'Bathroom grout',
      condition: 'Light discoloration between floor tiles',
      severity: 'minor',
      preexisting: true,
      note: 'Document now; grout staining is frequently billed as "damage".',
    },
  ],
  questions: [
    'Was the unit professionally cleaned before you moved in, or did you clean it yourself?',
    'Did the landlord give you a written move in inspection checklist to sign?',
    'Is the carpet original to the unit, or was it replaced recently? (Age changes how much can be charged.)',
  ],
  coverageGaps: [
    'No photo of the oven interior — a very common deduction line',
    'No wide shot of the balcony or patio',
    'Consider a short video walkthrough with the date visible',
  ],
};

export const mockComparison: ComparisonResult = {
  headline: '$1,831 of your deposit is being withheld unlawfully',
  verdict: 'partial_deduction_justified',
  claimedDeduction: 2284,
  totalFairCharge: 453,
  unlawfullyWithheld: 1831,
  summary:
    'Of the $2,284 withheld, only $453 stands up. Carpet traffic paths, nail holes and grout staining were present at move in or are normal wear and tear under California law. The one legitimate item is the cabinet door, which shows impact damage not visible in your move in photos.',
  deltas: [
    {
      area: 'Living room carpet',
      before: 'Two faint traffic path discolorations along the north wall',
      after: 'Same two discolorations, slightly more visible',
      changed: false,
      classification: 'normal_wear_and_tear',
      severity: 'minor',
      fairChargeUsd: 0,
      reasoning:
        'The discoloration appears in the move in photo at the same location. Gradual darkening of traffic paths over a tenancy is the textbook definition of normal wear and tear and is not chargeable.',
      confidence: 0.91,
    },
    {
      area: 'Bedroom wall — nail holes',
      before: 'Four filled nail holes',
      after: 'Six nail holes, two unfilled',
      changed: true,
      classification: 'normal_wear_and_tear',
      severity: 'minor',
      fairChargeUsd: 0,
      reasoning:
        'Small nail holes from hanging pictures are ordinary use of a residential unit. California guidance treats spackling and touch up as a landlord maintenance cost.',
      confidence: 0.84,
    },
    {
      area: 'Kitchen cabinet door, lower left',
      before: 'Intact, uniform finish',
      after: 'Cracked panel with a chipped corner and separated veneer',
      changed: true,
      classification: 'tenant_damage',
      severity: 'moderate',
      fairChargeUsd: 385,
      reasoning:
        'This is impact damage with no counterpart in the move in photo. It exceeds normal wear and tear and a repair charge is defensible.',
      confidence: 0.88,
    },
    {
      area: 'Bathroom grout',
      before: 'Light discoloration between floor tiles',
      after: 'Similar discoloration, marginally darker',
      changed: false,
      classification: 'pre_existing',
      severity: 'minor',
      fairChargeUsd: 0,
      reasoning: 'Documented in the move in set. A existing condition cannot be deducted.',
      confidence: 0.93,
    },
    {
      area: 'Unit cleanliness',
      before: 'Broom clean, light dust on sills',
      after: 'Broom clean, comparable condition',
      changed: false,
      classification: 'normal_wear_and_tear',
      severity: 'none',
      fairChargeUsd: 68,
      reasoning:
        'The unit was returned in roughly its move in condition. A limited cleaning charge is arguable but the $435 flat fee in the lease is not enforceable.',
      confidence: 0.79,
    },
  ],
};

export const mockCitations: LawCitation[] = [
  {
    title: 'California Civil Code § 1950.5 — Security Deposits',
    citation: 'Cal. Civ. Code § 1950.5(b)',
    url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1950.5',
    snippet:
      'A landlord may claim of the security only those amounts as are reasonably necessary … to repair damages to the premises, exclusive of ordinary wear and tear, caused by the tenant.',
    source: 'builtin',
  },
  {
    title: 'California Civil Code § 1950.5(g) — 21-day deadline',
    citation: 'Cal. Civ. Code § 1950.5(g)(1)',
    url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1950.5',
    snippet:
      'No later than 21 calendar days after the tenant has vacated, the landlord shall furnish the tenant a copy of an itemized statement indicating the basis for, and the amount of, any security received and the disposition of the security.',
    source: 'builtin',
  },
  {
    title: 'California Civil Code § 1950.5(l) — Bad faith penalty',
    citation: 'Cal. Civ. Code § 1950.5(l)',
    url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1950.5',
    snippet:
      'The bad faith claim or retention by a landlord … may subject the landlord to statutory damages of up to twice the amount of the security, in addition to actual damages.',
    source: 'builtin',
  },
  {
    title: 'California DCA — California Tenants Guide, deposit deductions',
    citation: 'CA Dept. of Consumer Affairs, California Tenants',
    url: 'https://www.courts.ca.gov/selfhelp-eviction.htm',
    snippet:
      'Ordinary wear and tear — for example, faded paint, minor carpet wear in traffic areas, or small nail holes — cannot be deducted from a security deposit.',
    source: 'builtin',
  },
];

export const mockLandlord: LandlordIntel = {
  name: 'Bayview Property Group',
  complaintCount: 9,
  summary: '9 public records mention deposit disputes involving Bayview Property Group.',
  signals: [
    {
      source: 'yelp.com',
      text: 'Kept my entire $2,740 deposit for "carpet cleaning" — took them to small claims and won.',
      url: 'https://www.yelp.com',
    },
    {
      source: 'reddit.com',
      text: 'r/SanFrancisco — Anyone else had Bayview withhold the deposit past 21 days?',
      url: 'https://www.reddit.com',
    },
    {
      source: 'bbb.org',
      text: 'Complaint: failure to provide itemized statement of deductions within statutory window.',
      url: 'https://www.bbb.org',
    },
  ],
};

export const mockLetter: DemandLetter = {
  subject: 'Demand for Return of Security Deposit — Cal. Civ. Code § 1950.5',
  demandAmount: 1831,
  deadlineDays: 14,
  citations: ['Cal. Civ. Code § 1950.5(b)', 'Cal. Civ. Code § 1950.5(g)(1)', 'Cal. Civ. Code § 1950.5(l)'],
  body: `Dear Bayview Property Group,

I am writing regarding the security deposit for the tenancy that ended on the date of my move out. Of the $3,150 deposit, $2,284 was withheld. I am requesting the return of $1,831 of that amount.

I documented the unit with timestamped photographs at move in and again at move out. Comparing the two sets item by item:

1. Living room carpet — the traffic path discoloration cited in your statement appears in my move in photographs at the same location. Under Cal. Civ. Code § 1950.5(b), a landlord may claim only amounts reasonably necessary to repair damage "exclusive of ordinary wear and tear." Gradual darkening of carpet traffic paths is ordinary wear and tear.

2. Nail holes — small holes from hanging pictures are ordinary use of a residential unit and are not a chargeable repair.

3. Bathroom grout — the discoloration is visible in my move in photographs and is therefore a existing condition.

4. Kitchen cabinet door — I accept responsibility for this item and agree that $385 is a reasonable repair charge.

5. Cleaning — the unit was returned in substantially its move in condition. The $435 flat cleaning fee in the lease is not enforceable; § 1950.5(m) does not permit not refundable fees. I accept $68 as a reasonable cleaning charge.

Accepting the two items above, the defensible total is $453, leaving $1,831 that must be returned.

Please remit $1,831 within 14 days of the date of this letter. Cal. Civ. Code § 1950.5(l) provides that retention in bad faith of a deposit may expose a landlord to statutory damages of up to twice the deposit amount in addition to actual damages. I would prefer to resolve this directly and without a small claims filing.

My photographic evidence and this itemization are available on request.

Sincerely,
Franklin Li`,
};
