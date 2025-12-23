import React, { useEffect, useState } from "react";
import ProtectedRoute from "@/components/shared/ProtectedRoute";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, MessageSquare, Shield, Users } from "lucide-react";

import { User } from "@/api/entities";
import CommunityScope from "@/components/community/CommunityScope";
import CommunityFeed from "@/components/community/CommunityFeed";
import CommunityPods from "@/components/community/CommunityPods";
import CommunityMessages from "@/components/community/CommunityMessages";
import CommunityPrivacySettings from "@/components/community/CommunityPrivacySettings";
import ReportConcernModal from "@/components/community/ReportConcernModal";

export default function UnifiedCommunity() {
  const [me, setMe] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [reportState, setReportState] = useState({
    open: false,
    contentType: "post",
    contentId: null,
    reportedUserId: null,
  });

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const user = await User.me();
        setMe(user);
      } catch (e) {
        console.error("Error loading Base44 user:", e);
        setError({ message: "Could not load your community profile. (Base44 session missing?)" });
        setReportState({ open: false, contentType: "post", contentId: null, reportedUserId: null });
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, []);

  const handleReport = (post) => {
    setReportState({
      open: true,
      contentType: "post",
      contentId: post?.id,
      reportedUserId: post?.user_id,
    });
  };

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
                Ask questions, share wins, and connect with other parents and educators.
              </p>
            </div>
          </div>

          {error ? (
            <Card className="mt-6 border-0 shadow-lg bg-white/90 backdrop-blur-sm">
              <CardContent className="p-8">
                <div className="flex items-start gap-4">
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Community unavailable</h2>
                    <p className="mt-1 text-gray-700">{error.message}</p>
                    <p className="mt-4 text-sm text-gray-600">
                      This page currently uses Base44 entities. If you are signed into Nhost but not Base44,
                      you may see this error.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Tabs defaultValue="feed" className="mt-6">
              <TabsList className="bg-white/80">
                <TabsTrigger value="feed" className="gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Feed
                </TabsTrigger>
                <TabsTrigger value="pods" className="gap-2">
                  <Users className="w-4 h-4" />
                  Pods
                </TabsTrigger>
                <TabsTrigger value="messages" className="gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Messages
                </TabsTrigger>
                <TabsTrigger value="privacy" className="gap-2">
                  <Shield className="w-4 h-4" />
                  Privacy
                </TabsTrigger>
              </TabsList>

              <TabsContent value="feed" className="mt-6">
                {isLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <>
                    <CommunityScope user={me} />
                    <CommunityFeed onReport={handleReport} />
                  </>
                )}
              </TabsContent>

              <TabsContent value="pods" className="mt-6">
                {isLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <CommunityPods user={me} />
                )}
              </TabsContent>

              <TabsContent value="messages" className="mt-6">
                {isLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <CommunityMessages user={me} />
                )}
              </TabsContent>

              <TabsContent value="privacy" className="mt-6">
                <CommunityPrivacySettings userId={me?.id} />
              </TabsContent>
            </Tabs>
          )}

          {!error && (
            <ReportConcernModal
              open={reportState.open}
              onOpenChange={(open) => setReportState((prev) => ({ ...prev, open }))}
              contentType={reportState.contentType}
              contentId={reportState.contentId}
              reportedUserId={reportState.reportedUserId}
            />
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
