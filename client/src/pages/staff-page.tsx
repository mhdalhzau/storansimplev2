import { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, Minus, Copy, AlertTriangle, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { pythonApiRequest } from "@/lib/queryClient";

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

// Custom Hook untuk validasi input decimal
const useDecimalInput = (initialValue: number = 0) => {
  const [value, setValue] = useState<number>(initialValue);

  const validateAndCleanInput = useCallback((inputValue: string): string => {
    let cleanedValue = inputValue;
    
    // 1. Pencegahan Input Alfabet
    cleanedValue = cleanedValue.replace(/[a-zA-Z]/g, '');
    
    // 2. Konversi Otomatis: Titik ke koma
    cleanedValue = cleanedValue.replace(/\./g, ',');
    
    // 3. Validasi Ketat: Hanya angka dan koma
    cleanedValue = cleanedValue.replace(/[^0-9,]/g, '');
    
    // 4. Pembatasan Format: Maksimal 3 digit setelah koma
    const parts = cleanedValue.split(',');
    if (parts.length > 2) {
      cleanedValue = parts[0] + ',' + parts[1];
    }
    if (parts.length === 2 && parts[1].length > 3) {
      cleanedValue = parts[0] + ',' + parts[1].substring(0, 3);
    }
    
    return cleanedValue;
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const cleanedValue = validateAndCleanInput(e.target.value);
    
    if (cleanedValue === '' || cleanedValue === ',') {
      setValue(0);
    } else {
      const numValue = parseFloat(cleanedValue.replace(',', '.'));
      if (!isNaN(numValue) && numValue >= 0) {
        setValue(numValue);
      }
    }
  }, [validateAndCleanInput]);

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const paste = e.clipboardData?.getData('text') || '';
    const cleanedPaste = validateAndCleanInput(paste);
    
    (e.target as HTMLInputElement).value = cleanedPaste;
    e.target.dispatchEvent(new Event('input', { bubbles: true }));
  }, [validateAndCleanInput]);

  const displayValue = useMemo(() => {
    return value === 0 ? "" : value.toString().replace('.', ',');
  }, [value]);

  return {
    value,
    displayValue,
    handleChange,
    handlePaste,
    setValue
  };
};

