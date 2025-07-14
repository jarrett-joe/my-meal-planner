import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Lock, User, UserPlus } from "lucide-react";

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [userForm, setUserForm] = useState({ userId: "", email: "", firstName: "", lastName: "" });
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const isAdmin = user?.id === 'admin-master';

  const loginMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/auth/admin-login", {
        username,
        password
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Login Successful",
        description: "Welcome back, Master Admin!",
      });
      // Force full page reload to ensure session is recognized
      setTimeout(() => {
        window.location.replace("/");
      }, 1000);
    },
    onError: () => {
      toast({
        title: "Login Failed",
        description: "Invalid admin credentials. Please try again.",
        variant: "destructive",
      });
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/create-unlimited-user", userForm);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "User Created Successfully",
        description: `User ${userForm.userId} now has unlimited meal credits`,
      });
      setUserForm({ userId: "", email: "", firstName: "", lastName: "" });
    },
    onError: () => {
      toast({
        title: "Failed to Create User",
        description: "Please check the details and try again",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast({
        title: "Missing Information",
        description: "Please enter both username and password.",
        variant: "destructive",
      });
      return;
    }
    loginMutation.mutate();
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.userId || !userForm.email) {
      toast({
        title: "Missing Information",
        description: "Please enter both User ID and Email.",
        variant: "destructive",
      });
      return;
    }
    createUserMutation.mutate();
  };

  // If user is already admin, show admin panel
  if (isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-green-50 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                <Lock className="w-6 h-6" />
                Admin Control Panel
              </CardTitle>
              <p className="text-gray-600">Welcome, Master Admin. You have full access to all features.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button onClick={() => window.location.href = "/"} className="w-full">
                  Go to Dashboard
                </Button>
                <Button 
                  variant="outline" 
                  onClick={async () => {
                    await apiRequest("POST", "/api/auth/admin-logout");
                    toast({ title: "Logged out successfully" });
                    queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
                    window.location.reload();
                  }}
                  className="w-full"
                >
                  Logout
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                Create Unlimited User
              </CardTitle>
              <p className="text-gray-600">
                Create a regular user account with unlimited meal credits (999,999 credits)
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="userId">User ID*</Label>
                    <Input
                      id="userId"
                      type="text"
                      placeholder="e.g., user123"
                      value={userForm.userId}
                      onChange={(e) => setUserForm({ ...userForm, userId: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email*</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="user@example.com"
                      value={userForm.email}
                      onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      type="text"
                      placeholder="John"
                      value={userForm.firstName}
                      onChange={(e) => setUserForm({ ...userForm, firstName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      type="text"
                      placeholder="Doe"
                      value={userForm.lastName}
                      onChange={(e) => setUserForm({ ...userForm, lastName: e.target.value })}
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={createUserMutation.isPending}>
                  {createUserMutation.isPending ? "Creating User..." : "Create Unlimited User"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-green-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center">
              <Lock className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Master Admin Login</CardTitle>
          <p className="text-gray-600">Access Plan My Plates admin panel</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter admin username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10"
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
                  placeholder="Enter admin password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? "Signing In..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Regular users can{" "}
              <a href="/api/login" className="text-emerald-600 hover:underline">
                sign in with Replit
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}