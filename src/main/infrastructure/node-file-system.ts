import { promises as fsp, type Dirent } from 'node:fs';
import type { DirEntryInfo, EntryKind, FileInfo, FileSystem } from '../domain/types';

function kindOfDirent(entry: Dirent): EntryKind {
  if (entry.isSymbolicLink()) return 'link';
  if (entry.isDirectory()) return 'directory';
  if (entry.isFile()) return 'file';
  return 'other';
}

export class NodeFileSystem implements FileSystem {
  async readDir(path: string): Promise<DirEntryInfo[]> {
    const entries = await fsp.readdir(path, { withFileTypes: true });
    return entries.map((entry) => ({ name: entry.name, kind: kindOfDirent(entry) }));
  }

  async stat(path: string): Promise<FileInfo> {
    const info = await fsp.lstat(path);
    return { size: info.size, mtimeMs: info.mtimeMs };
  }

  async kindOf(path: string): Promise<EntryKind | null> {
    try {
      const info = await fsp.lstat(path);
      if (info.isSymbolicLink()) return 'link';
      if (info.isDirectory()) return 'directory';
      return info.isFile() ? 'file' : 'other';
    } catch {
      return null;
    }
  }

  readText(path: string): Promise<string> {
    return fsp.readFile(path, 'utf8');
  }

  async deleteFile(path: string): Promise<void> {
    try {
      await fsp.unlink(path);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EPERM') throw error;
      // На Windows так падает файл с атрибутом «только чтение».
      await fsp.chmod(path, 0o666);
      await fsp.unlink(path);
    }
  }

  deleteEmptyDir(path: string): Promise<void> {
    return fsp.rmdir(path);
  }
}
