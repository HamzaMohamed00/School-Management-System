import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SessionService } from '../../../../core/services/session.service';
import { ClassRoomService } from '../../../../core/services/classroom.service';
import { SubjectService } from '../../../../core/services/subject.service';
import { TeacherService } from '../../../../core/services/teacher.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Session } from '../../../../core/models/session.model';

@Component({
  selector: 'app-timetable-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './timetable-management.component.html',
  styleUrl: './timetable-management.component.css'
})
export class TimetableManagementComponent implements OnInit {
  classes: any[] = [];
  subjects: any[] = [];
  teachers: any[] = [];
  selectedClassId: number | null = null;
  sessions: Session[] = [];
  
  daysOfWeek = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
  timeSlots = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00'];
  timetableMatrix: { [day: string]: { [time: string]: Session | null } } = {};

  showModal = false;
  showDeleteModal = false;
  sessionToDeleteId: number | null = null;
  isEditMode = false;
  currentSession: any = {
    title: '',
    classRoomId: null,
    subjectId: null,
    teacherId: null,
    sessionDate: new Date().toISOString().split('T')[0],
    startTime: '08:00',
    endTime: '09:00',
    attendanceType: 'QR'
  };
  
  loading = false;
  submitting = false;

  constructor(
    private sessionService: SessionService,
    private classRoomService: ClassRoomService,
    private subjectService: SubjectService,
    private teacherService: TeacherService,
    private notificationService: NotificationService
  ) {
    this.initMatrix();
  }

  async ngOnInit() {
    this.loading = true;
    try {
      const [classes, subjects, teachers] = await Promise.all([
        this.classRoomService.getClassRooms(),
        this.subjectService.getSubjects(),
        this.teacherService.getTeachers()
      ]);
      this.classes = classes;
      this.subjects = subjects;
      this.teachers = teachers;
      
      if (this.classes.length > 0) {
        this.selectedClassId = this.classes[0].id;
        this.onClassChange();
      }
    } catch (err) {
      console.error('Error loading initial data', err);
    } finally {
      this.loading = false;
    }
  }

  initMatrix() {
    this.daysOfWeek.forEach(day => {
      this.timetableMatrix[day] = {};
      this.timeSlots.forEach(time => {
        this.timetableMatrix[day][time] = null;
      });
    });
  }

  async onClassChange() {
    if (!this.selectedClassId) return;
    this.loading = true;
    this.initMatrix();
    try {
      this.sessions = await this.sessionService.getClassSessions(this.selectedClassId);
      this.buildMatrix();
    } catch (err) {
      console.error('Error loading class sessions', err);
    } finally {
      this.loading = false;
    }
  }

  buildMatrix() {
    const arabicDays = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    this.sessions.forEach(session => {
      const dateObj = new Date(session.startTime);
      const dayName = arabicDays[dateObj.getDay()];
      const hours = dateObj.getHours().toString().padStart(2, '0');
      const timeSlot = `${hours}:00`;

      if (this.daysOfWeek.includes(dayName) && this.timeSlots.includes(timeSlot)) {
        this.timetableMatrix[dayName][timeSlot] = session;
      }
    });
  }

  openAddModal(day: string, time: string) {
    this.isEditMode = false;
    const arabicDays = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const dayIndex = arabicDays.indexOf(day);
    
    // Get next occurrence of this day of week
    const now = new Date();
    const currentDay = now.getDay();
    let daysToAdd = (dayIndex - currentDay + 7) % 7;
    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() + daysToAdd);

    this.currentSession = {
      title: '',
      classRoomId: this.selectedClassId,
      subjectId: this.subjects.length > 0 ? this.subjects[0].id : null,
      teacherId: this.teachers.length > 0 ? this.teachers[0].id : null,
      sessionDate: targetDate.toISOString().split('T')[0],
      startTime: time,
      endTime: this.calculateEndTime(time),
      attendanceType: 'QR'
    };
    this.showModal = true;
  }

  calculateEndTime(startTime: string): string {
    const [hours, minutes] = startTime.split(':').map(Number);
    return `${(hours + 1).toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  openEditModal(session: Session) {
    this.isEditMode = true;
    const start = new Date(session.startTime);
    const end = new Date(session.endTime);
    
    this.currentSession = {
      id: session.id,
      title: session.subjectName || '',
      classRoomId: this.selectedClassId,
      subjectId: (session as any).subjectId,
      teacherId: (session as any).teacherId,
      sessionDate: start.toISOString().split('T')[0],
      startTime: start.getHours().toString().padStart(2, '0') + ':00',
      endTime: end.getHours().toString().padStart(2, '0') + ':00',
      attendanceType: (session as any).attendanceType || 'QR'
    };
    this.showModal = true;
  }

  getSubjectName(id: number): string {
    const subject = this.subjects.find(s => s.id === Number(id));
    return subject ? subject.name : '';
  }

  async saveSession() {
    this.submitting = true;
    try {
      const subjectName = this.getSubjectName(this.currentSession.subjectId);
      if (this.isEditMode) {
        // Prepare session object for backend UpdateSession logic
        const sessionUpdate = {
          id: this.currentSession.id,
          title: subjectName,
          sessionDate: this.currentSession.sessionDate,
          startTime: this.currentSession.startTime,
          endTime: this.currentSession.endTime,
          attendanceType: this.currentSession.attendanceType,
          classRoomId: Number(this.currentSession.classRoomId),
          subjectId: Number(this.currentSession.subjectId),
          teacherId: Number(this.currentSession.teacherId)
        };
        await this.sessionService.updateSession(this.currentSession.id, sessionUpdate);
      } else {
        const sessionCreate = {
          title: subjectName,
          classRoomId: Number(this.currentSession.classRoomId),
          subjectId: Number(this.currentSession.subjectId),
          teacherId: Number(this.currentSession.teacherId),
          sessionDate: this.currentSession.sessionDate,
          startTime: this.currentSession.startTime,
          endTime: this.currentSession.endTime,
          attendanceType: this.currentSession.attendanceType
        };
        await this.sessionService.createSession(sessionCreate);
      }
      this.showModal = false;
      this.onClassChange();
    } catch (err) {
      console.error('Error saving session', err);
    } finally {
      this.submitting = false;
    }
  }

  confirmDelete(sessionId: number) {
    this.sessionToDeleteId = sessionId;
    this.showDeleteModal = true;
  }

  async deleteSession() {
    if (!this.sessionToDeleteId) {
      this.notificationService.warning('رقم الحصة غير صالح');
      return;
    }

    this.submitting = true;
    try {
      await this.sessionService.deleteSession(this.sessionToDeleteId);
      this.notificationService.success('تم حذف الحصة بنجاح');
      this.showDeleteModal = false;
      this.sessionToDeleteId = null;
      this.onClassChange();
    } catch (err: any) {
      console.error('Error deleting session', err);
      const errorMessage = err.error?.message || 'فشل في حذف الحصة';
      this.notificationService.error(errorMessage);
    } finally {
      this.submitting = false;
    }
  }
}
