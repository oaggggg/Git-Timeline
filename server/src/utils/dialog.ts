import { execFile } from 'child_process';

export async function openFolderDialog(initialPath?: string): Promise<string | null> {
  if (process.platform === 'win32') {
    const escapedInitial = initialPath ? initialPath.replace(/'/g, "''") : '';
    const psScript = `
$ProgressPreference = 'SilentlyContinue'
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()

$topForm = New-Object System.Windows.Forms.Form
$topForm.Size = New-Object System.Drawing.Size(1, 1)
$topForm.StartPosition = 'CenterScreen'
$topForm.ShowInTaskbar = $false
$topForm.Opacity = 0
$topForm.TopMost = $true
$topForm.Show()
$topForm.BringToFront()
$topForm.Activate()

$dialog = $null
try {
    $dialog = New-Object System.Windows.Forms.FolderBrowserDialog
    $dialog.Description = '请选择 Git 仓库文件夹'
    $dialog.ShowNewFolderButton = $true
    if ('${escapedInitial}' -ne '' -and (Test-Path -LiteralPath '${escapedInitial}')) {
        $dialog.SelectedPath = '${escapedInitial}'
    }
    $res = $dialog.ShowDialog($topForm)
    if ($res -eq [System.Windows.Forms.DialogResult]::OK) {
        Write-Output $dialog.SelectedPath
    } else {
        Write-Output '__CANCELLED__'
    }
} finally {
    if ($dialog) { $dialog.Dispose() }
    $topForm.Close()
    $topForm.Dispose()
}
`;

    const encodedCommand = Buffer.from(psScript, 'utf16le').toString('base64');

    return new Promise<string | null>((resolve, reject) => {
      execFile(
        'powershell.exe',
        ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-STA', '-EncodedCommand', encodedCommand],
        { encoding: 'utf8', windowsHide: true, timeout: 120000 },
        (err, stdout, stderr) => {
          if (err) {
            console.error('Folder dialog execution error:', err, stderr);
            reject(new Error(err.killed
              ? '文件夹选择超时，请重试'
              : '无法打开系统文件夹选择窗口，请检查 PowerShell 是否可用'));
            return;
          }
          const selected = stdout.trim();
          if (selected === '__CANCELLED__') {
            resolve(null);
          } else if (!selected) {
            reject(new Error('系统文件夹选择窗口未返回结果，请重试'));
          } else {
            resolve(selected);
          }
        }
      );
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
