import { EconomicClient } from '../src/economic/client.js';

async function main(): Promise<void> {
  const client = new EconomicClient();
  const root = await client.rest('/');
  console.log(JSON.stringify(root, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
