import { Component, OnInit, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { SignalRService } from '../../../core/services/signalr.service';
import { User } from '../../../core/models/user.model';
import { RouterModule, Router } from '@angular/router';
import { ThemeService } from '../../../core/services/theme.service';

interface SearchResult {
  label: string;
  sublabel?: string;
  icon: string;
  iconColor: string;
  route: string;
  category: string;
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnInit {
  currentUser: User | null = null;
  showNotifications = false;
  showProfileMenu = false;
  unreadCount = 0;
  isDarkMode = false;
  notifications: any[] = [];

  // Search
  searchQuery = '';
  searchResults: SearchResult[] = [];
  showSearchResults = false;
  selectedIndex = -1;
  private searchTimer: any;

  // Static searchable pages index
  private readonly pages: SearchResult[] = [
    { label: 'لوحة التحكم', sublabel: 'الإحصائيات العامة', icon: 'fa-tachometer-alt', iconColor: '#6366f1', route: '/admin/dashboard', category: 'صفحات' },
    { label: 'إدارة الطلاب', sublabel: 'عرض وإدارة الطلاب', icon: 'fa-user-graduate', iconColor: '#3b82f6', route: '/admin/students', category: 'صفحات' },
    { label: 'إدارة المدرسين', sublabel: 'عرض وإدارة المدرسين', icon: 'fa-chalkboard-teacher', iconColor: '#10b981', route: '/admin/teachers', category: 'صفحات' },
    { label: 'إدارة أولياء الأمور', sublabel: 'عرض وإدارة أولياء الأمور', icon: 'fa-users', iconColor: '#f59e0b', route: '/admin/parents', category: 'صفحات' },
    { label: 'المستويات الدراسية', sublabel: 'إدارة الصفوف والمراحل', icon: 'fa-layer-group', iconColor: '#8b5cf6', route: '/admin/grades', category: 'صفحات' },
    { label: 'الفصول الدراسية', sublabel: 'إدارة الفصول النشطة', icon: 'fa-school', iconColor: '#06b6d4', route: '/admin/classes', category: 'صفحات' },
    { label: 'إدارة المواد', sublabel: 'المناهج الدراسية', icon: 'fa-book', iconColor: '#ec4899', route: '/admin/subjects', category: 'صفحات' },
    { label: 'الجدول الدراسي', sublabel: 'جدولة الحصص', icon: 'fa-calendar-alt', iconColor: '#f97316', route: '/admin/timetable', category: 'صفحات' },
    { label: 'التقارير', sublabel: 'تقارير الحضور والأداء', icon: 'fa-chart-bar', iconColor: '#14b8a6', route: '/admin/reports', category: 'صفحات' },
  ];

  constructor(
    private authService: AuthService,
    private signalR: SignalRService,
    private router: Router,
    private eRef: ElementRef,
    public themeService: ThemeService
  ) { }

  @HostListener('document:click', ['$event'])
  clickout(event: Event) {
    if (!this.eRef.nativeElement.contains(event.target)) {
      this.showNotifications = false;
      this.showProfileMenu = false;
      this.showSearchResults = false;
    }
  }

  async ngOnInit() {
    this.themeService.isDarkMode$.subscribe(isDark => {
      this.isDarkMode = isDark;
    });

    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (user) {
        this.signalR.startConnection();
      }
    });

    this.signalR.notification$.subscribe(notif => {
      if (notif.type === 'message') {
        if (!this.router.url.includes('/chat')) {
          this.unreadCount++;
          this.notifications.unshift({
            title: 'رسالة جديدة',
            content: notif.data.content,
            time: new Date(),
            type: 'message'
          });
        }
      } else {
        this.notifications.unshift({
          title: notif.data.title || 'تنبیه',
          content: notif.data.content,
          time: new Date(),
          type: 'general'
        });
      }
    });
  }

  onSearchInput() {
    this.selectedIndex = -1;
    if (!this.searchQuery || !this.searchQuery.trim()) {
      this.searchResults = [];
      this.showSearchResults = false;
      return;
    }
    this.runSearch();
  }

  onSearchFocus() {
    if (this.searchQuery && this.searchQuery.trim() && this.searchResults.length > 0) {
      this.showSearchResults = true;
    }
  }

  onSearchKeydown(event: KeyboardEvent) {
    if (!this.showSearchResults || this.searchResults.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.selectedIndex = Math.min(this.selectedIndex + 1, this.searchResults.length - 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const target = this.selectedIndex >= 0
        ? this.searchResults[this.selectedIndex]
        : this.searchResults[0];
      if (target) this.navigateTo(target);
    } else if (event.key === 'Escape') {
      this.showSearchResults = false;
      this.searchQuery = '';
      this.searchResults = [];
    }
  }

  runSearch() {
    const q = (this.searchQuery || '').trim().toLowerCase();
    if (!q) { this.searchResults = []; this.showSearchResults = false; return; }

    const results: SearchResult[] = this.pages.filter(p =>
      p.label.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      (p.sublabel ? p.sublabel.toLowerCase().includes(q) : false)
    );

    this.searchResults = results.slice(0, 7);
    this.showSearchResults = this.searchResults.length > 0;
  }

  navigateTo(result: SearchResult) {
    this.router.navigateByUrl(result.route);
    this.searchQuery = '';
    this.searchResults = [];
    this.showSearchResults = false;
    this.selectedIndex = -1;
  }

  clearSearch() {
    this.searchQuery = '';
    this.searchResults = [];
    this.showSearchResults = false;
    this.selectedIndex = -1;
  }
  // ─────────────────────────────────────────────────────────

  getRoleText(role: string): string {
    const roles: { [key: string]: string } = {
      'Admin': 'مدير النظام',
      'Teacher': 'مدرس',
      'Student': 'طالب',
      'Parent': 'ولي أمر'
    };
    return roles[role] || role;
  }

  toggleNotifications(event: Event) {
    event.stopPropagation();
    this.showNotifications = !this.showNotifications;
    this.showProfileMenu = false;
  }

  toggleProfileMenu(event: Event) {
    event.stopPropagation();
    this.showProfileMenu = !this.showProfileMenu;
    this.showNotifications = false;
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }

  logout() {
    this.authService.logout();
    this.showProfileMenu = false;
  }
}
