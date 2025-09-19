import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeftIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  SaveIcon, 
  FileDownIcon,
  CalendarIcon,
  ClockIcon,
  UserIcon 
} from "lucide-react";

interface AttendanceRecord {
  id?: string;
  date: string;
  day: string;
  checkIn: string;
  checkOut: string;
  shift: string;
  latenessMinutes: number;
  overtimeMinutes: number;
  attendanceStatus: string;
  notes: string;
}

interface EmployeeData {
  id: string;
  name: string;
  stores: Array<{ id: number; name: string }>;
}

interface MonthlyAttendanceData {
  employee: EmployeeData;
  attendanceData: AttendanceRecord[];
}

const ATTENDANCE_STATUS_OPTIONS = [
  { value: "hadir", label: "Hadir", color: "bg-green-100 text-green-800" },
  { value: "cuti", label: "Cuti", color: "bg-blue-100 text-blue-800" },
  { value: "alpha", label: "Alpha", color: "bg-red-100 text-red-800" },
];

const SHIFT_OPTIONS = [
  { value: "pagi", label: "Pagi (08:00-17:00)" },
  { value: "siang", label: "Siang (12:00-21:00)" },
  { value: "malam", label: "Malam (22:00-07:00)" },
];

export default function AttendanceDetailPage() {
  const params = useParams();
  const { toast } = useToast();
  const employeeId = params.employeeId as string;
  
  // State for current month and year
  const currentDate = new Date();
  const [year, setYear] = useState(currentDate.getFullYear());
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  
  // State for attendance data
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch employee data
  const { data: employees } = useQuery<EmployeeData[]>({
    queryKey: ["/api/users"],
  });

  // Fetch attendance data for user
  const { data: attendanceRecords, isLoading, refetch } = useQuery<any[]>({
    queryKey: ["/api/attendance/user", employeeId],
    enabled: !!employeeId
  });

  // Get current employee data
  const currentEmployee = employees?.find(emp => emp.id === employeeId);

  // Update local state when data loads and generate calendar
  useEffect(() => {
    if (attendanceRecords && currentEmployee) {
      // Generate calendar for the month
      const daysInMonth = new Date(year, month, 0).getDate();
      const monthlyData: AttendanceRecord[] = [];
      
      for (let day = 1; day <= daysInMonth; day++) {
        const dateString = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        const dayName = new Date(year, month - 1, day).toLocaleDateString('id-ID', { weekday: 'long' });
        
        // Find existing attendance for this date
        const existingRecord = attendanceRecords.find(record => {
          const recordDate = new Date(record.date).toISOString().split('T')[0];
          return recordDate === dateString;
        });
        
        const record: AttendanceRecord = {
          id: existingRecord?.id,
          date: dateString,
          day: dayName,
          checkIn: existingRecord?.checkIn || '--:--',
          checkOut: existingRecord?.checkOut || '--:--',
          shift: existingRecord?.shift || 'pagi',
          latenessMinutes: existingRecord?.latenessMinutes || 0,
          overtimeMinutes: existingRecord?.overtimeMinutes || 0,
          attendanceStatus: existingRecord?.attendanceStatus || 'hadir',
          notes: existingRecord?.notes || ''
        };
        
        monthlyData.push(record);
      }
      
      setAttendanceData(monthlyData);
      setHasChanges(false);
    }
  }, [attendanceRecords, currentEmployee, year, month]);

  // Save changes mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      // Save only records that have actual check-in/out times
      const recordsToSave = attendanceData.filter(record => 
        record.checkIn !== '--:--' || record.checkOut !== '--:--'
      );
      
      const promises = recordsToSave.map(async (record) => {
        if (record.id) {
          // Update existing record
          return apiRequest('PUT', `/api/attendance/${record.id}`, {
            checkIn: record.checkIn !== '--:--' ? record.checkIn : null,
            checkOut: record.checkOut !== '--:--' ? record.checkOut : null,
            shift: record.shift,
            latenessMinutes: record.latenessMinutes,
            overtimeMinutes: record.overtimeMinutes,
            attendanceStatus: record.attendanceStatus,
            notes: record.notes
          });
        } else if (record.checkIn !== '--:--' || record.checkOut !== '--:--') {
          // Create new record only if there's actual time data
          return apiRequest('POST', '/api/attendance', {
            userId: employeeId,
            storeId: currentEmployee?.stores?.[0]?.id || 1,
            date: record.date,
            checkIn: record.checkIn !== '--:--' ? record.checkIn : null,
            checkOut: record.checkOut !== '--:--' ? record.checkOut : null,
            shift: record.shift,
            latenessMinutes: record.latenessMinutes,
            overtimeMinutes: record.overtimeMinutes,
            attendanceStatus: record.attendanceStatus,
            notes: record.notes
          });
        }
      });
      
      await Promise.all(promises);
    },
    onSuccess: () => {
      toast({ title: "Berhasil", description: "Data absensi berhasil disimpan" });
      setHasChanges(false);
      // Invalidate and refetch the data
      queryClient.invalidateQueries({
        queryKey: ["/api/attendance/user", employeeId]
      });
      refetch();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Gagal menyimpan data absensi",
        variant: "destructive" 
      });
    }
  });

  // Navigation functions
  const navigateMonth = (direction: 'prev' | 'next') => {
    let newMonth = month;
    let newYear = year;
    
    if (direction === 'prev') {
      newMonth = month === 1 ? 12 : month - 1;
      newYear = month === 1 ? year - 1 : year;
    } else {
      newMonth = month === 12 ? 1 : month + 1;
      newYear = month === 12 ? year + 1 : year;
    }
    
    setMonth(newMonth);
    setYear(newYear);
  };

  // Update attendance record
  const updateAttendanceRecord = (index: number, field: keyof AttendanceRecord, value: string | number) => {
    const updatedData = [...attendanceData];
    
    if (field === 'checkIn' || field === 'checkOut') {
      updatedData[index] = { ...updatedData[index], [field]: value };
      
      // Auto-calculate lateness and overtime when times are updated
      if (updatedData[index].checkIn && updatedData[index].checkOut) {
        const { latenessMinutes, overtimeMinutes } = calculateTimeMetrics(
          updatedData[index].checkIn,
          updatedData[index].checkOut,
          updatedData[index].shift
        );
        updatedData[index].latenessMinutes = latenessMinutes;
        updatedData[index].overtimeMinutes = overtimeMinutes;
      }
    } else {
      updatedData[index] = { ...updatedData[index], [field]: value };
    }
    
    setAttendanceData(updatedData);
    setHasChanges(true);
  };

  // Calculate lateness and overtime with proper cross-midnight handling
  const calculateTimeMetrics = (checkIn: string, checkOut: string, shift: string) => {
    if (!checkIn || !checkOut || !shift) return { latenessMinutes: 0, overtimeMinutes: 0 };
    
    const shiftTimes = {
      pagi: { start: '08:00', end: '17:00', crossMidnight: false },
      siang: { start: '12:00', end: '21:00', crossMidnight: false },
      malam: { start: '22:00', end: '07:00', crossMidnight: true }
    };
    
    const shiftTime = shiftTimes[shift as keyof typeof shiftTimes];
    if (!shiftTime) return { latenessMinutes: 0, overtimeMinutes: 0 };
    
    const baseDate = '2024-01-01';
    const nextDate = '2024-01-02';
    
    if (shiftTime.crossMidnight) {
      // Night shift: 22:00 -> 07:00 (next day)
      const expectedStart = new Date(`${baseDate} ${shiftTime.start}`);
      const expectedEnd = new Date(`${nextDate} ${shiftTime.end}`);
      
      // For night shift, times before 22:00 are considered next day
      const checkInDate = checkIn < '22:00' ? nextDate : baseDate;
      const checkOutDate = checkOut < '22:00' ? nextDate : baseDate;
      
      const checkInTime = new Date(`${checkInDate} ${checkIn}`);
      const checkOutTime = new Date(`${checkOutDate} ${checkOut}`);
      
      // Calculate lateness
      const latenessMinutes = checkInTime > expectedStart ? 
        Math.max(0, Math.floor((checkInTime.getTime() - expectedStart.getTime()) / (1000 * 60))) : 0;
      
      // Calculate overtime
      const overtimeMinutes = checkOutTime > expectedEnd ? 
        Math.max(0, Math.floor((checkOutTime.getTime() - expectedEnd.getTime()) / (1000 * 60))) : 0;
      
      return { latenessMinutes, overtimeMinutes };
    } else {
      // Day shifts: same day calculation
      const checkInTime = new Date(`${baseDate} ${checkIn}`);
      const checkOutTime = new Date(`${baseDate} ${checkOut}`);
      const expectedStart = new Date(`${baseDate} ${shiftTime.start}`);
      const expectedEnd = new Date(`${baseDate} ${shiftTime.end}`);
      
      // Calculate lateness
      const latenessMinutes = checkInTime > expectedStart ? 
        Math.max(0, Math.floor((checkInTime.getTime() - expectedStart.getTime()) / (1000 * 60))) : 0;
      
      // Calculate overtime
      const overtimeMinutes = checkOutTime > expectedEnd ? 
        Math.max(0, Math.floor((checkOutTime.getTime() - expectedEnd.getTime()) / (1000 * 60))) : 0;
      
      return { latenessMinutes, overtimeMinutes };
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    if (!currentEmployee || !attendanceData.length) return;
    
    const headers = ['Tanggal', 'Hari', 'Jam Masuk', 'Jam Keluar', 'Shift', 'Status', 'Terlambat (menit)', 'Lembur (menit)', 'Catatan'];
    const csvContent = [
      headers.join(','),
      ...attendanceData.map(record => [
        record.date,
        record.day,
        record.checkIn || '',
        record.checkOut || '',
        record.shift || '',
        record.attendanceStatus,
        record.latenessMinutes.toString(),
        record.overtimeMinutes.toString(),
        `"${record.notes || ''}"`
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `absensi_${currentEmployee.name}_${year}_${month.toString().padStart(2, '0')}.csv`;
    link.click();
  };

  // Calculate summary statistics
  const calculateSummary = () => {
    const hadirCount = attendanceData.filter(r => r.attendanceStatus === 'hadir').length;
    const cutiCount = attendanceData.filter(r => r.attendanceStatus === 'cuti').length;
    const alphaCount = attendanceData.filter(r => r.attendanceStatus === 'alpha').length;
    const totalLateness = attendanceData.reduce((sum, r) => sum + r.latenessMinutes, 0);
    const totalOvertime = attendanceData.reduce((sum, r) => sum + r.overtimeMinutes, 0);
    
    return { hadirCount, cutiCount, alphaCount, totalLateness, totalOvertime };
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="space-y-6">
          <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-96 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (!currentEmployee) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              Data tidak ditemukan
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Tidak dapat menemukan data karyawan yang diminta.
            </p>
            <Link href="/attendance" data-testid="button-back-to-list">
              <Button>Kembali ke Daftar Karyawan</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const monthName = new Date(year, month - 1).toLocaleDateString('id-ID', { month: 'long' });
  const summary = calculateSummary();

  return (
    <div className="container mx-auto py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/attendance" data-testid="button-back-to-list">
            <Button variant="outline" size="sm">
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Kembali ke Daftar
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100" data-testid="text-employee-name">
              {currentEmployee?.name}
            </h1>
            <p className="text-gray-600 dark:text-gray-400" data-testid="text-store-info">
              {currentEmployee?.stores?.map((s: any) => s.name).join(', ')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={exportToCSV}
            data-testid="button-export-csv"
          >
            <FileDownIcon className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button 
            onClick={() => saveMutation.mutate()}
            disabled={!hasChanges || saveMutation.isPending}
            data-testid="button-save-changes"
          >
            <SaveIcon className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
          </Button>
        </div>
      </div>

      {/* Month Navigation */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button 
              variant="outline" 
              onClick={() => navigateMonth('prev')}
              data-testid="button-prev-month"
            >
              <ChevronLeftIcon className="h-4 w-4 mr-2" />
              Bulan Sebelumnya
            </Button>
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-gray-600" />
              <span className="text-lg font-semibold" data-testid="text-current-month">
                {monthName} {year}
              </span>
            </div>
            <Button 
              variant="outline" 
              onClick={() => navigateMonth('next')}
              data-testid="button-next-month"
            >
              Bulan Selanjutnya
              <ChevronRightIcon className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600" data-testid="summary-hadir-count">{summary.hadirCount}</div>
            <div className="text-sm text-gray-600">Hadir</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600" data-testid="summary-cuti-count">{summary.cutiCount}</div>
            <div className="text-sm text-gray-600">Cuti</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600" data-testid="summary-alpha-count">{summary.alphaCount}</div>
            <div className="text-sm text-gray-600">Alpha</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600" data-testid="summary-lateness-minutes">{summary.totalLateness}</div>
            <div className="text-sm text-gray-600">Menit Terlambat</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600" data-testid="summary-overtime-minutes">{summary.totalOvertime}</div>
            <div className="text-sm text-gray-600">Menit Lembur</div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Data Absensi Harian</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Hari</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Shift</TableHead>
                  <TableHead>Jam Masuk</TableHead>
                  <TableHead>Jam Keluar</TableHead>
                  <TableHead>Terlambat</TableHead>
                  <TableHead>Lembur</TableHead>
                  <TableHead>Catatan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendanceData.map((record, index) => {
                  const statusOption = ATTENDANCE_STATUS_OPTIONS.find(opt => opt.value === record.attendanceStatus);
                  return (
                    <TableRow key={record.date} data-testid={`row-attendance-${record.date}`}>
                      <TableCell className="font-medium">
                        {new Date(record.date).getDate()}
                      </TableCell>
                      <TableCell>{record.day}</TableCell>
                      <TableCell>
                        <Select
                          value={record.attendanceStatus}
                          onValueChange={(value) => updateAttendanceRecord(index, 'attendanceStatus', value)}
                        >
                          <SelectTrigger className="w-24" data-testid={`select-status-${record.date}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ATTENDANCE_STATUS_OPTIONS.map(option => (
                              <SelectItem key={option.value} value={option.value}>
                                <Badge className={option.color}>{option.label}</Badge>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={record.shift}
                          onValueChange={(value) => updateAttendanceRecord(index, 'shift', value)}
                        >
                          <SelectTrigger className="w-32" data-testid={`select-shift-${record.date}`}>
                            <SelectValue placeholder="Pilih shift" />
                          </SelectTrigger>
                          <SelectContent>
                            {SHIFT_OPTIONS.map(option => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="time"
                          value={record.checkIn}
                          onChange={(e) => updateAttendanceRecord(index, 'checkIn', e.target.value)}
                          className="w-24"
                          data-testid={`input-checkin-${record.date}`}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="time"
                          value={record.checkOut}
                          onChange={(e) => updateAttendanceRecord(index, 'checkOut', e.target.value)}
                          className="w-24"
                          data-testid={`input-checkout-${record.date}`}
                        />
                      </TableCell>
                      <TableCell>
                        <span className={`text-sm ${record.latenessMinutes > 0 ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                          {record.latenessMinutes} min
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`text-sm ${record.overtimeMinutes > 0 ? 'text-purple-600 font-medium' : 'text-gray-500'}`}>
                          {record.overtimeMinutes} min
                        </span>
                      </TableCell>
                      <TableCell>
                        <Textarea
                          value={record.notes}
                          onChange={(e) => updateAttendanceRecord(index, 'notes', e.target.value)}
                          placeholder="Catatan..."
                          className="min-h-[60px] w-48"
                          data-testid={`textarea-notes-${record.date}`}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Bottom Actions */}
      {hasChanges && (
        <div className="mt-6 flex justify-center">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center gap-4">
              <span className="text-amber-800">Ada perubahan yang belum disimpan</span>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    // Reset to original data by refetching
                    refetch();
                    setHasChanges(false);
                  }}
                  data-testid="button-discard-changes"
                >
                  Batalkan Perubahan
                </Button>
                <Button 
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending}
                  data-testid="button-save-changes-bottom"
                >
                  <SaveIcon className="h-4 w-4 mr-2" />
                  {saveMutation.isPending ? 'Menyimpan...' : 'Simpan Sekarang'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}