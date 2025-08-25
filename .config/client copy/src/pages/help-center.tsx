import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Coins, FileText, MessageCircle, Shield, Star, ArrowLeft, HelpCircle } from "lucide-react";
import { Link } from "wouter";

export default function HelpCenter() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="mr-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <HelpCircle className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Help Center</h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Everything you need to know about using Jigz to find jobs, build your reputation, and grow your freelance career.
            </p>
          </div>
        </div>

        {/* Help Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Getting Started */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Getting Started</h3>
              </div>
              <div className="space-y-3 text-sm text-gray-600">
                <p>• <strong>Complete your profile:</strong> Add a profile picture and update your information to build trust with clients.</p>
                <p>• <strong>Browse jobs:</strong> Use the search and filters to find jobs that match your skills.</p>
                <p>• <strong>Apply strategically:</strong> Write personalized messages and use coin bidding to stand out.</p>
                <p>• <strong>Build your reputation:</strong> Complete jobs on time and earn positive reviews.</p>
              </div>
            </CardContent>
          </Card>

          {/* Coin System */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center mr-3">
                  <Coins className="h-5 w-5 text-yellow-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Coin System</h3>
              </div>
              <div className="space-y-3 text-sm text-gray-600">
                <p>• <strong>Monthly allowance:</strong> You get 100 coins each month automatically.</p>
                <p>• <strong>Application cost:</strong> Each job application costs 1 coin.</p>
                <p>• <strong>Priority bidding:</strong> Bid extra coins to rank higher in application lists.</p>
                <p>• <strong>Buy more coins:</strong> Purchase additional coins if you run out.</p>
              </div>
            </CardContent>
          </Card>

          {/* Job Applications */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                  <FileText className="h-5 w-5 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Applying to Jobs</h3>
              </div>
              <div className="space-y-3 text-sm text-gray-600">
                <p>• <strong>Read carefully:</strong> Understand the job requirements before applying.</p>
                <p>• <strong>Competitive bidding:</strong> Your bid amount and coin investment affects your ranking.</p>
                <p>• <strong>Message quality:</strong> Write clear, relevant messages (max 1500 characters).</p>
                <p>• <strong>Experience matters:</strong> Highlight relevant experience (max 500 characters).</p>
              </div>
            </CardContent>
          </Card>

          {/* Reviews & Ratings */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                  <Star className="h-5 w-5 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Reviews & Ratings</h3>
              </div>
              <div className="space-y-3 text-sm text-gray-600">
                <p>• <strong>Two-way system:</strong> Both clients and freelancers can rate each other.</p>
                <p>• <strong>Job completion:</strong> Reviews happen after jobs are marked as completed.</p>
                <p>• <strong>Rating scale:</strong> 1-5 stars with optional written feedback.</p>
                <p>• <strong>Build reputation:</strong> Good reviews help you get more jobs.</p>
              </div>
            </CardContent>
          </Card>

          {/* Communication */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mr-3">
                  <MessageCircle className="h-5 w-5 text-indigo-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Communication</h3>
              </div>
              <div className="space-y-3 text-sm text-gray-600">
                <p>• <strong>Real-time messaging:</strong> Chat with clients about job details.</p>
                <p>• <strong>Professional tone:</strong> Keep all communications respectful and clear.</p>
                <p>• <strong>Quick responses:</strong> Reply promptly to maintain good relationships.</p>
                <p>• <strong>Job discussions:</strong> Use messaging to clarify requirements and timelines.</p>
              </div>
            </CardContent>
          </Card>

          {/* Account Security */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mr-3">
                  <Shield className="h-5 w-5 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Account Security</h3>
              </div>
              <div className="space-y-3 text-sm text-gray-600">
                <p>• <strong>Email verification:</strong> Verify your email address for account security.</p>
                <p>• <strong>Strong passwords:</strong> Use a secure password and keep it confidential.</p>
                <p>• <strong>Profile visibility:</strong> Your profile is visible to all platform users.</p>
                <p>• <strong>Report issues:</strong> Contact support if you encounter problems.</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* FAQ Section */}
        <Card>
          <CardContent className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Frequently Asked Questions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">How do I increase my chances of getting hired?</h4>
                  <p className="text-sm text-gray-600">Complete your profile, write personalized application messages, bid competitively, build good reviews, and respond quickly to messages.</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">What happens if I run out of coins?</h4>
                  <p className="text-sm text-gray-600">You can purchase additional coins or wait until the next month when your allowance resets automatically.</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">How does priority bidding work?</h4>
                  <p className="text-sm text-gray-600">When applying for jobs, you can bid extra coins to rank higher in the applicant list. Higher bidders appear first to clients.</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Can I edit my job application after submitting?</h4>
                  <p className="text-sm text-gray-600">No, applications cannot be edited after submission. Make sure to review your application carefully before submitting.</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">How do I know if my application was accepted?</h4>
                  <p className="text-sm text-gray-600">You'll receive a notification when your application status changes. Check your dashboard and notifications regularly.</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">How are payments handled?</h4>
                  <p className="text-sm text-gray-600">Payment terms are agreed upon between clients and freelancers. Complete the job to your client's satisfaction to ensure payment.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Support */}
        <div className="text-center mt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Still need help?</h3>
          <p className="text-gray-600 mb-4">Can't find what you're looking for or have any ideas for improvements? Our support team is here to help - email us at contact@jigz.co.</p>
          <div className="space-x-4">
            <Link href="/profile">
              <Button variant="outline">
                Go to Profile
              </Button>
            </Link>
            <a href="mailto:contact@jigz.co">
              <Button>
                Contact Support
              </Button>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}