export interface Exam {
    id: number;
    title: string;
    description?: string;
    examType?: string;
    subjectId?: number;
    subject?: { id: number, name: string };
    subjectName?: string;
    classRoomId?: number;
    classRoom?: { id: number, name: string };
    classRoomName?: string;
    date?: string;
    startTime: string;
    endTime: string;
    duration?: number;
    maxScore: number;
    totalMarks?: number;
    passingMarks?: number;
    status?: string;
    questions?: any[];
    questionCount?: number;
    isCompleted?: boolean;
}
