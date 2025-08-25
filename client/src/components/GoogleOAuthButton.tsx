import React from 'react';
import { Button } from '@/components/ui/button';
import { FcGoogle } from 'react-icons/fc';

interface GoogleOAuthButtonProps {
  mode: 'login' | 'signup';
  className?: string;
  disabled?: boolean;
}

export default function GoogleOAuthButton({ 
  mode, 
  className = '', 
  disabled = false 
}: GoogleOAuthButtonProps) {
  const handleGoogleAuth = () => {
    // Redirect to Google OAuth endpoint
    window.location.href = `/api/auth/google`;
  };

  const getButtonText = () => {
    switch (mode) {
      case 'login':
        return 'Continue with Google';
      case 'signup':
        return 'Sign up with Google';
      default:
        return 'Continue with Google';
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleGoogleAuth}
      disabled={disabled}
      className={`w-full border-gray-300 hover:bg-gray-50 ${className}`}
    >
      <FcGoogle className="mr-2 h-5 w-5" />
      {getButtonText()}
    </Button>
  );
}
