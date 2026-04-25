import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TeacherService } from '../../../../core/services/teacher.service';
import { SubjectService } from '../../../../core/services/subject.service';
import { ClassRoomService } from '../../../../core/services/classroom.service';

@Component({
  selector: 'app-teacher-management',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './teacher-management.component.html',
  styleUrls: ['./teacher-management.component.css']
})
export class TeacherManagementComponent implements OnInit {
  teachers: any[] = [];
  filteredTeachers: any[] = [];
  subjects: any[] = [];
  classRooms: any[] = [];
  loading = false;
  submitting = false;
  error = '';
  searchTerm = '';

  // Modal State
  showModal = false;
  showDeleteModal = false;
  teacherToDeleteId: number | null = null;
  isEditMode = false;
  currentTeacher: any = {
    fullName: '',
    email: '',
    phone: '',
    password: 'Password@123',
    subjectId: null,
    isActive: true
  };

  constructor(
    private teacherService: TeacherService,
    private subjectService: SubjectService,
    private classRoomService: ClassRoomService
  ) { }

  async ngOnInit() {
    await Promise.all([
      this.loadTeachers(),
      this.loadMeta()
    ]);
  }

  async loadMeta() {
    try {
      this.subjects = await this.subjectService.getAll();
      this.classRooms = await this.classRoomService.getAll();
    } catch (err) {
      console.error('Meta load error', err);
    }
  }

  async loadTeachers() {
    this.loading = true;
    this.error = '';
    try {
      this.teachers = await this.teacherService.getTeachers();
      this.applyFilter();
    } catch (err: any) {
      this.error = err?.message || 'حدث خطأ في تحميل بيانات المدرسين';
    } finally {
      this.loading = false;
    }
  }

  applyFilter() {
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      this.filteredTeachers = this.teachers.filter(t =>
        (t.fullName || '').toLowerCase().includes(term) ||
        (t.email || '').toLowerCase().includes(term)
      );
    } else {
      this.filteredTeachers = [...this.teachers];
    }
  }

  openAddModal() {
    this.isEditMode = false;
    this.currentTeacher = {
      fullName: '',
      email: '',
      phone: '',
      password: 'Password@123',
      subjectId: null,
      isActive: true
    };
    this.showModal = true;
  }

  openEditModal(teacher: any) {
    this.isEditMode = true;
    this.currentTeacher = { ...teacher, subjectId: teacher.subjectId || null };
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
  }

  async saveTeacher() {
    this.submitting = true;
    try {
      if (this.isEditMode) {
        await this.teacherService.updateTeacher(this.currentTeacher.id, this.currentTeacher);
      } else {
        await this.teacherService.createTeacher(this.currentTeacher);
      }
      await this.loadTeachers();
      this.closeModal();
    } catch (err: any) {
      alert('خطأ في الحفظ: ' + (err.error?.message || err.message));
    } finally {
      this.submitting = false;
    }
  }

  async deleteTeacher(id: number) {
    this.teacherToDeleteId = id;
    this.showDeleteModal = true;
  }

  closeDeleteModal() {
    this.showDeleteModal = false;
    this.teacherToDeleteId = null;
  }

  async confirmDelete() {
    if (!this.teacherToDeleteId) return;
    
    this.submitting = true;
    try {
      await this.teacherService.deleteTeacher(this.teacherToDeleteId);
      this.teachers = this.teachers.filter(t => t.id !== this.teacherToDeleteId);
      this.applyFilter();
      this.closeDeleteModal();
    } catch (err: any) {
      alert(err?.message || 'حدث خطأ في الحذف');
    } finally {
      this.submitting = false;
    }
  }
}
