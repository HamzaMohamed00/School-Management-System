export interface Grade {
    id: number;
    studentId: number;
    studentName?: string;
    subjectId: number;
    subjectName?: string;
    subject?: string; // Alias for subjectName
    value: number;
    score: number; // Alias for value
    term: string;
    examName?: string;
    date: string;
    remarks?: string;
}

export interface GradeLevel {
    id: number;
    name: string;
    description?: string;
    studentCount?: number;
}
