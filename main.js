// \web\main.js
const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');
const os = require('os');
const { desktopCapturer } = require('electron');

const userDataPath1 = path.join(os.homedir(), 'MyElectronAppData_Client1');
const userDataPath2 = path.join(os.homedir(), 'MyElectronAppData_Client2');

let mainWindow1;
let mainWindow2;

// Bỏ qua các lỗi chứng chỉ tự ký
app.commandLine.appendSwitch('ignore-certificate-errors', 'true');

function createWindow(clientNumber) {
    const userDataPath = clientNumber === 1 ? userDataPath1 : userDataPath2;
    
    app.setPath('userData', userDataPath);

    let mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true,
        },
    });

    // Load trang login
    mainWindow.loadURL('https://localhost:3000/login.html');

    mainWindow.webContents.openDevTools();
    
    mainWindow.on('closed', function () {
        mainWindow = null;
    });

    return mainWindow;
}

app.on('ready', () => {
    // Tạo 2 cửa sổ client riêng biệt
    mainWindow1 = createWindow(1);
    mainWindow2 = createWindow(2);
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', function () {
    if (mainWindow1 === null) {
        mainWindow1 = createWindow(1);
    }
    if (mainWindow2 === null) {
        mainWindow2 = createWindow(2);
    }
});

// Lắng nghe yêu cầu từ renderer để chia sẻ màn hình
ipcMain.handle('get-sources', async (event) => {
    // Lấy danh sách nguồn màn hình và cửa sổ
    const inputSources = await desktopCapturer.getSources({ types: ['window', 'screen'] });
    return inputSources;
});


