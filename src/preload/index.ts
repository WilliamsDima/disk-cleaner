import { contextBridge, ipcRenderer } from 'electron';
import { IpcChannel, type CleanerApi, type ProgressEvent } from '../shared/contract';

const api: CleanerApi = {
  listRules: () => ipcRenderer.invoke(IpcChannel.ListRules),
  getDisk: () => ipcRenderer.invoke(IpcChannel.GetDisk),
  scan: () => ipcRenderer.invoke(IpcChannel.Scan),
  clean: (ids) => ipcRenderer.invoke(IpcChannel.Clean, ids),
  openLog: () => ipcRenderer.invoke(IpcChannel.OpenLog),
  onProgress: (listener) => {
    const wrapped = (_event: unknown, payload: ProgressEvent) => listener(payload);
    ipcRenderer.on(IpcChannel.Progress, wrapped);
    return () => ipcRenderer.removeListener(IpcChannel.Progress, wrapped);
  },
};

contextBridge.exposeInMainWorld('cleaner', api);
