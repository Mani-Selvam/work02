import { Switch, Route, Redirect, Router as WouterRouter } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { WebSocketProvider } from "@/contexts/WebSocketContext";
import { NotificationPermissionBanner } from "@/components/NotificationPermissionBanner";
import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/components/LoginPage";
import SuperAdminLogin from "@/pages/SuperAdminLogin";
import ForgotPasswordPage from "@/components/ForgotPasswordPage";
import ForgotCompanyIdPage from "@/components/ForgotCompanyIdPage";
import ResetPasswordPage from "@/components/ResetPasswordPage";
import CompanyRegistration from "@/pages/CompanyRegistration";
import EmailVerification from "@/pages/EmailVerification";
import UserLayout from "@/components/UserLayout";
import AdminLayout from "@/components/AdminLayout";
import TeamLeaderLayout from "@/components/TeamLeaderLayout";
import Overview from "@/pages/user/Overview";
import Reports from "@/pages/user/Reports";
import Messages from "@/pages/user/Messages";
import Feedback from "@/pages/user/Feedback";
import Tasks from "@/pages/user/Tasks";
import ReportView from "@/pages/user/ReportView";
import Ratings from "@/pages/user/Ratings";
import LeaveManagement from "@/pages/user/LeaveManagement";
import Attendance from "@/pages/user/Attendance";
import AttendanceHistory from "@/pages/user/AttendanceHistory";
import CorrectionRequests from "@/pages/user/CorrectionRequests";
import Dashboard from "@/pages/admin/Dashboard";
import LeaveApproval from "@/pages/admin/LeaveApproval";
import CorrectionApproval from "@/pages/admin/CorrectionApproval";
import AttendanceMonitor from "@/pages/admin/AttendanceMonitor";
import AttendanceReports from "@/pages/admin/AttendanceReports";
import AttendancePolicy from "@/pages/admin/AttendancePolicy";
import HolidayManagement from "@/pages/admin/HolidayManagement";
import Users from "@/pages/admin/Users";
import TeamMembersManagement from "@/pages/admin/TeamMembersManagement";
import AdminReports from "@/pages/admin/AdminReports";
import AdminTasks from "@/pages/admin/AdminTasks";
import AdminMessages from "@/pages/admin/AdminMessages";
import AdminRatings from "@/pages/admin/AdminRatings";
import AdminFeedback from "@/pages/admin/AdminFeedback";
import CompanyManagement from "@/pages/admin/CompanyManagement";
import CompanyProfile from "@/pages/admin/CompanyProfile";
import PaymentHistory from "@/pages/admin/PaymentHistory";
import CRM from "@/pages/admin/CRM";
import SuperAdminDashboard from "@/pages/super-admin/SuperAdminDashboard";
import PaymentTracking from "@/pages/super-admin/PaymentTracking";
import ActivityLogs from "@/pages/super-admin/ActivityLogs";
import TeamLeaderDashboard from "@/pages/team-leader/TeamLeaderDashboard";
import TeamMembers from "@/pages/team-leader/TeamMembers";
import TeamTasks from "@/pages/team-leader/TeamTasks";
import TeamLeaveApproval from "@/pages/team-leader/TeamLeaveApproval";
import TeamLeaderLeaveRequests from "@/pages/team-leader/TeamLeaderLeaveRequests";
import TeamCorrectionRequests from "@/pages/team-leader/TeamCorrectionRequests";
import TeamLeaderAttendance from "@/pages/team-leader/TeamLeaderAttendance";
import TeamAttendanceMonitor from "@/pages/team-leader/TeamAttendanceMonitor";
import TeamAttendanceReports from "@/pages/team-leader/TeamAttendanceReports";
import TeamLeaderMessages from "@/pages/team-leader/TeamLeaderMessages";
import TeamRatings from "@/pages/team-leader/TeamRatings";
import TeamFeedback from "@/pages/team-leader/TeamFeedback";
function ProtectedRoute({
    component: Component,
    allowedRole,
}: {
    component: any;
    allowedRole?: "admin" | "user" | "super_admin" | "team_leader";
}) {
    const { user, loading, userRole } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center space-y-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return <Redirect to="/" />;
    }

    const isSuperAdmin = userRole === "super_admin";
    const isCompanyAdmin = userRole === "company_admin";
    const isUser = userRole === "company_member";
    const isTeamLeader = userRole === "team_leader";

    if (allowedRole === "super_admin" && !isSuperAdmin) {
        if (isCompanyAdmin) {
            return <Redirect to="/admin" />;
        }
        if (isTeamLeader) {
            return <Redirect to="/team-leader" />;
        }
        return <Redirect to="/user" />;
    }

    if (allowedRole === "admin" && !isCompanyAdmin && !isSuperAdmin) {
        if (isTeamLeader) {
            return <Redirect to="/team-leader" />;
        }
        return <Redirect to="/user" />;
    }

    if (allowedRole === "team_leader" && !isTeamLeader) {
        if (isSuperAdmin) {
            return <Redirect to="/super-admin" />;
        }
        if (isCompanyAdmin) {
            return <Redirect to="/admin" />;
        }
        return <Redirect to="/user" />;
    }

    if (allowedRole === "user" && !isUser) {
        if (isSuperAdmin) {
            return <Redirect to="/super-admin" />;
        }
        if (isCompanyAdmin) {
            return <Redirect to="/admin" />;
        }
        if (isTeamLeader) {
            return <Redirect to="/team-leader" />;
        }
    }

    return <Component />;
}

