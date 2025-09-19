import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { type User } from "@shared/schema";
import { UserCheck, ChevronLeft, ChevronRight, Save, Download, RotateCcw } from "lucide-react";

// Types untuk attendance record
interface AttendanceRecord {
  tgl: string;
  hari: string;
  shift: string;
  in: string;
  out: string;
  telat: number;
  lembur: number;
  status: string;
  note: string;
}

export default function AttendanceContent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [view, setView] = useState("list");
  const [currentEmp, setCurrentEmp] = useState<User | null>(null);
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [dataStore, setDataStore] = useState<Record<string, AttendanceRecord[]>>({});
  const [rows, setRows] = useState<AttendanceRecord[]>([]);

  // Get all employees for the list
  const { data: employees, isLoading: isLoadingEmployees } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Helper functions
  const daysInMonth = (m: number, y: number) => new Date(y, m + 1, 0).getDate();
  
  const dayName = (y: number, m: number, d: number) =>
    new Date(y, m, d).toLocaleDateString("id-ID", { weekday: "long" });
  
  const monthName = (m: number, y: number) =>
    new Date(y, m, 1).toLocaleDateString("id-ID", {
      month: "long",
      year: "numeric",
    });

  const timeToMinutes = (t: string) => {
    if (!t) return null;
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };

  // Load month data for employee
  const loadMonth = (emp: User) => {
    const key = `${emp.id}-${year}-${month}`;
    if (!dataStore[key]) {
      const days = daysInMonth(month, year);
      const init: AttendanceRecord[] = [];
      for (let d = 1; d <= days; d++) {
        init.push({
          tgl: `${d}/${month + 1}/${year}`,
          hari: dayName(year, month, d),
          shift: "Pagi",
          in: "",
          out: "",
          telat: 0,
          lembur: 0,
          status: "",
          note: "",
        });
      }
      setDataStore((prev) => ({ ...prev, [key]: init }));
      setRows(init);
    } else {
      setRows([...dataStore[key]]);
    }
  };

  // Open detail view
  const openDetail = (emp: User) => {
    setCurrentEmp(emp);
    loadMonth(emp);
    setView("detail");
  };

  // Back to list
  const backToList = () => setView("list");

  // Change month navigation
  const changeMonth = (step: number) => {
    let newMonth = month + step;
    let newYear = year;
    if (newMonth < 0) {
      newMonth = 11;
      newYear--;
    }
    if (newMonth > 11) {
      newMonth = 0;
      newYear++;
    }
    setMonth(newMonth);
    setYear(newYear);
    if (currentEmp) loadMonth(currentEmp);
  };

  // Change year
  const changeYear = (y: string) => {
    setYear(parseInt(y));
    if (currentEmp) loadMonth(currentEmp);
  };

  // Update row data
  const updateRow = (i: number, field: keyof AttendanceRecord, value: string | number) => {
    const newRows = [...rows];
    newRows[i] = { ...newRows[i], [field]: value };

    // Hitung telat & lembur
    if (field === "in" || field === "out" || field === "status") {
      const masuk = timeToMinutes(newRows[i].in);
      const keluar = timeToMinutes(newRows[i].out);
      let telat = 0,
        lembur = 0;
      const normalIn = 8 * 60, // 08:00
        normalOut = 17 * 60; // 17:00
      if (newRows[i].status === "Hadir") {
        if (masuk && masuk > normalIn) telat = masuk - normalIn;
        if (keluar && keluar > normalOut) lembur = keluar - normalOut;
      }
      newRows[i].telat = telat;
      newRows[i].lembur = lembur;
    }

    setRows(newRows);
  };

  // Save data
  const saveData = () => {
    if (!currentEmp) return;
    const key = `${currentEmp.id}-${year}-${month}`;
    setDataStore((prev) => ({ ...prev, [key]: [...rows] }));
    toast({
      title: "Berhasil",
      description: "Data absensi berhasil disimpan!",
    });
  };

  // Cancel edit
  const cancelEdit = () => {
    if (currentEmp) loadMonth(currentEmp);
  };

  // Export CSV
  const exportCSV = () => {
    if (!currentEmp) return;
    let csv = "Tanggal,Hari,Shift,Jam Masuk,Jam Keluar,Telat,Lembur,Status,Keterangan\n";
    rows.forEach((r) => {
      csv += `${r.tgl},${r.hari},${r.shift},${r.in},${r.out},${r.telat},${r.lembur},${r.status},${r.note}\n`;
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Absensi_${currentEmp.name}_${month + 1}-${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Calculate summary
  const summary = () => {
    const hadir = rows.filter((r) => r.status === "Hadir").length;
    const cuti = rows.filter((r) => r.status === "Cuti").length;
    const alpha = rows.filter((r) => r.status === "Alpha").length;
    const totalTelat = rows.reduce((a, b) => a + b.telat, 0);
    const totalLembur = rows.reduce((a, b) => a + b.lembur, 0);

    return `Total Telat: ${totalTelat} menit (${(totalTelat / 60).toFixed(2)} jam)
Total Lembur: ${totalLembur} menit (${(totalLembur / 60).toFixed(2)} jam)
Total: Hadir ${hadir}, Cuti ${cuti}, Alpha ${alpha}`;
  };

  // Render list view
  if (view === "list") {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Daftar Karyawan
            </CardTitle>
            <p className="text-muted-foreground">Pilih karyawan untuk melihat detail absensi</p>
          </CardHeader>
          <CardContent>
            {isLoadingEmployees ? (
              <div className="text-center py-8">Loading karyawan...</div>
            ) : employees && employees.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Store</TableHead>
                      <TableHead>Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium">
                                {employee.name.slice(0, 2).toUpperCase()}
                              </span>
                            </div>
                            <span className="font-medium">{employee.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{employee.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{employee.role}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            onClick={() => openDetail(employee)}
                            data-testid={`button-detail-${employee.id}`}
                          >
                            Detail Absensi
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <UserCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Tidak ada karyawan yang ditemukan</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render detail view
  return (
    <div className="space-y-6">
      {/* Header with month navigation */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">
              Absensi - {currentEmp?.name}
            </h2>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => changeMonth(-1)}
                data-testid="button-prev-month"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Sebelumnya
              </Button>
              <span className="mx-2 text-lg font-medium">
                {monthName(month, year)}
              </span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => changeMonth(1)}
                data-testid="button-next-month"
              >
                Berikutnya
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
              <Select value={year.toString()} onValueChange={changeYear}>
                <SelectTrigger className="w-24 ml-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 11 }, (_, i) => year - 5 + i).map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance table */}
      <Card>
        <CardContent className="p-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Hari</TableHead>
                  <TableHead>Shift</TableHead>
                  <TableHead>Jam Masuk</TableHead>
                  <TableHead>Jam Keluar</TableHead>
                  <TableHead>Telat (mnt)</TableHead>
                  <TableHead>Lembur (mnt)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Keterangan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{row.tgl}</TableCell>
                    <TableCell>{row.hari}</TableCell>
                    <TableCell>{row.shift}</TableCell>
                    <TableCell>
                      <Input
                        type="time"
                        value={row.in}
                        onChange={(e) => updateRow(i, "in", e.target.value)}
                        className="w-32"
                        data-testid={`input-checkin-${i}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="time"
                        value={row.out}
                        onChange={(e) => updateRow(i, "out", e.target.value)}
                        className="w-32"
                        data-testid={`input-checkout-${i}`}
                      />
                    </TableCell>
                    <TableCell>
                      <span className={row.telat > 0 ? "text-red-600 font-medium" : ""}>
                        {row.telat}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={row.lembur > 0 ? "text-blue-600 font-medium" : ""}>
                        {row.lembur}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={row.status}
                        onValueChange={(value) => updateRow(i, "status", value)}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue placeholder="--" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">--</SelectItem>
                          <SelectItem value="Hadir">Hadir</SelectItem>
                          <SelectItem value="Cuti">Cuti</SelectItem>
                          <SelectItem value="Alpha">Alpha</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        value={row.note}
                        onChange={(e) => updateRow(i, "note", e.target.value)}
                        className="w-40"
                        placeholder="Catatan..."
                        data-testid={`input-note-${i}`}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Action buttons */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Button onClick={saveData} data-testid="button-save">
              <Save className="h-4 w-4 mr-2" />
              Simpan
            </Button>
            <Button 
              variant="outline" 
              onClick={cancelEdit}
              data-testid="button-cancel"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Batal
            </Button>
            <Button 
              variant="outline" 
              onClick={exportCSV}
              data-testid="button-export"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button 
              variant="outline" 
              onClick={backToList}
              data-testid="button-back"
            >
              Kembali ke List
            </Button>
          </div>
          
          {/* Summary */}
          <div className="bg-muted p-4 rounded-lg">
            <pre className="text-sm whitespace-pre-wrap">{summary()}</pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}