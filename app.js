async function updateCockpit() {
    try {
        const response = await fetch('status.json');
        const data = await response.json();
        const display = document.getElementById('status-display');
        if(display) display.innerText = data.system_status;
        console.log("Zemala Status:", data.system_status);
    } catch (e) {
        console.error("Datenstrom unterbrochen");
    }
}
updateCockpit();
