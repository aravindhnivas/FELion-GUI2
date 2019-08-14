'use strict'
//Importing required modules
const { remote } = require('electron');
const path = require('path')
const spawn = require("child_process").spawn;
const fs = require('fs')
const { openfiles } = require('../modules');

/////////////////////////////////////////////////////////
const helpOn = () => {
    $('[data-toggle="tooltip"]').tooltip("enable");
    $('[data-toggle="tooltip"]').tooltip("show");
}

const helpOff = () => {
    $('[data-toggle="tooltip"]').tooltip("hide");
    $('[data-toggle="tooltip"]').tooltip("disable");
}

/////////////////////////////////////////////////////////
$(document).ready(function () {

    $("#normline-open-btn").click(openFile);

    $('#help').change(function () {
        let info = $(this).prop('checked')
        console.log("Help: ", info)
        if (info) { helpOn() } else { helpOff() }
    });

    $('#goBackFolder').click(function () {
        fileLocation = path.resolve(path.join(fileLocation, '../'));
        refreshLocation(fileLocation)
    })
    readfile();
})

/////////////////////////////////////////////////////////
let filePaths;
let nofile = true;
let fileLocation;
let baseName = [];
let save_data;

let locationLabel = document.querySelector("#locationLabel")
let fileLabel = document.querySelector("#fileLabel")
const save_path = path.join(remote.app.getPath('documents'), 'FELion_save_data.json')
let filebrowser = document.querySelector("#filebrowser")
let normlineBtn = document.querySelector("#normlinePlot-btn")
let allFiles = [];
let allFolder = []
let fileChecked = [];

$("#filebrowser").on('click', '.filecheck', (event) => {

    fileChecked = []
    if (event.target.checked) {
        fileChecked.push(event.target.value)
    } else {
        for (let fileIndex = 0; fileIndex < fileChecked.length; fileIndex++) {
            if (fileChecked[fileIndex] == event.target.value) fileChecked.splice(fileIndex, 1)
        }
    }
    console.log("Update: ", fileChecked)

    if (!fileChecked.length == 0) {
        baseName = [];
        fileChecked.forEach(x => baseName.push(`${path.basename(x)}, `))
        fileSelected(fileLocation, baseName)
    }
})

$("#filebrowser").on('click', '.folders', (event) => {
    let folderName = event.target.value
    console.log("Folder clicked: ", folderName)

    fileLocation = path.join(fileLocation, folderName)
    refreshLocation(fileLocation)
})

function runPlot() {

    return new Promise((resolve, reject) => {
        if (!fileChecked.length == 0) {

            filePaths = []
            fileChecked.forEach(felixfile => {
                felixfile = path.join(fileLocation, felixfile)
                filePaths.push(felixfile)
            })

            baseName = [];
            filePaths.forEach(x => baseName.push(`${path.basename(x)}, `))

            fileSelected(fileLocation, baseName)
            writeFileToDisk(fileLocation, filePaths, baseName)
            resolve("completed")

        } else if (!filePaths == 0) {
            resolve("Completed")
        } else {
            nofileSelected()
            reject('No File selected')
        }

    }
    )

}

$(document).on('click', '#normlinePlot-btn', () => {
    runPlot().then(normplot()).catch(err => {
        console.log("No files selected");
        alert("Please select a file")
    })
})

$(document).on('click', '#baseline-btn', () => {
    runPlot().then(basePlot()).catch(err => {
        console.log("No files selected");
        alert("Please select a file")
    }
    )
})

function readfile() {

    fs.readFile(save_path, (err, data) => {
        if (err) {
            save_data = { location: "", filelists: [] };
            nofileSelected();

        } else {
            save_data = JSON.parse(data);

            fileLocation = save_data.location
            filePaths = save_data.filelists;
            baseName = save_data.basename

            refreshLocation(fileLocation)
            fileSelected(fileLocation, baseName)
            console.log('Read file', save_data);

        }
    })
};

function writeFileToDisk(location, files, base) {
    // Writing data information to local disk
    save_data.location = location
    save_data.filelists = files
    save_data.basename = base

    console.log('Writing file', save_data)

    fs.writeFile(save_path, JSON.stringify(save_data), err => {
        if (err) throw err;
        console.log('Successfully wrote file', save_data);
    })

}

function browser_update() {

    allFolder.forEach(folder => {

        $('#filebrowser').append(
            `<button type="button" class="folders btn btn-link" id=${folder} value=${folder}><img
            src="../icons/folder.svg">${folder}</button>`
        )
    })
    $('#filebrowser').append(`<hr>`)

    allFiles.forEach((felixfile) => {
        if (felixfile.endsWith(".felix") || felixfile.endsWith(".cfelix")) {

            //File Browser (NEW)
            $('#filebrowser').append(
                `<div class="custom-control custom-checkbox">
                    <input type="checkbox" class="filecheck custom-control-input" id=${felixfile} value="${felixfile}">
                    <label class="custom-control-label" for="${felixfile}" style="color: black">${felixfile}</label>
                </div>`
            )
        }
    })
}

function nofileSelected() {
    nofile = true;
    locationLabel.innerHTML = `Select location`;
    fileLabel.innerHTML = `No Files selected`
    locationLabel.className = "alert alert-danger"
    fileLabel.className = "alert alert-danger"
}

function fileSelected(location, files) {

    nofile = false;
    locationLabel.innerHTML = `Location: ${location}`;
    locationLabel.className = "alert alert-info"
    fileLabel.innerHTML = `Files: ${files}`
    fileLabel.className = "alert alert-info"
}

