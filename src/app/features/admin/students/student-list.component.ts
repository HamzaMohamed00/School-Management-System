import { Component, OnInit, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { SmartTableComponent, TableColumn, SortEvent } from '@shared/components/table/smart-table.component';
import { StudentService } from '@core/services/student.service';
import { Student } from '@core/models/student.model';
import { DialogService } from '@core/services/dialog.service';
import { NotificationService } from '@core/services/notification.service';

@Component({
  selector: 'app-student-list',
  standalone: true,
  imports: [CommonModule, RouterModule, SmartTableComponent],
  templateUrl: './student-list.component.html',
  styleUrls: ['./student-list.component.css']
})
export class StudentListComponent implements OnInit {
  @ViewChild('attendanceRateTemplate', { static: true }) attendanceRateTemplate!: TemplateRef<any>;

  students: Student[] = [];
  loading = false;
  totalItems = 0;
  pageSize = 10;
  currentPage = 1;
  searchTerm = '';
  
  // Placeholder for classes filter
  classes: any[] = [];

  columns: TableColumn[] = [
    { field: 'id', title: 'المعرف', sortable: true },
    { field: 'fullName', title: 'الاسم الكامل', sortable: true },
    { field: 'email', title: 'البريد الإلكتروني', sortable: true },
    { field: 'classRoom.name', title: 'الفصل', sortable: true },
    { field: 'parent.fullName', title: 'ولي الأمر', sortable: true },
    { 
      field: 'attendanceRate', 
      title: 'نسبة الحضور', 
      type: 'badge',
      template: null // Will be assigned in ngOnInit
    },
    { field: 'status', title: 'الحالة', type: 'badge' }
  ];

  constructor(
    private studentService: StudentService,
    private dialog: DialogService,
    private notification: NotificationService,
    private router: Router
  ) {}

  ngOnInit() {
    this.columns[5].template = this.attendanceRateTemplate;
    this.loadStudents();
  }

  applyFilters() {
    this.currentPage = 1;
    this.loadStudents();
  }

  async loadStudents(): Promise<void> {
    this.loading = true;
    try {
      const params = {
        pageIndex: this.currentPage,
        pageSize: this.pageSize,
        search: this.searchTerm,
        sort: this.getSortParam()
      };
      
      const response = await this.studentService.getStudents(params);
      this.students = response.items;
      this.totalItems = response.totalCount;
    } catch (error) {
      this.notification.error('حدث خطأ في تحميل البيانات');
    } finally {
      this.loading = false;
    }
  }

  getSortParam(): string {
    if (this.sortColumn) {
      return `${this.sortColumn},${this.sortDirection}`;
    }
    return '';
  }

  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadStudents();
  }

  onSearch(term: string): void {
    this.searchTerm = term;
    this.currentPage = 1;
    this.loadStudents();
  }

  onSort(event: SortEvent): void {
    // Implement sort
    this.loadStudents();
  }

  onAddStudent(): void {
    this.router.navigate(['/admin/students/add']);
  }

  onEditStudent(student: Student): void {
    this.router.navigate(['/admin/students/edit', student.id]);
  }

  async onDeleteStudent(student: Student): Promise<void> {
    const confirmed = await this.dialog.confirm({
      title: 'تأكيد الحذف',
      message: `هل أنت متأكد من حذف الطالب ${student.fullName}؟`,
      confirmText: 'حذف',
      cancelText: 'إلغاء'
    });

    if (confirmed) {
      try {
        await this.studentService.deleteStudent(student.id);
        this.notification.success('تم حذف الطالب بنجاح');
        this.loadStudents();
      } catch (error) {
        this.notification.error('حدث خطأ في حذف الطالب');
      }
    }
  }

  onViewStudent(student: Student): void {
    this.router.navigate(['/admin/students', student.id]);
  }

  onTrainFace(student: Student): void {
    this.router.navigate(['/admin/students/train-face', student.id]);
  }
}