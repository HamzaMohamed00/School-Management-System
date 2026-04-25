import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SubjectService } from '../../../../core/services/subject.service';
import { Subject } from '../../../../core/models/subject.model';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
    selector: 'app-subject-management',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './subject-management.component.html',
    styleUrls: ['./subject-management.component.css']
})
export class SubjectManagementComponent implements OnInit {
    subjects: Subject[] = [];
    loading = false;
    submitting = false;
    showModal = false;
    isEditMode = false;
    currentSubject: any = { name: '', code: '', description: '', creditHours: 1 };
    confirmingDeleteId: number | null = null;

    constructor(
        private subjectService: SubjectService,
        private notification: NotificationService
    ) { }

    async ngOnInit() {
        await this.loadSubjects();
    }


    async loadSubjects() {
        this.loading = true;
        try {
            this.subjects = await this.subjectService.getAll();
        } catch { }
        finally { this.loading = false; }
    }

    openAddModal() {
        this.isEditMode = false;
        this.currentSubject = { name: '', code: '', description: '', creditHours: 1 };
        this.showModal = true;
    }

    openEditModal(item: Subject) {
        this.isEditMode = true;
        this.currentSubject = { ...item };
        this.showModal = true;
    }

    async saveSubject() {
        this.submitting = true;
        try {
            if (this.isEditMode) {
                await this.subjectService.update(this.currentSubject.id, this.currentSubject);
            } else {
                await this.subjectService.create(this.currentSubject);
            }
            await this.loadSubjects();
            this.showModal = false;
            this.notification.success(this.isEditMode ? 'تم تحديث المادة بنجاح' : 'تم إضافة المادة بنجاح');
        } catch (error: any) {
            console.error('Save error:', error);
        } finally {
            this.submitting = false;
        }
    }

    async deleteSubject(event: Event, id: number) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }

        if (this.confirmingDeleteId === id) {
            this.submitting = true;
            try {
                await this.subjectService.delete(id);
                this.notification.success('تم حذف المادة بنجاح');
                this.confirmingDeleteId = null;
                await this.loadSubjects();
            } catch (error: any) {
                console.error('Delete error:', error);
            } finally {
                this.submitting = false;
            }
        } else {
            this.confirmingDeleteId = id;
            // Auto cancel after 5 seconds
            setTimeout(() => {
                if (this.confirmingDeleteId === id) {
                    this.confirmingDeleteId = null;
                }
            }, 5000);
        }
    }

    cancelDelete(event: Event) {
        event.stopPropagation();
        this.confirmingDeleteId = null;
    }
}
