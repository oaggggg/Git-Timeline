import assert from 'node:assert/strict';
import childProcess from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import { test } from 'node:test';
import { openFolderDialog } from '../dist/utils/dialog.js';

test('Windows folder picker', { skip: process.platform !== 'win32' }, async (t) => {
  let result;
  let invocation;
  t.mock.method(childProcess, 'execFile', (...args) => {
    invocation = args;
    queueMicrotask(() => args[3](result.error, result.stdout ?? '', ''));
    return {};
  });
  syncBuiltinESMExports();
  t.after(() => {
    t.mock.restoreAll();
    syncBuiltinESMExports();
  });

  await t.test('returns the selected Unicode path and uses a visible, public picker', async () => {
    const folder = "D:\\\u4ed3\u5e93\\owner's project";
    result = { stdout: `\ufeff${folder}\r\n` };
    assert.equal(await openFolderDialog(folder), folder);
    assert.equal(invocation[0], 'powershell.exe');
    assert.ok(invocation[1].includes('-STA'));
    assert.equal(invocation[2].windowsHide, true);
    assert.equal(invocation[2].timeout, 120000);
    const script = Buffer.from(invocation[1].at(-1), 'base64').toString('utf16le');
    assert.ok(script.includes("owner''s project"));
    assert.ok(script.includes('System.Windows.Forms.FolderBrowserDialog'));
    assert.ok(script.includes("$topForm.StartPosition = 'CenterScreen'"));
    assert.ok(script.includes("$ErrorActionPreference = 'Stop'"));
    assert.ok(!script.includes('CreateVistaDialog'));
    assert.ok(!script.includes('-2000'));
  });

  await t.test('only explicit cancellation returns null', async () => {
    result = { stdout: '__CANCELLED__\r\n' };
    assert.equal(await openFolderDialog(), null);
  });

  await t.test('launch failures reject instead of appearing as cancellation', async () => {
    result = { error: Object.assign(new Error('spawn ENOENT'), { code: 'ENOENT' }) };
    await assert.rejects(openFolderDialog(), /PowerShell/);
  });

  await t.test('timeouts reject', async () => {
    result = { error: Object.assign(new Error('timeout'), { killed: true }) };
    await assert.rejects(openFolderDialog(), /\u8d85\u65f6/);
  });

  await t.test('empty output rejects', async () => {
    result = { stdout: '' };
    await assert.rejects(openFolderDialog(), /\u672a\u8fd4\u56de\u7ed3\u679c/);
  });
});
