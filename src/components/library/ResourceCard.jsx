
import React from "react";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Bookmark, 
  BookmarkCheck, 
  Play, 
  FileText, 
  Video, 
  BookOpen, 
  Clock,
  Star,
  Eye,
  Users,
  Lock,
  ExternalLink,
} from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import LazyImage from '../shared/LazyImage'; // Import the new component

const typeIcons = {
  article: FileText,
  video: Video,
  guide: BookOpen,
  research: Users
};

const categoryColors = {
  communication: "bg-blue-100 text-blue-800",
  discipline: "bg-red-100 text-red-800",
  development: "bg-green-100 text-green-800",
  education: "bg-purple-100 text-purple-800",
  health: "bg-pink-100 text-pink-800",
  creativity: "bg-orange-100 text-orange-800",
  social_skills: "bg-indigo-100 text-indigo-800",
  emotional_intelligence: "bg-teal-100 text-teal-800",
  independence: "bg-yellow-100 text-yellow-800",
  confidence: "bg-emerald-100 text-emerald-800",
  safety: "bg-gray-100 text-gray-800",
  nutrition: "bg-lime-100 text-lime-800"
};

const difficultyColors = {
  beginner: "bg-green-50 text-green-700 border-green-200",
  intermediate: "bg-yellow-50 text-yellow-700 border-yellow-200",
  advanced: "bg-red-50 text-red-700 border-red-200"
};

export default function ResourceCard({ resource, isBookmarked, onBookmark, onSelect }) {
  const TypeIcon = typeIcons[resource.type] || FileText;

  const handleBookmarkClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onBookmark(isBookmarked);
  };
  
  const handleCardClick = () => {
    if (onSelect) onSelect();
  };

  const isExternalVideo = resource.type === 'video' && resource.video_url;

  const CardContentComponent = (
    <Card className="flex flex-col h-full overflow-hidden transition-all duration-300 cursor-pointer">
      <div className="relative flex-shrink-0">
        {resource.thumbnail_url && (
          <LazyImage
            src={resource.thumbnail_url}
            alt={resource.title}
            className="w-full h-40 object-cover"
            skeletonClassName="w-full h-40 bg-gray-200"
          />
        )}
        <div className="absolute top-2 right-2 flex gap-2">
          {resource.is_sponsored && (
            <Badge className="bg-yellow-100 text-yellow-800">
              <Star className="w-3 h-3 mr-1" />
              Sponsored
            </Badge>
          )}
          {resource.is_premium && (
            <Badge className="bg-blue-100 text-blue-800">
              <Lock className="w-3 h-3 mr-1" />
              Premium
            </Badge>
          )}
        </div>
      </div>
      <CardHeader className="pb-4 pt-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <TypeIcon className="w-5 h-5" style={{color: 'var(--teachmo-sage)'}} />
            <Badge className={categoryColors[resource.category] || "bg-gray-100 text-gray-800"}>
              {resource.category?.replace(/_/g, ' ')}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBookmarkClick}
            className="text-gray-400 hover:text-gray-600 p-1 z-10"
          >
            {isBookmarked ? (
              <BookmarkCheck className="w-5 h-5 text-blue-600" />
            ) : (
              <Bookmark className="w-5 h-5" />
            )}
          </Button>
        </div>
        
        <h3 className="font-bold text-lg text-gray-900 leading-tight mb-2">
          {resource.title}
        </h3>
        
        <div className="flex items-center gap-2 text-sm text-gray-600">
          {resource.duration && (
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{resource.duration}</span>
            </div>
          )}
          {resource.age_range && (
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>Ages {resource.age_range.min_age}-{resource.age_range.max_age}</span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-grow px-4 pb-4">
        <p className="text-gray-600 text-sm leading-relaxed line-clamp-3">
          {resource.description}
        </p>

        <div className="flex flex-wrap gap-2 mt-4">
          {resource.difficulty && (
            <Badge variant="outline" className={difficultyColors[resource.difficulty]}>
              {resource.difficulty}
            </Badge>
          )}
          {resource.author && (
            <Badge variant="outline" className="text-xs">
              {resource.author}
            </Badge>
          )}
        </div>

        {resource.tags && resource.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {resource.tags.slice(0, 3).map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs bg-gray-50">
                {tag}
              </Badge>
            ))}
            {resource.tags.length > 3 && (
              <Badge variant="outline" className="text-xs bg-gray-50">
                +{resource.tags.length - 3} more
              </Badge>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="mt-auto px-4 pt-4 border-t border-gray-100 bg-white">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Eye className="w-4 h-4" />
            <span>
              {resource.is_premium ? "Premium only" : (isExternalVideo ? "Click to watch" : "Click to read")}
            </span>
          </div>
          {resource.type === 'video' && !resource.is_premium && (
            <div className="flex items-center gap-2 text-blue-600 font-semibold">
                <Play className="w-4 h-4" />
                Watch Now
            </div>
          )}
          {isExternalVideo && (
            <ExternalLink className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </CardFooter>
    </Card>
  );

  let linkWrapper;

  if (resource.is_premium) {
    linkWrapper = <Link to={createPageUrl('Upgrade')} className="h-full flex">{CardContentComponent}</Link>;
  } else if (isExternalVideo) {
    linkWrapper = <a href={resource.video_url} target="_blank" rel="noopener noreferrer" className="h-full flex" onClick={handleCardClick}>{CardContentComponent}</a>;
  } else {
    if (resource && resource.id) {
      const detailUrl = createPageUrl('ResourceDetail') + `?id=${resource.id}`;
      linkWrapper = <Link to={detailUrl} className="h-full flex" onClick={handleCardClick}>{CardContentComponent}</Link>;
    } else {
      linkWrapper = <div className="h-full flex cursor-not-allowed" title="Resource details not yet available">{CardContentComponent}</div>;
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ y: -4, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' }}
      transition={{ duration: 0.2 }}
      className={`h-full ${resource.is_premium ? 'opacity-80 hover:opacity-100' : ''}`}
    >
      {linkWrapper}
    </motion.div>
  );
}
