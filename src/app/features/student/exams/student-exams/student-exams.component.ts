import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ExamService } from '../../../../core/services/exam.service';
import { Exam } from '../../../../core/models/exam.model';

@Component({
  selector: 'app-student-exams',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './student-exams.component.html',
  styleUrls: ['./student-exams.component.css']
})
export class StudentExamsComponent implements OnInit {
  exams: Exam[] = [];
  loading = false;
  activeTab: 'ongoing' | 'upcoming' | 'completed' = 'ongoing';

  ongoingExams: Exam[] = [];
  upcomingExams: Exam[] = [];
  completedExams: Exam[] = [];

  constructor(private examService: ExamService) { }

  ngOnInit(): void {
    this.loadExams();
  }

  async loadExams() {
    this.loading = true;
    try {
      this.exams = await this.examService.getStudentExams();
      this.categorizeExams();
    } catch (err) {
      console.error(err);
      this.exams = [];
    } finally {
      this.loading = false;
    }
  }

  categorizeExams() {
    const now = new Date();
    this.ongoingExams = [];
    this.upcomingExams = [];
    this.completedExams = [];

    this.exams.forEach(exam => {
      // If student already submitted, it's completed
      if (exam.isCompleted) {
        this.completedExams.push(exam);
        return;
      }

      const start = new Date(exam.startTime);
      const end = new Date(exam.endTime);

      if (now < start) {
        this.upcomingExams.push(exam);
      } else if (now > end) {
        this.completedExams.push(exam); // Missed or Finished
      } else {
        this.ongoingExams.push(exam);
      }
    });
  }

  setTab(tab: 'ongoing' | 'upcoming' | 'completed') {
    this.activeTab = tab;
  }
}
