import type { HttpMethod, QueryValue } from './client.js';
import { EconomicClient } from './client.js';
import { type EndpointOperation, findEndpoint, findService } from './catalog.js';

export interface EndpointCallInput {
  serviceId: string;
  method: HttpMethod;
  pathTemplate: string;
  pathParams?: Record<string, string | number>;
  query?: Record<string, QueryValue>;
  body?: unknown;
  idempotencyKey?: string;
}

export async function callEndpoint(client: EconomicClient, input: EndpointCallInput): Promise<unknown> {
  const endpoint = findEndpoint(input.serviceId, input.method, input.pathTemplate);
  const service = findService(endpoint.serviceId);
  const path = materializePath(endpoint, input.pathParams);

  if (endpoint.surface === 'rest') {
    return client.rest(path, {
      method: endpoint.method,
      query: input.query,
      body: input.body,
      idempotencyKey: input.idempotencyKey,
    });
  }

  return client.openApi(service.servicePath, path, {
    method: endpoint.method,
    query: input.query,
    body: input.body,
    idempotencyKey: input.idempotencyKey,
  });
}

export function materializePath(
  endpoint: EndpointOperation,
  pathParams: Record<string, string | number> = {},
): string {
  return endpoint.pathTemplate.replace(/\{([^}]+)\}/g, (_, key: string) => {
    const value = pathParams[key];
    if (value === undefined || value === null || value === '') {
      throw new Error(`Missing path parameter "${key}" for ${endpoint.pathTemplate}`);
    }

    return encodeURIComponent(String(value));
  });
}
