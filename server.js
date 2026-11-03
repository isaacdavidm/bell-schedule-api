const express = require('express');
const scheduleData = require('./scheduleData.json');
const { getPeriodStatus, getNextSchoolDayInfo } = require('./lib/schedule-logic');
const { getMadridNow, isValidDate, isValidTime } = require('./lib/time');

const app = express();

// Matches YYYY-MM-DDTHH:MM, e.g. 2025-10-30T10:15
const AT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

app.get('/api/period', (req, res) => {
    let dateString, timeString;

    if (req.query.at){
        if (!AT_PATTERN.test(req.query.at)){
            return res.status(400).json({ error: 'Invalid "at" parameter. Use YYYY-MM-DDTHH:MM, e.g. 2025-10-30T10:15' });
        }
        [dateString, timeString] = req.query.at.split('T');

        if (!isValidDate(dateString) || !isValidTime(timeString)){
            return res.status(400).json({ error: `"${req.query.at}" is not a real date and time. Use YYYY-MM-DDTHH:MM, e.g. 2025-10-30T10:15` });
        }
    } else {
        ({ dateString, timeString } = getMadridNow(new Date()));
    }

    const periodStatus = getPeriodStatus(scheduleData, dateString, timeString);

    return res.json(periodStatus);
});

app.get('/api/next-school-day', (req, res) => {
    let dateString;

    if (req.query.date){
        if (!DATE_PATTERN.test(req.query.date)){
            return res.status(400).json({ error: 'Invalid "date" parameter. Use YYYY-MM-DD, e.g. 2025-10-30' });
        }
        if (!isValidDate(req.query.date)){
            return res.status(400).json({ error: `"${req.query.date}" is not a real date. Use YYYY-MM-DD, e.g. 2025-10-30` });
        }
        dateString = req.query.date;
    } else {
        ({ dateString } = getMadridNow(new Date()));
    }

    const nextSchoolDay = getNextSchoolDayInfo(scheduleData, dateString);

    return nextSchoolDay ? res.json(nextSchoolDay) : res.status(404).json({error: 'Next school day not found.'});
});

app.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});