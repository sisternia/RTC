// \web\main.js
const { app, BrowserWindow, session } = require('electron');
const path = require('path');
const os = require('os');

// Tạo 2 đường dẫn dữ liệu khác nhau cho mỗi cửa sổ
const userDataPath1 = path.join(os.homedir(), 'MyElectronAppData_Client1');
const userDataPath2 = path.join(os.homedir(), 'MyElectronAppData_Client2');

let mainWindow1;
let mainWindow2;

// Bỏ qua các lỗi chứng chỉ tự ký
app.commandLine.appendSwitch('ignore-certificate-errors', 'true');

function createWindow(clientNumber) {
    const userDataPath = clientNumber === 1 ? userDataPath1 : userDataPath2;
    
    // Thiết lập đường dẫn userData riêng cho mỗi client
    app.setPath('userData', userDataPath);

    let mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            session: session.fromPartition(`persist:client${clientNumber}`),  // Tạo session riêng
        },
    });

    // Thay đổi địa chỉ IP từ 'localhost' thành '192.168.1.4'
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

