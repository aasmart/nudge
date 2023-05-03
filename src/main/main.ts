const { app, BrowserWindow, Menu, nativeImage, Tray, ipcMain } = require('electron')
const { platform } = require('os')
const path = require('path')

let tray: any = null
let win: any = null

function createTray () {
  const icon = path.join(app.getAppPath(), 'assets/icon.png')
  const trayicon = nativeImage.createFromPath(icon)
  trayicon.resize({ width: 16 })
  trayicon.setTemplateImage(true)

  tray = new Tray(trayicon)

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show App',
      click: () => {
        win.show()
      }
    },
    {
      label: 'Quit',
      click: () => {
        app.quit() // actually quit the app.
      }
    },
  ])

  tray.setContextMenu(contextMenu)
}

const createWindow = () => {
    if (!tray)
        createTray()

    win = new BrowserWindow({
        width: 1000,
        height: 900,
        minWidth: 550,
        minHeight: 375,
        icon: 'assets/icon.png',
        autoHideMenuBar: true,
        center: true,
        webPreferences: {
          preload: path.join(app.getAppPath(), 'src/preload/preload.js'),
          nodeIntegration: true,
          contextIsolation: false,
        }
    })
    
    win.maximize();
    win.loadFile('src/main/index.html')

    win.on('close', (event: any) => {
        if(app.quitting) {
          win.quit() 
          return;
        }

        event.preventDefault()
        win.hide()
    })

    ipcMain.on('open-page', (event: any, name: any) => {
      win.loadFile(`src/main/${name}.html`)
    })

    ipcMain.on('show-window', (event: any, name: any) => {
      if(name === 'main') win.show()
    })
}

app.whenReady().then(() => {
    createWindow()

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

app.setLoginItemSettings({
  openAtLogin: true    
})

app.on('before-quit', () => app.quitting = true)