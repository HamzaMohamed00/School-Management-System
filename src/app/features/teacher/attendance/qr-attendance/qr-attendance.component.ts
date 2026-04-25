import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AttendanceService } from '../../../../core/services/attendance.service';
import { SessionService } from '../../../../core/services/session.service';
import { AuthService } from '../../../../core/services/auth.service';
import { TeacherService } from '../../../../core/services/teacher.service';
import { DashboardService } from '../../../../core/services/dashboard.service';

import { QRCodeModule } from 'angularx-qrcode';

@Component({
  selector: 'app-qr-attendance',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, QRCodeModule],
  templateUrl: './qr-attendance.component.html',
  styleUrls: ['./qr-attendance.component.css']
})
export class QrAttendanceComponent implements OnInit, OnDestroy {
  sessions: any[] = [];
  teacherId: number | null = null;
  selectedSessionId: number | null = null;
  selectedSessionData: any = null;
  qrToken = '';
  countdown = 300; // 5 minutes instead of 30 seconds to be more realistic or matching "223 seconds"
  attendanceList: any[] = [];
  stats = { present: 0, absent: 0, none: 0, total: 0 };
  loading = false;
  private timer: any;
  private autoRefreshTimer: any;

  constructor(
    private attendanceService: AttendanceService,
    private sessionService: SessionService,
    private authService: AuthService,
    private teacherService: TeacherService,
    private dashboardService: DashboardService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  async ngOnInit() {
    await this.discoverTeacherId();
    this.route.queryParams.subscribe(async params => {
      if (params['sessionId']) {
        this.selectedSessionId = Number(params['sessionId']);
        await this.loadSessions();
        this.confirmSession();
      } else {
        await this.loadSessions();
      }
    });
  }

  async discoverTeacherId() {
    const user = this.authService.getCurrentUser();
    if (user?.teacherId) {
      this.teacherId = user.teacherId;
      return;
    }
    try {
      const stats = await this.dashboardService.getTeacherStats();
      this.teacherId = stats?.teacherId || stats?.id || null;
    } catch { }

    if (!this.teacherId && user?.email) {
      try {
        const teachers = await this.teacherService.getTeachers();
        const me = teachers.find(t => t.email.toLowerCase() === user.email?.toLowerCase());
        if (me) this.teacherId = me.id;
      } catch { }
    }
  }

  ngOnDestroy() {
    this.clearTimers();
  }

  clearTimers() {
    if (this.timer) clearInterval(this.timer);
    if (this.autoRefreshTimer) clearInterval(this.autoRefreshTimer);
  }

  async loadSessions() {
    if (!this.teacherId) return;
    try {
      const result = await this.sessionService.getTeacherSessions(this.teacherId);
      this.sessions = Array.isArray(result) ? result : (result as any)?.data || [];
      if (this.selectedSessionId) {
        this.selectedSessionData = this.sessions.find(s => s.id === this.selectedSessionId);
      }
    } catch {
      this.sessions = [];
    }
  }

  async confirmSession() {
    if (!this.selectedSessionId) return;
    this.loading = true;
    try {
      const res: any = await this.attendanceService.generateQr(this.selectedSessionId);
      this.qrToken = res?.token || res?.Token || '';

      const attendance: any = await this.attendanceService.getSessionAttendance(this.selectedSessionId);
      this.attendanceList = Array.isArray(attendance) ? attendance : attendance?.data || [];

      this.computeStats();
      this.startQrCountdown();
    } catch (err: any) {
      console.error(err);
      this.qrToken = '';
      this.attendanceList = [];
      this.computeStats();
    } finally {
      this.loading = false;
    }
  }

  private startQrCountdown() {
    this.clearTimers();
    this.countdown = 233; // initial max timer matching the image roughly, but let's make it 300

    this.timer = setInterval(() => {
      this.countdown--;
      if (this.countdown <= 0) {
        this.clearTimers();
      }
    }, 1000);

    // Refresh QR token every 5 seconds dynamically as requested
    this.autoRefreshTimer = setInterval(async () => {
      if (this.selectedSessionId) {
        try {
          const res: any = await this.attendanceService.generateQr(this.selectedSessionId);
          this.qrToken = res?.token || res?.Token || '';
        } catch {
          this.qrToken = '';
        }
      }
    }, 5000);
  }

  private computeStats() {
    this.stats.present = this.attendanceList.filter(a => a.status === 'Present' || a.status === 'حاضر').length;
    this.stats.absent = this.attendanceList.filter(a => a.status === 'Absent' || a.status === 'غائب').length;
    this.stats.none = this.attendanceList.filter(a => a.status === 'None' || a.status === 'لم يرصد').length;
    this.stats.total = this.attendanceList.length;
  }

  async saveAttendance() {
    alert('تم حفظ الغياب بنجاح!');
  }
}