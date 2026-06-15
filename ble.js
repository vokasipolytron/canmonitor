
const logTable = document.querySelector("#logTable tbody");
const canRows = new Map();
let lastHighlighted = null;

function updateCanLog(id, dlc, payload) {
    const idHex = id.toString(16).padStart(8, "0");
    const payloadHex = payload.map(v => v.toString(16).padStart(2, "0")).join(" ");

    let row;

    if (canRows.has(id)) {
        row = canRows.get(id);
        row.cells[1].textContent = dlc;
        row.cells[2].textContent = payloadHex;
    } else {
        row = logTable.insertRow();
        row.insertCell().textContent = idHex;
        row.insertCell().textContent = dlc;
        row.insertCell().textContent = payloadHex;

        canRows.set(id, row);
    }

    if (lastHighlighted) {
        lastHighlighted.classList.remove("table-warning");
    }

    row.classList.add("table-warning");
    lastHighlighted = row;
}

const rpmCard = document.getElementById("ecuRpm");
const speedCard = document.getElementById("ecuKmph");
const ctrlCard = document.getElementById("ecuCtrlTemp");
const mtrCard = document.getElementById("ecuMtrTemp");

function resetFlagMode(flagMode) {
    const flag = document.getElementById(flagMode);
    flag.classList.remove("btn-success");
    flag.classList.add("btn-outline-secondary");
}

function enableFlagMode(flagMode) {
    const flag = document.getElementById(flagMode);
    flag.classList.remove("btn-outline-secondary");
    flag.classList.add("btn-success");
}

function updateEcuData(payload, len) {
    if (len < 8) return;

    let rpm = payload[2] | (payload[3] << 8);
    let speed = rpm * 0.1033;
    let ctrlTemp = payload[4];
    let mtrTemp = payload[5];

    rpmCard.textContent = rpm;
    speedCard.textContent = speed.toFixed(1);
    ctrlCard.textContent = ctrlTemp;
    mtrCard.textContent = mtrTemp;

    resetFlagMode("ecuPark");
    resetFlagMode("ecuStand");
    resetFlagMode("ecuBrake");
    resetFlagMode("ecuDrive");
    resetFlagMode("ecuSport");
    resetFlagMode("ecuReverse");

    let mode = payload[1];

    if (mode === 0x00) {
        enableFlagMode("ecuPark");
    } else if (mode === 0x70) {
        enableFlagMode("ecuDrive");
    } else if (mode === 0x50) {
        enableFlagMode("ecuReverse");
    } else if (mode === 0x72 || mode === 0xb2) {
        enableFlagMode("ecuBrake");
    } else if (mode === 0xb0) {
        enableFlagMode("ecuSport");
    } else if (mode === 0x78 || mode === 0x08) {
        enableFlagMode("ecuStand");
    } else if (mode === 0xf0 || mode === 0x30 || mode == 0xf8) {
        enableFlagMode("ecuReverse");
    }
}

const chargerVoltCard = document.getElementById("chargerVoltage");
const chargerAmpCard = document.getElementById("chargerCurrent");

function updateChargerData(payload, len) {
    if (len < 5) return;

    let voltage = ((payload[0] << 8) | payload[1]) * 0.1;
    let current = ((payload[2] << 8) | payload[3]) * 0.1;

    chargerVoltCard.textContent = voltage.toFixed(1);
    chargerAmpCard.textContent = current.toFixed(1);
}

const battVoltCard = document.getElementById("battVolt");
const battAmpCard = document.getElementById("battAmp");
const battCap = document.getElementById("battCap");

function updateGenData(payload, len) {
    if (len < 8) return;

    let voltage = ((payload[0] << 8) | payload[1]) * 0.1;
    let current = ((payload[2] << 8) | payload[3]) * 0.1;
    let remainCap = ((payload[4] << 8) | payload[5]) * 0.1;
    let fullCap = ((payload[6] << 8) | payload[7]) * 0.1;

    let percentage = remainCap / fullCap * 100;

    battVoltCard.textContent = voltage.toFixed(1);
    battAmpCard.textContent = current.toFixed(1);

    battCap.style.width = percentage.toFixed(1) + "%";
    battCap.textContent = remainCap.toFixed(1) + " dari " + fullCap.toFixed(1);
}

