type Settings = {
  sourceProfile: string;
  sessionProfile: string;
  durationSeconds: number;
  onePasswordItem: string | undefined;
};

type Env = Record<string, string | undefined>;

// get-session-token accepts 15 minutes to 36 hours for an IAM user
const MIN_DURATION = 900;
const MAX_DURATION = 129_600;

const text = (env: Env, name: string, fallback: string): string => env[name] || fallback;

const duration = (raw: string | undefined): number => {
  if (raw === undefined || raw === '') {
    return 43_200;
  }
  const value = Number(raw);
  if (!Number.isInteger(value) || value < MIN_DURATION || value > MAX_DURATION) {
    throw new Error(`AWS_MFA_DURATION must be whole seconds from ${MIN_DURATION} to ${MAX_DURATION}, got "${raw}"`);
  }
  return value;
};

const readSettings = (env: Env): Settings => {
  const settings = {
    sourceProfile: text(env, 'AWS_MFA_SOURCE_PROFILE', 'default'),
    sessionProfile: text(env, 'AWS_MFA_SESSION_PROFILE', 'arsw-mfa'),
    durationSeconds: duration(env.AWS_MFA_DURATION),
    onePasswordItem: env.OP_MFA_ITEM || undefined,
  };
  // Writing the session over the long-term key would lose the key
  if (settings.sessionProfile === settings.sourceProfile) {
    throw new Error(`The session profile can't be the source profile (${settings.sourceProfile})`);
  }
  return settings;
};

const isMfaCode = (code: string): boolean => /^\d{6}$/.test(code);

export { isMfaCode, readSettings };
export type { Settings };
