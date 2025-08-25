import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin, Clock, Users, Star, ArrowLeft, DollarSign, Calendar, User, ExternalLink, Tag, MessageCircle, CheckCircle, Globe, Mail, Phone, Coins } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import type { ServiceWithRequests, UserWithStats, User as UserType } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Helmet } from "react-helmet-async";
import { useToast } from "@/hooks/use-toast";
import { getCurrencySymbol } from "@shared/currencies";
import { RatingDisplay } from "@/components/rating-display";
import { ObjectUploader } from "@/components/ObjectUploader";
import { Plus, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function ServiceDetailsPage() {
  const { serviceId } = useParams();
  const [showRequestModal, setShowRequestModal] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Inquiry form state
  const [inquiryData, setInquiryData] = useState({
    message: "",
    contactEmail: "",
    contactPhone: ""
  });

  // Get user coins
  const { data: userCoinsData } = useQuery<{ coins: number }>({
    queryKey: ["/api/user/coins"],
    enabled: !!user,
  });
  const userCoins = userCoinsData?.coins || 0;

  // Fetch service details
  const { data: service, isLoading } = useQuery<ServiceWithRequests>({
    queryKey: ["/api/services", serviceId],
    enabled: !!serviceId,
  });

  // Fetch service provider details
  const { data: providerStats } = useQuery<UserWithStats>({
    queryKey: ["/api/user/stats", service?.userId],
    enabled: !!service?.userId,
  });

  // Fetch service provider profile
  const { data: providerProfile } = useQuery<UserType>({
    queryKey: ["/api/user/profile", service?.userId],
    enabled: !!service?.userId,
  });

  // Fetch service provider reviews
  const { data: providerReviews } = useQuery<any[]>({
    queryKey: ["/api/reviews/user", service?.userId],
    enabled: !!service?.userId,
  });

  // Service inquiry mutation
  const submitInquiryMutation = useMutation({
    mutationFn: async (inquiryPayload: any) => {
      const response = await fetch(`/api/services/${inquiryPayload.serviceId}/requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: inquiryPayload.message,
          budget: 1, // Minimum valid budget to pass validation
          timeline: "Flexible", // Default timeline since field is removed
          contactEmail: inquiryPayload.contactEmail,
          contactPhone: inquiryPayload.contactPhone
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to send inquiry");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/coins"] });
      toast({
        title: "Inquiry Sent!",
        description: "Your inquiry has been sent to the service provider. They will contact you soon. 1 coin has been deducted."
      });
      setShowRequestModal(false);
      setInquiryData({
        message: "",
        contactEmail: "",
        contactPhone: ""
      });
    },
    onError: (error: any) => {
      // Check if it's a coin-related error
      if (error.message && error.message.includes("insufficient coins")) {
        toast({
          title: "Insufficient Coins",
          description: "You need 1 coin to send an inquiry. Visit the Buy Coins page to get more coins.",
          variant: "destructive"
        });
        return;
      }
      
      toast({
        title: "Error",
        description: error.message || "Failed to send inquiry. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Handle inquiry form submission
  const handleInquirySubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!inquiryData.message.trim()) {
      toast({
        title: "Message Required",
        description: "Please enter a message to send your inquiry.",
        variant: "destructive"
      });
      return;
    }

    const inquiryPayload = {
      serviceId,
      message: inquiryData.message,
      contactEmail: inquiryData.contactEmail,
      contactPhone: inquiryData.contactPhone
    };

    submitInquiryMutation.mutate(inquiryPayload);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <div className="h-96 bg-gray-200 rounded-lg"></div>
              </div>
              <div className="space-y-4">
                <div className="h-64 bg-gray-200 rounded-lg"></div>
                <div className="h-32 bg-gray-200 rounded-lg"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Service Not Found</h1>
            <p className="text-gray-600 mb-8">
              The service you're looking for doesn't exist or has been removed.
            </p>
            <Link href="/services">
              <Button>Browse Services</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isOwner = user?.id === service.userId;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <Helmet>
        <title>{service.title} - Jigz Services</title>
        <meta name="description" content={service.description} />
      </Helmet>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <div className="mb-6">
          <Link href="/services">
            <Button variant="ghost" className="text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Services
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
                {/* Status and Category Badges */}
                <div className="flex flex-wrap items-center justify-between mb-6">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800 font-medium">
                      <Tag className="h-3 w-3 mr-1" />
                      {service.category}
                    </Badge>
                    <Badge variant="outline" className="border-purple-300 text-purple-700 bg-purple-50">
                      {service.experienceLevel ? service.experienceLevel.charAt(0).toUpperCase() + service.experienceLevel.slice(1) : "Intermediate"}
                    </Badge>
                    {service.approvalStatus === "approved" && (
                      <Badge variant="default" className="bg-green-100 text-green-800 border-green-300">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Verified Service
                      </Badge>
                    )}
                  </div>
                  
                  {/* Pricing Preview */}
                  <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center text-lg font-bold text-gray-900">
                      <DollarSign className="h-4 w-4 mr-1 text-green-600" />
                      <span className="text-green-600">
                        {getCurrencySymbol(service.currency)}{service.priceFrom}
                        {service.priceTo && ` - ${getCurrencySymbol(service.currency)}${service.priceTo}`}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 text-center mt-1">
                      {service.priceType === "hourly" && "per hour"}
                      {service.priceType === "per_project" && "per project"}
                      {service.priceType === "per_day" && "per day"}
                    </p>
                  </div>
                </div>

                {/* Service Title */}
                <CardTitle className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 leading-tight">
                  {service.title}
                </CardTitle>
                
                {/* Enhanced Service Meta Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-3">
                    <div className="flex items-center text-gray-700 bg-white px-3 py-2 rounded-lg shadow-sm">
                      <MapPin className="h-4 w-4 mr-3 text-red-500" />
                      <span className="font-medium">Location:</span>
                      <span className="ml-2 text-gray-600">
                        {service.location}
                        {service.specificArea && (
                          <span className="text-gray-500 text-xs ml-1">
                            ({service.specificArea})
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center text-gray-700 bg-white px-3 py-2 rounded-lg shadow-sm">
                      <Clock className="h-4 w-4 mr-3 text-blue-500" />
                      <span className="font-medium">Delivery:</span>
                      <span className="ml-2 text-gray-600">{service.deliveryTime || "Flexible timing"}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center text-gray-700 bg-white px-3 py-2 rounded-lg shadow-sm">
                      <Calendar className="h-4 w-4 mr-3 text-purple-500" />
                      <span className="font-medium">Posted:</span>
                      <span className="ml-2 text-gray-600">
                        {service.createdAt ? format(new Date(service.createdAt), "MMM dd, yyyy") : "Recently"}
                      </span>
                    </div>
                    {service.duration && (
                      <div className="flex items-center text-gray-700 bg-white px-3 py-2 rounded-lg shadow-sm">
                        <Clock className="h-4 w-4 mr-3 text-orange-500" />
                        <span className="font-medium">Duration:</span>
                        <span className="ml-2 text-gray-600">{service.duration}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-6">
                {/* Service Description */}
                <div className="mb-8">
                  <div className="flex items-center mb-4">
                    <h3 className="text-xl font-bold text-gray-900">Service Overview</h3>
                  </div>
                  <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                    <p className="text-gray-700 whitespace-pre-wrap leading-relaxed text-base">
                      {service.description}
                    </p>
                  </div>
                </div>

                {/* Get In Touch Section */}
                <div className="mb-8">
                  <div className="flex items-center mb-4">
                    <h3 className="text-xl font-bold text-gray-900">Get In Touch</h3>
                  </div>
                  

                  
                  {/* Specific Location Display */}
                  {service?.specificArea && (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center text-blue-800">
                        <MapPin className="h-4 w-4 mr-2" />
                        <span className="text-sm font-medium">
                          Service available in: {service.specificArea}
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 text-center">
                    <p className="text-gray-700 mb-4">
                      Ready to get started? Send an inquiry to discuss your project requirements and get a personalized quote.
                    </p>
                    {!isOwner && (
                      user ? (
                        <Button 
                          className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold px-8 py-3 shadow-lg hover:shadow-xl transition-all duration-200"
                          onClick={() => setShowRequestModal(true)}
                        >
                          <MessageCircle className="h-5 w-5 mr-2" />
                          Send Inquiry
                        </Button>
                      ) : (
                        <Button 
                          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold px-8 py-3 shadow-lg hover:shadow-xl transition-all duration-200"
                          onClick={() => window.location.href = "/login"}
                        >
                          <MessageCircle className="h-5 w-5 mr-2" />
                          Login to Inquire
                        </Button>
                      )
                    )}
                  </div>
                </div>

                {/* Service Portfolio - Always show if images exist */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <h3 className="text-xl font-bold text-gray-900">Service Portfolio</h3>
                    </div>
                      {isOwner && (
                        <ObjectUploader
                          maxNumberOfFiles={1}
                          maxFileSize={10485760}
                          onGetUploadParameters={async () => {
                            const response = await apiRequest("POST", "/api/objects/upload");
                            const data = response as any as { uploadURL: string };
                            return {
                              method: "PUT" as const,
                              url: data.uploadURL,
                            };
                          }}
                          onComplete={async (result) => {
                            if (result.successful && result.successful.length > 0) {
                              const uploadURL = (result.successful[0] as any).uploadURL;
                              try {
                                await apiRequest("PUT", `/api/services/${service.id}/images`, {
                                  imageURL: uploadURL,
                                });
                                queryClient.invalidateQueries({ queryKey: ["/api/services", service.id] });
                                toast({
                                  title: "Success",
                                  description: "Image uploaded successfully",
                                });
                              } catch (error) {
                                toast({
                                  title: "Error",
                                  description: "Failed to save image",
                                  variant: "destructive",
                                });
                              }
                            }
                          }}
                          buttonClassName="bg-gray-600 hover:bg-gray-700 text-white border-gray-600"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Photo
                        </ObjectUploader>
                      )}
                    </div>
                    
                    {service.images && service.images.length > 0 ? (
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {service.images.map((image, index) => (
                            <div key={index} className="relative group bg-white rounded-lg overflow-hidden shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                              <img
                                src={image}
                                alt={`Portfolio image ${index + 1}`}
                                className="w-full h-40 object-cover"
                              />
                              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                                {isOwner && (
                                  <button
                                    onClick={async () => {
                                      const updatedImages = service.images?.filter((_, i) => i !== index) || [];
                                      try {
                                        await apiRequest("PUT", `/api/services/${service.id}`, {
                                          images: updatedImages,
                                        });
                                        queryClient.invalidateQueries({ queryKey: ["/api/services", service.id] });
                                        toast({
                                          title: "Success",
                                          description: "Image removed successfully",
                                        });
                                      } catch (error) {
                                        toast({
                                          title: "Error",
                                          description: "Failed to remove image",
                                          variant: "destructive",
                                        });
                                      }
                                    }}
                                    className="opacity-0 group-hover:opacity-100 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 transition-all duration-200 shadow-lg"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                              <div className="p-2">
                                <p className="text-xs text-gray-600 text-center">Image {index + 1}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : isOwner ? (
                      <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                        <div className="flex flex-col items-center">
                          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                            <Plus className="h-8 w-8 text-gray-400" />
                          </div>
                          <p className="text-gray-600 mb-2 font-medium">No portfolio images yet</p>
                          <p className="text-sm text-gray-500">Showcase your work by uploading service photos</p>
                        </div>
                      </div>
                    ) : null}
                </div>

                {/* Service Specifications */}
                <div className="mb-8">
                  <div className="flex items-center mb-4">
                    <h3 className="text-xl font-bold text-gray-900">Service Details</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm">
                      <div className="flex items-center mb-2">
                        <User className="h-5 w-5 mr-2 text-gray-600" />
                        <span className="font-semibold text-gray-900">Experience Level</span>
                      </div>
                      <p className="text-gray-600 capitalize">{service.experienceLevel || "Intermediate"} level expertise</p>
                    </div>
                    
                    <div className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm">
                      <div className="flex items-center mb-2">
                        <Clock className="h-5 w-5 mr-2 text-gray-600" />
                        <span className="font-semibold text-gray-900">Delivery Time</span>
                      </div>
                      <p className="text-gray-600">{service.deliveryTime || "Flexible timing"}</p>
                    </div>
                    
                    <div className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm">
                      <div className="flex items-center mb-2">
                        <MapPin className="h-5 w-5 mr-2 text-gray-600" />
                        <span className="font-semibold text-gray-900">Service Area</span>
                      </div>
                      <p className="text-gray-600">{service.location}</p>
                    </div>



                  </div>
                </div>

                {/* Skills & Technologies */}
                {service.tags && service.tags.length > 0 && (
                  <div className="mb-8">
                    <div className="flex items-center mb-4">
                      <h3 className="text-xl font-bold text-gray-900">Skills & Expertise</h3>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <div className="flex flex-wrap gap-2">
                        {service.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary" className="bg-white border-gray-300 text-gray-700 font-medium shadow-sm hover:shadow-md transition-shadow">
                            <Tag className="h-3 w-3 mr-1" />
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Service Provider Reviews */}
                {providerReviews && providerReviews.length > 0 && (
                  <div className="mb-8">
                    <div className="flex items-center mb-4">
                      <h3 className="text-xl font-bold text-gray-900">Client Reviews</h3>
                    </div>
                    <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                      <div className="space-y-4">
                        {providerReviews.slice(0, 5).map((review, index) => (
                          <div key={index} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <Avatar className="w-8 h-8">
                                <AvatarImage src={`/api/placeholder/avatar`} alt="Reviewer" />
                                <AvatarFallback className="text-xs">
                                  {review.reviewerUsername?.charAt(0).toUpperCase() || "R"}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {review.reviewerUsername || "Anonymous"}
                                </p>
                                <RatingDisplay 
                                  rating={review.rating} 
                                  size="sm" 
                                  showNumber={false}
                                />
                              </div>
                            </div>
                            <p className="text-xs text-gray-500">
                              {format(new Date(review.createdAt), "MMM dd, yyyy")}
                            </p>
                          </div>
                          
                          {/* Detailed ratings for client-to-worker reviews */}
                          {review.reviewType === "client_to_worker" && (
                            <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
                              <div className="text-center">
                                <p className="text-gray-600">Quality</p>
                                <RatingDisplay 
                                  rating={review.qualityOfWorkRating || 0} 
                                  size="sm" 
                                  showNumber={false}
                                />
                              </div>
                              <div className="text-center">
                                <p className="text-gray-600">Communication</p>
                                <RatingDisplay 
                                  rating={review.communicationRating || 0} 
                                  size="sm" 
                                  showNumber={false}
                                />
                              </div>
                              <div className="text-center">
                                <p className="text-gray-600">Timeliness</p>
                                <RatingDisplay 
                                  rating={review.timelinessRating || 0} 
                                  size="sm" 
                                  showNumber={false}
                                />
                              </div>
                            </div>
                          )}
                          
                          {review.comment && (
                            <p className="text-sm text-gray-700 leading-relaxed">
                              "{review.comment}"
                            </p>
                          )}
                          </div>
                        ))}
                      </div>
                      
                      {providerReviews.length > 5 && (
                        <div className="mt-6 pt-4 border-t border-gray-200 text-center">
                          <p className="text-sm text-gray-700">
                            <span className="font-medium">Showing 5 of {providerReviews.length} reviews</span> - 
                            <Link href={`/profile/${service.userId}`} className="text-blue-600 hover:text-blue-800 hover:underline ml-1">
                              View all reviews
                            </Link>
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Service Provider Card */}
            <Card className="border-2 border-gray-100 hover:border-blue-200 transition-colors">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
                <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-600" />
                  Service Provider
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {/* Provider Profile Section */}
                <div className="flex items-start space-x-4 mb-6">
                  <Avatar className="w-16 h-16 border-3 border-blue-100 shadow-md">
                    <AvatarImage 
                      src={`/api/placeholder/avatar`} 
                      alt="Provider"
                    />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-lg font-semibold">
                      {providerProfile?.username?.charAt(0).toUpperCase() || "P"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-lg text-gray-900 mb-1 truncate">
                      {providerProfile?.username || "Service Provider"}
                    </h4>
                    <div className="flex items-center gap-1 mb-2">
                      <RatingDisplay 
                        rating={providerReviews && providerReviews.length > 0 ? 
                          providerReviews.reduce((acc, review) => acc + review.rating, 0) / providerReviews.length : 
                          4.8
                        }
                        totalReviews={providerReviews?.length || 0}
                        size="sm"
                      />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="font-medium">Available</span>
                    </div>
                  </div>
                </div>

                {/* Stats Grid */}
                {providerStats && (
                  <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600 mb-1">
                        {providerStats.completedServices || 0}
                      </div>
                      <div className="text-sm text-gray-600 font-medium">Services Completed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-amber-600 mb-1">
                        {providerReviews && providerReviews.length > 0 ? 
                          (providerReviews.reduce((acc, review) => acc + review.rating, 0) / providerReviews.length).toFixed(1) : 
                          "4.8"
                        }
                      </div>
                      <div className="text-sm text-gray-600 font-medium">Average Rating</div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-3">
                  <Link href={`/profile/${service.userId}`}>
                    <Button variant="outline" className="w-full border-blue-200 hover:bg-blue-50 hover:border-blue-300 text-blue-700 font-medium">
                      <User className="h-4 w-4 mr-2" />
                      View Full Profile
                    </Button>
                  </Link>

                  {!isOwner && (
                    user ? (
                      <Button 
                        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                        onClick={() => setShowRequestModal(true)}
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Inquire
                      </Button>
                    ) : (
                      <Button 
                        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                        onClick={() => window.location.href = "/login"}
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Login to Inquire
                      </Button>
                    )
                  )}
                </div>

                {/* Provider Verification Badge */}
                {providerProfile?.isEmailVerified && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-green-700 font-medium">Verified Provider</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Service Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Service Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Requests</span>
                    <span className="font-medium">{service.requestCount || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Inquiries</span>
                    <span className="font-medium">{providerStats?.totalInquiriesReceived || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Completed Services</span>
                    <span className="font-medium">{providerStats?.completedServices || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Avg. Response Time</span>
                    <span className="font-medium">Within 24 hours</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Inquiry Modal */}
      <Dialog open={showRequestModal} onOpenChange={setShowRequestModal}>
        <DialogContent className="max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle>Inquire About Service</DialogTitle>
          </DialogHeader>
          
          {user && (
            <form onSubmit={handleInquirySubmit} className="space-y-4">
              <div>
                <Label htmlFor="message">Message *</Label>
                <Textarea
                  id="message"
                  value={inquiryData.message}
                  onChange={(e) => setInquiryData(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Tell the service provider about your requirements..."
                  required
                  className="mt-1"
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="contactEmail">Contact Email (Optional)</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={inquiryData.contactEmail}
                  onChange={(e) => setInquiryData(prev => ({ ...prev, contactEmail: e.target.value }))}
                  placeholder="your.email@example.com"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="contactPhone">Contact Phone (Optional)</Label>
                <Input
                  id="contactPhone"
                  type="tel"
                  value={inquiryData.contactPhone}
                  onChange={(e) => setInquiryData(prev => ({ ...prev, contactPhone: e.target.value }))}
                  placeholder="+1 (555) 123-4567"
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowRequestModal(false)}
                  disabled={submitInquiryMutation.isPending}
                  className="w-full"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 w-full"
                  disabled={submitInquiryMutation.isPending}
                >
                  {submitInquiryMutation.isPending ? "Sending..." : (
                    <>
                      <Coins className="h-4 w-4 mr-2" />
                      1 Send Inquiry
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}