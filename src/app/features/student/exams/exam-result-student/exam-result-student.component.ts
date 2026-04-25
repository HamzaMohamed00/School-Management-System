import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { ExamService } from '../../../../core/services/exam.service';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-exam-result-student',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './exam-result-student.component.html',
  styleUrls: ['./exam-result-student.component.css']
})
export class ExamResultStudentComponent implements OnInit {
  examId!: number;
  loading = true;
  resultData: any = null;

  get percentage() {
    if (!this.resultData || this.resultData.maxScore === 0) return 0;
    return Math.round((this.resultData.score / this.resultData.maxScore) * 100);
  }

  get statusMessage() {
    if (this.percentage >= 50) return 'تهانينا! لقد اجتزت الاختبار بنجاح 🎉';
    return 'للأسف لم يتم اجتياز الاختبار هذه المرة، حاول مجدداً في المرات القادمة.';
  }

  constructor(
    private route: ActivatedRoute,
    private examService: ExamService,
    private notification: NotificationService
  ) { }

  async ngOnInit() {
    this.examId = Number(this.route.snapshot.paramMap.get('id'));
    if (!this.examId) return;

    try {
      this.resultData = await this.examService.getStudentExamResult(this.examId);
    } catch (err) {
      this.notification.error('تعذر جلب نتيجتك');
    } finally {
      this.loading = false;
    }
  }
}
