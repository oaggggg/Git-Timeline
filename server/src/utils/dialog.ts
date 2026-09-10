import { execFile } from 'child_process';

export async function openFolderDialog(initialPath?: string): Promise<string | null> {
  if (process.platform === 'win32') {
    const escapedInitial = initialPath ? initialPath.replace(/'/g, "''") : '';
    const psScript = `
$ProgressPreference = 'SilentlyContinue'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Windows.Forms

$form = New-Object System.Windows.Forms.Form
$form.TopMost = $true
$form.ShowInTaskbar = $false
$form.Opacity = 0
$form.StartPosition = 'CenterScreen'
$form.Show()
$form.BringToFront()

$dialog = New-Object System.Windows.Forms.FolderBrowserDialog
$dialog.Description = '请选择 Git 仓库文件夹'
$dialog.AutoUpgradeEnabled = $true
$dialog.ShowNewFolderButton = $true
if ('${escapedInitial}' -ne '' -and (Test-Path -LiteralPath '${escapedInitial}')) {
    $dialog.SelectedPath = '${escapedInitial}'
}

$res = $dialog.ShowDialog($form)
$form.Dispose()

if ($res -eq [System.Windows.Forms.DialogResult]::OK) {
    Write-Output $dialog.SelectedPath
} else {
    Write-Output '__CANCELLED__'
}
`;

    const encodedCommand = Buffer.from(psScript, 'utf16le').toString('base64');

    return new Promise<string | null>((resolve) => {
      let isSettled = false;
      const child = execFile(
        'powershell.exe',
        ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-STA', '-EncodedCommand', encodedCommand],
        { encoding: 'utf8' },
        (err, stdout, stderr) => {
          if (isSettled) return;
          isSettled = true;
          if (err) {
            console.error('Folder dialog execution error:', err, stderr);
            resolve(null);
            return;
          }
          const lines = (stdout || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
          const selected = lines[lines.length - 1];
          if (!selected || selected === '__CANCELLED__') {
            resolve(null);
          } else {
            resolve(selected);
          }
        }
      );

      // Safety timeout after 120s
      const timer = setTimeout(() => {
        if (!isSettled) {
          isSettled = true;
          try {
            child.kill();
          } catch {}
          resolve(null);
        }
      }, 120000);

      child.on('exit', () => clearTimeout(timer));
    });
  } else if (process.platform === 'darwin') {
    const osaScript = `POSIX path of (choose folder with prompt "请选择 Git 仓库文件夹")`;
    return new Promise<string | null>((resolve) => {
      execFile('osascript', ['-e', osaScript], { encoding: 'utf8' }, (err, stdout) => {
        if (err || !stdout) return resolve(null);
        resolve(stdout.trim() || null);
      });
    });
  } else {
    return new Promise<string | null>((resolve) => {
      execFile(
        'zenity',
        ['--file-selection', '--directory', '--title=请选择 Git 仓库文件夹'],
        { encoding: 'utf8' },
        (err, stdout) => {
          if (err || !stdout) return resolve(null);
          resolve(stdout.trim() || null);
        }
      );
    });
  }
}
