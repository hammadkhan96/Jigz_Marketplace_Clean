import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function VerifyEmailPage() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link');
      return;
    }

    const verifyEmail = async () => {
      try {
        const response = await apiRequest('POST', '/api/auth/verify-email', { token });
        setStatus('success');
        setMessage('Your email has been verified successfully! You can now access all features of Jigz.');
      } catch (error: any) {
        setStatus('error');
        setMessage(error?.message || 'Failed to verify email. The link may have expired.');
      }
    };

    verifyEmail();
  }, []);

  const handleContinue = () => {
    if (status === 'success') {
      setLocation('/login');
    } else {
      setLocation('/signup');
    }
  };

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
            {status === 'loading' && (
              <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
            )}
            {status === 'success' && (
              <CheckCircle className="h-12 w-12 text-green-600" />
            )}
            {status === 'error' && (
              <XCircle className="h-12 w-12 text-red-600" />
            )}
          </div>
          <CardTitle className="text-2xl font-bold">
            {status === 'loading' && 'Verifying Your Email...'}
            {status === 'success' && 'Email Verified!'}
            {status === 'error' && 'Verification Failed'}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600">
            {message}
          </p>
          
          {status !== 'loading' && (
            <Button 
              onClick={handleContinue}
              className="w-full"
            >
              {status === 'success' ? 'Continue to Login' : 'Try Again'}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}