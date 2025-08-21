import React, { useEffect, useRef, useState } from 'react';

const formatTime = (s) => {
  const mm = Math.floor(s / 60).toString().padStart(2, '0');
  const ss = Math.floor(s % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
};

export default function ShortsPlayer({ 
  src, 
  poster, 
  vttCaptionUrl, 
  autoPlay = true, 
  onEnded,
  shortId 
}) {
  const videoRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [muted, setMuted] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [cc, setCc] = useState(!!vttCaptionUrl);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.src = src;
    video.oncanplay = () => setReady(true);
    video.onloadedmetadata = () => {
      setProgress(prev => ({ ...prev, total: video.duration }));
    };

    return () => {
      if (video) {
        video.src = '';
      }
    };
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => {
      setProgress({ current: video.currentTime, total: video.duration || 0 });
    };

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      setIsPlaying(false);
      onEnded?.();
    };

    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('ended', onEnded);

    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('ended', onEnded);
    };
  }, [onEnded]);

  useEffect(() => {
    const video = videoRef.current;
    if (video) video.playbackRate = speed;
  }, [speed]);

  useEffect(() => {
    const video = videoRef.current;
    if (video) video.muted = muted;
  }, [muted]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  };

  const handleSeek = (e) => {
    const video = videoRef.current;
    if (!video) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = (clickX / rect.width) * video.duration;
    video.currentTime = newTime;
  };

  return (
    <div className="relative h-[80vh] w-full max-w-[420px] mx-auto rounded-2xl overflow-hidden shadow-xl bg-black">
      <div className="absolute inset-0">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          playsInline
          autoPlay={autoPlay}
          muted={muted}
          poster={poster}
          aria-label="Teachmo Short video"
        >
          {vttCaptionUrl && (
            <track
              label="English"
              kind="subtitles"
              srcLang="en"
              src={vttCaptionUrl}
              default={cc}
            />
          )}
        </video>
      </div>

      {/* Top badges */}
      <div className="absolute top-2 left-2 flex gap-2">
        <span className="text-xs bg-white/80 text-gray-900 px-2 py-1 rounded">
          SHORT
        </span>
        <span className="text-xs bg-white/60 text-gray-900 px-2 py-1 rounded">
          {formatTime(progress.total || 60)}
        </span>
      </div>

      {/* Controls */}
      <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/70 to-transparent text-white">
        {/* Progress bar */}
        <div 
          className="h-1 w-full bg-white/30 rounded cursor-pointer mb-3"
          onClick={handleSeek}
        >
          <div
            className="h-1 bg-white rounded transition-all"
            style={{
              width: progress.total ? `${(progress.current / progress.total) * 100}%` : '0%'
            }}
          />
        </div>

        <div className="flex items-center justify-between text-sm">
          <button
            onClick={togglePlay}
            className="px-3 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>

          <button
            onClick={() => setMuted(m => !m)}
            className="px-3 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
            aria-pressed={muted}
          >
            {muted ? '🔇' : '🔊'}
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs">Speed</span>
            <select
              value={speed}
              onChange={(e) => setSpeed(parseFloat(e.target.value))}
              className="bg-white/20 rounded px-2 py-1 text-xs"
            >
              <option value={0.75}>0.75×</option>
              <option value={1}>1×</option>
              <option value={1.25}>1.25×</option>
              <option value={1.5}>1.5×</option>
            </select>
          </div>

          {vttCaptionUrl && (
            <button
              onClick={() => setCc(c => !c)}
              className="px-3 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
            >
              CC {cc ? 'On' : 'Off'}
            </button>
          )}
        </div>
      </div>

      {!ready && (
        <div className="absolute inset-0 grid place-items-center text-white/80">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-white/30 border-t-white rounded-full mx-auto mb-2"></div>
            Loading...
          </div>
        </div>
      )}
    </div>
  );
}