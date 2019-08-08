//Importing required modules
const { remote } = require('electron');
const dialog = remote.dialog;
const mainWindow = remote.getCurrentWindow();
const path = require('path')
const spawn = require("child_process").spawn;
const fs = require('fs')

/////////////////////////////////////////////////////////

$(document).ready(function() {

    $("#normline-open-btn").click(openFile);
    $("#normlinePlot-btn").click(normplot);
    $("#baseline-btn").click(basePlot);

    $(() => $('[data-toggle="tooltip"]').tooltip("disable"))

    // Info  display toggle
    $("#help").bootstrapToggle({
        on: 'Help',
        off: 'Help'
    });

    $('#help').change(function() {
        let info = $(this).prop('checked')
        console.log(`Status: ${info}\nType: ${typeof info}`)
        info_status(info)
    });
    //END
})

function info_status(info) {
    if (info) {
        $(() => $('[data-toggle="tooltip"]').tooltip("enable"))
        $(() => $('[data-toggle="tooltip"]').tooltip("show"))
    } else {
        $(() => $('[data-toggle="tooltip"]').tooltip("hide"))
        $(() => $('[data-toggle="tooltip"]').tooltip("disable"))
    }
}

/////////////////////////////////////////////////////////

//Showing opened file label

let filePaths;
let nofile;
let label = document.querySelector("#label")
let fileLocation;
let baseName = [];

function openFile(e) {

    const options = {
        title: "Open Felix file(s)",
        defaultPath: "D:",
        filters: [
            { name: 'Felix files', extensions: ['felix', 'cfelix'] },
            { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile', 'multiSelections'],
    };

    fileOpen = dialog.showOpenDialog(mainWindow, options);
    fileOpen.then(value => {

        nofile = false;

        filePaths = value.filePaths;
        baseName = [];
        for (x in filePaths) {
            baseName.push(`| ${path.basename(filePaths[x])}`)
        }
        fileLocation = path.dirname(filePaths[0])
        label.textContent = `${fileLocation} ${baseName}`;
        label.className = "alert alert-success"

    }).catch((error) => {
        console.log(`File open error: ${error}`)
        nofile = true;
        label.textContent = "No files selected "
        label.className = "alert alert-danger"
    })
}

/////////////////////////////////////////////////////////

let dataFromPython_norm;
let normlineBtn = document.querySelector("#normlinePlot-btn")
let footer = document.querySelector("#footer")
let loading = document.querySelector("#loading")
let loading_parent = document.querySelector("#loading-parent")
let error_occured = false

function normplot(e) {

    console.log("\n\nNormline Spectrum")
    console.log("I am in javascript now!!")
    console.log(`File: ${filePaths}; ${typeof filePaths}`)

    if (nofile) {

        label.textContent = "No files selected "
        label.className = "alert alert-danger"
        normlineBtn.className = "btn btn-danger"
        return setTimeout(() => normlineBtn.className = "btn btn-primary", 2000)
    }

    const py = spawn(path.join(__dirname, "..", "python3.7", "python"), [path.join(__dirname, "./normline.py"), [filePaths, delta.value]]);

    loading_parent.className = "alert alert-primary"
    loading.innerText = "Loading"

    py.stdout.on('data', (data) => {

        loading_parent.style.visibility = "visible"
        loading.innerText = "Loading"

        try {
            console.log("Receiving data")
            dataFromPython_norm = data.toString('utf8')
                //console.log("Before JSON parse (from python):\n" + dataFromPython_norm)
            dataFromPython_norm = JSON.parse(dataFromPython_norm)
            console.log("After JSON parse :" + dataFromPython_norm)

            /////////////////////////////////////////////////////////
            // Baseline plot

            let blayout = {
                title: "Baseline Corrected",
                xaxis: {
                    domain: [0, 0.95],
                    title: 'Calibrated Wavelength'
                },
                yaxis: {
                    title: 'Intesity',
                },
                yaxis2: {
                    anchor: 'x',
                    overlaying: 'y',
                    side: 'right',
                    title: 'Power mJ',
                }
            };

            let bdataPlot = []
            for (x in dataFromPython_norm["base"]) {
                bdataPlot.push(dataFromPython_norm["base"][x])
            }

            Plotly.newPlot('bplot', bdataPlot, blayout);

            /////////////////////////////////////////////////////////

            //Normalised plot

            let nlayout = {
                title: `Normalized Spectrum (delta=${delta.value})`,
                xaxis: {
                    title: "Calibrated Wavelength"
                },
                yaxis: {
                    title: "Normalised Intesity"
                },
            }

            let ndataPlot = [];
            for (x in dataFromPython_norm["felix"]) {
                ndataPlot.push(dataFromPython_norm["felix"][x])
            }

            Plotly.newPlot('nplot', ndataPlot, nlayout);

            /////////////////////////////////////////////////////////

            /////////////////////////////////////////////////////////

            //Averaged normalised plot

            let avg_layout = {
                title: `Average of Normalised Spectrum (delta=${delta.value})`,
                xaxis: {
                    title: 'Calibrated Wavelength'
                },
                yaxis: {
                    title: 'Normalised Intesity',
                },
            }

            let avg_dataPlot = [];
            for (x in dataFromPython_norm["average"]) {
                avg_dataPlot.push(dataFromPython_norm["average"][x])
            }

            Plotly.newPlot('avgplot', avg_dataPlot, avg_layout);

            /////////////////////////////////////////////////////////

            console.log("Graph Plotted")

        } catch (err) {
            console.error("Error Occured in javascript code: " + err)
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
            footer.parentElement.style.bottom = 0
            loading_parent.style.visibility = "hidden"

        }

    });
}

/////////////////////////////////////////////////////////

/////////////////////////////////////////////////////////

let baselineBtn = document.querySelector("#baseline-btn")

function basePlot(e) {

    console.log("\n\nBaseline Correction")
    console.log("I am in javascript now!!")
    console.log(`File: ${filePaths}; ${typeof filePaths}`)
    console.log("--------------------------")

    if (nofile) {

        label.textContent = "No files selected "
        label.className = "alert alert-danger"
        baselineBtn.className = "btn btn-danger"
        return setTimeout(() => baselineBtn.className = "btn btn-primary", 2000)
    }
    const py = spawn(path.join(__dirname, "..", "python3.7", "python"), [path.join(__dirname, "./baseline.py"), [filePaths]]);

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