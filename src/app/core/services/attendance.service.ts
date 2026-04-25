// core/services/attendance.service.ts
import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class AttendanceService {
  constructor(private api: ApiService) { }

  async generateQr(sessionId: number): Promise<any> {
    return this.api.get(`/api/Attendance/generate-qr/${sessionId}`);
  }

  async markManual(data: any): Promise<any> {
    return this.api.post('/api/Attendance/scan-qr', data);
  }

  async markQR(data: any): Promise<any> {
    return this.api.post('/api/Attendance/scan-qr', data);
  }

  async markFace(sessionId: number, image: File): Promise<any> {
    return this.api.upload(`/api/Attendance/face/${sessionId}`, image);
  }

  async getSessionAttendance(sessionId: number): Promise<any> {
    return this.api.get(`/api/Attendance/session/${sessionId}`);
  }

  async getStudentAttendance(studentId: number): Promise<any> {
    return this.api.get(`/api/Attendance/student/${studentId}`);
  }

  async getStudentStats(studentId: number): Promise<any> {
    return this.api.get(`/api/Attendance/student/${studentId}/stats`);
  }

  async getMyStats(): Promise<any> {
    return this.api.get('/api/Attendance/student/me/stats');
  }
}