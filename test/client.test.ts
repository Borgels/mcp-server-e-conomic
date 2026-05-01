import { describe, expect, it, vi } from 'vitest';
import { EconomicClient } from '../src/economic/client.js';
import { EconomicHttpError, redactSecrets } from '../src/errors.js';

describe('EconomicClient', () => {
  it('sends e-conomic auth headers from environment-style options', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => jsonResponse({ ok: true }));
    const client = new EconomicClient({
      appSecretToken: 'app-secret',
      agreementGrantToken: 'grant-token',
      restBaseUrl: 'https://example.test',
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    await client.rest('/customers', { query: { pagesize: 10 } });

    expect(String(fetchMock.mock.calls[0]?.[0])).toBe('https://example.test/customers?pagesize=10');
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(init.headers).toMatchObject({
      'X-AppSecretToken': 'app-secret',
      'X-AgreementGrantToken': 'grant-token',
      Accept: 'application/json',
    });
  });

  it('adds idempotency keys for mutating requests', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => jsonResponse({ ok: true }));
    const client = new EconomicClient({
      appSecretToken: 'app-secret',
      agreementGrantToken: 'grant-token',
      restBaseUrl: 'https://example.test',
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    await client.rest('/customers', {
      method: 'POST',
      body: { name: 'Acme' },
      idempotencyKey: 'idem-12345',
    });

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(init.headers).toMatchObject({
      'Content-Type': 'application/json',
      'Idempotency-Key': 'idem-12345',
    });
    expect(init.body).toBe('{"name":"Acme"}');
  });

  it('redacts secrets in formatted errors', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      new Response(JSON.stringify({ message: 'Nope' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const client = new EconomicClient({
      appSecretToken: 'app-secret',
      agreementGrantToken: 'grant-token',
      restBaseUrl: 'https://example.test',
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    await expect(client.rest('/customers')).rejects.toBeInstanceOf(EconomicHttpError);
    expect(redactSecrets('X-AppSecretToken: app-secret')).toContain('[REDACTED]');
  });
});

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      'content-type': 'application/json',
    },
  });
}
