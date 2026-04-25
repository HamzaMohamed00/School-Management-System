import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ParentService } from '../../../core/services/parent.service';
import { NotificationService } from '../../../core/services/notification.service';

export interface ChildSummary {
  id: number;
  fullName: string;
  avatar?: string;
  classRoomName?: string;
  gradeLevel?: string;
  attendanceRate: number;
  average?: number;
  absences?: number;
  recentGrades?: any[];
}

export interface Event {
  title: string;
  description: string;
  date: Date;
  time: string;
}

import { Router } from '@angular/router';

@Component({
  selector: 'app-parent-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './parent-dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class ParentDashboardComponent implements OnInit {
  today = new Date();
  children: ChildSummary[] = [];
  recentNotifications: any[] = [];
  upcomingEvents: Event[] = [];
  pendingPayments: number = 0;
  parentName: string = '';
  parentEmail: string = '';
  parentAddress: string = '';
  announcements: any[] = [];

  constructor(
    private parentService: ParentService,
    private notificationService: NotificationService,
    private router: Router
  ) { }

  async ngOnInit() {
    await this.loadDashboardData();
  }

  async loadDashboardData(): Promise<void> {
    try {
      const profile = await this.parentService.getParentProfile();
      if (profile) {
        this.parentName = profile.fullName;
        this.parentEmail = profile.email;
        this.parentAddress = profile.address;
        this.children = profile.children || [];
        this.pendingPayments = await this.parentService.getPendingPayments();
        this.upcomingEvents = await this.parentService.getUpcomingEvents();
      }
    } catch (error) {
      console.error('Error loading dashboard data', error);
    }
  }

  viewTimetable(studentId?: number) {
    const id = studentId || (this.children.length > 0 ? this.children[0].id : null);
    if (id) {
      this.router.navigate(['/student/timetable'], { queryParams: { studentId: id } });
    }
  }

  viewGrades(studentId: number) {
    this.router.navigate(['/student/grades'], { queryParams: { studentId: studentId } });
  }

  getAttendanceColor(rate: number): string {
    if (rate >= 90) return '#10B981';
    if (rate >= 75) return '#F59E0B';
    return '#EF4444';
  }
}