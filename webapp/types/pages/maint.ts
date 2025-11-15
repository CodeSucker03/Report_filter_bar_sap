/* eslint-disable linebreak-style */
export interface LeaveRequestItem {
  CreatedAt: Date;
  Reason: string;
  RequestId: string;
  CreatedBy: string;
  EmployeeId: string;
  LeaveType: string;
  StartDate: string;
  EndDate: string;
  Status: string;
  TimeSlot: string;
}
export interface ValueHelpItem {
  FieldName: string,
  FieldKey: string,
  FieldValue: string
}

export interface LeaveRequestForm {
  LeaveType: string;
  StartDate: string;
  EndDate: string;
  Reason: string;
  TimeSlot: string;
  TimeSlotIndex: number;
}
