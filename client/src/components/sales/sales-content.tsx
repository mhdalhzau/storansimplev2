import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileDown, FileSpreadsheet, TrendingUp, Upload, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { type Sales } from "@shared/schema";

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
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">Loading sales records...</div>
        ) : salesRecords && salesRecords.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Store</TableHead>
                  <TableHead>Total Sales</TableHead>
                  <TableHead>Transactions</TableHead>
                  <TableHead>Avg. Ticket</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      {record.date ? new Date(record.date).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell>
                      {record.storeId === 1 ? "Main Store" : "Branch Store"}
                    </TableCell>
                    <TableCell className="font-semibold">
                      ${parseFloat(record.totalSales).toFixed(2)}
                    </TableCell>
                    <TableCell>{record.transactions}</TableCell>
                    <TableCell>
                      ${record.averageTicket ? parseFloat(record.averageTicket).toFixed(2) : "0.00"}
                    </TableCell>
                  </TableRow>
                ))}
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