function Router() {
    const { user, userRole } = useAuth();

    const getDefaultRoute = () => {
        if (!user) return null;
        if (userRole === "super_admin") return "/super-admin/dashboard";
        if (userRole === "company_admin") return "/admin/dashboard";
        if (userRole === "team_leader") return "/team-leader/dashboard";
        if (userRole === "company_member") return "/user/overview";
        return "/admin/dashboard";
    };

    const defaultRoute = getDefaultRoute();

    return (
        <Switch>
            <Route
                path="/"
                component={
                    user && defaultRoute
                        ? () => <Redirect to={defaultRoute} />
                        : LandingPage
                }
            />
            <Route path="/register" component={CompanyRegistration} />
            <Route path="/verify" component={EmailVerification} />
            <Route path="/login/admin" component={LoginPage} />
            <Route path="/login/user" component={LoginPage} />
            <Route
                path="/login/company"
                component={() => <Redirect to="/login/admin" />}
            />
            <Route path="/forgot-password" component={ForgotPasswordPage} />
            <Route path="/forgot-company-id" component={ForgotCompanyIdPage} />
            <Route path="/reset-password" component={ResetPasswordPage} />
            <Route path="/superadmin" component={SuperAdminLogin} />
            <Route path="/user/overview">
                {() => (
                    <ProtectedRoute
                        component={() => (
                            <UserLayout>
                                <Overview />
                            </UserLayout>
                        )}
                        allowedRole="user"
                    />
                )}
            </Route>
            <Route path="/user/reports">
                {() => (
                    <ProtectedRoute
                        component={() => (
                            <UserLayout>
                                <Reports />
                            </UserLayout>
                        )}
                        allowedRole="user"
                    />
                )}
            </Route>
            <Route path="/user/messages">
                {() => (
                    <ProtectedRoute
                        component={() => (
                            <UserLayout>
                                <Messages />
                            </UserLayout>
                        )}
                        allowedRole="user"
                    />
                )}
            </Route>
            <Route path="/user/feedback">
                {() => (
                    <ProtectedRoute
                        component={() => (
                            <UserLayout>
                                <Feedback />
                            </UserLayout>
                        )}
                        allowedRole="user"
                    />
                )}
            </Route>
            <Route path="/user/tasks">
                {() => (
                    <ProtectedRoute
                        component={() => (
                            <UserLayout>
                                <Tasks />
                            </UserLayout>
                        )}
                        allowedRole="user"
                    />
                )}
            </Route>
            <Route path="/user/report-view">
                {() => (
                    <ProtectedRoute
                        component={() => (
                            <UserLayout>
                                <ReportView />
                            </UserLayout>
                        )}
                        allowedRole="user"
                    />
                )}
            </Route>
            <Route path="/user/ratings">
                {() => (
                    <ProtectedRoute
                        component={() => (
                            <UserLayout>
                                <Ratings />
                            </UserLayout>
                        )}
                        allowedRole="user"
                    />
                )}
            </Route>
            <Route path="/user/leaves">
                {() => (
                    <ProtectedRoute
                        component={() => (
                            <UserLayout>
                                <LeaveManagement />
                            </UserLayout>
                        )}
                        allowedRole="user"
                    />
                )}
            </Route>
            <Route path="/user/attendance">
                {() => (
                    <ProtectedRoute
                        component={() => (
                            <UserLayout>
                                <Attendance />
                            </UserLayout>
                        )}
                        allowedRole="user"
                    />
                )}
            </Route>
            <Route path="/user/attendance-history">
                {() => (
                    <ProtectedRoute
                        component={() => (
                            <UserLayout>
                                <AttendanceHistory />
                            </UserLayout>
                        )}
                        allowedRole="user"
                    />
                )}
            </Route>
            <Route path="/user/correction-requests">
                {() => (
                    <ProtectedRoute
                        component={() => (
                            <UserLayout>
                                <CorrectionRequests />
                            </UserLayout>
                        )}
                        allowedRole="user"
                    />
                )}
            </Route>
            <Route path="/user">
                <Redirect to="/user/overview" />
            </Route>
            <Route path="/admin/dashboard">
                {() => (
                    <ProtectedRoute
                        component={() => (
                            <AdminLayout>
                                <Dashboard />
                            </AdminLayout>
                        )}
                        allowedRole="admin"
                    />
                )}
            </Route>
            <Route path="/admin/leaves">
                {() => (
                    <ProtectedRoute
                        component={() => (
                            <AdminLayout>
                                <LeaveApproval />
                            </AdminLayout>
                        )}
                        allowedRole="admin"
                    />
                )}
            </Route>
            <Route path="/admin/corrections">
                {() => (
                    <ProtectedRoute
                        component={() => (
                            <AdminLayout>
                                <CorrectionApproval />
                            </AdminLayout>
                        )}
                        allowedRole="admin"
                    />
                )}
            </Route>
            <Route path="/admin/attendance">
                {() => (
                    <ProtectedRoute
                        component={() => (
                            <AdminLayout>
                                <AttendanceMonitor />
                            </AdminLayout>
                        )}
                        allowedRole="admin"
                    />
                )}
            </Route>
            <Route path="/admin/attendance-reports">
                {() => (
                    <ProtectedRoute
                        component={() => (
                            <AdminLayout>
                                <AttendanceReports />
                            </AdminLayout>
                        )}
                        allowedRole="admin"
                    />
                )}
            </Route>
            <Route path="/admin/attendance-policy">
                {() => (
                    <ProtectedRoute
                        component={() => (
                            <AdminLayout>
                                <AttendancePolicy />
                            </AdminLayout>
                        )}
                        allowedRole="admin"
                    />
                )}
            </Route>
            <Route path="/admin/holidays">
                {() => (
                    <ProtectedRoute
                        component={() => (
                            <AdminLayout>
                                <HolidayManagement />
                            </AdminLayout>
                        )}
                        allowedRole="admin"
                    />
                )}
            </Route>
            <Route path="/admin/users">
                {() => (
                    <ProtectedRoute
                        component={() => (
                            <AdminLayout>
                                <Users />
                            </AdminLayout>
                        )}
                        allowedRole="admin"
                    />
                )}
            </Route>
            <Route path="/admin/team-members/:teamLeaderId">
                {(params) => (
                    <ProtectedRoute
                        component={() => (
                            <AdminLayout>
                                <TeamMembersManagement params={params} />
                            </AdminLayout>
                        )}
                        allowedRole="admin"
                    />
                )}
            </Route>
            <Route path="/admin/reports">
                {() => (
                    <ProtectedRoute
                        component={() => (
                            <AdminLayout>
                                <AdminReports />
                            </AdminLayout>
                        )}
                        allowedRole="admin"
                    />
                )}
            </Route>
            <Route path="/admin/tasks">
                {() => (
                    <ProtectedRoute
                        component={() => (
                            <AdminLayout>
                                <AdminTasks />
                            </AdminLayout>
                        )}
                        allowedRole="admin"
                    />
                )}
            </Route>
            <Route path="/admin/messages">
                {() => (
                    <ProtectedRoute
                        component={() => (
                            <AdminLayout>
                                <AdminMessages />
                            </AdminLayout>
                        )}
                        allowedRole="admin"
                    />
                )}
            </Route>
            <Route path="/admin/ratings">
                {() => (
                    <ProtectedRoute
                        component={() => (
                            <AdminLayout>
                                <AdminRatings />
                            </AdminLayout>
                        )}
                        allowedRole="admin"
                    />
                )}
            </Route>
            <Route path="/admin/feedback">
                {() => (
                    <ProtectedRoute
                        component={() => (
                            <AdminLayout>
                                <AdminFeedback />
                            </AdminLayout>
                        )}
                        allowedRole="admin"
                    />
                )}
            </Route>
            <Route path="/admin/company-profile">
                {() => (
                    <ProtectedRoute
                        component={() => (
                            <AdminLayout>
                                <CompanyProfile />
                            </AdminLayout>
                        )}
                        allowedRole="admin"
                    />
                )}
            </Route>
            <Route path="/admin/company">
                {() => (
                    <ProtectedRoute
                        component={() => (
                            <AdminLayout>
                                <CompanyManagement />
                            </AdminLayout>
                        )}
                        allowedRole="admin"
                    />
                )}
            </Route>
            <Route path="/admin/payment-history">
                {() => (
                    <ProtectedRoute
                        component={() => (
                            <AdminLayout>
                                <PaymentHistory />
                            </AdminLayout>
                        )}
                        allowedRole="admin"
                    />
                )}
            </Route>
            <Route path="/admin/crm">
                {() => (
                    <ProtectedRoute
                        component={() => (
                            <AdminLayout>
                                <CRM />
                            </AdminLayout>
                        )}
                        allowedRole="admin"
                    />
                )}
            </Route>
            <Route path="/admin">
                <Redirect to="/admin/dashboard" />
            </Route>
            <Route path="/super-admin/dashboard">
                {() => (
                    <ProtectedRoute
                        component={() => (
                            <AdminLayout>
                                <SuperAdminDashboard />
                            </AdminLayout>
                        )}
                        allowedRole="super_admin"
                    />
                )}
            </Route>
            <Route path="/super-admin/payments">
                {() => (
                    <ProtectedRoute
                        component={() => (
                            <AdminLayout>
                                <PaymentTracking />
                            </AdminLayout>
                        )}
                        allowedRole="super_admin"
                    />
                )}
            </Route>
            <Route path="/super-admin/activity">
                {() => (
                    <ProtectedRoute
                        component={() => (
                            <AdminLayout>
                                <ActivityLogs />
                            </AdminLayout>
                        )}
                        allowedRole="super_admin"
                    />
                )}
            </Route>
            <Route path="/super-admin">
                <Redirect to="/super-admin/dashboard" />
            </Route>
            <Route path="/team-leader/dashboard">
                {() => (
                    <ProtectedRoute
                        component={() => (
                            <TeamLeaderLayout>
                                <TeamLeaderDashboard />
                            </TeamLeaderLayout>
                        )}
                        allowedRole="team_leader"
                    />
                )}
            </Route>
            <Route path="/team-leader/team">
                {() => (
                    <ProtectedRoute
                        component={() => (
                            <TeamLeaderLayout>
                                <TeamMembers />
                            </TeamLeaderLayout>
                        )}
                        allowedRole="team_leader"
                    />
                )}
            </Route>
            <Route path="/team-leader/tasks">
                {() => (
                    <ProtectedRoute
                        component={() => (
                            <TeamLeaderLayout>
                                <TeamTasks />
                            </TeamLeaderLayout>
                        )}
                        allowedRole="team_leader"
                    />
                )}
            </Route>
            <Route path="/team-leader/leaves">
                {() => (
                    <ProtectedRoute
                        component={() => (
                            <TeamLeaderLayout>
                                <TeamLeaveApproval />
                            </TeamLeaderLayout>
                        )}
                        allowedRole="team_leader"
                    />
                )}
            </Route>
            <Route path="/team-leader/leave-requests">
                {() => (
                    <ProtectedRoute
                        component={() => (
                            <TeamLeaderLayout>
                                <TeamLeaderLeaveRequests />
                            </TeamLeaderLayout>
                        )}
                        allowedRole="team_leader"
                    />
                )}
            </Route>
            <Route path="/team-leader/corrections">
                {() => (
                    <ProtectedRoute
                        component={() => (
                            <TeamLeaderLayout>
                                <TeamCorrectionRequests />
                            </TeamLeaderLayout>
                        )}
                        allowedRole="team_leader"
                    />
                )}
            </Route>
            <Route path="/team-leader/attendance">
                {() => (
                    <ProtectedRoute
                        component={() => (
                            <TeamLeaderLayout>
                                <TeamLeaderAttendance />
                            </TeamLeaderLayout>
                        )}
                        allowedRole="team_leader"
                    />
                )}
            </Route>
            <Route path="/team-leader/attendance-monitor">
                {() => (
                    <ProtectedRoute
                        component={() => (
                            <TeamLeaderLayout>
                                <TeamAttendanceMonitor />
                            </TeamLeaderLayout>
                        )}
                        allowedRole="team_leader"
                    />
                )}
            </Route>
            <Route path="/team-leader/attendance-reports">
                {() => (
                    <ProtectedRoute
                        component={() => (
                            <TeamLeaderLayout>
                                <TeamAttendanceReports />
                            </TeamLeaderLayout>
                        )}
                        allowedRole="team_leader"
                    />
                )}
            </Route>
            <Route path="/team-leader/messages">
                {() => (
                    <ProtectedRoute
                        component={() => (
                            <TeamLeaderLayout>
                                <TeamLeaderMessages />
                            </TeamLeaderLayout>
                        )}
                        allowedRole="team_leader"
                    />
                )}
            </Route>
            <Route path="/team-leader/ratings">
                {() => (
                    <ProtectedRoute
                        component={() => (
                            <TeamLeaderLayout>
                                <TeamRatings />
                            </TeamLeaderLayout>
                        )}
                        allowedRole="team_leader"
                    />
                )}
            </Route>
            <Route path="/team-leader/feedback">
                {() => (
                    <ProtectedRoute
                        component={() => (
                            <TeamLeaderLayout>
                                <TeamFeedback />
                            </TeamLeaderLayout>
                        )}
                        allowedRole="team_leader"
                    />
                )}
            </Route>
            <Route path="/team-leader">
                <Redirect to="/team-leader/dashboard" />
            </Route>
            <Route>
                <div className="min-h-screen flex items-center justify-center bg-background">
                    <div className="text-center space-y-4">
                        <h1 className="text-4xl font-bold">404</h1>
                        <p className="text-muted-foreground">Page not found</p>
                    </div>
                </div>
            </Route>
        </Switch>
    );
}

function App() {
    return (
        <WouterRouter base="/worklogix">
            <WebSocketProvider>
                <QueryClientProvider client={queryClient}>
                    <TooltipProvider>
                        <AuthProvider>
                            <Toaster />
                            <NotificationPermissionBanner />
                            <Router />
                        </AuthProvider>
                    </TooltipProvider>
                </QueryClientProvider>
            </WebSocketProvider>
        </WouterRouter>
    );
}

export default App;
