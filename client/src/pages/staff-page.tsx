import { useState } from "react";
import { Users, Clock, DollarSign, TrendingUp, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { User } from "@shared/schema";

interface MenuButton {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  accessText: string;
}

interface PasswordDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMenu: MenuButton | null;
  onValidate: (password: string) => void;
  isValidating: boolean;
}

function PasswordDialog({ isOpen, onClose, selectedMenu, onValidate, isValidating }: PasswordDialogProps) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim()) {
      onValidate(password);
    }
  };

  const handleClose = () => {
    setPassword("");
    setShowPassword(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {selectedMenu?.icon}
            Akses {selectedMenu?.label}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Teks untuk disalin:
            </p>
            <p className="text-sm font-mono bg-white dark:bg-gray-900 p-2 rounded border">
              {selectedMenu?.accessText}
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Masukkan Password Anda</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password..."
                  disabled={isValidating}
                  data-testid="input-password-validation"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isValidating}
                  data-testid="button-toggle-password"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isValidating}
                data-testid="button-cancel-password"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={!password.trim() || isValidating}
                data-testid="button-validate-password"
              >
                {isValidating ? "Memvalidasi..." : "Validasi"}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function StaffPage() {
  const { toast } = useToast();
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState<MenuButton | null>(null);
  
  // Query untuk fetch staff users only
  const { data: staffUsers = [], isLoading: isLoadingStaff } = useQuery({
    queryKey: ['/api/users/staff'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/users/staff');
      return response.json();
    },
  });

  // Password validation mutation
  const validatePasswordMutation = useMutation({
    mutationFn: async (password: string) => {
      const response = await apiRequest('POST', '/api/validate-password', { password });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.valid) {
        toast({
          title: "✅ Password Valid",
          description: `Akses ke ${selectedMenu?.label} berhasil`,
          variant: "default",
        });
        setShowPasswordDialog(false);
        // Handle successful access here - could redirect or show content
      }
    },
    onError: (error: any) => {
      toast({
        title: "❌ Password Salah",
        description: "Password yang Anda masukkan tidak benar",
        variant: "destructive",
      });
    },
  });
  
  // Menu buttons configuration
  const menuButtons: MenuButton[] = [
    {
      id: "attendance",
      label: "Absensi",
      icon: <Clock className="h-6 w-6" />,
      color: "bg-blue-500 hover:bg-blue-600",
      accessText: "Akses menu absensi untuk melihat dan mengelola data kehadiran karyawan"
    },
    {
      id: "cashflow",
      label: "Cashflow",
      icon: <DollarSign className="h-6 w-6" />,
      color: "bg-green-500 hover:bg-green-600",
      accessText: "Akses menu cashflow untuk melihat dan mengelola arus kas harian"
    },
    {
      id: "sales",
      label: "Sales Reports",
      icon: <TrendingUp className="h-6 w-6" />,
      color: "bg-purple-500 hover:bg-purple-600",
      accessText: "Akses menu laporan penjualan untuk melihat data dan analisis penjualan"
    }
  ];

  const handleMenuClick = (menu: MenuButton) => {
    setSelectedMenu(menu);
    setShowPasswordDialog(true);
  };

  const handlePasswordValidation = (password: string) => {
    validatePasswordMutation.mutate(password);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center justify-center gap-2">
            <Users className="h-8 w-8" />
            Halaman Staff
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Daftar Staff dan Menu Akses
          </p>
        </div>

        {/* Menu Buttons */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              Menu Akses Staff
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {menuButtons.map((menu) => (
                <Button
                  key={menu.id}
                  onClick={() => handleMenuClick(menu)}
                  className={`${menu.color} text-white h-24 flex flex-col items-center justify-center gap-2 transition-all duration-200 transform hover:scale-105`}
                  data-testid={`button-menu-${menu.id}`}
                >
                  {menu.icon}
                  <span className="font-medium">{menu.label}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Staff List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Daftar Staff
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingStaff ? (
              <div className="text-center py-8 text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                Loading staff data...
              </div>
            ) : staffUsers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Tidak ada data staff ditemukan</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {staffUsers.map((staff: User) => (
                  <div
                    key={staff.id}
                    className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-shadow"
                    data-testid={`card-staff-${staff.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                        <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 dark:text-white" data-testid={`text-staff-name-${staff.id}`}>
                          {staff.name}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400" data-testid={`text-staff-email-${staff.id}`}>
                          {staff.email}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            {staff.role}
                          </span>
                          {staff.storeId && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              Store {staff.storeId}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Password Dialog */}
        <PasswordDialog
          isOpen={showPasswordDialog}
          onClose={() => setShowPasswordDialog(false)}
          selectedMenu={selectedMenu}
          onValidate={handlePasswordValidation}
          isValidating={validatePasswordMutation.isPending}
        />
      </div>
    </div>
  );
}