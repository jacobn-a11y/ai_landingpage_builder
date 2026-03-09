/**
 * Environment variable validation.
 * Logs warnings at startup for missing/default values.
 */

export function validateEnv(): void {
  const warnings: string[] = [];

  // Required in production
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.DATABASE_URL) {
      warnings.push('DATABASE_URL is not set');
    }
    if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET === 'dev-secret-change-in-production') {
      // app.ts already handles this with process.exit, but double-check
      warnings.push('SESSION_SECRET must be set to a secure value');
    }
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      warnings.push('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required for OAuth');
    }
    if (!process.env.ENCRYPTION_KEY) {
      warnings.push('ENCRYPTION_KEY is not set — integration config will not be encrypted');
    }
    if (!process.env.WEB_URL) {
      warnings.push('WEB_URL is not set — defaulting to http://localhost:5173');
    }
  }

  // Warn about encryption key length
  if (process.env.ENCRYPTION_KEY && process.env.ENCRYPTION_KEY.length !== 64) {
    warnings.push('ENCRYPTION_KEY should be 64 hex characters (256-bit key)');
  }

  // MHTML import storage paths
  if (!process.env.ASSET_STORAGE_PATH) {
    warnings.push('ASSET_STORAGE_PATH not set — defaulting to ./data/assets');
  }

  for (const w of warnings) {
    console.warn(`[env] WARNING: ${w}`);
  }
}
