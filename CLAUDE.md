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

## Critical Navigation System Architecture

### **Navigation Component Structure** ⚠️ **IMPORTANT**
The navigation system uses an **auto-import naming convention** that must be respected:

```
/components/home/
├── HomeContainer.vue          # Main layout wrapper
├── Pinned.vue                 # Top navigation bar
└── Sidebar.vue                # Left sidebar navigation
```

**CRITICAL**: In templates, these are referenced as:
- `Pinned.vue` → `<HomePinned>` component
- `Sidebar.vue` → `<HomeSidebar>` component

**❌ NEVER change component references to match file names** - this breaks the navigation system:
```vue
<!-- ❌ WRONG - breaks navigation -->
<Pinned :sidebarFolded="fold.updates" />
<Sidebar :folded="fold.updates" />

<!-- ✅ CORRECT - works with auto-import -->
<HomePinned :sidebarFolded="fold.updates" />
<HomeSidebar :folded="fold.updates" />
```

### **Avatar System Integration Story**

#### **The Challenge**: Top Navigation Avatar Fix
The user reported that while posts and comments correctly showed real user avatars, the top navigation bar was still showing a hardcoded default avatar instead of the user's actual profile picture.

#### **Critical Mistakes and Learning**
1. **First Attempt** - Direct replacement of hardcoded props with real user data:
   - ❌ **Result**: Navigation bars completely disappeared
   - 🎓 **Lesson**: Component props serve as essential fallbacks

2. **Second Attempt** - "Fixed" component naming from `<HomePinned>` to `<Pinned>`:
   - ❌ **Result**: Navigation bars disappeared again
   - 🎓 **Lesson**: Nuxt auto-import naming convention must be respected

3. **Third Attempt** - Removed hardcoded props entirely:
   - ❌ **Result**: Broke backward compatibility
   - 🎓 **Lesson**: Existing architecture dependencies must be preserved

#### **Successful Solution**: Priority-Based Avatar System
```vue
<!-- 3-tier priority system in Pinned.vue -->
<!-- Priority 1: Real authenticated user avatar -->
<div v-if="isLoggedIn && user?.profile_picture_url" class="user-avatar">
  <img :src="user.profile_picture_url" :alt="user.username" />
</div>
<!-- Priority 2: Fallback to component props -->
<div v-else-if="props.userAvatar" class="user-avatar">
  <img :src="props.userAvatar" :alt="props.username" />
</div>
<!-- Priority 3: Default fallback icon -->
<span v-else class="user-icon-fallback">👤</span>
```

**✅ Key Success Factors**:
- **Preserved original component naming** (`HomePinned`/`HomeSidebar`)
- **Maintained prop compatibility** for existing usage
- **Implemented graceful degradation** with 3-tier priority system
- **Added real user data access** via `useAuth` composable

## Icon System Solutions

### **Font Awesome Loading Issues**
When Font Awesome icons don't load or show up, use Unicode fallbacks:

```vue
<!-- ❌ Problematic Font Awesome -->
<i class="fas fa-edit"></i>

<!-- ✅ Unicode fallback solution -->
<span class="icon-fallback">✏️</span>
```

**Available Unicode Icons**:
- ✏️ Edit/Pencil
- ✓ Save/Check
- ✕ Cancel/Close  
- 📷 Camera
- ⟳ Loading spinner (with CSS animation)
- 👤 User/Person

**CSS for fallbacks**:
```scss
.icon-fallback {
  font-size: 1rem;
  display: inline-block;
  
  &.spinning {
    animation: spin 1s linear infinite;
  }
}
```

## Avatar URL Expiration Fix (December 2024)

### **Problem**: Signed URL Expiration
Avatar images would fail to load after approximately 1 hour because the Alibaba Cloud OSS signed URLs expire, causing broken avatar displays across the application.

### **Solution**: Smart Avatar Refresh System
Implemented a comprehensive avatar URL refresh mechanism with the following features:

#### **1. Enhanced UserAvatar Component**
- **Smart Error Detection**: Recognizes OSS signed URL patterns and expiration timestamps
- **Automatic URL Refresh**: Fetches fresh URLs from backend when expiration is detected
- **Retry Logic**: Implements exponential backoff for transient failures
- **Visual Feedback**: Shows refresh indicator during retry attempts
- **Proactive Refresh**: Checks for near-expiring URLs every 45 minutes

**Key Props**:
```vue
<UserAvatar 
  :avatar-url="user.profile_picture_url"
  :user-id="user.id"
  :username="user.username"
  :enable-auto-refresh="true"  // Enable smart refresh (default: true)
  @avatar-refreshed="handleAvatarUpdate"
/>
```

