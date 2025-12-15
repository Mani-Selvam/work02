import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
    Building2,
    Eye,
    EyeOff,
    Loader2,
    CheckCircle2,
    AlertCircle,
} from "lucide-react";
import { SiGoogle } from "react-icons/si";
import { apiRequest, API_BASE_URL } from "@/lib/queryClient";

const registrationSchema = z
    .object({
        companyName: z
            .string()
            .min(2, "Company name must be at least 2 characters"),
        email: z.string().email("Invalid email address"),
        password: z
            .string()
            .min(8, "Password must be at least 8 characters")
            .regex(
                /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
                "Password must contain uppercase, lowercase, number, and special character"
            ),
        confirmPassword: z.string(),
        acceptTerms: z.boolean(),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"],
    });

type RegistrationFormData = z.infer<typeof registrationSchema>;

export default function CompanyRegistration() {
    const [, setLocation] = useLocation();
    const { toast } = useToast();
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [registrationSuccess, setRegistrationSuccess] = useState(false);
    const [serverIdInfo, setServerIdInfo] = useState<{
        serverId: string;
        email: string;
    } | null>(null);
    const [googleOAuthEnabled, setGoogleOAuthEnabled] = useState(false);

    const form = useForm<RegistrationFormData>({
        resolver: zodResolver(registrationSchema),
        defaultValues: {
            companyName: "",
            email: "",
            password: "",
            confirmPassword: "",
            acceptTerms: false,
        },
    });

    const password = form.watch("password");

    const getPasswordStrength = (pwd: string) => {
        if (pwd.length === 0) return { strength: "", color: "" };
        if (pwd.length < 6) return { strength: "Weak", color: "text-red-500" };
        if (pwd.length < 8 || !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(pwd))
            return { strength: "Medium", color: "text-yellow-500" };
        if (
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(
                pwd
            )
        )
            return { strength: "Strong", color: "text-green-500" };
        return { strength: "Medium", color: "text-yellow-500" };
    };

    const passwordStrength = getPasswordStrength(password);

    useEffect(() => {
        const checkConfig = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/config`);
                const config = await res.json();
                setGoogleOAuthEnabled(config.googleOAuthEnabled || false);
            } catch (error) {
                console.error("Failed to fetch config:", error);
                setGoogleOAuthEnabled(false);
            }
        };
        checkConfig();
    }, []);

    const onSubmit = async (data: RegistrationFormData) => {
        if (!data.acceptTerms) {
            toast({
                title: "Terms Required",
                description:
                    "You must accept the terms and conditions to register",
                variant: "destructive",
            });
            return;
        }

        try {
            setIsLoading(true);

            const res = await apiRequest(
                "/api/auth/register-company-basic",
                "POST",
                data
            );
            const response = await res.json();

            setServerIdInfo({
                serverId: response.serverId,
                email: response.email,
            });
            setRegistrationSuccess(true);

            toast({
                title: "Registration Successful!",
                description: `Your Company Server ID is ${response.serverId}. Please check your email for verification.`,
            });
        } catch (error: any) {
            toast({
                title: "Registration Failed",
                description:
                    error.message || "An error occurred during registration",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleSignIn = () => {
        window.location.href = `${API_BASE_URL}/api/auth/google`;
    };

    if (registrationSuccess && serverIdInfo) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
                        </div>
                        <CardTitle className="text-2xl">
                            Registration Successful!
                        </CardTitle>
                        <CardDescription>
                            Your company has been registered successfully
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg p-6 text-center">
                            <p className="text-white text-sm mb-2 opacity-90">
                                Your Company Server ID
                            </p>
                            <p className="text-white text-3xl font-bold tracking-wider">
                                {serverIdInfo.serverId}
                            </p>
                        </div>

                        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 p-4 rounded">
                            <div className="flex items-start gap-2">
                                <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
                                <div className="text-sm">
                                    <p className="font-semibold text-yellow-800 dark:text-yellow-500 mb-1">
                                        Important!
                                    </p>
                                    <p className="text-yellow-700 dark:text-yellow-400">
                                        Please save your Company Server ID. You
                                        will need it to log in along with your
                                        email and password.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 rounded">
                            <div className="flex items-start gap-2">
                                <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-500 flex-shrink-0 mt-0.5" />
                                <div className="text-sm">
                                    <p className="font-semibold text-blue-800 dark:text-blue-500 mb-1">
                                        Next Steps
                                    </p>
                                    <p className="text-blue-700 dark:text-blue-400">
                                        A verification email has been sent to{" "}
                                        <strong>{serverIdInfo.email}</strong>.
                                        Please check your inbox and verify your
                                        email to activate your account.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <Button
                            onClick={() => setLocation("login/admin")}
                            className="w-full bg-indigo-600 hover:bg-indigo-700"
                            data-testid="button-go-to-login">
                            Go to Login
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <Building2 className="h-12 w-12 text-indigo-600" />
                    </div>
                    <CardTitle className="text-2xl">
                        Register Your Company
                    </CardTitle>
                    <CardDescription>
                        Get your unique Company Server ID
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {googleOAuthEnabled && (
                        <>
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full gap-2"
                                onClick={handleGoogleSignIn}
                                disabled={isLoading}
                                data-testid="button-google-register">
                                <SiGoogle className="h-5 w-5" />
                                Register with Google
                            </Button>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-background px-2 text-muted-foreground">
                                        Or
                                    </span>
                                </div>
                            </div>
                        </>
                    )}

                    <Form {...form}>
                        <form
                            onSubmit={form.handleSubmit(onSubmit)}
                            className="space-y-4">
                            <FormField
                                control={form.control}
                                name="companyName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Company Name</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="Enter your company name"
                                                {...field}
                                                data-testid="input-company-name"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email Address</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="email"
                                                placeholder="your.email@company.com"
                                                {...field}
                                                data-testid="input-email"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Password</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Input
                                                    type={
                                                        showPassword
                                                            ? "text"
                                                            : "password"
                                                    }
                                                    placeholder="Create a strong password"
                                                    {...field}
                                                    data-testid="input-password"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setShowPassword(
                                                            !showPassword
                                                        )
                                                    }
                                                    className="absolute right-3 top-1/2 -translate-y-1/2"
                                                    data-testid="button-toggle-password">
                                                    {showPassword ? (
                                                        <EyeOff className="h-4 w-4 text-gray-500" />
                                                    ) : (
                                                        <Eye className="h-4 w-4 text-gray-500" />
                                                    )}
                                                </button>
                                            </div>
                                        </FormControl>
                                        {password && (
                                            <p
                                                className={`text-sm ${passwordStrength.color}`}>
                                                Strength:{" "}
                                                {passwordStrength.strength}
                                            </p>
                                        )}
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="confirmPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Confirm Password</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Input
                                                    type={
                                                        showConfirmPassword
                                                            ? "text"
                                                            : "password"
                                                    }
                                                    placeholder="Confirm your password"
                                                    {...field}
                                                    data-testid="input-confirm-password"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setShowConfirmPassword(
                                                            !showConfirmPassword
                                                        )
                                                    }
                                                    className="absolute right-3 top-1/2 -translate-y-1/2"
                                                    data-testid="button-toggle-confirm-password">
                                                    {showConfirmPassword ? (
                                                        <EyeOff className="h-4 w-4 text-gray-500" />
                                                    ) : (
                                                        <Eye className="h-4 w-4 text-gray-500" />
                                                    )}
                                                </button>
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="acceptTerms"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                                data-testid="checkbox-terms"
                                            />
                                        </FormControl>
                                        <div className="space-y-1 leading-none">
                                            <FormLabel className="text-sm font-normal">
                                                I accept the{" "}
                                                <a
                                                    href="#"
                                                    className="text-indigo-600 hover:underline">
                                                    Terms & Conditions
                                                </a>
                                            </FormLabel>
                                            <FormMessage />
                                        </div>
                                    </FormItem>
                                )}
                            />

                            <Button
                                type="submit"
                                className="w-full bg-indigo-600 hover:bg-indigo-700"
                                disabled={isLoading}
                                data-testid="button-submit">
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Registering...
                                    </>
                                ) : (
                                    "Register Company"
                                )}
                            </Button>
                        </form>
                    </Form>

                    <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                        Already have an account?{" "}
                        <a
                            href="login/admin"
                            className="text-indigo-600 hover:underline font-medium"
                            data-testid="link-login">
                            Login here
                        </a>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
