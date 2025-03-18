import { createLazyFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useUser } from "@/hooks/use-user";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";
import { CheckCircle, Loader2 } from "lucide-react";

export const Route = createLazyFileRoute("/payment-success")({
  component: PaymentSuccessPage,
});

function PaymentSuccessPage() {
  const navigate = useNavigate();
  const { user } = useUser();
  const [isVerifying, setIsVerifying] = useState(true);
  const [paymentDetails, setPaymentDetails] = useState<{
    success: boolean;
    credits: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // API URL
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        // Get the session_id from the URL
        const urlParams = new URLSearchParams(window.location.search);
        const sessionId = urlParams.get("session_id");

        if (!sessionId) {
          throw new Error("No session ID found in URL");
        }

        // Verify the payment with the server
        const response = await fetch(
          `${API_URL}/api/payment-success?session_id=${sessionId}`
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to verify payment");
        }

        const data = await response.json();
        setPaymentDetails(data);
      } catch (error) {
        console.error("Error verifying payment:", error);
        setError(
          error instanceof Error
            ? error.message
            : "An error occurred while verifying your payment"
        );
      } finally {
        setIsVerifying(false);
      }
    };

    verifyPayment();
  }, [API_URL]);

  return (
    <div className="container mx-auto py-10 px-4 max-w-3xl">
      <Card className="w-full mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Payment Status</CardTitle>
          <CardDescription>
            {isVerifying
              ? "Verifying your payment..."
              : paymentDetails?.success
                ? "Your payment was successful!"
                : "Payment verification failed"}
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col items-center justify-center py-10">
          {isVerifying ? (
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
              <p>Please wait while we verify your payment...</p>
            </div>
          ) : paymentDetails?.success ? (
            <div className="flex flex-col items-center space-y-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
              <p className="text-xl font-medium">
                {paymentDetails.credits} credits have been added to your
                account!
              </p>
              {user && (
                <p className="text-lg">
                  Your new balance: <strong>{user.credits || 0} credits</strong>
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-4 text-center">
              <p className="text-red-500 font-medium">
                {error ||
                  "We couldn't verify your payment. Please try again or contact support."}
              </p>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-center">
          <Button onClick={() => navigate({ to: "/profile" as const })}>
            Return to Profile
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
