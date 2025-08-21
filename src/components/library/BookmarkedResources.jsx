
import React from "react";
import { motion } from "framer-motion";
import { BookmarkCheck } from "lucide-react";
import ResourceCard from "./ResourceCard";

export default function BookmarkedResources({ bookmarks, resources, onBookmark }) {
  const bookmarkedResources = bookmarks.map(bookmark => {
    const resource = resources.find(r => r.id === bookmark.resource_id);
    return resource ? { ...resource, bookmark } : null;
  }).filter(Boolean);

  return (
    <div>
      {bookmarkedResources.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bookmarkedResources.map((resource) => (
            <ResourceCard
              key={resource.id}
              resource={resource}
              isBookmarked={true}
              onBookmark={(isBookmarked) => onBookmark(resource.id, isBookmarked)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <BookmarkCheck className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No bookmarked resources yet</h3>
          <p className="text-gray-600">
            Bookmark resources you want to save for later by clicking the bookmark icon.
          </p>
        </div>
      )}
    </div>
  );
}
