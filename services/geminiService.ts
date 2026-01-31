
import Anthropic from "@anthropic-ai/sdk";
import { ProjectData, AssuranceReport } from "../types";

const anthropic = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true
});

export async function analyzeProjectAssurance(projectData: ProjectData): Promise<AssuranceReport> {
  
  // Aggregate all document content into a structured context for the auditor
  const docContext = projectData.documents.map(doc => 
    `--- [ARTIFACT START] ---
    FILENAME: ${doc.name}
    CATEGORY: ${doc.category}
    CONTENT:
    ${doc.content.substring(0, 18000)} // Deep context window per document
    --- [ARTIFACT END] ---`
  ).join('\n\n');

  const systemInstruction = `You are a World-Class Senior Project Assurance Auditor and Enterprise Architect with 20+ years experience.
  Your task is to perform a deterministic, rigorous evaluation of a project based on its artifacts.
  
  CORE AUDIT PRINCIPLES:
  1. EVIDENCE-BASED OBSERVATION: For every finding, provide a detailed observation of what you saw in the documents (cite specific sections, numbers, dates).
  2. COMPREHENSIVE COVERAGE: Analyze ALL dimensions - Budget, Schedule, Requirements, Governance, Risks, Resources, Architecture, Benefits. Don't focus only on obvious gaps.
  3. ROOT CAUSE ANALYSIS: Don't just identify gaps - explain WHY they exist and their upstream/downstream impacts.
  4. CORRELATION MAPPING: Cross-reference all artifacts. If the Business Case promises a benefit not in Requirements or Architecture, mark as 'High' severity.
  5. FINANCIAL FORENSICS: Analyze budget vs actual spend, cost allocation patterns, burn rate trends, contingency usage, and ROI projections.
  6. BENEFITS CHAIN TRACING: For EVERY benefit mentioned in business case:
     - Classify as Financial (cost reduction/revenue increase), Operational (efficiency/quality), or Strategic (capability/positioning)
     - Extract baseline measurement, target measurement, and quantify financial impact
     - Identify benefit owner by name and role
     - Validate measurement approach and data source
     - Calculate total portfolio value and realization outlook
  7. ARCHITECTURAL COHERENCE: Validate solution design against requirements, assess technical debt, scalability, and integration risks.
  8. GOVERNANCE RIGOR: Assess decision rights, RACI clarity, escalation paths, and stakeholder engagement quality.
  9. LEADING QUESTIONS: Generate probing questions that challenge assumptions and expose hidden risks. Target these to specific roles (PMO, CIO, CFO, Architect, Business Owner).
  
  OUTPUT QUALITY STANDARDS:
  - Generate 5-8 substantive findings covering multiple dimensions (not just one area)
  - Be specific with numbers, dates, document names
  - For benefits: ALWAYS quantify financial impact if possible, even as estimate
  - Use industry frameworks (TOGAF, PRINCE2, PMBOK, COBIT) to ground assessments
  - Avoid generic statements like "needs improvement" - quantify and cite evidence
  - For High severity findings: explain immediate business impact and mitigation urgency
  - Leading questions must be strategic, not tactical - designed to trigger deeper inquiry
  `;

  const prompt = `
    Perform a comprehensive Project Assurance Assessment for:
    
    PROJECT CONTEXT:
    - Name: ${projectData.name}
    - ID: ${projectData.number}
    - Current Phase: ${projectData.stage}
    - Audit Focus: ${projectData.focusAreas.join(', ')}

    ARTIFACTS TO ANALYZE:
    ${docContext}

    Return a JSON object with this EXACT structure (populate ALL fields with substantive content):
    {
      "overallScore": number (0-100, weighted: 30% gaps + 30% benefits + 20% financial + 20% framework alignment),
      "summary": "2-3 paragraph executive summary highlighting: (1) overall project health, (2) top 3 risks, (3) readiness to proceed",
      
      "benefitsSummary": {
        "totalPlannedValue": "Total $ value of all quantified benefits (e.g., '$3.2M')",
        "projectedAnnualValue": "Expected annual recurring value (e.g., '$2.8M annually')",
        "benefitsCount": number of benefits identified,
        "realizationOutlook": "1-2 sentence assessment of whether benefits are achievable and well-defined"
      },
      
      "gapAnalysis": [
        {
          "area": "Budget & Cost Management | Schedule | Requirements | Governance | etc",
          "observation": "CRITICAL: Start with document source: 'Based on analysis of [Document Name], which shows [specific data/section]...' Then explain the gap. ALWAYS cite specific document names, page sections, dollar amounts, dates, or line items that led to this conclusion. Explain the analytical process used (e.g., 'Cross-referencing Budget_v2.xlsx line items 15-23 against Requirements_Matrix.docx sections 3.1-3.5 reveals...')",
          "finding": "Clear statement of what is missing, misaligned, or at risk",
          "severity": "High|Medium|Low",
          "recommendation": "Specific, actionable remediation step with owner and timeline",
          "leadingQuestions": [
            "Strategic question for PMO/Sponsor",
            "Architectural question for Tech Lead",
            "Financial question for CFO"
          ]
        }
      ],
      
      "benefitsRealisation": [
        {
          "name": "Specific benefit title from business case",
          "category": "Financial | Operational | Strategic",
          "description": "What this benefit delivers to the business",
          "baseline": "Current state measurement (e.g., '4.2 hours average', '$1.8M annual cost', '62 NPS score')",
          "target": "Target state measurement (e.g., '1.5 hours', '$1.1M cost', '75 NPS')",
          "observation": "Evidence of how this benefit is tracked/justified in the business case and supporting docs",
          "owner": "Name and role of benefit owner (e.g., 'Sarah Chen (CFO)', 'Operations Director')",
          "financialValue": "Quantified $ value if financial benefit (e.g., '$700,000 annual savings', 'Not quantified' for non-financial)",
          "metric": "Specific KPI measurement method (e.g., 'Finance system monthly reports', 'Operations dashboard', 'Quarterly NPS surveys')",
          "targetDate": "Expected realization date (YYYY-MM-DD)",
          "readinessScore": number (0-100, based on: clarity of metric, owner assigned, baseline documented, tracking mechanism defined),
          "challengingQuestions": [
            "Who owns this benefit post-go-live and how is accountability enforced?",
            "What happens if baseline assumptions prove incorrect?",
            "How frequently will this be measured and reported?"
            "What happens if this benefit doesn't materialize?"
          ]
        }
      ],
      
      "criticalQuestions": [
        {
          "question": "Deep, strategic question exposing risk or assumption",
          "context": "Why this question matters - what evidence triggered it",
          "targetRole": "PMO Director | CIO | CFO | Solution Architect | Business Owner"
        }
      ],
      
      "frameworkAlignment": {
        "framework": "PRINCE2 | PMBOK | TOGAF | Agile/SAFe | MSP (based on doc structure)",
        "alignmentScore": number (0-100),
        "notes": "Specific gaps in framework compliance (e.g., missing Business Case approval signature, no RACI for Stage Gate 3)"
      },
      
      "financialAssurance": {
        "budgetStatus": "Detailed analysis: total budget, spent to date, committed, forecast at completion, variance %, contingency burn",
        "varianceAnalysis": "Root cause analysis of any variance >10% with impact assessment",
        "riskScore": number (0-100, lower is better - factors: burn rate, contingency depletion, unfunded scope)
      }
    }

    CRITICAL REQUIREMENTS:
    1. COMPREHENSIVE COVERAGE: Generate findings across ALL these dimensions (minimum 5-8 findings total):
       - Budget & Cost Management (variance, contingency, forecast accuracy)
       - Schedule & Milestones (critical path, dependencies, delays)
       - Requirements & Scope (traceability, completeness, creep)
       - Governance & Reporting (decision rights, RACI, escalation)
       - Risk & Issue Management (register quality, mitigation plans, monitoring)
       - Resource Allocation (skill gaps, capacity, utilization)
       - Solution Architecture (technical debt, scalability, integration)
       - Benefits Realisation (ownership, measurement, tracking)
    
    2. HOLISTIC ANALYSIS: Don't just focus on one area - provide balanced coverage showing:
       - What's working well (acknowledge strengths)
       - Critical gaps requiring immediate attention (High severity)
       - Medium-term improvements (Medium severity)
       - Opportunities for optimization (Low severity but valuable)
    
    3. DOCUMENT CITATIONS: Every finding MUST cite specific documents, sections, and data points
    
    4. Focus on 5-8 most important findings with substantive detail to ensure complete, valid JSON output.
  `;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 16384,
    system: systemInstruction,
    messages: [{
      role: "user",
      content: prompt
    }]
  });

  try {
    console.log("API Response:", message);
    const content = message.content[0];
    if (content.type !== 'text') throw new Error("Unexpected response type");
    let text = content.text;
    
    console.log("Raw AI Response (first 500 chars):", text.substring(0, 500));
    
    // More aggressive JSON extraction
    // Remove markdown code blocks
    text = text.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    
    // Find the first { and last } to extract pure JSON
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      text = text.substring(firstBrace, lastBrace + 1);
    }
    
    // Remove any leading/trailing whitespace
    text = text.trim();
    
    console.log("Cleaned JSON (first 500 chars):", text.substring(0, 500));
    console.log("Cleaned JSON (last 500 chars):", text.substring(text.length - 500));
    
    return JSON.parse(text) as AssuranceReport;
  } catch (error) {
    console.error("Audit Generation Error:", error);
    console.error("Error details:", error instanceof Error ? error.message : error);
    
    if (error instanceof SyntaxError) {
      console.error("JSON Syntax Error - showing problematic area around error position");
      const match = error.message.match(/position (\d+)/);
      if (match) {
        const pos = parseInt(match[1]);
        const content = message.content[0];
        if (content.type === 'text') {
          let text = content.text.replace(/```json\s*/g, '').replace(/```\s*/g, '');
          const firstBrace = text.indexOf('{');
          const lastBrace = text.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace !== -1) {
            text = text.substring(firstBrace, lastBrace + 1);
          }
          const start = Math.max(0, pos - 200);
          const end = Math.min(text.length, pos + 200);
          console.error("Context around error:", text.substring(start, end));
        }
      }
    }
    
    throw error; // Throw the original error for better debugging
  }
}
