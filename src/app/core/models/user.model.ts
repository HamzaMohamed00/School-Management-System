
// core/models/user.model.ts
export interface User {
  id?: string | number;
  teacherId?: number; // Added for database primary keys
  studentId?: number;
  parentId?: number;
  fullName?: string;
  email: string;
  phone?: string;
  avatar?: string;
  role: string;
  createdAt?: Date;
  lastLogin?: Date;
  sessionCount?: number;
  address?: string;
  permissions?: string[];
}


