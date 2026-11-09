const madridFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
});

// Get Date and returns {dateString, timeString} in Madrid time
function getMadridNow(date = new Date()) {
    const parts = {};
    for (const { type, value } of madridFormatter.formatToParts(date)) {
        parts[type] = value;
    }

    return {
        dateString: `${parts.year}-${parts.month}-${parts.day}`,
        timeString: `${parts.hour}:${parts.minute}`
    };
}

// Returns 0-6(Sunday=0), taking time zones into account
function getDayOfWeek(dateString){
    const currentDay = new Date(dateString + 'T00:00:00Z');
    return currentDay.getUTCDay();
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Returns the weekday name, e.g. "2026-11-03" -> "Tuesday"
function getDayName(dateString){
    return DAY_NAMES[getDayOfWeek(dateString)];
}

// Returns the date string n days later
function addDays(dateString, n){
    const newDate = new Date(dateString + 'T00:00:00Z');
    newDate.setUTCDate(newDate.getUTCDate() + n);
    return newDate.toISOString().slice(0, 10);
}

// Returns the number of days from one date string to another, e.g. ("2026-11-03", "2026-11-05") -> 2
function daysBetween(fromDateString, toDateString){
    const from = new Date(fromDateString + 'T00:00:00Z');
    const to = new Date(toDateString + 'T00:00:00Z');
    return Math.round((to - from) / 86400000);
}

// Returns true if a YYYY-MM-DD string is a real calendar date (rejects 2026-02-30, 2026-13-01)
function isValidDate(dateString){
    const date = new Date(dateString + 'T00:00:00Z');
    if (isNaN(date.getTime())){
        return false;
    }
    return date.toISOString().slice(0, 10) === dateString;
}

// Returns true if an HH:MM string is a real time (00:00 to 23:59)
function isValidTime(timeString){
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours <= 23 && minutes <= 59;
}

module.exports = { getMadridNow, getDayOfWeek, getDayName, addDays, daysBetween, isValidDate, isValidTime };
