export type Severity = 'none' | 'minor' | 'moderate' | 'severe';

export type ClauseRisk = {
  clause: string;              // 合同原文片段
  issue: string;               // 为什么有问题
  risk: 'low' | 'medium' | 'high';
  lawNote?: string;            // 可能违反的法律
  suggestedPushback?: string;  // 建议怎么谈
};

export type ContractAnalysis = {
  assetType: string;           // apartment / car / equipment ...
  jurisdiction: string;        // "California, USA"
  jurisdictionCode: string;    // "US-CA"
  depositAmount: number | null;
  monthlyRent: number | null;
  currency: string;
  returnWindowDays: number | null;
  parties: { tenant?: string; landlord?: string; landlordEmail?: string; landlordPhone?: string };
  redFlags: ClauseRisk[];
  overallRiskScore: number;    // 0-100
  summary: string;
  photoChecklist: string[];    // 根据合同该拍哪些地方
};

export type PhotoFinding = {
  area: string;                // "Living room carpet"
  condition: string;
  severity: Severity;
  preexisting: boolean;
  note: string;
};

export type PhotoInventory = {
  findings: PhotoFinding[];
  questions: string[];         // AI 想问用户的澄清问题(可 skip)
  coverageGaps: string[];      // 还缺哪些角度的照片
  summary: string;
};

export type DamageDelta = {
  area: string;
  before: string;
  after: string;
  changed: boolean;
  classification: 'normal_wear_and_tear' | 'tenant_damage' | 'pre_existing' | 'unclear';
  severity: Severity;
  fairChargeUsd: number;       // AI 认为合理的扣款
  reasoning: string;
  confidence: number;          // 0-1
};

export type ComparisonResult = {
  deltas: DamageDelta[];
  totalFairCharge: number;
  claimedDeduction: number | null;
  unlawfullyWithheld: number;
  verdict: 'deposit_should_be_returned' | 'partial_deduction_justified' | 'deduction_justified';
  headline: string;
  summary: string;
};

export type LawCitation = {
  title: string;
  citation: string;            // "Cal. Civ. Code § 1950.5(b)"
  url: string;
  snippet: string;
  source: 'exa' | 'apify' | 'builtin';
};

export type LandlordIntel = {
  name: string;
  complaintCount: number;
  signals: { source: string; text: string; url?: string }[];
  summary: string;
};

export type DemandLetter = {
  subject: string;
  body: string;
  citations: string[];
  demandAmount: number;
  deadlineDays: number;
};

export type CaseFile = {
  id: string;
  createdAt: string;
  updatedAt: string;
  stage: 'contract' | 'move_in' | 'occupancy' | 'move_out' | 'dispute';
  contractText?: string;
  contract?: ContractAnalysis;
  moveInPhotos: string[];      // data URLs
  moveOutPhotos: string[];
  moveIn?: PhotoInventory;
  answers?: Record<string, string>;
  claimedDeduction?: number | null;
  landlordStatement?: string;
  comparison?: ComparisonResult;
  citations?: LawCitation[];
  landlordIntel?: LandlordIntel;
  letter?: DemandLetter;
  callLog?: { id: string; status: string; to: string; startedAt: string; mock?: boolean }[];
};

export const emptyCase = (id: string): CaseFile => ({
  id,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  stage: 'contract',
  moveInPhotos: [],
  moveOutPhotos: [],
  callLog: [],
});
