import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseGitError } from '../dist/routes/git-ops.js';

const cases = [
  ["fatal: unable to access 'https://github.com/oaggggg/Git-Timeline/': Failed to connect to github.com:443 or proxy 127.0.0.1 after 2060 ms: Could not connect to server", 'PROXY_UNAVAILABLE'],
  ['Failed to connect to 127.0.0.1 port 7897 after 2060 ms: Could not connect to server', 'PROXY_UNAVAILABLE'],
  ['Failed to connect to localhost port 7897', 'PROXY_UNAVAILABLE'],
  ['Could not resolve proxy: proxy.example.test', 'PROXY_UNAVAILABLE'],
  ['Could not resolve host: github.com', 'NETWORK_UNAVAILABLE'],
  ['Failed to connect to github.com port 443: Could not connect to server', 'NETWORK_UNAVAILABLE'],
  ['Connection timed out', 'NETWORK_UNAVAILABLE'],
  ["fatal: couldn't find remote ref main", 'NO_REMOTE_REF'],
  ['Authentication failed', 'AUTH_FAILED'],
  ['Automatic merge failed; fix conflicts and then commit the result.', 'CONFLICT'],
  ['There is no tracking information for the current branch.', 'NO_TRACKING']
];

for (const [message, code] of cases) {
  test(`classifies ${message}`, () => {
    const parsed = parseGitError(new Error(`Git error [pull]: ${message}`));
    assert.equal(parsed.code, code);
    assert.ok(parsed.message);
    assert.ok(!parsed.message.includes('fatal:'));
    assert.ok(!parsed.message.includes('https://'));
  });
}

test('unknown errors retain their details', () => {
  assert.deepEqual(parseGitError(new Error('Git error [pull]: unexpected failure')), {
    code: 'GIT_ERROR',
    message: 'unexpected failure'
  });
});
