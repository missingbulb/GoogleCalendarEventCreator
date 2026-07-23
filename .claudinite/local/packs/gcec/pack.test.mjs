// Red-first fixture tests for the gcec pack's checks, runnable by this repo's own
// `npm test` (no imports from the gitignored .claudinite mount — see the check
// module's header). Each rule is shown firing on a violating fixture and staying
// quiet on a clean one.
import test from 'node:test';
import assert from 'node:assert/strict';
import testOfflineListSync from './test-offline-list-sync.mjs';

function ctx({ files = [], pkg }) {
  const disk = new Set([...files, 'package.json']);
  return {
    files,
    read: (p) => (p === 'package.json' ? JSON.stringify(pkg) : null),
    exists: (p) => disk.has(p),
  };
}

const pkgWith = (offline) => ({ scripts: { 'test:offline': `node --test ${offline.join(' ')}` } });

test('test-offline-list-sync: fires when a mirror test is missing from the list', () => {
  const findings = testOfflineListSync.run(
    ctx({
      files: ['extension-test/a.test.js', 'extension-test/b.test.js'],
      pkg: pkgWith(['extension-test/a.test.js']),
    }),
  );
  assert.equal(findings.length, 1);
  assert.match(findings[0].what, /missing extension-test\/b\.test\.js/);
  assert.equal(findings[0].severity, 'blocking');
});

test('test-offline-list-sync: fires when the list names a file that does not exist', () => {
  const findings = testOfflineListSync.run(
    ctx({
      files: ['extension-test/a.test.js'],
      pkg: pkgWith(['extension-test/a.test.js', 'extension-test/gone.test.js']),
    }),
  );
  assert.equal(findings.length, 1);
  assert.match(findings[0].what, /extension-test\/gone\.test\.js, which does not exist/);
});

test('test-offline-list-sync: quiet when list and tree agree (non-mirror entries ignored)', () => {
  const findings = testOfflineListSync.run(
    ctx({
      files: ['extension-test/a.test.js', 'dev/build/test/other.test.js'],
      pkg: pkgWith(['extension-test/a.test.js', 'dev/build/release/shipping-files.test.js']),
    }),
  );
  assert.deepEqual(findings, []);
});

test('test-offline-list-sync: quiet when package.json has no test:offline script', () => {
  const findings = testOfflineListSync.run(
    ctx({ files: ['extension-test/a.test.js'], pkg: { scripts: {} } }),
  );
  assert.deepEqual(findings, []);
});
