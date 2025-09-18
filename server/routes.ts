import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { 
  insertAttendanceSchema,
  insertCashflowSchema,
  insertProposalSchema,
  insertOvertimeSchema
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
      const targetStoreId = storeId ? parseInt(storeId as string) : req.user.storeId;
      
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
      
      const cashflow = await storage.getCashflowByStore(req.user.storeId!);
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
      if (req.user.role === 'manager') {
        proposals = await storage.getAllProposals();
      } else {
        proposals = await storage.getProposalsByStore(req.user.storeId!);
      }
      
      res.json(proposals);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/proposal/:id/approve", async (req, res) => {
    try {
      if (!req.user || req.user.role !== 'manager') {
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
      if (!req.user || req.user.role !== 'manager') {
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

  const httpServer = createServer(app);
  return httpServer;
}
