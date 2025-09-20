import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { FileDown, FileSpreadsheet, TrendingUp, Upload, Loader2, Eye, Clock, Gauge, CreditCard, Calculator, Trash2, User, Wifi, WifiOff, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { formatRupiah } from "@/lib/utils";
import { type Sales } from "@shared/schema";

// Function to get user name from userId
function getUserNameFromId(userId: string | null, allUsers: any[] = []): string {
  if (!userId) return 'Staff Tidak Diketahui';
  const user = allUsers.find(u => u.id === userId);
  return user?.name || `Staff ${userId.slice(0, 8)}`;
}

// Sales Detail Modal Component for single record
function SalesDetailModal({ record }: { record: Sales }) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  // Get users data to show staff names
  const { data: allUsers } = useQuery<any[]>({ queryKey: ['/api/users'] });
  
  // Delete mutation for sales record
  const deleteSalesMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/sales/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Sales record deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/sales'] });
      setIsOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete sales record",
        variant: "destructive",
      });
    },
  });
  
  const handleDeleteSales = (id: string) => {
    if (confirm("Are you sure you want to delete this sales record? This action cannot be undone.")) {
      deleteSalesMutation.mutate(id);
    }
  };
  
  // Parse JSON data if available
  const parseJsonData = (jsonString: string | null) => {
    if (!jsonString) return [];
    try {
      return JSON.parse(jsonString);
    } catch {
      return [];
    }
  };

  const incomeData = parseJsonData(record.incomeDetails || null);
  const expenseData = parseJsonData(record.expenseDetails || null);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="text-blue-600 border-blue-200 hover:bg-blue-50"
          data-testid={`button-detail-${record.id}`}
        >
          <Eye className="h-4 w-4 mr-1" />
          Detail
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Detail Penjualan Per Shift
            </div>
            {user && ['manager', 'administrasi'].includes(user.role) && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDeleteSales(record.id)}
                disabled={deleteSalesMutation.isPending}
                className="text-red-600 border-red-200 hover:bg-red-50"
                data-testid={`button-delete-${record.id}`}
              >
                {deleteSalesMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-1" />
                )}
                {deleteSalesMutation.isPending ? "Menghapus..." : "Hapus"}
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Shift Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-indigo-50 p-3 rounded-lg">
              <div className="flex items-center gap-2 text-indigo-700 mb-1">
                <User className="h-4 w-4" />
                <span className="font-medium">Nama Staff</span>
              </div>
              <p className="text-lg font-semibold">
                {getUserNameFromId(record.userId, allUsers)}
              </p>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="flex items-center gap-2 text-blue-700 mb-1">
                <Clock className="h-4 w-4" />
                <span className="font-medium">Shift</span>
              </div>
              <p className="text-lg font-semibold capitalize">
                {record.shift || "—"}
              </p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="flex items-center gap-2 text-green-700 mb-1">
                <Clock className="h-4 w-4" />
                <span className="font-medium">Jam Masuk</span>
              </div>
              <p className="text-lg font-semibold">
                {record.checkIn || "—"}
              </p>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg">
              <div className="flex items-center gap-2 text-orange-700 mb-1">
                <Clock className="h-4 w-4" />
                <span className="font-medium">Jam Keluar</span>
              </div>
              <p className="text-lg font-semibold">
                {record.checkOut || "—"}
              </p>
            </div>
          </div>

          {/* Data Meter Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Gauge className="h-5 w-5 text-blue-600" />
                Data Meter
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nomor Awal</TableHead>
                    <TableHead>Nomor Akhir</TableHead>
                    <TableHead>Total Liter</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">
                      {record.meterStart || "0"}
                    </TableCell>
                    <TableCell className="font-medium">
                      {record.meterEnd || "0"}
                    </TableCell>
                    <TableCell className="font-semibold text-blue-600">
                      {record.totalLiters || "0"} L
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Tabel Setoran */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <CreditCard className="h-5 w-5 text-green-600" />
                Setoran
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cash</TableHead>
                    <TableHead>QRIS</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-semibold text-orange-600">
                      {formatRupiah(record.totalCash || 0)}
                    </TableCell>
                    <TableCell className="font-semibold text-blue-600">
                      {formatRupiah(record.totalQris || 0)}
                    </TableCell>
                    <TableCell className="font-semibold text-green-700">
                      {formatRupiah((parseFloat(record.totalCash || "0") + parseFloat(record.totalQris || "0")))}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Tabel PU (Pemasukan/Pengeluaran) */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calculator className="h-5 w-5 text-purple-600" />
                PU (Pemasukan & Pengeluaran)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                {/* Pemasukan */}
                <div>
                  <h4 className="font-semibold text-green-700 mb-3 flex items-center gap-2">
                    <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                    Pemasukan
                  </h4>
                  {incomeData.length > 0 ? (
                    <div className="space-y-2">
                      {incomeData.map((item: any, index: number) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-green-50 rounded">
                          <span className="text-sm">{item.description || item.name || `Item ${index + 1}`}</span>
                          <span className="font-medium text-green-700">{formatRupiah(item.amount || 0)}</span>
                        </div>
                      ))}
                      <div className="border-t pt-2 mt-3">
                        <div className="flex justify-between items-center font-semibold">
                          <span>Total Pemasukan:</span>
                          <span className="text-green-700">{formatRupiah(record.totalIncome || 0)}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-4">
                      <p className="text-sm">Tidak ada data pemasukan</p>
                      <p className="font-medium mt-1">{formatRupiah(record.totalIncome || 0)}</p>
                    </div>
                  )}
                </div>

                {/* Pengeluaran */}
                <div>
                  <h4 className="font-semibold text-red-700 mb-3 flex items-center gap-2">
                    <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                    Pengeluaran
                  </h4>
                  {expenseData.length > 0 ? (
                    <div className="space-y-2">
                      {expenseData.map((item: any, index: number) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-red-50 rounded">
                          <span className="text-sm">{item.description || item.name || `Item ${index + 1}`}</span>
                          <span className="font-medium text-red-700">{formatRupiah(item.amount || 0)}</span>
                        </div>
                      ))}
                      <div className="border-t pt-2 mt-3">
                        <div className="flex justify-between items-center font-semibold">
                          <span>Total Pengeluaran:</span>
                          <span className="text-red-700">{formatRupiah(record.totalExpenses || 0)}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-4">
                      <p className="text-sm">Tidak ada data pengeluaran</p>
                      <p className="font-medium mt-1">{formatRupiah(record.totalExpenses || 0)}</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Keseluruhan */}
          <Card className="bg-gradient-to-r from-blue-50 to-green-50 border-2 border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-xl">
                <TrendingUp className="h-6 w-6 text-blue-600" />
                Total Keseluruhan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <p className="text-3xl font-bold text-green-700 mb-2">
                  {formatRupiah(record.totalSales)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Total penjualan pada shift ini
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Multi Sales Detail Modal Component with Tabs for multiple staff
function MultiSalesDetailModal({ records }: { records: Sales[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  // Get users data to show staff names
  const { data: allUsers } = useQuery<any[]>({ queryKey: ['/api/users'] });
  
  // Delete mutation for sales record
  const deleteSalesMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/sales/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Sales record deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/sales'] });
      setIsOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete sales record",
        variant: "destructive",
      });
    },
  });
  
  const handleDeleteSales = (id: string) => {
    if (confirm("Are you sure you want to delete this sales record? This action cannot be undone.")) {
      deleteSalesMutation.mutate(id);
    }
  };

  // If only one record, show simple modal without tabs
  if (records.length === 1) {
    const record = records[0];
    return <SalesDetailModal record={record} />;
  }

  // Multiple records - show tabs for each staff
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="text-blue-600 border-blue-200 hover:bg-blue-50"
          data-testid={`button-detail-multi-${records[0]?.id}`}
        >
          <Eye className="h-4 w-4 mr-1" />
          Detail ({records.length} Staff)
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Detail Penjualan Per Staff - {records[0].storeId === 1 ? "Main Store" : "Branch Store"}
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue={records[0]?.userId || records[0]?.id} className="w-full">
          <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 mb-6">
            {records.map((record) => (
              <TabsTrigger 
                key={record.userId || record.id} 
                value={record.userId || record.id}
                className="text-sm"
                data-testid={`tab-staff-${record.userId}`}
              >
                {getUserNameFromId(record.userId, allUsers)}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {records.map((record) => (
            <TabsContent key={record.userId || record.id} value={record.userId || record.id}>
              <StaffSalesContent 
                record={record} 
                onDelete={handleDeleteSales} 
                canDelete={!!(user && ['manager', 'administrasi'].includes(user.role))} 
                isDeleting={deleteSalesMutation.isPending}
                allUsers={allUsers}
              />
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// Component to display individual staff sales data
function StaffSalesContent({ record, onDelete, canDelete, isDeleting, allUsers }: { 
  record: Sales; 
  onDelete: (id: string) => void;
  canDelete: boolean;
  isDeleting: boolean;
  allUsers?: any[];
}) {
  // Parse JSON data if available
  const parseJsonData = (jsonString: string | null) => {
    if (!jsonString) return [];
    try {
      return JSON.parse(jsonString);
    } catch {
      return [];
    }
  };

  const incomeData = parseJsonData(record.incomeDetails || null);
  const expenseData = parseJsonData(record.expenseDetails || null);

  return (
    <div className="space-y-6">
      {/* Staff Header with Actions */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-full">
            <User className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {getUserNameFromId(record.userId, allUsers)}
            </h3>
            <p className="text-sm text-gray-600">
              Shift {record.shift || "—"} • {record.checkIn || "—"} - {record.checkOut || "—"}
            </p>
          </div>
        </div>
        {canDelete && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onDelete(record.id)}
            disabled={isDeleting}
            className="bg-red-50 text-red-600 border-red-200 hover:bg-red-100 hover:text-red-700 transition-colors"
            data-testid={`button-delete-${record.id}`}
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            {isDeleting ? "Menghapus..." : "Hapus Data"}
          </Button>
        )}
      </div>

      {/* Sales Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-center gap-2 text-green-700 mb-2">
            <TrendingUp className="h-5 w-5" />
            <span className="font-medium">Total Penjualan</span>
          </div>
          <p className="text-2xl font-bold text-green-800">
            {formatRupiah(record.totalSales)}
          </p>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 text-blue-700 mb-2">
            <CreditCard className="h-5 w-5" />
            <span className="font-medium">Total Transaksi</span>
          </div>
          <p className="text-2xl font-bold text-blue-800">
            {record.transactions || 0}
          </p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <div className="flex items-center gap-2 text-purple-700 mb-2">
            <Calculator className="h-5 w-5" />
            <span className="font-medium">Rata-rata</span>
          </div>
          <p className="text-2xl font-bold text-purple-800">
            {formatRupiah(record.averageTicket || 0)}
          </p>
        </div>
      </div>

      {/* Data Meter Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Gauge className="h-5 w-5 text-blue-600" />
            Data Meter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nomor Awal</TableHead>
                <TableHead>Nomor Akhir</TableHead>
                <TableHead>Total Liter</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">
                  {record.meterStart || "0"}
                </TableCell>
                <TableCell className="font-medium">
                  {record.meterEnd || "0"}
                </TableCell>
                <TableCell className="font-semibold text-blue-600">
                  {record.totalLiters || "0"} L
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Tabel Setoran */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="h-5 w-5 text-green-600" />
            Setoran
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cash</TableHead>
                <TableHead>QRIS</TableHead>
                <TableHead>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-semibold text-orange-600">
                  {formatRupiah(record.totalCash || 0)}
                </TableCell>
                <TableCell className="font-semibold text-blue-600">
                  {formatRupiah(record.totalQris || 0)}
                </TableCell>
                <TableCell className="font-semibold text-green-700">
                  {formatRupiah((parseFloat(record.totalCash || "0") + parseFloat(record.totalQris || "0")))}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Tabel PU (Pemasukan/Pengeluaran) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calculator className="h-5 w-5 text-purple-600" />
            PU (Pemasukan & Pengeluaran)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Pemasukan */}
            <div>
              <h4 className="font-semibold text-green-700 mb-3 flex items-center gap-2">
                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                Pemasukan
              </h4>
              {incomeData.length > 0 ? (
                <div className="space-y-2">
                  {incomeData.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-green-50 rounded">
                      <span className="text-sm">{item.description || item.name || `Item ${index + 1}`}</span>
                      <span className="font-medium text-green-700">{formatRupiah(item.amount || 0)}</span>
                    </div>
                  ))}
                  <div className="border-t pt-2 mt-3">
                    <div className="flex justify-between items-center font-semibold">
                      <span>Total Pemasukan:</span>
                      <span className="text-green-700">{formatRupiah(record.totalIncome || 0)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-4">
                  <p className="text-sm">Tidak ada data pemasukan</p>
                  <p className="font-medium mt-1">{formatRupiah(record.totalIncome || 0)}</p>
                </div>
              )}
            </div>

            {/* Pengeluaran */}
            <div>
              <h4 className="font-semibold text-red-700 mb-3 flex items-center gap-2">
                <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                Pengeluaran
              </h4>
              {expenseData.length > 0 ? (
                <div className="space-y-2">
                  {expenseData.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-red-50 rounded">
                      <span className="text-sm">{item.description || item.name || `Item ${index + 1}`}</span>
                      <span className="font-medium text-red-700">{formatRupiah(item.amount || 0)}</span>
                    </div>
                  ))}
                  <div className="border-t pt-2 mt-3">
                    <div className="flex justify-between items-center font-semibold">
                      <span>Total Pengeluaran:</span>
                      <span className="text-red-700">{formatRupiah(record.totalExpenses || 0)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-4">
                  <p className="text-sm">Tidak ada data pengeluaran</p>
                  <p className="font-medium mt-1">{formatRupiah(record.totalExpenses || 0)}</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total Keseluruhan */}
      <Card className="bg-gradient-to-r from-blue-50 to-green-50 border-2 border-blue-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-xl">
            <TrendingUp className="h-6 w-6 text-blue-600" />
            Total Keseluruhan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <p className="text-3xl font-bold text-green-700 mb-2">
              {formatRupiah(record.totalSales)}
            </p>
            <p className="text-sm text-muted-foreground">
              Total penjualan pada shift ini
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SalesContent() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedStore, setSelectedStore] = useState("all");

  const { data: salesRecords, isLoading } = useQuery<Sales[]>({
    queryKey: ["/api/sales", { startDate, endDate, storeId: selectedStore !== "all" ? selectedStore : undefined }],
  });

  // Import mutation for setoran data
  const importMutation = useMutation({
    mutationFn: async (data: { storeId?: string; dateFilter?: string }) => {
      const res = await apiRequest("POST", "/api/sales/import-from-setoran", data);
      return await res.json();
    },
    onSuccess: (data) => {
      // Invalidate sales query to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/sales'] });
      
      toast({
        title: "Import Completed Successfully!",
        description: `${data.results?.successful || 0} records imported successfully${data.results?.errors > 0 ? `, ${data.results.errors} errors` : ''}${data.results?.skipped > 0 ? `, ${data.results.skipped} skipped` : ''}.`,
        variant: "default",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import setoran data to sales report",
        variant: "destructive",
      });
    },
  });

  const handleImportSetoran = async () => {
    const importData: { storeId?: string; dateFilter?: string } = {};
    
    // Add store filter if specific store is selected
    if (selectedStore !== "all") {
      importData.storeId = selectedStore;
    }
    
    // Add date filter if provided (use startDate as the filter)
    if (startDate) {
      importData.dateFilter = startDate;
    }
    
    importMutation.mutate(importData);
  };

  const handleExportPDF = async () => {
    try {
      const response = await fetch("/api/export/pdf?" + new URLSearchParams({
        startDate,
        endDate,
        storeId: selectedStore !== "all" ? selectedStore : "",
      }));
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sales-report.pdf';
        a.click();
        window.URL.revokeObjectURL(url);
        
        toast({
          title: "Success",
          description: "PDF exported successfully!",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export PDF",
        variant: "destructive",
      });
    }
  };

  const handleExportExcel = async () => {
    try {
      const response = await fetch("/api/export/excel?" + new URLSearchParams({
        startDate,
        endDate,
        storeId: selectedStore !== "all" ? selectedStore : "",
      }));
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sales-report.xlsx';
        a.click();
        window.URL.revokeObjectURL(url);
        
        toast({
          title: "Success",
          description: "Excel exported successfully!",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export Excel",
        variant: "destructive",
      });
    }
  };

  // Google Sheets sync functionality
  const [isSyncEnabled, setIsSyncEnabled] = useState(() => {
    return localStorage.getItem('sheetsSync') === 'enabled';
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(() => {
    return localStorage.getItem('lastSyncTime') || null;
  });

  // Mutation for syncing to Google Sheets
  const syncToSheetsMutation = useMutation({
    mutationFn: async (data: { salesData: Sales[]; config: any }) => {
      const res = await apiRequest("POST", "/api/sync/sheets", data);
      return await res.json();
    },
    onSuccess: () => {
      const now = new Date().toLocaleString('id-ID');
      setLastSyncTime(now);
      localStorage.setItem('lastSyncTime', now);
      
      toast({
        title: "Sync Berhasil! ✅",
        description: "Data berhasil disync ke Google Sheets",
      });
      setIsSyncing(false);
    },
    onError: (error: any) => {
      toast({
        title: "Sync Gagal ❌",
        description: error.message || "Gagal sync ke Google Sheets",
        variant: "destructive",
      });
      setIsSyncing(false);
    },
  });

  const handleSyncToSheets = async () => {
    if (!salesRecords || salesRecords.length === 0) {
      toast({
        title: "Tidak Ada Data",
        description: "Tidak ada data sales untuk di-sync",
        variant: "destructive",
      });
      return;
    }

    setIsSyncing(true);
    
    // Prepare data for Google Sheets
    const syncConfig = {
      spreadsheetId: localStorage.getItem('spreadsheetId') || '',
      sheetName: 'Sales Data',
      dateRange: { startDate, endDate },
      storeFilter: selectedStore
    };

    // If no spreadsheet ID, create CSV export instead
    if (!syncConfig.spreadsheetId) {
      handleExportCSV();
      setIsSyncing(false);
      return;
    }

    syncToSheetsMutation.mutate({
      salesData: salesRecords,
      config: syncConfig
    });
  };

  const handleExportCSV = () => {
    if (!salesRecords || salesRecords.length === 0) {
      toast({
        title: "Tidak Ada Data",
        description: "Tidak ada data untuk diekspor",
        variant: "destructive",
      });
      return;
    }

    // Convert sales data to CSV format
    const csvHeaders = [
      'Tanggal',
      'Store',
      'Staff',
      'Shift',
      'Jam Masuk',
      'Jam Keluar',
      'Total Sales (Rp)',
      'Cash (Rp)',
      'QRIS (Rp)',
      'Jumlah Transaksi',
      'Rata-rata per Transaksi (Rp)',
      'Meter Awal',
      'Meter Akhir',
      'Total Liter',
      'Total Pemasukan (Rp)',
      'Total Pengeluaran (Rp)'
    ];

    const csvRows = salesRecords.map(record => [
      new Date(record.date || '').toLocaleDateString('id-ID'),
      record.storeId === 1 ? 'Main Store' : 'Branch Store',
      getUserNameFromId(record.userId, allUsers),
      record.shift || '',
      record.checkIn || '',
      record.checkOut || '',
      record.totalSales || '0',
      record.totalCash || '0',
      record.totalQris || '0',
      record.transactions || '0',
      record.averageTicket || '0',
      record.meterStart || '0',
      record.meterEnd || '0',
      record.totalLiters || '0',
      record.totalIncome || '0',
      record.totalExpenses || '0'
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Create and download CSV file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-data-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    const now = new Date().toLocaleString('id-ID');
    setLastSyncTime(now);
    localStorage.setItem('lastSyncTime', now);

    toast({
      title: "Export Berhasil! 📊",
      description: "File CSV siap diimport ke Google Sheets",
    });
  };

  const toggleSync = () => {
    const newState = !isSyncEnabled;
    setIsSyncEnabled(newState);
    localStorage.setItem('sheetsSync', newState ? 'enabled' : 'disabled');
    
    toast({
      title: newState ? "Sync Diaktifkan" : "Sync Dinonaktifkan",
      description: newState ? "Auto-sync ke spreadsheet aktif" : "Auto-sync dimatikan",
    });
  };

  // Get users data for CSV export
  const { data: allUsers } = useQuery<any[]>({ queryKey: ['/api/users'] });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Sales Reports
          </CardTitle>
          <div className="flex gap-3">
            <Input
              type="date"
              placeholder="Start date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-auto"
              data-testid="input-start-date"
            />
            <Input
              type="date"
              placeholder="End date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-auto"
              data-testid="input-end-date"
            />
            <Select value={selectedStore} onValueChange={setSelectedStore}>
              <SelectTrigger className="w-auto" data-testid="select-store-filter">
                <SelectValue placeholder="All Stores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stores</SelectItem>
                <SelectItem value="1">Main Store</SelectItem>
                <SelectItem value="2">Branch Store</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={handleImportSetoran}
              disabled={importMutation.isPending}
              className="text-blue-600 border-blue-200 hover:bg-blue-50"
              data-testid="button-import-setoran"
            >
              {importMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              {importMutation.isPending ? "Importing..." : "Import from Setoran"}
            </Button>
            <Button
              variant="outline"
              onClick={handleExportPDF}
              className="text-red-600 border-red-200 hover:bg-red-50"
              data-testid="button-export-pdf"
            >
              <FileDown className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
            <Button
              variant="outline"
              onClick={handleExportExcel}
              className="text-green-600 border-green-200 hover:bg-green-50"
              data-testid="button-export-excel"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
            <Button
              variant="outline"
              onClick={handleSyncToSheets}
              disabled={isSyncing}
              className={`${isSyncEnabled ? 'text-purple-600 border-purple-200 hover:bg-purple-50' : 'text-gray-600 border-gray-200 hover:bg-gray-50'}`}
              data-testid="button-sync-sheets"
            >
              {isSyncing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : isSyncEnabled ? (
                <Wifi className="h-4 w-4 mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              {isSyncing ? "Syncing..." : "Sync to Sheets"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSync}
              className={`${isSyncEnabled ? 'text-green-600 hover:bg-green-50' : 'text-gray-500 hover:bg-gray-50'}`}
              data-testid="button-toggle-sync"
              title={isSyncEnabled ? "Disable auto-sync" : "Enable auto-sync"}
            >
              {isSyncEnabled ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        {lastSyncTime && (
          <div className="text-xs text-gray-500 mt-2">
            Last sync: {lastSyncTime}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">Loading sales records...</div>
        ) : salesRecords && salesRecords.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Hari Ini</TableHead>
                  <TableHead>Store</TableHead>
                  <TableHead>Total Liter</TableHead>
                  <TableHead>Total Penjualan</TableHead>
                  <TableHead>Total QRIS</TableHead>
                  <TableHead>Total Cash</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesRecords.map((record) => {
                  const recordDate = record.date ? new Date(record.date) : new Date();
                  const today = new Date();
                  const isToday = recordDate.toDateString() === today.toDateString();
                  
                  return (
                    <TableRow key={record.id}>
                      <TableCell>
                        {recordDate.toLocaleDateString('id-ID', { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </TableCell>
                      <TableCell>
                        {isToday ? (
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            Hari Ini
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {record.storeId === 1 ? "Main Store" : "Branch Store"}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                         {record.totalLiters || "0"} L
                      </TableCell>
                      <TableCell className="font-semibold text-green-700">
                        {formatRupiah(record.totalSales)}
                      </TableCell>
                      <TableCell className="text-blue-600">
                        {formatRupiah(record.totalQris || 0)}
                      </TableCell>
                      <TableCell className="text-orange-600">
                        {formatRupiah(record.totalCash || 0)}
                      </TableCell>
                      <TableCell>
                        <MultiSalesDetailModal records={[record]} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No sales records found</p>
            <p className="text-sm">Try adjusting your filters or date range</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
