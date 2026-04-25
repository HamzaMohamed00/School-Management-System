import { Injectable } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  constructor(
    private toastr: ToastrService,
    private api: ApiService
  ) { }

  success(message: string, title: string = 'نجاح') {
    this.toastr.success(message, title);
  }

  error(message: string, title: string = 'خطأ') {
    this.toastr.error(message, title);
  }

  warning(message: string, title: string = 'تنبيه') {
    this.toastr.warning(message, title);
  }

  info(message: string, title: string = 'معلومات') {
    this.toastr.info(message, title);
  }

  async getNotifications(page: number, pageSize: number): Promise<any> {
    return this.api.get('/api/Notifications', { page, pageSize });
  }

  async markAsRead(id: number): Promise<void> {
    return this.api.post(`/api/Notifications/${id}/read`, {});
  }

  async markAllAsRead(): Promise<void> {
    return this.api.post('/api/Notifications/read-all', {});
  }

  async deleteNotification(id: number): Promise<void> {
    return this.api.delete(`/api/Notifications/${id}`);
  }
}