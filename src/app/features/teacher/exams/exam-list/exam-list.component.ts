import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ExamService } from '../../../../core/services/exam.service';
import { ClassRoomService } from '../../../../core/services/classroom.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Exam } from '../../../../core/models/exam.model';
import { ClassRoom } from '../../../../core/models/class.model';

@Component({
    selector: 'app-exam-list',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule],
    templateUrl: './exam-list.component.html',
    styleUrls: ['./exam-list.component.css']
})
export class ExamListComponent implements OnInit {
    exams: Exam[] = [];
    filteredExams: Exam[] = [];
    classes: ClassRoom[] = [];
    loading = false;
    searchTerm = '';
    selectedStatus = 'all';
    selectedClass = 'all';

    // Stats
    get totalExams() { return this.exams.length; }
    get upcomingCount() { return this.exams.filter(e => this.computeStatus(e) === 'upcoming').length; }
    get activeCount() { return this.exams.filter(e => this.computeStatus(e) === 'active').length; }
    get pastCount() { return this.exams.filter(e => this.computeStatus(e) === 'past').length; }

    constructor(
        private examService: ExamService,
        private classService: ClassRoomService,
        private notification: NotificationService,
        private router: Router
    ) { }

    async ngOnInit() {
        await Promise.all([this.loadExams(), this.loadClasses()]);
    }

    async loadExams() {
        this.loading = true;
        try {
            this.exams = await this.examService.getTeacherExams();
            this.applyFilters();
        } catch (err) {
            this.notification.error('حدث خطأ في تحميل الاختبارات');
        } finally {
            this.loading = false;
        }
    }

    async loadClasses() {
        try {
            this.classes = await this.classService.getTeacherClasses();
        } catch { }
    }

    applyFilters() {
        this.filteredExams = this.exams.filter(exam => {
            const matchesSearch = !this.searchTerm ||
                exam.title.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                (exam.subject?.name ?? '').toLowerCase().includes(this.searchTerm.toLowerCase());

            const computedStatus = this.computeStatus(exam);
            const matchesStatus = this.selectedStatus === 'all' || computedStatus === this.selectedStatus;
            const matchesClass = this.selectedClass === 'all' || exam.classRoomId?.toString() === this.selectedClass;

            return matchesSearch && matchesStatus && matchesClass;
        });
    }

    computeStatus(exam: Exam): string {
        if (!exam.startTime || !exam.endTime) return 'upcoming';
        const now = new Date();
        const startDt = new Date(exam.startTime);
        const endDt = new Date(exam.endTime);

        if (now >= startDt && now <= endDt) return 'active';
        if (now > endDt) return 'past';
        return 'upcoming';
    }

    getDurationInfo(exam: Exam): number {
        if (!exam.startTime || !exam.endTime) return 0;
        const diffMs = new Date(exam.endTime).getTime() - new Date(exam.startTime).getTime();
        return Math.round(diffMs / 60000);
    }

    getStatusBadge(exam: Exam): { text: string; cls: string; icon: string } {
        const status = this.computeStatus(exam);
        switch (status) {
            case 'active':  return { text: 'جاري الآن', cls: 'status-active',   icon: 'fas fa-circle-dot' };
            case 'past':    return { text: 'منتهي',     cls: 'status-past',     icon: 'fas fa-check-circle' };
            default:        return { text: 'قادم',      cls: 'status-upcoming', icon: 'fas fa-clock' };
        }
    }

    formatDate(dateStr: string): string {
        if (!dateStr) return '—';
        const d = new Date(dateStr);
        return d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
    }

    formatTime(timeStr?: string): string {
        if (!timeStr) return '—';
        // timeStr might be "HH:mm" or full datetime
        if (timeStr.includes('T')) {
            const d = new Date(timeStr);
            return d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
        }
        return timeStr;
    }

    onCreateExam() {
        this.router.navigate(['/teacher/exams/create']);
    }

    onEditExam(exam: Exam) {
        this.router.navigate(['/teacher/exams/edit', exam.id]);
    }

    async onDeleteExam(exam: Exam) {
        if (!confirm(`هل أنت متأكد من حذف الاختبار: "${exam.title}"؟`)) return;
        try {
            await this.examService.deleteExam(exam.id);
            this.exams = this.exams.filter(e => e.id !== exam.id);
            this.applyFilters();
            this.notification.success('تم حذف الاختبار بنجاح');
        } catch {
            this.notification.error('خطأ في حذف الاختبار');
        }
    }

    onViewResults(exam: Exam) {
        this.router.navigate(['/teacher/exams/results', exam.id]);
    }
}
