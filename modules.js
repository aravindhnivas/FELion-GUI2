'use strict'

const { remote } = require('electron');
const dialog = remote.dialog;
const mainWindow = remote.getCurrentWindow();
const path = require("path");
const fs = require("fs");

function openfiles(title, fileTypeName, fileExtensions) {

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
            };
            console.log("[modules]: File sent succesfully", send_obj);
            resolve(send_obj);

        }).catch(error => {
            console.log("[modules]: Error occured");
            reject(new Error(error));

        });
    });
};

///////////////////////////////////

//Function to grab all the felix file in the current directory
function getAllFelixFiles(location, filetype) {
    return new Promise((resolve, reject) => {
        let sendobj = {}
        try {


            //Grabbing all the available felix files and updating it to folder_tree
            sendobj.allfelixfiles = fs
                .readdirSync(location)
                .filter(felixfile => felixfile.endsWith(filetype[0]) || felixfile.endsWith(filetype[filetype.length - 1]));

            sendobj.allFolders = fs
                .readdirSync(location)
                .filter(felixfile => fs.statSync(path.join(location, felixfile)).isDirectory());

            resolve(sendobj);
        } catch (error) {
            reject(new Error(error));
        }
    });
}

///////////////////////////////////

//Function to update the folder_tree view
function folder_tree_update(location, folderID, filetype) {

    //Getting all the avaiable felix files (and update it into folder_tree explorer)
    getAllFelixFiles(location, filetype)
        .then((get_obj) => {

            //Clearing existing files in the folder_tree
            while (filebrowser.hasChildNodes()) filebrowser.removeChild(filebrowser.childNodes[0]);

            //Appending folders to filebrowserID
            get_obj.allFolders.forEach(folder => {

                folderID.append(
                    `<button type="button" class="folders btn btn-link" id=${folder} value=${folder}>
                        <img src="../icons/folder.svg">${folder}
                    </button>`
                );
            });

            //A horizontal line to separate folder from files
            folderID.append(`<hr>`)

            //Appending files to filebrowserID
            get_obj.allfelixfiles.forEach(felixfile => {

                folderID.append(
                    `<div class="custom-control custom-checkbox">
                        <input type="checkbox" class="filecheck custom-control-input" id=${felixfile} value="${felixfile}">
                        <label class="custom-control-label" for="${felixfile}" style="color: black">${felixfile}</label>
                    </div>`
                )
            })

            console.log('[UPDATE]: Folder_tree_updated');
        })
        .catch(err => console.log("Couldn't get the felixfiles at this location.\nDetailed result:", err))
}

///////////////////////////////////

///////////////////////////////////

//Function to display location and label
function fileSelectedLabel(location, files, locationLabelID, fileLabelID) {

    files.length == 0 ? filePaths = [] : ""

    locationLabelID
        .attr("class", "alert alert-info")
        .html(`Location: ${location}`);

    fileLabelID
        .attr("class", "alert alert-info")
        .html(`Files: ${files}`);

    console.log('[UPDATE]: File(s) selected label updated');
}

///////////////////////////////////

//Funtion to display no file has been selected
function nofileSelectedLabel(fileLabelID) {

    fileLabelID
        .attr("class", "alert alert-danger")
        .html("No Files selected");
    loading_parent.style.visibility = "hidden";

    console.log('[UPDATE]: No file selected label updated');
}



//saving details to local directory
let save_path = path.resolve(".", ".FELion_save_data.json");


///////////////////////////////////

//Function to ReadFile (from Local disk)
function readfile() {
    return new Promise((resolve, reject) => {
        let received_data;
        fs.readFile(save_path, (err, data) => {

            if (err) {
                reject("[UPDATE]: No files to read from local disk")

            } else {

                console.log('File Read');

                received_data = JSON.parse(data);
                console.log(received_data);
                resolve(received_data);
            }
        });
    })
}
///////////////////////////////////

// Exporting functions from this module
module.exports.openfiles = openfiles;
module.exports.folder_tree_update = folder_tree_update;
module.exports.fileSelectedLabel = fileSelectedLabel;
module.exports.nofileSelectedLabel = nofileSelectedLabel;
module.exports.readfile = readfile;
module.exports.save_path = save_path;