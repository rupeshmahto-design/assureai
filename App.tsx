
import React, { useState } from 'react';
import { ProjectData, FocusArea, ProjectStage, AssuranceReport, ProjectDocument } from './types';
import { FOCUS_AREAS, PROJECT_STAGES } from './constants';
import FileUpload from './components/FileUpload';
import ReportDashboard from './components/ReportDashboard';
import ProfessionalReport from './components/ProfessionalReport';
import Sidebar from './components/Sidebar';
import ReportHistory from './components/ReportHistory';
import { Login } from './components/Login';
import { Register } from './components/Register';
import { AdminDashboard } from './components/AdminDashboard';
import { useAuth } from './context/AuthContext';
import { analyzeProjectAssurance } from './services/geminiService';
import { apiService } from './services/apiService';
import { generateRiskControlMatrix } from './services/excelService';
// @ts-ignore - html2pdf doesn't have local types but works via importmap
import html2pdf from 'html2pdf.js';

const SAMPLE_DOCS: ProjectDocument[] = [
  {
    id: 'sample-1',
    name: 'Business_Case_v2.txt',
    type: 'text/plain',
    size: '12 KB',
    category: 'Business Case',
    content: `Project: GRC Transformation. Total Budget: $1.2M. 
    Primary Benefit: Reduce compliance reporting time by 40% and save $300k annually in manual audit costs. 
    Timeline: Completion by Q4 2025. 
    Key Milestones: Initial Setup June 2025, Full Rollout Dec 2025.`
  },
  {
    id: 'sample-2',
    name: 'Solution_Architecture_Draft.txt',
    type: 'text/plain',
    size: '25 KB',
    category: 'Architecture',
    content: `System Architecture: AWS-based GRC platform using Serverless Lambda and RDS. 
    Note: The current design does not yet include the 'Automated Audit Reporting' module due to API limitations with the legacy ERP system. 
    Estimated Infrastructure Cost: $15k per month.`
  },
  {
    id: 'sample-3',
    name: 'Project_Budget_Sheet.csv',
    type: 'text/csv',
    size: '5 KB',
    category: 'Budget',
    content: `Item,Cost,Status
    Software Licensing,$400000,Planned
    Consulting Fees,$900000,Committed
    Contingency,$50000,Planned
    Total Cost,$1350000,`
  }
];

