/**
 * Client-side image compression utility for web applications
 * Reduces image file size while maintaining reasonable quality for web use
 */

export interface CompressionOptions {
  /** Maximum width in pixels (default: 1920) */
  maxWidth?: number
  /** Maximum height in pixels (default: 1080) */
  maxHeight?: number
  /** JPEG quality from 0.1 to 1.0 (default: 0.8) */
  quality?: number
  /** Output format (default: 'image/jpeg') */
  outputFormat?: 'image/jpeg' | 'image/png' | 'image/webp'
  /** Maximum file size in bytes (default: 2MB) */
  maxSizeBytes?: number
  /** Whether to maintain aspect ratio (default: true) */
  maintainAspectRatio?: boolean
}

export interface CompressionResult {
  /** Compressed file */
  file: File
  /** Original file size in bytes */
  originalSize: number
  /** Compressed file size in bytes */
  compressedSize: number
  /** Compression ratio (compressed / original) */
  compressionRatio: number
  /** Whether compression was applied */
  wasCompressed: boolean
}

const DEFAULT_OPTIONS: Required<CompressionOptions> = {
  maxWidth: 1920,
  maxHeight: 1080,
  quality: 0.8,
  outputFormat: 'image/jpeg',
  maxSizeBytes: 2 * 1024 * 1024, // 2MB
  maintainAspectRatio: true
}

/**
 * Compresses an image file for web use
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  
  // Only process image files
  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image')
  }

  const originalSize = file.size

  // If file is already small enough and within dimensions, return as-is
  if (originalSize <= opts.maxSizeBytes) {
    const dimensions = await getImageDimensions(file)
    if (dimensions.width <= opts.maxWidth && dimensions.height <= opts.maxHeight) {
      return {
        file,
        originalSize,
        compressedSize: originalSize,
        compressionRatio: 1.0,
        wasCompressed: false
      }
    }
  }

  try {
    // Create image element for processing
    const img = new Image()
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    if (!ctx) {
      throw new Error('Canvas context not available')
    }

    // Load image
    const imageUrl = URL.createObjectURL(file)
    
    await new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = reject
      img.src = imageUrl
    })

    // Calculate new dimensions
    const { width: newWidth, height: newHeight } = calculateDimensions(
      img.width,
      img.height,
      opts.maxWidth,
      opts.maxHeight,
      opts.maintainAspectRatio
    )

    // Set canvas size
    canvas.width = newWidth
    canvas.height = newHeight

    // Apply image smoothing for better quality
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'

    // Draw resized image
    ctx.drawImage(img, 0, 0, newWidth, newHeight)

    // Clean up
    URL.revokeObjectURL(imageUrl)

    // Convert to blob with compression
    const compressedBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Failed to compress image'))
          }
        },
        opts.outputFormat,
        opts.quality
      )
    })

    // Create compressed file
    const compressedFile = new File(
      [compressedBlob],
      getCompressedFileName(file.name, opts.outputFormat),
      { type: opts.outputFormat }
    )

    const compressedSize = compressedFile.size

    return {
      file: compressedFile,
      originalSize,
      compressedSize,
      compressionRatio: compressedSize / originalSize,
      wasCompressed: true
    }

  } catch (error) {
    throw new Error(`Image compression failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Calculate optimal dimensions while maintaining aspect ratio
 */
function calculateDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number,
  maintainAspectRatio: boolean
): { width: number; height: number } {
  if (!maintainAspectRatio) {
    return {
      width: Math.min(originalWidth, maxWidth),
      height: Math.min(originalHeight, maxHeight)
    }
  }

  const aspectRatio = originalWidth / originalHeight

  let newWidth = originalWidth
  let newHeight = originalHeight

  // Scale down if exceeds max dimensions
  if (newWidth > maxWidth) {
    newWidth = maxWidth
    newHeight = maxWidth / aspectRatio
  }

  if (newHeight > maxHeight) {
    newHeight = maxHeight
    newWidth = maxHeight * aspectRatio
  }

  return {
    width: Math.round(newWidth),
    height: Math.round(newHeight)
  }
}

/**
 * Get image dimensions without loading the full image
 */
async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: img.width, height: img.height })
    }
    
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image dimensions'))
    }
    
    img.src = url
  })
}

/**
 * Generate filename for compressed image
 */
function getCompressedFileName(originalName: string, outputFormat: string): string {
  const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '')
  const extension = outputFormat.split('/')[1] || 'jpg'
  return `${nameWithoutExt}_compressed.${extension}`
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

/**
 * Preset compression configurations for common use cases
 */
export const COMPRESSION_PRESETS = {
  /** High quality for portfolios/galleries (larger file size) */
  portfolio: {
    maxWidth: 2048,
    maxHeight: 2048,
    quality: 0.9,
    outputFormat: 'image/jpeg' as const,
    maxSizeBytes: 5 * 1024 * 1024 // 5MB
  },
  
  /** Balanced quality for general web use (recommended default) */
  web: {
    maxWidth: 1920,
    maxHeight: 1080,
    quality: 0.8,
    outputFormat: 'image/jpeg' as const,
    maxSizeBytes: 2 * 1024 * 1024 // 2MB
  },
  
  /** Small size for avatars/thumbnails */
  avatar: {
    maxWidth: 512,
    maxHeight: 512,
    quality: 0.8,
    outputFormat: 'image/jpeg' as const,
    maxSizeBytes: 500 * 1024 // 500KB
  },
  
  /** Minimal size for icons/small images */
  thumbnail: {
    maxWidth: 256,
    maxHeight: 256,
    quality: 0.7,
    outputFormat: 'image/jpeg' as const,
    maxSizeBytes: 100 * 1024 // 100KB
  }
}