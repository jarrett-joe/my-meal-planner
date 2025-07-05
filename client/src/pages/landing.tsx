import { useState } from "react";
import { Link } from "wouter";
import mediterraneanQuinoaBowlImage from "@assets/mediterranean_quinoa_bowl_1751753480925.png";
import creamyTuscanPastaImage from "@assets/creamy-tuscan-past_1751753523744.png";
import lemonHerbSalmonImage from "@assets/lemon-herb-salmon_1751753628065.png";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Utensils, 
  Brain, 
  Filter, 
  ListChecks, 
  ArrowRight, 
  Play, 
  Check, 
  RefreshCw,
  Download,
  Share,
  X,
  Star
} from "lucide-react";

// Mock meal data for demo
const mockMeals = [
  {
    id: 1,
    title: "Creamy Tuscan Pasta",
    cuisine: "Italian",
    protein: "Chicken",
    cookingTime: 30,
    rating: 4.8,
    imageUrl: creamyTuscanPastaImage, // Creamy Tuscan chicken pasta
    selected: false
  },
  {
    id: 2,
    title: "Mediterranean Quinoa Bowl", 
    cuisine: "Mediterranean",
    protein: "Vegetarian",
    cookingTime: 25,
    rating: 4.6,
    imageUrl: mediterraneanQuinoaBowlImage, // Mediterranean quinoa bowl
    selected: true
  },
  {
    id: 3,
    title: "Herb-Crusted Ribeye",
    cuisine: "American", 
    protein: "Beef",
    cookingTime: 45,
    rating: 4.9,
    imageUrl: "https://images.unsplash.com/photo-1588168333986-5078d3ae3976?w=800&h=600&fit=crop&q=80", // Herb-crusted ribeye steak
    selected: false
  },
  {
    id: 4,
    title: "Lemon Herb Salmon",
    cuisine: "Mediterranean",
    protein: "Fish", 
    cookingTime: 20,
    rating: 4.7,
    imageUrl: lemonHerbSalmonImage, // Lemon herb salmon
    selected: true
  },
  {
    id: 5,
    title: "Teriyaki Chicken Stir-fry",
    cuisine: "Asian",
    protein: "Chicken",
    cookingTime: 15,
    rating: 4.5,
    imageUrl: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800&h=600&fit=crop&q=80", // Teriyaki chicken stir-fry
    selected: false
  }
];

const proteinOptions = ["Chicken", "Beef", "Fish", "Vegetarian", "Pork"];
const cuisineOptions = ["Italian", "Mexican", "Mediterranean", "Asian", "American"];

