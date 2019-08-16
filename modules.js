"use strict";

const { remote } = require("electron");
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
                { name: "All Files", extensions: ["*"] }
            ],
            properties: ["openFile", "multiSelections"]
        };

        dialog
            .showOpenDialog(mainWindow, options)
            .then(files => {
                send_obj = {
                    files: files.filePaths,
                    location: path.dirname(files.filePaths[0])
                };
                console.log("[modules]: File sent succesfully", send_obj);
                resolve(send_obj);
            })
            .catch(error => {
                console.log("[modules]: Error occured");
                reject(new Error(error));
            });
    });
}

///////////////////////////////////

//Function to grab all the felix file in the current directory
function getAllFelixFiles(location, filetype) {
    return new Promise((resolve, reject) => {
        console.log("Filetype received: ", filetype);

        let sendobj = {};

        try {
            //Grabbing all the available felix files and updating it to folder_tree
            if (filetype[0] === ".mass") {
                sendobj.allFilenames = fs
                    .readdirSync(location)
                    .filter(filename => filename.endsWith(filetype[0]));
            } else if (filetype[0] === ".felix") {
                sendobj.allFilenames = fs
                    .readdirSync(location)
                    .filter(filename => filename.endsWith(filetype[0]) || filename.endsWith(filetype[1]));
            }

            sendobj.allFolders = fs
                .readdirSync(location)
                .filter(filename => fs.statSync(path.join(location, filename)).isDirectory());

            console.log("[Folder update]: Allfiles ", sendobj.allFilenames);
            console.log("[Folder update]: Allfolder ", sendobj.allFolders);

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
        .then(get_obj => {
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
            folderID.append(`<hr>`);

            //Appending files to filebrowserID
            get_obj.allFilenames.forEach(filename => {
                folderID.append(
                    `<div class="custom-control custom-checkbox">
                        <input type="checkbox" class="filecheck custom-control-input" id=${filename} value="${filename}">
                        <label class="custom-control-label" for="${filename}" style="color: black">${filename}</label>
                    </div>`
                );
            });

            console.log("[UPDATE]: Folder_tree_updated");
        })
        .catch(err =>
            console.log("Couldn't get the felixfiles at this location.\nDetailed result:", err)
        );
}

///////////////////////////////////

///////////////////////////////////

//Function to display location and label
function fileSelectedLabel(location, files, locationLabelID, fileLabelID) {
    files.length == 0 ? (filePaths = []) : "";

    locationLabelID.attr("class", "alert alert-info").html(`Location: ${location}`);

    fileLabelID.attr("class", "alert alert-info").html(`Files: ${files}`);

    console.log("[UPDATE]: File(s) selected label updated");
}

///////////////////////////////////

//Funtion to display no file has been selected
function nofileSelectedLabel(fileLabelID) {
    fileLabelID.attr("class", "alert alert-danger").html("No Files selected");
    loading_parent.style.visibility = "hidden";

    console.log("[UPDATE]: No file selected label updated");
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
                reject(`[UPDATE]: No files to read from local disk: ${err}`);
            } else {
                console.log("File Read");

                received_data = JSON.parse(data);
                console.log(received_data);
                resolve(received_data);
            }
        });
    });
}

//Filexist
function fileExist(filePath) {
    return new Promise((resolve, reject) => {
        fs.access(filePath, fs.F_OK, err => {
            if (err) {
                return reject("JSON backupFile doesn't exist");
            }
            //file exists
            resolve("JSON backupFile exist");
        });
    });
}


/* function ReadfileFromLocalDisk(filetype, folderID, locationLabelID, fileLabelID) {

    let readFileContents;

    const HOME = remote.app.getPath("home");

    const readFileUpdate = (received_data) => {

        console.log("Displaying read datas: ", received_data);

        //Reading file content
        const fileLocation = received_data.filetype[0].location;
        const baseName = received_data.filetype[0].basenames;

        //Displaying label
        fileSelectedLabel(fileLocation, baseName, locationLabelID, fileLabelID);
        folder_tree_update(fileLocation, folderID, filetype);

        console.log("[UPDATE]: File read from local disk", received_data);

        //Reading full filecontents including massfile info for writing details with massfile.
        readFileContents = received_data;
    }

    //////////////////////////////////////////////////////////////////////////////////////////

    //Reading JSON backup file if it exists
    fileExist(save_path)
        .then(status => {

            console.log(status);

            //Reading file from local disk
            readfile($locationLabelID, $fileLabelID, $folderID)
                .then(received_data => {
                    //Update filename and location values from read file and labels
                    readFileUpdate(received_data);
                })
                .catch(err => {
                    console.log(err);

                    //If couldn't read file contents
                    filePaths = [];
                    fileLocation = HOME
                    baseName = [];

                    //Displaying nofile selected label
                    nofileSelectedLabel($fileLabelID);

                    //Displaying default location to user home directory and loading file tree from there
                    fileSelectedLabel(fileLocation, baseName, locationLabelID, fileLabelID);
                    folder_tree_update(fileLocation, folderID, [".felix", ".cfelix"]);
                });
        })
        .catch(err => {
            console.log(err);

            const init_data = {
                felix: { location: HOME, files: [], basenames: [] },
                mass: { location: HOME, files: [], basenames: [] }
            };

            //Creating a backupFile
            fs.writeFile(save_path, JSON.stringify(init_data), err => {
                if (err) throw err;
            });

            console.log("JSON backupFile created");
            readFileUpdate(init_data);
        });

    return Promise.resolve(readFileContents)
} */

///////////////////////////////////

const loadingDisplay = (err = false) => {
    return new Promise((resolve, reject) => {
        if (err) {

            let error_message = "Error! (Some file might be missing)"

            $("#loading")
                .html(`<div class='col-sm-2 alert alert-danger' id='loading'>${error_message}</div>`)
                .css("visibility", "visible")

            reject(error_message)
        } else {

            $("#loading")
                .html("<div class='col-sm-2 alert alert-warning' id='loading'>Please wait...</div>")
                .css("visibility", "visible")
            resolve("Done");
        }

    });
};

const plottedDisplay = () => {
    $("#loading").html("<div class='col-sm-2 alert alert-success' id='loading'>Plotted</div>")
    setTimeout(() => $("#loading").css("visibility", "hidden"), 2000)
}




// Exporting functions from this module
module.exports.openfiles = openfiles;
module.exports.folder_tree_update = folder_tree_update;
module.exports.fileSelectedLabel = fileSelectedLabel;
module.exports.nofileSelectedLabel = nofileSelectedLabel;
module.exports.readfile = readfile;
module.exports.save_path = save_path;
module.exports.fileExist = fileExist;
module.exports.loadingDisplay = loadingDisplay;
module.exports.plottedDisplay = plottedDisplay;