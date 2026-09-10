import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export async function openFolderDialog(initialPath?: string): Promise<string | null> {
  if (process.platform === 'win32') {
    const escapedInitial = initialPath ? initialPath.replace(/'/g, "''") : '';
    const psScript = `
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8;
Add-Type -AssemblyName System.Windows.Forms;
$dialog = New-Object System.Windows.Forms.FolderBrowserDialog;
$dialog.Description = '请选择 Git 仓库文件夹';
$dialog.ShowNewFolderButton = $false;
if ('${escapedInitial}' -ne '' -and (Test-Path -LiteralPath '${escapedInitial}')) {
    $dialog.SelectedPath = '${escapedInitial}';
}
$topForm = New-Object System.Windows.Forms.Form;
$topForm.TopMost = $true;
$topForm.Width = 0;
$topForm.Height = 0;
$topForm.StartPosition = 'CenterScreen';
$res = $dialog.ShowDialog($topForm);
if ($res -eq [System.Windows.Forms.DialogResult]::OK) {
    Write-Output $dialog.SelectedPath;
} else {
    Write-Output '__CANCELLED__';
}
`;
    try {
      const { stdout } = await execFileAsync(
        'powershell',
        ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-STA', '-Command', psScript],
        { encoding: 'utf8', windowsHide: true }
      );
      const lines = stdout.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      const selected = lines[lines.length - 1];
      if (!selected || selected === '__CANCELLED__') {
        return null;
      }
      return selected;
    } catch (err) {
      console.error('Failed to open native folder dialog:', err);
      return null;
    }
  } else if (process.platform === 'darwin') {
    const osaScript = `POSIX path of (choose folder with prompt "请选择 Git 仓库文件夹")`;
    try {
      const { stdout } = await execFileAsync('osascript', ['-e', osaScript], { encoding: 'utf8' });
      return stdout.trim() || null;
    } catch {
      return null;
    }
  } else {
    try {
      const { stdout } = await execFileAsync(
        'zenity',
        ['--file-selection', '--directory', '--title=请选择 Git 仓库文件夹'],
        { encoding: 'utf8' }
      );
      return stdout.trim() || null;
    } catch {
      return null;
    }
  }
}
