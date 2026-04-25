import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class ParentService {
  constructor(private api: ApiService) {}

  async getParents(): Promise<any[]> {
    return this.api.get('/api/Parents');
  }

  async getAll(): Promise<any[]> {
    return this.getParents();
  }

  async getParentProfile(): Promise<any> {
    return this.api.get('/api/Parents/profile-data');
  }

  async createParent(parent: any): Promise<number> {
    return this.api.post('/api/Parents', parent);
  }

  async updateParent(id: number, parent: any): Promise<boolean> {
    return this.api.put(`/api/Parents/${id}`, parent);
  }

  async deleteParent(id: number): Promise<boolean> {
    return this.api.delete(`/api/Parents/${id}`);
  }

  async linkStudents(parentId: number, studentIds: number[]): Promise<boolean> {
    return this.api.post('/api/Parents/link-children', { parentId, studentIds });
  }

  async getUpcomingEvents(): Promise<any[]> {
    return [
      { title: 'اجتماع أولياء الأمور', date: new Date(2026, 3, 10), time: '10:00 AM', description: 'مناقشة أداء الطلاب في الفصل الدراسي الثاني' },
      { title: 'يوم رياضي - فرع المعادي', date: new Date(2026, 3, 25), time: '08:30 AM', description: 'يوم ترفيهي لطلاب المرحلة الابتدائية' }
    ];
  }

  async getPendingPayments(): Promise<number> {
    return 4500; // Mock total due
  }

  async getFeeSummary(): Promise<any[]> {
    return [
      { id: 101, childName: 'عمر خالد', type: 'مصروفات دراسية', amount: 3500, status: 'pending', dueDate: '2026-05-01' },
      { id: 102, childName: 'عمر خالد', type: 'أنشطة رياضية', amount: 500, status: 'pending', dueDate: '2026-04-15' },
      { id: 103, childName: 'عمر خالد', type: 'باص المدرسة', amount: 500, status: 'pending', dueDate: '2026-04-30' }
    ];
  }

  async processPayment(feeIds: number[]): Promise<boolean> {
    // Simulated delay for premium feel
    return new Promise(resolve => setTimeout(() => resolve(true), 2000));
  }
}