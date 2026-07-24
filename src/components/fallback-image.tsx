import React, { useState, useEffect, useRef } from "react";
import { ImageIcon } from "lucide-react";

interface FallbackImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  alt: string;
  fallbackText?: string;
  className?: string;
}

export function FallbackImage({
  src,
  alt,
  fallbackText,
  className = "",
  ...props
}: FallbackImageProps) {
  const [isError, setIsError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!src) {
      setIsError(true);
      setIsLoaded(false);
      return;
    }

    setIsError(false);
    setIsLoaded(false);

    if (imgRef.current?.complete) {
      if (imgRef.current.naturalWidth === 0) {
        setIsError(true);
      } else {
        setIsLoaded(true);
      }
    }
  }, [src]);

  const getInitials = (text?: string) => {
    if (!text) return "";
    return text
      .split(" ")
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase();
  };

  const initials = getInitials(fallbackText || alt);

  if (isError || !src) {
    return (
      <div
        className={`flex items-center justify-center bg-muted/30 border border-border/50 text-muted-foreground select-none ${className}`}
      >
        {initials ? (
          <span className="font-display font-semibold text-lg tracking-tight">{initials}</span>
        ) : (
          <ImageIcon className="h-5 w-5 opacity-40" />
        )}
      </div>
    );
  }

  return (
    <img
      ref={imgRef}
      src={src}
      alt={alt}
      onLoad={() => setIsLoaded(true)}
      onError={() => setIsError(true)}
      className={`transition-opacity duration-300 ${isLoaded ? "opacity-100" : "opacity-0"} ${className}`}
      {...props}
    />
  );
}
