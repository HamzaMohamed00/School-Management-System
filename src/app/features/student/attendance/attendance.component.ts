import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AttendanceService } from '../../../core/services/attendance.service';
import { Html5QrcodeScanner } from "html5-qrcode";
import { ViewChild, ElementRef, OnDestroy } from '@angular/core';

@Component({
  selector: 'app-attendance',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './attendance.component.html',
  styleUrls: ['./attendance.component.css']
})
export class AttendanceComponent implements OnInit, OnDestroy {
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;

  activeTab: 'qr' | 'face' = 'qr'; // Default to QR first
  loading = false;
  successMsg = '';
  errorMsg = '';
  
  // Step Logic
  step: 'qr' | 'face' = 'qr';
  qrScanner: any;
  sessionId: number | null = null;
  
  // Camera Logic
  isCameraOn = false;
  stream: MediaStream | null = null;
  isScanning = false;

  constructor(private attendanceService: AttendanceService) { }

  ngOnInit(): void {
    this.initQRScanner();
  }

  ngOnDestroy() {
    this.stopCamera();
    if (this.qrScanner) {
      this.qrScanner.clear();
    }
  }

  setTab(tab: 'qr' | 'face') {
    this.activeTab = tab;
    this.successMsg = '';
    this.errorMsg = '';
    
    if (tab === 'qr') {
      this.stopCamera();
      setTimeout(() => this.initQRScanner(), 100);
    } else {
      if (this.qrScanner) this.qrScanner.clear();
    }
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
      let sessionId: number | null = null;
      let timestamp: number | null = null;

      // 1. Try decoding as JSON (Legacy/Special cases)
      try {
        const data = JSON.parse(dataStr);
        sessionId = data.sessionId;
        timestamp = data.timestamp;
      } catch {
        // 2. Try decoding as Base64 (Backend format: sessionId:timestamp|signature)
        try {
          const decoded = atob(dataStr);
          const [payload] = decoded.split('|');
          const [idStr, tsStr] = payload.split(':');
          sessionId = parseInt(idStr);
          timestamp = parseInt(tsStr);
        } catch {
          throw new Error('Format unknown');
        }
      }

      if (sessionId && timestamp && !isNaN(sessionId) && !isNaN(timestamp)) {
        const currentTS = Math.floor(Date.now() / 1000); // Seconds
        // Match backend 30s window + some allowance for network/client lag
        if (Math.abs(currentTS - timestamp) <= 60) {
          this.sessionId = sessionId;
          this.successMsg = 'تم مسح الكود بنجاح! يرجى التحقق من الوجه الآن.';
          this.setTab('face');
          this.startCamera();
        } else {
          this.errorMsg = 'كود الـ QR منتهي الصلاحية، يرجى المسح مرة أخرى.';
        }
      }
    } catch (e) {
      this.errorMsg = 'كود غير صالح، يرجى مسح كود المعلم الصحيح.';
    }
  }

  async startCamera() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (this.videoElement) {
        this.videoElement.nativeElement.srcObject = this.stream;
      }
      this.isCameraOn = true;
    } catch (err) {
      this.errorMsg = 'لا يمكن الوصول للكاميرا.';
    }
  }

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    this.isCameraOn = false;
  }

  async captureFace() {
    if (!this.videoElement || !this.canvasElement) return;
    
    this.loading = true;
    this.successMsg = '';
    this.errorMsg = '';
    
    const video = this.videoElement.nativeElement;
    const canvas = this.canvasElement.nativeElement;
    canvas.width = 320;
    canvas.height = 320;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, 320, 320);
    
    try {
      const blob = await new Promise<Blob>((res, rej) => {
        canvas.toBlob(b => b ? res(b) : rej(), 'image/jpeg', 0.9);
      });
      
      const formData = new FormData();
      formData.append('file', blob, 'face.jpg');
      
      // 1. Call Local Face ID API (Python)
      let result: any;
      try {
        const response = await fetch('http://127.0.0.1:8080/scan', {
          method: 'POST',
          body: formData
        });
        result = await response.json();
      } catch (e) {
        this.errorMsg = 'عفواً، لم نتمكن من الوصول لخادم التعرف على الوجه (Face Service). يرجى التأكد من تشغيل الخدمة.';
        this.loading = false;
        return;
      }
      
      if (result.result && result.result !== 'no face detected' && result.result !== 'Unknown') {
        const recognizedName = result.result;
        
        // 2. Mark attendance in Main Backend
        if (this.sessionId && !this.sessionId.toString().startsWith('manual-')) {
          try {
            const mainFile = new File([blob], 'face.jpg', { type: 'image/jpeg' });
            const result: any = await this.attendanceService.markFace(this.sessionId as any, mainFile);
            if (result && result.success) {
                const welcomeMsg = recognizedName ? `أهلاً بك يا ${recognizedName}!` : 'تم التعرف عليك بنجاح!';
                this.successMsg = `${welcomeMsg} تم تسجيل حضورك في نظام المدرسة.`;
            } else {
                this.errorMsg = result?.message || 'عفواً، فشل تسجيل الحضور. يرجى المحاولة مرة أخرى.';
            }
          } catch (err: any) {
            console.error('Main Backend Error:', err);
            // Try to extract error message from response if available (400 Bad Request)
            const backendError = err?.error?.message || err?.message || 'عفواً، فشل الاتصال بالسيرفر الرئيسي.';
            this.errorMsg = backendError;
            this.successMsg = '';
          }
        } else {
          // For manual sessions, we just show local success
          this.successMsg = `تم التعرف عليك بنجاح: ${recognizedName}. (حصة يدوية)`;
        }
      } else {
        this.errorMsg = result.result === 'no face detected' ? 'لم يتم العثور على وجه.' : 'لم يتم التعرف على الوجه، حاول مرة أخرى.';
      }
    } catch (err) {
      this.errorMsg = 'حدث خطأ غير متوقع أثناء العملية.';
      console.error(err);
    } finally {
      this.loading = false;
    }
  }
}
