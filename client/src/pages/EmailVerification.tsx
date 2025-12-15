import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { apiRequest , queryClient, API_BASE_URL} from "@/lib/queryClient";

export default function EmailVerification() {
    const [, setLocation] = useLocation();
    const [status, setStatus] = useState<"loading" | "success" | "error">(
        "loading"
    );
    const [message, setMessage] = useState("");
    const [companyId, setCompanyId] = useState("");

    useEffect(() => {
        const verifyEmail = async () => {
            const params = new URLSearchParams(window.location.search);
            const token = params.get("token");

            if (!token) {
                setStatus("error");
                setMessage("Verification token is missing");
                return;
            }

            try {
                const res = await apiRequest(
                    `${API_BASE_URL}/api/auth/verify-company?token=${token}`,
                    "GET"
                );
                const response = await res.json();
                setStatus("success");
                setMessage(response.message);
                setCompanyId(response.company.serverId);
            } catch (error: any) {
                setStatus("error");
                setMessage(
                    error.message ||
                        "Verification failed. The token may be invalid or expired."
                );
            }
        };

        verifyEmail();
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4">
                        {status === "loading" && (
                            <div className="bg-blue-100 dark:bg-blue-900 w-full h-full rounded-full flex items-center justify-center">
                                <Loader2 className="h-8 w-8 text-blue-600 dark:text-blue-400 animate-spin" />
                            </div>
                        )}
                        {status === "success" && (
                            <div className="bg-green-100 dark:bg-green-900 w-full h-full rounded-full flex items-center justify-center">
                                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
                            </div>
                        )}
                        {status === "error" && (
                            <div className="bg-red-100 dark:bg-red-900 w-full h-full rounded-full flex items-center justify-center">
                                <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                            </div>
                        )}
                    </div>

                    <CardTitle className="text-2xl">
                        {status === "loading" && "Verifying Your Email..."}
                        {status === "success" && "Email Verified!"}
                        {status === "error" && "Verification Failed"}
                    </CardTitle>

                    <CardDescription>
                        {status === "loading" &&
                            "Please wait while we verify your email address"}
                        {status === "success" &&
                            "Your email has been successfully verified"}
                        {status === "error" &&
                            "We couldn't verify your email address"}
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                    {status === "success" && (
                        <>
                            <div className="bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 p-4 rounded">
                                <p className="text-sm text-green-700 dark:text-green-400">
                                    {message}
                                </p>
                                {companyId && (
                                    <p className="text-sm text-green-700 dark:text-green-400 mt-2">
                                        <strong>Your Company ID:</strong>{" "}
                                        {companyId}
                                    </p>
                                )}
                            </div>

                            <Button
                                onClick={() => setLocation("/login/admin")}
                                className="w-full bg-indigo-600 hover:bg-indigo-700"
                                data-testid="button-go-to-login">
                                Go to Login
                            </Button>
                        </>
                    )}

                    {status === "error" && (
                        <>
                            <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded">
                                <p className="text-sm text-red-700 dark:text-red-400">
                                    {message}
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Button
                                    onClick={() => setLocation("/register")}
                                    className="w-full bg-indigo-600 hover:bg-indigo-700"
                                    data-testid="button-register-again">
                                    Try Registering Again
                                </Button>
                                <Button
                                    onClick={() => setLocation("/")}
                                    variant="outline"
                                    className="w-full"
                                    data-testid="button-go-home">
                                    Go to Home
                                </Button>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
