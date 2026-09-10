import assert from 'node:assert/strict';
import childProcess from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import { test } from 'node:test';
import { openFolderDialog } from '../dist/utils/dialog.js';

// Opt-in: opens real Windows dialogs and operates only on the spawned process.
test('native folder picker is on screen and supports selection/cancellation', {
  skip: process.platform !== 'win32' || process.env.TEST_NATIVE_DIALOG !== '1',
  timeout: 45000
}, async (t) => {
  const execFile = childProcess.execFile;
  let driverDone;
  let buttonId = '1';
  t.mock.method(childProcess, 'execFile', (...args) => {
    const child = execFile(...args);
    const script = `
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class DialogTestNative {
    [DllImport("user32.dll")]
    public static extern bool PostMessage(IntPtr handle, uint message, IntPtr wParam, IntPtr lParam);
    [DllImport("user32.dll")]
    public static extern IntPtr GetDlgItem(IntPtr handle, int id);
    [DllImport("user32.dll")]
    public static extern bool IsWindowEnabled(IntPtr handle);
}
'@
$condition = New-Object System.Windows.Automation.PropertyCondition(
    [System.Windows.Automation.AutomationElement]::ProcessIdProperty, ${child.pid})
$deadline = [DateTime]::Now.AddSeconds(15)
do {
    $windows = [System.Windows.Automation.AutomationElement]::RootElement.FindAll(
        [System.Windows.Automation.TreeScope]::Children, $condition)
    foreach ($owner in $windows) {
      $dialogCondition = New-Object System.Windows.Automation.PropertyCondition(
          [System.Windows.Automation.AutomationElement]::ClassNameProperty, '#32770')
      $dialogs = $owner.FindAll([System.Windows.Automation.TreeScope]::Subtree, $dialogCondition)
      foreach ($window in $dialogs) {
        $bounds = $window.Current.BoundingRectangle
        $screen = [System.Windows.Forms.SystemInformation]::VirtualScreen
        if ($bounds.Width -le 0 -or $bounds.Height -le 0 -or
            $bounds.Right -le $screen.Left -or $bounds.Left -ge $screen.Right -or
            $bounds.Bottom -le $screen.Top -or $bounds.Top -ge $screen.Bottom) {
            throw 'Folder picker is not visible on screen'
        }
        $button = [DialogTestNative]::GetDlgItem([IntPtr]$window.Current.NativeWindowHandle, ${buttonId})
        if ($button -eq [IntPtr]::Zero -or -not [DialogTestNative]::IsWindowEnabled($button)) { continue }
        $null = [DialogTestNative]::PostMessage(
            $button, 0x00F5, [IntPtr]::Zero, [IntPtr]::Zero)
        Write-Output 'visible-dialog-operated'
        exit 0
      }
    }
    Start-Sleep -Milliseconds 200
} while ([DateTime]::Now -lt $deadline)
throw 'Folder picker did not appear'
`;
    driverDone = new Promise((resolve) => {
      execFile('powershell.exe', [
        '-NoProfile', '-STA', '-EncodedCommand',
        Buffer.from(script, 'utf16le').toString('base64')
      ], { windowsHide: true, timeout: 20000, encoding: 'utf8' }, (error, stdout, stderr) => {
        if (error) child.kill();
        resolve({ error, stdout, stderr });
      });
    });
    return child;
  });
  syncBuiltinESMExports();
  t.after(() => {
    t.mock.restoreAll();
    syncBuiltinESMExports();
  });

  const selected = await openFolderDialog(process.cwd()).catch(async (error) => {
    const driver = await driverDone;
    throw new Error(`${driver.stdout}\n${driver.stderr || error.message}`);
  });
  const selectionDriver = await driverDone;
  assert.equal(selectionDriver.error, null, selectionDriver.stderr);
  assert.equal(selected?.toLowerCase(), process.cwd().toLowerCase());
  buttonId = '2';
  assert.equal(await openFolderDialog(process.cwd()), null);
  const cancelDriver = await driverDone;
  assert.equal(cancelDriver.error, null, cancelDriver.stderr);
});
