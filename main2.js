// const { app, BrowserWindow } = require('electron');
// const { MongoClient } = require('mongodb');
// const robot = require('@jitsi/robotjs');  // Use the forked package

// // MongoDB URI and Collection
// const MONGODB_URI = 'mongodb+srv://USER:PASSWORD@cluster.mongodb.net/keylogger?retryWrites=true&w=majority';
// const COLLECTION_NAME = 'keylog-responses';

// // Fetch data from MongoDB
// async function fetchDataFromMongoDB() {
//     const client = new MongoClient(MONGODB_URI, {
//         useNewUrlParser: true,
//         useUnifiedTopology: true,
//     });

//     try {
//         await client.connect();
//         const database = client.db(); // Use the default database in the URI
//         const collection = database.collection(COLLECTION_NAME);
        
//         // Fetch the first document (modify as per your requirement)
//         const document = await collection.findOne({});
//         if (document && document.response) {
//             console.log(`Fetched from MongoDB: ${document.response}`);
//             return document.response;
//         } else {
//             console.log('No data found in MongoDB.');
//             return '';
//         }
//     } catch (error) {
//         console.error('Error fetching from MongoDB:', error);
//         return '';
//     } finally {
//         await client.close();
//     }
// }

// // Simulate typing the data
// async function typeData() {
//     const dataToType = await fetchDataFromMongoDB();
//     if (dataToType) {
//         console.log('Typing data...');
//         robot.typeString(dataToType);  // Use the robotjs forked package to type
//     } else {
//         console.log('No data to type.');
//     }
// }

// // Run the app in the background
// app.on('ready', () => {
//     console.log('App is running as a background service.');

//     // Create a hidden BrowserWindow (not visible to the user)
//     const win = new BrowserWindow({
//         show: false,
//         webPreferences: {
//             nodeIntegration: true,
//         },
//     });

//     // Periodically fetch and type data (adjust interval as needed)
//     setInterval(async () => {
//         await typeData();
//     }, 10000); // Fetch and type every 10 seconds
// });

// // Quit the app when all windows are closed
// app.on('window-all-closed', () => {
//     if (process.platform !== 'darwin') {
//         app.quit();
//     }
// });




const { app, globalShortcut, BrowserWindow } = require('electron');
const { MongoClient } = require('mongodb');
const robot = require('@jitsi/robotjs');  // Use the forked package

// MongoDB URI and Collection
const MONGODB_URI = 'mongodb+srv://USER:PASSWORD@cluster.mongodb.net/keylogger?retryWrites=true&w=majority';
const COLLECTION_NAME = 'keylog-responses';

// Fetch data from MongoDB
async function fetchDataFromMongoDB() {
    const client = new MongoClient(MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });

    try {
        await client.connect();
        const database = client.db(); // Use the default database in the URI
        const collection = database.collection(COLLECTION_NAME);
        
        // Fetch the first document (modify as per your requirement)
        const document = await collection.findOne({});
        if (document && document.response) {
            console.log(`Fetched from MongoDB: ${document.response}`);
            return document.response;
        } else {
            console.log('No data found in MongoDB.');
            return '';
        }
    } catch (error) {
        console.error('Error fetching from MongoDB:', error);
        return '';
    } finally {
        await client.close();
    }
}

// Simulate typing the data
async function typeData() {
    const dataToType = await fetchDataFromMongoDB();
    if (dataToType) {
        console.log('Typing data...');
        robot.typeString(dataToType);  // Use the robotjs forked package to type
    } else {
        console.log('No data to type.');
    }
}

// Run the app in the background
app.on('ready', () => {
    console.log('App is running as a background service.');

    // Create a hidden BrowserWindow (not visible to the user)
    const win = new BrowserWindow({
        show: false,  // Make the window hidden
        webPreferences: {
            nodeIntegration: true,
        },
    });

    // Register the keyboard shortcut (Ctrl + Shift + 1)
    const ret = globalShortcut.register('Control+Shift+1', async () => {
        console.log('Shortcut pressed: Ctrl + Shift + 1');
        await typeData();  // Call the typing function when shortcut is pressed
    });

    if (!ret) {
        console.log('Registration failed');
    }

    // Check if the shortcut is successfully registered
    console.log(globalShortcut.isRegistered('Control+Shift+1'));

    // Quit the app when all windows are closed
    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') {
            app.quit();
        }
    });
});

// Quit the app when all windows are closed
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
