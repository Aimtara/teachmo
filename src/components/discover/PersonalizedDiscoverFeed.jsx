import React, { useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { useUserData } from "@nhost/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Breadcrumbs, { generateBreadcrumbs } from "@/components/shared/Breadcrumbs";
import { ArrowLeft, Sparkles, RefreshCw, Brain } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { navigateToDashboard } from "@/components/utils/navigationHelpers";
import { ultraMinimalToast } from "@/components/shared/UltraMinimalToast";
import { AnimatePresence } from "framer-motion";
import RecommendationCard from "./RecommendationCard";
import { base44 } from "@/api/base44Client";

const EMPTY_FEED = {
  activities: [],
  events: [],
  resources: [],
  personalization_factors: []
};

export default function PersonalizedDiscoverFeed({ userId, childId }) {
  const navigate = useNavigate();
  const nhostUser = useUserData();

  const resolvedUserId = userId || nhostUser?.id || null;
  const resolvedChildId = childId || nhostUser?.metadata?.active_child_id || null;

  const [dismissedIds, setDismissedIds] = useState([]);
  const [generatingFeed, setGeneratingFeed] = useState(false);
  const queryClient = useQueryClient();
  const warnedMissingFnRef = useRef(false);

  const breadcrumbs = generateBreadcrumbs("UnifiedDiscover", nhostUser);

  const { data: feedData, isLoading } = useQuery({
    queryKey: ["personalized-feed", resolvedUserId, resolvedChildId],
    enabled: Boolean(resolvedUserId),
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      try {
        const response = await base44.functions.invoke("personalizedDiscoverFeed", {
          user_id: resolvedUserId,
          child_id: resolvedChildId,
          limit: 15
        });

        const data = response?.data ?? response;
        return data || EMPTY_FEED;
      } catch (error) {
        console.warn("[Discover] personalizedDiscoverFeed unavailable (expected during migration):", error);
        if (!warnedMissingFnRef.current) {
          warnedMissingFnRef.current = true;
          ultraMinimalToast("Discover feed backend not configured yet — showing an empty feed.", "info");
        }
        return EMPTY_FEED;
      }
    }
  });

  const saveMutation = useMutation({
    mutationFn: async ({ itemId, itemType }) => {
      if (!resolvedUserId) throw new Error("User not available");

      if (itemType === "event") {
        const event = feedData?.events?.find((e) => e.id === itemId);
        if (!event) return null;

        return base44.entities.CalendarEvent.create({
          title: event.title,
          description: event.description,
          start_time: event.start_time,
          end_time: event.end_time,
          resource_id: event.id,
          resource_type: "local_event",
          user_id: resolvedUserId,
          ...(resolvedChildId ? { child_id: resolvedChildId } : {})
        });
      }

      if (itemType === "activity") {
        return base44.entities.Activity.update(itemId, {
          status: "planned",
          ...(resolvedChildId ? { child_id: resolvedChildId } : {})
        });
      }

      if (itemType === "resource") {
        return base44.entities.UserBookmark.create({
          resource_id: itemId,
          resource_type: "library_resource",
          ...(resolvedUserId ? { user_id: resolvedUserId } : {})
        });
      }

      return null;
    },
    onSuccess: () => {
      ultraMinimalToast("Saved! ✨", "success");
      queryClient.invalidateQueries({ queryKey: ["personalized-feed"] });
    },
    onError: () => {
      ultraMinimalToast("Failed to save", "error");
    }
  });

  const handleRefreshFeed = async () => {
    setGeneratingFeed(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ["personalized-feed"] });
      setDismissedIds([]);
      ultraMinimalToast("Feed refreshed! ✨", "success");
    } catch (error) {
      ultraMinimalToast("Failed to refresh", "error");
    } finally {
      setGeneratingFeed(false);
    }
  };

  const allRecommendations = useMemo(
    () => [
      ...(feedData?.activities || [])
        .filter((a) => !dismissedIds.includes(a.id))
        .map((a) => ({ ...a, type: "activity" })),
      ...(feedData?.events || [])
        .filter((e) => !dismissedIds.includes(e.id))
        .map((e) => ({ ...e, type: "event" })),
      ...(feedData?.resources || [])
        .filter((r) => !dismissedIds.includes(r.id))
        .map((r) => ({ ...r, type: "resource" }))
    ].sort((a, b) => (b.recommendation_score || 0) - (a.recommendation_score || 0)),
    [feedData, dismissedIds]
  );

  if (isLoading) {
    return <FeedLoadingSkeleton />;
  }

  if (allRecommendations.length === 0) {
    return (
      <EmptyFeedState
        onRefresh={handleRefreshFeed}
        isRefreshing={generatingFeed}
        breadcrumbs={breadcrumbs}
        onBack={() => navigateToDashboard(nhostUser, navigate)}
      />
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={() => navigateToDashboard(nhostUser, navigate)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Breadcrumbs segments={breadcrumbs} />
      </div>

      <FeedHeader onRefresh={handleRefreshFeed} isRefreshing={generatingFeed} />

      {feedData?.personalization_factors?.length > 0 && (
        <PersonalizationExplainer factors={feedData.personalization_factors} />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {allRecommendations.map((item, index) => (
            <RecommendationCard
              key={`${item.type}-${item.id}`}
              item={item}
              index={index}
              onSave={() => saveMutation.mutate({ itemId: item.id, itemType: item.type })}
              onDismiss={() => setDismissedIds((prev) => [...prev, item.id])}
              isSaving={saveMutation.isPending}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function FeedLoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="animate-pulse">
          <CardContent className="p-6">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-4" />
            <div className="h-3 bg-gray-200 rounded w-full mb-2" />
            <div className="h-3 bg-gray-200 rounded w-2/3" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function FeedHeader({ onRefresh, isRefreshing }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-2">
        <Sparkles className="w-6 h-6 text-purple-600" />
        <h2 className="text-2xl font-bold text-gray-900">For You</h2>
      </div>
      <Button variant="outline" size="sm" onClick={onRefresh} disabled={isRefreshing}>
        <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
        Refresh
      </Button>
    </div>
  );
}

function PersonalizationExplainer({ factors }) {
  return (
    <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200 mb-6">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Brain className="w-5 h-5 text-purple-600 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-gray-900 mb-1">Personalized for you</p>
            <p className="text-sm text-gray-600">Based on: {factors.join(", ")}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyFeedState({ onRefresh, isRefreshing, breadcrumbs, onBack }) {
  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Breadcrumbs segments={breadcrumbs} />
      </div>

      <Card className="border-2 border-dashed border-gray-300">
        <CardContent className="p-12 text-center">
          <Sparkles className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No recommendations yet</h3>
          <p className="text-gray-600 mb-6">
            We're learning your preferences. Keep using Teachmo to personalize your feed!
          </p>
          <Button onClick={onRefresh} disabled={isRefreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            Generate Recommendations
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

PersonalizedDiscoverFeed.propTypes = {
  userId: PropTypes.string,
  childId: PropTypes.string
};

FeedHeader.propTypes = {
  onRefresh: PropTypes.func.isRequired,
  isRefreshing: PropTypes.bool.isRequired
};

PersonalizationExplainer.propTypes = {
  factors: PropTypes.arrayOf(PropTypes.string).isRequired
};

EmptyFeedState.propTypes = {
  onRefresh: PropTypes.func.isRequired,
  isRefreshing: PropTypes.bool.isRequired,
  breadcrumbs: PropTypes.array,
  onBack: PropTypes.func.isRequired
};
