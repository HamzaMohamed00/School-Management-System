import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { DashboardService } from '../../../core/services/dashboard.service';
import { AnnouncementService, Announcement } from '../../../core/services/announcement.service';

@Component({
  selector: 'app-parent-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './parent-dashboard.component.html',
  styleUrls: ['./dashboard.component.css'] // Standardizing CSS usage
})
export class DashboardComponent implements OnInit {
  parentName = '';
  parentAddress: string | null = null;
  parentEmail: string | null = null;
  today = new Date();
  children: any[] = [];
  upcomingEvents: any[] = [];
  pendingPayments = 0;
  recentNotifications: any[] = [];
  announcements: Announcement[] = [];
  loading = true;

  constructor(
    private authService: AuthService,
    private dashboardService: DashboardService,
    private announcementService: AnnouncementService,
    private router: Router
  ) { }

  async ngOnInit() {
    const user = this.authService.getCurrentUser();
    this.parentName = user?.fullName || 'ولي الأمر';

    await this.loadDashboard();
  }

  async loadDashboard() {
    this.loading = true;
    try {
      const [data, announcements] = await Promise.all([
        this.dashboardService.getParentStats(),
        this.announcementService.getAnnouncements()
      ]);

      this.children = data.children || [];
      this.announcements = announcements.slice(0, 3);

      this.upcomingEvents = [];
      this.pendingPayments = 0;
      this.recentNotifications = [];
    } catch (err: any) {
      console.error('Parent Dashboard load error:', err);
    } finally {
      this.loading = false;
    }
  }

  getAttendanceColor(rate: any): string {
    const numRate = typeof rate === 'string' ? parseFloat(rate) : rate;
    if (isNaN(numRate)) return '#F59E0B';
    if (numRate >= 90) return '#10B981';
    if (numRate >= 75) return '#F59E0B';
    return '#EF4444';
  }

  viewTimetable(studentId?: number) {
    const id = studentId || (this.children && this.children.length > 0 ? this.children[0].id : null);
    if (id) {
      this.router.navigate(['/student/timetable'], { queryParams: { studentId: id } });
    }
  }

  viewGrades(studentId: number) {
    this.router.navigate(['/student/grades'], { queryParams: { studentId: studentId } });
  }

  logout() {
    this.authService.logout();
  }
}
