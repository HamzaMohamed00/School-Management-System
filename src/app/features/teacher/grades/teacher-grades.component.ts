import { Component, OnInit } from '@angular/core'; 
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { StudentService } from '../../../core/services/student.service';
import { SubjectService } from '../../../core/services/subject.service';
import { GradeService } from '../../../core/services/grade.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ClassRoomService } from '../../../core/services/classroom.service';

@Component({
  selector: 'app-teacher-grades',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './teacher-grades.component.html',
  styleUrls: ['./teacher-grades.component.css']
})
export class TeacherGradesComponent implements OnInit {
  mainForm: FormGroup;
  students: any[] = [];
  subjects: any[] = [];
  classes: any[] = [];
  loading = false;
  submitting = false;

  gradeTypes = ['الواجبات', 'الاختبار الشهري', 'المشاركة', 'السلوك', 'امتحان نصف العام', 'امتحان نهاية العام'];

  constructor(
    private fb: FormBuilder,
    private studentService: StudentService,
    private subjectService: SubjectService,
    private classRoomService: ClassRoomService,
    private gradeService: GradeService,
    private notification: NotificationService
  ) {
    this.mainForm = this.fb.group({
      classRoomId: ['', Validators.required],
      subjectName: ['', Validators.required],
      gradeType: ['الاختبار الشهري', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadInitialData();
  }

  async loadInitialData() {
    this.loading = true;
    try {
      const setup = await this.gradeService.getTeacherSetup();
      this.subjects = setup.subjects || [];
      this.classes = setup.classes || [];

      if (this.subjects.length > 0) {
        this.mainForm.patchValue({ subjectName: this.subjects[0].name });
      }
    } catch (err) {
      this.notification.error('فشل في تحميل البيانات');
      console.error(err);
    } finally {
      this.loading = false;
    }
  }

  onSubjectChange() {
    // No strict filtering needed anymore, let them see everything!
  }

  async fetchStudents() {
    const { classRoomId, subjectName, gradeType } = this.mainForm.value;
    if (!classRoomId || !subjectName || !gradeType) {
      this.notification.warning('يرجى اختيار المادة والفصل ونوع التقييم');
      return;
    }

    this.loading = true;
    try {
      const data = await this.gradeService.getClassGrades(classRoomId, subjectName, gradeType);
      
      this.students = data.map(s => ({
        id: s.studentId,
        fullName: s.studentName,
        gradeId: s.gradeId,
        gradeInput: s.score || 0,
        notesInput: s.notes || '',
        isSaving: false
      }));

      if (this.students.length === 0) {
        this.notification.warning('لا يوجد طلاب في هذا الفصل');
      }
    } catch (err) {
      this.notification.error('حدث خطأ أثناء جلب قائمة الدرجات');
      console.error(err);
    } finally {
      this.loading = false;
    }
  }

  async saveAllGrades() {
    if (this.students.length === 0) return;

    this.submitting = true;
    const { classRoomId, subjectName, gradeType } = this.mainForm.value;
    
    const payload = {
      subjectName: subjectName,
      classId: Number(classRoomId),
      gradeType: gradeType,
      updates: this.students.map(s => ({
        gradeId: s.gradeId,
        studentId: s.id,
        score: Number(s.gradeInput),
        notes: s.notesInput
      }))
    };

    try {
      await this.gradeService.bulkUpdateGrades(payload);
      this.notification.success('تم حفظ كافة الدرجات بنجاح');
      await this.fetchStudents();
    } catch (err) {
      this.notification.error('فشل في حفظ الدرجات');
      console.error(err);
    } finally {
      this.submitting = false;
    }
  }
}
