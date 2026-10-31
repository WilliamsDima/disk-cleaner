import { app, BrowserWindow, ipcMain, shell, type IpcMainInvokeEvent } from 'electron';
import path from 'node:path';
import { IpcChannel, type ProgressEvent } from '../shared/contract';
import { CleanerService } from './application/cleaner-service';
import { NodeFileSystem } from './infrastructure/node-file-system';
import {
  createReportWriter,
  createSandboxEnv,
  createSystemEnv,
  listProcesses,
  readDisk,
} from './infrastructure/system';
import { RULES } from './rules/catalog';

const WINDOW_BACKGROUND = '#0f1115';
let mainWindow: BrowserWindow | null = null;
let lastLogPath: string | null = null;

/** Песочница доступна только при разработке: в собранном приложении пути всегда настоящие. */
function sandboxRoot(): string | null {
  const sandbox = process.env.DISK_CLEANER_SANDBOX;
  return sandbox && !app.isPackaged ? sandbox : null;
}

function isTrustedSender(event: IpcMainInvokeEvent): boolean {
  return event.sender === mainWindow?.webContents;
}

function registerIpc(service: CleanerService): void {
  const handle = <T>(channel: string, handler: (arg: unknown) => Promise<T> | T) => {
    ipcMain.handle(channel, (event, arg: unknown) => {
      if (!isTrustedSender(event)) throw new Error('Запрос не от окна приложения');
      return handler(arg);
    });
  };
  handle(IpcChannel.ListRules, () => service.listRules());
  handle(IpcChannel.GetDisk, () => readDisk());
  handle(IpcChannel.Scan, () => service.scan());
  handle(IpcChannel.Clean, async (ids) => {
    const report = await service.clean(ids);
    lastLogPath = report.logPath;
    return report;
  });
  handle(IpcChannel.OpenLog, async () => {
    if (lastLogPath) await shell.openPath(lastLogPath);
  });
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1040,
    height: 760,
    minWidth: 820,
    minHeight: 600,
    show: false,
    title: 'Чистка диска',
    backgroundColor: WINDOW_BACKGROUND,
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: WINDOW_BACKGROUND, symbolColor: '#aeb4c0', height: 40 },
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  mainWindow.once('ready-to-show', () => mainWindow?.show());
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event) => event.preventDefault());

  const devUrl = process.env.ELECTRON_RENDERER_URL;
  if (devUrl && !app.isPackaged) void mainWindow.loadURL(devUrl);
  else void mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
}

void app.whenReady().then(() => {
  const emit = (event: ProgressEvent) => mainWindow?.webContents.send(IpcChannel.Progress, event);
  const sandbox = sandboxRoot();
  const service = new CleanerService(
    { env: sandbox ? createSandboxEnv(sandbox) : createSystemEnv(), fs: new NodeFileSystem(), listProcesses },
    RULES,
    emit,
    createReportWriter(path.join(sandbox ?? app.getPath('userData'), 'logs')),
  );
  registerIpc(service);
  createWindow();
});

app.on('window-all-closed', () => app.quit());
