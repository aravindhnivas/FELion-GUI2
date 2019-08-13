'use strict'

const { remote } = require('electron');
const dialog = remote.dialog;
const mainWindow = remote.getCurrentWindow();

exports.openfiles = async function(title, fileTypeName, fileExtensions) {

    console.log("[modules]: Sending files");
    
    const options = {
        title: title,
        filters: [
            { name: fileTypeName, extensions: fileExtensions },
            { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile', 'multiSelections'],
    };
    
    await dialog.showOpenDialog(mainWindow, options).then(files => {

        let send_obj = {
            files: files.filePaths,
            location: path.dirname(files.filePaths[0])
        }

    }).catch(error => {
        return Promise.reject(new Error(error))
    })

    console.log("[modules]: File sent succesfully", send_obj);
    return Promise.resolve(send_obj)
}