const socToBms = [
    0, 60, 70, 80, 90, 95, 105, 115, 125, 135, 140, 150, 160, 170, 180, 185, 195, 205, 215, 225,
    230, 240, 250, 260, 270, 275, 285, 295, 305, 315, 320, 330, 340, 350, 360, 365, 375, 385, 395, 405,
    410, 420, 430, 440, 450, 455, 465, 475, 485, 495, 500, 510, 520, 530, 540, 550, 555, 565, 575, 585,
    590, 600, 610, 620, 630, 635, 645, 655, 665, 675, 680, 690, 700, 710, 720, 725, 735, 745, 755, 765,
    770, 780, 790, 800, 810, 815, 825, 835, 845, 855, 860, 870, 880, 890, 900, 905, 915, 925, 935, 945, 950
];

function getSoCFromLookup(raw) {
    if (raw >= socToBms[100]) return 100.0;
    if (raw <= socToBms[0]) return 0.0;

    for (let i = 0; i < 100; i++) {
        if (raw >= socToBms[i] && raw <= socToBms[i + 1]) {
            let range = socToBms[i + 1] - socToBms[i];
            let delta = raw - socToBms[i];

            if (range == 0) {
                return i;
            }

            return i + (delta / range);
        }
    }

    return 0.0;
}

const socCard = document.getElementById("battSoc");
const sohCard = document.getElementById("battSoh");
const cycleCard = document.getElementById("battCycle");

function updateBattHealtData(payload, len) {
    if (len < 6) return;

    let soc = (payload[0] << 8) | payload[1];
    let soh = ((payload[2] << 8) | payload[3]) * 0.1;
    let cycle = (payload[4] << 8) | payload[5];

    socCard.textContent = getSoCFromLookup(soc).toFixed(1);
    sohCard.textContent = soh.toFixed(1);
    cycleCard.textContent = cycle;
}

let cellMax = 0.00;
let cellMin = 4.20;

function updateBattCell(pos, voltage) {
    const idx = String(pos).padStart(2, "0");
    const battBar = document.getElementById(`battC${idx}Bar`);
    const battText = document.getElementById(`battC${idx}Text`);

    let percentage = voltage / 4.200 * 100;
    battText.textContent = voltage.toFixed(2);
    battBar.style.width = percentage + "%";
}

function updateBattCellVoltData(payload, len, index) {
    if (len < 8) return;

    for (let i = 0; i < 4; i++) {
        let voltage = ((payload[i * 2] << 8) | payload[(i * 2) + 1]) * 0.001;
        updateBattCell((index + i) + 1, voltage);
    }
}

const maxCard = document.getElementById("battCellMax");
const minCard = document.getElementById("battCellMin");
const avgCard = document.getElementById("battCellAvg");
const diffCard = document.getElementById("battCellDiff");

function updateBattVoltStatData(payload, len) {
    if (len < 8) return;

    let voltageMax = ((payload[0] << 8) | payload[1]) * 0.001;
    let voltageMin = ((payload[3] << 8) | payload[4]) * 0.001;
    let voltageAvg = ((payload[6] << 8) | payload[7]) * 0.001;

    let maxIndex = String(payload[2] + 1).padStart(2, "0");
    let minIndex = String(payload[5] + 1).padStart(2, "0");

    for (let i = 1; i < 25; i++) {
        let idx = String(i).padStart(2, "0");
        const text = document.getElementById(`battC${idx}Text`);
        text.classList.remove("text-danger");
    }

    const textMax = document.getElementById(`battC${maxIndex}Text`)
    const textMin = document.getElementById(`battC${minIndex}Text`)

    avgCard.textContent = voltageAvg.toFixed(2);
    maxCard.textContent = voltageMax.toFixed(2);
    minCard.textContent = voltageMin.toFixed(2);
    diffCard.textContent = (voltageMax - voltageMin).toFixed(2);

    textMax.classList.add("text-danger");
    textMin.classList.add("text-danger");
}

