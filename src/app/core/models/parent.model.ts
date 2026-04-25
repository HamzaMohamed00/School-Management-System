export interface Parent {
    id: number;
    userId: string;
    fullName: string;
    email: string;
    phone: string;
    address?: string;
    childrenCount?: number;
}
