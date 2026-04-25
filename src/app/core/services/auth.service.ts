// core/services/auth.service.ts
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { ApiService } from './api.service';
import { StorageService } from './storage.service';
import { User } from '../models/user.model';

interface LoginResponse {
  token: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private api: ApiService,
    private storage: StorageService,
    private router: Router
  ) {
    this.loadStoredUser();
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────────

  private loadStoredUser(): void {
    const token = this.storage.getToken();
    if (token && !this.isTokenExpired(token)) {
      const user = this.decodeUserFromToken(token);
      this.currentUserSubject.next(user);
    } else {
      this.storage.clear();
    }
  }

  private isTokenExpired(token: string): boolean {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      const payload = JSON.parse(jsonPayload);
      if (!payload.exp) return false;
      return Date.now() >= payload.exp * 1000;
    } catch {
      return true;
    }
  }

  private decodeUserFromToken(token: string): User {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));

      const payload = JSON.parse(jsonPayload);
      console.log('[Auth] Decoded payload:', payload);

      const role =
        payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ||
        payload['role'] ||
        'User';

      const entityId = payload['EntityId'] || payload['entityId'];
      const id = payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] ||
                 payload['nameid'] ||
                 payload.sub ||
                 '';

      return {
        id,
        role,
        teacherId: role === 'Teacher' ? (entityId ? parseInt(entityId) : undefined) : undefined,
        studentId: role === 'Student' ? (entityId ? parseInt(entityId) : undefined) : undefined,
        parentId: role === 'Parent' ? (entityId ? parseInt(entityId) : undefined) : undefined,
        email:
          payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] ||
          payload['email'] ||
          '',
        fullName:
          payload['given_name'] ||
          payload['unique_name'] ||
          payload['name'] ||
          payload['FullName'] ||
          '',
        avatar: payload['Avatar'] || ''
      };
    } catch (err) {
      console.error('[Auth] Failed to decode token parts:', err);
      throw err;
    }
  }

  // ─── Public API ───────────────────────────────────────────────────────────────

  async login(credentials: { email: string; password: string }): Promise<User> {
    console.log('[Auth] Attempting login for:', credentials.email);
    const response = await this.api.post<LoginResponse>('/api/Account/login', credentials);
    console.log('[Auth] Login response received:', !!response.token ? 'Token present' : 'Token missing');

    if (!response.token) {
      throw new Error('No token received from server');
    }

    this.storage.setToken(response.token);

    try {
      const user = this.decodeUserFromToken(response.token);
      console.log('[Auth] User decoded successfully:', user.role);
      this.storage.setUser(user);
      this.currentUserSubject.next(user);
      return user;
    } catch (decodeErr) {
      console.error('[Auth] Token decoding failed:', decodeErr);
      throw decodeErr;
    }
  }

  logout(): void {
    this.storage.clear();
    this.currentUserSubject.next(null);
    this.router.navigate(['/auth/login']);
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  isAuthenticated(): boolean {
    const token = this.storage.getToken();
    return !!token && !this.isTokenExpired(token);
  }

  hasRole(role: string | string[]): boolean {
    const user = this.currentUserSubject.value;
    if (!user) return false;
    if (Array.isArray(role)) return role.includes(user.role);
    return user.role === role;
  }

  isAdmin(): boolean {
    return this.hasRole('Admin');
  }

  isTeacher(): boolean {
    return this.hasRole('Teacher');
  }

  isStudent(): boolean {
    return this.hasRole('Student');
  }

  isParent(): boolean {
    return this.hasRole('Parent');
  }

  getToken(): string | null {
    return this.storage.getToken();
  }

  updateLocalUser(data: Partial<User>): void {
    const current = this.currentUserSubject.value;
    if (current) {
      const updated = { ...current, ...data };
      this.storage.setUser(updated);
      this.currentUserSubject.next(updated);
    }
  }

  async changePassword(data: any): Promise<void> {
    return this.api.post('/api/Account/change-password', data);
  }
}