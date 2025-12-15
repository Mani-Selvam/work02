import { useStripe, useElements, PaymentElement, PaymentRequestButtonElement } from '@stripe/react-stripe-js';
import type { StripePaymentRequestButtonElementOptions } from '@stripe/stripe-js';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, QrCode } from "lucide-react";
import { useState, useEffect } from "react";

interface StripeCheckoutFormProps {
  onSuccess: (paymentIntentId: string) => void;
  onFailure: () => void;
  amount: number;
  clientSecret: string;
}

export default function StripeCheckoutForm({ onSuccess, onFailure, amount, clientSecret }: StripeCheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentRequest, setPaymentRequest] = useState<any>(null);
  const [showQRCode, setShowQRCode] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'pending' | 'checking'>('idle');

  // Initialize PaymentRequest for Google Pay / PhonePe wallet buttons
  useEffect(() => {
    if (!stripe) return;

    const pr = stripe.paymentRequest({
      country: 'IN',
      currency: 'inr',
      total: {
        label: 'WorkLogix Slot Purchase',
        amount: Math.round(amount * 100), // Convert to paise
      },
      requestPayerName: true,
      requestPayerEmail: true,
    });

    // Check if PaymentRequest is available (Google Pay, PhonePe, etc.)
    pr.canMakePayment().then((result) => {
      if (result) {
        setPaymentRequest(pr);
      }
    });

    pr.on('paymentmethod', async (ev) => {
      // Confirm the payment with the payment method from the wallet
      const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        { payment_method: ev.paymentMethod.id },
        { handleActions: false }
      );

      if (confirmError) {
        ev.complete('fail');
        toast({
          title: "Payment Failed",
          description: confirmError.message,
          variant: "destructive",
        });
        onFailure();
      } else if (paymentIntent) {
        // Handle different payment intent statuses explicitly
        if (paymentIntent.status === 'succeeded') {
          ev.complete('success');
          onSuccess(paymentIntent.id);
        } else if (paymentIntent.status === 'requires_action' || paymentIntent.status === 'processing') {
          // Payment needs more time (common with UPI wallets)
          ev.complete('success');
          setPaymentStatus('checking');
          
          // Check if QR code is available in next_action
          if (paymentIntent.next_action?.type === 'display_qr_code') {
            const qrData = paymentIntent.next_action as any;
            if (qrData?.display_qr_code?.image_url_svg) {
              setQrCodeUrl(qrData.display_qr_code.image_url_svg);
              setShowQRCode(true);
              toast({
                title: "Scan QR Code",
                description: "Please scan the QR code with your UPI app to complete payment",
              });
            } else {
              toast({
                title: "Processing Payment",
                description: "Your payment is being processed. Please wait...",
              });
            }
          } else {
            toast({
              title: "Processing Payment",
              description: "Your payment is being processed. Please wait...",
            });
          }
          
          pollPaymentStatus(paymentIntent.id);
        } else if (paymentIntent.status === 'requires_payment_method' || paymentIntent.status === 'canceled') {
          // Payment failed or was canceled
          ev.complete('fail');
          toast({
            title: "Payment Failed",
            description: "Payment was not completed. Please try again.",
            variant: "destructive",
          });
          onFailure();
        } else {
          // Unexpected status - treat as failure for safety
          ev.complete('fail');
          console.error('Unexpected payment intent status from wallet:', paymentIntent.status);
          toast({
            title: "Payment Error",
            description: "An unexpected error occurred. Please try again.",
            variant: "destructive",
          });
          onFailure();
        }
      }
    });
  }, [stripe, amount, clientSecret, onSuccess, onFailure, toast]);

  // Check for UPI QR code in payment intent
  useEffect(() => {
    const checkForQRCode = async () => {
      if (!stripe || !clientSecret) return;

      try {
        const { paymentIntent } = await stripe.retrievePaymentIntent(clientSecret);
        
        // Check if payment intent has next_action with display_qr_code
        if (paymentIntent?.next_action?.type === 'display_qr_code') {
          const qrData = paymentIntent.next_action as any;
          if (qrData?.display_qr_code?.image_url_svg) {
            setQrCodeUrl(qrData.display_qr_code.image_url_svg);
          }
        }
      } catch (error) {
        console.error('Error checking for QR code:', error);
      }
    };

    checkForQRCode();
  }, [stripe, clientSecret]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setPaymentStatus('pending');

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: 'if_required',
      });

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
        setPaymentStatus('idle');
        onFailure();
      } else if (paymentIntent) {
        if (paymentIntent.status === 'succeeded') {
          setPaymentStatus('idle');
          onSuccess(paymentIntent.id);
        } else if (paymentIntent.status === 'requires_action') {
          // Payment requires additional action (e.g., UPI QR code display)
          setPaymentStatus('checking');
          
          // Check if QR code is available in next_action
          if (paymentIntent.next_action?.type === 'display_qr_code') {
            const qrData = paymentIntent.next_action as any;
            if (qrData?.display_qr_code?.image_url_svg) {
              setQrCodeUrl(qrData.display_qr_code.image_url_svg);
              setShowQRCode(true); // Automatically show QR modal
              toast({
                title: "Scan QR Code",
                description: "Please scan the QR code with your UPI app to complete payment",
              });
            } else {
              toast({
                title: "Action Required",
                description: "Please complete the payment using UPI",
              });
            }
          } else {
            toast({
              title: "Action Required",
              description: "Please complete the payment using UPI",
            });
          }
          
          // Start polling for payment status
          pollPaymentStatus(paymentIntent.id);
        } else if (paymentIntent.status === 'processing') {
          // Payment is being processed (common with UPI)
          setPaymentStatus('checking');
          toast({
            title: "Processing Payment",
            description: "Your payment is being processed. Please wait...",
          });
          
          // Poll for payment status
          pollPaymentStatus(paymentIntent.id);
        }
      }
    } catch (err: any) {
      toast({
        title: "Payment Error",
        description: err.message || "An unexpected error occurred",
        variant: "destructive",
      });
      setPaymentStatus('idle');
      onFailure();
    } finally {
      setIsProcessing(false);
    }
  };

  const pollPaymentStatus = async (paymentIntentId: string) => {
    const maxAttempts = 20; // 20 attempts × 3 seconds = 60 seconds max
    let attempts = 0;

    const checkStatus = async () => {
      attempts++;

      if (attempts > maxAttempts) {
        setPaymentStatus('idle');
        setShowQRCode(false);
        toast({
          title: "Payment Verification Timeout",
          description: "We couldn't verify your payment. If you completed the payment, it will be processed automatically. Please check your payment history in a few minutes.",
          variant: "destructive",
        });
        return;
      }

      try {
        if (!stripe) return;
        
        // Retrieve payment intent using the explicit ID passed in
        const { paymentIntent } = await stripe.retrievePaymentIntent(clientSecret);
        
        // Verify we're checking the correct payment intent
        if (paymentIntent?.id !== paymentIntentId) {
          console.error('Payment intent ID mismatch during polling');
          return;
        }
        
        if (paymentIntent.status === 'succeeded') {
          setPaymentStatus('idle');
          setShowQRCode(false);
          toast({
            title: "Payment Successful!",
            description: "Your payment has been confirmed",
          });
          onSuccess(paymentIntent.id);
        } else if (paymentIntent.status === 'requires_payment_method' || paymentIntent.status === 'canceled') {
          setPaymentStatus('idle');
          setShowQRCode(false);
          toast({
            title: "Payment Failed",
            description: "Please try again with a different payment method",
            variant: "destructive",
          });
          onFailure();
        } else if (paymentIntent.status === 'processing' || paymentIntent.status === 'requires_action') {
          // Still processing, check again after delay
          setTimeout(checkStatus, 3000); // Check every 3 seconds
        } else {
          // Unknown status, stop polling
          setPaymentStatus('idle');
          console.error('Unexpected payment intent status:', paymentIntent.status);
        }
      } catch (error) {
        console.error('Error polling payment status:', error);
        // Continue polling despite errors (network issues, etc.)
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 3000);
        }
      }
    };

    checkStatus();
  };

  const handleShowQRCode = async () => {
    setShowQRCode(true);
    setPaymentStatus('checking');
    
    // Retrieve the payment intent to get the ID and start polling
    if (stripe && clientSecret) {
      try {
        const { paymentIntent } = await stripe.retrievePaymentIntent(clientSecret);
        if (paymentIntent) {
          pollPaymentStatus(paymentIntent.id);
        }
      } catch (error) {
        console.error('Error retrieving payment intent for QR polling:', error);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* PaymentRequest Button (Google Pay, PhonePe, etc.) */}
      {paymentRequest && (
        <div className="border-b pb-4 mb-4">
          <p className="text-sm text-muted-foreground mb-3 text-center">Express Checkout</p>
          <PaymentRequestButtonElement 
            options={{ paymentRequest } as StripePaymentRequestButtonElementOptions}
          />
        </div>
      )}

      {/* QR Code Button (if available) */}
      {qrCodeUrl && (
        <div className="mb-4">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleShowQRCode}
            data-testid="button-show-qr"
          >
            <QrCode className="mr-2 h-4 w-4" />
            Pay with UPI QR Code
          </Button>
        </div>
      )}

      {/* Standard Payment Form */}
      <form onSubmit={handleSubmit} className="space-y-4" data-testid="form-stripe-checkout">
        <PaymentElement 
          options={{
            layout: 'accordion',
            paymentMethodOrder: ['upi', 'card'],
          }}
        />
        <div className="pt-4">
          <Button
            type="submit"
            className="w-full"
            disabled={!stripe || !elements || isProcessing || paymentStatus === 'checking'}
            data-testid="button-submit-payment"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing Payment...
              </>
            ) : paymentStatus === 'checking' ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Waiting for Payment...
              </>
            ) : (
              `Pay ₹${amount}`
            )}
          </Button>
        </div>

        {paymentStatus === 'checking' && (
          <p className="text-sm text-center text-muted-foreground">
            Checking payment status... This may take a few moments.
          </p>
        )}
      </form>

      {/* QR Code Modal */}
      <Dialog open={showQRCode} onOpenChange={setShowQRCode}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-qr-code">
          <DialogHeader>
            <DialogTitle>Scan to Pay with UPI</DialogTitle>
            <DialogDescription>
              Scan this QR code with any UPI app (Google Pay, PhonePe, Paytm, etc.)
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-6 space-y-4">
            {qrCodeUrl && (
              <div className="border-2 border-gray-200 rounded-lg p-4 bg-white">
                <img 
                  src={qrCodeUrl} 
                  alt="UPI QR Code" 
                  className="w-64 h-64"
                  data-testid="img-qr-code"
                />
              </div>
            )}
            <div className="text-center space-y-2">
              <p className="font-semibold text-lg">₹{amount}</p>
              <p className="text-sm text-muted-foreground">
                Waiting for payment confirmation...
              </p>
              {paymentStatus === 'checking' && (
                <div className="flex items-center justify-center gap-2 text-sm text-blue-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Checking payment status...</span>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
