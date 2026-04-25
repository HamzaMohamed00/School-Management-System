import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

export interface Assignment {
    id?: number;
    title: string;
    description: string;
    dueDate: Date;
    subjectId: number;
    subjectName?: string;
    classRoomId?: number;
    classRoomName?: string;
    attachmentUrl?: string;
    isSubmitted?: boolean;
    submissionCount?: number;
}

export interface AssignmentSubmission {
    id?: number;
    assignmentId: number;
    studentId?: number;
    submissionDate?: Date;
    fileUrl: string;
    studentNotes?: string;
    grade?: number;
    teacherFeedback?: string;
}

@Injectable({
    providedIn: 'root'
})
export class AssignmentService {
    constructor(private api: ApiService) { }

    async getAssignments(): Promise<Assignment[]> {
        return this.api.get<Assignment[]>('/api/Assignment');
    }

    async createAssignment(assignment: Assignment): Promise<Assignment> {
        return this.api.post<Assignment>('/api/Assignment', assignment);
    }

    async submitAssignment(submission: AssignmentSubmission): Promise<any> {
        return this.api.post('/api/Assignment/submit', submission);
    }

    async getSubmissions(assignmentId: number): Promise<AssignmentSubmission[]> {
        return this.api.get<AssignmentSubmission[]>(`/api/Assignment/${assignmentId}/submissions`);
    }

    async deleteAssignment(assignmentId: number): Promise<any> {
        return this.api.delete(`/api/Assignment/${assignmentId}`);
    }
}
