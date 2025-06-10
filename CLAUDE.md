# Frontend Development Notes

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

## Components Updated
- ✅ `CommentList.vue` - Now uses fetchWithAuth for comments
- ✅ `useFileUpload.ts` - Uses fetchWithAuth for getting signed URLs
- ✅ Most components already use fetchWithAuth correctly

## Commands
- **Lint**: `npm run lint` (if available)
- **TypeCheck**: `npm run typecheck` (if available)
- **Dev**: `npm run dev`