import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Lock, Key, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

interface NotificationProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

const Notification: React.FC<NotificationProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`fixed top-4 right-4 z-50 max-w-sm p-4 rounded-lg shadow-lg animate-slide-in ${
        type === 'success' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200'
      } border flex items-center gap-2`}
    >
      {type === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
      <span className="text-sm">{message}</span>
      <button
        onClick={onClose}
        className="ml-2 text-lg font-medium hover:text-opacity-80"
        aria-label="Close notification"
      >
        ×
      </button>
    </div>
  );
};

const ResetPassword: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    verificationCode: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const { resetPassword, loading, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirect authenticated users to the feed
  useEffect(() => {
    if (isAuthenticated && !loading) {
      console.log('ResetPassword: Redirecting to /feed');
      navigate('/feed', { replace: true });
    }
  }, [isAuthenticated, loading, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await resetPassword(
        formData.email,
        formData.verificationCode,
        formData.newPassword,
        formData.confirmPassword
      );
      setNotification({
        message: 'Your password has been successfully reset.',
        type: 'success',
      });
      // Navigation to /signin is handled by resetPassword in AuthContext
    } catch (error: any) {
      setNotification({
        message: error.message || 'Failed to reset password. Please try again.',
        type: 'error',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
        <div className="flex flex-col items-center gap-2">
          <svg className="animate-spin h-8 w-8 text-gray-600" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span className="text-gray-600">Processing...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in { animation: slide-in 0.3s ease-out; }
      `}</style>
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
      <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">
              <span className="text-usm-gold">Social</span>Eagle
            </CardTitle>
            <CardDescription>Reset your password to access the USM community</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} noValidate className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    name="email"
                    placeholder="you@example.com"
                    className="pl-10 border-gray-300 focus:border-usm-gold"
                    value={formData.email}
                    onChange={handleChange}
                    autoComplete="email"
                    disabled={loading}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="verificationCode" className="text-sm font-medium text-gray-700">
                  Verification Code
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="verificationCode"
                    type="text"
                    name="verificationCode"
                    placeholder="Enter 6-digit code"
                    className="pl-10 border-gray-300 focus:border-usm-gold"
                    value={formData.verificationCode}
                    onChange={handleChange}
                    disabled={loading}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="newPassword" className="text-sm font-medium text-gray-700">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="newPassword"
                    type="password"
                    name="newPassword"
                    placeholder="••••••••"
                    className="pl-10 border-gray-300 focus:border-usm-gold"
                    value={formData.newPassword}
                    onChange={handleChange}
                    autoComplete="new-password"
                    disabled={loading}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    name="confirmPassword"
                    placeholder="••••••••"
                    className="pl-10 border-gray-300 focus:border-usm-gold"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    autoComplete="new-password"
                    disabled={loading}
                    required
                  />
                </div>
              </div>
              <Button
                type="submit"
                className="w-full bg-usm-gold hover:bg-amber-600 text-black font-medium transition-all duration-300"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Resetting...
                  </>
                ) : (
                  'Reset Password'
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-6">
            <p className="text-center text-sm text-gray-600">
              Remember your password?{' '}
              <Link to="/signin" className="text-usm-gold hover:underline font-medium">
                Sign in
              </Link>
            </p>
            <p className="text-center text-sm text-gray-600">
              Don't have an account?{' '}
              <Link to="/signup" className="text-usm-gold hover:underline font-medium">
                Sign up
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </>
  );
};

export default ResetPassword;