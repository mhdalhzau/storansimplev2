import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { type User, type Attendance, type AttendanceWithEmployee, insertAttendanceSchema } from "@shared/schema";
import { Clock, CheckCircle2, Edit, UserCheck } from "lucide-react";

const attendanceSchema = z.object({
  checkIn: z.string().min(1, "Check-in time is required"),
  checkOut: z.string().min(1, "Check-out time is required"),
  breakDuration: z.coerce.number().min(0, "Break duration must be positive"),
  overtime: z.coerce.number().min(0, "Overtime must be positive"),
  latenessMinutes: z.coerce.number().min(0, "Lateness must be positive"),
  overtimeMinutes: z.coerce.number().min(0, "Overtime minutes must be positive"),
  shift: z.string().optional(),
  notes: z.string().optional(),
});

type AttendanceData = z.infer<typeof attendanceSchema>;

// Helper function to check if record has employee info
function hasEmployeeInfo(record: Attendance | AttendanceWithEmployee): record is AttendanceWithEmployee {
  return 'employeeName' in record;
}

export default function AttendanceContent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [nameFilter, setNameFilter] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const form = useForm<AttendanceData>({
    resolver: zodResolver(attendanceSchema),
    defaultValues: {
      checkIn: "",
      checkOut: "",
      breakDuration: 30,
      overtime: 0,
      latenessMinutes: 0,
      overtimeMinutes: 0,
      shift: "pagi",
      notes: "",
    },
  });

  // Get all employees for the list
  const { data: employees, isLoading: isLoadingEmployees } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Get attendance records for selected date
  const { data: attendanceRecords, isLoading } = useQuery<(Attendance | AttendanceWithEmployee)[]>({
    queryKey: ["/api/attendance", { date: selectedDate }],
  });

  // Get specific employee's attendance for detail view
  const { data: employeeAttendance, refetch: refetchEmployeeAttendance } = useQuery<Attendance[]>({
    queryKey: ["/api/attendance/user", { userId: selectedEmployee?.id, date: selectedDate }],
    enabled: !!selectedEmployee?.id,
  });

  const submitAttendanceMutation = useMutation({
    mutationFn: async (data: AttendanceData) => {
      const res = await apiRequest("POST", "/api/attendance", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Attendance submitted successfully!",
      });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update employee attendance mutation
  const updateAttendanceMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<AttendanceData> }) => {
      const res = await apiRequest("PUT", `/api/attendance/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Attendance updated successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      refetchEmployeeAttendance();
      setIsDetailModalOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create new attendance mutation
  const createAttendanceMutation = useMutation({
    mutationFn: async (data: AttendanceData & { userId: string; storeId: number; date: string }) => {
      const res = await apiRequest("POST", "/api/attendance", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Attendance created successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      refetchEmployeeAttendance();
      setIsDetailModalOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const approveOvertimeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PATCH", `/api/overtime/${id}/approve`);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Overtime approved successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AttendanceData) => {
    submitAttendanceMutation.mutate(data);
  };

  // Handle employee detail view
  const handleEmployeeDetail = (employee: User) => {
    setSelectedEmployee(employee);
    setIsDetailModalOpen(true);
  };

  // Handle attendance save in detail view
  const handleAttendanceSave = (data: AttendanceData) => {
    if (!selectedEmployee) return;

    const todayAttendance = employeeAttendance?.find(
      record => record.date && new Date(record.date).toDateString() === new Date(selectedDate).toDateString()
    );

    if (todayAttendance) {
      // Update existing attendance
      updateAttendanceMutation.mutate({ id: todayAttendance.id, data });
    } else {
      // Create new attendance record
      const attendanceData = {
        ...data,
        userId: selectedEmployee.id,
        storeId: selectedEmployee.stores?.[0]?.id || 1, // Use first store or default
        date: selectedDate,
      };
      createAttendanceMutation.mutate(attendanceData);
    }
  };

  const isStaff = user?.role === "staff";

  // Filter employees by name
  const filteredEmployees = employees?.filter(employee => {
    if (!nameFilter) return true;
    return employee.name.toLowerCase().includes(nameFilter.toLowerCase());
  }) || [];

  // Filter attendance records by name
  const filteredAttendanceRecords = attendanceRecords?.filter(record => {
    if (!nameFilter) return true;
    
    if (hasEmployeeInfo(record)) {
      return record.employeeName.toLowerCase().includes(nameFilter.toLowerCase());
    } else {
      // For staff viewing their own records, filter by userId
      return record.userId.toLowerCase().includes(nameFilter.toLowerCase());
    }
  }) || [];

  return (
    <div className="space-y-6">
      {/* Staff Attendance Form */}
      {isStaff && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Daily Attendance
            </CardTitle>
            <p className="text-muted-foreground">Fill in your attendance information</p>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="checkIn"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Check-in Time</FormLabel>
                        <FormControl>
                          <Input 
                            type="time" 
                            data-testid="input-checkin"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="checkOut"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Check-out Time</FormLabel>
                        <FormControl>
                          <Input 
                            type="time" 
                            data-testid="input-checkout"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="breakDuration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Break Duration (minutes)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="30"
                            data-testid="input-break-duration"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="overtime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Overtime Hours</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.5"
                            placeholder="0"
                            data-testid="input-overtime"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Any additional notes..."
                          data-testid="input-notes"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  disabled={submitAttendanceMutation.isPending}
                  data-testid="button-submit-attendance"
                >
                  {submitAttendanceMutation.isPending ? "Submitting..." : "Submit Attendance"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Staff List with Attendance Management (Manager/Admin view) */}
      {!isStaff && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                Staff Attendance Management
              </CardTitle>
              <div className="flex gap-3">
                <Input
                  placeholder="Filter by employee name..."
                  value={nameFilter}
                  onChange={(e) => setNameFilter(e.target.value)}
                  className="w-64"
                  data-testid="input-name-filter"
                />
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-auto"
                  data-testid="input-date-filter"
                />
              </div>
            </div>
            <p className="text-muted-foreground">Manage attendance data for all staff members</p>
          </CardHeader>
          <CardContent>
            {isLoadingEmployees ? (
              <div className="text-center py-8">Loading employees...</div>
            ) : filteredEmployees && filteredEmployees.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Attendance Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmployees.map((employee) => {
                      const todayAttendance = attendanceRecords?.find(
                        record => record.userId === employee.id && 
                        new Date(record.date || "").toDateString() === new Date(selectedDate).toDateString()
                      );
                      
                      return (
                        <TableRow key={employee.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center">
                                <span className="text-sm font-medium">
                                  {employee.name.slice(0, 2).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <span className="font-medium">{employee.name}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {employee.role}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {employee.email}
                          </TableCell>
                          <TableCell>
                            {todayAttendance ? (
                              <div className="space-y-1">
                                <Badge 
                                  variant={
                                    todayAttendance.status === "approved" ? "default" : 
                                    todayAttendance.status === "rejected" ? "destructive" : 
                                    "secondary"
                                  }
                                >
                                  {todayAttendance.status}
                                </Badge>
                                <div className="text-xs text-muted-foreground">
                                  {todayAttendance.checkIn} - {todayAttendance.checkOut || "—"}
                                </div>
                              </div>
                            ) : (
                              <Badge variant="outline">No Record</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEmployeeDetail(employee)}
                              data-testid={`button-detail-${employee.id}`}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Detail
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <UserCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No employees found</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      {/* Attendance Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Edit Attendance - {selectedEmployee?.name}
            </DialogTitle>
          </DialogHeader>
          
          <AttendanceDetailForm
            employee={selectedEmployee}
            date={selectedDate}
            attendanceData={employeeAttendance?.[0]}
            onSave={handleAttendanceSave}
            isLoading={updateAttendanceMutation.isPending || createAttendanceMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Separate component for the attendance detail form
interface AttendanceDetailFormProps {
  employee: User | null;
  date: string;
  attendanceData?: Attendance;
  onSave: (data: AttendanceData) => void;
  isLoading: boolean;
}

function AttendanceDetailForm({ employee, date, attendanceData, onSave, isLoading }: AttendanceDetailFormProps) {
  const { toast } = useToast();
  
  const detailForm = useForm<AttendanceData>({
    resolver: zodResolver(attendanceSchema),
    defaultValues: {
      checkIn: attendanceData?.checkIn || "",
      checkOut: attendanceData?.checkOut || "",
      breakDuration: attendanceData?.breakDuration || 30,
      overtime: parseFloat(attendanceData?.overtime || "0"),
      latenessMinutes: attendanceData?.latenessMinutes || 0,
      overtimeMinutes: attendanceData?.overtimeMinutes || 0,
      shift: attendanceData?.shift || "pagi",
      notes: attendanceData?.notes || "",
    },
  });

  const onDetailSubmit = (data: AttendanceData) => {
    onSave(data);
  };

  // Reset form when attendance data changes
  useEffect(() => {
    if (attendanceData) {
      detailForm.reset({
        checkIn: attendanceData.checkIn || "",
        checkOut: attendanceData.checkOut || "",
        breakDuration: attendanceData.breakDuration || 30,
        overtime: parseFloat(attendanceData.overtime || "0"),
        latenessMinutes: attendanceData.latenessMinutes || 0,
        overtimeMinutes: attendanceData.overtimeMinutes || 0,
        shift: attendanceData.shift || "pagi",
        notes: attendanceData.notes || "",
      });
    }
  }, [attendanceData, detailForm]);

  if (!employee) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{employee.name}</h3>
          <p className="text-muted-foreground">{employee.role} • {date}</p>
        </div>
        <Badge variant={attendanceData ? "default" : "outline"}>
          {attendanceData ? "Has Record" : "No Record"}
        </Badge>
      </div>

      <Form {...detailForm}>
        <form onSubmit={detailForm.handleSubmit(onDetailSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={detailForm.control}
              name="checkIn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Check-in Time</FormLabel>
                  <FormControl>
                    <Input 
                      type="time" 
                      data-testid="detail-input-checkin"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={detailForm.control}
              name="checkOut"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Check-out Time</FormLabel>
                  <FormControl>
                    <Input 
                      type="time" 
                      data-testid="detail-input-checkout"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={detailForm.control}
              name="shift"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Shift</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="detail-select-shift">
                        <SelectValue placeholder="Select shift" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="pagi">Pagi</SelectItem>
                      <SelectItem value="siang">Siang</SelectItem>
                      <SelectItem value="malam">Malam</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={detailForm.control}
              name="breakDuration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Break Duration (minutes)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="30"
                      data-testid="detail-input-break-duration"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={detailForm.control}
              name="latenessMinutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lateness (minutes)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="0"
                      data-testid="detail-input-lateness"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={detailForm.control}
              name="overtimeMinutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Overtime (minutes)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="0"
                      data-testid="detail-input-overtime-minutes"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={detailForm.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Any additional notes..."
                    data-testid="detail-input-notes"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex gap-2 justify-end">
            <Button 
              type="submit" 
              disabled={isLoading}
              data-testid="button-save-attendance"
            >
              {isLoading ? "Saving..." : "Save Attendance"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
