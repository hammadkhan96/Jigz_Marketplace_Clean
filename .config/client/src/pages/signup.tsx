import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Eye, EyeOff, Check, X, Mail, CheckCircle } from "lucide-react";

const signupSchema = z.object({
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be less than 20 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  email: z.string().email("Invalid email address"),
  firstName: z.string().min(1, "First name is required"),
  surname: z.string().min(1, "Surname is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SignupFormData = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const form = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      username: "",
      email: "",
      firstName: "",
      surname: "",
      password: "",
      confirmPassword: "",
    },
  });

  const { register: registerUser } = useAuth();

  const signupMutation = useMutation({
    mutationFn: async (data: { username: string; email: string; name: string; password: string }) => {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setUserEmail(data.user.email);
      
      if (data.emailSent) {
        setShowEmailVerification(true);
        toast({
          title: "Registration successful!",
          description: "Please check your email to verify your account.",
        });
      } else {
        toast({
          title: "Welcome to Jigz!",
          description: "Your account has been created successfully.",
        });
        navigate("/");
      }
    },
    onError: (error: any) => {
      toast({
        title: "Registration failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SignupFormData) => {
    const { confirmPassword, firstName, surname, ...restData } = data;
    const submitData = {
      ...restData,
      name: `${firstName} ${surname}`.trim(),
    };
    signupMutation.mutate(submitData);
  };



  const password = form.watch("password");
  const passwordRequirements = [
    { label: "At least 6 characters", met: password.length >= 6 },
    { label: "Contains letters", met: /[a-zA-Z]/.test(password) },
    { label: "Contains numbers", met: /\d/.test(password) },
  ];

  // Show email verification screen after successful registration
  if (showEmailVerification) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <img 
                src="/attached_assets/JIGZ%20LOGO-01_1754969521380.jpg" 
                alt="Jigz Logo" 
                className="h-12 w-auto"
              />
            </div>
            <div className="mx-auto mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Mail className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Check Your Email</CardTitle>
            <CardDescription>
              We've sent a verification link to <strong>{userEmail}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                Click the link in the email to verify your account and start using Jigz.
              </p>
              <p className="text-sm text-gray-500">
                The verification link will expire in 24 hours.
              </p>
            </div>
            
            <div className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full"
                disabled={signupMutation.isPending}
                onClick={async () => {
                  try {
                    const response = await fetch("/api/auth/resend-verification", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ email: userEmail }),
                    });
                    
                    if (response.ok) {
                      toast({
                        title: "Email resent successfully",
                        description: "Check your inbox for the new verification email.",
                      });
                    } else {
                      toast({
                        title: "Failed to resend email",
                        description: "Please try again in a moment.",
                        variant: "destructive",
                      });
                    }
                  } catch (error) {
                    toast({
                      title: "Error",
                      description: "Failed to resend verification email.",
                      variant: "destructive",
                    });
                  }
                }}
              >
                {signupMutation.isPending ? "Sending..." : "Resend Email"}
              </Button>
              
              <Button 
                variant="ghost" 
                className="w-full"
                onClick={() => navigate("/login")}
              >
                Continue to Login
              </Button>
            </div>
            
            <div className="pt-4 border-t">
              <p className="text-xs text-gray-500">
                Didn't receive the email? Check your spam folder or{" "}
                <button 
                  className="text-blue-600 hover:underline"
                  onClick={() => setShowEmailVerification(false)}
                >
                  try a different email
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            <img 
              src="/attached_assets/JIGZ%20LOGO-01_1754969521380.jpg" 
              alt="Jigz Logo" 
              className="h-12 w-auto"
            />
          </div>
          <CardTitle className="text-2xl font-bold text-center">
            Create your account
          </CardTitle>
          <CardDescription className="text-center">
            Join Jigz and start finding work or hiring talent
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">


          {/* Registration Form */}
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Choose a username"
                {...form.register("username")}
                className={form.formState.errors.username ? "border-red-500" : ""}
              />
              {form.formState.errors.username && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.username.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                {...form.register("email")}
                className={form.formState.errors.email ? "border-red-500" : ""}
              />
              {form.formState.errors.email && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="Enter your first name"
                  {...form.register("firstName")}
                  className={form.formState.errors.firstName ? "border-red-500" : ""}
                />
                {form.formState.errors.firstName && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.firstName.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="surname">Surname</Label>
                <Input
                  id="surname"
                  type="text"
                  placeholder="Enter your surname"
                  {...form.register("surname")}
                  className={form.formState.errors.surname ? "border-red-500" : ""}
                />
                {form.formState.errors.surname && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.surname.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a password"
                  {...form.register("password")}
                  className={form.formState.errors.password ? "border-red-500" : ""}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              
              {/* Password Requirements */}
              {password && (
                <div className="space-y-1 text-xs">
                  {passwordRequirements.map((req, index) => (
                    <div key={index} className="flex items-center gap-2">
                      {req.met ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <X className="h-3 w-3 text-red-500" />
                      )}
                      <span className={req.met ? "text-green-600" : "text-red-600"}>
                        {req.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              
              {form.formState.errors.password && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  {...form.register("confirmPassword")}
                  className={form.formState.errors.confirmPassword ? "border-red-500" : ""}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {form.formState.errors.confirmPassword && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.confirmPassword.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={signupMutation.isPending}
            >
              {signupMutation.isPending ? "Creating account..." : "Create account"}
            </Button>
          </form>

          <div className="text-center text-sm">
            <span className="text-gray-600">Already have an account? </span>
            <Link href="/login" className="text-blue-600 hover:text-blue-800 font-medium">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}