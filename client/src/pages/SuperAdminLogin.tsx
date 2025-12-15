import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { API_BASE_URL } from "@/lib/queryClient";

export default function SuperAdminLogin() {
    const { user, userRole, setUser, setUserRole, setDbUserId, setCompanyId } =
        useAuth();
    const [, setLocation] = useLocation();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const [superAdminData, setSuperAdminData] = useState({
        email: "",
        password: "",
    });

    useEffect(() => {
        if (user && userRole) {
            const isAdmin =
                userRole === "super_admin" || userRole === "company_admin";
            const isUser = userRole === "company_member";
            if (isAdmin) {
                setLocation("/admin");
            } else if (isUser) {
                setLocation("/user");
            }
        }
    }, [user, userRole, setLocation]);

    const handleSuperAdminLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/super-admin-login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(superAdminData),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || "Login failed");
            }

            const userData = await response.json();
            setUser(userData);
            setUserRole(userData.role);
            setDbUserId(userData.id);
            setCompanyId(userData.companyId || null);
            localStorage.setItem("user", JSON.stringify(userData));
        } catch (error: any) {
            setError(error.message || "Login failed");
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 md:p-8 bg-gradient-to-br from-background via-background to-primary/5">
            <div className="w-full max-w-md space-y-6 sm:space-y-8">
                <div className="text-center">
                    <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
                        WorkLogix
                    </h1>
                    <p className="text-sm sm:text-base text-muted-foreground">
                        Super Admin Access
                    </p>
                </div>

                <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle>Super Admin Login</CardTitle>
                        <CardDescription>
                            Access server-level controls
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form
                            onSubmit={handleSuperAdminLogin}
                            className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="super-email">Email</Label>
                                <Input
                                    id="super-email"
                                    type="email"
                                    placeholder="Enter your super admin email"
                                    value={superAdminData.email}
                                    onChange={(e) =>
                                        setSuperAdminData({
                                            ...superAdminData,
                                            email: e.target.value,
                                        })
                                    }
                                    required
                                    data-testid="input-super-admin-email"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="super-password">Password</Label>
                                <Input
                                    id="super-password"
                                    type="password"
                                    value={superAdminData.password}
                                    onChange={(e) =>
                                        setSuperAdminData({
                                            ...superAdminData,
                                            password: e.target.value,
                                        })
                                    }
                                    required
                                    data-testid="input-super-admin-password"
                                />
                            </div>
                            {error && (
                                <p
                                    className="text-sm text-red-500"
                                    data-testid="error-message">
                                    {error}
                                </p>
                            )}
                            <Button
                                type="submit"
                                className="w-full"
                                disabled={isLoading}
                                data-testid="button-super-admin-login">
                                {isLoading ? "Signing in..." : "Sign In"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <div className="text-center">
                    <Link href="/">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-foreground"
                            data-testid="link-back-to-login">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Main Login
                        </Button>
                    </Link>
                </div>

                <p className="text-xs text-center text-muted-foreground">
                    By continuing, you agree to our Terms of Service and Privacy
                    Policy
                </p>
            </div>
        </div>
    );
}
