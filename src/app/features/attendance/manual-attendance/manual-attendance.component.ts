import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { ApiService } from '../../../core/services/api.service';

interface StudentAttendance {
  id: string;
  name: string;
  isPresent: boolean;
  notes: string;
}

@Component({
  selector: 'app-manual-attendance',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatTableModule,
    MatSelectModule,
    MatCheckboxModule,
    MatIconModule,
    MatSnackBarModule
  ],
  template: `
    <div class="attendance-container" dir="rtl">
      <mat-card>
        <mat-card-header>
          <div mat-card-avatar>
            <mat-icon color="primary">assignment_ind</mat-icon>
          </div>
          <mat-card-title>تسجيل الحضور اليدوي</mat-card-title>
          <mat-card-subtitle>حدد الفصل والمادة لتسجيل الحضور</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <div class="filters-row">
            <mat-form-field appearance="outline">
              <mat-label>الفصل الدراسي</mat-label>
              <mat-select [(value)]="selectedClass" (selectionChange)="loadStudents()">
                <mat-option value="class1">الصف الأول - أ</mat-option>
                <mat-option value="class2">الصف الثاني - ب</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>المادة</mat-label>
              <mat-select [(value)]="selectedSubject">
                <mat-option value="math">رياضيات</mat-option>
                <mat-option value="science">علوم</mat-option>
              </mat-select>
            </mat-form-field>
          </div>

          <table mat-table [dataSource]="students" class="mat-elevation-z2" *ngIf="students.length > 0">
            <!-- Name Column -->
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef> اسم الطالب </th>
              <td mat-cell *matCellDef="let student"> {{student.name}} </td>
            </ng-container>

            <!-- Status Column -->
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef> الحضور </th>
              <td mat-cell *matCellDef="let student">
                <mat-checkbox [(ngModel)]="student.isPresent" color="primary">
                  {{ student.isPresent ? 'حاضر' : 'غائب' }}
                </mat-checkbox>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>

          <div *ngIf="students.length === 0" class="no-data">
            يرجى تحديد الفصل الدراسي لعرض قائمة الطلاب.
          </div>
        </mat-card-content>

        <mat-card-actions align="end" *ngIf="students.length > 0">
          <button mat-flat-button color="primary" (click)="saveAttendance()">
            <mat-icon>save</mat-icon> حفظ الحضور
          </button>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .attendance-container {
      padding: 2rem;
      max-width: 800px;
      margin: 0 auto;
    }
    .filters-row {
      display: flex;
      gap: 1rem;
      margin-top: 1rem;
      margin-bottom: 1rem;
    }
    mat-form-field {
      flex: 1;
    }
    table {
      width: 100%;
    }
    .no-data {
      text-align: center;
      padding: 2rem;
      color: #666;
      background: #f5f5f5;
      border-radius: 4px;
    }
    mat-card-actions {
      padding: 16px;
    }
  `]
})
export class ManualAttendanceComponent implements OnInit {
  selectedClass: string = '';
  selectedSubject: string = '';

  displayedColumns: string[] = ['name', 'status'];
  students: StudentAttendance[] = [];

  constructor(private snackBar: MatSnackBar, private api: ApiService) { }

  ngOnInit(): void { }

  async loadStudents() {
    if (!this.selectedClass) return;
    try {
      const res: any = await this.api.get(`/api/Students/by-class/${this.selectedClass}`);
      const data = Array.isArray(res) ? res : res?.data || [];
      this.students = data.map((s: any) => ({
        id: s.id,
        name: s.fullName || s.name,
        isPresent: true,
        notes: ''
      }));
    } catch {
      this.students = [];
      this.snackBar.open('فشل تحميل الطلاب', 'إغلاق', { duration: 3000 });
    }
  }

  async saveAttendance() {
    if (!this.selectedSubject) {
      this.snackBar.open('يرجى اختيار المادة أولاً', 'إغلاق', { duration: 3000 });
      return;
    }

    try {
      await this.api.post('/api/Attendance/manual', {
        classId: this.selectedClass,
        subjectId: this.selectedSubject,
        records: this.students
      });
      this.snackBar.open('تم حفظ سجل الحضور بنجاح', 'إغلاق', { duration: 3000 });
    } catch {
      this.snackBar.open('حدث خطأ أثناء الحفظ', 'إغلاق', { duration: 3000 });
    }
  }
}
