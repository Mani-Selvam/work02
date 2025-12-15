import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import {
    FileText,
    CheckCircle2,
    ListTodo,
    Star,
    Building2,
} from "lucide-react";
import { useTaskUpdates } from "@/hooks/useTaskUpdates";
import { API_BASE_URL } from "@/lib/queryClient";

interface CompanyData {
    id: number;
    name: string;
    maxAdmins: number;
    maxMembers: number;
    currentAdmins: number;
    currentMembers: number;
    isActive: boolean;
}

export default function Overview() {
    useTaskUpdates();
    const { dbUserId, companyId } = useAuth();

    const { data: stats, isLoading } = useQuery({
        queryKey: ["/api/dashboard/stats"],
        queryFn: async () => {
            const user = localStorage.getItem("user");
            const userId = user ? JSON.parse(user).id : null;
            const headers: Record<string, string> = {};
            if (userId) {
                headers["x-user-id"] = userId.toString();
            }

            const tasks = await fetch(
                `${API_BASE_URL}/api/tasks?userId=${dbUserId}`,
                { headers, credentials: "include" }
            ).then((r) => r.json());
            const reports = await fetch(
                `${API_BASE_URL}/api/reports?userId=${dbUserId}`,
                { headers, credentials: "include" }
            ).then((r) => r.json());
            const ratings = await fetch(
                `${API_BASE_URL}/api/ratings?userId=${dbUserId}`,
                { headers, credentials: "include" }
            ).then((r) => r.json());

            return {
                totalTasks: tasks.length,
                completedTasks: tasks.filter(
                    (t: any) => t.status === "completed"
                ).length,
                totalReports: reports.length,
                averageRating: ratings.length > 0 ? ratings[0].rating : "N/A",
            };
        },
        enabled: !!dbUserId,
    });

    const { data: company } = useQuery<CompanyData>({
        queryKey: ["/api/my-company"],
        enabled: !!companyId && !!dbUserId,
    });

    const statCards = [
        {
            title: "Total Tasks",
            value: stats?.totalTasks || 0,
            icon: ListTodo,
            color: "text-blue-600",
        },
        {
            title: "Completed Tasks",
            value: stats?.completedTasks || 0,
            icon: CheckCircle2,
            color: "text-green-600",
        },
        {
            title: "Reports Submitted",
            value: stats?.totalReports || 0,
            icon: FileText,
            color: "text-purple-600",
        },
        {
            title: "Latest Rating",
            value: stats?.averageRating || "N/A",
            icon: Star,
            color: "text-yellow-600",
        },
    ];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-4 sm:space-y-6">
            <div>
                <h2 className="text-2xl sm:text-3xl font-bold">Overview</h2>
                <p className="text-sm sm:text-base text-muted-foreground mt-1">
                    Your work summary and statistics
                </p>
            </div>

            {/* Company Info */}
            {company && (
                <Card data-testid="card-company-info">
                    <CardContent className="p-4 sm:p-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <Building2 className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">
                                    Company
                                </p>
                                <p
                                    className="font-semibold"
                                    data-testid="text-user-company-name">
                                    {company.name}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                {statCards.map((stat) => (
                    <Card
                        key={stat.title}
                        data-testid={`card-stat-${stat.title
                            .toLowerCase()
                            .replace(" ", "-")}`}>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                {stat.title}
                            </CardTitle>
                            <stat.icon className={`h-5 w-5 ${stat.color}`} />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {stat.value}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
