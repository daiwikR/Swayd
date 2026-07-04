// Vercel serverless entry — wraps the whole Express API in one function.
// vercel.json rewrites /api/* and /health here; Express sees the original path.
import app from '../blr-swipe-backend/src/app';

export default app;
