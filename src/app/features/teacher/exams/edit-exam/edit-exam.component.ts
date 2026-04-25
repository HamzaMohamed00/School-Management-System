import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ExamService } from '../../../../core/services/exam.service';
import { ClassRoomService } from '../../../../core/services/classroom.service';
import { SubjectService } from '../../../../core/services/subject.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ClassRoom } from '../../../../core/models/class.model';
import { Subject } from '../../../../core/models/subject.model';

export interface Question {
  id: number;
  text: string;
  type: 'multiple-choice' | 'true-false' | 'essay';
  marks: number;
  options: string[];
  correctAnswer: number | string;
}

@Component({
  selector: 'app-edit-exam',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule],
  templateUrl: './edit-exam.component.html',
  styleUrls: ['./edit-exam.component.css'] // reuse styles or inline them
})
export class EditExamComponent implements OnInit {
  examId!: number;
  examForm: FormGroup;
  classes: ClassRoom[] = [];
  subjects: Subject[] = [];
  questions: Question[] = [];
  currentStep = 1;
  totalSteps = 3;
  submitting = false;
  loadingData = true;

  get totalQuestionsMarks(): number {
    return this.questions.reduce((s, q) => s + (q.marks || 0), 0);
  }

  constructor(
    private fb: FormBuilder,
    private examService: ExamService,
    private classService: ClassRoomService,
    private subjectService: SubjectService,
    private notification: NotificationService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.examForm = this.fb.group({
      title:       ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      classRoomId: ['', Validators.required],
      subjectId:   ['', Validators.required],
      type:        ['quiz'],
      date:        ['', Validators.required],
      startTime:   ['', Validators.required],
      endTime:     ['', Validators.required],
      duration:    ['60', [Validators.required, Validators.min(1)]],
      totalMarks:  ['100', [Validators.required, Validators.min(1)]],
      passMark:    ['50',  [Validators.required, Validators.min(1)]],
    });
  }

  async ngOnInit() {
    this.examId = Number(this.route.snapshot.paramMap.get('id'));
    if (!this.examId) {
      this.router.navigate(['/teacher/exams']);
      return;
    }
    try {
      await Promise.all([this.loadClasses(), this.loadSubjects(), this.loadExamDetails()]);
    } finally {
      this.loadingData = false;
    }
  }

  async loadClasses() {
    try { this.classes = await this.classService.getTeacherClasses(); } catch { }
  }

  async loadSubjects() {
    try { this.subjects = await this.subjectService.getTeacherSubjects(); } catch { }
  }

  async loadExamDetails() {
    try {
        const exam = await this.examService.getExamDetails(this.examId);
        let dateOnly = '', timeStart = '', timeEnd = '';
        if (exam.startTime) {
            const startDate = new Date(exam.startTime);
            dateOnly = startDate.toISOString().split('T')[0];
            timeStart = startDate.toTimeString().substring(0, 5);
        }
        if (exam.endTime) {
            const endDate = new Date(exam.endTime);
            timeEnd = endDate.toTimeString().substring(0, 5);
        }
        
        let durationStr = '60';
        if (exam.startTime && exam.endTime) {
            const diffMs = new Date(exam.endTime).getTime() - new Date(exam.startTime).getTime();
            durationStr = String(Math.round(diffMs / 60000));
        }

        this.examForm.patchValue({
            title: exam.title,
            description: exam.description || '',
            classRoomId: exam.classRoomId || '',
            subjectId: exam.subjectId || '',
            type: exam.examType || 'quiz',
            date: dateOnly,
            startTime: timeStart,
            endTime: timeEnd,
            duration: durationStr,
            totalMarks: exam.maxScore,
            passMark: exam.passingMarks || Math.round(exam.maxScore/2)
        });

        this.questions = (exam.questions || []).map((q: any) => {
            const type = this.inferQuestionType(q.choices);
            const defaultOpts = type === 'true-false' ? ['صح', 'خطأ'] : ['', '', '', ''];
            
            let options = q.choices ? q.choices.map((c: any) => c.text) : defaultOpts;
            if(options.length === 0) options = defaultOpts;

            const correctIndex = q.choices ? Math.max(0, q.choices.findIndex((c: any) => c.isCorrect || c.IsCorrect)) : 0;
            return {
                id: q.id || Date.now() + Math.random(),
                text: q.text || '',
                type: type,
                marks: q.score || q.marks || 5, // C# uses Score
                options: options,
                correctAnswer: correctIndex
            };
        });

        if(this.questions.length === 0) this.addQuestion();

    } catch (err) {
        this.notification.error('فشل تحميل تفاصيل الاختبار');
        this.router.navigate(['/teacher/exams']);
    }
  }

