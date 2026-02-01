import * as XLSX from 'xlsx';
import { AssuranceReport, GapAnalysisItem } from '../types';

interface RiskMatrixRow {
  riskId: string;
  riskCategory: string;
  riskDescription: string;
  observation: string;
  likelihood: string;
  impact: string;
  riskRating: string;
  existingControls: string;
  controlEffectiveness: string;
  residualRisk: string;
  recommendedActions: string;
  owner: string;
  targetDate: string;
  status: string;
}

interface ControlMatrixRow {
  controlId: string;
  riskId: string;
  controlDescription: string;
  controlType: string;
  controlOwner: string;
  frequency: string;
  effectiveness: string;
  evidence: string;
  gaps: string;
  recommendations: string;
  status: string;
}

export const generateRiskControlMatrix = (
  report: AssuranceReport,
  projectName: string,
  projectNumber: string
): void => {
  // Prepare Risk Register data
  const riskData: RiskMatrixRow[] = report.gapAnalysis.map((gap, index) => {
    const riskLevel = mapSeverityToRisk(gap.severity);
    const likelihood = deriveLikelihood(gap.severity);
    const impact = deriveImpact(gap.severity);
    
    return {
      riskId: `R${String(index + 1).padStart(3, '0')}`,
      riskCategory: gap.area,
      riskDescription: gap.finding,
      observation: gap.observation,
      likelihood: likelihood,
      impact: impact,
      riskRating: riskLevel,
      existingControls: extractExistingControls(gap),
      controlEffectiveness: assessControlEffectiveness(gap.severity),
      residualRisk: riskLevel,
      recommendedActions: gap.recommendation,
      owner: 'To Be Assigned',
      targetDate: getDefaultTargetDate(gap.severity),
      status: 'Open'
    };
  });

  // Prepare Control Matrix data
  const controlData: ControlMatrixRow[] = [];
  report.gapAnalysis.forEach((gap, riskIndex) => {
    const riskId = `R${String(riskIndex + 1).padStart(3, '0')}`;
    const controls = extractControls(gap);
    
    controls.forEach((control, controlIndex) => {
      controlData.push({
        controlId: `${riskId}-C${controlIndex + 1}`,
        riskId: riskId,
        controlDescription: control.description,
        controlType: control.type,
        controlOwner: control.owner || 'To Be Assigned',
        frequency: control.frequency,
        effectiveness: assessControlEffectiveness(gap.severity),
        evidence: control.evidence || 'To Be Documented',
        gaps: control.gaps || '',
        recommendations: gap.recommendation,
        status: control.status || 'To Be Implemented'
      });
    });
  });

  // Create workbook
  const wb = XLSX.utils.book_new();

  // Cover Sheet
  const coverData = [
    ['RISK AND CONTROL MATRIX'],
    [],
    ['Project Name:', projectName],
    ['Project Number:', projectNumber],
    ['Report Date:', new Date().toLocaleDateString('en-AU')],
    ['Overall Risk Score:', report.overallScore + '%'],
    [],
    ['Document Purpose:'],
    ['This Risk and Control Matrix provides a comprehensive view of identified risks,'],
    ['existing controls, control effectiveness, and recommended actions for the project.'],
    [],
    ['Contents:'],
    ['1. Risk Register - Comprehensive list of identified risks'],
    ['2. Control Matrix - Detailed control framework and effectiveness assessment'],
    ['3. Summary Dashboard - Key metrics and risk distribution']
  ];
  const coverSheet = XLSX.utils.aoa_to_sheet(coverData);
  XLSX.utils.book_append_sheet(wb, coverSheet, 'Cover');

  // Risk Register Sheet
  const riskSheet = XLSX.utils.json_to_sheet(riskData);
  
  // Set column widths
  riskSheet['!cols'] = [
    { wch: 10 },  // Risk ID
    { wch: 20 },  // Category
    { wch: 35 },  // Description
    { wch: 35 },  // Observation
    { wch: 12 },  // Likelihood
    { wch: 12 },  // Impact
    { wch: 15 },  // Risk Rating
    { wch: 30 },  // Existing Controls
    { wch: 18 },  // Effectiveness
    { wch: 15 },  // Residual Risk
    { wch: 40 },  // Recommended Actions
    { wch: 20 },  // Owner
    { wch: 15 },  // Target Date
    { wch: 12 }   // Status
  ];
  
  XLSX.utils.book_append_sheet(wb, riskSheet, 'Risk Register');

  // Control Matrix Sheet
  const controlSheet = XLSX.utils.json_to_sheet(controlData);
  
  controlSheet['!cols'] = [
    { wch: 12 },  // Control ID
    { wch: 10 },  // Risk ID
    { wch: 40 },  // Description
    { wch: 15 },  // Type
    { wch: 20 },  // Owner
    { wch: 15 },  // Frequency
    { wch: 15 },  // Effectiveness
    { wch: 30 },  // Evidence
    { wch: 30 },  // Gaps
    { wch: 40 },  // Recommendations
    { wch: 15 }   // Status
  ];
  
  XLSX.utils.book_append_sheet(wb, controlSheet, 'Control Matrix');

  // Summary Dashboard Sheet
  const summaryData = createSummaryDashboard(riskData, controlData, report);
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

  // Generate filename
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `Risk_Control_Matrix_${projectNumber}_${timestamp}.xlsx`;

  // Write file
  XLSX.writeFile(wb, filename);
};

// Helper functions
const mapSeverityToRisk = (severity: string): string => {
  const severityMap: { [key: string]: string } = {
    'critical': 'Critical',
    'high': 'High',
    'medium': 'Medium',
    'low': 'Low'
  };
  return severityMap[severity.toLowerCase()] || 'Medium';
};

