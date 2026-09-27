// Mints an MFA-backed session from the contractor's long-term key and saves it as an AWS profile (default: arsw-mfa).
// Client profiles use `source_profile = arsw-mfa` without mfa_serial, so the CLI and Terraform assume client roles
// with no prompt, and the client roles' MFA conditions hold. Run it once a day (sessions last 12 hours).
//
//   pnpm --filter contractor mfa-session
//
// Settings (environment):
//   AWS_MFA_SOURCE_PROFILE   profile with the long-term key and `mfa_serial` set   (default: default)
//   AWS_MFA_SESSION_PROFILE  profile to write the session to                        (default: arsw-mfa)
//   AWS_MFA_DURATION         seconds, 900 to 129600                                 (default: 43200, 12 hours)
//   OP_MFA_ITEM              1Password item holding the TOTP; read with `op` if set (otherwise you're prompted)
import { execFile } from 'node:child_process';
import process from 'node:process';
import { createInterface } from 'node:readline/promises';
import { promisify } from 'node:util';

import { isMfaCode, readSettings } from './settings.ts';

type Credentials = {
  AccessKeyId: string;
  SecretAccessKey: string;
  SessionToken: string;
  Expiration: string;
};

const run = promisify(execFile);

const output = async (command: string, args: string[]): Promise<string> => (await run(command, args)).stdout.trim();

const mfaSerial = async (profile: string): Promise<string> => {
  // `aws configure get` exits 1 when the value isn't set
  const serial = await output('aws', ['configure', 'get', 'mfa_serial', '--profile', profile]).catch(() => '');
  if (!serial) {
    throw new Error(`Set your MFA device on the source profile first: aws configure set mfa_serial <arn> --profile ${profile}`);
  }
  return serial;
};

const mfaCode = async (serial: string, onePasswordItem: string | undefined): Promise<string> => {
  if (onePasswordItem) {
    return output('op', ['item', 'get', onePasswordItem, '--otp']);
  }
  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return (await prompt.question(`MFA code for ${serial}: `)).trim();
  }
  finally {
    prompt.close();
  }
};

const main = async (): Promise<void> => {
  // eslint-disable-next-line node/no-process-env -- this tool's only configuration read
  const settings = readSettings(process.env);
  const serial = await mfaSerial(settings.sourceProfile);
  const code = await mfaCode(serial, settings.onePasswordItem);
  if (!isMfaCode(code)) {
    throw new Error('An MFA code is six digits');
  }

  const credentials = JSON.parse(await output('aws', [
    'sts',
    'get-session-token',
    '--profile',
    settings.sourceProfile,
    '--serial-number',
    serial,
    '--token-code',
    code,
    '--duration-seconds',
    String(settings.durationSeconds),
    '--query',
    'Credentials',
    '--output',
    'json',
  ])) as Credentials;

  const values = {
    aws_access_key_id: credentials.AccessKeyId,
    aws_secret_access_key: credentials.SecretAccessKey,
    aws_session_token: credentials.SessionToken,
    region: 'us-east-1',
  };
  for (const [key, value] of Object.entries(values)) {
    await run('aws', ['configure', 'set', key, value, '--profile', settings.sessionProfile]);
  }

  console.log(`Profile ${settings.sessionProfile} is MFA-backed until ${credentials.Expiration}`);
};

try {
  await main();
}
catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
