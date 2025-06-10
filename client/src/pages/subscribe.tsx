import { useEffect, useState } from "react";
import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Check, Crown } from "lucide-react";

// Load Stripe
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

function SubscribeForm() {
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
          description: "You are now subscribed to Plan My Plates!",
        });
      }
    } catch (error) {
      toast({
        title: "Payment Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <Button 
        type="submit" 
        className="w-full" 
        disabled={!stripe || isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Crown className="w-4 h-4 mr-2" />
            Subscribe to Plan My Plates
          </>
        )}
      </Button>
    </form>
  );
}

export default function Subscribe() {
  const { user, isLoading: authLoading } = useAuth();
  const [clientSecret, setClientSecret] = useState("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      window.location.href = "/api/login";
      return;
    }

    // Check if already subscribed
    if (user.subscriptionStatus === 'active') {
      window.location.href = "/dashboard";
      return;
    }

    // Create or get subscription
    apiRequest("POST", "/api/get-or-create-subscription")
      .then((res) => res.json())
      .then((data) => {
        setClientSecret(data.clientSecret);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Subscription error:", error);
        toast({
          title: "Error",
          description: "Failed to initialize subscription. Please try again.",
          variant: "destructive",
        });
        setLoading(false);
      });
  }, [user, authLoading, toast]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Subscription Error</h1>
            <p className="text-gray-600 mb-4">
              Unable to initialize your subscription. Please try again or contact support.
            </p>
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Subscribe to Plan My Plates</h1>
          <p className="text-xl text-gray-600">Get unlimited access to AI-powered meal planning</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Plan Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Crown className="w-6 h-6 text-primary mr-2" />
                Pro Plan - $19/month
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
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
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-primary mr-3" />
                  <span>Cancel anytime</span>
                </li>
              </ul>
              
              <div className="mt-6 p-4 bg-primary/10 rounded-lg">
                <p className="text-sm text-primary font-medium">
                  🎉 7-day free trial included! You won't be charged until your trial ends.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Payment Form */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Details</CardTitle>
            </CardHeader>
            <CardContent>
              <Elements 
                stripe={stripePromise} 
                options={{ 
                  clientSecret,
                  appearance: {
                    theme: 'stripe',
                  }
                }}
              >
                <SubscribeForm />
              </Elements>
              
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  Secure payment powered by{" "}
                  <span className="font-medium">Stripe</span>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Why Choose MealPlan Pro?</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Crown className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">AI-Powered Intelligence</h3>
              <p className="text-gray-600 text-sm">
                Our advanced AI finds meals that perfectly match your preferences and dietary needs.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Time-Saving</h3>
              <p className="text-gray-600 text-sm">
                Spend minutes, not hours, planning your weekly meals and grocery shopping.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Always Improving</h3>
              <p className="text-gray-600 text-sm">
                Our AI learns from your preferences to provide better recommendations over time.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
