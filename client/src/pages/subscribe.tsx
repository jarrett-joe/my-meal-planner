import { useState } from "react";
import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Check, Crown, Utensils } from "lucide-react";

// Load Stripe
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const SUBSCRIPTION_PLANS = [
  {
    id: 'basic',
    name: 'Basic',
    price: 10,
    meals: 20,
    features: [
      '20 AI-generated meals per month',
      'Automated grocery lists',
      'Family-sized recipes (serves 4)',
      'Healthy oil requirements (EVOO & avocado oil)',
      'Email support'
    ],
    popular: false
  },
  {
    id: 'standard',
    name: 'Standard',
    price: 20,
    meals: 40,
    features: [
      '40 AI-generated meals per month',
      'Automated grocery lists',
      'Family-sized recipes (serves 4)',
      'Healthy oil requirements (EVOO & avocado oil)',
      'Priority email support',
      'Recipe customization suggestions'
    ],
    popular: true
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 30,
    meals: 60,
    features: [
      '60 AI-generated meals per month',
      'Automated grocery lists',
      'Family-sized recipes (serves 4)',
      'Healthy oil requirements (EVOO & avocado oil)',
      'Priority email support',
      'Recipe customization suggestions',
      'Advanced dietary preferences',
      'Meal planning analytics'
    ],
    popular: false
  }
];

function SubscribeForm({ selectedPlan }: { selectedPlan: typeof SUBSCRIPTION_PLANS[0] }) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements) {
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/dashboard`,
        },
      });

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Payment Successful",
          description: `You are now subscribed to Plan My Plates ${selectedPlan.name}!`,
        });
      }
    } catch (error) {
      toast({
        title: "Payment Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold">{selectedPlan.name} Plan</h3>
        <p className="text-2xl font-bold">${selectedPlan.price}/month</p>
        <p className="text-muted-foreground">{selectedPlan.meals} meals per month</p>
      </div>
      
      <PaymentElement />
      
      <Button 
        type="submit" 
        className="w-full" 
        disabled={!stripe || !elements || isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          `Subscribe to ${selectedPlan.name} Plan`
        )}
      </Button>
    </form>
  );
}

export default function Subscribe() {
  const { user, isLoading } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState(SUBSCRIPTION_PLANS[1]); // Default to Standard
  const [clientSecret, setClientSecret] = useState("");
  const [isLoadingPayment, setIsLoadingPayment] = useState(false);

  const handleSelectPlan = async (plan: typeof SUBSCRIPTION_PLANS[0]) => {
    setSelectedPlan(plan);
    setIsLoadingPayment(true);
    
    try {
      const response = await apiRequest("POST", "/api/create-subscription", {
        planId: plan.id,
        priceId: `price_${plan.id}`, // This will need to match your Stripe price IDs
      });
      const data = await response.json();
      setClientSecret(data.clientSecret);
    } catch (error) {
      console.error("Error creating subscription:", error);
    } finally {
      setIsLoadingPayment(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Choose Your Meal Plan</h1>
            <p className="text-xl text-muted-foreground mb-2">
              Start with 10 free meals, then select a plan that fits your family's needs
            </p>
            {user && (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full">
                <Utensils className="w-4 h-4" />
                <span className="font-medium">{user.mealCredits || 10} trial meals remaining</span>
              </div>
            )}
          </div>

          {/* Pricing Plans */}
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {SUBSCRIPTION_PLANS.map((plan) => (
              <Card 
                key={plan.id} 
                className={`relative ${plan.popular ? 'border-orange-500 shadow-lg scale-105' : ''} ${
                  selectedPlan.id === plan.id ? 'ring-2 ring-orange-500' : ''
                }`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-orange-500">
                    <Crown className="w-3 h-3 mr-1" />
                    Most Popular
                  </Badge>
                )}
                
                <CardHeader className="text-center">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-3xl font-bold">${plan.price}</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  <p className="text-lg font-semibold text-orange-600 dark:text-orange-400">
                    {plan.meals} meals per month
                  </p>
                  <p className="text-sm text-muted-foreground">
                    ${(plan.price / plan.meals).toFixed(2)} per meal
                  </p>
                </CardHeader>

                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button 
                    onClick={() => handleSelectPlan(plan)}
                    variant={selectedPlan.id === plan.id ? "default" : "outline"}
                    className="w-full"
                    disabled={isLoadingPayment}
                  >
                    {isLoadingPayment && selectedPlan.id === plan.id ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : selectedPlan.id === plan.id ? (
                      "Selected"
                    ) : (
                      "Select Plan"
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Payment Form */}
          {clientSecret && (
            <div className="max-w-md mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle className="text-center">Complete Your Subscription</CardTitle>
                </CardHeader>
                <CardContent>
                  <Elements stripe={stripePromise} options={{ clientSecret }}>
                    <SubscribeForm selectedPlan={selectedPlan} />
                  </Elements>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Trial Info */}
          <div className="text-center mt-12 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Free Trial Included</h3>
            <p className="text-muted-foreground">
              Every new user gets 10 free trial meals to explore Plan My Plates. 
              No credit card required to start your trial!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}