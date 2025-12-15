import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation, Link } from "wouter";
import { useEffect, useState } from "react";
import loginHeroImage from "@assets/stock_images/workspace_desk_lapto_4a3916c9.jpg";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck } from "lucide-react";
import MultiStepRegistrationForm from "@/components/MultiStepRegistrationForm";
import { API_BASE_URL } from "@/lib/queryClient";

export default function LoginPage() {
  const { user, userRole, setUser, setUserRole, setDbUserId, setCompanyId } = useAuth();
  const [location, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();
  
  const cleanPath = location.split('?')[0].replace(/\/$/, '');
  const formType = cleanPath === '/register' ? 'register' : cleanPath === '/login/admin' ? 'admin' : 'user';
  
  const [companyRegData, setCompanyRegData] = useState({ 
    name: "", 
    email: "", 
    password: "", 
    phone: "", 
    website: "", 
    location: "", 
    description: "", 
    acceptTerms: false 
  });
  const [companyAdminData, setCompanyAdminData] = useState({ companyName: "", email: "", serverId: "", password: "" });
  const [companyUserData, setCompanyUserData] = useState({ username: "", userId: "", password: "" });

  useEffect(() => {
    if (user && userRole) {
      const isAdmin = userRole === "super_admin" || userRole === "company_admin";
      const isUser = userRole === "company_member";
      const isTeamLeader = userRole === "team_leader";
      if (isAdmin) {
        setLocation("/admin");
      } else if (isTeamLeader) {
        setLocation("/team-leader");
      } else if (isUser) {
        setLocation("/user");
      }
    }
  }, [user, userRole, setLocation]);

  useEffect(() => {
    setError("");
    setIsLoading(false);
  }, [location]);

  const handleCompanyRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register-company`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(companyRegData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Registration failed');
      }
      
      const data = await response.json();
      toast({
        title: "Success!",
        description: data.message,
        duration: 10000,
      });
      setCompanyRegData({ 
        name: "", 
        email: "", 
        password: "", 
        phone: "", 
        website: "", 
        location: "", 
        description: "", 
        acceptTerms: false 
      });
      setIsLoading(false);
    } catch (error: any) {
      setError(error.message || "Registration failed");
      setIsLoading(false);
    }
  };

  const handleCompanyAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/company-admin-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(companyAdminData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }
      
      const userData = await response.json();
      if (userData.message) {
        toast({
          title: "Welcome!",
          description: userData.message,
          duration: 10000,
        });
      }
      setUser(userData);
      setUserRole(userData.role);
      setDbUserId(userData.id);
      setCompanyId(userData.companyId || null);
      localStorage.setItem('user', JSON.stringify(userData));
    } catch (error: any) {
      setError(error.message || "Login failed");
      setIsLoading(false);
    }
  };

  const handleCompanyUserLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/company-user-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(companyUserData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }
      
      const userData = await response.json();
      setUser(userData);
      setUserRole(userData.role);
      setDbUserId(userData.id);
      setCompanyId(userData.companyId || null);
      localStorage.setItem('user', JSON.stringify(userData));
    } catch (error: any) {
      setError(error.message || "Login failed");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img
          src={loginHeroImage}
          alt="Professional workspace"
          className="object-cover w-full h-full"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/40"></div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8 bg-background">
        <div className="w-full max-w-md space-y-6 sm:space-y-8">
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">WorkLogix</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Employee Work Tracking & Task Management</p>
          </div>

{formType === 'register' && <MultiStepRegistrationForm />}

          {formType === 'admin' && (
            <Card>
              <CardHeader>
                <CardTitle>Company Admin Login</CardTitle>
                <CardDescription>Access your company dashboard</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCompanyAdminLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="admin-company-name">Company Name</Label>
                    <Input
                      id="admin-company-name"
                      type="text"
                      placeholder="Acme Inc"
                      value={companyAdminData.companyName}
                      onChange={(e) => setCompanyAdminData({ ...companyAdminData, companyName: e.target.value })}
                      required
                      data-testid="input-admin-company-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin-email">Company Email</Label>
                    <Input
                      id="admin-email"
                      type="email"
                      placeholder="admin@company.com"
                      value={companyAdminData.email}
                      onChange={(e) => setCompanyAdminData({ ...companyAdminData, email: e.target.value })}
                      required
                      data-testid="input-admin-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="admin-server-id">Company Server ID</Label>
                      <Link href="/forgot-company-id" className="text-xs text-primary hover:underline" data-testid="link-forgot-company-id">
                        Forgot Company ID?
                      </Link>
                    </div>
                    <Input
                      id="admin-server-id"
                      type="text"
                      placeholder="CMP-XYZ123"
                      value={companyAdminData.serverId}
                      onChange={(e) => setCompanyAdminData({ ...companyAdminData, serverId: e.target.value })}
                      required
                      data-testid="input-admin-server-id"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="admin-password">Password</Label>
                      <Link href="/forgot-password" className="text-xs text-primary hover:underline" data-testid="link-forgot-password">
                        Forgot Password?
                      </Link>
                    </div>
                    <Input
                      id="admin-password"
                      type="password"
                      value={companyAdminData.password}
                      onChange={(e) => setCompanyAdminData({ ...companyAdminData, password: e.target.value })}
                      required
                      data-testid="input-admin-password"
                    />
                  </div>
                  {error && <p className="text-sm text-red-500" data-testid="error-message">{error}</p>}
                  <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-admin-login">
                    {isLoading ? "Signing in..." : "Sign In"}
                  </Button>
                  <div className="text-center text-sm text-muted-foreground">
                    Don't have an account?{" "}
                    <Link href="/register" className="text-primary hover:underline" data-testid="link-to-register">
                      Register Company
                    </Link>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {formType === 'user' && (
            <Card>
              <CardHeader>
                <CardTitle>Company User Login</CardTitle>
                <CardDescription>Access your workspace</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCompanyUserLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="user-username">Username</Label>
                    <Input
                      id="user-username"
                      type="text"
                      placeholder="John Doe"
                      value={companyUserData.username}
                      onChange={(e) => setCompanyUserData({ ...companyUserData, username: e.target.value })}
                      required
                      data-testid="input-user-username"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="user-id">User ID</Label>
                    <Input
                      id="user-id"
                      type="text"
                      placeholder="USER-ABC123"
                      value={companyUserData.userId}
                      onChange={(e) => setCompanyUserData({ ...companyUserData, userId: e.target.value })}
                      required
                      data-testid="input-user-id"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="user-password">Password</Label>
                      <Link href="/forgot-password" className="text-xs text-primary hover:underline" data-testid="link-forgot-password-user">
                        Forgot Password?
                      </Link>
                    </div>
                    <Input
                      id="user-password"
                      type="password"
                      value={companyUserData.password}
                      onChange={(e) => setCompanyUserData({ ...companyUserData, password: e.target.value })}
                      required
                      data-testid="input-user-password"
                    />
                  </div>
                  {error && <p className="text-sm text-red-500" data-testid="error-message">{error}</p>}
                  <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-user-login">
                    {isLoading ? "Signing in..." : "Sign In"}
                  </Button>
                  <div className="text-center text-sm text-muted-foreground">
                    Company admin?{" "}
                    <Link href="/login/admin" className="text-primary hover:underline" data-testid="link-to-admin-login-from-user">
                      Admin Login
                    </Link>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <div className="text-center">
            <Link href="/superadmin">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground" data-testid="link-super-admin">
                <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
                Super Admin Access
              </Button>
            </Link>
          </div>
          
          <p className="text-xs text-center text-muted-foreground">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}
