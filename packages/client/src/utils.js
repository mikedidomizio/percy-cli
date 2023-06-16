import os from 'os';
import fs from 'fs';
import url from 'url';
import path from 'path';
import crypto from 'crypto';

// Returns a sha256 hash of a string.
export function sha256hash(content) {
  return crypto
    .createHash('sha256')
    .update(content, 'utf-8')
    .digest('hex');
}

// Returns a base64 encoding of a string or buffer.
export function base64encode(content) {
  return Buffer
    .from(content)
    .toString('base64');
}

/**
 * Takes an object and builds a query string out of it
 * @param obj       the object to iterate through and generate a query string with
 * @param arrayKey  the array key for the query string params
 * @return {string}
 */
export function buildQueryStringArrayFromObject(obj, arrayKey) {
  return Object.keys(obj).map(k => (Array.isArray(obj[k])
    ? obj[k].map(v => `${arrayKey}[${k}][]=${v}`).join('&')
    : `${arrayKey}[${k}]=${obj[k]}`
  )).join('&');
}

export function waitForTimeout() {
  return new Promise(resolve => setTimeout(resolve, ...arguments));
}

// Returns the package.json content at the package path.
export function getPackageJSON(rel) {
  /* istanbul ignore else: sanity check */
  if (rel.startsWith('file:')) rel = url.fileURLToPath(rel);

  let pkg = path.join(rel, 'package.json');
  if (fs.existsSync(pkg)) return JSON.parse(fs.readFileSync(pkg));

  let dir = path.dirname(rel);
  /* istanbul ignore else: sanity check */
  if (dir !== rel && dir !== os.homedir()) return getPackageJSON(dir);
}

// Creates a concurrent pool of promises created by the given generator.
// Resolves when the generator's final promise resolves and rejects when any
// generated promise rejects.
export function pool(generator, context, concurrency) {
  return new Promise((resolve, reject) => {
    let iterator = generator.call(context);
    let queue = 0;
    let ret = [];
    let err;

    // generates concurrent promises
    let proceed = () => {
      while (queue < concurrency) {
        let { done, value: promise } = iterator.next();

        if (done || err) {
          if (!queue && err) reject(err);
          if (!queue) resolve(ret);
          return;
        }

        queue++;
        promise.then(value => {
          queue--;
          ret.push(value);
          proceed();
        }).catch(error => {
          queue--;
          err = error;
          proceed();
        });
      }
    };

    // start generating promises
    proceed();
  });
}

// Returns a promise that resolves or rejects when the provided function calls
// `resolve` or `reject` respectively. The third function argument, `retry`,
// will recursively call the function at the specified interval until retries
// are exhausted, at which point the promise will reject with the last error
// passed to `retry`.
export function retry(fn, { retries = 5, interval = 50 }) {
  return new Promise((resolve, reject) => {
    let run = () => fn(resolve, reject, retry);

    // wait an interval to try again or reject with the error
    let retry = err => {
      if (retries-- > 0) {
        setTimeout(run, interval);
      } else {
        reject(err);
      }
    };

    // start trying
    run();
  });
}

// Used by the request util when retrying specific errors
const RETRY_ERROR_CODES = [
  'ECONNREFUSED', 'ECONNRESET', 'EPIPE',
  'EHOSTUNREACH', 'EAI_AGAIN'
];

// Proxified request function that resolves with the response body when the request is successful
// and rejects when a non-successful response is received. The rejected error contains response data
// and any received error details. Server 500 errors are retried up to 5 times at 50ms intervals by
// default, and 404 errors may also be optionally retried. If a callback is provided, it is called
// with the parsed response body and response details. If the callback returns a value, that value
// will be returned in the final resolved promise instead of the response body.
export async function request(url, options = {}, callback) {
  // accept `request(url, callback)`
  if (typeof options === 'function') [options, callback] = [{}, options];

  // gather request options
  let { body, headers, retries, retryNotFound, interval, noProxy, buffer, ...requestOptions } = options;
  let { protocol, hostname, port, pathname, search, hash } = new URL(url);

  // reference the default export so tests can mock it
  let { default: http } = await import(protocol === 'https:' ? 'https' : 'http');
  let { proxyAgentFor } = await import('./proxy.js');

  // automatically stringify body content
  if (body !== undefined && typeof body !== 'string') {
    headers = { 'Content-Type': 'application/json', ...headers };
    body = JSON.stringify(body);
  }

  // combine request options
  Object.assign(requestOptions, {
    agent: requestOptions.agent || (!noProxy && proxyAgentFor(url)) || null,
    path: pathname + search + hash,
    protocol,
    hostname,
    headers,
    port
  });

  return retry((resolve, reject, retry) => {
    let handleError = error => {
      if (handleError.handled) return;
      handleError.handled = true;

      // maybe retry 404s, always retry 500s, or retry specific errors
      let shouldRetry = error.response
        ? ((retryNotFound && error.response.statusCode === 404) ||
           (error.response.statusCode >= 500 && error.response.statusCode < 600))
        : (!!error.code && RETRY_ERROR_CODES.includes(error.code));

      return shouldRetry ? retry(error) : reject(error);
    };

    let handleFinished = async (body, res) => {
      let { statusCode, headers } = res;
      let raw = body.toString('utf-8');

      // only return a buffer when requested
      if (buffer !== true) body = raw;

      // attempt to parse the body as json
      try { body = JSON.parse(raw); } catch {}

      try {
        if (statusCode >= 200 && statusCode < 300) {
          resolve(await callback?.(body, res) ?? body);
        } else {
          let err = body?.errors?.find(e => e.detail)?.detail;
          throw new Error(err || `${statusCode} ${res.statusMessage || raw}`);
        }
      } catch (error) {
        let response = { statusCode, headers, body };
        handleError(Object.assign(error, { response }));
      }
    };

    let handleResponse = res => {
      let chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => handleFinished(Buffer.concat(chunks), res));
      res.on('error', handleError);
    };

    let req = http.request(requestOptions);
    req.on('response', handleResponse);
    req.on('error', handleError);
    req.end(body);
  }, { retries, interval });
}

export {
  hostnameMatches,
  ProxyHttpAgent,
  ProxyHttpsAgent,
  proxyAgentFor
} from './proxy.js';
