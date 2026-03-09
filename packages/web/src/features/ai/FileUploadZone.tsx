/**
 * Block 16: File Upload Zone
 *
 * Drag-and-drop zone for uploading design inspiration files (PNG, JPG, PDF).
 * Sends files to the API for analysis and displays the resulting InspirationProfile.
 */

import { useCallback, useRef, useState } from 'react';
import type { InspirationProfile } from './types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'application/pdf'];
const ACCEPTED_EXTENSIONS = '.png,.jpg,.jpeg,.pdf';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface FileUploadZoneProps {
  /** API endpoint for file analysis (e.g. "/api/ai/analyze-file") */
  apiUrl: string;
  /** Called when an InspirationProfile is successfully extracted */
  onAnalyzed: (profile: InspirationProfile) => void;
  /** Called when the user clicks "Apply this style" */
  onApplyStyle?: (profile: InspirationProfile) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FileUploadZone({
  apiUrl,
  onAnalyzed,
  onApplyStyle,
}: FileUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<InspirationProfile | null>(null);

  // -----------------------------------------------------------------------
  // Upload handler
  // -----------------------------------------------------------------------

  const uploadFile = useCallback(
    async (file: File) => {
      setError(null);
      setProfile(null);

      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError('Unsupported file type. Please upload PNG, JPG, or PDF.');
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setError('File too large. Maximum size is 10 MB.');
        return;
      }

      setUploading(true);
      setProgress(10);

      try {
        const formData = new FormData();
        formData.append('file', file);

        // Simulate progress ticks during fetch
        const progressInterval = setInterval(() => {
          setProgress((p) => Math.min(p + 15, 85));
        }, 400);

        const res = await fetch(apiUrl, {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });

        clearInterval(progressInterval);
        setProgress(95);

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(
            (body as { error?: string }).error ?? `Upload failed (${res.status})`,
          );
        }

        const result = (await res.json()) as InspirationProfile;
        setProgress(100);
        setProfile(result);
        onAnalyzed(result);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Analysis failed. Please try again.',
        );
      } finally {
        setUploading(false);
      }
    },
    [apiUrl, onAnalyzed],
  );

  // -----------------------------------------------------------------------
  // Drag handlers
  // -----------------------------------------------------------------------

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      const file = e.dataTransfer.files?.[0];
      if (file) uploadFile(file);
    },
    [uploadFile],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) uploadFile(file);
      // Reset so the same file can be re-selected
      e.target.value = '';
    },
    [uploadFile],
  );

  // -----------------------------------------------------------------------
  // Render helpers
  // -----------------------------------------------------------------------

  const renderProfile = (p: InspirationProfile) => (
    <div className="mt-4 space-y-3">
      {/* Color swatches */}
      <div>
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          Colors
        </span>
        <div className="mt-1 flex gap-1.5 flex-wrap">
          {p.analysis.colorPalette.map((hex, i) => (
            <div
              key={i}
              role="img"
              aria-label={`Color: ${hex}`}
              className="w-7 h-7 rounded border border-gray-200"
              style={{ backgroundColor: hex }}
              title={hex}
            />
          ))}
        </div>
      </div>

      {/* Typography tag */}
      <div>
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          Typography
        </span>
        <span className="ml-2 inline-block rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
          {p.analysis.typographyFeel}
        </span>
      </div>

      {/* Layout description */}
      <div>
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          Layout
        </span>
        <p className="mt-0.5 text-sm text-gray-700">
          {p.analysis.layoutStyle} &middot; {p.analysis.spacingDensity} spacing
        </p>
      </div>

      {/* Tone */}
      <div>
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          Tone
        </span>
        <p className="mt-0.5 text-sm text-gray-700">{p.analysis.contentTone}</p>
      </div>

      {/* Key elements */}
      <div>
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          Key Elements
        </span>
        <div className="mt-1 flex flex-wrap gap-1">
          {p.analysis.keyElements.map((el, i) => (
            <span
              key={i}
              className="inline-block rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
            >
              {el}
            </span>
          ))}
        </div>
      </div>

      {/* Apply button */}
      {onApplyStyle && (
        <button
          type="button"
          onClick={() => onApplyStyle(p)}
          className="mt-2 w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-colors"
        >
          Apply this style
        </button>
      )}
    </div>
  );

  // -----------------------------------------------------------------------
  // Main render
  // -----------------------------------------------------------------------

  return (
    <div className="w-full">
      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click(); } }}
        aria-label="Upload design file for analysis"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          relative flex flex-col items-center justify-center
          rounded-lg border-2 border-dashed p-6 cursor-pointer
          transition-colors duration-150
          ${
            dragActive
              ? 'border-indigo-500 bg-indigo-50'
              : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50'
          }
          ${uploading ? 'pointer-events-none opacity-60' : ''}
        `}
      >
        {/* Upload icon */}
        <svg
          className="mx-auto h-10 w-10 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
          />
        </svg>

        <p className="mt-2 text-sm text-gray-600">
          <span className="font-semibold text-indigo-600">Click to upload</span>{' '}
          or drag and drop
        </p>
        <p className="mt-1 text-xs text-gray-400">PNG, JPG, PDF up to 10 MB</p>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          onChange={handleInputChange}
          className="sr-only"
        />
      </div>

      {/* Progress bar */}
      {uploading && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>Analyzing design...</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-indigo-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-3 flex items-center gap-2">
          <p className="text-sm text-red-600">{error}</p>
          <button
            type="button"
            onClick={() => { setError(null); inputRef.current?.click(); }}
            className="text-sm font-medium text-indigo-600 hover:underline shrink-0"
          >
            Try again
          </button>
        </div>
      )}

      {/* Analysis result */}
      {profile && !uploading && renderProfile(profile)}
    </div>
  );
}
