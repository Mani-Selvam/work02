import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PasswordStrengthMeter } from "@/components/ui/password-strength-meter";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { ArrowLeft, ArrowRight, Building2, MapPin, Briefcase, UserCheck } from "lucide-react";
import { API_BASE_URL } from "@/lib/queryClient";

interface FormData {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
  
  name: string;
  companyType: string;
  contactPerson: string;
  designation: string;
  mobile: string;
  website: string;
  
  address: string;
  pincode: string;
  city: string;
  state: string;
  country: string;
  
  employees: string;
  annualTurnover: string;
  yearEstablished: string;
  description: string;
  logo: string;
}

export default function MultiStepRegistrationForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();
  
  const [formData, setFormData] = useState<FormData>({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false,
    
    name: "",
    companyType: "",
    contactPerson: "",
    designation: "",
    mobile: "",
    website: "",
    
    address: "",
    pincode: "",
    city: "",
    state: "",
    country: "",
    
    employees: "",
    annualTurnover: "",
    yearEstablished: "",
    description: "",
    logo: "",
  });

  const updateFormData = (field: keyof FormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateStep1 = () => {
    if (!formData.fullName || formData.fullName.length < 2) {
      setError("Full name must be at least 2 characters");
      return false;
    }
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError("Please enter a valid email address");
      return false;
    }
    if (!formData.password || formData.password.length < 8) {
      setError("Password must be at least 8 characters");
      return false;
    }
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(formData.password)) {
      setError("Password must contain uppercase, lowercase, number, and special character");
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    if (!formData.acceptTerms) {
      setError("You must accept the terms and conditions");
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.name || formData.name.length < 2) {
      setError("Company name must be at least 2 characters");
      return false;
    }
    if (!formData.companyType) {
      setError("Please select a company type");
      return false;
    }
    if (!formData.contactPerson || formData.contactPerson.length < 2) {
      setError("Contact person name is required");
      return false;
    }
    if (!formData.designation) {
      setError("Please select a designation");
      return false;
    }
    if (!formData.mobile || !/^\d{10}$/.test(formData.mobile)) {
      setError("Please enter a valid 10-digit mobile number");
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (!formData.address || formData.address.length < 5) {
      setError("Please enter a complete address");
      return false;
    }
    if (!formData.pincode || !/^\d{6}$/.test(formData.pincode)) {
      setError("Please enter a valid 6-digit pincode");
      return false;
    }
    if (!formData.city || formData.city.length < 2) {
      setError("City is required");
      return false;
    }
    if (!formData.state || formData.state.length < 2) {
      setError("State is required");
      return false;
    }
    if (!formData.country || formData.country.length < 2) {
      setError("Country is required");
      return false;
    }
    return true;
  };

  const validateStep4 = () => {
    if (!formData.employees || parseInt(formData.employees) < 1) {
      setError("Number of employees must be at least 1");
      return false;
    }
    if (!formData.annualTurnover) {
      setError("Please select annual turnover range");
      return false;
    }
    const year = parseInt(formData.yearEstablished);
    if (!formData.yearEstablished || year < 1800 || year > new Date().getFullYear()) {
      setError("Please enter a valid year established");
      return false;
    }
    return true;
  };

  const handleNext = () => {
    setError("");
    let isValid = false;
    
    if (currentStep === 1) isValid = validateStep1();
    else if (currentStep === 2) isValid = validateStep2();
    else if (currentStep === 3) isValid = validateStep3();
    else if (currentStep === 4) isValid = validateStep4();
    
    if (isValid && currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    setError("");
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateStep4()) {
      return;
    }
    
    setIsLoading(true);
    setError("");
    
    try {
      const submitData = {
        ...formData,
        employees: parseInt(formData.employees),
        yearEstablished: parseInt(formData.yearEstablished),
      };
      
      const response = await fetch(`${API_BASE_URL}/api/auth/register-company`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
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
      
      setCurrentStep(1);
      setFormData({
        fullName: "",
        email: "",
        password: "",
        confirmPassword: "",
        acceptTerms: false,
        name: "",
        companyType: "",
        contactPerson: "",
        designation: "",
        mobile: "",
        website: "",
        address: "",
        pincode: "",
        city: "",
        state: "",
        country: "",
        employees: "",
        annualTurnover: "",
        yearEstablished: "",
        description: "",
        logo: "",
      });
    } catch (error: any) {
      setError(error.message || "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  const steps = [
    { number: 1, title: "Login Credentials", icon: UserCheck },
    { number: 2, title: "Company Details", icon: Building2 },
    { number: 3, title: "Location", icon: MapPin },
    { number: 4, title: "Business Info", icon: Briefcase },
  ];

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-6 w-6 text-primary" />
          Register Your Company
        </CardTitle>
        <CardDescription>
          Get your unique Company Server ID and Admin Access
        </CardDescription>
        
        <div className="flex justify-between items-center mt-6">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === step.number;
            const isCompleted = currentStep > step.number;
            
            return (
              <div key={step.number} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
                      isCompleted
                        ? "bg-primary border-primary text-primary-foreground"
                        : isActive
                        ? "border-primary text-primary bg-primary/10"
                        : "border-gray-300 dark:border-gray-600 text-gray-400"
                    }`}
                    data-testid={`step-indicator-${step.number}`}
                  >
                    {isCompleted ? "✓" : <Icon className="h-5 w-5" />}
                  </div>
                  <span className={`text-xs mt-1 hidden sm:block ${isActive ? "text-primary font-medium" : "text-muted-foreground"}`}>
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 ${
                      isCompleted ? "bg-primary" : "bg-gray-300 dark:bg-gray-600"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={formData.fullName}
                  onChange={(e) => updateFormData("fullName", e.target.value)}
                  data-testid="input-fullname"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@company.com"
                  value={formData.email}
                  onChange={(e) => updateFormData("email", e.target.value)}
                  data-testid="input-email"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a strong password"
                  value={formData.password}
                  onChange={(e) => updateFormData("password", e.target.value)}
                  data-testid="input-password"
                />
                <PasswordStrengthMeter password={formData.password} />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Re-enter your password"
                  value={formData.confirmPassword}
                  onChange={(e) => updateFormData("confirmPassword", e.target.value)}
                  data-testid="input-confirm-password"
                />
              </div>
              
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="acceptTerms"
                  checked={formData.acceptTerms}
                  onCheckedChange={(checked) => updateFormData("acceptTerms", checked as boolean)}
                  data-testid="checkbox-accept-terms"
                />
                <Label htmlFor="acceptTerms" className="text-sm leading-none">
                  I accept the{" "}
                  <a href="#" className="text-primary hover:underline">
                    Terms & Conditions
                  </a>
                </Label>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Company Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Acme Tech Pvt Ltd"
                  value={formData.name}
                  onChange={(e) => updateFormData("name", e.target.value)}
                  data-testid="input-company-name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="companyType">Company Type</Label>
                <Select value={formData.companyType} onValueChange={(value) => updateFormData("companyType", value)}>
                  <SelectTrigger data-testid="select-company-type">
                    <SelectValue placeholder="Select company type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contractor">Contractor</SelectItem>
                    <SelectItem value="builder">Builder</SelectItem>
                    <SelectItem value="developer">Developer</SelectItem>
                    <SelectItem value="supplier">Supplier</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="contactPerson">Contact Person</Label>
                <Input
                  id="contactPerson"
                  type="text"
                  placeholder="John Doe"
                  value={formData.contactPerson}
                  onChange={(e) => updateFormData("contactPerson", e.target.value)}
                  data-testid="input-contact-person"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="designation">Designation</Label>
                <Select value={formData.designation} onValueChange={(value) => updateFormData("designation", value)}>
                  <SelectTrigger data-testid="select-designation">
                    <SelectValue placeholder="Select designation" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner">Owner</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="engineer">Engineer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="mobile">Mobile Number</Label>
                <Input
                  id="mobile"
                  type="tel"
                  placeholder="9876543210"
                  value={formData.mobile}
                  onChange={(e) => updateFormData("mobile", e.target.value.replace(/\D/g, ''))}
                  maxLength={10}
                  data-testid="input-mobile"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="website">Company Website <span className="text-muted-foreground text-xs">(Optional)</span></Label>
                <Input
                  id="website"
                  type="url"
                  placeholder="https://yourcompany.com"
                  value={formData.website}
                  onChange={(e) => updateFormData("website", e.target.value)}
                  data-testid="input-website"
                />
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  placeholder="Full address"
                  value={formData.address}
                  onChange={(e) => updateFormData("address", e.target.value)}
                  rows={3}
                  data-testid="input-address"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pincode">Pincode</Label>
                  <Input
                    id="pincode"
                    type="text"
                    placeholder="638001"
                    value={formData.pincode}
                    onChange={(e) => updateFormData("pincode", e.target.value.replace(/\D/g, ''))}
                    maxLength={6}
                    data-testid="input-pincode"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    type="text"
                    placeholder="Mumbai"
                    value={formData.city}
                    onChange={(e) => updateFormData("city", e.target.value)}
                    data-testid="input-city"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    type="text"
                    placeholder="Maharashtra"
                    value={formData.state}
                    onChange={(e) => updateFormData("state", e.target.value)}
                    data-testid="input-state"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    type="text"
                    placeholder="India"
                    value={formData.country}
                    onChange={(e) => updateFormData("country", e.target.value)}
                    data-testid="input-country"
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="employees">Number of Employees</Label>
                <Input
                  id="employees"
                  type="number"
                  placeholder="25"
                  value={formData.employees}
                  onChange={(e) => updateFormData("employees", e.target.value)}
                  min="1"
                  data-testid="input-employees"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="annualTurnover">Average Annual Turnover</Label>
                <Select value={formData.annualTurnover} onValueChange={(value) => updateFormData("annualTurnover", value)}>
                  <SelectTrigger data-testid="select-turnover">
                    <SelectValue placeholder="Select turnover range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="< ₹1 Cr">{'< ₹1 Cr'}</SelectItem>
                    <SelectItem value="₹1-10 Cr">₹1-10 Cr</SelectItem>
                    <SelectItem value="₹10-50 Cr">₹10-50 Cr</SelectItem>
                    <SelectItem value="> ₹50 Cr">{'>  ₹50 Cr'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="yearEstablished">Year Established</Label>
                <Input
                  id="yearEstablished"
                  type="number"
                  placeholder="2005"
                  value={formData.yearEstablished}
                  onChange={(e) => updateFormData("yearEstablished", e.target.value)}
                  min="1800"
                  max={new Date().getFullYear()}
                  data-testid="input-year-established"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Company Description <span className="text-muted-foreground text-xs">(Optional)</span></Label>
                <Textarea
                  id="description"
                  placeholder="Short company intro"
                  value={formData.description}
                  onChange={(e) => updateFormData("description", e.target.value)}
                  rows={3}
                  data-testid="input-description"
                />
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-500" data-testid="error-message">
              {error}
            </p>
          )}

          <div className="flex gap-3">
            {currentStep > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                className="flex-1"
                data-testid="button-back"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            )}
            
            {currentStep < 4 ? (
              <Button
                type="button"
                onClick={handleNext}
                className="flex-1"
                data-testid="button-next"
              >
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                className="flex-1"
                disabled={isLoading}
                data-testid="button-register-company"
              >
                {isLoading ? "Registering..." : "🚀 Register Company"}
              </Button>
            )}
          </div>

          <div className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login/admin" className="text-primary hover:underline" data-testid="link-to-admin-login">
              Company Admin Login
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
