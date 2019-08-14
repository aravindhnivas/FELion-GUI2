'use strict'

const { remote } = require('electron');
const dialog = remote.dialog;
const mainWindow = remote.getCurrentWindow();

exports.openfiles = function(title, fileTypeName, fileExtensions) {

    return new Promise((resolve, reject) => {

        console.log("[modules]: Sending files");
        let send_obj;
        
        const options = {

            title: title,
            filters: [
                { name: fileTypeName, extensions: fileExtensions },
                { name: 'All Files', extensions: ['*'] }
            ],
            properties: ['openFile', 'multiSelections'],
        };
        
        dialog.showOpenDialog(mainWindow, options).then(files => {
            send_obj = {
                files: files.filePaths,
                location: path.dirname(files.filePaths[0])
            }
            console.log("[modules]: File sent succesfully", send_obj);
            resolve(send_obj);

        }).catch(error => {
            console.log("[modules]: Error occured");
            reject(new Error(error));
            
        })
    })
}