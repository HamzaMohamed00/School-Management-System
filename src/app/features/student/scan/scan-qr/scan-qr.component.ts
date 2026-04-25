import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AttendanceService } from '../../../../core/services/attendance.service';
import { AuthService } from '../../../../core/services/auth.service';
import { SessionService } from '../../../../core/services/session.service';
import { Html5Qrcode } from 'html5-qrcode';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-scan-qr',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './scan-qr.component.html',
  styleUrls: ['./scan-qr.component.css']
})
export class ScanQrComponent implements OnInit, OnDestroy {
  currentUser: any = null;
  scanning = false;
  cameraActive = false;
  success = false;
  error = '';
  loading = true;
  activeSession: any = null;
  lastAttendance: any = null;

  private html5QrCode: Html5Qrcode | null = null;

  constructor(
    private attendanceService: AttendanceService,
    private authService: AuthService,
    private sessionService: SessionService,
    private notify: NotificationService
  ) { }

  async ngOnInit() {
    this.currentUser = this.authService.getCurrentUser();
    await Promise.all([
      this.loadActiveSession(),
      this.loadLastAttendance()
    ]);
  }

  ngOnDestroy() {
    this.stopScanner();
  }

  async loadActiveSession() {
    try {
      const sessions = await this.sessionService.getActiveSessions();
      // Filter sessions for student's classroom (if info available in currentUser)
      // For now, take the first active one or matching classroomId
      this.activeSession = sessions.find(s => s.classRoomId === this.currentUser?.classRoomId) || sessions[0];
    } catch { }
  }

  async loadLastAttendance() {
    try {
      if (this.currentUser) {
        const stats: any = await this.attendanceService.getMyStats().catch(() => null);
        this.lastAttendance = stats;
      }
    } finally {
      this.loading = false;
    }
  }

  async toggleScanner() {
    if (this.cameraActive) {
      this.stopScanner();
    } else {
      this.startScanner();
    }
  }

  async startScanner() {
    this.error = '';
    this.success = false;
    this.cameraActive = true;

    setTimeout(() => {
      this.html5QrCode = new Html5Qrcode("reader");
      const config = { fps: 10, qrbox: { width: 250, height: 250 } };

      this.html5QrCode.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          this.onQrScanned(decodedText);
          this.stopScanner();
        },
        (errorMessage) => {
          // ignore scan errors
        }
      ).catch(err => {
        this.error = "فشل فتح الكاميرا: تأكد من إعطاء الصلاحية";
        this.cameraActive = false;
      });
    }, 100);
  }

  async stopScanner() {
    if (this.html5QrCode) {
      try {
        await this.html5QrCode.stop();
        this.html5QrCode.clear();
      } catch (err) { }
      this.html5QrCode = null;
    }
    this.cameraActive = false;
  }

  async onQrScanned(qrToken: string) {
    this.scanning = true;
    this.error = '';
    try {
      await this.attendanceService.markQR({
        qrToken,
        deviceId: this.getDeviceId()
      });
      this.success = true;
      this.notify.success('تم تسجيل حضورك بنجاح!');
      await this.loadLastAttendance();
    } catch (err: any) {
      this.error = err?.error?.message || err?.message || 'رمز QR غير صحيح أو منتهي الصلاحية';
      this.notify.error(this.error);
    } finally {
      this.scanning = false;
    }
  }

  private getDeviceId(): string {
    let id = localStorage.getItem('device_id');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('device_id', id);
    }
    return id;
  }
}