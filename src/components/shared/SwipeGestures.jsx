import { useState, useRef, useEffect } from 'react';

export const useSwipeGestures = ({ 
  onSwipeLeft, 
  onSwipeRight, 
  onSwipeUp, 
  onSwipeDown,
  threshold = 50,
  preventScroll = false 
}) => {
  const [touchStart, setTouchStart] = useState({ x: 0, y: 0 });
  const [touchEnd, setTouchEnd] = useState({ x: 0, y: 0 });
  const elementRef = useRef(null);

  const minSwipeDistance = threshold;

  const onTouchStart = (e) => {
    setTouchEnd({ x: 0, y: 0 }); // Reset touch end
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    });
  };

  const onTouchMove = (e) => {
    if (preventScroll) {
      e.preventDefault();
    }
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    });
  };

  const onTouchEndHandler = () => {
    if (!touchStart.x || !touchEnd.x) return;
    
    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = touchStart.y - touchEnd.y;
    const absDistanceX = Math.abs(distanceX);
    const absDistanceY = Math.abs(distanceY);
    
    // Determine if swipe is primarily horizontal or vertical
    const isHorizontalSwipe = absDistanceX > absDistanceY;
    
    if (isHorizontalSwipe && absDistanceX > minSwipeDistance) {
      if (distanceX > 0) {
        onSwipeLeft && onSwipeLeft();
      } else {
        onSwipeRight && onSwipeRight();
      }
    } else if (!isHorizontalSwipe && absDistanceY > minSwipeDistance) {
      if (distanceY > 0) {
        onSwipeUp && onSwipeUp();
      } else {
        onSwipeDown && onSwipeDown();
      }
    }
  };

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    element.addEventListener('touchstart', onTouchStart, { passive: !preventScroll });
    element.addEventListener('touchmove', onTouchMove, { passive: !preventScroll });
    element.addEventListener('touchend', onTouchEndHandler, { passive: true });

    return () => {
      element.removeEventListener('touchstart', onTouchStart);
      element.removeEventListener('touchmove', onTouchMove);
      element.removeEventListener('touchend', onTouchEndHandler);
    };
  }, [touchStart, touchEnd, preventScroll]);

  return elementRef;
};

// Hook for card swipe actions (like activity cards)
export const useCardSwipe = ({ onAccept, onReject, onBookmark }) => {
  const swipeRef = useSwipeGestures({
    onSwipeLeft: onReject,
    onSwipeRight: onAccept,
    onSwipeUp: onBookmark,
    threshold: 100
  });

  return swipeRef;
};

// Component wrapper for swipe functionality
export const SwipeableContainer = ({ 
  children, 
  onSwipeLeft, 
  onSwipeRight, 
  onSwipeUp, 
  onSwipeDown,
  className = "",
  threshold = 50 
}) => {
  const swipeRef = useSwipeGestures({ 
    onSwipeLeft, 
    onSwipeRight, 
    onSwipeUp, 
    onSwipeDown,
    threshold 
  });

  return (
    <div ref={swipeRef} className={`touch-manipulation ${className}`}>
      {children}
    </div>
  );
};