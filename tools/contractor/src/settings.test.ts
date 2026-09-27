import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isMfaCode, readSettings } from './settings.ts';

describe('readSettings', () => {
  it('defaults to the default profile, arsw-mfa and 12 hours', () => {
    assert.deepEqual(readSettings({}), {
      sourceProfile: 'default',
      sessionProfile: 'arsw-mfa',
      durationSeconds: 43_200,
      onePasswordItem: undefined,
    });
  });

  it('reads overrides and treats empty values as unset', () => {
    assert.deepEqual(readSettings({
      AWS_MFA_SOURCE_PROFILE: 'admin',
      AWS_MFA_SESSION_PROFILE: '',
      AWS_MFA_DURATION: '3600',
      OP_MFA_ITEM: 'AWS arsw-dev',
    }), {
      sourceProfile: 'admin',
      sessionProfile: 'arsw-mfa',
      durationSeconds: 3600,
      onePasswordItem: 'AWS arsw-dev',
    });
  });

  it('accepts the duration limits and rejects anything outside them', () => {
    assert.equal(readSettings({ AWS_MFA_DURATION: '900' }).durationSeconds, 900);
    assert.equal(readSettings({ AWS_MFA_DURATION: '129600' }).durationSeconds, 129_600);
    for (const raw of ['899', '129601', '1.5', 'twelve', '-1']) {
      assert.throws(() => readSettings({ AWS_MFA_DURATION: raw }), /AWS_MFA_DURATION/, raw);
    }
  });

  it('refuses to write the session over the source profile', () => {
    assert.throws(() => readSettings({ AWS_MFA_SESSION_PROFILE: 'default' }), /can't be the source profile/);
    assert.throws(() => readSettings({ AWS_MFA_SOURCE_PROFILE: 'arsw-mfa' }), /can't be the source profile/);
  });
});

describe('isMfaCode', () => {
  it('accepts exactly six digits', () => {
    assert.equal(isMfaCode('012345'), true);
    for (const code of ['', '12345', '1234567', '12345a', ' 123456']) {
      assert.equal(isMfaCode(code), false, code);
    }
  });
});
