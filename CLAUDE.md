# Frontend Development Notes

## Project Overview
**UniKorn Campus Forum** - A modern campus forum application built with Nuxt 3/Vue.js frontend and Flask backend.

### Tech Stack
- **Frontend**: Nuxt 3, Vue.js 3, TypeScript, SCSS
- **Backend**: Flask, PostgreSQL, SQLAlchemy ORM
- **Storage**: Alibaba Cloud OSS (Object Storage Service)
- **Authentication**: JWT tokens with refresh mechanism
- **State Management**: Pinia

## Authentication & API Calls

### Always Use fetchWithAuth for API Calls
**Important**: All API calls to backend endpoints should use `fetchWithAuth` instead of direct `fetch()` to handle JWT token refresh automatically.

```typescript
// ✅ Correct - Use fetchWithAuth
import { useApi } from '~/composables/useApi'
const { fetchWithAuth } = useApi()

const response = await fetchWithAuth('/api/posts/123')

// ❌ Incorrect - Direct fetch (will cause 401 errors)
const response = await fetch('https://dev.unikorn.axfff.com/api/posts/123')
```

### Exception Cases (Direct fetch is acceptable)
1. **Authentication endpoints** (`useAuth.ts`) - to avoid circular dependencies
2. **Public endpoints** that don't require authentication
3. **External services** (like OSS direct uploads via signed URLs)

### File Upload Pattern
Files uploaded to OSS use XMLHttpRequest with signed URLs (correct):
```typescript
// ✅ Direct upload to OSS using signed URL
xhr.open('PUT', signed_url)
xhr.send(file)

// ✅ But get the signed URL via fetchWithAuth
const response = await fetchWithAuth('/api/files/upload', { ... })
```

### Common Token Issues
- **401 Unauthorized**: Usually means direct fetch is being used instead of fetchWithAuth
- **Token expired**: fetchWithAuth automatically handles refresh, direct fetch doesn't

## File Upload & Image Display System

### Architecture Overview
1. **Frontend**: Requests signed URL from backend
2. **Backend**: Generates OSS signed URL with STS tokens
3. **Frontend**: Uploads directly to OSS using signed URL
4. **Backend**: Receives callback from OSS when upload completes
5. **Frontend**: Polls backend for file status
6. **Display**: Uses signed URLs for viewing images

### Key Files & Functions

#### Backend (Flask)
- `app/services/file_service.py`: OSS integration, signed URL generation
- `app/models/file.py`: File model with URL property for signed viewing URLs
- `app/models/post.py`: Post model with files relationship

#### Frontend (Nuxt/Vue)
- `composables/useFileUpload.ts`: File upload logic
- `components/FileUpload.vue`: Reusable upload component
- `pages/forum/posts/[id].vue`: Post detail with image gallery

### File Upload Flow
```typescript
// 1. Get signed URL
const response = await fetchWithAuth('/api/files/upload', {
  method: 'POST',
  body: JSON.stringify({
    filename: file.name,
    file_type: 'post_image',
    entity_type: 'post',
    entity_id: postId,
    content_type: file.type
  })
})

// 2. Upload to OSS
xhr.open('PUT', signed_url)
xhr.setRequestHeader('Content-Type', file.type)
xhr.send(file)

// 3. Poll for completion
const fileRecord = await pollFileStatus(file_id)
```

## Critical Bug Fixes Applied

### 1. Vue Lifecycle Issue in PostMessage Component
**Problem**: Creating `useApi()` instance inside function caused auth state reset
**Solution**: Move to component setup phase
```typescript
// ❌ Wrong - inside function
const handleSubmit = async () => {
  const { fetchWithAuth } = useApi(); // Creates new instance!
}

// ✅ Correct - in setup
const { fetchWithAuth } = useApi(); // Once in setup
const handleSubmit = async () => {
  // Use existing instance
}
```

### 2. OSS Authentication Issues
**Problem**: Missing imports and wrong auth type
**Solution**: 
- Added `import base64` 
- Changed from `Auth` to `StsAuth` for STS tokens
- Fixed callback parameter encoding

