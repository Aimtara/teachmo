import React from "react";
import ProtectedRoute from "@/components/shared/ProtectedRoute";
import { Card, CardContent } from "@/components/ui/card";
import { Construction, Users } from "lucide-react";

export default function UnifiedCommunity() {
  return (
    <ProtectedRoute allowedRoles={["parent", "teacher"]} requireAuth={true}>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Users className="w-7 h-7" />
                Community
              </h1>
              <p className="mt-2 text-gray-700">
                The community hub is moving to the Nhost stack. We’ll reopen it once migration is
                complete.
              </p>
            </div>
          </div>

          <Card className="mt-6 border-0 shadow-lg bg-white/90 backdrop-blur-sm">
            <CardContent className="p-8">
              <div className="flex items-start gap-4">
                <Construction className="w-8 h-8 text-amber-600" />
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Community migration in progress</h2>
                  <p className="mt-1 text-gray-700">
                    We’re replatforming community features onto the Nhost GraphQL stack. For launch
                    readiness, this area is temporarily disabled.
                  </p>
                  <p className="mt-4 text-sm text-gray-600">
                    Check back soon for discussion boards, pods, and messaging once data migration is complete.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}
