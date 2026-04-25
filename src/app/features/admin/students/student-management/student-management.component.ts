import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { StudentService } from '../../../../core/services/student.service';
import { GradeService } from '../../../../core/services/grade.service';
import { ClassRoomService } from '../../../../core/services/classroom.service';
import { ParentService } from '../../../../core/services/parent.service';

@Component({
  selector: 'app-student-management',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './student-management.component.html',
  styleUrls: ['./student-management.component.css']
})
export class StudentManagementComponent implements OnInit {
  students: any[] = [];
  filteredStudents: any[] = [];
  gradeLevels: any[] = [];
  classRooms: any[] = [];
  parentsMeta: any[] = [];
  loading = false;
  submitting = false;
  error = '';
  searchTerm = '';
  selectedStatus = 'all';

  // Modal State
  showModal = false;
  showDeleteModal = false;
  studentToDeleteId: number | null = null;
  isEditMode = false;
  currentStudent: any = {
    fullName: '',
    email: '',
    phone: '',
    password: 'Password@123', // Default for new students
    classRoomId: null,
    parentId: null,
    isActive: true
  };

  constructor(
    private studentService: StudentService,
    private gradeService: GradeService,
    private classRoomService: ClassRoomService,
    private parentService: ParentService
  ) { }

  async ngOnInit() {
    await Promise.all([
      this.loadStudents(),
      this.loadMeta()
    ]);
  }

  async loadMeta() {
    try {
      this.gradeLevels = await this.gradeService.getGrades();
      this.classRooms = await this.classRoomService.getAll();
      this.parentsMeta = await this.parentService.getParents();
    } catch (err) {
      console.error('Meta load error', err);
    }
  }

  async loadStudents() {
    this.loading = true;
    this.error = '';
    try {
      const result = await this.studentService.getStudents();
      this.students = Array.isArray(result) ? result : (result as any)?.items || (result as any)?.data || [];
      this.applyFilter();
    } catch (err: any) {
      this.error = err?.message || 'حدث خطأ في تحميل بيانات الطلاب';
    } finally {
      this.loading = false;
    }
  }

  applyFilter() {
    let list = this.students;
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      list = list.filter(s =>
        (s.fullName || s.name || '').toLowerCase().includes(term) ||
        (s.email || '').toLowerCase().includes(term)
      );
    }
    if (this.selectedStatus !== 'all') {
      list = list.filter(s => s.isActive === (this.selectedStatus === 'active'));
    }
    this.filteredStudents = list;
  }

  openAddModal() {
    this.isEditMode = false;
    this.currentStudent = {
      fullName: '',
      email: '',
      phone: '',
      password: 'Password@123',
      classRoomId: null,
      parentId: null,
      isActive: true
    };
    this.showModal = true;
  }

  openEditModal(student: any) {
    this.isEditMode = true;
    this.currentStudent = { ...student };
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
  }

  async saveStudent() {
    this.submitting = true;
    try {
      if (this.isEditMode) {
        await this.studentService.updateStudent(this.currentStudent.id, this.currentStudent);
      } else {
        await this.studentService.createStudent(this.currentStudent);
      }
      await this.loadStudents();
      this.closeModal();
    } catch (err: any) {
      alert('خطأ في الحفظ: ' + (err.error?.message || err.message));
    } finally {
      this.submitting = false;
    }
  }

  async deleteStudent(id: number) {
    this.studentToDeleteId = id;
    this.showDeleteModal = true;
  }

  closeDeleteModal() {
    this.showDeleteModal = false;
    this.studentToDeleteId = null;
  }

  async confirmDelete() {
    if (!this.studentToDeleteId) return;
    
    this.submitting = true;
    try {
      await this.studentService.deleteStudent(this.studentToDeleteId);
      this.students = this.students.filter(s => s.id !== this.studentToDeleteId);
      this.applyFilter();
      this.closeDeleteModal();
    } catch (err: any) {
      alert(err?.message || 'حدث خطأ في الحذف');
    } finally {
      this.submitting = false;
    }
  }
}
