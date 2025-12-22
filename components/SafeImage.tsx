'use client'

import { useState } from 'react'
import Image from 'next/image'

interface SafeImageProps {
  src?: string
  alt: string
  fill?: boolean
  width?: number
  height?: number
  className?: string
  fallback?: React.ReactNode
}

export default function SafeImage({
  src,
  alt,
  fill,
  width,
  height,
  className,
  fallback,
}: SafeImageProps) {
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)

  if (!src || error) {
    return (
      <>
        {fallback || (
          <div
            className={`flex items-center justify-center bg-gray-200 text-gray-400 ${
              fill ? 'w-full h-full' : ''
            } ${className || ''}`}
            style={!fill && width && height ? { width, height } : undefined}
          >
            <svg
              className="w-16 h-16"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
      </>
    )
  }

  if (fill) {
    return (
      <>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        )}
        <Image
          src={src}
          alt={alt}
          fill
          className={className}
          onError={() => {
            setError(true)
            setLoading(false)
          }}
          onLoad={() => setLoading(false)}
          unoptimized
        />
      </>
    )
  }

  return (
    <>
      {loading && (
        <div
          className="flex items-center justify-center bg-gray-200"
          style={{ width, height }}
        >
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      )}
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={className}
        onError={() => {
          setError(true)
          setLoading(false)
        }}
        onLoad={() => setLoading(false)}
        unoptimized
      />
    </>
  )
}


