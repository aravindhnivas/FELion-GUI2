"use strict";
//Importing required modules
const { remote } = require("electron");
const path = require("path");
const spawn = require("child_process").spawn;
const fs = require("fs");
const { openfiles } = require("../modules");

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
$(document).ready(function() {
    $("#normline-open-btn").click(openFile);

    $("#help").change(function() {
        let info = $(this).prop("checked");
        console.log("Help: ", info);
        if (info) {
            helpOn();
        } else {
            helpOff();
        }
    });

    $("#goBackFolder").click(function() {
        fileLocation = path.resolve(path.join(fileLocation, "../"));

        //Updating the folder tree for the new location
        folder_tree_update(fileLocation);

        //Updating the display for location and file label
        fileChecked = [];
        filePaths = [];
        baseName = [];
        fileSelectedLabel(fileLocation, baseName);
    });
    readfile();
});
/////////////////////////////////////Initialising END/////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////

///////////////////////////////////////////////////////////////////////////////////////////

//Variables defined
let filePaths;
let fileLocation;
let baseName = [];
let save_data;
let allFiles = [];
let allFolder = [];
let fileChecked = [];

//DOM handler variables
let filebrowser = document.querySelector("#filebrowser");
let normlineBtn = document.querySelector("#normlinePlot-btn");
let loading = document.querySelector("#loading");
let loading_parent = document.querySelector("#loading-parent");

//Other variables
const save_path = path.join(remote.app.getPath("home"), "FELion_save_data.json");

///////////////////////////////////

//Function to ReadFile (from Local disk)
function readfile() {
    fs.readFile(save_path, (err, data) => {
        if (err) {
            save_data = { location: "", filelists: [] };
            nofileSelectedLabel();
        } else {
            save_data = JSON.parse(data);

            fileLocation = save_data.location;
            filePaths = save_data.filelists;
            baseName = save_data.basename;

            fileSelectedLabel(fileLocation, baseName);
            folder_tree_update(fileLocation);

            console.log("Read file", save_data);
        }
    });
}

///////////////////////////////////

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
            fileSelectedLabel(fileLocation, baseName);

            //Updating the folder_tree
            folder_tree_update(fileLocation);

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
            nofileSelectedLabel();
        });
}

///////////////////////////////////

//Function to display location and label
function fileSelectedLabel(location, files) {

    files.length == 0 ? filePaths = [] : ""

    $("#locationLabel")
        .attr("class", "alert alert-info")
        .html(`Location: ${location}`);

    $("#fileLabel")
        .attr("class", "alert alert-info")
        .html(`Files: ${files}`);
}

///////////////////////////////////

//Funtion to display no file has been selected
function nofileSelectedLabel() {

    $("#fileLabel")
        .attr("class", "alert alert-danger")
        .html("No Files selected");
    loading_parent.style.visibility = "hidden";
}

///////////////////////////////////

//Function to grab all the felix file in the current directory
function getAllFelixFiles(location) {
    return new Promise((resolve, reject) => {
        try {
            //Clearing existing files in the folder_tree
            while (filebrowser.hasChildNodes()) filebrowser.removeChild(filebrowser.childNodes[0]);

            //Grabbing all the available felix files and updating it to folder_tree
            allFiles = fs
                .readdirSync(location)
                .filter(felixfile => felixfile.endsWith(".felix") || felixfile.endsWith(".cfelix"));

            allFolder = fs
                .readdirSync(location)
                .filter(felixfile => fs.statSync(path.join(location, felixfile)).isDirectory());

            resolve("Done");
        } catch (error) {
            reject(new Error(error));
        }
    });
}

///////////////////////////////////

//Function to update the folder_tree view
function folder_tree_update(location) {
    //Getting all the avaiable felix files (and update it into folder_tree explorer)
    getAllFelixFiles(location).then(() => {
        //Appending obtained folder as well to navigate around
        allFolder.forEach(folder => {
            $("#filebrowser").append(
                `<button type="button" class="folders btn btn-link" id=${folder} value=${folder}><img
                    src="../icons/folder.svg">${folder}</button>`
            );
        });

        $("#filebrowser").append(`<hr>`);

        //Apending checkbox labels for felix files in folder_tree
        allFiles.forEach(felixfile => {
            if (felixfile.endsWith(".felix") || felixfile.endsWith(".cfelix")) {
                $("#filebrowser").append(
                    `<div class="custom-control custom-checkbox">
                            <input type="checkbox" class="filecheck custom-control-input" id=${felixfile} value="${felixfile}">
                            <label class="custom-control-label" for="${felixfile}" style="color: black">${felixfile}</label>
                        </div>`
                );
            }
        });
    });
}

///////////////////////////////////

//Function to writing the location and filenames last used to a local disk HOME directory
function writeFileToDisk(location, filenames, basenames) {
    //saving data information
    save_data.location = location;
    save_data.filelists = filenames;
    save_data.basename = basenames;

    console.log("Writing file", save_data);

    //Writing file to local disk
    fs.writeFile(save_path, JSON.stringify(save_data), err => {
        console.log("Successfully file information written to local disk", save_data);
        if (err) throw err;
    });
}

///////////////////////////////////

//Handling event when a file is selected from the folder_tree to plot
//Saving the selected file list first
$("#filebrowser").on("click", ".filecheck", event => {
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
    fileSelectedLabel(fileLocation, baseName);

    console.log("Selected files: ", fileChecked);
});

//Handling event when a folder is clicked
$("#filebrowser").on("click", ".folders", event => {
    let folderName = event.target.value;
    console.log("Folder clicked: ", folderName);

    fileLocation = path.join(fileLocation, folderName);

    //Updating the folder tree for the new location
    folder_tree_update(fileLocation);

    //Updating the display for location and file label
    fileChecked = [];
    filePaths = [];
    baseName = [];
    fileSelectedLabel(fileLocation, baseName);
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

            fileSelectedLabel(fileLocation, baseName);
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
            nofileSelectedLabel();
            normlineBtn.className = "btn btn-danger";
            setTimeout(() => (normlineBtn.className = "btn btn-primary"), 2000);
        });
});

$(document).on("click", "#baseline-btn", () => {
    runPlot()
        .then(basePlot())
        .catch(err => {
            console.log("Error occured: ", err);
            nofileSelectedLabel();
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