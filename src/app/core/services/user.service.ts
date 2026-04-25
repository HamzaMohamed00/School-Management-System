import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  constructor(private api: ApiService) {}

  async getCurrentUser(): Promise<User> {
    return this.api.get<User>('/api/Account/profile');
  }

  async updateProfile(data: any): Promise<void> {
    return this.api.put('/api/Account/profile', data);
  }

  async uploadProfileImage(file: File): Promise<void> {
    const formData = new FormData();
    formData.append('image', file);
    return this.api.upload('/api/Account/profile/image', file);
  }

  async getUsers(): Promise<User[]> {
    return this.api.get<User[]>('/api/Users');
  }
}
