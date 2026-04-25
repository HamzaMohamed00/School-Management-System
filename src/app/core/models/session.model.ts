export interface Session {
    id: number;
    subjectName?: string;
    subject?: string;
    className?: string;
    teacherName?: string;
    startTime: string;
    endTime: string;
    date?: string;
    isActive?: boolean;
    studentsCount?: number;
    classRoomId?: number;
}
