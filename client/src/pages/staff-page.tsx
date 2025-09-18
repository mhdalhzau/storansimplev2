import { useState, useEffect } from "react";
import { Plus, Minus, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface ExpenseItem {
  id: string;
  description: string;
  amount: number;
}

interface IncomeItem {
  id: string;
  description: string;
  amount: number;
}

export default function StaffPage() {
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState("");
  
  // Form data
  const [employeeName, setEmployeeName] = useState("");
  const [jamMasuk, setJamMasuk] = useState("");
  const [jamKeluar, setJamKeluar] = useState("");
  const [nomorAwal, setNomorAwal] = useState(0);
  const [nomorAkhir, setNomorAkhir] = useState(0);
  const [qrisSetoran, setQrisSetoran] = useState(0);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [income, setIncome] = useState<IncomeItem[]>([]);

  // Calculations
  const totalLiter = nomorAkhir - nomorAwal;
  const totalSetoran = totalLiter * 11500; // Total = Total Liter × 11500
  const cashSetoran = totalSetoran - qrisSetoran; // Cash = Total - QRIS
  const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);
  const totalIncome = income.reduce((sum, item) => sum + item.amount, 0);
  const totalKeseluruhan = totalSetoran + totalIncome - totalExpenses;

  useEffect(() => {
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    setCurrentDate(today.toLocaleDateString('id-ID', options));
  }, []);

  const addExpenseItem = () => {
    const newItem: ExpenseItem = {
      id: Date.now().toString(),
      description: "",
      amount: 0
    };
    setExpenses([...expenses, newItem]);
  };

  const removeExpenseItem = (id: string) => {
    setExpenses(expenses.filter(item => item.id !== id));
  };

  const updateExpenseItem = (id: string, field: keyof ExpenseItem, value: string | number) => {
    setExpenses(expenses.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const addIncomeItem = () => {
    const newItem: IncomeItem = {
      id: Date.now().toString(),
      description: "",
      amount: 0
    };
    setIncome([...income, newItem]);
  };

  const removeIncomeItem = (id: string) => {
    setIncome(income.filter(item => item.id !== id));
  };

  const updateIncomeItem = (id: string, field: keyof IncomeItem, value: string | number) => {
    setIncome(income.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const copyToClipboard = () => {
    const reportText = `
Setoran Harian 📋
${currentDate}

🤷‍♂️ Nama Karyawan: ${employeeName}

🕐 Jam Kerja:
Jam Masuk: ${jamMasuk}
Jam Keluar: ${jamKeluar}

⛽ Data Meter:
Nomor Awal: ${nomorAwal}
Nomor Akhir: ${nomorAkhir}
Total Liter: ${totalLiter.toFixed(2)} L

💰 Setoran:
Cash: ${formatCurrency(cashSetoran)}
QRIS: ${formatCurrency(qrisSetoran)}
Total: ${formatCurrency(totalSetoran)}

💸 Pengeluaran (PU):
${expenses.map(item => `- ${item.description}: ${formatCurrency(item.amount)}`).join('\n')}
Total Pengeluaran: ${formatCurrency(totalExpenses)}

💵 Pemasukan (PU):
${income.map(item => `- ${item.description}: ${formatCurrency(item.amount)}`).join('\n')}
Total Pemasukan: ${formatCurrency(totalIncome)}

💼 Total Keseluruhan: ${formatCurrency(totalKeseluruhan)}
Setoran: ${formatCurrency(totalSetoran)} + Pemasukan: ${formatCurrency(totalIncome)} - Pengeluaran: ${formatCurrency(totalExpenses)}
    `.trim();

    navigator.clipboard.writeText(reportText);
    toast({
      title: "Berhasil disalin!",
      description: "Data setoran harian telah disalin ke clipboard",
    });
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Setoran Harian 📋
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            {currentDate}
          </p>
        </div>

        {/* Employee Name */}
        <Card>
          <CardContent className="pt-6">
            <Label className="text-lg font-semibold flex items-center gap-2">
              🤷‍♂️ Nama Karyawan
            </Label>
            <Input
              placeholder="Masukkan nama karyawan"
              value={employeeName}
              onChange={(e) => setEmployeeName(e.target.value)}
              className="mt-2"
              data-testid="input-employee-name"
            />
          </CardContent>
        </Card>

        {/* Working Hours */}
        <Card>
          <CardContent className="pt-6">
            <Label className="text-lg font-semibold flex items-center gap-2 mb-4">
              🕐 Jam Kerja
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Jam Masuk</Label>
                <Input
                  type="time"
                  value={jamMasuk}
                  onChange={(e) => setJamMasuk(e.target.value)}
                  data-testid="input-jam-masuk"
                />
              </div>
              <div>
                <Label>Jam Keluar</Label>
                <Input
                  type="time"
                  value={jamKeluar}
                  onChange={(e) => setJamKeluar(e.target.value)}
                  data-testid="input-jam-keluar"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Meter Data */}
        <Card>
          <CardContent className="pt-6">
            <Label className="text-lg font-semibold flex items-center gap-2 mb-4">
              ⛽ Data Meter
            </Label>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <Label>Nomor Awal</Label>
                <Input
                  type="number"
                  value={nomorAwal || ""}
                  onChange={(e) => setNomorAwal(Number(e.target.value) || 0)}
                  data-testid="input-nomor-awal"
                />
              </div>
              <div>
                <Label>Nomor Akhir</Label>
                <Input
                  type="number"
                  value={nomorAkhir || ""}
                  onChange={(e) => setNomorAkhir(Number(e.target.value) || 0)}
                  data-testid="input-nomor-akhir"
                />
              </div>
            </div>
            <div>
              <Label>Total Liter</Label>
              <div className="relative">
                <Input
                  value={`${totalLiter.toFixed(2)} L`}
                  readOnly
                  className="bg-black text-white font-semibold cursor-default"
                  data-testid="display-total-liter"
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-black text-white px-2 py-1 rounded text-sm font-bold">
                  {totalLiter.toFixed(2)} L
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Setoran */}
        <Card>
          <CardContent className="pt-6">
            <Label className="text-lg font-semibold flex items-center gap-2 mb-4">
              💰 Setoran
            </Label>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Cash</Label>
                <div className="flex items-center gap-2">
                  <span>Rp</span>
                  <Input
                    value={cashSetoran || "0"}
                    readOnly
                    className="bg-gray-50 cursor-default"
                    data-testid="display-cash-setoran"
                  />
                </div>
              </div>
              <div>
                <Label>QRIS</Label>
                <div className="flex items-center gap-2">
                  <span>Rp</span>
                  <Input
                    type="number"
                    value={qrisSetoran || ""}
                    onChange={(e) => setQrisSetoran(Number(e.target.value) || 0)}
                    data-testid="input-qris-setoran"
                  />
                </div>
              </div>
              <div>
                <Label>Total</Label>
                <div className="flex items-center gap-2">
                  <span>Rp</span>
                  <div className="relative">
                    <Input
                      value={totalSetoran || "0"}
                      readOnly
                      className="pr-10 bg-green-50 cursor-default"
                      data-testid="display-total-setoran"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Expenses */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <Label className="text-lg font-semibold flex items-center gap-2">
                💸 Pengeluaran (PU)
              </Label>
              <Button
                onClick={addExpenseItem}
                size="sm"
                className="flex items-center gap-2"
                data-testid="button-add-expense"
              >
                <Plus className="h-4 w-4" />
                Tambah Item
              </Button>
            </div>
            <div className="space-y-3">
              {expenses.map((item) => (
                <div key={item.id} className="flex items-center gap-2">
                  <Input
                    placeholder="Deskripsi"
                    value={item.description}
                    onChange={(e) => updateExpenseItem(item.id, 'description', e.target.value)}
                    className="flex-1"
                  />
                  <div className="flex items-center gap-1">
                    <span>Rp</span>
                    <Input
                      type="number"
                      value={item.amount || ""}
                      onChange={(e) => updateExpenseItem(item.id, 'amount', Number(e.target.value) || 0)}
                      className="w-32"
                    />
                  </div>
                  <Button
                    onClick={() => removeExpenseItem(item.id)}
                    size="sm"
                    variant="destructive"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg mt-4">
              <Label className="text-lg font-semibold">
                Total Pengeluaran: {formatCurrency(totalExpenses)}
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Income */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <Label className="text-lg font-semibold flex items-center gap-2">
                💵 Pemasukan (PU)
              </Label>
              <Button
                onClick={addIncomeItem}
                size="sm"
                className="flex items-center gap-2"
                data-testid="button-add-income"
              >
                <Plus className="h-4 w-4" />
                Tambah Item
              </Button>
            </div>
            <div className="space-y-3">
              {income.map((item) => (
                <div key={item.id} className="flex items-center gap-2">
                  <Input
                    placeholder="Deskripsi"
                    value={item.description}
                    onChange={(e) => updateIncomeItem(item.id, 'description', e.target.value)}
                    className="flex-1"
                  />
                  <div className="flex items-center gap-1">
                    <span>Rp</span>
                    <Input
                      type="number"
                      value={item.amount || ""}
                      onChange={(e) => updateIncomeItem(item.id, 'amount', Number(e.target.value) || 0)}
                      className="w-32"
                    />
                  </div>
                  <Button
                    onClick={() => removeIncomeItem(item.id)}
                    size="sm"
                    variant="destructive"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg mt-4">
              <Label className="text-lg font-semibold">
                Total Pemasukan: {formatCurrency(totalIncome)}
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Total Overall */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <Label className="text-xl font-bold flex items-center justify-center gap-2">
                💼 Total Keseluruhan: {formatCurrency(totalKeseluruhan)}
              </Label>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Setoran: {formatCurrency(totalSetoran)} + Pemasukan: {formatCurrency(totalIncome)} - Pengeluaran: {formatCurrency(totalExpenses)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Copy Button */}
        <Button
          onClick={copyToClipboard}
          className="w-full flex items-center gap-2"
          size="lg"
          data-testid="button-copy-clipboard"
        >
          <Copy className="h-5 w-5" />
          Copy ke Clipboard
        </Button>
      </div>
    </div>
  );
}