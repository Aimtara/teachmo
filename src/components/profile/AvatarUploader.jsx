import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Loader2 } from 'lucide-react';
import { uploadFile } from '@/api/integrations';

export default function AvatarUploader({ user, onUpdate }) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { file_url } = await uploadFile({ file });
      onUpdate(file_url);
    } catch (error) {
      console.error("Error uploading avatar:", error);
      alert("Failed to upload new avatar. Please try again.");
    }
    setIsUploading(false);
  };

  const handleAvatarClick = () => {
    fileInputRef.current.click();
  };

  return (
    <div className="relative w-24 h-24 mx-auto">
      <div 
        className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-md cursor-pointer group"
        onClick={handleAvatarClick}
      >
        {user?.avatar_url ? (
          <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{backgroundColor: 'var(--teachmo-coral)'}}>
            <span className="text-white font-bold text-4xl">{user?.full_name ? user.full_name[0] : 'U'}</span>
          </div>
        )}

        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
          {isUploading ? (
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          ) : (
            <Camera className="w-6 h-6 text-white" />
          )}
        </div>
      </div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/png, image/jpeg, image/gif"
        className="hidden"
        disabled={isUploading}
      />
    </div>
  );
}