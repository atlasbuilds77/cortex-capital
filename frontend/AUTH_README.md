# Authentication System

Premium dark-themed authentication for Cortex Capital.

## Files Created

### Core Auth
- `lib/auth.tsx` - Auth context provider with login/signup/logout
- `components/auth/protected-route.tsx` - Route protection wrapper
- `middleware.ts` - Route protection middleware

### Pages
- `app/login/page.tsx` - Email/password login + social buttons
- `app/signup/page.tsx` - Registration with terms acceptance
- `app/forgot-password/page.tsx` - Password reset flow

### Updated
- `app/layout.tsx` - Added AuthProvider wrapper
- `app/dashboard/page.tsx` - Wrapped with ProtectedRoute

## Usage

### Protecting Routes

Wrap any page component:
```tsx
import { ProtectedRoute } from '@/components/auth/protected-route'

export default function SecurePage() {
  return (
    <ProtectedRoute>
      <YourContent />
    </ProtectedRoute>
  )
}
```

Or use middleware (already configured for `/dashboard`, `/onboarding`, `/settings`, `/fishtank`).

### Using Auth Context

```tsx
import { useAuth } from '@/lib/auth'

function Component() {
  const { user, isAuthenticated, login, logout } = useAuth()
  
  // Check auth state
  if (!isAuthenticated) return <Login />
  
  // Access user
  console.log(user.email)
  
  // Logout
  const handleLogout = () => {
    logout()
    router.push('/login')
  }
}
```

## Features

✅ Email/password authentication  
✅ Social login UI (Google, Apple) - integration needed  
✅ Remember me checkbox  
✅ Password reset flow  
✅ Terms acceptance required  
✅ Protected routes via middleware  
✅ Auth state management  
✅ Token storage (localStorage)  
✅ Loading states  
✅ Error handling  
✅ Premium dark theme styling  
✅ Mobile-responsive forms  

## API Endpoints Needed

The frontend expects these backend routes:

```
POST /api/auth/login
  Body: { email, password, remember }
  Response: { token, user: { id, email, name } }

POST /api/auth/signup
  Body: { email, password, name }
  Response: { token, user: { id, email, name } }

POST /api/auth/forgot-password
  Body: { email }
  Response: { success: true }

GET /api/auth/me
  Headers: { Authorization: "Bearer <token>" }
  Response: { id, email, name }
```

## Middleware Protection

Automatically protects:
- `/dashboard`
- `/onboarding`
- `/settings`
- `/fishtank`

Redirects to `/login` with `?redirect=<original-path>` param.

Auto-redirects authenticated users away from `/login` and `/signup` to `/dashboard`.

## Styling

Matches existing Cortex Capital theme:
- Dark background (#0a0a1a)
- Surface cards (#12122a)
- Primary gradient (cyan to purple)
- Premium glassmorphic inputs
- Smooth transitions
- Mobile-first responsive

## Security Notes

⚠️ Token stored in localStorage (consider httpOnly cookies for production)  
⚠️ Social login is UI-only (needs OAuth integration)  
⚠️ Password validation: min 8 chars (add more rules as needed)  
⚠️ No rate limiting on frontend (add backend protection)

## Next Steps

1. Implement backend API endpoints
2. Add OAuth providers (Google, Apple)
3. Add email verification flow
4. Consider httpOnly cookie storage
5. Add 2FA support
6. Add password strength indicator
7. Add session timeout handling
