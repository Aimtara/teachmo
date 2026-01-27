import React, { useEffect, useState } from 'react';
import ShortsCard from './ShortsCard';
import ShortsPlayer from './ShortsPlayer';
import ShortsFeedbackBar from './ShortsFeedbackBar';
import { shortsRecommendations } from '@/api/functions';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ShortsRail({ childId, topic, title = "Recommended Shorts" }) {
  const [items, setItems] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [activeShort, setActiveShort] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRecommendations();
  }, [childId, topic]);

  const loadRecommendations = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (childId) params.set('childId', childId);
      if (topic) params.set('topic', topic);
      params.set('limit', '12');

      const { data } = await shortsRecommendations({ 
        query: params.toString() 
      });
      
      setItems(data || []);
    } catch (error) {
      console.error('Error loading shorts recommendations:', error);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!openId) {
      setActiveShort(null);
      return;
    }

    const short = items.find(item => item.id === openId);
    setActiveShort(short);
  }, [openId, items]);

  if (isLoading) {
    return (
      <section className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
        <div className="flex overflow-x-auto pb-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="w-28 mr-3">
              <div className="aspect-[9/16] w-28 bg-gray-200 rounded-xl animate-pulse"></div>
              <div className="mt-2 h-8 bg-gray-200 rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="mt-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        <a 
          href="/discover?tab=library&type=short" 
          className="text-xs text-blue-600 hover:text-blue-800"
        >
          See all
        </a>
      </div>
      
      <div className="flex overflow-x-auto pb-2 scrollbar-hide">
        {items.map(item => (
          <ShortsCard
            key={item.id}
            id={item.id}
            topic={item.topic}
            thumbnail_url={item.thumbnail_url}
            duration_s={item.duration_s}
            onOpen={setOpenId}
          />
        ))}
      </div>

      {/* Modal */}
      <Dialog open={!!activeShort} onOpenChange={() => setOpenId(null)}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          {activeShort && (
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 z-10 bg-black/20 hover:bg-black/40 text-white rounded-full"
                onClick={() => setOpenId(null)}
              >
                <X className="w-4 h-4" />
              </Button>
              
              <ShortsPlayer
                shortId={activeShort.id}
                src={activeShort.hls_url || activeShort.mp4_url || '/api/placeholder-video.mp4'}
                poster={activeShort.thumbnail_url}
                vttCaptionUrl={activeShort.captions_vtt_url}
              />
              
              <div className="p-4 bg-white">
                <h4 className="font-semibold text-gray-900 mb-2">{activeShort.topic}</h4>
                <ShortsFeedbackBar shortId={activeShort.id} />
                
                {/* Why recommendations */}
                {activeShort.why && activeShort.why.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-gray-500 mb-1">Why this was recommended:</p>
                    <div className="flex flex-wrap gap-1">
                      {activeShort.why.map((reason, idx) => (
                        <span
                          key={idx}
                          className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded"
                        >
                          {reason.feature.replace('_', ' ')}: {reason.weight}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

export { ShortsRail };
