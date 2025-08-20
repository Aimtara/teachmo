import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, Star, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function PremiumGate({ 
  title = "Premium Feature", 
  description = "This feature is available for premium members only.",
  feature,
  children 
}) {
  return (
    <Card className="border-2 border-dashed border-purple-300 bg-gradient-to-br from-purple-50 to-pink-50">
      <CardHeader className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
          <Crown className="w-8 h-8 text-white" />
        </div>
        <CardTitle className="flex items-center justify-center gap-2">
          <Star className="w-5 h-5 text-purple-500" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        <p className="text-gray-600">{description}</p>
        {feature && (
          <div className="p-4 bg-white/80 rounded-lg">
            <p className="text-sm font-medium text-purple-800">Premium Feature:</p>
            <p className="text-sm text-gray-700">{feature}</p>
          </div>
        )}
        <Link to={createPageUrl("Upgrade")}>
          <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
            <Crown className="w-4 h-4 mr-2" />
            Upgrade to Premium
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
        {children}
      </CardContent>
    </Card>
  );
}