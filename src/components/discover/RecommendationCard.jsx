import React from "react";
import PropTypes from "prop-types";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Heart, Sparkles, Clock, MapPin, Calendar, Target, BookOpen } from "lucide-react";
import { format } from "date-fns";
import { ultraMinimalToast } from "@/components/shared/UltraMinimalToast";

export default function RecommendationCard({ item, index, onSave, onDismiss, isSaving }) {
  const getTypeIcon = (type) => {
    if (type === "activity") return Target;
    if (type === "event") return Calendar;
    if (type === "resource") return BookOpen;
    return Sparkles;
  };

  const getTypeColor = (type) => {
    if (type === "activity") return "from-green-500 to-emerald-500";
    if (type === "event") return "from-blue-500 to-indigo-500";
    if (type === "resource") return "from-purple-500 to-pink-500";
    return "from-gray-500 to-slate-500";
  };

  const TypeIcon = getTypeIcon(item.type);
  const colorClass = getTypeColor(item.type);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="h-full hover:shadow-lg transition-all group relative overflow-hidden">
        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${colorClass}`} />

        <button
          onClick={onDismiss}
          className="absolute top-3 right-3 p-1.5 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100 z-10"
          aria-label="Dismiss recommendation"
          type="button"
        >
          <X className="w-4 h-4 text-gray-600" />
        </button>

        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 bg-gradient-to-br ${colorClass} rounded-lg flex items-center justify-center flex-shrink-0`}>
              <TypeIcon className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg line-clamp-2">
                {item.title}
              </CardTitle>
              <Badge variant="outline" className="mt-1 text-xs capitalize">
                {item.type}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600 line-clamp-3">
            {item.description}
          </p>

          {item.recommendation_reason && (
            <RecommendationReason reason={item.recommendation_reason} />
          )}

          <ItemMetadata item={item} />

          {item.recommendation_score && (
            <ConfidenceScore score={item.recommendation_score} />
          )}

          <div className="flex gap-2 pt-2 border-t border-gray-200">
            <Button
              onClick={onSave}
              disabled={isSaving}
              className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              <Heart className="w-4 h-4 mr-2" />
              Save
            </Button>
            <Button
              variant="outline"
              onClick={() => ultraMinimalToast("View details coming soon", "info")}
            >
              View
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function RecommendationReason({ reason }) {
  return (
    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
      <p className="text-xs font-medium text-purple-900 mb-1 flex items-center gap-1">
        <Sparkles className="w-3 h-3" />
        Why we picked this:
      </p>
      <p className="text-xs text-purple-700">{reason}</p>
    </div>
  );
}

function ItemMetadata({ item }) {
  return (
    <div className="flex flex-wrap gap-2 text-xs text-gray-600">
      {item.duration && (
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {item.duration}
        </div>
      )}
      {item.location_name && (
        <div className="flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          {item.location_name}
        </div>
      )}
      {item.start_time && (
        <div className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {format(new Date(item.start_time), "MMM d")}
        </div>
      )}
      {item.category && (
        <Badge variant="outline" className="text-xs">
          {item.category}
        </Badge>
      )}
    </div>
  );
}

function ConfidenceScore({ score }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all"
          style={{ width: `${score * 100}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 font-medium">
        {Math.round(score * 100)}% match
      </span>
    </div>
  );
}

RecommendationCard.propTypes = {
  item: PropTypes.shape({
    id: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    description: PropTypes.string,
    recommendation_reason: PropTypes.string,
    recommendation_score: PropTypes.number,
    duration: PropTypes.string,
    location_name: PropTypes.string,
    start_time: PropTypes.string,
    category: PropTypes.string
  }).isRequired,
  index: PropTypes.number.isRequired,
  onSave: PropTypes.func.isRequired,
  onDismiss: PropTypes.func.isRequired,
  isSaving: PropTypes.bool
};

RecommendationReason.propTypes = {
  reason: PropTypes.string.isRequired
};

ItemMetadata.propTypes = {
  item: PropTypes.object.isRequired
};

ConfidenceScore.propTypes = {
  score: PropTypes.number.isRequired
};
