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
/////////////////////////////////////////////////////////

$(document).ready(function () {

    $("#normline-open-btn").click(openFile);
    $("#normlinePlot-btn").click(normplot);
    $("#baseline-btn").click(basePlot);
    $('#browser').click(selectFunc);

    //helpOn()
    //setTimeout(helpOff, 5000)

    // Info  display toggle
    $("#help").bootstrapToggle({
        on: 'Help',
        off: 'Help'
    });

    $('#help').change(function () {
        let info = $(this).prop('checked')
        if (info) { helpOn() } else { helpOff() }
    });
    readfile() //Read last used felix file from local storage
    //END
})

/////////////////////////////////////////////////////////
let filePaths;
let nofile = true;
let filevalue;
let fileLocation;
let baseName = [];
let save_data;

let browser = document.querySelector("#browser")
let locationLabel = document.querySelector("#locationLabel")
let fileLabel = document.querySelector("#fileLabel")
const save_path = path.join(remote.app.getPath('documents'), 'FELion_save_data.json')
/////////////////////////////////////////////////////////

function readfile() {
    fs.readFile(save_path, (err, data) => {
        if (err) {
            save_data = { location: "", filelists: [] };
            nofileSelected();
        } else {
            save_data = JSON.parse(data);
            fileLocation = save_data.location
            filePaths = save_data.filelists;
            filePaths.forEach((x) => baseName.push(`${path.basename(x)}, `))

            fileSelected(filePaths, baseName)
            browser_update(fileLocation)
            //normplot()
            console.log(`Read file: ${save_data}`);
        }
    })
};

function writeFileToDisk(location, files) {
    // Writing data information to local disk
    save_data.location = location
    save_data.filelists = files
    fs.writeFile(save_path, JSON.stringify(save_data), err => {
        if (err) throw err;
        console.log('Successfully wrote file');
    })
}

function browser_update(location) {

    // Adding avaiable files to the display list
    fs.readdirSync(location).forEach((x) => {

        if (x.endsWith(".felix") || x.endsWith(".cfelix")) {
            filevalue = document.createElement("option")
            filevalue.innerHTML = x
            browser.add(filevalue)
        }
    })

}

function nofileSelected() {
    locationLabel.innerHTML = `Select location`;
    fileLabel.innerHTML = `No Files selected`
    locationLabel.className = "alert alert-danger"
    fileLabel.className = "alert alert-danger"
}

function fileSelected(location, files) {

    nofile = false;
    locationLabel.innerHTML = `Location: ${location}`;
    fileLabel.innerHTML = `Files: ${files}`
    locationLabel.className = "alert alert-info"
    fileLabel.className = "alert alert-info"
}

function openFile(e) {

    const options = {
        title: "Open Felix file(s)",
        filters: [
            { name: 'Felix files', extensions: ['felix', 'cfelix'] },
            { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile', 'multiSelections'],
    };

    // Clearing filename list in Select file box
    while (browser.hasChildNodes()) {
        browser.removeChild(browser.childNodes[0])
    }

    // Opening file dialog
    dialog.showOpenDialog(mainWindow, options).then(value => {

        filePaths = value.filePaths;
        baseName = [];
        filePaths.forEach((x) => baseName.push(`${path.basename(x)}, `))
        fileLocation = path.dirname(filePaths[0])

        fileSelected(fileLocation, baseName) //Display selected file label with location
        browser_update(fileLocation) //Update the filename list content in selected file box
        writeFileToDisk(fileLocation, filePaths) //Write the filelocation and filename lists to local disk for future use.

    }).catch((error) => {
        console.error(`File open error: ${error}`)
        nofile = true;
        nofileSelected() //Display no file selected label with danger sign
    })
}

function selectFunc(e) {

    console.log(browser.value)
    filePaths = []
    filePaths.push(path.join(fileLocation, browser.value))
    fileLabel.innerHTML = browser.value
    normplot()
    writeFileToDisk(fileLocation, filePaths)
}
/////////////////////////////////////////////////////////
let dataFromPython_norm;
let normlineBtn = document.querySelector("#normlinePlot-btn")
let footer = document.querySelector("#footer")
let loading = document.querySelector("#loading")
let loading_parent = document.querySelector("#loading-parent")
let error_occured = false
const pythonPath = path.join(__dirname, "..", "python3.7", "python");
/////////////////////////////////////////////////////////

function plot(mainTitle, xtitle, ytitle, data, plotArea, subplot=false, subplot_obj=null) {

    if(!subplot){

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

function normplot(e) {

    if (nofile) {
        nofileSelected()
        normlineBtn.className = "btn btn-danger"
        return setTimeout(() => normlineBtn.className = "btn btn-primary", 2000)
    }

    const py = spawn(pythonPath, [path.join(__dirname, "./normline.py"), [filePaths, delta.value]]);

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