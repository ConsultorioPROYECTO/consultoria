import Cloudflare from 'cloudflare';
import { env } from '@/env';

/**
 * Cloudflare API client.
 *
 * This client is configured to use the API token from the environment variables.
 * It can be used to interact with the Cloudflare API for various services,
 * including R2, Workers, and more.
 *
 * @see https://developers.cloudflare.com/api/
 */
export const cloudflare = new Cloudflare({
  apiToken: env.CLOUDFLARE_API_TOKEN,
});