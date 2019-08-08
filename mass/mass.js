//Importing required modules
const { remote } = require('electron');
const dialog = remote.dialog;
const mainWindow = remote.getCurrentWindow();
const path = require('path')
const spawn = require("child_process").spawn;


/////////////////////////////////////////////////////////
$(document).ready(function() {
    $("#mass-open-btn").click(openFile);
    $("#massplot-btn").click(masspec);

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
let nofile;

function openFile(e) {

    const options = {
        title: "Open .mass file(s)",
        defaultPath: "D:",
        filters: [
            { name: 'Mass files', extensions: ['mass'] },
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
//python backend

let dataFromPython;
let massplotBtn = document.querySelector("#massplot-btn")

function masspec(e) {

    console.log("I am in javascript now!!")
    console.log(`File: ${filePaths}; ${typeof filePaths}`)

    if (nofile) {

        label.textContent = "No files selected "
        label.className = "alert alert-danger"
        massplotBtn.className = "btn btn-danger"
        return setTimeout(() => massplotBtn.className = "btn btn-primary", 2000)
    }

    const py = spawn(path.join(__dirname, "..", "python3.7", "python"), [path.join(__dirname, "./mass.py"), filePaths]);

    py.stdout.on('data', (data) => {

        try {

            dataFromPython = data.toString('utf8')
                //console.log("Before JSON parse :" + dataFromPython)
            dataFromPython = JSON.parse(dataFromPython)
            console.log("After JSON parse :" + dataFromPython)

            let layout = {
                title: 'Mass spectrum',
                xaxis: {
                    title: 'Mass [u]'
                },
                yaxis: {
                    title: 'Counts',
                    type: "log"
                }
            };

            let dataPlot = [];
            for (x in dataFromPython) {
                dataPlot.push(dataFromPython[x])
            }

            console.log(dataPlot)
            Plotly.newPlot('plot', dataPlot, layout);

        } catch (err) {
            console.error("Error Occured in javascript code: " + err.message)
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