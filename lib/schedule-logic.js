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

// Check if date is a holiday
function getHoliday(scheduleData, dateString){
    return scheduleData.holidays.find(holiday => holiday.date === dateString);
}

// Check if date is special schedule
function getSpecialSchedule(scheduleData, dateString){
    return scheduleData.special_schedules.find(schedule => schedule.date === dateString)
}

// Get current period information
function getCurrentPeriodInfo(scheduleData, time, specialSchedule = null){
    const periods = specialSchedule ? specialSchedule.schedule_override.period_times : scheduleData.schedule.period_times;
    const currentMinutes = timeToMinutes(time);

    // Create array of all periods and their times
    const periodArray = [];
    for(const [period, times] of Object.entries(periods)) {
        periodArray.push({
            name: period,
            start: timeToMinutes(times.start),
            end: timeToMinutes(times.end)
        });
    }

    // Sort by start time
    periodArray.sort((a, b) => a.start - b.start);

    // Find current period
    for(let i = 0; i < periodArray.length; i++){
        const period = periodArray[i];
        if(currentMinutes >= period.start && currentMinutes < period.end){
            // Currently in this period
            const minutesLeft = period.end - currentMinutes;
            const nextPeriodInfo = i + 1 < periodArray.length ? periodArray[i + 1] : null;

            return{
                current: {
                    name: period.name,
                    endTime: minutesToTime(period.end),
                    minutesLeft: minutesLeft
                },
                next: nextPeriodInfo ? {
                    name: nextPeriodInfo.name,
                    startTime:minutesToTime(nextPeriodInfo.start)
                } : null
            };
        }
    }

    // Not currently in a period, so finds the next one
    for(const period of periodArray){
        if(currentMinutes < period.start){
            const minutesUntil = period.start - currentMinutes;
            return {
                current: null,
                next: {
                    name: period.name,
                    startTime: minutesToTime(period.start),
                    minutesUntil: minutesUntil
                }
            };
        }
    }

    // School day is over
    return { current: null, next: null };
}

// Turn a period key into { id, name }, e.g. "4" -> { id: "4", name: "Period 4" }
function formatPeriodName(key){
    let name;

    if (/^\d+$/.test(key)) {
        name = `Period ${key}`;
    } else if (key.startsWith('passing_period')) {
        name = 'Passing Period';
    } else {
        name = key
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    return { id: key, name: name };
}

module.exports = { timeToMinutes, minutesToTime, isWeekend, getHoliday, getSpecialSchedule, getCurrentPeriodInfo, formatPeriodName };