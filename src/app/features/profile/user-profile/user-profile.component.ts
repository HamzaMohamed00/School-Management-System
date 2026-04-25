import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.css']
})
export class UserProfileComponent implements OnInit {
  profileForm!: FormGroup;
  passwordForm!: FormGroup;
  currentUser: any = null;
  loading = false;
  saveSuccess = false;
  error = '';

  constructor(
    private authService: AuthService,
    private api: ApiService,
    private fb: FormBuilder
  ) { }

  ngOnInit() {
    this.currentUser = this.authService.getCurrentUser();

    this.profileForm = this.fb.group({
      fullName: [this.currentUser?.fullName || '', Validators.required],
      email: [this.currentUser?.email || '', [Validators.required, Validators.email]],
      phone: ['']
    });

    this.passwordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    });
  }

  get userInitial(): string {
    return (this.currentUser?.fullName || this.currentUser?.email || '?')[0].toUpperCase();
  }

  getRoleText(role: string): string {
    if (!role) return '';
    const roles: { [key: string]: string } = {
      'Admin': 'مدير النظام',
      'Teacher': 'مدرس',
      'Student': 'طالب',
      'Parent': 'ولي أمر'
    };
    return roles[role] || role;
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        this.error = 'يرجى اختيار ملف صورة صالح';
        return;
      }
      
      this.loading = true;
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = reader.result as string;
          
          // Call real API
          const response: any = await this.api.post('/api/Account/update-avatar', JSON.stringify(base64));
          const avatarUrl = response?.avatarUrl || base64;

          // Update UI and local storage
          this.currentUser.avatar = avatarUrl;
          this.authService.updateLocalUser({ avatar: avatarUrl });
          
          this.saveSuccess = true;
          setTimeout(() => this.saveSuccess = false, 3000);
        } catch (err) {
          console.error('Avatar update error:', err);
          this.error = 'فشل في تحديث الصورة على الخادم';
        } finally {
          this.loading = false;
        }
      };
      reader.readAsDataURL(file);
    }
  }

  async saveProfile() {
    if (this.profileForm.invalid) return;
    this.loading = true;
    this.error = '';
    try {
      // Will wire to a PUT /api/Account/profile endpoint when available
      const updatedData = this.profileForm.value;
      await new Promise(res => setTimeout(res, 600)); // optimistic UI
      
      this.currentUser = { ...this.currentUser, ...updatedData };
      this.authService.updateLocalUser(updatedData);
      
      this.saveSuccess = true;
      setTimeout(() => this.saveSuccess = false, 3000);
    } catch (err: any) {
      this.error = err?.message || 'حدث خطأ أثناء الحفظ';
    } finally {
      this.loading = false;
    }
  }

  async changePassword() {
    const { newPassword, confirmPassword } = this.passwordForm.value;
    if (newPassword !== confirmPassword) {
      this.error = 'كلمة المرور الجديدة غير متطابقة';
      return;
    }
    if (this.passwordForm.invalid) return;
    this.loading = true;
    this.error = '';
    try {
      // Will wire to PUT /api/Account/change-password when available
      await new Promise(res => setTimeout(res, 600));
      this.saveSuccess = true;
      this.passwordForm.reset();
      setTimeout(() => this.saveSuccess = false, 3000);
    } catch (err: any) {
      this.error = err?.message || 'حدث خطأ أثناء تغيير كلمة المرور';
    } finally {
      this.loading = false;
    }
  }
}
