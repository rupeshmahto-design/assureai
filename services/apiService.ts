/// <reference types="vite/client" />
import { AssuranceReport } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface SavedReport {
  id: string;
  projectName: string;
  projectNumber: string;
  projectStage: string;
  report: AssuranceReport;
  documents: Array<{ name: string; size: number; type: string }>;
  viewMode: 'dashboard' | 'professional';
  created_at: string;
}

export const apiService = {
  // Get all reports
  async getReports(): Promise<SavedReport[]> {
    try {
      const response = await fetch(`${API_URL}/api/reports`);
      if (!response.ok) throw new Error('Failed to fetch reports');
      const data = await response.json();
      
      // Transform database format to frontend format
      return data.map((report: any) => ({
        id: report.id.toString(),
        projectName: report.project_name,
        projectNumber: report.project_number,
        projectStage: report.project_stage,
        report: typeof report.report === 'string' ? JSON.parse(report.report) : report.report,
        documents: typeof report.documents === 'string' ? JSON.parse(report.documents) : report.documents,
        viewMode: report.view_mode,
        created_at: report.created_at
      }));
    } catch (error) {
      console.error('Error fetching reports:', error);
      throw error;
    }
  },

  // Get single report
  async getReport(id: string): Promise<SavedReport> {
    try {
      const response = await fetch(`${API_URL}/api/reports/${id}`);
      if (!response.ok) throw new Error('Failed to fetch report');
      const report = await response.json();
      
      return {
        id: report.id.toString(),
        projectName: report.project_name,
        projectNumber: report.project_number,
        projectStage: report.project_stage,
        report: typeof report.report === 'string' ? JSON.parse(report.report) : report.report,
        documents: typeof report.documents === 'string' ? JSON.parse(report.documents) : report.documents,
        viewMode: report.view_mode,
        created_at: report.created_at
      };
    } catch (error) {
      console.error('Error fetching report:', error);
      throw error;
    }
  },

  // Create new report
  async createReport(reportData: {
    projectName: string;
    projectNumber: string;
    projectStage: string;
    report: AssuranceReport;
    documents: Array<{ name: string; size: number; type: string }>;
    viewMode: 'dashboard' | 'professional';
  }): Promise<SavedReport> {
    try {
      const response = await fetch(`${API_URL}/api/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reportData),
      });
      
      if (!response.ok) throw new Error('Failed to create report');
      const report = await response.json();
      
      return {
        id: report.id.toString(),
        projectName: report.project_name,
        projectNumber: report.project_number,
        projectStage: report.project_stage,
        report: typeof report.report === 'string' ? JSON.parse(report.report) : report.report,
        documents: typeof report.documents === 'string' ? JSON.parse(report.documents) : report.documents,
        viewMode: report.view_mode,
        created_at: report.created_at
      };
    } catch (error) {
      console.error('Error creating report:', error);
      throw error;
    }
  },

  // Delete report
  async deleteReport(id: string): Promise<void> {
    try {
      const response = await fetch(`${API_URL}/api/reports/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to delete report');
    } catch (error) {
      console.error('Error deleting report:', error);
      throw error;
    }
  },
};
