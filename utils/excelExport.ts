import { EmployeeEntity, SectionEntity, GroupEntity, AttendanceRecordEntity, PrepaymentEntity } from '../types';
import * as ExcelJS from 'exceljs';
import { formatShortName } from './stringUtils';

export const generateEmployeeListExcel = async (
  employees: EmployeeEntity[],
  sections: SectionEntity[],
  groups: GroupEntity[]
) => {
    // Helper functions to resolve names
    const getSectionName = (id: string) => sections.find(s => s.id === id)?.name || '-';
    const getGroupName = (id: string) => groups.find(g => g.id === id)?.name || '-';

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Employees');

    // --- HEADING ---

    // Row 1: Main Title
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'DNS List of Employees';
    worksheet.mergeCells('A1:H1');
    titleCell.font = { name: 'Calibri', size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // Row 2: Generation Date
    const dateCell = worksheet.getCell('A2');
    dateCell.value = `Generated on: ${new Date().toLocaleString()}`;
    dateCell.font = { name: 'Calibri', size: 10 };

    // --- HEADERS ---

    // Row 4: Column Headers
    const headerRow = worksheet.getRow(4);
    headerRow.values = ["Emp No", "Full Name", "NIC", "Section", "Group", "Joined Date", "Phone", "Address"];
    
    headerRow.eachCell((cell) => {
        cell.font = { name: 'Calibri', size: 11, bold: true };
                cell.border = {
                    top: { style: 'medium' },
                    left: { style: 'medium' },
                    bottom: { style: 'medium' },
                    right: { style: 'medium' }
                };    });


    // --- DATA ROWS ---
    
    employees.forEach((emp, index) => {
        const rowIndex = index + 5; // Start data from row 5
        const row = worksheet.getRow(rowIndex);

        row.values = [
            emp.employeeNumber, 
            emp.fullName, 
            emp.nic, 
            getSectionName(emp.sectionId), 
            getGroupName(emp.groupId), 
            emp.joinedDate || '-', 
            emp.phoneNumber || '', 
            emp.address || ''
        ];

        row.eachCell((cell) => {
                    cell.border = {
                        top: { style: 'medium' },
                        left: { style: 'medium' },
                        bottom: { style: 'medium' },
                        right: { style: 'medium' }
                    };        });
    });

    // --- COLUMN WIDTHS ---

    worksheet.columns = [
        { key: 'empNo', width: 10 },
        { key: 'fullName', width: 30 },
        { key: 'nic', width: 15 },
        { key: 'section', width: 20 },
        { key: 'group', width: 20 },
        { key: 'joinedDate', width: 15 },
        { key: 'phone', width: 15 },
        { key: 'address', width: 40 }
    ];

    // --- FILE GENERATION ---

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `DNS_Employee_List_${new Date().toISOString().slice(0, 10)}.xlsx`;
    link.click();
};

export const generatePaymentDetailsExcel = async (
  attendanceRecord: Pick<AttendanceRecordEntity, 'attendanceData' | 'sectionId'>,
  paymentPeriod: string,
  employees: EmployeeEntity[],
  sections: SectionEntity[],
  groups: GroupEntity[],
  prepayments?: PrepaymentEntity[]
) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Payment Details');

    const [yearStr, monthStr] = paymentPeriod.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthStr);
    const { sectionId } = attendanceRecord;

    const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });
    const sectionName = sections.find(s => s.id === sectionId)?.name || 'Unknown Section';

    // --- VALIDATION PRE-CHECK ---
    for (const emp of employees) {
        const group = groups.find(g => g.id === emp.groupId);
        if (!group) {
            throw new Error(`Data integrity issue: Group not found for employee ${emp.fullName} (ID: ${emp.id}).`);
        }
        const salaryRecord = group.salaryHistory.find(s => s.month === paymentPeriod);
        if (!salaryRecord || !salaryRecord.amount) {
            throw new Error(`Salary for group '${group.name}' for ${monthName} ${year} is not set. Please update the group's salary history.`);
        }
    }

    // --- HEADING ---
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'DNS MANPOWER SUPPLIERS';
    worksheet.mergeCells('A1:N1');
    titleCell.font = { name: 'Calibri', size: 18, bold: true };
    titleCell.alignment = { horizontal: 'center' };

    const subtitleCell = worksheet.getCell('A2');
    subtitleCell.value = `PAYMENT DETAILS FOR EMPLOYEES (${monthName.toUpperCase()}) (${sectionName})`;
    worksheet.mergeCells('A2:N2');
    subtitleCell.font = { name: 'Calibri', size: 14, bold: true };
    subtitleCell.alignment = { horizontal: 'center' };

    // --- HEADERS ---
    const headerRow = worksheet.getRow(4);
    headerRow.values = [
        "EPF NO.", "NAME", "Shift Count", "Additional Shifts", "Salary Per Shift", 
        "Total Salary", "Total For ETF/EPF", "EPF 12%", "EPF 8%", "ETF 3%", 
        "Other", "Salary Advance", "After Deduction of EPF/ETF", "Signature"
    ];
    headerRow.font = { name: 'Calibri', size: 11, bold: true };
    headerRow.eachCell(cell => {
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });

    // --- DATA ROWS ---
    let currentRow = 5;
    employees.forEach(emp => {
        // Ensure empAttendance exists and has a daily property
        const empAttendance = attendanceRecord.attendanceData[emp.id];
        let dayCount = 0;
        let nightCount = 0;
        let dayHalfCount = 0;
        let nightHalfCount = 0;

        if (empAttendance && empAttendance.daily) {
            Object.values(empAttendance.daily).forEach(status => {
                if (status.day) dayCount++;
                if (status.night) nightCount++;
                if (status.dayHalf) dayHalfCount++;
                if (status.nightHalf) nightHalfCount++;
            });
        }
        
        const shiftCount = dayCount + nightCount + ((dayHalfCount + nightHalfCount) / 2);
        const additionalShiftCount = empAttendance?.additionalShifts || 0; 

        const group = groups.find(g => g.id === emp.groupId);
        const salaryRecord = group?.salaryHistory.find(s => s.month === `${year}-${String(month).padStart(2, '0')}`);
        const salaryPerShift = salaryRecord?.amount || 0;

        const totalSalary = (shiftCount + additionalShiftCount) * salaryPerShift;
        const epf12 = totalSalary * 0.12;
        const epf8 = totalSalary * 0.08;
        const etf3 = totalSalary * 0.03;
        
        // Calculate prepayments for this employee and payment period
        let salaryAdvance = 0;
        let otherDeductions = 0;
        
        if (prepayments) {
            const employeePrepayments = prepayments.filter(p => 
                p.employeeId === emp.id && p.month === paymentPeriod
            );
            
            employeePrepayments.forEach(prep => {
                if (prep.type === 'salary_advance') {
                    salaryAdvance += prep.amount;
                } else if (prep.type === 'other') {
                    otherDeductions += prep.amount;
                }
            });
        }
        
        const netSalary = totalSalary - (epf12 + epf8 + etf3 + otherDeductions + salaryAdvance);
        
        const row = worksheet.getRow(currentRow);
        row.values = [
            emp.employeeNumber,
            formatShortName(emp.fullName),
            shiftCount,
            additionalShiftCount, // Additional Shifts column
            salaryPerShift,
            totalSalary,
            "", // Total for ETF/EPF is blank
            epf12,
            epf8,
            etf3,
            otherDeductions,
            salaryAdvance,
            netSalary,
            "" // Signature is blank
        ];
        
        row.eachCell(cell => {
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        });

        currentRow++;
    });

    // --- FOOTER ---
    const footerNotes = [
        "※ No deductions from employees total salary shall be made other than EPF/ETF amount and stamp duty deductions.",
        "※ All employees must sign this document infront of the respresentatives from contractor and CEB.",
        "※ Total EPF and ETF banked for the month shall match the deposited amounts."
    ];
    
    footerNotes.forEach(note => {
        const row = worksheet.getRow(currentRow++);
        worksheet.mergeCells(`A${row.number}:N${row.number}`);
        row.getCell('A').value = note;
        row.getCell('A').font = { name: 'Calibri', size: 10 };
    });
    
    currentRow++; // Add a blank line

    const signatureRow = worksheet.getRow(currentRow);
    worksheet.mergeCells(`A${currentRow}:G${currentRow}`);
    signatureRow.getCell('A').value = "Contractor Representative: ........................";
    worksheet.mergeCells(`H${currentRow}:N${currentRow}`);
    signatureRow.getCell('H').value = "CEB Representative: ........................";
    signatureRow.font = { name: 'Calibri', size: 10 };


    // --- COLUMN WIDTHS ---
    worksheet.columns = [
        { width: 10 }, { width: 25 }, { width: 10 }, { width: 10 }, { width: 12 },
        { width: 12 }, { width: 12 }, { width: 10 }, { width: 10 }, { width: 10 },
        { width: 10 }, { width: 12 }, { width: 18 }, { width: 18 }
    ];

    // --- FILE GENERATION ---
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Payment_Details_${sectionName}_${year}-${month}.xlsx`;
    link.click();
};