import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { AssignmentService, Assignment } from '../../../../core/services/assignment.service';

@Component({
  selector: 'app-student-assignments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './student-assignments.component.html',
  styleUrl: './student-assignments.component.css'
})
export class StudentAssignmentsComponent implements OnInit {
  allAssignments: Assignment[] = [];
  filteredAssignments: Assignment[] = [];
  activeTab: 'all' | 'pending' | 'completed' = 'all';
  loading = false;
  error = '';
  submittingAssignmentId: number | null = null;

  constructor(
    private assignmentService: AssignmentService,
    private authService: AuthService
  ) { }

  async ngOnInit() {
    await this.loadAssignments();
  }

  async loadAssignments() {
    this.loading = true;
    this.error = '';
    try {
      this.allAssignments = await this.assignmentService.getAssignments();
    } catch (err: any) {
      console.error(err);
      this.error = 'تعذر تحميل الواجبات المنزلية';
      this.allAssignments = [];
    } finally {
      this.applyTab(this.activeTab);
      this.loading = false;
    }
  }

  applyTab(tab: 'all' | 'pending' | 'completed') {
    this.activeTab = tab;
    if (tab === 'all') {
      this.filteredAssignments = this.allAssignments;
    } else if (tab === 'pending') {
      this.filteredAssignments = this.allAssignments.filter(a => !a.isSubmitted);
    } else {
      this.filteredAssignments = this.allAssignments.filter(a => a.isSubmitted);
    }
  }

  async submitAssignment(assignmentId: number) {
    const fileUrl = prompt('يرجى إدخال رابط الملف (سوق نقوم بإضافة رفع الملفات لاحقاً)');
    if (!fileUrl) return;

    try {
      this.submittingAssignmentId = assignmentId;
      await this.assignmentService.submitAssignment({
        assignmentId,
        fileUrl,
        studentNotes: 'تم حل الواجب'
      });
      alert('تم تسليم الواجب بنجاح');
      await this.loadAssignments();
    } catch (err) {
      alert('حدث خطأ أثناء التسليم');
    } finally {
      this.submittingAssignmentId = null;
    }
  }
}