function refreshLocation(location) {

    // Clearing filename list in Select file box
    while (filebrowser.hasChildNodes()) { filebrowser.removeChild(filebrowser.childNodes[0]) }

    allFiles = []
    allFolder = []
    fs.readdirSync(location).forEach(felixfile => {

        if (felixfile.endsWith(".felix") || felixfile.endsWith(".cfelix")) {
            allFiles.push(felixfile);
        } else if (fs.statSync(path.join(location, felixfile)).isDirectory()) {
            allFolder.push(felixfile)
        }
    })
    fileChecked = []
    filePaths = []
    fileSelected(location, [])
    browser_update()


}
function openFile() {

    openfiles("Open Felix file(s)", "Felix files", ["felix", "cfelix"]).then(get_files => {

        filePaths = get_files.files;
        fileLocation = get_files.location
        refreshLocation(fileLocation)

        baseName = [];
        filePaths.forEach(x => baseName.push(`${path.basename(x)}, `))

        fileSelected(fileLocation, baseName)
        writeFileToDisk(fileLocation, filePaths, baseName)

        normplot()

    }).catch(error => {
        console.error("[Normline]: ", error);
        nofileSelected()
    })
}

/////////////////////////////////////////////////////////

let dataFromPython_norm;
let footer = document.querySelector("#footer")
let loading = document.querySelector("#loading")
let loading_parent = document.querySelector("#loading-parent")
let error_occured = false
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
            },
        };

        let dataPlot = []

        for (let x in data) {
            dataPlot.push(data[x])
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
                anchor: 'x2',
                title: subplot_obj["y2"]
            },
        }

        let dataPlot1 = [];
        for (let x in data) {
            dataPlot1.push(data[x])
        }

        let dataPlot2 = [];
        for (let x in subplot_obj["data2"]) {
            dataPlot2.push(subplot_obj["data2"][x])
        }

        Plotly.newPlot(plotArea, dataPlot1.concat(dataPlot2), dataLayout);
    }

}
/////////////////////////////////////////////////////////

function normplot() {

    if (nofile) {

        nofileSelected()
        normlineBtn.className = "btn btn-danger"
        return setTimeout(() => normlineBtn.className = "btn btn-primary", 2000)
    }

    const py = spawn(pythonPath, [path.join(__dirname, "./normline.py"), [filePaths, delta.value]]);

    loading_parent.className = "alert alert-primary"
    loading.innerText = "Loading"

    py.stdout.on('data', (data) => {

        loading_parent.style.visibility = "visible";
        loading.innerText = "Loading";

        try {

            console.log("Receiving data")
            dataFromPython_norm = data.toString('utf8')
            //console.log("Before JSON parse (from python):\n" + dataFromPython_norm)
            dataFromPython_norm = JSON.parse(dataFromPython_norm)
            console.log("After JSON parse :" + dataFromPython_norm)

            /////////////////////////////////////////////////////////
            plot("Baseline Corrected", 'Wavelength (cm-1)', 'Intesity', dataFromPython_norm["base"], 'bplot')
            plot(`Normalized Spectrum (delta=${delta.value})`, 'Calibrated Wavelength (cm-1)', 'Normalised Intesity', dataFromPython_norm["felix"], 'nplot')
            plot(`Average of Normalised Spectrum (delta=${delta.value})`, 'Calibrated Wavelength (cm-1)', 'Normalised Intesity', dataFromPython_norm["average"], 'avgplot')

            // Spectrum and Power Analyer
            plot(
                "Spectrum and Power Analyser",
                "Wavelength set (cm-1)",
                "SA (cm-1)",
                dataFromPython_norm["SA"],
                'saPlot',
                true,
                {
                    x2: "Wavelength (cm-1)",
                    y2: "Power (mJ)",
                    data2: dataFromPython_norm["pow"]
                }
            )

            console.log("Graph Plotted")

        } catch (err) {
            console.error("Error Occured in javascript code: " + err.message)
        }

        /////////////////////////////////////////////////////////
    });

    py.stderr.on('data', (data) => {

        error_occured = true
        console.error(`Error from python: ${data}`)

    })

    py.on('close', () => {

        console.log('Returned to javascript');

        if (error_occured) {

            console.log(`Error occured ${error_occured}`);
            loading_parent.style.visibility = "visible"
            loading_parent.className = "alert alert-danger"
            loading.innerText = "Error! (Some file might be missing)"

            error_occured = false

        } else {
            footer.parentElement.className = "card-footer text-muted"
            footer.parentElement.style.position = "relative"
            loading_parent.style.visibility = "hidden"

        }
    });
}
/////////////////////////////////////////////////////////

let baselineBtn = document.querySelector("#baseline-btn")

function basePlot(e) {
    if (nofile) {

        nofileSelected()
        baselineBtn.className = "btn btn-danger"
        return setTimeout(() => baselineBtn.className = "btn btn-primary", 2000)
    }

    const py = spawn(pythonPath, [path.join(__dirname, "./baseline.py"), [filePaths]]);

    py.stdout.on('data', (data) => {
        try {
            let logFromPython = data.toString('utf8')
            console.log("From python:\n" + logFromPython)
        } catch (err) {
            console.log("Error Occured in javascript code: " + err.message)
        }

    });

    py.stderr.on('data', (data) => {
        console.error(`Error from python: ${data}`)
    })

    py.on('close', () => {
        console.log('Returned to javascript');
    });
}
/////////////////////////////////////////////////////////