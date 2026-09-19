// Proceso principal de Electron: abre la aplicación de biblioteca (Angular ya compilada)
// en una ventana nativa. No usa Node dentro de la página (contextIsolation) porque la app
// solo necesita IndexedDB del propio navegador embebido.
const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('node:path');

const RUTA_INDEX = path.join(__dirname, '..', 'dist', 'biblioteca', 'browser', 'index.html');
// Modo de evidencia: `electron . --captura=ruta.png` guarda una captura de la ventana y cierra.
const ARG_CAPTURA = process.argv.find((a) => a.startsWith('--captura='));

function crearVentana() {
  const ventana = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Biblioteca: gestión de préstamos',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Los enlaces externos se abren en el navegador del sistema, no dentro de la app.
  ventana.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (ARG_CAPTURA) {
    ventana.webContents.once('did-finish-load', async () => {
      try {
        await new Promise((r) => setTimeout(r, 3000));
        const imagen = await ventana.webContents.capturePage();
        require('node:fs').writeFileSync(ARG_CAPTURA.slice('--captura='.length), imagen.toPNG());
        console.log('captura guardada');
      } catch (e) {
        console.error('captura fallida', e);
      }
      app.exit(0);
    });
  }

  ventana.loadFile(RUTA_INDEX);
}

// Menú mínimo en español (Archivo, Ver) para que la app se sienta nativa.
function crearMenu() {
  const plantilla = [
    {
      label: 'Archivo',
      submenu: [{ role: 'reload', label: 'Recargar' }, { type: 'separator' }, { role: 'quit', label: 'Salir' }],
    },
    {
      label: 'Ver',
      submenu: [
        { role: 'zoomIn', label: 'Acercar' },
        { role: 'zoomOut', label: 'Alejar' },
        { role: 'resetZoom', label: 'Tamaño normal' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Pantalla completa' },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(plantilla));
}

app.whenReady().then(() => {
  crearMenu();
  crearVentana();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) crearVentana();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
