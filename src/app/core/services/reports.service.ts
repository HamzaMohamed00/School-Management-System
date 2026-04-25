import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

export interface WeeklyAttendance {
  day: string;
  present: number;
  absent: number;
  date: Date;
}

export interface AbsenceByGrade {
  gradeName: string;
  count: number;
}

export interface AdminReportsStats {
  completedSessions: number;
  absenceDays: number;
  averageAttendance: number;
  absenceByGrade: AbsenceByGrade[];
  weeklyAttendance: WeeklyAttendance[];
}

export interface ReportFilter {
  startDate?: string;
  endDate?: string;
  gradeName?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ReportsService {
  constructor(private api: ApiService) { }

  async getAdminStats(filter: ReportFilter = {}): Promise<AdminReportsStats> {
    const params: any = {};
    if (filter.startDate) params.startDate = filter.startDate;
    if (filter.endDate) params.endDate = filter.endDate;
    if (filter.gradeName) params.gradeName = filter.gradeName;

    return this.api.get<AdminReportsStats>('/api/Reports/admin-stats', params);
  }
}
