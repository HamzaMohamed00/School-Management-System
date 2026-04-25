// core/services/exam.service.ts
import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Exam } from '../models/exam.model';

@Injectable({
  providedIn: 'root'
})
export class ExamService {
  constructor(private api: ApiService) { }

  async getExams(): Promise<Exam[]> {
    return this.api.get<Exam[]>('/api/Exam');
  }

  async getExamDetails(id: number): Promise<Exam> {
    return this.api.get<Exam>(`/api/Exam/${id}`);
  }

  async getTeacherExams(): Promise<Exam[]> {
    return this.api.get<Exam[]>('/api/Exam/teacher');
  }

  async getStudentExams(): Promise<Exam[]> {
    return this.api.get<Exam[]>('/api/Exam/student');
  }

  async getClassExams(classId: number): Promise<Exam[]> {
    return this.api.get<Exam[]>(`/api/Exam/classroom/${classId}`);
  }

  async createExam(data: any): Promise<Exam> {
    return this.api.post<Exam>('/api/Exam/create', data);
  }

  async updateExam(id: number, data: any): Promise<Exam> {
    return this.api.put<Exam>(`/api/Exam/${id}`, data);
  }

  async deleteExam(id: number): Promise<void> {
    return this.api.delete(`/api/Exam/${id}`);
  }

  async getExamForStudent(id: number): Promise<Exam> {
    return this.api.get<Exam>(`/api/Exam/${id}/take`);
  }

  async submitExam(id: number, answers: any[]): Promise<any> {
    return this.api.post(`/api/Exam/${id}/submit`, { answers });
  }

  async getExamResults(examId: number): Promise<any> {
    return this.api.get(`/api/Exam/${examId}/results`);
  }

  async getStudentResults(studentId: number): Promise<any> {
    return this.api.get(`/api/Exam/student/${studentId}/results`);
  }

  async getStudentExamResult(examId: number): Promise<any> {
    return this.api.get(`/api/Exam/${examId}/student-result`);
  }
}