### 3. Image Display Issues
**Problem**: Images not showing in post detail
**Solution**:
- Added file relationships to posts
- Implemented signed URLs for private bucket access
- Fixed Vue template null checking with `.filter()`

### 4. Image Sizing & Cropping
**Problem**: Images cropped with fixed height
**Solution**: Changed to responsive sizing with `object-fit: contain`
```css
.post-image {
  height: auto;
  max-height: 400px;
  object-fit: contain; // Shows full image
  
  @media (max-width: 768px) {
    max-height: 300px;
  }
}
```

## Component Structure

### Authentication Components
- `composables/useAuth.ts`: Core authentication logic
- `composables/useApi.ts`: API calls with auto token refresh
- `pages/login/index.vue`: Login page
- `components/setting/Login.vue`: Login form component

### Forum Components
- `pages/forum/index.vue`: Forum post listing
- `pages/forum/posts/[id].vue`: Post detail view
- `components/forum/Post.vue`: Post card component
- `components/forum/PostMessage.vue`: Create/edit post form
- `components/forum/Comment.vue`: Individual comment
- `components/forum/CommentList.vue`: Comment thread
- `components/forum/CommentForm.vue`: Comment creation form

### File Upload Components
- `components/FileUpload.vue`: Reusable file upload component
- `composables/useFileUpload.ts`: Upload logic and state management

## Important Code Patterns

### Proper Error Handling
```typescript
try {
  const response = await fetchWithAuth(url, options);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Request failed: ${response.status}`);
  }
  return await response.json();
} catch (error) {
  console.error('Operation failed:', error);
  throw error;
}
```

### Image File Detection
```typescript
const isImageFile = (file) => {
  if (!file) return false;
  
  // Check by MIME type first (more reliable)
  if (file.mime_type && file.mime_type.startsWith('image/')) {
    return true;
  }
  
  // Fallback to filename extension
  if (file.original_filename) {
    return /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i.test(file.original_filename);
  }
  
  return false;
}
```

### Responsive Image Gallery
```vue
<div v-if="postData?.files?.length > 0" class="post-images">
  <div class="image-gallery">
    <div 
      v-for="file in postData.files.filter(f => f && isImageFile(f))" 
      :key="file.id"
      class="image-item"
    >
      <img 
        :src="file.url" 
        :alt="file.original_filename || 'Image'"
        class="post-image"
        @click="openImageModal(file)"
      />
    </div>
  </div>
</div>
```

## Environment & Configuration

### Development URLs
- **Frontend**: Local development server
- **Backend API**: https://dev.unikorn.axfff.com/api
- **OSS Storage**: Alibaba Cloud OSS with STS authentication

### Key Dependencies
- **Nuxt 3**: Framework
- **@nuxt/ui**: UI components
- **Pinia**: State management
- **vue-i18n**: Internationalization

## Commands
- **Dev**: `npm run dev`
- **Build**: `npm run build`
- **Type Check**: `npm run typecheck` (if available)
- **Lint**: `npm run lint` (if available)

## Debugging Tips

### Common Issues
1. **401 Errors**: Check if using `fetchWithAuth` vs direct `fetch`
2. **Images Not Loading**: Check OSS signed URL generation and CORS
3. **Vue Warnings**: Usually related to accessing undefined properties, use optional chaining
4. **File Upload Fails**: Check STS token configuration and OSS permissions

### Useful Console Commands
```javascript
// Check auth state
localStorage.getItem('auth_token')
localStorage.getItem('refresh_token')

// Clear auth state
localStorage.removeItem('auth_token')
localStorage.removeItem('refresh_token')
localStorage.removeItem('user_info')
```

### API Testing
```bash
# Test file upload endpoint
curl -X POST https://dev.unikorn.axfff.com/api/files/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"filename": "test.jpg", "file_type": "post_image"}'
```

## Security Considerations
- All file uploads go through signed URLs
- JWT tokens auto-refresh before expiration
- No secrets or keys committed to repository
- Private OSS bucket with controlled access

## Performance Optimizations
- Images lazy load with proper sizing
- Token refresh happens proactively before expiration
- File upload with progress tracking
- Responsive image gallery with CSS Grid

---

*Last Updated: Current session*
*Key Contributors: Claude Code AI Assistant*