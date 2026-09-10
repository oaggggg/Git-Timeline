import React, { useState, useEffect } from 'react';
import { getAvatarUrls, getAvatarColor, getInitials } from '../../utils/avatar';

interface AuthorAvatarProps {
  name: string;
  email?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZE_MAP: Record<string, string> = {
  xs: 'w-4 h-4 text-[9px]',
  sm: 'w-6 h-6 text-[10px]',
  md: 'w-7 h-7 text-[11px]',
  lg: 'w-8 h-8 text-xs',
  xl: 'w-10 h-10 text-sm'
};

export const AuthorAvatar: React.FC<AuthorAvatarProps> = ({
  name,
  email,
  size = 'sm',
  className = ''
}) => {
  const [urls, setUrls] = useState<string[]>([]);
  const [urlIndex, setUrlIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const list = getAvatarUrls(name, email);
    setUrls(list);
    setUrlIndex(0);
    setLoaded(false);
    setError(false);
  }, [name, email]);

  const currentUrl = urls[urlIndex];
  const sizeClasses = SIZE_MAP[size] || SIZE_MAP.sm;
  const avatarBg = getAvatarColor(name);
  const initials = getInitials(name);

  const handleImageError = () => {
    if (urlIndex + 1 < urls.length) {
      setUrlIndex(prev => prev + 1);
      setLoaded(false);
    } else {
      setError(true);
    }
  };

  return (
    <div
      className={`relative rounded-full shrink-0 select-none overflow-hidden flex items-center justify-center font-bold text-white shadow-2xs ${sizeClasses} ${className}`}
      style={{ backgroundColor: avatarBg }}
      title={email ? `${name} <${email}>` : name}
    >
      <span className="uppercase tracking-tighter">{initials}</span>

      {currentUrl && !error && (
        <img
          src={currentUrl}
          alt={name}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={handleImageError}
          className={`absolute inset-0 w-full h-full object-cover rounded-full transition-opacity duration-200 ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
    </div>
  );
};
