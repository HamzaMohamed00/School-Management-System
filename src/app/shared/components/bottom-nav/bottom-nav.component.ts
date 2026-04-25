import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './bottom-nav.component.html',
  styleUrls: ['./bottom-nav.component.css']
})
export class BottomNavComponent implements OnInit {
  isAuthenticated = false;
  userRole = '';
  showMenu = false;

  // Role-based route shortcuts
  dashboardRoute = '/';
  attendanceRoute: string | null = null;
  classesRoute: string | null = null;

  constructor(private authService: AuthService) { }

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.isAuthenticated = !!user;
      if (user) {
        this.userRole = user.role || '';
        this.setRoutes(this.userRole);
      }
    });
  }

  setRoutes(role: string) {
    switch (role) {
      case 'Admin':
        this.dashboardRoute = '/admin/dashboard';
        this.attendanceRoute = null;
        this.classesRoute = '/admin/students';
        break;
      case 'Teacher':
        this.dashboardRoute = '/teacher/dashboard';
        this.attendanceRoute = '/teacher/attendance';
        this.classesRoute = '/teacher/videos'; // Setting this to videos as it makes more sense with the new routes
        break;
      case 'Student':
        this.dashboardRoute = '/student/dashboard';
        this.attendanceRoute = '/student/attendance';
        this.classesRoute = '/student/timetable';
        break;
      case 'Parent':
        this.dashboardRoute = '/parent/dashboard';
        this.attendanceRoute = null;
        this.classesRoute = null;
        break;
      default:
        this.dashboardRoute = '/';
    }
  }

  toggleMenu() {
    this.showMenu = !this.showMenu;
  }

  logout() {
    this.showMenu = false;
    this.authService.logout();
  }
}
