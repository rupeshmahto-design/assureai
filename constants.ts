
import { FocusArea, ProjectStage } from './types';

export const FOCUS_AREAS: FocusArea[] = [
  'Budget & Cost Management',
  'Schedule & Milestones',
  'Requirements & Scope',
  'Governance & Reporting',
  'Risk & Issue Management',
  'Resource Allocation',
  'Solution Architecture Alignment',
  'Benefits Realisation'
];

export const PROJECT_STAGES: ProjectStage[] = [
  'Initiation',
  'Planning',
  'Execution',
  'Monitoring & Control',
  'Closing'
];

export const DOC_CATEGORIES = [
  'Requirement',
  'Design',
  'Business Case',
  'Architecture',
  'Budget',
  'Plan',
  'Risk Register',
  'Status Report',
  'Other'
] as const;
