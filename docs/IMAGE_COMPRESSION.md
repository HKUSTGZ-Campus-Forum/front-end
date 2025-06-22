# Image Compression System

This document describes the client-side image compression system implemented for the Campus Forum application.

## Overview

The image compression system automatically reduces image file sizes while maintaining reasonable quality for web applications. It's integrated into the existing file upload system and works seamlessly with all upload components.

## Features

- **Automatic Compression**: Images are compressed by default based on their intended use
- **Smart Presets**: Different compression levels for avatars, post images, and thumbnails
- **Custom Options**: Fine-grained control over compression parameters
- **Fallback Support**: Gracefully handles compression failures by uploading original files
- **Real-time Feedback**: Shows compression results and file size reduction
- **Format Optimization**: Converts images to optimal formats (JPEG, PNG, WebP)

## Usage

### Basic Usage (Automatic)

```vue
<template>
  <FileUpload
    file-type="post_image"
    accept="image/*"
    @upload-success="handleSuccess"
  />
</template>
```

Images are automatically compressed using appropriate presets based on the `file-type`.

### Custom Compression Options

```vue
<template>
  <FileUpload
    file-type="post_image"
    :compression-options="{
      maxWidth: 1280,
      maxHeight: 720,
      quality: 0.9,
      outputFormat: 'image/jpeg',
      maxSizeBytes: 1024 * 1024 // 1MB
    }"
    @upload-success="handleSuccess"
  />
</template>
```

### Disable Compression

```vue
<template>
  <FileUpload
    file-type="post_image"
    :enable-compression="false"
    @upload-success="handleSuccess"
  />
</template>
```

## Compression Presets

### Portfolio (High Quality)
- **Max Dimensions**: 2048x2048px
- **Quality**: 90%
- **Max Size**: 5MB
- **Use Case**: High-quality galleries, portfolios

### Web (Balanced - Default)
- **Max Dimensions**: 1920x1080px
- **Quality**: 80%
- **Max Size**: 2MB
- **Use Case**: General post images, content

### Avatar (Profile Pictures)
- **Max Dimensions**: 512x512px
- **Quality**: 80%
- **Max Size**: 500KB
- **Use Case**: User profile pictures

### Thumbnail (Small Images)
- **Max Dimensions**: 256x256px
- **Quality**: 70%
- **Max Size**: 100KB
- **Use Case**: Small previews, icons

## Programmatic Usage

```typescript
import { compressImage, COMPRESSION_PRESETS } from '~/utils/imageCompression'

// Compress with preset
const result = await compressImage(file, COMPRESSION_PRESETS.web)

// Custom compression
const result = await compressImage(file, {
  maxWidth: 800,
  maxHeight: 600,
  quality: 0.7,
  outputFormat: 'image/jpeg'
})

console.log(`Reduced file size by ${Math.round((1 - result.compressionRatio) * 100)}%`)
```

## Compression Result

The `compressImage` function returns a `CompressionResult` object:

```typescript
interface CompressionResult {
  file: File              // Compressed file
  originalSize: number    // Original file size in bytes
  compressedSize: number  // Compressed file size in bytes
  compressionRatio: number // compressed / original (e.g., 0.3 = 70% reduction)
  wasCompressed: boolean  // Whether compression was applied
}
```

## Integration with Components

### FileUpload Component

The `FileUpload` component automatically shows compression information:

```vue
<!-- Compression info is automatically displayed -->
<div class="compression-info">
  📷 Compressed: 2.5MB → 800KB (68% reduction)
</div>
```

### useFileUpload Composable

Access compression information in your components:

```vue
<script setup>
const { uploadFile, compressionInfo } = useFileUpload()

// compressionInfo.value contains the compression result after upload
</script>
```

## Configuration Options

All compression options are optional and have sensible defaults:

```typescript
interface CompressionOptions {
  maxWidth?: number         // Default: 1920
  maxHeight?: number        // Default: 1080
  quality?: number          // Default: 0.8 (JPEG quality 0.1-1.0)
  outputFormat?: string     // Default: 'image/jpeg'
  maxSizeBytes?: number     // Default: 2MB
  maintainAspectRatio?: boolean // Default: true
}
```

## Browser Support

- **Canvas API**: Required for image processing
- **Blob API**: Required for file creation
- **File API**: Required for file handling
- **Supported Formats**: JPEG, PNG, WebP, GIF

## Performance Considerations

- **Client-Side Processing**: Compression happens in the browser, reducing server load
- **Memory Usage**: Large images temporarily use additional memory during processing
- **Processing Time**: Larger images take longer to compress
- **Fallback**: Original file is uploaded if compression fails

## Error Handling

The system gracefully handles various error scenarios:

1. **Unsupported File Types**: Only image files are compressed
2. **Canvas Unavailable**: Falls back to original file
3. **Compression Failure**: Uploads original file with warning
4. **Memory Limits**: Large images may fail, original is used

## File Size Reduction Examples

Typical compression results with default web preset:

| Original Size | Compressed Size | Reduction |
|---------------|-----------------|-----------|
| 5MB           | 1.2MB          | 76%       |
| 3MB           | 800KB          | 73%       |
| 1.5MB         | 450KB          | 70%       |
| 800KB         | 280KB          | 65%       |

## Best Practices

1. **Use Appropriate Presets**: Choose the right preset for your use case
2. **Test Different Qualities**: Balance file size vs visual quality
3. **Consider Format**: JPEG for photos, PNG for graphics with transparency
4. **Monitor Performance**: Watch for memory usage on large images
5. **Provide Feedback**: Show users compression results

## Testing

Use the test page at `/test-compression` to verify compression functionality with different presets and options.

## Future Enhancements

- **WebP Format Support**: Better compression for modern browsers
- **Progressive JPEG**: Faster loading for large images
- **Background Processing**: Web Workers for non-blocking compression
- **Batch Compression**: Process multiple images simultaneously
- **Smart Quality**: Automatic quality adjustment based on content

---

**Last Updated**: June 2025  
**Version**: 1.0.0