let startTime = "8:00"; // in military time
let endTime = "16:00"; // in military time
let incrementTime = 60; // Increment time by minutes
let currentTime = startTime;

let Owners =  [
    "Aarav Deshmane",
    "None",
    "None",
    "None",
    "None",
    "None",
    "None",
    "None",
];


function addTimeContainer(ownerr) {
    
    // Create the new elements
    const timeContainer = document.createElement("div");
    timeContainer.className = "timeContainer";

    const times = document.createElement("div");
    times.className = "times";

    var timeParts = currentTime.split(":"); // Split the time string into hours and minutes
    var currentHour = parseInt(timeParts[0], 10); // Parse the hour as an integer
    var currentMinute = parseInt(timeParts[1], 10); // Parse the minute as an integer

    var nextTime = new Date();
    nextTime.setHours(currentHour);
    nextTime.setMinutes(currentMinute + incrementTime);

    var nextHour = nextTime.getHours();
    var nextMinute = nextTime.getMinutes();
    var nextHour2 = nextHour;
    if (nextHour2 == 0) {
        nextHour2 = 12;
    }   
    if (nextHour2 > 12) {
        nextHour2 -= 12;
    }
    var formattedNextHour = nextHour2.toString();
    var formattedNextMinute = nextMinute.toString().padStart(2, '0');

    var nextTimeString = `${formattedNextHour}:${formattedNextMinute}`;

    console.log(currentHour, nextHour)
    if (nextHour >= 12) {
        timeOfDay = "PM";
    } else{
        timeOfDay = "AM";
    }

    if (currentHour >= 12) {
        timeOfDay2 = "PM";
    } else{
        timeOfDay2 = "AM";
    }

    console.log(currentTime12hr)
    if (typeof currentTime12hr === "undefined") {
        if (timeOfDay2 == "AM") {
            currentTime12hr = currentTime
        } else {
            if (currentHour > 12) {
                currentTime12hr = `${(currentHour-12).toString()}:${currentMinute.toString().padStart(2, '0')}`;
            } else {
                currentTime12hr = `${(currentHour).toString()}:${currentMinute.toString().padStart(2, '0')}`;
            }
        }
    }

    times.textContent = `${currentTime12hr} ${timeOfDay2} - ${nextTimeString} ${timeOfDay}`;

    currentTime = nextTimeString;

    const owner = document.createElement("div");
    owner.className = "owner";
    owner.textContent = ownerr;

    // Append the elements to the DOM
    timeContainer.appendChild(times);
    timeContainer.appendChild(owner);

    const scheduleSection = document.getElementById("scheduleSection");
    scheduleSection.appendChild(timeContainer);
}

let currentTime12hr = undefined;
function setup() {
    var currentHour = parseInt(startTime.split(":")[0], 10);
    var currentMinute = parseInt(startTime.split(":")[1], 10);

    var endHour = parseInt(endTime.split(":")[0], 10);
    var endMinute = parseInt(endTime.split(":")[1], 10);

    let i = 0;
    
    while (currentHour < endHour || (currentHour === endHour && currentMinute < endMinute)) {
        addTimeContainer(Owners[i]);
        i++;
        currentMinute += incrementTime;
        if (currentMinute >= 60) {
            currentMinute -= 60;
            currentHour++;
        }
        let currentHour2 = currentHour >= 12 ? (currentHour % 12 || 12) : currentHour;
        let nextHour2 = (currentHour + Math.floor((currentMinute + incrementTime) / 60)) >= 12 ? ((currentHour + Math.floor((currentMinute + incrementTime) / 60)) % 12 || 12) : (currentHour + Math.floor((currentMinute + incrementTime) / 60));

        currentTime = `${currentHour.toString()}:${currentMinute.toString().padStart(2, '0')}`;
        currentTime12hr = `${currentHour2.toString()}:${currentMinute.toString().padStart(2, '0')}`;
        nextTime = `${nextHour2.toString()}:${(currentMinute + incrementTime) % 60 .toString().padStart(2, '0')}`;
    }
}

setup();


