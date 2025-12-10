
export interface SectionEntity {
  id: string; // UUID
  name: string;
  codeId: string; // Lowercase, underscores only
}

export interface SalaryRecord {
  month: string; // YYYY-MM
  amount: number;
}

export interface GroupEntity {
  id: string; // UUID
  name: string;
  codeId: string; // Lowercase, underscores only
  sectionId: string; // Foreign key to SectionEntity
  
  // Deprecated single value fields (kept for backward compatibility during migration)
  basicSalary?: number;
  salaryDate?: string; 

  // New Structure
  salaryHistory: SalaryRecord[];
}

export interface EmployeeEntity {
  id: string; // UUID
  fullName: string;
  nic: string; // Unique Identifier
  employeeNumber: string; // Unique Identifier
  phoneNumber: string;
  address: string;
  sectionId: string;
  groupId: string;
  joinedDate?: string; // New field for Joined Date
}


export interface AttendanceStatus {
  day: boolean;
  night: boolean;
  dayHalf: boolean;
  nightHalf: boolean;
}

// New interface for individual employee attendance data
export interface EmployeeAttendance {
  daily: { [day: number]: AttendanceStatus };
  additionalShifts?: number;
}

// Updated AttendanceData type
export type AttendanceData = {
  [employeeId: string]: EmployeeAttendance;
};

export interface AttendanceRecordEntity {
  id: string; // UUID, format: YYYY-MM-sectionId
  year: number;
  month: number;
  sectionId: string;
  attendanceData: AttendanceData;
}

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export interface MysqlConfig {
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
}

export interface RecaptchaConfig {
  siteKey?: string;
  secretKey?: string;
  enabled?: boolean;
}

export interface AppConfig {
  dbType: 'firebase' | 'mysql';
  mysqlConfig?: MysqlConfig;
  firebaseConfig?: FirebaseConfig;
  recaptchaConfig?: RecaptchaConfig;
  administratorEmail?: string; // Email that gets full access regardless of roles
}

export type ModalMode = 'create' | 'edit' | 'view';

// User Management Types
export interface AppUser {
  id: string; // Firebase UID
  email: string;
  displayName?: string;
  roleId?: string; // Reference to RoleEntity (optional - user may not have a role)
  createdAt: string; // ISO date string
  updatedAt?: string; // ISO date string
  isActive: boolean;
}

// Role and Permission Types
export type PermissionLevel = 'none' | 'view' | 'edit';

export interface PagePermission {
  pageId: string; // e.g., 'dashboard', 'employees', 'attendance', etc.
  permission: PermissionLevel;
}

export interface RoleEntity {
  id: string; // UUID
  name: string;
  description?: string;
  permissions: PagePermission[];
  hasMasterPermissions?: boolean; // If true, users with this role can manage all users, roles, and system configurations
  createdAt: string; // ISO date string
  updatedAt?: string; // ISO date string
}

// 2FA Types (user-specific)
export interface User2FA {
  userId: string; // Firebase UID
  secret: string; // 2FA secret
  enabled: boolean;
  createdAt: string; // ISO date string
}
