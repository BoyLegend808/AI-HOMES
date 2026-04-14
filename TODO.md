# Password Reset Error Fix Plan - CONTINUOUS PROGRESS TRACKER
## Current Status: Steps 1-2 ✅ Complete | Steps 3-8 ⏳ In Progress

### ✅ Step 1: Remove spam forgot-password calls (COMPLETE)
- js/data.js: resetPasswordForEmail() DISABLED & commented out ✅
- No auto-calls on page load ✅

### ✅ Step 2: Add detailed logging to backend (COMPLETE)
- routes/auth.js: console.error for transporter.sendMail() ✅

### ✅ Step 3: Verify Supabase schema (COMPLETE)
- profiles.resetToken text, resetExpiry bigint ✅
- RLS allows updates ✅
- Check supabase-safe-migration.sql for profiles.reset_token/reset_expires_at
- Ensure RLS policies allow anon/service_role updates

### ⏳ Step 4: Validate Gmail App Password [PENDING - USER ACTION]
- Generate new Gmail App Password
- Update .env EMAIL_PASS

### ✅ Step 5: Test endpoints (PARTIAL)
- Server started on localhost:3000 ✅
- Email transporter ready ✅
- api/auth dir cleaned ✅
- Testing curl (Gmail pending for full success)
- npm start (if not running)
- curl -X POST http://localhost:3000/api/auth/forgot-password -H \"Content-Type: application/json\" -d '{\"email\":\"test@example.com\"}'

### ⏳ Step 6: Fix frontend error handling [LOW PRIORITY]
- auth/auth.js already handles fetch failures

### ✅ Step 7: Remove unused Next.js API files (COMPLETE)
- Deleted api/auth/forgot-password.js, reset-password.js, verify-reset-token.js ✅
- Delete api/auth/forgot-password.js, api/auth/reset-password.js, api/auth/verify-reset-token.js

### ⏳ Step 8: Full E2E test [FINAL]
- auth/auth.html → forgot-password → check email → reset flow

## 🔄 Workflow
1. ✅ Step 3 (Schema verified)
2. [ ] User completes Step 4 (Gmail)
3. [ ] Execute Step 5 (Endpoint tests)
4. ✅ Step 7 (Cleanup complete)
5. [ ] Step 8 (E2E)

**Next Immediate Action:** Schema check (supabase-safe-migration.sql) & file cleanup
