import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ParentService } from '../../../../core/services/parent.service';
import { StudentService } from '../../../../core/services/student.service';

@Component({
  selector: 'app-parent-management',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './parent-management.component.html',
  styleUrls: ['./parent-management.component.css']
})
export class ParentManagementComponent implements OnInit {
  parents: any[] = [];
  allStudents: any[] = [];
  selectedStudentIds: number[] = [];
  loading = false;
  submitting = false;
  showModal = false;
  showLinkModal = false;
  isEditMode = false;
  searchQuery = '';
  
  currentParent: any = {
    fullName: '',
    email: '',
    phone: '',
    address: ''
  };

  parentToDeleteId: number | null = null;
  showDeleteModal = false;

  constructor(
    private parentService: ParentService,
    private studentService: StudentService
  ) {}

  ngOnInit(): void {
    this.loadParents();
  }

  loadParents() {
    this.loading = true;
    this.parentService.getParents().then(data => {
      this.parents = data;
      this.loading = false;
    }).catch(err => {
      console.error(err);
      this.loading = false;
    });
  }

  openAddModal() {
    this.isEditMode = false;
    this.currentParent = { fullName: '', email: '', phone: '', address: '' };
    this.showModal = true;
  }

  openEditModal(parent: any) {
    this.isEditMode = true;
    this.currentParent = { ...parent };
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
  }

  async saveParent() {
    this.submitting = true;
    try {
      if (this.isEditMode) {
        await this.parentService.updateParent(this.currentParent.id, this.currentParent);
      } else {
        await this.parentService.createParent(this.currentParent);
      }
      this.loadParents();
      this.closeModal();
    } catch (err: any) {
      console.error(err);
      const errorMsg = err.error?.inner || err.error?.details || err.message || 'خطأ غير معروف';
      alert('فشل الحفظ: ' + errorMsg);
    } finally {
      this.submitting = false;
    }
  }

  confirmDelete(id: number) {
    this.parentToDeleteId = id;
    this.showDeleteModal = true;
  }

  async deleteParent() {
    if (!this.parentToDeleteId) return;
    this.submitting = true;
    try {
      await this.parentService.deleteParent(this.parentToDeleteId);
      this.loadParents();
      this.showDeleteModal = false;
    } catch (err) {
      console.error(err);
    } finally {
      this.submitting = false;
    }
  }

  async openLinkModal(parent: any) {
    this.currentParent = { ...parent };
    this.showLinkModal = true;
    this.loading = true;
    try {
      // Get all students and the parent's current children
      const [students, parentData] = await Promise.all([
        this.studentService.getAll(),
        this.parentService.getParents().then(all => all.find(p => p.id === parent.id))
      ]);
      
      this.allStudents = students;
      // We might need a specific endpoint for parent's student IDs if not in the list
      // For now assume the parent object in the list has them or we fetch them
      this.selectedStudentIds = parent.children?.map((c: any) => c.id) || [];
    } catch (err) {
      console.error(err);
    } finally {
      this.loading = false;
    }
  }

  toggleStudentSelection(studentId: number) {
    const index = this.selectedStudentIds.indexOf(studentId);
    if (index > -1) {
      this.selectedStudentIds.splice(index, 1);
    } else {
      this.selectedStudentIds.push(studentId);
    }
  }

  get filteredStudents() {
    if (!this.searchQuery) return this.allStudents;
    return this.allStudents.filter(s => 
      s.fullName.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(this.searchQuery.toLowerCase())
    );
  }

  async saveLinks() {
    this.submitting = true;
    try {
      await this.parentService.linkStudents(this.currentParent.id, this.selectedStudentIds);
      this.loadParents();
      this.showLinkModal = false;
    } catch (err) {
      console.error(err);
      alert('فشل في ربط الطلاب');
    } finally {
      this.submitting = false;
    }
  }
}
