import { describe, expect, it, vi } from 'vitest';
import { EconomicClient } from '../src/economic/client.js';
import { callEndpoint } from '../src/economic/endpoints.js';

describe('validated endpoint calls', () => {
  it('calls allowlisted OpenAPI endpoints through the service base URL', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => jsonResponse([{ customerNumber: 1 }]));
    const client = new EconomicClient({
      appSecretToken: 'demo',
      agreementGrantToken: 'demo',
      openApiBaseUrl: 'https://apis.example.test',
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    await callEndpoint(client, {
      serviceId: 'customers',
      method: 'GET',
      pathTemplate: '/Customers/paged',
      query: { pageSize: 20 },
    });

    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      'https://apis.example.test/customersapi/v3.1.0/Customers/paged?pageSize=20',
    );
  });

  it('rejects non-allowlisted endpoint calls', async () => {
    const client = new EconomicClient({
      appSecretToken: 'demo',
      agreementGrantToken: 'demo',
      fetchImpl: vi.fn() as unknown as typeof fetch,
    });

    await expect(
      callEndpoint(client, {
        serviceId: 'customers',
        method: 'GET',
        pathTemplate: '/NotReal',
      }),
    ).rejects.toThrow('not allowlisted');
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
