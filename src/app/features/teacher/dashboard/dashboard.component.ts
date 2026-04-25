import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { DashboardService } from '../../../core/services/dashboard.service';
import { AnnouncementService, Announcement } from '../../../core/services/announcement.service';

import { QRCodeModule } from 'angularx-qrcode';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, QRCodeModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  teacherName = '';
  stats = {
    totalStudents: 0,
    attendanceAvg: '—',
    todayClasses: 0
  };
  currentSession: any = null;
  upcomingSessions: any[] = [];
  announcements: Announcement[] = [];
  loading = true;
  
  // QR Code Logic
  qrData: string = '';
  qrTimer: any;
  showQRModal = false;

  async startManualAttendance() {
    this.selectedSessionForQR = {
      id: 'manual-' + this.authService.getCurrentUser()?.id + '-' + Date.now(),
      subjectName: 'حضور عام',
      classRoomName: 'قاعة المحاضرات'
    };
    this.showQRModal = true;
    this.startQRRotation();
  }

  constructor(
    private dashboardService: DashboardService,
    private authService: AuthService,
    private announcementService: AnnouncementService
  ) { }

  async ngOnInit() {
    const user = this.authService.getCurrentUser();
    this.teacherName = user?.fullName || 'المعلم';
    await this.loadDashboardData();
  }

  ngOnDestroy() {
    this.stopQRRotation();
  }

  async loadDashboardData() {
    this.loading = true;
    try {
      const [data, announcements] = await Promise.all([
        this.dashboardService.getTeacherStats(),
        this.announcementService.getAnnouncements()
      ]);

      this.announcements = announcements.slice(0, 3);
      this.stats.totalStudents = data.totalStudents;
      this.stats.attendanceAvg = data.attendanceAvg || '—';
      this.stats.todayClasses = data.todayClasses;

      const now = new Date();
      const sessions = data.todaySessions || [];

      this.currentSession = sessions.find((s: any) => {
        const start = new Date(s.startTime);
        const end = new Date(s.endTime);
        return now >= start && now <= end;
      }) || null;

      this.upcomingSessions = sessions.filter((s: any) => {
        return new Date(s.startTime) > now;
      }) || [];

      // Fallback: If no current session, but there are sessions today, 
      // allow picking the first one for QR purposes
      if (!this.currentSession && sessions.length > 0) {
        this.currentSession = sessions[0];
      }

    } catch (err: any) {
      console.error('Teacher Dashboard load error:', err);
    } finally {
      this.loading = false;
    }
  }

  openQR(session: any = null) {
    const targetSession = session || this.currentSession;
    if (!targetSession) return;
    
    this.selectedSessionForQR = targetSession;
    this.showQRModal = true;
    this.startQRRotation();
  }

  selectedSessionForQR: any = null;

  closeQR() {
    this.showQRModal = false;
    this.stopQRRotation();
  }

  startQRRotation() {
    this.generateQRData();
    this.qrTimer = setInterval(() => {
      this.generateQRData();
    }, 5000);
  }

  stopQRRotation() {
    if (this.qrTimer) {
      clearInterval(this.qrTimer);
    }
  }

  generateQRData() {
    if (!this.selectedSessionForQR) return;
    const timestamp = Math.floor(Date.now() / 5000); 
    const data = {
      sessionId: this.selectedSessionForQR.id,
      timestamp: timestamp,
      teacherId: this.authService.getCurrentUser()?.id
    };
    this.qrData = JSON.stringify(data);
  }
}
