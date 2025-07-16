import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ChefHat, Mail, Lock, User } from "lucide-react";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      console.log("Attempting login with credentials:", credentials);
      try {
        // Use XMLHttpRequest to bypass potential fetch interception
        const response = await new Promise<Response>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", "/api/auth/login", true);
          xhr.setRequestHeader("Content-Type", "application/json");
          xhr.withCredentials = true;
          
          xhr.onload = () => {
            const response = new Response(xhr.responseText, {
              status: xhr.status,
              statusText: xhr.statusText,
            });
            resolve(response);
          };
          
          xhr.onerror = () => {
            reject(new Error("Network error"));
          };
          
          xhr.send(JSON.stringify(credentials));
        });
        
        console.log("Login response:", response);
        
        if (!response.ok) {
          const text = await response.text();
          throw new Error(`${response.status}: ${text}`);
        }
        
        return response;
      } catch (error) {
        console.error("Login error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Welcome back!",
        description: "You've successfully logged in.",
      });
      navigate("/");
    },
    onError: (error: any) => {
      toast({
        title: "Login failed",
        description: error.message || "Please check your credentials and try again.",
        variant: "destructive",
      });
    },
  });

  const signupMutation = useMutation({
    mutationFn: async (userData: { email: string; password: string; firstName?: string; lastName?: string }) => {
      console.log("Attempting signup with data:", userData);
      try {
        // Use XMLHttpRequest to bypass potential fetch interception
        const response = await new Promise<Response>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", "/api/auth/signup", true);
          xhr.setRequestHeader("Content-Type", "application/json");
          xhr.withCredentials = true;
          
          xhr.onload = () => {
            const response = new Response(xhr.responseText, {
              status: xhr.status,
              statusText: xhr.statusText,
            });
            resolve(response);
          };
          
          xhr.onerror = () => {
            reject(new Error("Network error"));
          };
          
          xhr.send(JSON.stringify(userData));
        });
        
        console.log("Signup response:", response);
        
        if (!response.ok) {
          const text = await response.text();
          throw new Error(`${response.status}: ${text}`);
        }
        
        return response;
      } catch (error) {
        console.error("Signup error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      console.log("Signup successful");
      toast({
        title: "Account created!",
        description: "Welcome to Plan My Plates! You have 10 free trial meals to get started.",
      });
      navigate("/");
    },
    onError: (error: any) => {
      console.error("Signup mutation error:", error);
      toast({
        title: "Signup failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted", { isLogin, email, firstName, lastName });
    
    if (!email || !password) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    // Try direct form submission to bypass all JS interception
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = isLogin ? '/api/auth/login' : '/api/auth/signup';
    form.style.display = 'none';

    const emailInput = document.createElement('input');
    emailInput.type = 'hidden';
    emailInput.name = 'email';
    emailInput.value = email;
    form.appendChild(emailInput);

    const passwordInput = document.createElement('input');
    passwordInput.type = 'hidden';
    passwordInput.name = 'password';
    passwordInput.value = password;
    form.appendChild(passwordInput);

    if (!isLogin) {
      const firstNameInput = document.createElement('input');
      firstNameInput.type = 'hidden';
      firstNameInput.name = 'firstName';
      firstNameInput.value = firstName;
      form.appendChild(firstNameInput);

      const lastNameInput = document.createElement('input');
      lastNameInput.type = 'hidden';
      lastNameInput.name = 'lastName';
      lastNameInput.value = lastName;
      form.appendChild(lastNameInput);
    }

    document.body.appendChild(form);
    form.submit();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <ChefHat className="h-8 w-8 text-orange-600 mr-2" />
            <span className="text-2xl font-bold text-orange-600">Plan My Plates</span>
          </div>
          <CardTitle className="text-2xl text-center">
            {isLogin ? "Welcome back" : "Create your account"}
          </CardTitle>
          <CardDescription className="text-center">
            {isLogin 
              ? "Sign in to your account to access your meal plans" 
              : "Get started with 10 free trial meals"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="firstName"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="pl-10"
                      placeholder="John"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="lastName"
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="pl-10"
                      placeholder="Doe"
                    />
                  </div>
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  placeholder="Enter your password"
                  required
                />
              </div>
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-orange-600 hover:bg-orange-700"
              disabled={loginMutation.isPending || signupMutation.isPending}
            >
              {loginMutation.isPending || signupMutation.isPending 
                ? "Loading..." 
                : isLogin ? "Sign In" : "Create Account"}
            </Button>
          </form>
          
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-orange-600 hover:text-orange-700 text-sm"
            >
              {isLogin 
                ? "Don't have an account? Sign up" 
                : "Already have an account? Sign in"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}