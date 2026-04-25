import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { ExamService } from '../../../../core/services/exam.service';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-exam-results',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './exam-results.component.html',
  styleUrls: ['./exam-results.component.css']
})
export class ExamResultsComponent implements OnInit {
  examId!: number;
  loading = true;
  examTitle = '';
  maxScore = 0;
  results: any[] = [];

  get totalStudents() { return this.results.length; }
  get averageScore() { 
      if(this.totalStudents === 0) return 0;
      const sum = this.results.reduce((acc, r) => acc + r.score, 0);
      return (sum / this.totalStudents).toFixed(1);
  }
  get passRate() {
      if(this.totalStudents === 0) return 0;
      const passMark = this.maxScore / 2;
      const passed = this.results.filter(r => r.score >= passMark).length;
      return Math.round((passed / this.totalStudents) * 100);
  }

  constructor(
      private route: ActivatedRoute,
      private examService: ExamService,
      private notification: NotificationService
  ) {}

  async ngOnInit() {
      this.examId = Number(this.route.snapshot.paramMap.get('id'));
      if(!this.examId) return;

      try {
          const res = await this.examService.getExamResults(this.examId);
          this.examTitle = res.examTitle;
          this.maxScore = res.maxScore;
          this.results = res.results || [];
      } catch (err) {
          this.notification.error('تعذر جلب نتائج الاختبار');
      } finally {
          this.loading = false;
      }
  }

  exportResults() {
      this.notification.info('سيتم تحميل الملف قريباً (قيد التطوير)');
  }
}