#### **2. Updated useUser Composable**
- **Cache Expiration**: Automatically invalidates cached user data after 1 hour
- **OSS URL Validation**: Detects expired OSS URLs and triggers refresh
- **Smart Fallbacks**: Uses cached data as fallback when refresh fails
- **New Methods**: `refreshUserById()`, `getFreshAvatarUrl()`, `clearExpiredCache()`

#### **3. Refresh Logic Flow**
```
1. Image load fails → Check if OSS signed URL
2. Parse URL expiration timestamp
3. If expired/near expiry → Fetch fresh user data from backend
4. Update avatar URL and clear cache
5. If still fails → Show initials placeholder
```

#### **4. Performance Optimizations**
- **Proactive Refresh**: Refreshes URLs 5-10 minutes before expiration
- **Rate Limiting**: Maximum 3 retries per avatar, 2 refresh attempts
- **Cache Management**: Automatic cleanup of expired cache entries
- **Exponential Backoff**: 1s, 2s, 4s retry intervals

### **Technical Implementation Details**

**OSS URL Detection**:
```typescript
const isOSSSignedUrl = (url: string): boolean => {
  return url.includes('aliyuncs.com') && 
         (url.includes('Expires=') || url.includes('x-oss-expires'));
};
```

**Expiration Parsing**:
```typescript
const getUrlExpiration = (url: string): Date | null => {
  const urlObj = new URL(url);
  const expires = urlObj.searchParams.get('Expires') || urlObj.searchParams.get('x-oss-expires');
  return expires ? new Date(parseInt(expires) * 1000) : null;
};
```

**Smart Cache Management**:
```typescript
// Cache includes timestamp for expiration checking
interface PublicUserData {
  username: string;
  profile_picture_url?: string;
  role_name?: string;
  cached_at?: number; // Added for expiration tracking
}
```

### **User Experience Improvements**
- **Seamless Recovery**: Users don't see broken avatars, just smooth refresh
- **Visual Feedback**: Small spinner indicates refresh in progress
- **Graceful Degradation**: Falls back to colored initials if all else fails
- **No User Action Required**: Everything happens automatically

### **Backward Compatibility**
- All existing UserAvatar usage continues to work unchanged
- Auto-refresh is enabled by default but can be disabled
- Existing props and events remain the same
- No breaking changes to component API

### **Future Enhancements**
- **Background Refresh**: Refresh URLs in background without affecting display
- **Bulk Refresh**: Refresh multiple avatar URLs simultaneously
- **URL Prefetching**: Pre-generate fresh URLs before current ones expire
- **Analytics**: Track avatar refresh success rates

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
5. **Navigation Disappears**: Check component naming (`HomePinned` not `Pinned`)
6. **Icons Missing**: Use Unicode fallbacks instead of Font Awesome

### Component Development Rules
⚠️ **CRITICAL RULES** for component modifications:

1. **Never change navigation component references** in templates
2. **Always test navigation system** after any layout changes
3. **Implement fallbacks** for user data (auth state can be inconsistent)
4. **Use priority systems** instead of replacing existing functionality
5. **Test both authenticated and guest states**

### Useful Console Commands
```javascript
// Check auth state
localStorage.getItem('auth_token')
localStorage.getItem('refresh_token')
localStorage.getItem('user_info')

// Clear auth state for testing
localStorage.removeItem('auth_token')
localStorage.removeItem('refresh_token')
localStorage.removeItem('user_info')

// Check component mounting
console.log('Navigation components loaded:', !!document.querySelector('.top-nav'))
```

### API Testing
```bash
# Test file upload endpoint
curl -X POST https://dev.unikorn.axfff.com/api/files/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type": "application/json" \
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

## Lessons Learned for Future Development

### **Critical Success Patterns**
1. **Incremental Enhancement**: Add new functionality while preserving existing behavior
2. **Priority-Based Systems**: Layer new features on top of existing systems rather than replacing them
3. **Fallback Strategies**: Always provide graceful degradation when data is unavailable
4. **Component Contract Respect**: Don't change how components are referenced without understanding the import system
5. **State-Aware Development**: Account for different authentication states in UI logic

### **Avoid These Mistakes**
1. **Direct Prop Replacement**: Don't replace working props with computed data without fallbacks
2. **Component Naming Changes**: Don't "fix" component names that seem wrong without testing
3. **Dependency Assumptions**: Don't assume external libraries (Font Awesome) are reliably loaded
4. **Single-State Testing**: Don't only test in one authentication state
5. **Architecture Changes Without Understanding**: Don't modify component relationships without understanding the full system

---

*Last Updated: December 2024*
*Key Contributors: Claude Code AI Assistant*
*Critical Issues Resolved: Navigation system stability, avatar integration, icon fallbacks*