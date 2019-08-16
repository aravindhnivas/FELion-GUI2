"use strict";

//Importing required modules
const { remote } = require("electron");
const path = require("path");
const spawn = require("child_process").spawn;
const fs = require("fs");

const {
    openfiles,
    folder_tree_update,
    fileSelectedLabel,
    nofileSelectedLabel,
    readfile,
    save_path,
    fileExist,
    plottedDisplay,
    loadingDisplay,
    //ReadfileFromLocalDisk
} = require("../modules");

/////////////////////////////////////Initialising BEGIN/////////////////////////////////////

///////////////////////////////////////////////////////////////////////////////////////////

//Variables defined
let filePaths;
let fileLocation;
let baseName = [];
let fileChecked = [];
let readFileContents;
const HOME = remote.app.getPath("home");

//Display label ID's
const $folderID = $("#filebrowser");
const $locationLabelID = $("#locationLabel");
const $fileLabelID = $("#fileLabel");

//DOM handler variables
let normlineBtn = document.querySelector("#normlinePlot-btn");

///////////////////////////////////////////////////////////////////////////////////////////

//Functions
const helpOn = () => {
    $('[data-toggle="tooltip"]').tooltip("enable");
    $('[data-toggle="tooltip"]').tooltip("show");
};

const helpOff = () => {
    $('[data-toggle="tooltip"]').tooltip("hide");
    $('[data-toggle="tooltip"]').tooltip("disable");
};

//Document Ready
$(document).ready(function () {
    $("#normline-open-btn").click(openFile);

    $("#help").change(function () {
        $(this).prop("checked") ? helpOn() : helpOff();
    });
    $("#restart-btn").click(() => location.reload());
});

