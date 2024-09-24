// \web\main.js

const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');
const os = require('os');
const { desktopCapturer } = require('electron');

const userDataPath1 = path.join(os.homedir(), 'MyElectronAppData_Client1');
const userDataPath2 = path.join(os.homedir(), 'MyElectronAppData_Client2');
const userDataPath3 = path.join(os.homedir(), 'MyElectronAppData_Client3'); // Thêm đường dẫn cho Client 3

let mainWindow1;
let mainWindow2;
let mainWindow3; // Thêm biến cho cửa sổ thứ 3

// Bỏ qua các lỗi chứng chỉ tự ký
app.commandLine.appendSwitch('ignore-certificate-errors', 'true');

// Hàm tạo cửa sổ với session và userDataPath riêng biệt
function createWindow(clientNumber) {
    const userDataPath = clientNumber === 1 ? userDataPath1 : (clientNumber === 2 ? userDataPath2 : userDataPath3); // Thêm cho Client 3
    
    // Thiết lập đường dẫn userData riêng cho từng cửa sổ
    app.setPath('userData', userDataPath);
    
    // Tạo session riêng cho mỗi client
    const partition = `persist:client_${clientNumber}`; // Tạo partition riêng biệt cho mỗi client
    const customSession = session.fromPartition(partition, { cache: true });

    let mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true,
            session: customSession // Sử dụng session riêng
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
    // Tạo 3 cửa sổ client riêng biệt
    mainWindow1 = createWindow(1);
    mainWindow2 = createWindow(2);
    mainWindow3 = createWindow(3); // Tạo cửa sổ thứ 3
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
    if (mainWindow3 === null) {
        mainWindow3 = createWindow(3); // Kích hoạt lại cửa sổ thứ 3 nếu đã đóng
    }
});

// Lắng nghe yêu cầu từ renderer để chia sẻ màn hình
ipcMain.handle('get-sources', async (event) => {
    // Lấy danh sách nguồn màn hình và cửa sổ
    const inputSources = await desktopCapturer.getSources({ types: ['window', 'screen'] });
    return inputSources;
});

