'use strict'

const webview = document.querySelector('#news')
const indicator = document.querySelector('#webLoad')

const loadstart = () => indicator.innerText = 'loading...';
const loadstop = () => indicator.innerText = '';

onload = () => {

    console.log("Webpage loading")
    webview.addEventListener('did-start-loading', loadstart)
    webview.addEventListener('did-stop-loading', loadstop)
}