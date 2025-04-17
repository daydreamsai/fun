import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { useUser } from "@/hooks/use-user";
import { loadStripe } from "@stripe/stripe-js";
import { Loader2, AlertCircle, KeyRound, RefreshCw } from "lucide-react";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useUserStore } from "@/store/userStore";
import { Alert, AlertDescription } from "./ui/alert";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

// Credit pricing
const CREDIT_PRICE_PER_UNIT = 0.1; // $0.10 per credit

// Initialize Stripe
const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || ""
);

// API URL
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

// Interface for OpenRouter credits response
interface OpenRouterCreditsResponse {
  openRouter: {
    totalDollars: number;
    usedDollars: number;
    remainingDollars: number;
    rawData: any;
  };
  display: {
    totalCredits: number;
    usedCredits: number;
    remainingCredits: number;
    usagePercentage: number;
  };
}

export function BuyCredits() {
  const { user, isLoading: userLoading } = useUser();
  const [creditAmount, setCreditAmount] = useState<number>(100);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isKeyLoading, setIsKeyLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const [remainingCredits, setRemainingCredits] = useState<number>(0);
  const [isLoadingCredits, setIsLoadingCredits] = useState(false);

  // Get API key management functions from user store
  const { apiKeyData, getApiKey, provisionApiKey } = useUserStore();

  const totalPrice = (creditAmount * CREDIT_PRICE_PER_UNIT).toFixed(2);

  // Check if user has an existing API key on component mount
  useEffect(() => {
    if (user) {
      checkExistingApiKey();
    }
  }, [user]);

  // Fetch credit information whenever apiKeyData changes
  useEffect(() => {
    if (apiKeyData && user?.credits) {
      fetchCreditInfo();
    }
  }, [apiKeyData, user?.credits]);

  // Function to fetch credit information from OpenRouter
  const fetchCreditInfo = async () => {
    if (!user || !apiKeyData) return;

    setIsLoadingCredits(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_URL}/api/openrouter/credits/${user.id}`
      );

      if (!response.ok) {
        if (response.status === 404) {
          // Don't set an error message here, just return silently
          // This will allow the UI to show the "Create API Key" button
          setIsLoadingCredits(false);
          return;
        }
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to fetch credit information"
        );
      }

      const data: OpenRouterCreditsResponse = await response.json();

      setRemainingCredits(data.display.remainingCredits);
    } catch (error) {
      console.error("Error fetching credit information:", error);
      setError("Error fetching credit information. Please try again later.");
    } finally {
      setIsLoadingCredits(false);
    }
  };

  // Function to check if user has an existing API key
  const checkExistingApiKey = async () => {
    if (!user) return;

    setIsKeyLoading(true);
    setError(null);

    try {
      // Only check for existing key, don't create one
      const result = await getApiKey();

      // If no key was found, don't show an error
      if (!result) {
        console.log("No API key found for user");
      }

      setIsKeyLoading(false);
    } catch (error) {
      console.error("Error checking API key:", error);
      // Only set an error if it's not a "not found" error
      if (
        error instanceof Error &&
        !error.message.includes("No API key found")
      ) {
        setError("Error checking your account setup. Please try again later.");
      }
      setIsKeyLoading(false);
    }
  };

  // Function to create a new API key
  const handleCreateApiKey = async () => {
    if (!user) {
      setError("You must be logged in to create an API key.");
      return;
    }

    setIsKeyLoading(true);
    setError(null);

    try {
      const result = await provisionApiKey();
      if (!result) {
        setError("Failed to create API key. Please try again.");
        return;
      }
      setError(null);
      // Fetch credit info after creating the key
      await fetchCreditInfo();
    } catch (error) {
      console.error("Error creating API key:", error);
      setError("Error creating API key. Please try again later.");
    } finally {
      setIsKeyLoading(false);
    }
  };

  // Function to refresh credit information
  const handleRefreshCredits = async () => {
    if (!user) {
      setError("You must be logged in to refresh credits.");
      return;
    }

    if (!apiKeyData) {
      // Instead of showing an error, prompt the user to create an API key
      setError(null);
      // Force a re-check of the API key
      await checkExistingApiKey();
      return;
    }

    setIsSyncing(true);
    setError(null);

    try {
      await fetchCreditInfo();
    } catch (error) {
      console.error("Error refreshing credits:", error);
      // Only set an error if it's not a "not found" error
      if (
        error instanceof Error &&
        !error.message.includes("No API key found")
      ) {
        setError("Error refreshing credits. Please try again later.");
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleBuyCredits = async () => {
    if (!user) {
      setError("You must be logged in to purchase credits.");
      return;
    }

    if (creditAmount <= 0) {
      setError("Please enter a valid credit amount.");
      return;
    }

    // Check if API key is ready
    if (!apiKeyData) {
      setError("You need to create an API key before purchasing credits.");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Proceed with Stripe checkout
      const response = await fetch(`${API_URL}/api/create-checkout-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          creditAmount,
          userId: user.id,
          userEmail: user.email || "user@example.com",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create checkout session");
      }

      const { sessionId } = await response.json();

      // Redirect to Stripe Checkout
      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error("Stripe failed to load");
      }

      const { error: stripeError } = await stripe.redirectToCheckout({
        sessionId,
      });

      if (stripeError) {
        throw stripeError;
      }
    } catch (error) {
      console.error("Error starting checkout:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to start checkout process. Please try again."
      );
      setIsProcessing(false);
    }
    // Note: We don't set isProcessing to false in the finally block
    // because the page will redirect if successful
  };

  const handleCreditAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    setCreditAmount(isNaN(value) ? 0 : value);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Buy Credits</h2>
        {user && (
          <div className="bg-primary/10 px-4 py-2 rounded-full">
            <span className="font-medium">Current Balance: </span>

            {remainingCredits > 0 && (
              <span className="ml-2">{remainingCredits} remaining</span>
            )}
            {isLoadingCredits || isSyncing ? (
              <RefreshCw className="ml-2 inline h-3 w-3 animate-spin" />
            ) : (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="ml-1 h-6 w-6 inline-flex"
                      onClick={handleRefreshCredits}
                    >
                      <RefreshCw className="h-3 w-3" />
                      <span className="sr-only">Refresh credits</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Refresh remaining credits</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* API Key Setup Card */}
      {user && (
        <Card className="w-full">
          <CardHeader>
            <CardTitle>API Key Setup</CardTitle>
            <CardDescription>
              You need an API key to purchase and use credits
            </CardDescription>
          </CardHeader>
          <CardContent>
            {apiKeyData ? (
              <div className="space-y-4">
                <div className="flex items-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <KeyRound className="h-5 w-5 text-green-600 dark:text-green-400 mr-2" />
                  <span className="text-green-600 dark:text-green-400 font-medium">
                    API key is set up and ready to use
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col space-y-4">
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <p className="text-amber-600 dark:text-amber-400">
                    You need to create an API key before you can purchase
                    credits
                  </p>
                </div>
                <Button
                  onClick={handleCreateApiKey}
                  disabled={isKeyLoading}
                  variant="outline"
                  className="w-full"
                >
                  {isKeyLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Setting up API key...
                    </>
                  ) : (
                    <>
                      <KeyRound className="mr-2 h-4 w-4" />
                      Create API Key
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="w-full">
        <CardHeader>
          <CardTitle>Purchase Credits</CardTitle>
          <CardDescription>
            Enter the amount of credits you want to buy
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="creditAmount">Number of Credits</Label>
            <Input
              id="creditAmount"
              type="number"
              min="1"
              value={creditAmount}
              onChange={handleCreditAmountChange}
              className="w-full"
            />
          </div>

          <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
            <span className="font-medium">Price per credit:</span>
            <span>${CREDIT_PRICE_PER_UNIT?.toFixed(2)}</span>
          </div>

          <div className="flex justify-between items-center p-4 bg-primary/10 rounded-lg">
            <span className="font-bold">Total price:</span>
            <span className="text-xl font-bold">${totalPrice}</span>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            className="w-full"
            onClick={handleBuyCredits}
            disabled={
              isProcessing ||
              userLoading ||
              !user ||
              creditAmount <= 0 ||
              !apiKeyData
            }
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              `Buy ${creditAmount} Credits for $${totalPrice}`
            )}
          </Button>
        </CardFooter>
      </Card>

      <div className="bg-muted p-4 rounded-lg">
        <p className="text-sm text-muted-foreground">
          Note: After completing your purchase, credits will be automatically
          added to your account. If you encounter any issues, please contact
          support.
        </p>
      </div>
    </div>
  );
}