/////////////////////////////////////Initialising END/////////////////////////////////////
function readFileUpdate(received_data) {

    console.log("Displaying read datas: ", received_data);

    //Reading file content
    filePaths = received_data.felix.files;
    fileLocation = received_data.felix.location;
    baseName = received_data.felix.basenames;

    fileChecked = [];

    //Displaying label
    fileSelectedLabel(fileLocation, baseName, $locationLabelID, $fileLabelID);
    folder_tree_update(fileLocation, $folderID, [".felix", ".cfelix"]);
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
                fileLocation = remote.app.getPath("home");
                baseName = [];

                //Displaying nofile selected label
                nofileSelectedLabel($fileLabelID);

                //Displaying default location to user home directory and loading file tree from there
                fileSelectedLabel(fileLocation, baseName, $locationLabelID, $fileLabelID);
                folder_tree_update(fileLocation, $folderID, [".felix", ".cfelix"]);
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

//Function to writing the location and filenames last used to a local disk HOME directory
function writeFileToDisk(location, files, basenames) {
    let save_data = {
        felix: {
            location: location,
            files: files,
            basenames: basenames
        }
    };
    save_data.mass = readFileContents.mass;

    console.log("Writing file", save_data);

    //Writing file to local disk
    fs.writeFile(save_path, JSON.stringify(save_data), err => {
        console.log("[UPDATE]: Successfully file information written to local disk", save_data);
        if (err) throw err;
    });
}



///////////////////////////////////////////////////////////////////////////////////////////

//Function for Opening file
function openFile() {
    openfiles("Open Felix file(s)", "Felix files", ["felix", "cfelix"])
        .then(get_files => {
            //Setting filename with fullpath and grabbing its location from it
            filePaths = get_files.files;
            fileLocation = get_files.location;

            //Grabing the basename of the files to display it.
            baseName = filePaths.map(file => `${path.basename(file)}, `);

            fileChecked = []; //Making sure it only plots the filePaths

            //Displaying the location and label
            fileSelectedLabel(fileLocation, baseName, $locationLabelID, $fileLabelID);

            //Updating the folder_tree
            folder_tree_update(fileLocation, $folderID, [".felix", ".cfelix"]);

            //Writing the last used location and filename to local disk
            writeFileToDisk(fileLocation, filePaths, baseName);

            //Loading please wait display
            loadingDisplay();

            //Plotting Spectrum
            normplot(filePaths);
        })
        .catch(error => {
            //Catching Error in console log
            console.error("[Normline]: ", error);

            //Displaying NO file is available
            nofileSelectedLabel($fileLabelID);
        });
}

///////////////////////////////////////////////////////////////////////////////////////////



///////////////////////////////////

///////////////////////////////////////////////////////////////////////////////////////////

//Handling event when a file is selected from the folder_tree to plot

//Saving the selected file list first
$folderID.on("click", ".filecheck", event => {
    filePaths = []; //Making sure it only plots the fileChecked

    if (event.target.checked) {
        console.log("[FileChecked]: Adding files", event.target.value);
        fileChecked.push(event.target.value);
        console.log("[FileChecked]: current files: ", fileChecked);
    } else {
        //Else remove the file from the fileChecked array
        for (let fileIndex = 0; fileIndex < fileChecked.length; fileIndex++) {
            if (fileChecked[fileIndex] == event.target.value) {
                console.log("[FileChecked]: Removing file", fileChecked[fileIndex]);
                fileChecked.splice(fileIndex, 1);
                console.log("[FileChecked]: current files: ", fileChecked);
            }
        }
    }

    baseName = fileChecked.map(felixfile => `${felixfile}, `);
    fileSelectedLabel(fileLocation, baseName, $locationLabelID, $fileLabelID);

    console.log("Filechecked selected files: ", fileChecked);
});

///////////////////////////////////////////////////////////////////////////////////////////

//Handling event when a folder or back button is pressed

//Refershing the folder_tree to new location and refreshing the variables
function refresh_folder_tree_forNewLocation(fileLocation, locationLabelID, fileLabelID, folderID) {
    //Updating the display for location and file label
    fileChecked = [];
    filePaths = [];
    baseName = [];
    fileSelectedLabel(fileLocation, baseName, locationLabelID, fileLabelID);

    console.log(
        "[UPDATE]: Location change\nFileChecked: ",
        fileChecked,
        "filePaths: ",
        filePaths,
        "baseName: ",
        baseName
    );
    //Updating the folder tree for the new location
    folder_tree_update(fileLocation, folderID, [".felix", ".cfelix"]);
}

///////////////////////////////////////////////////////////////////////////////////////////

//Handling event when a folder is clicked
$folderID.on("click", ".folders", event => {
    let folderName = event.target.value;
    console.log("Folder clicked: ", folderName);

    fileLocation = path.join(fileLocation, folderName);
    refresh_folder_tree_forNewLocation(fileLocation, $locationLabelID, $fileLabelID, $folderID);
});

///////////////////////////////////////////////////////////////////////////////////////////

//Handling event when back button is pressed
$("#goBackFolder").click(function () {
    fileLocation = path.resolve(path.join(fileLocation, "../"));
    refresh_folder_tree_forNewLocation(fileLocation, $locationLabelID, $fileLabelID, $folderID);
});

///////////////////////////////////////////////////////////////////////////////////////////

function runPlot() {
    return new Promise((resolve, reject) => {
        if (!fileChecked.length == 0) {
            filePaths = fileChecked.map(felixfile => path.join(fileLocation, felixfile));

            fileSelectedLabel(fileLocation, baseName, $locationLabelID, $fileLabelID);
            writeFileToDisk(fileLocation, filePaths, baseName);
            resolve("completed");
        } else if (!filePaths.length == 0) {
            fileSelectedLabel(fileLocation, baseName, $locationLabelID, $fileLabelID);
            writeFileToDisk(fileLocation, filePaths, baseName);
            resolve("completed");
        } else {
            reject(new Error("No File selected"));
        }
    });
}

$(document).on("click", "#normlinePlot-btn", () => {
    runPlot()
        .then(() => {
            loadingDisplay().then(normplot(filePaths));
        })
        .catch(err => {
            console.log("Error occured: ", err);
            nofileSelectedLabel($fileLabelID);
            normlineBtn.className = "btn btn-danger";
            setTimeout(() => (normlineBtn.className = "btn btn-primary"), 2000);
        });
});

$(document).on("click", "#baseline-btn", () => {
    runPlot()
        .then(basePlot())
        .catch(err => {
            console.log("Error occured: ", err);
            nofileSelectedLabel($fileLabelID);
            baselineBtn.className = "btn btn-danger";
            setTimeout(() => (baselineBtn.className = "btn btn-primary"), 2000);
        });
});

///////////////////////////////////////////////////////////////////////////////////////////

let dataFromPython_norm;
let footer = document.querySelector("#footer");

let error_occured = false;
const pythonPath = path.join(__dirname, "..", "python3.7", "python");

function plot(mainTitle, xtitle, ytitle, data, plotArea, subplot = false, subplot_obj = null) {
    if (!subplot) {
        let dataLayout = {
            title: mainTitle,
            xaxis: {
                title: xtitle
            },
            yaxis: {
                title: ytitle
            }
        };

        let dataPlot = [];

        for (let x in data) {
            dataPlot.push(data[x]);
        }
        Plotly.newPlot(plotArea, dataPlot, dataLayout);
    } else {
        let dataLayout = {
            title: mainTitle,

            xaxis: {
                domain: [0, 0.5],
                title: xtitle
            },
            yaxis: {
                title: ytitle
            },

            xaxis2: {
                domain: [0.5, 1],
                title: subplot_obj["x2"]
            },
            yaxis2: {
                anchor: "x2",
                title: subplot_obj["y2"]
            }
        };

        let dataPlot1 = [];
        for (let x in data) {
            dataPlot1.push(data[x]);
        }

        let dataPlot2 = [];
        for (let x in subplot_obj["data2"]) {
            dataPlot2.push(subplot_obj["data2"][x]);
        }

        Plotly.newPlot(plotArea, dataPlot1.concat(dataPlot2), dataLayout);
    }
}
/////////////////////////////////////////////////////////

function normplot(felixfiles) {
    const py = spawn(pythonPath, [path.join(__dirname, "./normline.py"), [felixfiles, delta.value]]);

    py.stdout.on("data", data => {
        try {
            console.log("Receiving data");
            dataFromPython_norm = data.toString("utf8");
            //console.log("Before JSON parse (from python):\n" + dataFromPython_norm)
            dataFromPython_norm = JSON.parse(dataFromPython_norm);
            console.log("After JSON parse :" + dataFromPython_norm);

            /////////////////////////////////////////////////////////
            plot(
                "Baseline Corrected",
                "Wavelength (cm-1)",
                "Intesity",
                dataFromPython_norm["base"],
                "bplot"
            );
            plot(
                `Normalized Spectrum (delta=${delta.value})`,
                "Calibrated Wavelength (cm-1)",
                "Normalised Intesity",
                dataFromPython_norm["felix"],
                "nplot"
            );
            plot(
                `Average of Normalised Spectrum (delta=${delta.value})`,
                "Calibrated Wavelength (cm-1)",
                "Normalised Intesity",
                dataFromPython_norm["average"],
                "avgplot"
            );

            //Spectrum and Power Analyer
            plot(
                "Spectrum and Power Analyser",
                "Wavelength set (cm-1)",
                "SA (cm-1)",
                dataFromPython_norm["SA"],
                "saPlot",
                true, {
                    x2: "Wavelength (cm-1)",
                    y2: "Power (mJ)",
                    data2: dataFromPython_norm["pow"]
                }
            );

            console.log("Graph Plotted");
        } catch (err) {
            console.error("Error Occured in javascript code: " + err.message);
        }

        /////////////////////////////////////////////////////////
    });

    py.stderr.on("data", data => {
        error_occured = true;
        console.error(`Error from python: ${data}`);
    });

    py.on("close", () => {
        console.log("Returned to javascript");

        if (error_occured) {
            console.log(`Error occured ${error_occured}`);
            loadingDisplay(true)

            error_occured = false;
        } else {
            footer.parentElement.className = "card-footer text-muted";
            footer.parentElement.style.position = "relative";
            plottedDisplay()
        }
    });
}
/////////////////////////////////////////////////////////

let baselineBtn = document.querySelector("#baseline-btn");

function basePlot(e) {
    const py = spawn(pythonPath, [path.join(__dirname, "./baseline.py"), [filePaths]]);

    py.stdout.on("data", data => {
        try {
            let logFromPython = data.toString("utf8");
            console.log("From python:\n" + logFromPython);
        } catch (err) {
            console.log("Error Occured in javascript code: " + err.message);
        }
    });

    py.stderr.on("data", data => {
        console.error(`Error from python: ${data}`);
    });

    py.on("close", () => {
        console.log("Returned to javascript");
    });
}
/////////////////////////////////////////////////////////