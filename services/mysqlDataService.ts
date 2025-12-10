import { SectionEntity, GroupEntity, EmployeeEntity, AttendanceRecordEntity, FirebaseConfig, MysqlConfig, PrepaymentEntity } from '../types';

const API_URL = 'http://localhost:3001/api';

const request = async <T>(url: string, options?: RequestInit): Promise<T> => {
    try {
    const response = await fetch(url, options);
    if (!response.ok) {
            let errorMessage = 'An unknown error occurred';
            try {
                const error = await response.json();
                errorMessage = error.message || errorMessage;
            } catch {
                errorMessage = `Server responded with status ${response.status}`;
            }
            throw new Error(errorMessage);
    }
        // Handle responses that might be empty or have different content types
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const text = await response.text();
            if (text && text.trim()) {
                return JSON.parse(text);
            }
        }
        // For DELETE requests that return 200 OK with no body, return empty object
        return {} as T;
    } catch (error: any) {
        console.error('Request error:', url, error);
        throw error;
    }
};

export const getSections = (): Promise<SectionEntity[]> => request(`${API_URL}/sections`);

export const saveSection = (section: SectionEntity): Promise<any> => {
    return request(`${API_URL}/sections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(section),
    });
};

export const deleteSection = (id: string): Promise<any> => {
    return request(`${API_URL}/sections/${id}`, { method: 'DELETE' });
};

export const getGroups = (): Promise<GroupEntity[]> => request(`${API_URL}/groups`);

export const saveGroup = (group: GroupEntity): Promise<any> => {
    return request(`${API_URL}/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(group),
    });
};

export const deleteGroup = (id: string): Promise<any> => {
    return request(`${API_URL}/groups/${id}`, { method: 'DELETE' });
};

export const getEmployees = (): Promise<EmployeeEntity[]> => request(`${API_URL}/employees`);

export const getEmployeesBySection = (sectionId: string): Promise<EmployeeEntity[]> => {
    return request(`${API_URL}/employees/section/${sectionId}`);
};

export const saveEmployee = (employee: EmployeeEntity): Promise<any> => {
    return request(`${API_URL}/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(employee),
    });
};

export const deleteEmployee = (id: string): Promise<any> => {
    return request(`${API_URL}/employees/${id}`, { method: 'DELETE' });
};

export const getAttendanceRecords = (): Promise<AttendanceRecordEntity[]> => request(`${API_URL}/attendance-records`);

export const getAttendanceRecord = (id: string): Promise<AttendanceRecordEntity> => {
    return request(`${API_URL}/attendance-record/${id}`);
};

export const saveAttendanceRecord = (record: AttendanceRecordEntity): Promise<any> => {
    return request(`${API_URL}/attendance-records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
    });
};

export const deleteAttendanceRecord = (id: string): Promise<any> => {
    return request(`${API_URL}/attendance-records/${id}`, { method: 'DELETE' });
};

export const getPrepayments = (): Promise<PrepaymentEntity[]> => request(`${API_URL}/prepayments`);

export const savePrepayment = (prepayment: PrepaymentEntity): Promise<any> => {
    return request(`${API_URL}/prepayments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prepayment),
    });
};

export const deletePrepayment = async (id: string): Promise<void> => {
    await request(`${API_URL}/prepayments/${id}`, { method: 'DELETE' });
};

export const checkDatabaseConnection = async (config: MysqlConfig): Promise<{ success: boolean, message: string }> => {
    return request(`${API_URL}/test-mysql-connection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
    });
};

// Dummy function to satisfy the interface, not used in MySQL mode
export const getFirebaseConfig = (): FirebaseConfig => {
    return {
        apiKey: '',
        authDomain: '',
        projectId: '',
        storageBucket: '',
        messagingSenderId: '',
        appId: '',
    };
};
