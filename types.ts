
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

export type ModalMode = 'create' | 'edit' | 'view';
