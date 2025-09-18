import { useState } from "react";
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
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { type Attendance, type AttendanceWithEmployee } from "@shared/schema";
import { Clock, CheckCircle2 } from "lucide-react";

const attendanceSchema = z.object({
  checkIn: z.string().min(1, "Check-in time is required"),
  checkOut: z.string().min(1, "Check-out time is required"),
  breakDuration: z.coerce.number().min(0, "Break duration must be positive"),
  overtime: z.coerce.number().min(0, "Overtime must be positive"),
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

  const form = useForm<AttendanceData>({
    resolver: zodResolver(attendanceSchema),
    defaultValues: {
      checkIn: "",
      checkOut: "",
      breakDuration: 30,
      overtime: 0,
      notes: "",
    },
  });

  const { data: attendanceRecords, isLoading } = useQuery<(Attendance | AttendanceWithEmployee)[]>({
    queryKey: ["/api/attendance", { date: selectedDate }],
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

  const isStaff = user?.role === "staff";

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

      {/* Attendance Table (Manager/Admin view) */}
      {!isStaff && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Staff Attendance</CardTitle>
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
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading attendance records...</div>
            ) : filteredAttendanceRecords && filteredAttendanceRecords.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff</TableHead>
                      <TableHead>Check-in</TableHead>
                      <TableHead>Check-out</TableHead>
                      <TableHead>Overtime</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAttendanceRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium">
                                {hasEmployeeInfo(record) 
                                  ? record.employeeName.slice(0, 2).toUpperCase()
                                  : record.userId.slice(0, 2).toUpperCase()
                                }
                              </span>
                            </div>
                            <div>
                              <span className="font-medium">
                                {hasEmployeeInfo(record) ? record.employeeName : record.userId}
                              </span>
                              {hasEmployeeInfo(record) && (
                                <div className="text-xs text-muted-foreground">{record.employeeRole}</div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{record.checkIn || "—"}</TableCell>
                        <TableCell>{record.checkOut || "—"}</TableCell>
                        <TableCell>{record.overtime || "0"} hrs</TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              record.status === "approved" ? "default" : 
                              record.status === "rejected" ? "destructive" : 
                              "secondary"
                            }
                          >
                            {record.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {record.status === "pending" && parseFloat(record.overtime || "0") > 0 && (
                            <Button
                              size="sm"
                              onClick={() => approveOvertimeMutation.mutate(record.id)}
                              disabled={approveOvertimeMutation.isPending}
                              data-testid={`button-approve-overtime-${record.id}`}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No attendance records found for this date</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
