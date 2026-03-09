interface EditorRolloutConfig {
  enforceLaunchBlocking: boolean;
  aiWorkspaceEnabled: boolean;
  showLaunchGatesPanel: boolean;
  showQualityGuardrailsPanel: boolean;
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value == null || value.trim() === '') return fallback;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

function readEnvFlag(key: string, fallback: boolean): boolean {
  const env = (import.meta as { env?: Record<string, string | undefined> }).env ?? {};
  return parseBoolean(env[key], fallback);
}

export const editorRollout: EditorRolloutConfig = {
  enforceLaunchBlocking: readEnvFlag('VITE_EDITOR_ENFORCE_LAUNCH_BLOCKING', true),
  aiWorkspaceEnabled: readEnvFlag('VITE_EDITOR_AI_WORKSPACE_ENABLED', true),
  showLaunchGatesPanel: readEnvFlag('VITE_EDITOR_SHOW_LAUNCH_GATES', true),
  showQualityGuardrailsPanel: readEnvFlag('VITE_EDITOR_SHOW_QUALITY_GUARDRAILS', true),
};
