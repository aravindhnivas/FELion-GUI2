'use strict'

//Importing required modules
const { remote } = require('electron');
const dialog = remote.dialog;
const mainWindow = remote.getCurrentWindow();
const path = require('path')
const spawn = require("child_process").spawn;
const fs = require('fs')

/////////////////////////////////////////////////////////
const helpOn = () => {
    $('[data-toggle="tooltip"]').tooltip("enable");
    $('[data-toggle="tooltip"]').tooltip("show");
}

const helpOff = () => {
    $('[data-toggle="tooltip"]').tooltip("hide");
    $('[data-toggle="tooltip"]').tooltip("disable");
}

$(document).ready(function() {

    $("#normline-open-btn").click(openFile);
    $("#normlinePlot-btn").click(normplot);
    $("#baseline-btn").click(basePlot);
    $('#browser').click(selectFunc);

    helpOn()
    setTimeout(helpOff, 5000)

    // Info  display toggle
    $("#help").bootstrapToggle({
        on: 'Help',
        off: 'Help'
    });

    $('#help').change(function() {
        let info = $(this).prop('checked')
        if(info){helpOn()} else {helpOff()}
    });
    //END
})


/////////////////////////////////////////////////////////

//Showing opened file label

let filePaths;
let nofile=true;
let filevalue;
let fileLocation;
let baseName = [];
let browser = document.querySelector("#browser")
let locationLabel = document.querySelector("#locationLabel")
let fileLabel = document.querySelector("#fileLabel")

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

    while (browser.hasChildNodes()) {
        browser.removeChild(browser.childNodes[0])
    }

    let fileOpen = dialog.showOpenDialog(mainWindow, options);
    fileOpen.then(value => {

        nofile = false;

        filePaths = value.filePaths;
        baseName = [];
        filePaths.forEach((x) => baseName.push(`${path.basename(x)}, `))

        fileLocation = path.dirname(filePaths[0])
        fs.readdirSync(fileLocation).forEach((x) => {
            if (x.endsWith(".felix") || x.endsWith(".cfelix")) {
                filevalue = document.createElement("option")
                filevalue.innerHTML = x
                browser.add(filevalue)
            }
        })

        locationLabel.innerHTML = `Location: ${fileLocation}`;
        fileLabel.innerHTML = `Files: ${baseName}`

        locationLabel.className = "alert alert-info"
        fileLabel.className = "alert alert-info"

    }).catch((error) => {
        console.error(`File open error: ${error}`)
        nofile = true;

        locationLabel.innerHTML = `Select location`;
        fileLabel.innerHTML = `No Files selected`

        locationLabel.className = "alert alert-danger"
        fileLabel.className = "alert alert-danger"
    })
}

function selectFunc(e) {

    console.log(browser.value)
    filePaths = []
    filePaths.push(path.join(fileLocation, browser.value))
    fileLabel.innerHTML = browser.value
    normplot()
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

        locationLabel.innerHTML = `Select location`;
        fileLabel.innerHTML = `No Files selected`

        locationLabel.className = "alert alert-danger"
        fileLabel.className = "alert alert-danger"

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
                    //domain: [0, 0.95],
                    title: 'Wavelength (cm-1)'
                },
                yaxis: {
                    title: 'Intesity',
                },
            };

            let bdataPlot = []

            for (let x in dataFromPython_norm["base"]) {
                bdataPlot.push(dataFromPython_norm["base"][x])
            }

            Plotly.newPlot('bplot', bdataPlot, blayout);

            /////////////////////////////////////////////////////////
            // Spectrum and Power Analyer

            //Spectrum Analyser

            let salayout = {

                title: "Spectrum and Power Analyser",

                xaxis: {
                    domain: [0, 0.5],
                    title: "Wavelength set (cm-1)"
                },
                yaxis: {
                    title: "SA (cm-1)"
                },

                xaxis2: {
                    domain: [0.5, 1],
                    title: "Wavelength (cm-1)"
                },
                yaxis2: {
                    anchor: 'x2',
                    title: "Power (mJ)"
                },
            }

            let sadataPlot = [];
            for (let x in dataFromPython_norm["SA"]) {
                sadataPlot.push(dataFromPython_norm["SA"][x])
            }

            //Power Analyser

            let powdataPlot = [];
            for (let x in dataFromPython_norm["pow"]) {
                powdataPlot.push(dataFromPython_norm["pow"][x])
            }

            Plotly.newPlot('saPlot', sadataPlot.concat(powdataPlot), salayout);

            /////////////////////////////////////////////////////////
            //Normalised plot

            let nlayout = {
                title: `Normalized Spectrum (delta=${delta.value})`,
                xaxis: {
                    title: "Calibrated Wavelength (cm-1)"
                },
                yaxis: {
                    title: "Normalised Intesity"
                },
            }

            let ndataPlot = [];
            for (let x in dataFromPython_norm["felix"]) {
                ndataPlot.push(dataFromPython_norm["felix"][x])
            }

            Plotly.newPlot('nplot', ndataPlot, nlayout);

            /////////////////////////////////////////////////////////
            //Averaged normalised plot

            let avg_layout = {
                title: `Average of Normalised Spectrum (delta=${delta.value})`,
                xaxis: {
                    title: 'Calibrated Wavelength (cm-1)'
                },
                yaxis: {
                    title: 'Normalised Intesity',
                },
            }

            let avg_dataPlot = [];
            for (let x in dataFromPython_norm["average"]) {
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

        locationLabel.innerHTML = `Select location`;
        fileLabel.innerHTML = `No Files selected`

        locationLabel.className = "alert alert-danger"
        fileLabel.className = "alert alert-danger"

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