// Custom Hook untuk manajemen items (expenses/income)
const useItemsManager = <T extends { id: string; description: string; amount: number }>() => {
  const [items, setItems] = useState<T[]>([]);

  const addItem = useCallback((newItem: T) => {
    setItems(prevItems => [...prevItems, newItem]);
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems(prevItems => prevItems.filter(item => item.id !== id));
  }, []);

  const updateItem = useCallback((id: string, field: keyof T, value: string | number) => {
    setItems(prevItems => 
      prevItems.map(item => 
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  }, []);

  const validItems = useMemo(() => 
    items.filter(item => item.description.trim() && item.amount > 0), 
    [items]
  );

  const incompleteItems = useMemo(() => 
    items.filter(item => 
      (item.description.trim() && item.amount <= 0) || 
      (!item.description.trim() && item.amount > 0)
    ), 
    [items]
  );

  const total = useMemo(() => 
    validItems.reduce((sum, item) => sum + item.amount, 0), 
    [validItems]
  );

  return {
    items,
    validItems,
    incompleteItems,
    total,
    addItem,
    removeItem,
    updateItem,
    hasIncomplete: incompleteItems.length > 0
  };
};

export default function StaffPage() {
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState("");
  
  // Mutation untuk save data ke Python API
  const saveSetoranMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await pythonApiRequest('POST', '/api/setoran', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "✅ Berhasil Disimpan",
        description: "Data setoran harian berhasil disimpan ke database",
        variant: "default",
      });
      
      // Reset form setelah berhasil save
      setEmployeeName("");
      setJamMasuk("");
      setJamKeluar("");
      setNomorAwal(0);
      setNomorAkhir(0);
      setQrisSetoran(0);
      setExpenses([]);
      setIncome([]);
    },
    onError: (error: any) => {
      toast({
        title: "❌ Gagal Menyimpan",
        description: `Error: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
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
  const totalLiter = Math.max(0, nomorAkhir - nomorAwal); // Prevent negative liter
  const totalSetoran = totalLiter * 11500; // Total = Total Liter × 11500
  const cashSetoran = Math.max(0, totalSetoran - qrisSetoran); // Cash = Total - QRIS, prevent negative
  
  // Only count valid items (with description and amount > 0)
  const validExpenses = expenses.filter(item => item.description.trim() && item.amount > 0);
  const validIncome = income.filter(item => item.description.trim() && item.amount > 0);
  const totalExpenses = validExpenses.reduce((sum, item) => sum + item.amount, 0);
  const totalIncome = validIncome.reduce((sum, item) => sum + item.amount, 0);
  const totalKeseluruhan = cashSetoran + totalIncome - totalExpenses; // Cash + Pemasukan - Pengeluaran

  // Check for incomplete entries (partially filled forms)
  const incompleteExpenses = expenses.filter(item => 
    (item.description.trim() && item.amount <= 0) || (!item.description.trim() && item.amount > 0)
  );
  const incompleteIncome = income.filter(item => 
    (item.description.trim() && item.amount <= 0) || (!item.description.trim() && item.amount > 0)
  );
  const hasIncompleteExpenses = incompleteExpenses.length > 0;
  const hasIncompleteIncome = incompleteIncome.length > 0;

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
    // Validasi - cek apakah semua item sudah diisi
    const hasEmptyFields = expenses.some(item => !item.description.trim() || item.amount <= 0);
    
    if (hasEmptyFields) {
      toast({
        title: "Data Belum Lengkap",
        description: "Lengkapi semua field pengeluaran sebelum menambah item baru",
        variant: "destructive",
      });
      return;
    }

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
    // Validasi - cek apakah semua item sudah diisi
    const hasEmptyFields = income.some(item => !item.description.trim() || item.amount <= 0);
    
    if (hasEmptyFields) {
      toast({
        title: "Data Belum Lengkap",
        description: "Lengkapi semua field pemasukan sebelum menambah item baru",
        variant: "destructive",
      });
      return;
    }

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
      maximumFractionDigits: 0,
      currencyDisplay: 'symbol'
    }).format(amount);
  };

  const formatNumber = (amount: number) => {
    return new Intl.NumberFormat('id-ID').format(amount);
  };

  const saveToDatabase = async () => {
    // Validasi form
    if (!employeeName.trim()) {
      toast({
        title: "❌ Data Tidak Lengkap",
        description: "Nama karyawan harus diisi",
        variant: "destructive",
      });
      return;
    }
    
    if (!jamMasuk || !jamKeluar) {
      toast({
        title: "❌ Data Tidak Lengkap", 
        description: "Jam masuk dan jam keluar harus diisi",
        variant: "destructive",
      });
      return;
    }
    
    if (nomorAkhir <= nomorAwal) {
      toast({
        title: "❌ Data Tidak Valid",
        description: "Nomor akhir harus lebih besar dari nomor awal",
        variant: "destructive",
      });
      return;
    }
    
    // Cek jika ada incomplete items
    if (hasIncompleteExpenses || hasIncompleteIncome) {
      toast({
        title: "❌ Data Tidak Lengkap",
        description: "Harap lengkapi atau hapus item yang belum diisi dengan sempurna",
        variant: "destructive",
      });
      return;
    }
    
    // Prepare data untuk API
    const setoranData = {
      employee_name: employeeName,
      jam_masuk: jamMasuk,
      jam_keluar: jamKeluar,
      nomor_awal: nomorAwal,
      nomor_akhir: nomorAkhir,
      qris_setoran: qrisSetoran,
      expenses: validExpenses,
      income: validIncome
    };
    
    // Save ke database
    saveSetoranMutation.mutate(setoranData);
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
${validExpenses.map(item => `- ${item.description}: ${formatCurrency(item.amount)}`).join('\n')}
Total Pengeluaran: ${formatCurrency(totalExpenses)}

💵 Pemasukan (PU):
${validIncome.map(item => `- ${item.description}: ${formatCurrency(item.amount)}`).join('\n')}
Total Pemasukan: ${formatCurrency(totalIncome)}

💼 Total Keseluruhan: ${formatCurrency(totalKeseluruhan)}
Cash: ${formatCurrency(cashSetoran)} + Pemasukan: ${formatCurrency(totalIncome)} - Pengeluaran: ${formatCurrency(totalExpenses)}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Nomor Awal (Liter)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="Contoh: 1234,567"
                  value={nomorAwal === 0 ? "" : nomorAwal.toString().replace('.', ',')}
                  onChange={(e) => {
                    let value = e.target.value;
                    
                    // 1. Pencegahan Input Alfabet: Hapus semua karakter alfabet
                    value = value.replace(/[a-zA-Z]/g, '');
                    
                    // 2. Konversi Otomatis: Titik (.) otomatis diubah menjadi koma (,)
                    value = value.replace(/\./g, ',');
                    
                    // 3. Validasi Ketat: Hanya menerima digit angka (0-9) dan koma (,)
                    value = value.replace(/[^0-9,]/g, '');
                    
                    // 4. Pembatasan Format: Maksimal 3 digit di belakang koma
                    const parts = value.split(',');
                    if (parts.length > 2) {
                      // Jika ada lebih dari satu koma, ambil yang pertama saja
                      value = parts[0] + ',' + parts[1];
                    }
                    if (parts.length === 2 && parts[1].length > 3) {
                      // Batasi maksimal 3 digit setelah koma
                      value = parts[0] + ',' + parts[1].substring(0, 3);
                    }
                    
                    // Update state
                    if (value === '' || value === ',') {
                      setNomorAwal(0);
                    } else {
                      // Convert Indonesian format (comma) to JavaScript decimal (dot)
                      const numValue = parseFloat(value.replace(',', '.'));
                      if (!isNaN(numValue) && numValue >= 0) {
                        setNomorAwal(numValue);
                      }
                    }
                  }}
                  onPaste={(e) => {
                    // 5. Pencegahan Paste: Mencegah pengguna menempelkan teks yang mengandung huruf
                    e.preventDefault();
                    const paste = e.clipboardData?.getData('text') || '';
                    let cleanedPaste = paste
                      .replace(/[a-zA-Z]/g, '') // Hapus alfabet
                      .replace(/\./g, ',') // Konversi titik ke koma
                      .replace(/[^0-9,]/g, ''); // Hanya angka dan koma
                    
                    // Batasi format koma
                    const parts = cleanedPaste.split(',');
                    if (parts.length > 2) {
                      cleanedPaste = parts[0] + ',' + parts[1];
                    }
                    if (parts.length === 2 && parts[1].length > 3) {
                      cleanedPaste = parts[0] + ',' + parts[1].substring(0, 3);
                    }
                    
                    // Trigger onChange dengan nilai yang sudah dibersihkan
                    (e.target as HTMLInputElement).value = cleanedPaste;
                    e.target.dispatchEvent(new Event('input', { bubbles: true }));
                  }}
                  data-testid="input-nomor-awal"
                />
              </div>
              <div>
                <Label>Nomor Akhir (Liter)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="Contoh: 1567,234"
                  value={nomorAkhir === 0 ? "" : nomorAkhir.toString().replace('.', ',')}
                  onChange={(e) => {
                    let value = e.target.value;
                    
                    // 1. Pencegahan Input Alfabet: Hapus semua karakter alfabet
                    value = value.replace(/[a-zA-Z]/g, '');
                    
                    // 2. Konversi Otomatis: Titik (.) otomatis diubah menjadi koma (,)
                    value = value.replace(/\./g, ',');
                    
                    // 3. Validasi Ketat: Hanya menerima digit angka (0-9) dan koma (,)
                    value = value.replace(/[^0-9,]/g, '');
                    
                    // 4. Pembatasan Format: Maksimal 3 digit di belakang koma
                    const parts = value.split(',');
                    if (parts.length > 2) {
                      // Jika ada lebih dari satu koma, ambil yang pertama saja
                      value = parts[0] + ',' + parts[1];
                    }
                    if (parts.length === 2 && parts[1].length > 3) {
                      // Batasi maksimal 3 digit setelah koma
                      value = parts[0] + ',' + parts[1].substring(0, 3);
                    }
                    
                    // Update state
                    if (value === '' || value === ',') {
                      setNomorAkhir(0);
                    } else {
                      // Convert Indonesian format (comma) to JavaScript decimal (dot)
                      const numValue = parseFloat(value.replace(',', '.'));
                      if (!isNaN(numValue) && numValue >= 0) {
                        setNomorAkhir(numValue);
                      }
                    }
                  }}
                  onPaste={(e) => {
                    // 5. Pencegahan Paste: Mencegah pengguna menempelkan teks yang mengandung huruf
                    e.preventDefault();
                    const paste = e.clipboardData?.getData('text') || '';
                    let cleanedPaste = paste
                      .replace(/[a-zA-Z]/g, '') // Hapus alfabet
                      .replace(/\./g, ',') // Konversi titik ke koma
                      .replace(/[^0-9,]/g, ''); // Hanya angka dan koma
                    
                    // Batasi format koma
                    const parts = cleanedPaste.split(',');
                    if (parts.length > 2) {
                      cleanedPaste = parts[0] + ',' + parts[1];
                    }
                    if (parts.length === 2 && parts[1].length > 3) {
                      cleanedPaste = parts[0] + ',' + parts[1].substring(0, 3);
                    }
                    
                    // Trigger onChange dengan nilai yang sudah dibersihkan
                    (e.target as HTMLInputElement).value = cleanedPaste;
                    e.target.dispatchEvent(new Event('input', { bubbles: true }));
                  }}
                  data-testid="input-nomor-akhir"
                />
              </div>
              <div>
                <Label>Total Liter</Label>
                <Input
                  value={`${totalLiter.toFixed(2)} L`}
                  readOnly
                  className="bg-black text-white font-semibold cursor-default"
                  data-testid="display-total-liter"
                />
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Cash</Label>
                <div className="flex items-center gap-2">
                  <span>Rp</span>
                  <Input
                    value={formatNumber(cashSetoran)}
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
                    min="0"
                    value={qrisSetoran || ""}
                    onChange={(e) => setQrisSetoran(Math.max(0, Number(e.target.value) || 0))}
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
                      value={formatNumber(totalSetoran)}
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
            
            {/* Reminder for incomplete expenses */}
            {hasIncompleteExpenses && (
              <Alert className="mb-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                  ⚠️ <strong>Reminder:</strong> Ada {incompleteExpenses.length} item pengeluaran yang belum lengkap. 
                  Silakan <strong>lengkapi semua field</strong> atau <strong>hapus item</strong> yang tidak digunakan 
                  dengan tombol <Minus className="h-3 w-3 inline mx-1" /> merah.
                </AlertDescription>
              </Alert>
            )}
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
                      min="0"
                      value={item.amount || ""}
                      onChange={(e) => updateExpenseItem(item.id, 'amount', Math.max(0, Number(e.target.value) || 0))}
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
            
            {/* Reminder for incomplete income */}
            {hasIncompleteIncome && (
              <Alert className="mb-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                  ⚠️ <strong>Reminder:</strong> Ada {incompleteIncome.length} item pemasukan yang belum lengkap. 
                  Silakan <strong>lengkapi semua field</strong> atau <strong>hapus item</strong> yang tidak digunakan 
                  dengan tombol <Minus className="h-3 w-3 inline mx-1" /> merah.
                </AlertDescription>
              </Alert>
            )}
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
                      min="0"
                      value={item.amount || ""}
                      onChange={(e) => updateIncomeItem(item.id, 'amount', Math.max(0, Number(e.target.value) || 0))}
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
                Cash: {formatCurrency(cashSetoran)} + Pemasukan: {formatCurrency(totalIncome)} - Pengeluaran: {formatCurrency(totalExpenses)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Save and Copy Buttons */}
        <div className="space-y-3">
          <Button
            onClick={saveToDatabase}
            className="w-full flex items-center gap-2 bg-green-600 hover:bg-green-700"
            size="lg"
            disabled={saveSetoranMutation.isPending}
            data-testid="button-save-database"
          >
            <Save className="h-5 w-5" />
            {saveSetoranMutation.isPending ? "Menyimpan..." : "Simpan ke Database"}
          </Button>
          
          <Button
            onClick={copyToClipboard}
            className="w-full flex items-center gap-2"
            size="lg"
            variant="outline"
            data-testid="button-copy-clipboard"
          >
            <Copy className="h-5 w-5" />
            Copy ke Clipboard
          </Button>
        </div>
      </div>
    </div>
  );
}