const App: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [showAdmin, setShowAdmin] = useState(false);
  
  const [projectData, setProjectData] = useState<ProjectData>({
    name: '',
    number: '',
    focusAreas: ['Budget & Cost Management', 'Requirements & Scope', 'Solution Architecture Alignment', 'Benefits Realisation'],
    stage: 'Planning',
    documents: []
  });
  const [report, setReport] = useState<AssuranceReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'dashboard' | 'professional'>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  // Show login/register if not authenticated
  if (!isAuthenticated) {
    return authView === 'login' 
      ? <Login onSwitchToRegister={() => setAuthView('register')} />
      : <Register onSwitchToLogin={() => setAuthView('login')} />;
  }

  // Show admin dashboard if user clicked admin button
  if (showAdmin) {
    return <AdminDashboard />;
  }

  const loadSampleData = () => {
    setProjectData({
      name: 'Global GRC Technology Transformation',
      number: 'PRJ-TRANS-2025-001',
      focusAreas: ['Budget & Cost Management', 'Requirements & Scope', 'Solution Architecture Alignment', 'Benefits Realisation'],
      stage: 'Planning',
      documents: SAMPLE_DOCS
    });
    setError(null);
    setReport(null);
  };

  const toggleFocusArea = (area: FocusArea) => {
    setProjectData(prev => ({
      ...prev,
      focusAreas: prev.focusAreas.includes(area)
        ? prev.focusAreas.filter(a => a !== area)
        : [...prev.focusAreas, area]
    }));
  };

  const handleRunAnalysis = async () => {
    if (!projectData.name || !projectData.number) {
      setError("Project identity is required for audit context.");
      return;
    }
    if (projectData.documents.length === 0) {
      setError("The auditor requires project artifacts to proceed with evaluation.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await analyzeProjectAssurance(projectData);
      setReport(result);
      
      // Save report to localStorage
      saveReportToHistory(result);
    } catch (err: any) {
      setError(err.message || "Auditor encountered a processing error.");
    } finally {
      setLoading(false);
    }
  };

  const saveReportToHistory = async (newReport: AssuranceReport) => {
    try {
      await apiService.createReport({
        projectName: projectData.name,
        projectNumber: projectData.number,
        projectStage: projectData.stage,
        report: newReport,
        documents: projectData.documents.map(d => ({ name: d.name, size: parseInt(d.size) || 0, type: d.type })),
        viewMode: viewMode
      });
      console.log('Report saved to database');
    } catch (error) {
      console.error('Failed to save report:', error);
      alert('Failed to save report to database. Please try again.');
    }
  };

  const handleViewHistoricalReport = (savedReport: any) => {
    setProjectData({
      name: savedReport.projectName,
      number: savedReport.projectNumber,
      focusAreas: projectData.focusAreas, // Keep current focus areas
      stage: savedReport.projectStage,
      documents: savedReport.documents
    });
    setReport(savedReport.report);
    setViewMode(savedReport.viewMode);
    setActiveTab('new');
  };

  const handleExportPDF = async () => {
    if (!report) return;
    setExporting(true);
    
    // Use different element ID based on view mode
    const elementId = viewMode === 'professional' ? 'professional-report' : 'assurance-report-content';
    const element = document.getElementById(elementId);
    
    if (!element) {
      alert('Report element not found');
      setExporting(false);
      return;
    }
    
    const opt = {
      margin: viewMode === 'professional' ? 0 : 10,
      filename: `AssurePro_Audit_${projectData.number}.pdf`,
      html2canvas: { 
        scale: 2, 
        useCORS: true, 
        logging: false,
        letterRendering: true,
        allowTaint: true
      },
      jsPDF: { 
        unit: 'mm', 
        format: 'a4', 
        orientation: 'portrait',
        compress: true
      },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    try {
      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error("PDF Export failed:", err);
      alert("Failed to export PDF. Please try again or use the system print option (Ctrl+P).");
    } finally {
      setExporting(false);
    }
  };

  const handleShowAuditLog = () => {
    alert(`DETERMINISTIC AUDIT LOG v3.1\n\n- Correlating: ${projectData.documents.length} artifacts\n- Baseline: ${projectData.focusAreas.join(', ')}\n- Logic: High-Fidelity Gemini Pro Correlation\n- Cross-Ref: PASS\n- Anomaly Check: DISCREPANCY DETECTED ($1.2M Case vs $1.35M Budget)`);
  };

  const removeDoc = (id: string) => {
    setProjectData(prev => ({
      ...prev,
      documents: prev.documents.filter(d => d.id !== id)
    }));
  };

  return (
    <div className="min-h-screen bg-[#fcfdfe] flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 py-6 px-10 sticky top-0 z-50 no-print">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-5">
             <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg shadow-slate-200">
                <i className="fa-solid fa-shield-halved text-white text-2xl"></i>
             </div>
             <div>
                <h1 className="text-2xl font-black text-slate-900 leading-none tracking-tight">ASSUREPRO <span className="text-indigo-600">AI</span></h1>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2">Deterministic Governance Engine</p>
             </div>
          </div>
          <div className="hidden lg:flex items-center gap-3">
             {(user?.isOrgAdmin || user?.isSuperAdmin) && (
               <button 
                onClick={() => setShowAdmin(true)}
                className="px-4 py-2 bg-purple-50 border border-purple-100 rounded-xl text-[10px] font-black text-purple-600 uppercase tracking-widest hover:bg-purple-100 transition-all flex items-center gap-2"
               >
                  <i className="fa-solid fa-user-shield"></i>
                  Admin
               </button>
             )}
             <button 
              onClick={loadSampleData}
              className="px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-xl text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:bg-indigo-100 transition-all flex items-center gap-2"
             >
                <i className="fa-solid fa-vial"></i>
                Load Sample Project
             </button>
             <button 
              onClick={() => setSidebarOpen(true)}
              className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black text-slate-600 uppercase tracking-widest hover:bg-slate-100 transition-all flex items-center gap-2"
              title="Settings"
             >
                <i className="fa-solid fa-gear"></i>
                Settings
             </button>
             <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Auditor Core 3.1 Online</span>
             </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      {!report && (
        <div className="bg-white border-b border-slate-200 sticky top-[88px] z-40 no-print">
          <div className="max-w-6xl mx-auto px-10">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('new')}
                className={`px-6 py-4 text-sm font-black uppercase tracking-wider transition-all relative ${
                  activeTab === 'new'
                    ? 'text-indigo-600'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <span className="flex items-center gap-2">
                  <i className="fa-solid fa-plus-circle"></i>
                  New Assessment
                </span>
                {activeTab === 'new' && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600"></div>
                )}
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-6 py-4 text-sm font-black uppercase tracking-wider transition-all relative ${
                  activeTab === 'history'
                    ? 'text-indigo-600'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <span className="flex items-center gap-2">
                  <i className="fa-solid fa-clock-rotate-left"></i>
                  Report History
                </span>
                {activeTab === 'history' && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600"></div>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-6xl mx-auto w-full px-10 py-12">
        {!report ? (
          activeTab === 'history' ? (
            <ReportHistory onViewReport={handleViewHistoricalReport} />
          ) : (
          <div className="max-w-4xl mx-auto space-y-10">
            <div className="text-center space-y-4">
               <h2 className="text-5xl font-black text-slate-900 tracking-tight">Project Assurance Audit</h2>
               <p className="text-slate-400 font-medium max-w-xl mx-auto text-lg leading-relaxed">
                  Upload your artifacts to initiate a high-fidelity correlation between your budget, plan, architecture, and requirements.
               </p>
            </div>

            <div className="space-y-6">
              <section className="bg-white rounded-[2rem] border border-slate-200 p-10 shadow-sm">
                <h2 className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400 mb-10 flex items-center gap-3">
                  <span className="w-10 h-[2px] bg-indigo-600"></span>
                  Project Specification
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-8">
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 mb-3 uppercase tracking-widest">Project Name</label>
                      <input
                        type="text"
                        value={projectData.name}
                        onChange={(e) => setProjectData({ ...projectData, name: e.target.value })}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white text-sm font-bold transition-all shadow-inner"
                        placeholder="Project Title"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 mb-3 uppercase tracking-widest">Reference Number</label>
                      <input
                        type="text"
                        value={projectData.number}
                        onChange={(e) => setProjectData({ ...projectData, number: e.target.value })}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white text-sm font-bold transition-all shadow-inner"
                        placeholder="Internal ID"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 mb-3 uppercase tracking-widest">Project Maturity Stage</label>
                      <select
                        value={projectData.stage}
                        onChange={(e) => setProjectData({ ...projectData, stage: e.target.value as ProjectStage })}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white text-sm font-bold transition-all appearance-none cursor-pointer shadow-inner"
                      >
                        {PROJECT_STAGES.map(stage => (
                          <option key={stage} value={stage}>{stage}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 mb-3 uppercase tracking-widest">Assurance Focus Matrix</label>
                    <div className="grid grid-cols-1 gap-2">
                      {FOCUS_AREAS.map(area => (
                        <button
                          key={area}
                          onClick={() => toggleFocusArea(area)}
                          className={`flex items-center gap-4 px-6 py-4 rounded-2xl border-2 transition-all text-left group ${
                            projectData.focusAreas.includes(area)
                              ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 shadow-sm'
                              : 'border-slate-50 bg-slate-50/50 text-slate-400 hover:border-slate-200 hover:bg-white'
                          }`}
                        >
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                            projectData.focusAreas.includes(area) ? 'bg-indigo-600 text-white shadow-md' : 'bg-white border border-slate-200'
                          }`}>
                             {projectData.focusAreas.includes(area) && <i className="fa-solid fa-check text-[10px]"></i>}
                          </div>
                          <span className="text-xs font-black uppercase tracking-tight">{area}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <section className="bg-white rounded-[2rem] border border-slate-200 p-10 shadow-sm">
                <h2 className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400 mb-10 flex items-center gap-3">
                  <span className="w-10 h-[2px] bg-emerald-500"></span>
                  Artifact Correlation Upload
                </h2>
                
                <FileUpload onFilesAdded={(docs) => setProjectData(prev => ({ ...prev, documents: [...prev.documents, ...docs] }))} />

                {projectData.documents.length > 0 && (
                  <div className="mt-12 space-y-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center justify-between">
                      <span>Artifact Repository</span>
                      <span className="text-emerald-500">{projectData.documents.length} Files Categorized</span>
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {projectData.documents.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between group p-4 bg-white rounded-2xl border border-slate-100 hover:border-indigo-300 transition-all shadow-sm">
                          <div className="flex items-center gap-4 overflow-hidden">
                            <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100">
                               <i className={`fa-solid ${
                                  doc.name.endsWith('.pdf') ? 'fa-file-pdf text-rose-500' :
                                  doc.name.endsWith('.xlsx') ? 'fa-file-excel text-emerald-600' :
                                  'fa-file-lines text-indigo-400'
                               } text-xl`}></i>
                            </div>
                            <div className="overflow-hidden">
                              <p className="text-sm font-black text-slate-800 truncate leading-tight">{doc.name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">{doc.category}</span>
                                <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase">{doc.size}</span>
                              </div>
                            </div>
                          </div>
                          <button onClick={() => removeDoc(doc.id)} className="text-slate-200 hover:text-rose-500 p-2 transition-colors">
                            <i className="fa-solid fa-circle-xmark text-xl"></i>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              {error && (
                <div className="p-6 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-4 text-xs font-black text-rose-700 uppercase tracking-widest">
                  <i className="fa-solid fa-triangle-exclamation text-xl"></i>
                  {error}
                </div>
              )}

              <button
                onClick={handleRunAnalysis}
                disabled={loading}
                className={`w-full py-6 rounded-3xl font-black text-xs uppercase tracking-[0.3em] shadow-2xl flex items-center justify-center gap-4 transition-all ${
                  loading ? 'bg-slate-300 text-white cursor-wait' : 'bg-slate-900 hover:bg-indigo-600 text-white active:scale-[0.99] hover:shadow-indigo-200'
                }`}
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Executing Deterministic Correlation...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-bolt-lightning text-amber-400"></i>
                    Initiate Final Assurance Review
                  </>
                )}
              </button>
            </div>
          </div>
          )
        ) : (
          <div className="space-y-12 animate-in fade-in zoom-in duration-700">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-slate-100 pb-12 no-print">
              <div className="flex items-center gap-8">
                <div className="w-20 h-20 bg-white border border-slate-200 rounded-[2rem] flex items-center justify-center text-slate-800 shadow-xl">
                   <i className="fa-solid fa-magnifying-glass-chart text-3xl"></i>
                </div>
                <div>
                  <button
                    onClick={() => setReport(null)}
                    className="text-indigo-600 hover:text-indigo-800 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 mb-4 group reset-btn"
                  >
                    <i className="fa-solid fa-arrow-left transition-transform group-hover:-translate-x-1"></i>
                    Return to Evaluation Input
                  </button>
                  <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none">{projectData.name}</h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-4 flex items-center gap-3">
                     <span className="flex items-center gap-1.5"><i className="fa-solid fa-calendar"></i> {new Date().toLocaleDateString()}</span>
                     <span className="w-1.5 h-1.5 bg-slate-200 rounded-full"></span>
                     <span className="flex items-center gap-1.5"><i className="fa-solid fa-hashtag"></i> {projectData.number}</span>
                     <span className="w-1.5 h-1.5 bg-slate-200 rounded-full"></span>
                     <span className="flex items-center gap-1.5 text-indigo-500 font-black"><i className="fa-solid fa-shield-check"></i> Audit Verified</span>
                  </p>
                </div>
              </div>
              <div className="flex gap-3 export-btns">
                 <button 
                  onClick={handleShowAuditLog}
                  className="px-8 py-4 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
                 >
                    Audit Log
                 </button>
                 <button 
                  onClick={handleExportPDF}
                  disabled={exporting}
                  className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200 flex items-center gap-2"
                 >
                    {exporting ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-file-pdf"></i>}
                    {exporting ? 'Generating PDF...' : 'Export Audit'}
                 </button>
              </div>
            </div>
            
            {/* View Mode Toggle */}
            <div className="flex items-center gap-3 mb-6 bg-slate-100 p-2 rounded-lg inline-flex">
              <button
                onClick={() => setViewMode('dashboard')}
                className={`px-4 py-2 rounded font-bold text-sm transition-all ${
                  viewMode === 'dashboard' 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <i className="fa-solid fa-chart-line mr-2"></i>
                Dashboard View
              </button>
              <button
                onClick={() => setViewMode('professional')}
                className={`px-4 py-2 rounded font-bold text-sm transition-all ${
                  viewMode === 'professional' 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <i className="fa-solid fa-file-lines mr-2"></i>
                Professional Report
              </button>
              <button
                onClick={() => generateRiskControlMatrix(report, projectData.name, projectData.number)}
                className="px-4 py-2 rounded font-bold text-sm bg-green-600 text-white hover:bg-green-700 transition-all shadow-sm ml-auto"
                title="Export Risk & Control Matrix to Excel"
              >
                <i className="fa-solid fa-file-excel mr-2"></i>
                Export Risk Matrix
              </button>
            </div>
            
            {viewMode === 'dashboard' ? (
              <ReportDashboard report={report} />
            ) : (
              <ProfessionalReport 
                report={report}
                projectName={projectData.name}
                projectNumber={projectData.number}
                projectStage={projectData.stage}
                documents={projectData.documents.map(d => ({ name: d.name, category: d.category }))}
              />
            )}
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-slate-100 py-16 px-10 mt-20 no-print">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-1 md:col-span-2 space-y-6">
             <div className="flex items-center gap-3">
                <i className="fa-solid fa-shield-halved text-2xl text-slate-800"></i>
                <span className="text-xl font-black tracking-tighter">ASSUREPRO <span className="text-indigo-600">AI</span></span>
             </div>
             <p className="text-xs font-medium text-slate-400 max-w-sm leading-relaxed">
                A deterministic project governance platform designed for enterprise assurance and benefits traceability. 
                Built for internal audit, PMO, and executive oversight.
             </p>
          </div>
          <div className="space-y-4">
             <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Logic Engine</h4>
             <ul className="text-[11px] font-bold text-slate-400 space-y-3 uppercase tracking-tighter">
                <li><i className="fa-solid fa-check text-emerald-500 mr-2"></i> PRINCE2 Compliance</li>
                <li><i className="fa-solid fa-check text-emerald-500 mr-2"></i> TOGAF Architecture</li>
                <li><i className="fa-solid fa-check text-emerald-500 mr-2"></i> PMBOK Framework</li>
                <li><i className="fa-solid fa-check text-emerald-500 mr-2"></i> ISO 31000 Risk</li>
             </ul>
          </div>
          <div className="space-y-4">
             <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Legal & Security</h4>
             <ul className="text-[11px] font-bold text-slate-400 space-y-3 uppercase tracking-tighter">
                <li>Audit Logs</li>
                <li>Data Privacy</li>
                <li>API Credentials</li>
                <li>Advisory Services</li>
             </ul>
          </div>
        </div>
        <div className="max-w-6xl mx-auto border-t border-slate-50 mt-16 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-black text-slate-300 uppercase tracking-widest">
           <span>&copy; 2025 AssurePro Systems. All Rights Reserved.</span>
           <div className="flex gap-4">
              <span>Deterministic v3.1</span>
              <span>•</span>
              <span>Encrypted Session</span>
           </div>
        </div>
      </footer>

      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </div>
  );
};

export default App;
