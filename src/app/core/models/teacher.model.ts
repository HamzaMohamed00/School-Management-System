export interface Teacher {
    id: number;
    userId: string;
    fullName: string;
    email: string;
    phone?: string;
    address?: string;
    specialization?: string;
    bio?: string;
    isActive: boolean;
    avatar?: string;
    subjects?: string[];
    classes?: string[];
}
