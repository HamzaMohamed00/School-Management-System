import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClassRoomService } from '../../../../core/services/classroom.service';
import { GradeService } from '../../../../core/services/grade.service';
import { ClassRoom } from '../../../../core/models/class.model';
import { GradeLevel } from '../../../../core/models/grade.model';

@Component({
    selector: 'app-class-management',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './class-management.component.html',
    styleUrls: ['./class-management.component.css']
})
export class ClassManagementComponent implements OnInit {
    classes: ClassRoom[] = [];
    grades: GradeLevel[] = [];
    loading = false;
    submitting = false;
    showModal = false;
    isEditMode = false;
    currentClass: any = { name: '', gradeLevelId: null, capacity: 30 };

    constructor(
        private classService: ClassRoomService,
        private gradeService: GradeService
    ) { }

    async ngOnInit() {
        await Promise.all([this.loadClasses(), this.loadGrades()]);
    }

    async loadClasses() {
        this.loading = true;
        try {
            this.classes = await this.classService.getAll();
        } catch (err) {
            console.error('Failed to load classes', err);
        } finally {
            this.loading = false;
        }
    }

    async loadGrades() {
        try {
            this.grades = await this.gradeService.getGrades();
        } catch { }
    }

    openAddModal() {
        this.isEditMode = false;
        this.currentClass = { name: '', gradeLevelId: this.grades[0]?.id || null, capacity: 30 };
        this.showModal = true;
    }

    openEditModal(item: ClassRoom) {
        this.isEditMode = true;
        this.currentClass = { ...item };
        this.showModal = true;
    }

    async saveClass() {
        this.submitting = true;
        try {
            if (this.isEditMode) {
                await this.classService.update(this.currentClass.id, this.currentClass);
            } else {
                await this.classService.create(this.currentClass);
            }
            await this.loadClasses();
            this.showModal = false;
        } catch (err: any) {
            alert('خطأ في الحفظ');
        } finally {
            this.submitting = false;
        }
    }

    async deleteClass(id: number) {
        if (!confirm('حذف الفضل؟')) return;
        try {
            await this.classService.delete(id);
            this.classes = this.classes.filter(c => c.id !== id);
        } catch { }
    }

    getGradeName(id: number): string {
        return this.grades.find(g => g.id === id)?.name || 'غير محدد';
    }
}
