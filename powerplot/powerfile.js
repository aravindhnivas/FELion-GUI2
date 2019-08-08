// getting current window and dialog module from electron.remote
const { remote } = require('electron');
const dialog = remote.dialog;
const mainWindow = remote.getCurrentWindow();
const fs = require('fs');
const path = require('path');


/////////////////////////////////////////////////////////
$(document).ready(function() {

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

    $('#pow-dirLabel').hide()
    $('#save-alert').hide()

    $('#pow-opendir').click(openDir)
    $('#pow-save-btn').click(savefunc)

    console.log("Page loaded")
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

//setting default powerfile name with current date
let filename = document.querySelector('#pow-filename')

// Getting today's data to set the filename
let today = new Date();
const dd = String(today.getDate()).padStart(2, '0');
const mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
const yy = today.getFullYear().toString().substr(2);
today = `${dd}_${mm}_${yy}-#`
filename.value = today

//Showing opened directory label

let dirLabel = document.querySelector('#pow-dirLabel')

let folder;
let folderOpen;

function openDir(e) {

    const options = {
        title: "Open Directory",
        properties: ['openDirectory'],
    };

    folderOpen = dialog.showOpenDialog(mainWindow, options);

    folderOpen.then(value => {

        folder = value.filePaths[0];

        $('#pow-dirLabel').show()
        if (folder==undefined){
            dirLabel.innerHTML = "No folder selected";
            dirLabel.className = "alert alert-danger";

        } else {
            dirLabel.innerHTML = folder;
            dirLabel.className = "alert alert-primary";
        }
    })
}

let saveAlert = document.querySelector('#save-alert')

function savefunc(e) {

    console.log(`Location: ${folder}`)
    $('#save-alert').show()

    //Getting the filecontents
    contents = document.querySelector('#pow-filecontents').value
    console.log(`Filecontents: \n${contents}; ${typeof contents}`)
    
    if (folder === undefined) {

        saveAlert.className = "alert alert-danger"
        saveAlert.innerHTML = "ERROR: Please open a directory to save!"

        setTimeout(() => $('#save-alert').hide(), 2000)

    } else {

        saveAlert.className = "alert alert-success"
        saveAlert.innerHTML = `File saved! ${filename.value}.pow`
        let fullname = path.join(folder, filename.value + '.pow')

        fs.writeFile(fullname, contents, (err) => {

            if (err) {
                saveAlert.className = "alert alert-danger"
                saveAlert.innerHTML = `Error: ${err}`
            }
        })
    }
}