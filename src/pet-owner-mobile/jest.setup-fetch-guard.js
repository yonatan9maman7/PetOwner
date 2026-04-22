/**
 * Axios probes the Fetch + ReadableStream stack at import time. Node's native fetch plus
 * Expo's ReadableStream polyfill throws when the probe cancels a stream. Removing fetch
 * makes axios skip the fetch adapter during that probe (http adapter remains for real use).
 */
delete globalThis.fetch;
delete globalThis.Request;
delete globalThis.Response;
