const { getDayOfWeek, getDayName, addDays, daysBetween } = require('./time');

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
function getPeriodInfo(scheduleData, time, specialSchedule = null){
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
                    startTime:minutesToTime(nextPeriodInfo.start),
                    minutesUntil: nextPeriodInfo.start - currentMinutes
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

// Build current_period for the response, with every field null if there isn't one
function buildCurrentPeriod(current){
    if (!current){
        return { id: null, name: null, end_time: null, minutes_left: null };
    }
    return {
        ...formatPeriodName(current.name),
        end_time: current.endTime,
        minutes_left: current.minutesLeft
    };
}

// Build next_period for the response, with every field null if there isn't one
function buildNextPeriod(next){
    if (!next){
        return { id: null, name: null, start_time: null, minutes_until: null };
    }
    return {
        ...formatPeriodName(next.name),
        start_time: next.startTime,
        minutes_until: next.minutesUntil
    };
}

function getPeriodStatus(scheduleData, dateString, timeString){
    // Every response has the same fields; the ones that don't apply stay null
    const response = {
        status: null,
        date: dateString,
        time: timeString,
        reason: null,
        holiday: null,
        special_schedule: null,
        current_period: buildCurrentPeriod(null),
        next_period: buildNextPeriod(null)
    };

    const holiday = getHoliday(scheduleData, dateString);

    if (isWeekend(dateString)){
        response.status = 'no_school';
        response.reason = 'weekend';
        return response;
    }
    if (holiday){
        response.status = 'no_school';
        response.reason = 'holiday';
        response.holiday = holiday.name;
        return response;
    }

    const specialSchedule = getSpecialSchedule(scheduleData, dateString);
    const periodInfo = getPeriodInfo(scheduleData, timeString, specialSchedule);

    if (periodInfo.current){
        response.status = 'in_period';
    } else if (periodInfo.next){
        response.status = 'before_school';
    } else {
        response.status = 'after_school';
    }

    response.special_schedule = specialSchedule ? specialSchedule.name : null;
    response.current_period = buildCurrentPeriod(periodInfo.current);
    response.next_period = buildNextPeriod(periodInfo.next);
    return response;
}

// Gets the next school day, taking holidays and weekends into account
function getNextSchoolDayInfo(scheduleData, dateString){
    let nextDay = addDays(dateString, 1); // We start with tomorrow

    // Keep looking until we find a school day (Max 90 days to avoid infinite loop)
    for (let i = 0; i < 90; i++) {
        // Skip weekends
        if (!isWeekend(nextDay)){
            // Check if it's a holiday
            const holiday = getHoliday(scheduleData, nextDay);
            if (!holiday){
                const dayName = getDayName(nextDay)
                const isTomorrow = i === 0;

                return {
                    date: nextDay,
                    day: dayName,
                    is_tomorrow: isTomorrow,
                    days_away: i + 1
                }
            }
        }
        // Test next day
        nextDay = addDays(nextDay, 1);
    }
    return null; // Couldn't find a school day
}

// Returns true if every day strictly between two dates is a weekend (or there are none)
function onlyWeekendsBetween(startDateString, endDateString){
    for (let day = addDays(startDateString, 1); day < endDateString; day = addDays(day, 1)){
        if (!isWeekend(day)){
            return false;
        }
    }
    return true;
}

// Merges single-date holiday entries into breaks. Entries join the same break when they
// share a name and only weekends separate them, so Winter Break is one break, not 13 days.
function groupHolidays(scheduleData){
    const sorted = [...scheduleData.holidays].sort((a, b) => a.date.localeCompare(b.date));
    const breaks = [];

    for (const holiday of sorted){
        const last = breaks[breaks.length - 1];
        if (last && last.name === holiday.name && onlyWeekendsBetween(last.end_date, holiday.date)){
            last.end_date = holiday.date;
            last.dates.push(holiday.date);
        } else {
            breaks.push({
                name: holiday.name,
                type: holiday.type,
                start_date: holiday.date,
                end_date: holiday.date,
                dates: [holiday.date]
            });
        }
    }
    return breaks;
}

// Gets the next holiday (or multi-day break) that starts after dateString
function getNextHolidayInfo(scheduleData, dateString){
    const next = groupHolidays(scheduleData).find(b => b.start_date > dateString);
    if (!next){
        return null;
    }

    const daysUntil = daysBetween(dateString, next.start_date);
    const backToSchool = getNextSchoolDayInfo(scheduleData, next.end_date);

    return {
        name: next.name,
        type: next.type,
        start_date: next.start_date,
        start_day: getDayName(next.start_date),
        end_date: next.end_date,
        end_day: getDayName(next.end_date),
        school_days_off: next.dates.filter(d => !isWeekend(d)).length,
        is_tomorrow: daysUntil === 1,
        days_until: daysUntil,
        back_to_school: backToSchool ? backToSchool.date : null
    };
}

module.exports = { timeToMinutes, minutesToTime, isWeekend, getHoliday, getSpecialSchedule, getPeriodInfo, formatPeriodName, getPeriodStatus, getNextSchoolDayInfo, groupHolidays, getNextHolidayInfo };