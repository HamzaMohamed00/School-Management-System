import { Component, OnDestroy, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AttendanceService } from '../../../core/services/attendance.service';
import { SessionService } from '../../../core/services/session.service';
import { AuthService } from '../../../core/services/auth.service';
import { TeacherService } from '../../../core/services/teacher.service';
import { DashboardService } from '../../../core/services/dashboard.service';
import { ApiService } from '../../../core/services/api.service';
import { Html5QrcodeScanner } from "html5-qrcode";

@Component({
  selector: 'app-face-attendance',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container-fluid py-4" dir="rtl">
        <div class="row justify-content-center">
            <div class="col-12 col-md-10 col-lg-8">
                <div class="card border-0 rounded-4 shadow-sm">
                    <div class="card-header bg-transparent border-bottom p-4 d-flex align-items-center gap-3">
                        <div class="icon-circle bg-primary-soft text-primary">
                            <i class="fas fa-id-card-clip fs-4"></i>
                        </div>
                        <div>
                            <h5 class="fw-bold mb-1">تسجيل الحضور الذكي</h5>
                            <small class="text-muted">{{ step === 'qr' ? 'الخطوة 1: امسح كود المعلم' : 'الخطوة 2: تحقق من الوجه' }}</small>
                        </div>
                    </div>

                    <div class="card-body p-4">
                        <!-- Step 1: QR Scanning -->
                        <div *ngIf="step === 'qr'">
                            <div class="text-center mb-4">
                                <div id="reader" style="width: 100%; max-width: 500px; margin: 0 auto; border-radius: 1rem; overflow: hidden;"></div>
                                <p class="mt-3 text-muted">قم بتوجيه الكاميرا نحو كود الـ QR الخاص بالمعلم</p>
                            </div>
                        </div>

                        <!-- Step 2: Face Recognition -->
                        <div *ngIf="step === 'face'" class="text-center">
                            <div class="mb-3 text-start">
                                <span class="badge bg-success-soft text-success px-3 py-2 fs-6">
                                    <i class="fas fa-check-circle me-1"></i> تم التحقق من الكود
                                </span>
                            </div>

                            <div class="video-placeholder rounded-4 position-relative overflow-hidden mb-4 mx-auto" [class.scanning]="isScanning" style="max-width: 600px;">
                                <div *ngIf="!isCameraOn" class="w-100 h-100 d-flex flex-column align-items-center justify-content-center bg-light text-muted" style="min-height: 400px;">
                                    <i class="fas fa-video-slash" style="font-size: 4rem; opacity: 0.5;"></i>
                                    <p class="mt-3 mb-0 fw-bold">الكاميرا مغلقة</p>
                                    <small>اضغط على "فتح الكاميرا" للمطابقة</small>
                                </div>
                                
                                <video #videoElement [hidden]="!isCameraOn" autoplay playsinline class="w-100 h-100 position-absolute top-0 start-0 z-1" style="object-fit: cover;"></video>
                                <canvas #canvasElement style="display: none;"></canvas>
                                
                                <div *ngIf="isCameraOn" class="face-frame position-absolute top-50 start-50 translate-middle z-2"></div>
                                <div *ngIf="isScanning" class="scan-line position-absolute w-100 start-0 z-3"></div>
                            </div>

                            <div *ngIf="isScanning" class="d-flex align-items-center justify-content-center gap-2 mb-3 text-info fade-in">
                                <span class="spinner-border spinner-border-sm" role="status"></span>
                                <span class="fw-bold">جاري مطابقة ملامح الوجه...</span>
                            </div>

                            <!-- Recognized Student Info -->
                            <div *ngIf="recognizedStudent" class="alert alert-success border-0 fade-in mx-auto d-flex align-items-center gap-3 justify-content-center" style="max-width: 600px;">
                                <img [src]="'https://ui-avatars.com/api/?name=' + recognizedStudent.name + '&background=10b981&color=fff'" class="rounded-circle" width="50" height="50">
                                <div class="text-start">
                                    <h6 class="mb-0 fw-bold">{{ recognizedStudent.name }}</h6>
                                    <small class="text-muted">تم تسجيل الحضور بنجاح</small>
                                </div>
                                <i class="fas fa-check-circle text-success fs-3"></i>
                            </div>

                            <!-- Status Alert -->
                            <div class="alert fw-bold mb-0 border-0 fade-in mx-auto" style="max-width: 600px;"
                                 [ngClass]="{
                                    'alert-secondary': scanResult === 'none' && !isCameraOn,
                                    'alert-info bg-info text-white bg-opacity-10': scanResult === 'none' && isCameraOn && !isScanning,
                                    'alert-success bg-success text-white bg-opacity-10': scanResult === 'success',
                                    'alert-danger bg-danger text-white bg-opacity-10': scanResult === 'error'
                                 }">
                                <i class="fas me-2" [ngClass]="{
                                    'fa-info-circle': scanResult === 'none',
                                    'fa-check-circle': scanResult === 'success',
                                    'fa-times-circle': scanResult === 'error'
                                }"></i>
                                {{ statusMessage }}
                            </div>
                        </div>
                    </div>

                    <div class="card-footer bg-transparent border-top p-4 d-flex justify-content-between gap-3 flex-wrap" *ngIf="step === 'face'">
                        <button class="btn btn-outline-danger px-4 rounded-3 fw-bold" (click)="toggleCamera()">
                            <i class="fas me-2" [ngClass]="isCameraOn ? 'fa-video-slash' : 'fa-video'"></i>
                            {{ isCameraOn ? 'إغلاق الكاميرا' : 'فتح الكاميرا' }}
                        </button>
                        <button class="btn btn-primary px-5 rounded-3 fw-bold" [disabled]="!isCameraOn || isScanning" (click)="captureAndScan()">
                                <i class="fas fa-expand me-2"></i>
                                مطابقة الوجه الآن
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
  `,
  styles: [`
    .icon-circle {
        width: 50px;
        height: 50px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .bg-primary-soft { background-color: rgba(13, 110, 253, 0.1); }
    .bg-success-soft { background-color: rgba(16, 185, 129, 0.1); }
    
    .video-placeholder {
        min-height: 400px;
        background-color: #f8f9fa;
        border: 2px dashed #cbd5e1;
    }
    
    .video-placeholder.scanning {
        border-color: #0dcaf0;
        box-shadow: 0 0 15px rgba(13, 202, 240, 0.2);
    }
    
    .face-frame {
        width: 220px;
        height: 280px;
        border: 3px dashed rgba(255, 255, 255, 0.8);
        border-radius: 40%;
        box-shadow: 0 0 0 4000px rgba(0, 0, 0, 0.4);
        pointer-events: none;
    }
    
    .scan-line {
        height: 4px;
        background: #0dcaf0;
        box-shadow: 0 0 10px #0dcaf0, 0 0 20px #0dcaf0;
        animation: scan 2.5s infinite linear;
    }
    
    @keyframes scan {
        0% { top: 0; opacity: 0; }
        10% { opacity: 1; }
        90% { opacity: 1; }
        100% { top: 100%; opacity: 0; }
    }

    .fade-in {
        animation: fadeIn 0.3s ease-in-out;
    }
    
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(5px); }
        to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class FaceAttendanceComponent implements OnInit, OnDestroy {
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;

  isCameraOn = false;
  isScanning = false;
  scanResult: 'none' | 'success' | 'error' = 'none';
  statusMessage = 'الكاميرا مغلقة';
  stream: MediaStream | null = null;

  sessions: any[] = [];
  teacherId: number | null = null;
  selectedSessionId: number | null = null;
  recognizedStudent: any = null;
  attendanceLog: any[] = [];

  step: 'qr' | 'face' = 'qr';
  qrScanner: any;

  constructor(
    private attendanceService: AttendanceService,
    private sessionService: SessionService,
    private authService: AuthService,
    private teacherService: TeacherService,
    private dashboardService: DashboardService,
    private api: ApiService
  ) { }

  async ngOnInit() {
    await this.discoverTeacherId();
    // await this.loadSessions(); // We now get sessionId from QR
    this.initQRScanner();
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

  ngOnDestroy(): void {
    this.stopCamera();
    if (this.qrScanner) {
      this.qrScanner.clear();
    }
  }

  async loadSessions() {
    if (!this.teacherId) return;
    try {
      const res = await this.sessionService.getTeacherSessions(this.teacherId);
      this.sessions = Array.isArray(res) ? res : (res as any)?.data || [];
    } catch {
      this.sessions = [];
    }
  }

  getSelectedSessionLabel(): string {
    const s = this.sessions.find(s => s.id === this.selectedSessionId);
    return s ? `${s.subjectName} - ${s.classRoomName} (سكشن ${s.sectionNo})` : '';
  }

  initQRScanner() {
    this.qrScanner = new Html5QrcodeScanner("reader", { 
      fps: 10, 
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0
    }, false);

    this.qrScanner.render((decodedText: string) => {
      this.onQRCodeScanned(decodedText);
    }, (error: any) => {
      // ignore
    });
  }

  onQRCodeScanned(dataStr: string) {
    try {
      const data = JSON.parse(dataStr);
      if (data.sessionId && data.timestamp) {
        // Validate timestamp (must be within last 10 seconds due to 5s rotation + network/user latency)
        const currentTS = Math.floor(Date.now() / 5000);
        if (Math.abs(currentTS - data.timestamp) <= 2) {
          this.selectedSessionId = data.sessionId;
          this.step = 'face';
          if (this.qrScanner) {
            this.qrScanner.clear();
          }
          // Start camera automatically for face step
          this.startCamera();
        } else {
          console.warn("QR Code expired");
        }
      }
    } catch (e) {
      console.error("Invalid QR content");
    }
  }

  async toggleCamera() {
    if (this.isCameraOn) {
      this.stopCamera();
    } else {
      await this.startCamera();
    }
  }

  async startCamera() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (this.videoElement && this.videoElement.nativeElement) {
        this.videoElement.nativeElement.srcObject = this.stream;
      }
      this.isCameraOn = true;
      this.statusMessage = 'يرجى النظر للكاميرا والضغط على "تعرف الآن"';
      this.scanResult = 'none';
      this.recognizedStudent = null;
    } catch (error) {
      console.error('Error accessing camera:', error);
      this.statusMessage = 'لا يمكن الوصول للكاميرا، يرجى التحقق من الصلاحيات.';
      this.scanResult = 'error';
    }
  }

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    this.isCameraOn = false;
    this.statusMessage = 'الكاميرا مغلقة';
    this.scanResult = 'none';
  }

  async captureAndScan() {
    if (!this.isCameraOn || !this.videoElement || !this.canvasElement || !this.selectedSessionId) return;

    this.isScanning = true;
    this.statusMessage = 'جاري تحليل الوجه...';
    this.scanResult = 'none';
    this.recognizedStudent = null;

    // Draw video frame to canvas
    const video = this.videoElement.nativeElement;
    const canvas = this.canvasElement.nativeElement;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext('2d');
    if (!context) {
      this.isScanning = false;
      this.scanResult = 'error';
      this.statusMessage = 'خطأ في التقاط الصورة';
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to Blob and upload to backend
    try {
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(b => b ? resolve(b) : reject('Failed to capture'), 'image/jpeg', 0.85);
      });

      const file = new File([blob], 'face-capture.jpg', { type: 'image/jpeg' });

      const result: any = await this.attendanceService.markFace(this.selectedSessionId!, file);

      this.isScanning = false;

      if (result && (result.success || result.studentName || result.recognized)) {
        this.scanResult = 'success';
        this.statusMessage = 'تم التحقق بنجاح! تم تسجيل الحضور.';
        this.recognizedStudent = {
          name: result.studentName || result.name || 'طالب',
          id: result.studentId || result.id
        };
        // Add to log
        this.attendanceLog.unshift({
          name: this.recognizedStudent.name,
          time: new Date()
        });
      } else {
        this.scanResult = 'error';
        this.statusMessage = result?.message || 'لم يتم التعرف على الوجه، يرجى المحاولة مرة أخرى.';
      }
    } catch (err: any) {
      this.isScanning = false;
      this.scanResult = 'error';
      this.statusMessage = err?.message || 'حدث خطأ أثناء الاتصال بالخادم، يرجى المحاولة مرة أخرى.';
      console.error('Face scan error:', err);
    }
  }
}
