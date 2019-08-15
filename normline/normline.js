"use strict";
//Importing required modules
const { remote } = require("electron");
const path = require("path");
const spawn = require("child_process").spawn;
const fs = require("fs");
const { openfiles, folder_tree_update, fileSelectedLabel, nofileSelectedLabel, readfile, writeFileToDisk } = require("../modules");

/////////////////////////////////////Initialising BEGIN/////////////////////////////////////

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
        let info = $(this).prop("checked");
        console.log("Help: ", info);
        if (info) {
            helpOn();
        } else {
            helpOff();
        }
    });

    $("#goBackFolder").click(function () {
        fileLocation = path.resolve(path.join(fileLocation, "../"));

        //Updating the folder tree for the new location
        folder_tree_update(fileLocation, $folderID);

        //Updating the display for location and file label
        fileChecked = [];
        filePaths = [];
        baseName = [];
        fileSelectedLabel(fileLocation, baseName, $locationLabelID, $fileLabelID);
    });

    //Reading file from local disk
    readfile($locationLabelID, $fileLabelID, $folderID)
        .then(received_data => {

            filePaths = received_data.felixfiles;
            fileLocation = received_data.location;
            baseName = received_data.basenames;
            fileSelectedLabel(fileLocation, baseName, $locationLabelID, $fileLabelID);
            folder_tree_update(fileLocation, $folderID);

            console.log("[UPDATE]: File read from local disk", received_data);

        })
        .catch(err => {

            filePaths = []
            fileLocation = ''
            baseName = []
            nofileSelectedLabel(fileLabelID)

            console.log(err);
        })
});
/////////////////////////////////////Initialising END/////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////

///////////////////////////////////////////////////////////////////////////////////////////

//Variables defined
let filePaths;
let fileLocation;
let baseName = [];
let fileChecked = [];

//Display label ID's
const $folderID = $("#filebrowser")
const $locationLabelID = $("#locationLabel")
const $fileLabelID = $("#fileLabel")

//DOM handler variables
let normlineBtn = document.querySelector("#normlinePlot-btn");
let loading = document.querySelector("#loading");
let loading_parent = document.querySelector("#loading-parent");

const loadingDisplay = () => {
    return new Promise(resolve => {
        loading_parent.style.visibility = "visible";
        loading_parent.className = "alert alert-warning";
        loading.innerText = "Please wait...";
        resolve("Done");
    });
};

//Function for Opening file
function openFile() {
    openfiles("Open Felix file(s)", "Felix files", ["felix", "cfelix"])
        .then(get_files => {
            //Setting filename with fullpath and grabbing its location from it
            filePaths = get_files.files;
            fileLocation = get_files.location;

            //Grabing the basename of the files to display it.
            baseName = filePaths.map(file => `${path.basename(file)}, `);

            //Displaying the location and label
            fileSelectedLabel(fileLocation, baseName, $locationLabelID, $fileLabelID);

            //Updating the folder_tree
            folder_tree_update(fileLocation, $folderID);

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

///////////////////////////////////

//Handling event when a file is selected from the folder_tree to plot
//Saving the selected file list first
$folderID.on("click", ".filecheck", event => {
    if (event.target.checked) {
        //If file has checked value then append the file to fileChecked array
        fileChecked.push(event.target.value);
    } else {
        //Else remove the file from the fileChecked array
        for (let fileIndex = 0; fileIndex < fileChecked.length; fileIndex++) {
            if (fileChecked[fileIndex] == event.target.value) {
                console.log('Removing file: ', fileChecked[fileIndex]);
                fileChecked.splice(fileIndex, 1)
            };
        }
    }

    baseName = fileChecked.map(file => `${path.basename(file)}, `);
    fileSelectedLabel(fileLocation, baseName, $locationLabelID, $fileLabelID);

    console.log("Selected files: ", fileChecked);
});

//Handling event when a folder is clicked
$folderID.on("click", ".folders", event => {
    let folderName = event.target.value;
    console.log("Folder clicked: ", folderName);

    fileLocation = path.join(fileLocation, folderName);

    //Updating the folder tree for the new location
    folder_tree_update(fileLocation, $folderID);

    //Updating the display for location and file label
    fileChecked = [];
    filePaths = [];
    baseName = [];
    fileSelectedLabel(fileLocation, baseName, $locationLabelID, $fileLabelID);
});

///////////////////////////////////

function runPlot() {
    return new Promise((resolve, reject) => {
        if (!fileChecked.length == 0) {
            //console.log('Files present');

            filePaths = [];
            fileChecked.forEach(felixfile => {
                felixfile = path.join(fileLocation, felixfile);
                filePaths.push(felixfile);
            });

            baseName = [];
            filePaths.forEach(x => baseName.push(`${path.basename(x)}, `));

            fileSelectedLabel(fileLocation, baseName, $locationLabelID, $fileLabelID);
            writeFileToDisk(fileLocation, filePaths, baseName);
            resolve("completed");
        } else if (!filePaths.length == 0) { resolve("completed") } else { reject(new Error("No File selected")) }
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

/////////////////////////////////////////////////////////

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

    //loading_parent.className = "alert alert-primary";
    //loading.innerText = "Loading";

    py.stdout.on("data", data => {
        //loading_parent.style.visibility = "visible";
        //loading.innerText = "Loading";

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
            loading_parent.style.visibility = "visible";
            loading_parent.className = "alert alert-danger";
            loading.innerText = "Error! (Some file might be missing)";

            error_occured = false;
        } else {
            footer.parentElement.className = "card-footer text-muted";
            footer.parentElement.style.position = "relative";
            loading_parent.style.visibility = "hidden";
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