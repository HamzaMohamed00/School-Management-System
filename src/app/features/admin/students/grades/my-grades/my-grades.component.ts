import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GradeService } from '../../../../../core/services/grade.service';
import { AuthService } from '../../../../../core/services/auth.service';
import { Grade } from '../../../../../core/models/grade.model';

export interface SubjectGrade {
  name: string;
  grades: any[];
  average: number;
  highest: number;
  lowest: number;
  classAverage?: number;
}

import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-my-grades',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './my-grades.component.html',
  styleUrls: ['./my-grades.component.css']
})
export class MyGradesComponent implements OnInit {
  grades: Grade[] = [];
  subjects: SubjectGrade[] = [];
  selectedSubject: string = 'all';
  selectedTerm: string = 'all';
  chartData: any;
  statistics: any;

  constructor(
    private gradeService: GradeService,
    private auth: AuthService
  ) {}

  async ngOnInit() {
    await this.loadGrades();
    this.prepareChartData();
    this.calculateStatistics();
  }

  async loadGrades(): Promise<void> {
    const user = this.auth.getCurrentUser();
    const studentId = typeof user?.id === 'string' ? parseInt(user.id) : (user?.id || 0);
    this.grades = await this.gradeService.getStudentGrades(studentId);
    this.processSubjects();
  }

  processSubjects(): void {
    const subjectMap = new Map<string, SubjectGrade>();
    
    this.grades.forEach(grade => {
      const subj = grade.subject || grade.subjectName || 'Unknown';
      if (!subjectMap.has(subj)) {
        subjectMap.set(subj, {
          name: subj,
          grades: [],
          average: 0,
          highest: 0,
          lowest: 100
        });
      }
      
      const subject = subjectMap.get(subj)!;
      subject.grades.push(grade);
      const score = grade.score || grade.value || 0;
      subject.average = subject.grades.reduce((sum, g) => sum + (g.score || g.value || 0), 0) / subject.grades.length;
      subject.highest = Math.max(subject.highest, score);
      subject.lowest = Math.min(subject.lowest, score);
    });
    
    this.subjects = Array.from(subjectMap.values());
  }

  prepareChartData(): void {
    this.chartData = {
      labels: this.subjects.map(s => s.name),
      datasets: [
        {
          label: 'درجاتك',
          data: this.subjects.map(s => s.average),
          backgroundColor: 'rgba(59, 130, 246, 0.5)',
          borderColor: '#3B82F6',
          borderWidth: 1
        },
        {
          label: 'متوسط الفصل',
          data: this.subjects.map(s => s.classAverage || 0),
          backgroundColor: 'rgba(16, 185, 129, 0.5)',
          borderColor: '#10B981',
          borderWidth: 1
        }
      ]
    };
  }

  calculateStatistics(): void {
    const allGrades = this.grades.map(g => g.score || g.value || 0);
    this.statistics = {
      total: this.grades.length,
      average: allGrades.length > 0 ? allGrades.reduce((a, b) => a + b, 0) / allGrades.length : 0,
      highest: allGrades.length > 0 ? Math.max(...allGrades) : 0,
      lowest: allGrades.length > 0 ? Math.min(...allGrades) : 0,
      passed: allGrades.filter(g => g >= 50).length,
      failed: allGrades.filter(g => g < 50).length
    };
  }

  get filteredGrades(): Grade[] {
    return this.grades.filter(grade => {
      const subj = grade.subject || grade.subjectName || 'Unknown';
      if (this.selectedSubject !== 'all' && subj !== this.selectedSubject) {
        return false;
      }
      if (this.selectedTerm !== 'all' && grade.term !== this.selectedTerm) {
        return false;
      }
      return true;
    });
  }

  getGradeClass(score: number): string {
    if (score >= 90) return 'excellent';
    if (score >= 80) return 'very-good';
    if (score >= 70) return 'good';
    if (score >= 60) return 'acceptable';
    if (score >= 50) return 'pass';
    return 'fail';
  }

  getGradeText(score: number): string {
    if (score >= 90) return 'ممتاز';
    if (score >= 80) return 'جيد جداً';
    if (score >= 70) return 'جيد';
    if (score >= 60) return 'مقبول';
    if (score >= 50) return 'ناجح';
    return 'راسب';
  }
}