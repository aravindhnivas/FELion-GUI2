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
let dirLabelPlace = document.querySelector('.pow-dirLabel-place')
let openDirBtn = document.querySelector('.pow-opendir')
openDirBtn.addEventListener('click', openDir)

let folder;
let dirLabel;

function openDir(e) {

    const options = {
        title: "Open Directory",
        properties: ['openDirectory'],
    };

    folder = dialog.showOpenDialog(mainWindow, options);

    if (folder !== undefined) {
        if (dirLabelPlace.children.length > 0) {
            dirLabel = document.querySelector('.pow-dirLabel')
            dirLabel.innerHTML = folder[0]
        } else {
            dirLabel = document.createElement('label');
            dirLabel.className = "alert alert-primary pow-dirLabel";
            let itemText = document.createTextNode(folder);
            dirLabel.appendChild(itemText);
            dirLabelPlace.appendChild(dirLabel);
        }
    } else {
        if (dirLabelPlace.children.length > 0) {
            dirLabel.remove()
        }
    }
}

// Showing save-alert next to save button
powSaveAlertPlace = document.querySelector('.pow-save-alert')
powSaveBtn = document.querySelector('.pow-save-btn')
powSaveBtn.addEventListener('click', saveAlert)

function saveAlert(e) {

    //creating alert label
    const saveAlertLabel = document.createElement('label')
    let itemText;

    //Getting the filecontents
    contents = document.querySelector('#pow-filecontents').value
    console.log(`Filecontents ${contents}; ${typeof contents}`)

    if (folder === undefined) {

        saveAlertLabel.className = 'alert alert-danger save-alert'
        itemText = document.createTextNode('ERROR: Please open a directory to save!')

    } else {

        saveAlertLabel.className = 'alert alert-success save-alert'
        itemText = document.createTextNode(`File saved! ${filename.value}.pow`)

        let fullname = path.join(folder[0], filename.value + '.pow')
        console.log(`Filename: ${fullname}`)

        fs.writeFile(fullname, contents, (err) => {
            if (err) {
                saveAlertLabel.className = 'alert alert-danger save-alert'
                let itemText = document.createTextNode(`Error: ${err}`)
            }
        })
    }
    // Placing the alert label
    saveAlertLabel.appendChild(itemText)
    powSaveAlertPlace.appendChild(saveAlertLabel)

    // disappear after 3seconds
    setTimeout(() => saveAlertLabel.remove(), 3000);
}