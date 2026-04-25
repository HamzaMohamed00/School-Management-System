// core/services/session.service.ts
import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Session } from '../models/session.model';

@Injectable({
  providedIn: 'root'
})
export class SessionService {
  constructor(private api: ApiService) { }

  async getActiveSessions(): Promise<Session[]> {
    return this.api.get<Session[]>('/api/Sessions/active');
  }

  async getAllSessions(): Promise<Session[]> {
    return this.api.get<Session[]>('/api/Sessions');
  }

  async getTeacherSessions(teacherId: number): Promise<Session[]> {
    return this.api.get<Session[]>(`/api/Sessions/teacher/${teacherId}`);
  }

  async getSessionById(id: number): Promise<Session> {
    return this.api.get<Session>(`/api/Sessions/${id}`);
  }

  async getStudentSessions(studentId: number): Promise<Session[]> {
    return this.api.get<Session[]>(`/api/Sessions/student/${studentId}`);
  }

  async getClassSessions(classId: number): Promise<Session[]> {
    return this.api.get<Session[]>(`/api/Sessions/class/${classId}`);
  }

  async createSession(data: any): Promise<Session> {
    return this.api.post<Session>('/api/Sessions', data);
  }

  async getQRCode(sessionId: number): Promise<{ qrCode: string }> {
    return this.api.get<{ qrCode: string }>(`/api/Sessions/${sessionId}/qr`);
  }

  async refreshQRCode(sessionId: number): Promise<{ qrCode: string }> {
    return this.api.post<{ qrCode: string }>(`/api/Sessions/${sessionId}/refresh-qr`, {});
  }

  async activateSession(sessionId: number): Promise<void> {
    return this.api.post(`/api/Sessions/${sessionId}/activate`, {});
  }

  async deactivateSession(sessionId: number): Promise<void> {
    return this.api.post(`/api/Sessions/${sessionId}/deactivate`, {});
  }

  async deleteSession(id: number): Promise<void> {
    return this.api.delete(`/api/Sessions/${id}`);
  }

  async updateSession(id: number, data: any): Promise<void> {
    return this.api.put(`/api/Sessions/${id}`, data);
  }
}