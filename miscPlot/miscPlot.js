//Importing required modules
const { remote } = require('electron');
const dialog = remote.dialog;
const mainWindow = remote.getCurrentWindow();
const path = require('path')
const spawn = require("child_process").spawn;
const fs = require('fs')

/////////////////////////////////////////////////////////
$(document).ready(function() {

    $("#timescan-btn").click(openFile);

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
let label = document.querySelector("#label")
let fileLocation;
let baseName = [];

function openFile(e) {

    const options = {
        title: "Open file(s)",
        defaultPath: "D:",
        filters: [
            { name: 'Timescan', extensions: ['scan'] },
            { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile'],
    };
    filePaths = dialog.showOpenDialog(mainWindow, options);

    if (filePaths == undefined) {

        label.textContent = "No files selected "
        label.className = "alert alert-danger"

    } else {

        baseName = [];
        for (x in filePaths) {
            baseName.push(`| ${path.basename(filePaths[x])}`)
        }

        fileLocation = path.dirname(filePaths[0])

        label.textContent = `${fileLocation} ${baseName}`;
        label.className = "alert alert-success"
    }
    timescanplot()
}
/////////////////////////////////////////////////////////

/////////////////////////////////////////////////////////

let dataFromPython_timescan;
let normlineBtn = document.querySelector("#normlinePlot-btn")
let footer = document.querySelector("#footer")
let loading = document.querySelector("#loading")
let loading_parent = document.querySelector("#loading-parent")
let error_occured = false

function timescanplot(e) {

    console.log("\n\nTimescan Plot")
    console.log("I am in javascript now!!")
    console.log(`File: ${filePaths}; ${typeof filePaths}`)

    if (filePaths === undefined) {

        label.textContent = "No files selected "
        label.className = "alert alert-danger"
        normlineBtn.className = "btn btn-danger"
        return setTimeout(() => normlineBtn.className = "btn btn-primary", 2000)
    }

    const py = spawn(path.join(__dirname, "..", "python3.7", "python"), [path.join(__dirname, "./timescan_plot.py"), [filePaths]]);

    loading_parent.className = "alert alert-primary"
    loading.innerText = "Loading"

    py.stdout.on('data', (data) => {

        loading_parent.style.visibility = "visible"
        loading.innerText = "Loading"

        try {

            console.log("Receiving data")
            dataFromPython_timescan = data.toString('utf8')
                //console.log("Before JSON parse (from python):\n" + dataFromPython_timescan)
            dataFromPython_timescan = JSON.parse(dataFromPython_timescan)
            console.log("After JSON parse :" + dataFromPython_timescan)

            /////////////////////////////////////////////////////////
            // Timescan plot

            let layout = {
                title: `Timescan ${baseName[0]} |`,
                xaxis: {
                    title: 'Time (in ms)'
                },
                yaxis: {
                    title: 'Counts',
                }
            };

            let dataPlot = [];
            for (x in dataFromPython_timescan) {
                dataPlot.push(dataFromPython_timescan[x])
            }

            console.log(dataPlot)
            Plotly.newPlot('timeplot', dataPlot, layout);

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
            footer.parentElement.style.position = "absolute"
            footer.parentElement.style.bottom = 0
            loading_parent.style.visibility = "hidden"

        }

    });
}