import { 
  type User, 
  type InsertUser, 
  type Store, 
  type InsertStore,
  type Attendance,
  type InsertAttendance,
  type Sales,
  type InsertSales,
  type Cashflow,
  type InsertCashflow,
  type Payroll,
  type InsertPayroll,
  type Proposal,
  type InsertProposal,
  type Overtime,
  type InsertOvertime
} from "@shared/schema";
import { randomUUID } from "crypto";
import session from "express-session";
import createMemoryStore from "memorystore";
import { Store as SessionStore } from "express-session";
import { hashPassword } from "./auth";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Store methods
  getStore(id: number): Promise<Store | undefined>;
  getStores(): Promise<Store[]>;
  createStore(store: InsertStore): Promise<Store>;
  
  // Attendance methods
  getAttendance(id: string): Promise<Attendance | undefined>;
  getAttendanceByStore(storeId: number, date?: string): Promise<Attendance[]>;
  getAttendanceByUser(userId: string): Promise<Attendance[]>;
  createAttendance(attendance: InsertAttendance): Promise<Attendance>;
  updateAttendanceStatus(id: string, status: string): Promise<Attendance | undefined>;
  
  // Sales methods
  getSales(id: string): Promise<Sales | undefined>;
  getSalesByStore(storeId: number, startDate?: string, endDate?: string): Promise<Sales[]>;
  createSales(sales: InsertSales): Promise<Sales>;
  
  // Cashflow methods
  getCashflow(id: string): Promise<Cashflow | undefined>;
  getCashflowByStore(storeId: number): Promise<Cashflow[]>;
  createCashflow(cashflow: InsertCashflow): Promise<Cashflow>;
  
  // Payroll methods
  getPayroll(id: string): Promise<Payroll | undefined>;
  getPayrollByUser(userId: string): Promise<Payroll[]>;
  getAllPayroll(): Promise<Payroll[]>;
  createPayroll(payroll: InsertPayroll): Promise<Payroll>;
  updatePayrollStatus(id: string, status: string): Promise<Payroll | undefined>;
  
  // Proposal methods
  getProposal(id: string): Promise<Proposal | undefined>;
  getProposalsByStore(storeId: number): Promise<Proposal[]>;
  getAllProposals(): Promise<Proposal[]>;
  createProposal(proposal: InsertProposal): Promise<Proposal>;
  updateProposalStatus(id: string, status: string, reviewedBy: string): Promise<Proposal | undefined>;
  
  // Overtime methods
  getOvertime(id: string): Promise<Overtime | undefined>;
  getOvertimeByStore(storeId: number): Promise<Overtime[]>;
  getAllOvertime(): Promise<Overtime[]>;
  createOvertime(overtime: InsertOvertime): Promise<Overtime>;
  updateOvertimeStatus(id: string, status: string, approvedBy: string): Promise<Overtime | undefined>;
  
  sessionStore: SessionStore;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private stores: Map<number, Store>;
  private attendanceRecords: Map<string, Attendance>;
  private salesRecords: Map<string, Sales>;
  private cashflowRecords: Map<string, Cashflow>;
  private payrollRecords: Map<string, Payroll>;
  private proposalRecords: Map<string, Proposal>;
  private overtimeRecords: Map<string, Overtime>;
  public sessionStore: SessionStore;

  constructor() {
    this.users = new Map();
    this.stores = new Map();
    this.attendanceRecords = new Map();
    this.salesRecords = new Map();
    this.cashflowRecords = new Map();
    this.payrollRecords = new Map();
    this.proposalRecords = new Map();
    this.overtimeRecords = new Map();
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
    
    // Initialize with sample stores
    this.initializeSampleData();
  }

  private async initializeSampleData() {
    // Create sample stores
    const store1: Store = {
      id: 1,
      name: "Main Store",
      address: "123 Main Street",
      createdAt: new Date(),
    };
    const store2: Store = {
      id: 2,
      name: "Branch Store",
      address: "456 Branch Avenue",
      createdAt: new Date(),
    };
    
    this.stores.set(1, store1);
    this.stores.set(2, store2);

    // Create default accounts
    // Manager account
    const managerPassword = await hashPassword("manager123");
    const manager: User = {
      id: randomUUID(),
      email: "manager@spbu.com",
      password: managerPassword,
      name: "SPBU Manager",
      role: "manager",
      storeId: 1,
      createdAt: new Date()
    };
    this.users.set(manager.id, manager);

    // Administrator account
    const adminPassword = await hashPassword("admin123");
    const admin: User = {
      id: randomUUID(),
      email: "admin@spbu.com",
      password: adminPassword,
      name: "SPBU Administrator",
      role: "administrasi",
      storeId: null,
      createdAt: new Date()
    };
    this.users.set(admin.id, admin);
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id, 
      storeId: insertUser.storeId ?? null,
      createdAt: new Date() 
    };
    this.users.set(id, user);
    return user;
  }

  // Store methods
  async getStore(id: number): Promise<Store | undefined> {
    return this.stores.get(id);
  }

  async getStores(): Promise<Store[]> {
    return Array.from(this.stores.values());
  }

  async createStore(insertStore: InsertStore): Promise<Store> {
    const store: Store = { 
      ...insertStore, 
      address: insertStore.address ?? null,
      createdAt: new Date() 
    };
    this.stores.set(store.id, store);
    return store;
  }

  // Attendance methods
  async getAttendance(id: string): Promise<Attendance | undefined> {
    return this.attendanceRecords.get(id);
  }

  async getAttendanceByStore(storeId: number, date?: string): Promise<Attendance[]> {
    return Array.from(this.attendanceRecords.values()).filter(
      (record) => {
        const matchesStore = record.storeId === storeId;
        if (!date) return matchesStore;
        
        const recordDate = record.date?.toISOString().split('T')[0];
        return matchesStore && recordDate === date;
      }
    );
  }

  async getAttendanceByUser(userId: string): Promise<Attendance[]> {
    return Array.from(this.attendanceRecords.values()).filter(
      (record) => record.userId === userId
    );
  }

  async createAttendance(insertAttendance: InsertAttendance): Promise<Attendance> {
    const id = randomUUID();
    const record: Attendance = { 
      ...insertAttendance, 
      id,
      date: insertAttendance.date ?? null,
      checkIn: insertAttendance.checkIn ?? null,
      checkOut: insertAttendance.checkOut ?? null,
      breakDuration: insertAttendance.breakDuration ?? null,
      overtime: insertAttendance.overtime ?? null,
      notes: insertAttendance.notes ?? null,
      status: "pending",
      createdAt: new Date() 
    };
    this.attendanceRecords.set(id, record);
    return record;
  }

  async updateAttendanceStatus(id: string, status: string): Promise<Attendance | undefined> {
    const record = this.attendanceRecords.get(id);
    if (record) {
      const updated = { ...record, status };
      this.attendanceRecords.set(id, updated);
      return updated;
    }
    return undefined;
  }

  // Sales methods
  async getSales(id: string): Promise<Sales | undefined> {
    return this.salesRecords.get(id);
  }

  async getSalesByStore(storeId: number, startDate?: string, endDate?: string): Promise<Sales[]> {
    return Array.from(this.salesRecords.values()).filter((record) => {
      if (record.storeId !== storeId) return false;
      
      if (startDate || endDate) {
        const recordDate = record.date?.toISOString().split('T')[0];
        if (startDate && recordDate && recordDate < startDate) return false;
        if (endDate && recordDate && recordDate > endDate) return false;
      }
      
      return true;
    });
  }

  async createSales(insertSales: InsertSales): Promise<Sales> {
    const id = randomUUID();
    const record: Sales = { 
      ...insertSales, 
      id,
      date: insertSales.date ?? null,
      averageTicket: insertSales.averageTicket ?? null,
      createdAt: new Date() 
    };
    this.salesRecords.set(id, record);
    return record;
  }

  // Cashflow methods
  async getCashflow(id: string): Promise<Cashflow | undefined> {
    return this.cashflowRecords.get(id);
  }

  async getCashflowByStore(storeId: number): Promise<Cashflow[]> {
    return Array.from(this.cashflowRecords.values()).filter(
      (record) => record.storeId === storeId
    );
  }

  async createCashflow(insertCashflow: InsertCashflow): Promise<Cashflow> {
    const id = randomUUID();
    const record: Cashflow = { 
      ...insertCashflow, 
      id,
      description: insertCashflow.description ?? null,
      date: insertCashflow.date ?? null,
      createdAt: new Date() 
    };
    this.cashflowRecords.set(id, record);
    return record;
  }

  // Payroll methods
  async getPayroll(id: string): Promise<Payroll | undefined> {
    return this.payrollRecords.get(id);
  }

  async getPayrollByUser(userId: string): Promise<Payroll[]> {
    return Array.from(this.payrollRecords.values()).filter(
      (record) => record.userId === userId
    );
  }

  async getAllPayroll(): Promise<Payroll[]> {
    return Array.from(this.payrollRecords.values());
  }

  async createPayroll(insertPayroll: InsertPayroll): Promise<Payroll> {
    const id = randomUUID();
    const record: Payroll = { 
      ...insertPayroll, 
      id,
      overtimePay: insertPayroll.overtimePay ?? null,
      status: "pending",
      paidAt: null,
      createdAt: new Date() 
    };
    this.payrollRecords.set(id, record);
    return record;
  }

  async updatePayrollStatus(id: string, status: string): Promise<Payroll | undefined> {
    const record = this.payrollRecords.get(id);
    if (record) {
      const updated = { 
        ...record, 
        status,
        paidAt: status === 'paid' ? new Date() : record.paidAt
      };
      this.payrollRecords.set(id, updated);
      return updated;
    }
    return undefined;
  }

  // Proposal methods
  async getProposal(id: string): Promise<Proposal | undefined> {
    return this.proposalRecords.get(id);
  }

  async getProposalsByStore(storeId: number): Promise<Proposal[]> {
    return Array.from(this.proposalRecords.values()).filter(
      (record) => record.storeId === storeId
    );
  }

  async getAllProposals(): Promise<Proposal[]> {
    return Array.from(this.proposalRecords.values());
  }

  async createProposal(insertProposal: InsertProposal): Promise<Proposal> {
    const id = randomUUID();
    const record: Proposal = { 
      ...insertProposal, 
      id,
      estimatedCost: insertProposal.estimatedCost ?? null,
      status: "pending",
      reviewedBy: null,
      reviewedAt: null,
      createdAt: new Date() 
    };
    this.proposalRecords.set(id, record);
    return record;
  }

  async updateProposalStatus(id: string, status: string, reviewedBy: string): Promise<Proposal | undefined> {
    const record = this.proposalRecords.get(id);
    if (record) {
      const updated = { 
        ...record, 
        status,
        reviewedBy,
        reviewedAt: new Date()
      };
      this.proposalRecords.set(id, updated);
      return updated;
    }
    return undefined;
  }

  // Overtime methods
  async getOvertime(id: string): Promise<Overtime | undefined> {
    return this.overtimeRecords.get(id);
  }

  async getOvertimeByStore(storeId: number): Promise<Overtime[]> {
    return Array.from(this.overtimeRecords.values()).filter(
      (record) => record.storeId === storeId
    );
  }

  async getAllOvertime(): Promise<Overtime[]> {
    return Array.from(this.overtimeRecords.values());
  }

  async createOvertime(insertOvertime: InsertOvertime): Promise<Overtime> {
    const id = randomUUID();
    const record: Overtime = { 
      ...insertOvertime, 
      id,
      status: "pending",
      approvedBy: null,
      approvedAt: null,
      createdAt: new Date() 
    };
    this.overtimeRecords.set(id, record);
    return record;
  }

  async updateOvertimeStatus(id: string, status: string, approvedBy: string): Promise<Overtime | undefined> {
    const record = this.overtimeRecords.get(id);
    if (record) {
      const updated = { 
        ...record, 
        status,
        approvedBy,
        approvedAt: new Date()
      };
      this.overtimeRecords.set(id, updated);
      return updated;
    }
    return undefined;
  }
}

export const storage = new MemStorage();
