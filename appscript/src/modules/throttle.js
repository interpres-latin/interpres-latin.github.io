/**
 * server/throttle.js spaces out calls to shared hosts across the many requests
 * a Node process is serving at once. An Apps Script execution serves one
 * request and its fetches already run one at a time, so there is nothing to
 * space out — waiting would only spend the execution's time.
 */

import { USER_AGENT as AGENT } from '../../../server/throttle.js';

export const USER_AGENT = AGENT;

export function throttle(_name, _gap, task) {
  return Promise.resolve().then(task);
}
