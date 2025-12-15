import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Building2, 
  Users, 
  Shield, 
  TrendingUp, 
  CreditCard, 
  Bell,
  ChevronDown,
  Menu,
  X,
  Mail,
  Phone,
  ArrowRight,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{ serverId: string; email: string } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get('success');
    const error = params.get('error');
    const serverId = params.get('serverId');
    const email = params.get('email');

    if (success === 'true' && serverId && email) {
      setSuccessInfo({ serverId, email });
      setShowSuccessDialog(true);
      window.history.replaceState({}, '', '/');
    } else if (error) {
      let errorMessage = 'An error occurred during registration';
      
      if (error === 'google_oauth_not_configured') {
        errorMessage = 'Google Sign-In is not available at the moment. Please use the registration form instead.';
      } else if (error === 'google_auth_failed') {
        errorMessage = 'Google authentication failed. Please try again.';
      } else if (error === 'no_email') {
        errorMessage = 'No email found in Google account. Please use an account with an email.';
      } else if (error === 'company_exists') {
        errorMessage = 'A company with this email already exists. Please login instead.';
      } else if (error === 'registration_failed') {
        errorMessage = 'Company registration failed. Please try again.';
      }

      toast({
        title: "Registration Error",
        description: errorMessage,
        variant: "destructive",
      });
      window.history.replaceState({}, '', '/');
    }
  }, [toast]);

  const features = [
    {
      icon: Shield,
      title: "Super Admin Control",
      description: "Monitor all companies, users, and slot usage in real-time."
    },
    {
      icon: Building2,
      title: "Company Registration",
      description: "Auto-generates unique company IDs with email verification."
    },
    {
      icon: TrendingUp,
      title: "Admin Dashboard",
      description: "Manage users, slots, and internal reports."
    },
    {
      icon: Users,
      title: "User Portal",
      description: "Simple, secure login for company employees."
    },
    {
      icon: CreditCard,
      title: "Slot-Based System",
      description: "Buy and manage additional user slots easily."
    },
    {
      icon: Bell,
      title: "Real-Time Notifications",
      description: "Get instant alerts for updates and activities."
    }
  ];

  const stats = [
    { number: "100+", label: "Companies Registered" },
    { number: "500+", label: "Active Users" },
    { number: "99.9%", label: "System Uptime" }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white dark:bg-gray-900 border-b shadow-sm" data-testid="navbar">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link href="/">
              <div className="flex items-center space-x-2 cursor-pointer" data-testid="link-home">
                <Building2 className="h-8 w-8 text-indigo-600" />
                <span className="text-2xl font-bold text-gray-900 dark:text-white">WorkLogix</span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#home" className="text-gray-700 dark:text-gray-300 hover:text-indigo-600 transition" data-testid="link-home-nav">Home</a>
              <a href="#features" className="text-gray-700 dark:text-gray-300 hover:text-indigo-600 transition" data-testid="link-features">Features</a>
              <a href="#access" className="text-gray-700 dark:text-gray-300 hover:text-indigo-600 transition" data-testid="link-access">Access</a>
              <a href="#about" className="text-gray-700 dark:text-gray-300 hover:text-indigo-600 transition" data-testid="link-about">About</a>
              <a href="#contact" className="text-gray-700 dark:text-gray-300 hover:text-indigo-600 transition" data-testid="link-contact">Contact</a>
            </div>

            {/* Desktop Auth Buttons */}
            <div className="hidden md:flex items-center space-x-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2" data-testid="button-login-dropdown">
                    Login <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <Link href="/login/admin">
                    <DropdownMenuItem className="cursor-pointer" data-testid="link-company-login">
                      Company Admin
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/login/user">
                    <DropdownMenuItem className="cursor-pointer" data-testid="link-user-login">
                      Company User
                    </DropdownMenuItem>
                  </Link>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button asChild className="bg-indigo-600 hover:bg-indigo-700" data-testid="button-register">
                <Link href="/register">
                  Register Company
                </Link>
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="button-mobile-menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 space-y-4" data-testid="mobile-menu">
              <a href="#home" onClick={() => setMobileMenuOpen(false)} className="block text-gray-700 dark:text-gray-300 hover:text-indigo-600" data-testid="link-mobile-home">Home</a>
              <a href="#features" onClick={() => setMobileMenuOpen(false)} className="block text-gray-700 dark:text-gray-300 hover:text-indigo-600" data-testid="link-mobile-features">Features</a>
              <a href="#access" onClick={() => setMobileMenuOpen(false)} className="block text-gray-700 dark:text-gray-300 hover:text-indigo-600" data-testid="link-mobile-access">Access</a>
              <a href="#about" onClick={() => setMobileMenuOpen(false)} className="block text-gray-700 dark:text-gray-300 hover:text-indigo-600" data-testid="link-mobile-about">About</a>
              <a href="#contact" onClick={() => setMobileMenuOpen(false)} className="block text-gray-700 dark:text-gray-300 hover:text-indigo-600" data-testid="link-mobile-contact">Contact</a>
              <div className="flex flex-col space-y-2 pt-4 border-t">
                <Button asChild variant="outline" className="w-full" data-testid="button-mobile-company-login">
                  <Link href="/login/admin">Company Admin Login</Link>
                </Button>
                <Button asChild variant="outline" className="w-full" data-testid="button-mobile-user-login">
                  <Link href="/login/user">Company User Login</Link>
                </Button>
                <Button asChild className="w-full bg-indigo-600 hover:bg-indigo-700" data-testid="button-mobile-register">
                  <Link href="/register">Register Company</Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section id="home" className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-cyan-500 text-white" data-testid="section-hero">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left Side */}
            <div className="space-y-8" data-testid="hero-content">
              <h1 className="text-4xl md:text-6xl font-bold leading-tight" data-testid="text-hero-title">
                Manage Multiple Companies with One Central System
              </h1>
              <p className="text-xl md:text-2xl text-indigo-100" data-testid="text-hero-subtitle">
                WorkLogix helps businesses manage teams, slots, and activities in a secure, unified dashboard.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button asChild size="lg" className="bg-white text-indigo-600 hover:bg-gray-100 text-lg px-8" data-testid="button-hero-register">
                  <Link href="/register">
                    🚀 Register Your Company
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="border-white text-white hover:bg-white/10 text-lg px-8" data-testid="button-hero-login">
                  <Link href="/login/admin">
                    🔐 Company Login
                  </Link>
                </Button>
              </div>
            </div>

            {/* Right Side - Dashboard Preview */}
            <div className="hidden md:block" data-testid="hero-image">
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
                <div className="space-y-4">
                  <div className="h-8 bg-white/20 rounded w-3/4"></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="h-24 bg-white/20 rounded"></div>
                    <div className="h-24 bg-white/20 rounded"></div>
                  </div>
                  <div className="h-32 bg-white/20 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Wave Divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="currentColor" className="text-background"/>
          </svg>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 bg-background" data-testid="section-about">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white" data-testid="text-about-title">
              What is WorkLogix?
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed" data-testid="text-about-description">
              WorkLogix is a powerful multi-company management platform designed to centralize control for Super Admins, 
              streamline operations for Company Admins, and simplify access for Company Users.
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50 dark:bg-gray-900" data-testid="section-features">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4" data-testid="text-features-title">
              Key Features
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300" data-testid="text-features-subtitle">
              Everything you need to manage your business efficiently
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow" data-testid={`card-feature-${index}`}>
                <CardHeader>
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
                      <feature.icon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <CardTitle className="text-xl" data-testid={`text-feature-title-${index}`}>{feature.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base" data-testid={`text-feature-description-${index}`}>
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Access Hierarchy Section */}
      <section id="access" className="py-20 bg-background" data-testid="section-access-hierarchy">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4" data-testid="text-access-title">
              System Access Structure
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300" data-testid="text-access-subtitle">
              Clear hierarchy for organized management
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center hover:shadow-lg transition-shadow border-2 border-indigo-200 dark:border-indigo-800" data-testid="card-access-super-admin">
              <CardHeader>
                <div className="mx-auto p-4 bg-indigo-100 dark:bg-indigo-900 rounded-full w-20 h-20 flex items-center justify-center mb-4">
                  <Shield className="h-10 w-10 text-indigo-600 dark:text-indigo-400" />
                </div>
                <CardTitle className="text-2xl" data-testid="text-access-super-admin-title">Super Admin</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-300" data-testid="text-access-super-admin-description">
                  Full platform control and oversight of all companies
                </p>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow border-2 border-cyan-200 dark:border-cyan-800" data-testid="card-access-company-admin">
              <CardHeader>
                <div className="mx-auto p-4 bg-cyan-100 dark:bg-cyan-900 rounded-full w-20 h-20 flex items-center justify-center mb-4">
                  <Building2 className="h-10 w-10 text-cyan-600 dark:text-cyan-400" />
                </div>
                <CardTitle className="text-2xl" data-testid="text-access-company-admin-title">Company Admin</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-300" data-testid="text-access-company-admin-description">
                  Manages own company and users
                </p>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow border-2 border-emerald-200 dark:border-emerald-800" data-testid="card-access-company-user">
              <CardHeader>
                <div className="mx-auto p-4 bg-emerald-100 dark:bg-emerald-900 rounded-full w-20 h-20 flex items-center justify-center mb-4">
                  <Users className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
                </div>
                <CardTitle className="text-2xl" data-testid="text-access-company-user-title">Company User</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-300" data-testid="text-access-company-user-description">
                  Access own profile and reports
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Quick Access Section */}
      <section className="py-20 bg-gray-50 dark:bg-gray-900" data-testid="section-quick-access">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4" data-testid="text-quick-access-title">
              Quick Access Portals
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300" data-testid="text-quick-access-subtitle">
              Choose your portal to get started
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Link href="/superadmin">
              <Card className="cursor-pointer hover:shadow-xl transition-all hover:-translate-y-1 group" data-testid="card-quick-access-super-admin">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Shield className="h-8 w-8 text-indigo-600" />
                      <CardTitle className="text-xl" data-testid="text-quick-access-super-admin">Super Admin</CardTitle>
                    </div>
                    <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-300" data-testid="text-quick-access-super-admin-desc">
                    Platform-wide management and control
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/login/admin">
              <Card className="cursor-pointer hover:shadow-xl transition-all hover:-translate-y-1 group" data-testid="card-quick-access-company-admin">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Building2 className="h-8 w-8 text-cyan-600" />
                      <CardTitle className="text-xl" data-testid="text-quick-access-company-admin">Company Admin</CardTitle>
                    </div>
                    <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-cyan-600 group-hover:translate-x-1 transition-all" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-300" data-testid="text-quick-access-company-admin-desc">
                    Manage your company and team members
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/login/user">
              <Card className="cursor-pointer hover:shadow-xl transition-all hover:-translate-y-1 group" data-testid="card-quick-access-company-user">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Users className="h-8 w-8 text-emerald-600" />
                      <CardTitle className="text-xl" data-testid="text-quick-access-company-user">Company User</CardTitle>
                    </div>
                    <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-300" data-testid="text-quick-access-company-user-desc">
                    Access your personal dashboard
                  </p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-indigo-600 text-white" data-testid="section-stats">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-12 text-center">
            {stats.map((stat, index) => (
              <div key={index} className="space-y-2" data-testid={`stat-${index}`}>
                <div className="text-5xl md:text-6xl font-bold" data-testid={`stat-number-${index}`}>{stat.number}</div>
                <div className="text-xl text-indigo-100" data-testid={`stat-label-${index}`}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 bg-background" data-testid="section-contact">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4" data-testid="text-contact-title">
              Get in Touch
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300" data-testid="text-contact-subtitle">
              Have questions? We're here to help!
            </p>
          </div>

          <div className="max-w-2xl mx-auto space-y-6">
            <Card data-testid="card-contact-email">
              <CardContent className="flex items-center space-x-4 p-6">
                <div className="p-3 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
                  <Mail className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">Email</p>
                  <a href="mailto:support@worklogix.com" className="text-indigo-600 hover:underline" data-testid="link-email">
                    support@worklogix.com
                  </a>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-contact-phone">
              <CardContent className="flex items-center space-x-4 p-6">
                <div className="p-3 bg-cyan-100 dark:bg-cyan-900 rounded-lg">
                  <Phone className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">Phone</p>
                  <a href="tel:+918825620014" className="text-cyan-600 hover:underline" data-testid="link-phone">
                    +91 88256 20014
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12" data-testid="footer">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Building2 className="h-6 w-6 text-indigo-400" />
                <span className="text-xl font-bold">WorkLogix</span>
              </div>
              <p className="text-gray-400" data-testid="text-footer-tagline">
                Multi-company management made simple
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-4" data-testid="text-footer-quick-links">Quick Links</h3>
              <ul className="space-y-2">
                <li><a href="#home" className="text-gray-400 hover:text-white transition" data-testid="link-footer-home">Home</a></li>
                <li><a href="#about" className="text-gray-400 hover:text-white transition" data-testid="link-footer-about">About</a></li>
                <li><a href="#features" className="text-gray-400 hover:text-white transition" data-testid="link-footer-features">Features</a></li>
                <li><a href="#contact" className="text-gray-400 hover:text-white transition" data-testid="link-footer-contact">Contact</a></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4" data-testid="text-footer-access">Access</h3>
              <ul className="space-y-2">
                <li><Link href="/login/admin" className="text-gray-400 hover:text-white transition" data-testid="link-footer-company-login">Company Login</Link></li>
                <li><Link href="/login/user" className="text-gray-400 hover:text-white transition" data-testid="link-footer-user-login">User Login</Link></li>
                <li><Link href="/register" className="text-gray-400 hover:text-white transition" data-testid="link-footer-register">Register</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4" data-testid="text-footer-contact">Contact</h3>
              <ul className="space-y-2 text-gray-400">
                <li data-testid="text-footer-email">support@worklogix.com</li>
                <li data-testid="text-footer-phone">+91 88256 20014</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 text-center text-gray-400">
            <p data-testid="text-footer-copyright">&copy; 2025 WorkLogix. All rights reserved.</p>
          </div>
        </div>
      </footer>

      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <DialogTitle className="text-center text-2xl">Registration Successful!</DialogTitle>
            <DialogDescription className="text-center">
              Your company has been registered successfully with Google
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg p-6 text-center">
              <p className="text-white text-sm mb-2 opacity-90">Your Company Server ID</p>
              <p className="text-white text-3xl font-bold tracking-wider" data-testid="text-server-id">
                {successInfo?.serverId}
              </p>
            </div>
            
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 p-4 rounded">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-yellow-800 dark:text-yellow-500 mb-1">Important!</p>
                  <p className="text-yellow-700 dark:text-yellow-400">
                    Please save your Company Server ID. You will need it to log in along with your email.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 rounded">
              <div className="flex items-start gap-2">
                <Mail className="h-5 w-5 text-blue-600 dark:text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-blue-800 dark:text-blue-500 mb-1">Check Your Email</p>
                  <p className="text-blue-700 dark:text-blue-400">
                    We've sent your Server ID to <strong>{successInfo?.email}</strong> for your records.
                  </p>
                </div>
              </div>
            </div>

            <Button 
              onClick={() => {
                setShowSuccessDialog(false);
                setLocation("/login/admin");
              }}
              className="w-full bg-indigo-600 hover:bg-indigo-700"
              data-testid="button-go-to-login"
            >
              Go to Login
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
