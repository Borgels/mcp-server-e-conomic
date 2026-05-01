import { afterEach, describe, expect, it } from 'vitest';
import { checkPolicy } from '../src/economic/policy.js';
import { prepareOperation, verifyPreparedOperation } from '../src/economic/operations.js';

const originalWrites = process.env.ECONOMIC_ENABLE_WRITES;

describe('write policy', () => {
  afterEach(() => {
    if (originalWrites === undefined) {
      delete process.env.ECONOMIC_ENABLE_WRITES;
    } else {
      process.env.ECONOMIC_ENABLE_WRITES = originalWrites;
    }
    delete process.env.ECONOMIC_POLICY_PATH;
  });

  it('allows reads by default', () => {
    expect(
      checkPolicy({
        capability: 'economic_call_endpoint',
        serviceId: 'customers',
        method: 'GET',
        path: '/Customers',
      }),
    ).toMatchObject({ allowed: true });
  });

  it('blocks writes by default', () => {
    delete process.env.ECONOMIC_ENABLE_WRITES;

    expect(
      checkPolicy({
        capability: 'economic_prepare_customer_change',
        serviceId: 'customers',
        method: 'POST',
        path: '/Customers',
        body: { name: 'Acme' },
      }),
    ).toMatchObject({ allowed: false, reason: 'writes disabled' });
  });

  it('prepares stable hashable dry-run operations', () => {
    const operation = prepareOperation({
      capability: 'economic_prepare_customer_change',
      serviceId: 'customers',
      method: 'POST',
      pathTemplate: '/Customers',
      body: { name: 'Acme' },
      reason: 'Create customer from CRM onboarding',
    });

    expect(operation.dryRun).toBe(true);
    expect(operation.operationHash).toHaveLength(64);
    expect(() => verifyPreparedOperation(operation)).not.toThrow();
  });

  it('detects tampered prepared operations', () => {
    const operation = prepareOperation({
      capability: 'economic_prepare_customer_change',
      serviceId: 'customers',
      method: 'POST',
      pathTemplate: '/Customers',
      body: { name: 'Acme' },
      reason: 'Create customer from CRM onboarding',
    });

    expect(() =>
      verifyPreparedOperation({
        ...operation,
        body: { name: 'Different' },
      }),
    ).toThrow('hash does not match');
  });
});
