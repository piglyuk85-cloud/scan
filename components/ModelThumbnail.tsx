'use client'

import React from 'react'
import dynamic from 'next/dynamic'

interface ModelThumbnailProps {
  modelPath: string
  className?: string
}

const ModelThumbnailClient = dynamic(() => import('./ModelThumbnail.client'), {
  ssr: false,
  loading: () => (
    <div className="relative w-full h-full bg-gray-100 flex items-center justify-center">
      <div className="text-gray-400 text-xs">3D</div>
    </div>
  ),
})

export default function ModelThumbnail(props: ModelThumbnailProps) {
  return <ModelThumbnailClient {...props} />
}

