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

// Returns the date string n days later
function addDays(dateString, n){
    const newDate = new Date(dateString + 'T00:00:00Z');
    newDate.setUTCDate(newDate.getUTCDate() + n);
    return newDate.toISOString().slice(0, 10);
}

module.exports = { getMadridNow, getDayOfWeek, addDays };