function updateBattTempStatData(payload, len) {
    // if (len < 6) return;

    // for (let i = 1; i < 25; i++) {
    //     let idx = String(i).padStart(2, "0");
    //     const text = document.getElementById(`battC${idx}Bar`);
    //     text.textContent = " ";
    // }

    // let maxTemp = payload[0];
    // let minTemp = payload[4];

    // let maxIdx = String(payload[1] + 1).padStart(2, "0");
    // let minIdx = String(payload[5] + 1).padStart(2, "0");

    // const barMax = document.getElementById(`battC${maxIdx}Bar`);
    // const barMin = document.getElementById(`battC${minIdx}Bar`);

    // barMax.textContent = maxTemp;
    // barMin.textContent = minTemp;
}

const tempCard = document.getElementById("battTemp");

function updateBattTempData(payload, len) {
    if (len < 5) return;

    let sum = 0;

    for (let i = 0; i < 5; i++) {
        sum += payload[i];
    }

    tempCard.textContent = (sum / 5).toFixed(1);
}

function handleNotify(event) {
    const data = event.target.value;

    const canId = data.getUint32(0, false);
    const dlc = data.getUint8(4);

    const payload = [];

    for (let i = 0; i < dlc; i++) {
        payload.push(data.getUint8(i + 5));
    }

    updateCanLog(canId, dlc, payload);

    switch (canId) {
        case 0x0a010810:
            updateEcuData(payload, dlc);
            break;

        case 0x1810d0f3:
        case 0x1811d0f3:
            updateChargerData(payload, dlc);
            break;

        case 0x0a6d0d09:
            updateGenData(payload, dlc);
            break;

        case 0x0a6e0d09:
            updateBattHealtData(payload, dlc);
            break;

        case 0x0e640d09:
            updateBattCellVoltData(payload, dlc, 0);
            break;

        case 0x0e650d09:
            updateBattCellVoltData(payload, dlc, 4);
            break;

        case 0x0e660d09:
            updateBattCellVoltData(payload, dlc, 8);
            break;

        case 0x0e670d09:
            updateBattCellVoltData(payload, dlc, 12);
            break;

        case 0x0e680d09:
            updateBattCellVoltData(payload, dlc, 16);
            break;

        case 0x0e690d09:
            updateBattCellVoltData(payload, dlc, 20);
            break;

        case 0x0a6f0d09:
            updateBattVoltStatData(payload, dlc);
            break;

        case 0x0a700d09:
            updateBattTempStatData(payload, dlc);
            break;

        case 0x0e6c0d09:
            updateBattTempData(payload, dlc);
            break;

        default:
            break;
    }
}

let device = null;
let connected = false;

// const service_uuid = "19b10000-e8f2-537e-4f6c-d104768a1214";
// const characteristic_uuid = "19b10001-e8f2-537e-4f6c-d104768a1214";

const service_uuid = "12345678-1234-1234-1234-1234567890ab";
const characteristic_uuid = "87654321-4321-4321-4321-ba0987654321";

const blebtn = document.getElementById("bleBtn");
const loading = document.getElementById("loadingAlert");

blebtn.addEventListener("click", async () => {
    if (!connected) {
        if (!navigator.bluetooth) {
            alert("Browser tidak mendukung Web Bluetooth.");
            return false;
        }

        try {


            // device = await navigator.bluetooth.requestDevice({
            //     acceptAllDevices: true,
            //     optionalServices: [service_uuid],
            // });

            device = await navigator.bluetooth.requestDevice({
                filters: [{ services: [service_uuid] }]
            });

            loading.classList.remove("d-none");
            blebtn.disabled = true;

            const server = await device.gatt.connect();
            const service = await server.getPrimaryService(service_uuid);
            const rxChar = await service.getCharacteristic(characteristic_uuid);

            await rxChar.startNotifications();
            rxChar.addEventListener("characteristicvaluechanged", handleNotify);

            connected = true;
            loading.classList.add("d-none");

            blebtn.classList.remove("btn-primary");
            blebtn.classList.add("btn-success");
            blebtn.textContent = "Putuskan";
            blebtn.disabled = false;

        } catch (err) {
            loading.classList.add("d-none");
            blebtn.disabled = false;
            alert(err);
        }
    } else {
        try {
            if (device && device.gatt.connected) {
                device.gatt.disconnect();
            }

            connected = false;

            blebtn.classList.remove("btn-success");
            blebtn.classList.add("btn-primary");
            blebtn.textContent = "Sambungkan";
        } catch (err) {
            alert(err);
        }
    }
});
