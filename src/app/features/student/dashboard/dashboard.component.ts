import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { DashboardService } from '../../../core/services/dashboard.service';
import { AnnouncementService, Announcement } from '../../../core/services/announcement.service';

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, DatePipe],
  templateUrl: './student-dashboard.component.html',
  styleUrls: ['./student-dashboard.component.css']
})
export class StudentDashboardComponent implements OnInit {
  studentName = '';
  attendancePercent: number | string = '—';
  className = '';
  gradeLevel = '';
  todaySessions: any[] = [];
  recentGrades: any[] = [];
  nextSession: any = null;
  upcomingTasks: any[] = [];
  upcomingAssignmentsCount = 0;
  announcements: Announcement[] = [];
  loading = true;

  constructor(
    private authService: AuthService,
    private dashboardService: DashboardService,
    private announcementService: AnnouncementService
  ) { }

  async ngOnInit() {
    const user = this.authService.getCurrentUser();
    this.studentName = user?.fullName || 'الطالب';

    await this.loadDashboardData();
  }

  private async loadDashboardData() {
    this.loading = true;
    try {
      const [data, announcements] = await Promise.all([
        this.dashboardService.getStudentStats(),
        this.announcementService.getAnnouncements()
      ]);

      // Parse attendance percentage correctly to remove extra % and handle as number
      if (data.attendanceRate) {
        this.attendancePercent = parseFloat(data.attendanceRate.replace('%', ''));
        if (isNaN(this.attendancePercent as number)) this.attendancePercent = 0;
      } else {
        this.attendancePercent = 0;
      }

      this.className = data.className || 'غير محدد';
      this.gradeLevel = data.gradeLevel || '';
      this.todaySessions = data.todaySessions || [];
      this.recentGrades = data.recentGrades || [];
      this.nextSession = data.nextSession || null;
      
      const exams = data.upcomingExams || [];
      const assignments = data.upcomingAssignments || [];
      this.upcomingTasks = [...exams, ...assignments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      this.upcomingAssignmentsCount = data.upcomingAssignmentsCount || 0;
      this.announcements = announcements.slice(0, 3);
    } catch (err: any) {
      console.error('Student Dashboard load error:', err);
    } finally {
      this.loading = false;
    }
  }
}
