import React from 'react';

export default function ShortsCard({ id, topic, thumbnail_url, duration_s, onOpen }) {
  return (
    <button
      onClick={() => onOpen(id)}
      className="flex flex-col w-28 mr-3 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-xl"
    >
      <div className="aspect-[9/16] w-28 bg-gray-200 rounded-xl overflow-hidden shadow-md relative">
        {thumbnail_url ? (
          <img 
            src={thumbnail_url} 
            alt="" 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
            <span className="text-white text-xs font-semibold">SHORT</span>
          </div>
        )}
        
        {duration_s && (
          <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1 rounded">
            {Math.floor(duration_s / 60)}:{(duration_s % 60).toString().padStart(2, '0')}
          </div>
        )}
      </div>
      
      <span className="mt-2 text-xs line-clamp-2 text-left text-gray-700 leading-tight">
        {topic}
      </span>
    </button>
  );
}
