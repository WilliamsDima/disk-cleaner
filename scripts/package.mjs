// Собирает переносимую папку с DiskCleaner.exe в release/.
import { packager } from '@electron/packager';

const [appPath] = await packager({
  dir: '.',
  out: 'release',
  name: 'DiskCleaner',
  platform: 'win32',
  arch: 'x64',
  overwrite: true,
  asar: true,
  // Vite собирает все зависимости в out/, больше приложению ничего не нужно.
  prune: false,
  ignore: (file) => !(file === '' || file === '/package.json' || file === '/out' || file.startsWith('/out/')),
  win32metadata: { ProductName: 'Чистка диска', FileDescription: 'Чистка диска' },
});

console.log(`Готово: ${appPath}\\DiskCleaner.exe`);
