import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { 
  insertAttendanceSchema,
  insertCashflowSchema,
  insertProposalSchema,
  insertOvertimeSchema,
  insertSetoranSchema
} from "@shared/schema";

export function registerRoutes(app: Express): Server {
  // Setup authentication routes
  setupAuth(app);

  // Attendance routes
  app.post("/api/attendance", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });
      
      const data = insertAttendanceSchema.parse({
        ...req.body,
        userId: req.user.id,
        storeId: req.user.storeId,
      });
      
      const attendance = await storage.createAttendance(data);
      res.status(201).json(attendance);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/attendance", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });
      
      const { storeId, date } = req.query;
      
      let records;
      if (req.user.role === 'staff') {
        records = await storage.getAttendanceByUser(req.user.id);
      } else {
        const targetStoreId = storeId ? parseInt(storeId as string) : req.user.storeId;
        records = await storage.getAttendanceByStore(targetStoreId!, date as string);
      }
      
      res.json(records);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/overtime/:id/approve", async (req, res) => {
    try {
      if (!req.user || !['manager', 'administrasi'].includes(req.user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const overtime = await storage.updateOvertimeStatus(req.params.id, 'approved', req.user.id);
      if (!overtime) return res.status(404).json({ message: "Overtime not found" });
      
      res.json(overtime);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Sales routes
  app.get("/api/sales", async (req, res) => {
    try {
      if (!req.user || !['manager', 'administrasi'].includes(req.user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const { storeId, startDate, endDate } = req.query;
      let targetStoreId;
      
      if (req.user.role === 'manager') {
        // Managers can only see their assigned store unless specifically requested
        targetStoreId = storeId ? parseInt(storeId as string) : req.user.storeId;
      } else {
        // Administrators can access any store
        targetStoreId = storeId ? parseInt(storeId as string) : 1; // Default to store 1 for demo
      }
      
      const sales = await storage.getSalesByStore(
        targetStoreId!, 
        startDate as string, 
        endDate as string
      );
      
      res.json(sales);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/export/pdf", async (req, res) => {
    try {
      if (!req.user || !['manager', 'administrasi'].includes(req.user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Mock PDF export
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="sales-report.pdf"');
      res.send("PDF content would be generated here");
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/export/excel", async (req, res) => {
    try {
      if (!req.user || !['manager', 'administrasi'].includes(req.user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Mock Excel export
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="sales-report.xlsx"');
      res.send("Excel content would be generated here");
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Cashflow routes
  app.post("/api/cashflow", async (req, res) => {
    try {
      if (!req.user || !['manager', 'administrasi'].includes(req.user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const data = insertCashflowSchema.parse({
        ...req.body,
        storeId: req.user.storeId,
      });
      
      const cashflow = await storage.createCashflow(data);
      res.status(201).json(cashflow);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/cashflow", async (req, res) => {
    try {
      if (!req.user || !['manager', 'administrasi'].includes(req.user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      let cashflow;
      if (req.user.role === 'manager') {
        // Managers see cashflow for their assigned store
        cashflow = await storage.getCashflowByStore(req.user.storeId!);
      } else {
        // Administrators can see all cashflow - we'll need to implement getAllCashflow
        // For now, use store 1 as default for demo
        const { storeId } = req.query;
        const targetStoreId = storeId ? parseInt(storeId as string) : 1;
        cashflow = await storage.getCashflowByStore(targetStoreId);
      }
      
      res.json(cashflow);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Payroll routes
  app.post("/api/payroll/generate", async (req, res) => {
    try {
      if (!req.user || !['manager', 'administrasi'].includes(req.user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Generate payroll for all users (simplified)
      const users = Array.from((storage as any).users.values()).filter((u: any) => u.role === 'staff');
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
      
      const payrollPromises = users.map(async (user: any) => {
        const baseSalary = "3000.00"; // Default base salary
        const overtimePay = "240.00"; // Mock overtime calculation
        const totalAmount = (parseFloat(baseSalary) + parseFloat(overtimePay)).toString();
        
        return storage.createPayroll({
          userId: user.id,
          month: currentMonth,
          baseSalary,
          overtimePay,
          totalAmount,
        });
      });
      
      const payrolls = await Promise.all(payrollPromises);
      res.status(201).json(payrolls);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/payroll", async (req, res) => {
    try {
      if (!req.user || !['manager', 'administrasi'].includes(req.user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const payroll = await storage.getAllPayroll();
      res.json(payroll);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/payroll/:id/pay", async (req, res) => {
    try {
      if (!req.user || !['manager', 'administrasi'].includes(req.user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const payroll = await storage.updatePayrollStatus(req.params.id, 'paid');
      if (!payroll) return res.status(404).json({ message: "Payroll not found" });
      
      res.json(payroll);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Proposal routes
  app.post("/api/proposal", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });
      
      const data = insertProposalSchema.parse({
        ...req.body,
        userId: req.user.id,
        storeId: req.user.storeId,
      });
      
      const proposal = await storage.createProposal(data);
      res.status(201).json(proposal);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/proposals", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });
      
      let proposals;
      if (req.user.role === 'staff') {
        // Staff can only see proposals from their own store
        proposals = await storage.getProposalsByStore(req.user.storeId!);
      } else if (req.user.role === 'manager') {
        // Managers can see proposals from their assigned store
        proposals = await storage.getProposalsByStore(req.user.storeId!);
      } else if (req.user.role === 'administrasi') {
        // Administrators can see all proposals across all stores
        proposals = await storage.getAllProposals();
      } else {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      res.json(proposals);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/proposal/:id/approve", async (req, res) => {
    try {
      if (!req.user || !['manager', 'administrasi'].includes(req.user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const proposal = await storage.updateProposalStatus(req.params.id, 'approved', req.user.id);
      if (!proposal) return res.status(404).json({ message: "Proposal not found" });
      
      res.json(proposal);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/proposal/:id/reject", async (req, res) => {
    try {
      if (!req.user || !['manager', 'administrasi'].includes(req.user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const proposal = await storage.updateProposalStatus(req.params.id, 'rejected', req.user.id);
      if (!proposal) return res.status(404).json({ message: "Proposal not found" });
      
      res.json(proposal);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Overtime routes
  app.get("/api/overtime", async (req, res) => {
    try {
      if (!req.user || req.user.role !== 'administrasi') {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const overtime = await storage.getAllOvertime();
      res.json(overtime);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/overtime/:id", async (req, res) => {
    try {
      if (!req.user || req.user.role !== 'administrasi') {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const { status } = req.body;
      const overtime = await storage.updateOvertimeStatus(req.params.id, status, req.user.id);
      if (!overtime) return res.status(404).json({ message: "Overtime not found" });
      
      res.json(overtime);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Google Sheets sync route
  app.post("/api/store/:id/sync", async (req, res) => {
    try {
      if (!req.user || !['manager', 'administrasi'].includes(req.user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Mock Google Sheets sync
      res.json({ 
        message: "Sync completed successfully",
        syncedAt: new Date().toISOString(),
        recordsCount: 150
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Setoran routes
  app.post("/api/setoran", async (req, res) => {
    try {
      // Calculate all values
      const {
        employee_name,
        jam_masuk,
        jam_keluar,
        nomor_awal,
        nomor_akhir,
        qris_setoran,
        expenses,
        income
      } = req.body;

      // Calculate liter
      const total_liter = Math.max(0, nomor_akhir - nomor_awal);
      
      // Calculate setoran (1 liter = Rp 11.500)
      const total_setoran = total_liter * 11500;
      const cash_setoran = Math.max(0, total_setoran - qris_setoran);
      
      // Calculate expenses and income
      const total_expenses = expenses?.reduce((sum: number, item: any) => 
        sum + (Number(item.amount) || 0), 0) || 0;
      const total_income = income?.reduce((sum: number, item: any) => 
        sum + (Number(item.amount) || 0), 0) || 0;
      
      // Total keseluruhan = Cash + Pemasukan - Pengeluaran
      const total_keseluruhan = cash_setoran + total_income - total_expenses;
      
      const data = insertSetoranSchema.parse({
        employeeName: employee_name,
        jamMasuk: jam_masuk,
        jamKeluar: jam_keluar,
        nomorAwal: nomor_awal.toString(),
        nomorAkhir: nomor_akhir.toString(),
        totalLiter: total_liter.toString(),
        totalSetoran: total_setoran.toString(),
        qrisSetoran: qris_setoran.toString(),
        cashSetoran: cash_setoran.toString(),
        expensesData: JSON.stringify(expenses || []),
        totalExpenses: total_expenses.toString(),
        incomeData: JSON.stringify(income || []),
        totalIncome: total_income.toString(),
        totalKeseluruhan: total_keseluruhan.toString(),
      });
      
      const setoran = await storage.createSetoran(data);
      res.status(201).json(setoran);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/setoran", async (req, res) => {
    try {
      const setoranData = await storage.getAllSetoran();
      res.json(setoranData);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Dashboard stats
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });
      
      // Mock dashboard stats
      const stats = {
        totalSales: "$12,450",
        staffPresent: "8/10",
        pendingProposals: 3,
        monthlyCashflow: "+$2,340"
      };
      
      res.json(stats);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // User Management routes (Manager only)
  app.get("/api/users", async (req, res) => {
    try {
      if (!req.user || req.user.role !== 'manager') {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      if (!req.user || req.user.role !== 'manager') {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const { hashPassword } = await import("./auth");
      const userData = {
        ...req.body,
        password: await hashPassword(req.body.password),
      };
      
      const user = await storage.createUser(userData);
      res.status(201).json(user);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/users/:id", async (req, res) => {
    try {
      if (!req.user || req.user.role !== 'manager') {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const { id } = req.params;
      const updateData = req.body;
      
      // If password is being updated, hash it
      if (updateData.password) {
        const { hashPassword } = await import("./auth");
        updateData.password = await hashPassword(updateData.password);
      }
      
      const user = await storage.updateUser(id, updateData);
      if (!user) return res.status(404).json({ message: "User not found" });
      
      res.json(user);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/users/:id", async (req, res) => {
    try {
      if (!req.user || req.user.role !== 'manager') {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const { id } = req.params;
      await storage.deleteUser(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Store Management routes (Manager only)
  app.get("/api/stores", async (req, res) => {
    try {
      if (!req.user || req.user.role !== 'manager') {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const stores = await storage.getAllStores();
      res.json(stores);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/stores", async (req, res) => {
    try {
      if (!req.user || req.user.role !== 'manager') {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const store = await storage.createStore(req.body);
      res.status(201).json(store);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/stores/:id", async (req, res) => {
    try {
      if (!req.user || req.user.role !== 'manager') {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const { id } = req.params;
      const store = await storage.updateStore(parseInt(id), req.body);
      if (!store) return res.status(404).json({ message: "Store not found" });
      
      res.json(store);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/stores/:id/employees", async (req, res) => {
    try {
      if (!req.user || req.user.role !== 'manager') {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const { id } = req.params;
      const employees = await storage.getUsersByStore(parseInt(id));
      res.json(employees);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
