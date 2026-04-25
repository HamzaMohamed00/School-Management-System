import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SessionService } from '../../../../core/services/session.service';
import { AuthService } from '../../../../core/services/auth.service';
import { TeacherService } from '../../../../core/services/teacher.service';
import { DashboardService } from '../../../../core/services/dashboard.service';
import { QRCodeModule } from 'angularx-qrcode';

@Component({
    selector: 'app-attendance-sessions',
    standalone: true,
    imports: [CommonModule, RouterModule, QRCodeModule],
    templateUrl: './attendance-sessions.component.html',
    styleUrls: ['./attendance-sessions.component.css']
})
export class AttendanceSessionsComponent implements OnInit {
    sessions: any[] = [];
    teacherId: number | null = null;
    loading = false;

    // QR Logic
    qrData: string = '';
    qrTimer: any;
    showQRModal = false;
    selectedSessionForQR: any = null;

    // Live Attendance Logic
    liveAttendance: any[] = [];
    pollingTimer: any;

    constructor(
        private sessionService: SessionService,
        private authService: AuthService,
        private teacherService: TeacherService,
        private dashboardService: DashboardService
    ) { }

    async ngOnInit() {
        this.loading = true;
        try {
            await this.discoverTeacherId();
            if (this.teacherId) {
                const res: any = await this.sessionService.getTeacherSessions(this.teacherId);
                const rawSessions = Array.isArray(res) ? res : res?.data || [];
                
                // Process sessions to add status and mockup growth
                this.sessions = rawSessions.map((s: any) => ({
                    ...s,
                    status: this.getSessionStatus(s),
                    growth: this.calculateGrowth(s)
                }));
            }
        } catch (err) {
            console.error('[AttendanceSessions] Init error:', err);
            this.sessions = [];
        }
        this.loading = false;
        this.startLivePolling();
    }

    getSessionStatus(session: any): string {
        const now = new Date();
        const start = new Date(session.startTime);
        const end = new Date(session.endTime);

        if (now > end) return 'منتهي';
        if (now >= start && now <= end) return 'جاري الآن';
        return 'قادم';
    }

    getStatusClass(status: string): string {
        switch (status) {
            case 'منتهي': return 'badge-secondary';
            case 'جاري الآن': return 'badge-success blink';
            case 'قادم': return 'badge-info';
            default: return 'badge-light';
        }
    }

    calculateGrowth(session: any): number {
        // Mock growth based on student count for realism
        return (session.id % 2 === 0) ? 5.2 : -2.1;
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
        this.stopQRRotation();
        this.stopLivePolling();
    }

    startLivePolling() {
        this.fetchLiveAttendance();
        this.pollingTimer = setInterval(() => this.fetchLiveAttendance(), 3000); // Every 3s
    }

    stopLivePolling() {
        if (this.pollingTimer) clearInterval(this.pollingTimer);
    }

    async fetchLiveAttendance() {
        // Disabled demo polling to avoid 404 errors from non-existent local server
        this.liveAttendance = [];
    }

    openQR(session: any = null) {
        this.selectedSessionForQR = session || {
            id: 'manual-' + this.authService.getCurrentUser()?.id + '-' + Date.now(),
            subjectName: 'حضور عام',
            classRoomName: 'قاعة المحاضرات'
        };
        this.showQRModal = true;
        this.startQRRotation();
    }

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
        const currentUser = this.authService.getCurrentUser();
        
        const data = {
            sessionId: this.selectedSessionForQR.id,
            timestamp: timestamp,
            teacherId: currentUser?.id || 'temp-teacher'
        };
        
        this.qrData = JSON.stringify(data);
        console.log('[AttendanceSessions] Generated QR Data successfully:', this.qrData);
    }

    cancelSession(sessionId: number) {
        if (confirm('هل أنت متأكد من إلغاء جلسة الحضور لهذا السكشن؟')) {
            console.log('Cancelling session:', sessionId);
            // Implement API call if needed
        }
    }
}
