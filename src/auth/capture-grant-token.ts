import { createServer, type ServerResponse } from 'node:http';
import { URL } from 'node:url';

const installationUrl = process.env.ECONOMIC_INSTALLATION_URL;
const appPublicToken = process.env.ECONOMIC_APP_PUBLIC_TOKEN;
const host = process.env.ECONOMIC_AUTH_CALLBACK_HOST ?? '127.0.0.1';
const port = Number(process.env.ECONOMIC_AUTH_CALLBACK_PORT ?? 3333);
const callbackPath = process.env.ECONOMIC_AUTH_CALLBACK_PATH ?? '/economic/grant/callback';

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('ECONOMIC_AUTH_CALLBACK_PORT must be a TCP port number.');
}

const callbackUrl = `http://${host}:${port}${callbackPath}`;
const resolvedInstallationUrl = installationUrl ?? (appPublicToken ? buildInstallationUrl(appPublicToken) : undefined);

const server = createServer((req, res) => {
  if (!req.url) {
    sendText(res, 400, 'Missing request URL.');
    return;
  }

  const url = new URL(req.url, callbackUrl);

  if (url.pathname !== callbackPath) {
    sendText(res, 404, 'Not found.');
    return;
  }

  const token = url.searchParams.get('token') ?? url.searchParams.get('agreementGrantToken');
  if (!token) {
    sendText(res, 400, 'No e-conomic grant token was present in the callback URL.');
    return;
  }

  const escapedToken = escapeHtml(token);
  const exportLine = `export ECONOMIC_AGREEMENT_GRANT_TOKEN="${escapeShell(token)}"`;

  console.log('\nReceived e-conomic Agreement Grant Token.\n');
  console.log('Add this to your MCP server environment:');
  console.log(exportLine);
  console.log('\nTreat this value as a secret.\n');

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>e-conomic grant token received</title>
    <style>
      body { font-family: system-ui, sans-serif; margin: 2rem; line-height: 1.5; }
      code { background: #f4f4f5; padding: 0.2rem 0.35rem; border-radius: 4px; }
      pre { background: #18181b; color: #fafafa; padding: 1rem; overflow: auto; }
    </style>
  </head>
  <body>
    <h1>Agreement Grant Token received</h1>
    <p>Copy this value into the MCP server environment. Treat it as a secret.</p>
    <p><code>${escapedToken}</code></p>
    <pre>${escapeHtml(exportLine)}</pre>
    <p>You can close this browser tab and stop the helper process.</p>
  </body>
</html>`);

  setTimeout(() => {
    server.close();
  }, 500);
});

server.listen(port, host, () => {
  console.log('e-conomic Agreement Grant Token helper');
  console.log('');
  console.log(`Callback URL: ${callbackUrl}`);
  console.log('');
  console.log('In your e-conomic developer app, configure the app installation redirect URL to the callback URL above.');

  if (resolvedInstallationUrl) {
    console.log('');
    console.log('Open this installation URL while logged into the e-conomic agreement that should grant access:');
    console.log(resolvedInstallationUrl);
  } else {
    console.log('');
    console.log('Set ECONOMIC_INSTALLATION_URL or ECONOMIC_APP_PUBLIC_TOKEN if you want this helper to print the app installation URL.');
  }

  console.log('');
  console.log('Waiting for e-conomic to redirect back with ?token=...');
});

function sendText(res: ServerResponse, status: number, message: string): void {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(message);
}

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function escapeShell(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll('"', '\\"').replaceAll('$', '\\$').replaceAll('`', '\\`');
}

function buildInstallationUrl(publicToken: string): string {
  const url = new URL('https://secure.e-conomic.com/secure/api1/requestaccess.aspx');
  url.searchParams.set('appPublicToken', publicToken);
  return url.toString();
}
