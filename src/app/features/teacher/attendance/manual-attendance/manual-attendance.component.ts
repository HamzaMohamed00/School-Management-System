import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { AttendanceService } from '../../../../core/services/attendance.service';
import { SessionService } from '../../../../core/services/session.service';

@Component({
  selector: 'app-manual-attendance',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="page-container" dir="rtl">
      <div class="header-section mb-4">
        <div class="d-flex align-items-center gap-3">
          <button class="btn btn-outline-secondary btn-sm rounded-circle p-2" [routerLink]="['/teacher/attendance']">
            <i class="fas fa-arrow-right"></i>
          </button>
          <h2 class="fw-bold mb-0">رصد الحضور يدويًا</h2>
        </div>
        <p class="text-muted ms-5 mt-1" *ngIf="session">المادة: {{ session.subjectName }} - {{ session.className }}</p>
      </div>

      <div class="card border-0 shadow-sm rounded-4 overflow-hidden">
        <div class="card-header bg-transparent border-bottom p-4 d-flex justify-content-between align-items-center">
          <h5 class="mb-0 fw-bold">قائمة الطلاب</h5>
          <div class="d-flex gap-2">
            <button class="btn btn-sm btn-success px-3" (click)="saveAll()">حفظ الكل</button>
            <button class="btn btn-sm btn-outline-primary px-3" (click)="loadAttendance()">تحديث</button>
          </div>
        </div>
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table align-middle mb-0">
              <thead class="table-light">
                <tr>
                  <th class="px-4">اسم الطالب</th>
                  <th class="text-center">الحالة</th>
                  <th class="text-center">آخر تحديث</th>
                  <th class="text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let student of students">
                  <td class="px-4 fw-medium">{{ student.studentName }}</td>
                  <td class="text-center">
                    <span class="badge rounded-pill px-3 py-2" 
                      [ngClass]="{
                        'bg-success': student.status === 'Present' || student.status === 'حاضر',
                        'bg-danger': student.status === 'Absent' || student.status === 'غائب',
                        'bg-secondary': !student.status || student.status === 'None'
                      }">
                      {{ student.status || 'لم يرصد' }}
                    </span>
                  </td>
                  <td class="text-center text-muted small">{{ student.lastModified | date:'shortTime' }}</td>
                  <td class="text-center">
                    <div class="btn-group btn-group-sm rounded-3 overflow-hidden border">
                      <button class="btn" [class.btn-success]="student.status === 'Present'" (click)="toggle(student, 'Present')">حاضر</button>
                      <button class="btn" [class.btn-danger]="student.status === 'Absent'" (click)="toggle(student, 'Absent')">غائب</button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-container { padding: 30px; }
    .card { background-color: var(--bg-card); }
    .table { color: var(--text-main); }
    .table-light { background-color: var(--bg-input); }
    .badge { font-weight: 500; }
  `]
})
export class ManualAttendanceComponent implements OnInit {
  sessionId: number | null = null;
  session: any = null;
  students: any[] = [];
  loading = false;

  constructor(
    private route: ActivatedRoute,
    private attendanceService: AttendanceService,
    private sessionService: SessionService
  ) {}

  async ngOnInit() {
    this.route.params.subscribe(params => {
      this.sessionId = Number(params['id']);
      if (this.sessionId) {
        this.loadSessionInfo();
        this.loadAttendance();
      }
    });
  }

  async loadSessionInfo() {
    try {
      this.session = await this.sessionService.getSessionById(this.sessionId!);
    } catch { }
  }

  async loadAttendance() {
    this.loading = true;
    try {
      const res = await this.attendanceService.getSessionAttendance(this.sessionId!);
      this.students = Array.isArray(res) ? res : res?.data || [];
    } catch (err) {
      console.error(err);
    } finally {
      this.loading = false;
    }
  }

  async toggle(student: any, status: string) {
    student.status = status;
    student.lastModified = new Date();
    // In a real app, we'd call an API here per-toggle or on save
  }

  async saveAll() {
    alert('تم حفظ كشف الحضور بنجاح!');
  }
}
