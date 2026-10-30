# Bell Schedule API

A small REST API that tells you what class period it is right now at a school with an alternating A/B day schedule. It handles A/B day calculation, holidays, special schedules (half days, extended homeroom), and timezones.

Schedule logic adapted from [BHS Bell](https://bhsbell.com), a bell schedule site I built with Max Smith for Barcelona High School.

> Ships with sample schedule data modeled on a real school's 2025-26 calendar. Swap `scheduleData.json` to use your own.

## Quick start

```bash
git clone https://github.com/mcnoobington-es/bell-schedule-api.git
cd bell-schedule-api
npm install
npm start
```

The server runs at `http://localhost:3000`.

```bash
npm test
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/current-period` | The current period (or break) and what's next |
| GET | `/api/schedule/:date` | Day type and period times for a given date (`YYYY-MM-DD`) |
| GET | `/api/next-school-day` | Next school day and its A/B type |
| GET | `/api/holidays` | All holidays; filter with `?type=school_holiday` |

### Testing with a fixed time

`/api/current-period` accepts an optional `at` query parameter (Madrid local time), so you can test any moment without waiting for it:

```bash
curl "localhost:3000/api/current-period?at=2025-10-30T10:15"
```

### Example response

```json
{
  "status": "in_period",
  "date": "2025-10-30",
  "dayType": "B",
  "current": { "name": "Period 4", "endsAt": "11:00", "minutesLeft": 45 },
  "next": { "name": "Passing Period", "startsAt": "11:00" }
}
```

`status` is one of:

- `in_period`: class, homeroom, passing period, or lunch is in progress
- `before_school`: school hasn't started yet
- `after_school`: the day is over
- `no_school`: weekend or holiday (includes the holiday name)

### Errors

Invalid input returns a JSON error with a 400 status:

```json
{ "error": "Invalid date. Use YYYY-MM-DD." }
```

## How it works

- **A/B day calculation:** counts school days (weekdays that aren't holidays) from a configured cycle start date and alternates by parity.
- **Special schedules:** a date can override the normal period times (half days, extended homeroom).
- **Config-driven:** all school-specific data lives in `scheduleData.json`: cycle start, day types, period times, holidays, and special schedules. Nothing school-specific is hardcoded.

## Design decisions

- **Logic is separate from the server.** `lib/schedule-logic.js` contains pure functions that take the schedule data and a date/time as arguments, with no globals and no I/O. This makes them easy to test and reuse.
- **Timezones are explicit.** Servers usually run in UTC, so "now" is converted to `Europe/Madrid` using `Intl.DateTimeFormat` rather than `Date` local-time methods or `toISOString()`. Otherwise, between roughly 23:00 and 01:00 local time, the server would compute the wrong date and therefore the wrong A/B day. There's a test for this exact case.
- **Time can be injected.** Every function takes the current time as input instead of calling `new Date()` internally, which is what makes the `?at=` parameter and the tests possible.

## Project structure

```
├── server.js              # Express routes
├── lib/
│   └── schedule-logic.js  # Pure schedule functions
├── scheduleData.json      # School calendar and period times
├── test/                  # node --test suites
└── package.json
```

## Tests

Run with `npm test`. Covers:

- A/B day alternation across holidays
- Weekends and holidays return `no_school`
- Special schedule overrides (half days)
- Timezone edge case at 23:30 Madrid time
- Invalid input handling

## Tech

Node.js, Express, Node's built-in test runner.

## License

MIT
