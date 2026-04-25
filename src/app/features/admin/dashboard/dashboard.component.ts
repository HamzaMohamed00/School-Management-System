import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { DashboardService } from '../../../core/services/dashboard.service';
import { AnnouncementService, CreateAnnouncementDto } from '../../../core/services/announcement.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  adminName = '';
  stats = {
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
    attendanceRate: '—'
  };
  today = new Date();
  recentStudents: any[] = [];
  loading = true;
  error = '';

  // Announcement Modal
  showAnnouncementModal = false;
  announcementLoading = false;
  announcementSuccess = false;
  announcementError = '';
  newAnnouncement: CreateAnnouncementDto = {
    title: '',
    content: '',
    audience: 'All'
  };

  constructor(
    private dashboardService: DashboardService,
    private authService: AuthService,
    private announcementService: AnnouncementService
  ) { }

  async ngOnInit() {
    const user = this.authService.getCurrentUser();
    this.adminName = user?.fullName || 'المدير';
    await this.loadStats();
  }

  async loadStats() {
    this.loading = true;
    try {
      const data = await this.dashboardService.getAdminStats();
      this.stats.totalStudents = data.totalStudents;
      this.stats.totalTeachers = data.totalTeachers;
      this.stats.totalClasses = data.totalClasses;
      this.stats.attendanceRate = data.attendanceRate || '—';
      this.recentStudents = data.recentStudents || [];
    } catch (err: any) {
      console.error('Dashboard load error:', err);
      this.error = 'حدث خطأ في تحميل بيانات لوحة التحكم';
    } finally {
      this.loading = false;
    }
  }

  openAnnouncementModal() {
    this.showAnnouncementModal = true;
    this.announcementSuccess = false;
    this.announcementError = '';
    this.newAnnouncement = {
      title: '',
      content: '',
      audience: 'All'
    };
  }

  closeAnnouncementModal() {
    this.showAnnouncementModal = false;
    this.announcementSuccess = false;
    this.announcementError = '';
  }

  async publishAnnouncement() {
    if (!this.newAnnouncement.title.trim() || !this.newAnnouncement.content.trim()) return;
    this.announcementLoading = true;
    this.announcementSuccess = false;
    this.announcementError = '';
    try {
      await this.announcementService.createAnnouncement({
        title: this.newAnnouncement.title,
        content: this.newAnnouncement.content,
        audience: 'All'
      });
      this.announcementSuccess = true;
      // Auto close after 2 seconds
      setTimeout(() => this.closeAnnouncementModal(), 2000);
    } catch (err: any) {
      console.error('Announcement error:', err);
      this.announcementError = 'حدث خطأ أثناء نشر الإعلان. حاول مرة أخرى.';
    } finally {
      this.announcementLoading = false;
    }
  }

  logout() {
    this.authService.logout();
  }
}