const deriveLikelihood = (severity: string): string => {
  const likelihoodMap: { [key: string]: string } = {
    'critical': 'Almost Certain',
    'high': 'Likely',
    'medium': 'Possible',
    'low': 'Unlikely'
  };
  return likelihoodMap[severity.toLowerCase()] || 'Possible';
};

const deriveImpact = (severity: string): string => {
  const impactMap: { [key: string]: string } = {
    'critical': 'Severe',
    'high': 'Major',
    'medium': 'Moderate',
    'low': 'Minor'
  };
  return impactMap[severity.toLowerCase()] || 'Moderate';
};

const extractExistingControls = (gap: GapAnalysisItem): string => {
  // Extract existing controls from observation or create default
  const observation = gap.observation.toLowerCase();
  if (observation.includes('control') || observation.includes('process') || observation.includes('procedure')) {
    return 'Existing controls identified in documentation';
  }
  return 'Limited or no formal controls documented';
};

const assessControlEffectiveness = (severity: string): string => {
  const effectivenessMap: { [key: string]: string } = {
    'critical': 'Ineffective',
    'high': 'Partially Effective',
    'medium': 'Generally Effective',
    'low': 'Effective'
  };
  return effectivenessMap[severity.toLowerCase()] || 'Generally Effective';
};

const getDefaultTargetDate = (severity: string): string => {
  const today = new Date();
  const daysMap: { [key: string]: number } = {
    'critical': 30,
    'high': 60,
    'medium': 90,
    'low': 120
  };
  const days = daysMap[severity.toLowerCase()] || 90;
  const targetDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);
  return targetDate.toLocaleDateString('en-AU');
};

const extractControls = (gap: GapAnalysisItem) => {
  // Extract control recommendations from the gap analysis
  const recommendations = gap.recommendation.split(/[.;]\s+/).filter(r => r.length > 10);
  
  return recommendations.map((rec, index) => ({
    description: rec.trim(),
    type: determineControlType(rec),
    owner: 'To Be Assigned',
    frequency: determineFrequency(rec),
    evidence: 'To Be Documented',
    gaps: gap.finding,
    status: 'To Be Implemented'
  }));
};

const determineControlType = (recommendation: string): string => {
  const rec = recommendation.toLowerCase();
  if (rec.includes('prevent') || rec.includes('block') || rec.includes('restrict')) {
    return 'Preventive';
  } else if (rec.includes('detect') || rec.includes('monitor') || rec.includes('review')) {
    return 'Detective';
  } else if (rec.includes('correct') || rec.includes('fix') || rec.includes('remediate')) {
    return 'Corrective';
  }
  return 'Preventive';
};

const determineFrequency = (recommendation: string): string => {
  const rec = recommendation.toLowerCase();
  if (rec.includes('continuous') || rec.includes('real-time') || rec.includes('ongoing')) {
    return 'Continuous';
  } else if (rec.includes('daily')) {
    return 'Daily';
  } else if (rec.includes('weekly')) {
    return 'Weekly';
  } else if (rec.includes('monthly') || rec.includes('regular')) {
    return 'Monthly';
  } else if (rec.includes('quarterly')) {
    return 'Quarterly';
  }
  return 'As Required';
};

const createSummaryDashboard = (
  risks: RiskMatrixRow[],
  controls: ControlMatrixRow[],
  report: AssuranceReport
): any[][] => {
  // Count risks by rating
  const critical = risks.filter(r => r.riskRating === 'Critical').length;
  const high = risks.filter(r => r.riskRating === 'High').length;
  const medium = risks.filter(r => r.riskRating === 'Medium').length;
  const low = risks.filter(r => r.riskRating === 'Low').length;

  // Count risks by category
  const categoryCount: { [key: string]: number } = {};
  risks.forEach(r => {
    categoryCount[r.riskCategory] = (categoryCount[r.riskCategory] || 0) + 1;
  });

  // Control effectiveness
  const effective = controls.filter(c => c.effectiveness === 'Effective').length;
  const partiallyEffective = controls.filter(c => c.effectiveness === 'Partially Effective').length;
  const ineffective = controls.filter(c => c.effectiveness === 'Ineffective').length;

  return [
    ['RISK AND CONTROL SUMMARY DASHBOARD'],
    [],
    ['Overall Assessment Score:', report.overallScore + '%'],
    [],
    ['RISK DISTRIBUTION'],
    ['Risk Level', 'Count', 'Percentage'],
    ['Critical', critical, `${((critical / risks.length) * 100).toFixed(1)}%`],
    ['High', high, `${((high / risks.length) * 100).toFixed(1)}%`],
    ['Medium', medium, `${((medium / risks.length) * 100).toFixed(1)}%`],
    ['Low', low, `${((low / risks.length) * 100).toFixed(1)}%`],
    [],
    ['RISKS BY CATEGORY'],
    ['Category', 'Count'],
    ...Object.entries(categoryCount).map(([cat, count]) => [cat, count]),
    [],
    ['CONTROL EFFECTIVENESS'],
    ['Effectiveness Level', 'Count', 'Percentage'],
    ['Effective', effective, `${((effective / controls.length) * 100).toFixed(1)}%`],
    ['Partially Effective', partiallyEffective, `${((partiallyEffective / controls.length) * 100).toFixed(1)}%`],
    ['Ineffective', ineffective, `${((ineffective / controls.length) * 100).toFixed(1)}%`],
    [],
    ['KEY METRICS'],
    ['Total Risks Identified:', risks.length],
    ['Total Controls Mapped:', controls.length],
    ['Open Actions:', risks.filter(r => r.status === 'Open').length],
    ['Controls Requiring Implementation:', controls.filter(c => c.status === 'To Be Implemented').length]
  ];
};