  inferQuestionType(choices: any[]): 'multiple-choice' | 'true-false' | 'essay' {
      if (!choices || choices.length === 0) return 'essay';
      if (choices.length === 2 && (choices[0].text === 'صح' || choices[0].text === 'خطأ' || choices[0].text === 'True' || choices[0].text === 'False')) {
          return 'true-false';
      }
      return 'multiple-choice';
  }

  /* ── Step navigation ── */
  isStep1Valid(): boolean {
    return !!(
      this.examForm.get('title')?.valid &&
      this.examForm.get('classRoomId')?.valid &&
      this.examForm.get('subjectId')?.valid
    );
  }

  isStep2Valid(): boolean {
    return !!(
      this.examForm.get('date')?.valid &&
      this.examForm.get('startTime')?.valid &&
      this.examForm.get('endTime')?.valid &&
      this.examForm.get('duration')?.valid
    );
  }

  nextStep() {
    if (this.currentStep === 1 && !this.isStep1Valid()) {
      this.examForm.get('title')?.markAsTouched();
      this.examForm.get('classRoomId')?.markAsTouched();
      this.examForm.get('subjectId')?.markAsTouched();
      this.notification.warning('يرجى إكمال المعلومات الأساسية أولاً');
      return;
    }
    if (this.currentStep === 2 && !this.isStep2Valid()) {
      ['date','startTime','endTime','duration'].forEach(f => this.examForm.get(f)?.markAsTouched());
      this.notification.warning('يرجى إكمال معلومات الموعد والمدة');
      return;
    }
    if (this.currentStep < this.totalSteps) this.currentStep++;
  }

  prevStep() {
    if (this.currentStep > 1) this.currentStep--;
  }

  /* ── Questions ── */
  trackByIndex(index: number, obj: any): any {
    return index;
  }

  addQuestion() {
    this.questions.push({
      id: Date.now(),
      text: '',
      type: 'multiple-choice',
      marks: 5,
      options: ['', '', '', ''],
      correctAnswer: 0
    });
  }

  removeQuestion(index: number) {
    this.questions.splice(index, 1);
  }

  addOption(question: Question) {
    question.options.push('');
  }

  removeOption(question: Question, idx: number) {
    if (question.options.length > 2) {
      question.options.splice(idx, 1);
      if (question.correctAnswer === idx) question.correctAnswer = 0;
    }
  }

  onTypeChange(question: Question) {
    if (question.type === 'true-false') {
      question.options = ['صح', 'خطأ'];
      question.correctAnswer = 0;
    } else if (question.type === 'multiple-choice' && question.options.length < 2) {
      question.options = ['', '', '', ''];
      question.correctAnswer = 0;
    } else if (question.type === 'essay') {
      question.options = [];
      question.correctAnswer = '';
    }
  }

  /* ── Submit ── */
  async onSubmit() {
    if (!this.isStep1Valid() || !this.isStep2Valid()) {
      this.notification.warning('يرجى إكمال جميع الحقول المطلوبة');
      return;
    }
    if (this.questions.length === 0) {
      this.notification.warning('يرجى إضافة سؤال واحد على الأقل');
      return;
    }
    const emptyQ = this.questions.find(q => !q.text.trim());
    if (emptyQ) {
      this.notification.warning('يرجى كتابة نص جميع الأسئلة');
      return;
    }

    this.submitting = true;
    try {
      const v = this.examForm.value;
      const startDateTime = `${v.date}T${v.startTime}:00`;
      const endDateTime = `${v.date}T${v.endTime}:00`;

      const examData = {
        id:           this.examId,
        title:        v.title,
        description:  v.description,
        classRoomId:  Number(v.classRoomId),
        subjectId:    Number(v.subjectId),
        examType:     v.type,
        startTime:    startDateTime,
        endTime:      endDateTime,
        maxScore:     this.totalQuestionsMarks || Number(v.totalMarks),
        questions:    this.questions.map((q, i) => ({
          text:          q.text,
          score:         q.marks,
          choices:       q.options.map((optLabel, optIndex) => ({
            text: optLabel,
            isCorrect: (q.type === 'multiple-choice' || q.type === 'true-false') ? (q.correctAnswer === optIndex) : false
          }))
        }))
      };

      await this.examService.updateExam(this.examId, examData);
      this.notification.success('تم تحديث الاختبار بنجاح 🎉');
      this.router.navigate(['/teacher/exams']);
    } catch (err: any) {
      console.error(err);
      this.notification.error('حدث خطأ أثناء تعديل الاختبار، يرجى المحاولة مجدداً');
    } finally {
      this.submitting = false;
    }
  }

  cancel() {
    this.router.navigate(['/teacher/exams']);
  }
}
