import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Utensils, Mail, Lock, User } from "lucide-react";

export default function DirectAuth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg border-0">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <Utensils className="h-8 w-8 text-primary mr-2" />
            <span className="text-2xl font-bold text-gray-900">My Meal Planner AI</span>
          </div>
          <CardTitle className="text-2xl text-center">
            {isLogin ? "Welcome back" : "Create your account"}
          </CardTitle>
          <CardDescription className="text-center">
            {isLogin 
              ? "Sign in to your account to access your meal plans" 
              : "Get started with 10 free trial meals"}
          </CardDescription>
          {!isLogin && (
            <p className="text-sm text-center text-gray-500 mt-2">
              No credit card required • Start cooking today
            </p>
          )}
        </CardHeader>
        <CardContent>
          <form 
            method="POST" 
            action={isLogin ? "/api/auth/login" : "/api/auth/signup"}
            className="space-y-4"
          >
            {!isLogin && (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="firstName"
                      name="firstName"
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
                      name="lastName"
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
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  placeholder="john@example.com"
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
                  name="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-primary hover:bg-primary/90"
              disabled={!email || !password}
            >
              {isLogin ? "Sign In" : "Start Free Trial"}
            </Button>
            
            <div className="text-center text-sm text-gray-600">
              {isLogin ? "Don't have an account?" : "Already have an account?"}
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="ml-1 text-primary hover:text-primary/80 font-medium"
              >
                {isLogin ? "Sign up" : "Sign in"}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}