
export enum ProjectFramework {
  PRINCE2 = 'PRINCE2',
  PMBOK = 'PMBOK',
  TOGAF = 'TOGAF',
  MSP = 'MSP',
  AGILE = 'Agile/SAFe',
  AUTO = 'AUTO_DETECT'
}

export type FocusArea = 
  | 'Budget & Cost Management'
  | 'Schedule & Milestones'
  | 'Requirements & Scope'
  | 'Governance & Reporting'
  | 'Risk & Issue Management'
  | 'Resource Allocation'
  | 'Solution Architecture Alignment'
  | 'Benefits Realisation';

export type ProjectStage = 
  | 'Initiation'
  | 'Planning'
  | 'Execution'
  | 'Monitoring & Control'
  | 'Closing';

export interface ProjectDocument {
  id: string;
  name: string;
  type: string;
  size: string;
  content: string;
  category: string;
}

export interface ProjectData {
  name: string;
  number: string;
  focusAreas: FocusArea[];
  stage: ProjectStage;
  documents: ProjectDocument[];
}

export interface GapAnalysisItem {
  area: string;
  observation: string;
  finding: string;
  severity: 'High' | 'Medium' | 'Low';
  recommendation: string;
  leadingQuestions: string[];
}

export interface BenefitItem {
  name: string;
  category: 'Financial' | 'Operational' | 'Strategic';
  description: string;
  observation: string;
  baseline: string;
  target: string;
  metric: string;
  targetDate: string;
  owner: string;
  financialValue: string;
  readinessScore: number;
  challengingQuestions: string[];
}

export interface CriticalQuestion {
  question: string;
  context: string;
  targetRole: string;
}

export interface AssuranceReport {
  overallScore: number;
  summary: string;
  benefitsSummary: {
    totalPlannedValue: string;
    projectedAnnualValue: string;
    benefitsCount: number;
    realizationOutlook: string;
  };
  gapAnalysis: GapAnalysisItem[];
  benefitsRealisation: BenefitItem[];
  criticalQuestions: CriticalQuestion[];
  frameworkAlignment: {
    framework: string;
    alignmentScore: number;
    notes: string;
  };
  financialAssurance: {
    budgetStatus: string;
    varianceAnalysis: string;
    riskScore: number;
  };
}
