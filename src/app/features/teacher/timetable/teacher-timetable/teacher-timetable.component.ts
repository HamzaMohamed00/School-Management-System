import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SessionService } from '../../../../core/services/session.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ClassRoomService } from '../../../../core/services/classroom.service';
import { SubjectService } from '../../../../core/services/subject.service';
import { TeacherService } from '../../../../core/services/teacher.service';
import { DashboardService } from '../../../../core/services/dashboard.service';
import { Session } from '../../../../core/models/session.model';

@Component({
  selector: 'app-teacher-timetable',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './teacher-timetable.component.html',
  styleUrl: './teacher-timetable.component.css'
})
export class TeacherTimetableComponent implements OnInit {
  sessions: Session[] = [];
  classrooms: any[] = [];
  subjects: any[] = [];
  teacherId: number | null = null;
  
  daysOfWeek = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
  timeSlots = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00'];
  
  timetableMatrix: { [day: string]: { [time: string]: Session | null } } = {};
  
  loading = false;
  submitting = false;
  showAddModal = false;
  
  newSession: any = {
    title: '',
    classRoomId: null,
    subjectId: null,
    sessionDate: '',
    startTime: '',
    duration: 60, // minutes
    attendanceType: 'QR'
  };

  constructor(
    private sessionService: SessionService,
    private auth: AuthService,
    private classroomService: ClassRoomService,
    private subjectService: SubjectService,
    private teacherService: TeacherService,
    private dashboardService: DashboardService
  ) {
    this.initMatrix();
  }

  initMatrix() {
    this.daysOfWeek.forEach(day => {
      this.timetableMatrix[day] = {};
      this.timeSlots.forEach(time => {
        this.timetableMatrix[day][time] = null;
      });
    });
  }

  async ngOnInit() {
    this.loading = true;
    try {
      await this.discoverTeacherId();
      await Promise.all([
        this.loadSessions(),
        this.loadInitialData()
      ]);
    } catch (err) {
      console.error('Error initializing timetable', err);
    } finally {
      this.loading = false;
    }
  }

  async discoverTeacherId() {
    const user = this.auth.getCurrentUser();
    
    // 1. Try Token/User property
    if (user?.teacherId) {
      this.teacherId = user.teacherId;
      console.log('[Timetable] Found TeacherId in User object:', this.teacherId);
      return;
    }

    // 2. Try Dashboard Stats (highest probability)
    try {
      const stats = await this.dashboardService.getTeacherStats();
      if (stats?.teacherId) {
        this.teacherId = stats.teacherId;
        console.log('[Timetable] Discovered TeacherId via Dashboard:', this.teacherId);
      } else if (stats?.id) {
        this.teacherId = stats.id;
        console.log('[Timetable] Discovered TeacherId via Stats ID:', this.teacherId);
      }
    } catch (err) {
      console.warn('[Timetable] Dashboard check failed:', err);
    }

    // 3. Last Resort: Filter All Teachers by Email
    if (!this.teacherId && user?.email) {
      try {
        const teachers = await this.teacherService.getTeachers();
        const me = teachers.find(t => t.email.toLowerCase() === user.email?.toLowerCase());
        if (me) {
          this.teacherId = me.id;
          console.log('[Timetable] Discovered TeacherId via Teacher List:', this.teacherId);
        }
      } catch (err) {
        console.warn('[Timetable] Teacher list check failed:', err);
      }
    }
  }

  async loadSessions() {
    if (!this.teacherId) return;
    try {
      const res = await this.sessionService.getTeacherSessions(this.teacherId);
      this.sessions = Array.isArray(res) ? res : [];
      this.buildMatrix();
    } catch (err) {
      console.error('[Timetable] Error loading sessions:', err);
      this.sessions = [];
    }
  }

  async loadInitialData() {
    try {
      [this.classrooms, this.subjects] = await Promise.all([
        this.classroomService.getTeacherClasses(),
        this.subjectService.getTeacherSubjects()
      ]);
      console.log('[Timetable] Initial data loaded using base endpoints');
    } catch (err) {
      console.error('[Timetable] Error loading initial data:', err);
    }
  }

  buildMatrix() {
    this.initMatrix();
    const arabicDays = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

    this.sessions.forEach(session => {
      if (!session.startTime) return;
      
      const dateObj = new Date(session.startTime);
      const dayName = arabicDays[dateObj.getDay()];
      const hours = dateObj.getHours().toString().padStart(2, '0');
      const timeSlot = `${hours}:00`;

      if (this.daysOfWeek.includes(dayName) && this.timeSlots.includes(timeSlot)) {
        this.timetableMatrix[dayName][timeSlot] = session;
      }
    });
  }

  openAddModal() {
    this.newSession = {
      title: '',
      classRoomId: null,
      subjectId: null,
      sessionDate: new Date().toISOString().split('T')[0],
      startTime: '08:00',
      duration: 60,
      attendanceType: 'QR'
    };
    this.showAddModal = true;
  }

  async saveSession() {
    this.submitting = true;
    try {
      const [hours, minutes] = this.newSession.startTime.split(':').map(Number);
      const startTimeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
      
      const endTotalMinutes = (hours * 60) + minutes + this.newSession.duration;
      const endHours = Math.floor(endTotalMinutes / 60) % 24;
      const endMinutes = endTotalMinutes % 60;
      const endTimeString = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}:00`;

      const payload: any = {
        title: this.newSession.title || 'حصة دراسية',
        classRoomId: Number(this.newSession.classRoomId),
        subjectId: Number(this.newSession.subjectId),
        teacherId: Number(this.teacherId),
        sessionDate: this.newSession.sessionDate, // Backend expects 'SessionDate'
        startTime: startTimeString,
        endTime: endTimeString,
        attendanceType: this.newSession.attendanceType || 'QR'
      };

      // Add teacherId ONLY if discovered to avoid invalid IDs (NaN, 0)
      if (this.teacherId) {
        payload.teacherId = this.teacherId;
      }

      await this.sessionService.createSession(payload);
      this.showAddModal = false;
      await this.loadSessions();
    } catch (err) {
      console.error('Error saving session', err);
    } finally {
      this.submitting = false;
    }
  }

  async deleteSession(id: number, event: Event) {
    event.stopPropagation(); // Prevent opening any details if we add them later
    
    if (confirm('هل أنت متأكد من حذف هذه الحصة؟')) {
      try {
        await this.sessionService.deleteSession(id);
        await this.loadSessions();
      } catch (err) {
        console.error('Error deleting session', err);
        alert('فشل حذف الحصة. يرجى المحاولة مرة أخرى.');
      }
    }
  }

  getSubjectColor(subjectName: string | undefined): string {
    if (!subjectName) return 'bg-dark';
    const name = subjectName.toLowerCase();
    if (name.includes('رياضيات')) return 'bg-blue';
    if (name.includes('علوم')) return 'bg-green';
    if (name.includes('عربية')) return 'bg-purple';
    if (name.includes('إنجليزية')) return 'bg-teal';
    return 'bg-secondary';
  }
}