export default function Landing() {
  const [showSignup, setShowSignup] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showGroceryList, setShowGroceryList] = useState(false);
  const [meals, setMeals] = useState(mockMeals);
  const [selectedProteins, setSelectedProteins] = useState(["Beef", "Vegetarian"]);
  const [selectedCuisines, setSelectedCuisines] = useState(["Italian", "Mediterranean"]);

  const selectedMealCount = meals.filter(meal => meal.selected).length;

  const toggleMealSelection = (mealId: number) => {
    setMeals(prev => prev.map(meal => 
      meal.id === mealId ? { ...meal, selected: !meal.selected } : meal
    ));
  };

  const togglePreference = (type: 'protein' | 'cuisine', value: string) => {
    if (type === 'protein') {
      setSelectedProteins(prev => 
        prev.includes(value) ? prev.filter(p => p !== value) : [...prev, value]
      );
    } else {
      setSelectedCuisines(prev =>
        prev.includes(value) ? prev.filter(c => c !== value) : [...prev, value]
      );
    }
  };

  const handleGenerateGroceryList = () => {
    if (selectedMealCount === 0) {
      alert('Please select at least one meal to generate a grocery list.');
      return;
    }
    setShowGroceryList(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Utensils className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold text-gray-900">Plan My Plates</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-600 hover:text-primary transition-colors">Features</a>
              <a href="#pricing" className="text-gray-600 hover:text-primary transition-colors">Pricing</a>
              <a href="#how-it-works" className="text-gray-600 hover:text-primary transition-colors">How It Works</a>
              <Button variant="ghost" onClick={() => setShowLogin(true)}>Sign In</Button>
              <Button onClick={() => setShowSignup(true)}>Get Started</Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary to-green-600 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            AI-Powered Meal Planning<br />
            <span className="text-green-200">Made Simple</span>
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-green-100 max-w-3xl mx-auto">
            Select your protein and cuisine preferences, let AI find perfect meals for your week, and get a comprehensive grocery list instantly.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button size="lg" variant="secondary" onClick={() => setShowSignup(true)}>
              Start Free Trial
            </Button>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-primary">
              <Play className="w-4 h-4 mr-2" />
              Watch Demo
            </Button>
          </div>
          <p className="text-green-200 mt-4">No credit card required • 7-day free trial</p>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Everything You Need for Perfect Meal Planning</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">Our AI-powered platform takes the guesswork out of meal planning and grocery shopping</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center p-8 hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Brain className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-4">AI-Powered Discovery</h3>
                <p className="text-gray-600">Our AI integration searches the web to find meals that perfectly match your preferences and dietary needs.</p>
              </CardContent>
            </Card>
            
            <Card className="text-center p-8 hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Filter className="h-8 w-8 text-secondary" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Smart Preferences</h3>
                <p className="text-gray-600">Choose your protein preferences and cuisine types from Italian to Mediterranean, and let AI do the matching.</p>
              </CardContent>
            </Card>
            
            <Card className="text-center p-8 hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <ListChecks className="h-8 w-8 text-accent" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Automated Grocery Lists</h3>
                <p className="text-gray-600">Automatically combine ingredients from all selected meals into one comprehensive, organized grocery list.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-xl text-gray-600">Three simple steps to transform your meal planning</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="relative">
              <Card className="p-8 text-center">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center mx-auto mb-6 text-xl font-bold">1</div>
                  <h3 className="text-xl font-semibold mb-4">Set Your Preferences</h3>
                  <p className="text-gray-600">Choose your protein preferences and favorite cuisine types. Select up to 10 different dishes for your week.</p>
                </CardContent>
              </Card>
              <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                <ArrowRight className="w-8 h-8 text-gray-300" />
              </div>
            </div>
            
            <div className="relative">
              <Card className="p-8 text-center">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 bg-secondary text-white rounded-full flex items-center justify-center mx-auto mb-6 text-xl font-bold">2</div>
                  <h3 className="text-xl font-semibold mb-4">AI Finds Perfect Meals</h3>
                  <p className="text-gray-600">Our AI searches the web to find meals that match your exact preferences and dietary requirements.</p>
                </CardContent>
              </Card>
              <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                <ArrowRight className="w-8 h-8 text-gray-300" />
              </div>
            </div>
            
            <Card className="p-8 text-center">
              <CardContent className="pt-6">
                <div className="w-12 h-12 bg-accent text-white rounded-full flex items-center justify-center mx-auto mb-6 text-xl font-bold">3</div>
                <h3 className="text-xl font-semibold mb-4">Get Your Grocery List</h3>
                <p className="text-gray-600">Select your favorite meals and instantly receive a comprehensive grocery list with all ingredients combined and organized.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Demo Dashboard Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">See Plan My Plates In Action</h2>
            <p className="text-xl text-gray-600">Experience the intuitive meal planning interface</p>
          </div>
          
          <Card className="p-8 border border-gray-200">
            <CardContent className="space-y-8">
              {/* Dashboard Header */}
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                <h3 className="text-2xl font-bold text-gray-900 mb-4 lg:mb-0">Weekly Meal Planner</h3>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-600">Meals Selected:</span>
                  <span className="bg-primary text-white px-3 py-1 rounded-full text-sm font-medium">
                    {selectedMealCount}/10
                  </span>
                </div>
              </div>

              {/* Preferences Section */}
              <div>
                <h4 className="text-lg font-semibold mb-4">Your Preferences</h4>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-3 block">Protein Preferences</Label>
                    <div className="flex flex-wrap gap-2">
                      {proteinOptions.map((protein) => (
                        <Button
                          key={protein}
                          variant={selectedProteins.includes(protein) ? "default" : "outline"}
                          size="sm"
                          onClick={() => togglePreference('protein', protein)}
                          className="rounded-full"
                        >
                          {protein}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-3 block">Cuisine Types</Label>
                    <div className="flex flex-wrap gap-2">
                      {cuisineOptions.map((cuisine) => (
                        <Button
                          key={cuisine}
                          variant={selectedCuisines.includes(cuisine) ? "default" : "outline"}
                          size="sm"
                          onClick={() => togglePreference('cuisine', cuisine)}
                          className="rounded-full"
                        >
                          {cuisine}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Generated Meals */}
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-lg font-semibold">AI-Suggested Meals</h4>
                  <Button variant="outline">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh Suggestions
                  </Button>
                </div>
                
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {meals.map((meal) => (
                    <Card 
                      key={meal.id}
                      className={`cursor-pointer transition-all hover:shadow-lg ${
                        meal.selected ? 'border-primary bg-primary/5' : ''
                      }`}
                      onClick={() => toggleMealSelection(meal.id)}
                    >
                      <div className="relative">
                        <img 
                          src={meal.imageUrl} 
                          alt={meal.title}
                          className="w-full h-48 object-cover rounded-t-lg"
                        />
                        {meal.selected && (
                          <div className="absolute top-2 right-2 bg-primary text-white rounded-full p-1">
                            <Check className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                      <CardContent className="p-4">
                        <h5 className="font-semibold text-gray-900 mb-2">{meal.title}</h5>
                        <p className="text-sm text-gray-600 mb-3">
                          {meal.cuisine} • {meal.protein} • {meal.cookingTime} mins
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Star className="w-4 h-4 text-yellow-400 fill-current" />
                            <span className="text-sm text-primary font-medium ml-1">{meal.rating}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Generate Grocery List Button */}
              <div className="text-center">
                <Button size="lg" onClick={handleGenerateGroceryList}>
                  <ListChecks className="w-5 h-5 mr-3" />
                  Generate Grocery List
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Simple, Transparent Pricing</h2>
            <p className="text-xl text-gray-600">Choose the plan that fits your meal planning needs</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card className="p-8 hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <h3 className="text-xl font-semibold mb-4">Basic</h3>
                <div className="mb-6">
                  <span className="text-4xl font-bold">$9</span>
                  <span className="text-gray-600">/month</span>
                </div>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-primary mr-3" />
                    <span>Up to 5 meals per week</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-primary mr-3" />
                    <span>Basic AI meal suggestions</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-primary mr-3" />
                    <span>Automated grocery lists</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-primary mr-3" />
                    <span>Email support</span>
                  </li>
                </ul>
                <Button variant="outline" className="w-full" onClick={() => setShowSignup(true)}>
                  Start Free Trial
                </Button>
              </CardContent>
            </Card>

            <Card className="p-8 border-2 border-primary hover:shadow-lg transition-shadow relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-primary text-white px-4 py-1 rounded-full text-sm font-medium">Most Popular</span>
              </div>
              <CardContent className="pt-6">
                <h3 className="text-xl font-semibold mb-4">Pro</h3>
                <div className="mb-6">
                  <span className="text-4xl font-bold">$19</span>
                  <span className="text-gray-600">/month</span>
                </div>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-primary mr-3" />
                    <span>Up to 10 meals per week</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-primary mr-3" />
                    <span>Advanced AI with GROK integration</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-primary mr-3" />
                    <span>Smart grocery list optimization</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-primary mr-3" />
                    <span>Nutritional information</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-primary mr-3" />
                    <span>Priority support</span>
                  </li>
                </ul>
                <Button className="w-full" onClick={() => setShowSignup(true)}>
                  Start Free Trial
                </Button>
              </CardContent>
            </Card>

            <Card className="p-8 hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <h3 className="text-xl font-semibold mb-4">Premium</h3>
                <div className="mb-6">
                  <span className="text-4xl font-bold">$29</span>
                  <span className="text-gray-600">/month</span>
                </div>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-primary mr-3" />
                    <span>Unlimited meals per week</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-primary mr-3" />
                    <span>Custom dietary restrictions</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-primary mr-3" />
                    <span>Meal planning calendar</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-primary mr-3" />
                    <span>Shopping list sharing</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-primary mr-3" />
                    <span>24/7 priority support</span>
                  </li>
                </ul>
                <Button variant="outline" className="w-full" onClick={() => setShowSignup(true)}>
                  Start Free Trial
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="col-span-1">
              <div className="flex items-center space-x-3 mb-4">
                <Utensils className="h-8 w-8 text-primary" />
                <span className="text-xl font-bold">MealPlan Pro</span>
              </div>
              <p className="text-gray-400 mb-4">AI-powered meal planning that saves you time and helps you eat better.</p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Mobile App</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Status</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; 2024 MealPlan Pro. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Signup Modal */}
      <Dialog open={showSignup} onOpenChange={setShowSignup}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Start Your Free Trial</DialogTitle>
            <p className="text-center text-gray-600">No credit card required</p>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Full Name</Label>
              <Input placeholder="Enter your full name" />
            </div>
            <div>
              <Label>Email Address</Label>
              <Input type="email" placeholder="Enter your email" />
            </div>
            <div>
              <Label>Password</Label>
              <Input type="password" placeholder="Create a password" />
            </div>
          </div>
          
          <Button 
            className="w-full" 
            onClick={() => {
              setShowSignup(false);
              window.location.href = "/api/login";
            }}
          >
            Start Free Trial
          </Button>
          
          <p className="text-center text-sm text-gray-600">
            Already have an account?{" "}
            <button 
              onClick={() => {
                setShowSignup(false);
                setShowLogin(true);
              }}
              className="text-primary hover:underline"
            >
              Sign in
            </button>
          </p>
        </DialogContent>
      </Dialog>

      {/* Login Modal */}
      <Dialog open={showLogin} onOpenChange={setShowLogin}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Welcome Back</DialogTitle>
            <p className="text-center text-gray-600">Sign in to your account</p>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Email Address</Label>
              <Input type="email" placeholder="Enter your email" />
            </div>
            <div>
              <Label>Password</Label>
              <Input type="password" placeholder="Enter your password" />
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox id="remember" />
              <Label htmlFor="remember" className="text-sm">Remember me</Label>
            </div>
            <button className="text-sm text-primary hover:underline">Forgot password?</button>
          </div>
          
          <Button 
            className="w-full"
            onClick={() => {
              setShowLogin(false);
              window.location.href = "/api/login";
            }}
          >
            Sign In
          </Button>
          
          <p className="text-center text-sm text-gray-600">
            Don't have an account?{" "}
            <button 
              onClick={() => {
                setShowLogin(false);
                setShowSignup(true);
              }}
              className="text-primary hover:underline"
            >
              Sign up
            </button>
          </p>
        </DialogContent>
      </Dialog>

      {/* Grocery List Modal */}
      <Dialog open={showGroceryList} onOpenChange={setShowGroceryList}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Your Grocery List</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <div>
              <h4 className="font-semibold text-lg mb-3">Proteins</h4>
              <ul className="space-y-2">
                <li className="flex items-center">
                  <Checkbox className="mr-3" />
                  <span>2 lbs chicken breast</span>
                </li>
                <li className="flex items-center">
                  <Checkbox className="mr-3" />
                  <span>1 lb salmon fillet</span>
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-lg mb-3">Vegetables</h4>
              <ul className="space-y-2">
                <li className="flex items-center">
                  <Checkbox className="mr-3" />
                  <span>2 cups quinoa</span>
                </li>
                <li className="flex items-center">
                  <Checkbox className="mr-3" />
                  <span>1 cucumber, diced</span>
                </li>
                <li className="flex items-center">
                  <Checkbox className="mr-3" />
                  <span>2 tomatoes, chopped</span>
                </li>
                <li className="flex items-center">
                  <Checkbox className="mr-3" />
                  <span>1 red onion</span>
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-lg mb-3">Pantry Items</h4>
              <ul className="space-y-2">
                <li className="flex items-center">
                  <Checkbox className="mr-3" />
                  <span>Olive oil</span>
                </li>
                <li className="flex items-center">
                  <Checkbox className="mr-3" />
                  <span>Fresh basil</span>
                </li>
                <li className="flex items-center">
                  <Checkbox className="mr-3" />
                  <span>Lemon (2 pieces)</span>
                </li>
                <li className="flex items-center">
                  <Checkbox className="mr-3" />
                  <span>Garlic</span>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="flex space-x-4 mt-8">
            <Button className="flex-1">
              <Download className="w-4 h-4 mr-2" />
              Download List
            </Button>
            <Button variant="outline" className="flex-1">
              <Share className="w-4 h-4 mr-2" />
              Share List
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
