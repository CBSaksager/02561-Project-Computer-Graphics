let recording = false;
let data = [];

const output = document.getElementById("output");
const startButton = document.getElementById("start-button");
const stopButton = document.getElementById("stop-button");

window.addEventListener("deviceorientation", handleOrientation);
startButton.disabled = false;
stopButton.disabled = true;

function handleOrientation(event) {
    const { alpha, beta, gamma } = event;
    const { a, b, c } = getEulerAngles(getRotationMatrix(alpha, beta, gamma));

    let text = `alpha (z): ${alpha?.toFixed(2)}\nbeta (x):  ${beta?.toFixed(2)}\ngamma (y): ${gamma?.toFixed(2)}\n\n`;
    text += `a: ${a?.toFixed(2)}\nb:  ${b?.toFixed(2)}\nc: ${c?.toFixed(2)}`;

    output.textContent = text;

    if (recording) {
        data.push({
            timestamp_ms: Date.now(),
            alpha,
            beta,
            gamma,
            a,
            b,
            c
        });
    }
}

startButton.addEventListener("click", () => {
    data = [];
    recording = true;
    startButton.disabled = true;
    stopButton.disabled = false;
});

stopButton.addEventListener("click", () => {
    recording = false;
    startButton.disabled = false;
    stopButton.disabled = true;
    exportResult();
});

function exportResult() {
    if (data.length === 0) {
        alert("no data");
        return;
    }

    const header = "timestamp_ms,alpha,beta,gamma,a,b,c\n";
    const rows = data.map(d =>
        `${d.timestamp_ms},${d.alpha},${d.beta},${d.gamma},${d.a},${d.b},${d.c}`
    ).join("\n");

    const csv = header + rows;
    console.log(csv);

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "device_orientation.csv";
    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Converts DeviceOrientation angles to rotation matrix
// Based on snippet from https://w3c.github.io/deviceorientation/#example-76d62ad0
// Apapted based on https://stackoverflow.com/questions/69216465/the-simplest-way-to-solve-gimbal-lock-when-using-deviceorientation-events-in-jav
function getRotationMatrix(alpha, beta, gamma) {
    const degtorad = Math.PI / 180; // Degree-to-Radian conversion
    var cX = Math.cos(beta * degtorad);
    var cY = Math.cos(gamma * degtorad);
    var cZ = Math.cos(alpha * degtorad);
    var sX = Math.sin(beta * degtorad);
    var sY = Math.sin(gamma * degtorad);
    var sZ = Math.sin(alpha * degtorad);

    var m11 = cZ * cY - sZ * sX * sY;
    var m12 = - cX * sZ;
    var m13 = cY * sZ * sX + cZ * sY;

    var m21 = cY * sZ + cZ * sX * sY;
    var m22 = cZ * cX;
    var m23 = sZ * sY - cZ * cY * sX;

    var m31 = - cX * sY;
    var m32 = sX;
    var m33 = cX * cY;

    return [
        m13, m11, m12,
        m23, m21, m22,
        m33, m31, m32
    ];
};

// Converts rotation matrix to Euler angles
// Based on https://learnopencv.com/rotation-matrix-to-euler-angles/
// Apapted based on https://stackoverflow.com/questions/69216465/the-simplest-way-to-solve-gimbal-lock-when-using-deviceorientation-events-in-jav
function getEulerAngles(matrix) {
    var radtodeg = 180 / Math.PI; // Radian-to-Degree conversion
    var sy = Math.sqrt(matrix[0] * matrix[0] + matrix[3] * matrix[3]);

    var singular = sy < 1e-6; // If

    if (!singular) {
        var x = Math.atan2(matrix[7], matrix[8]);
        var y = Math.atan2(-matrix[6], sy);
        var z = Math.atan2(matrix[3], matrix[0]);
    } else {
        var x = Math.atan2(-matrix[5], matrix[4]);
        var y = Math.atan2(-matrix[6], sy);
        var z = 0;
    }
    return {
        a: radtodeg * x,
        b: radtodeg * y,
        c: radtodeg * z
    };
}