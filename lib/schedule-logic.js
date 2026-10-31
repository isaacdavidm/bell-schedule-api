const { getDayOfWeek } = require('./time');

// Convert time string (HH:MM) to minutes since midnight
function timeToMinutes(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
}

// Convert minutes since midnight back to time string
function minutesToTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

// Returns true or false
function isWeekend(dateString){
    const day = getDayOfWeek(dateString); 
    return day === 0 || day === 6;
}




module.exports = { timeToMinutes, minutesToTime, isWeekend };