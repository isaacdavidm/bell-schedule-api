# Bell Schedule API

A small REST API that tells you what class period it is at a school, right now or at any moment you ask about. It handles weekends, holidays, special schedules (half days, extended homeroom), and timezones.

Schedule logic adapted from [BHS Bell](https://bhsbell.com), a bell schedule site I built with Max Smith for Barcelona High School.

> Ships with sample schedule data modeled on a real school's 2026-27 calendar. Swap `scheduleData.json` to use your own.

## Quick start

```bash
git clone https://github.com/mcnoobington-es/bell-schedule-api.git
cd bell-schedule-api
npm install
npm start
```

The server runs at `http://localhost:3000`.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/period` | The period (or break) at a moment, and what's next. Defaults to now. |
| GET | `/api/next-school-day` | The next day with school, skipping weekends and holidays. Defaults to after today. |

All times are Madrid local time (`Europe/Madrid`).

### `GET /api/period`

| Query parameter | Format | Default |
|-----------------|--------|---------|
| `at` (optional) | `YYYY-MM-DDTHH:MM` | the current Madrid date and time |

The `at` parameter lets you test any moment without waiting for it:

```bash
curl "localhost:3000/api/period?at=2026-11-03T10:15"
```

```json
{
  "status": "in_period",
  "date": "2026-11-03",
  "time": "10:15",
  "reason": null,
  "holiday": null,
  "special_schedule": null,
  "current_period": { "id": "passing_period_1", "name": "Passing Period", "end_time": "10:20", "minutes_left": 5 },
  "next_period": { "id": "homeroom", "name": "Homeroom", "start_time": "10:20", "minutes_until": 5 }
}
```

Every response has the same fields. Fields that don't apply are `null`. `date` and `time` echo back the moment the answer was computed for, which is useful when you don't pass `at`.

`status` is one of:

| `status` | Meaning | Example |
|----------|---------|---------|
| `in_period` | A class, homeroom, passing period, lunch, or special event is in progress | above |
| `before_school` | School hasn't started yet; `next_period` is the first period | `?at=2026-11-03T08:00` |
| `after_school` | The school day is over | `?at=2026-11-03T16:00` |
| `no_school` | Weekend or holiday; `reason` says which | `?at=2026-11-05T10:00` |

**Before school** (`?at=2026-11-03T08:00`):

```json
{
  "status": "before_school",
  "date": "2026-11-03",
  "time": "08:00",
  "reason": null,
  "holiday": null,
  "special_schedule": null,
  "current_period": { "id": null, "name": null, "end_time": null, "minutes_left": null },
  "next_period": { "id": "1", "name": "Period 1", "start_time": "09:05", "minutes_until": 65 }
}
```

**Holiday** (`?at=2026-11-05T10:00`). On a weekend, `reason` is `"weekend"` and `holiday` is `null`:

```json
{
  "status": "no_school",
  "date": "2026-11-05",
  "time": "10:00",
  "reason": "holiday",
  "holiday": "Parent Teacher Conferences",
  "special_schedule": null,
  "current_period": { "id": null, "name": null, "end_time": null, "minutes_left": null },
  "next_period": { "id": null, "name": null, "start_time": null, "minutes_until": null }
}
```

**Special schedule** (`?at=2026-10-30T13:00`). The day's own period times replace the regular ones:

```json
{
  "status": "in_period",
  "date": "2026-10-30",
  "time": "13:00",
  "reason": null,
  "holiday": null,
  "special_schedule": "Half Day - Halloween Party",
  "current_period": { "id": "party", "name": "Party", "end_time": "14:45", "minutes_left": 105 },
  "next_period": { "id": null, "name": null, "start_time": null, "minutes_until": null }
}
```

Each period has an `id` (the raw key from `scheduleData.json`, stable for programs to check against) and a `name` (a readable label). Minutes are plain numbers, so the caller decides how to display them.

### `GET /api/next-school-day`

| Query parameter | Format | Default |
|-----------------|--------|---------|
| `date` (optional) | `YYYY-MM-DD` | the current Madrid date |

Returns the first school day **after** `date`.

```bash
curl "localhost:3000/api/next-school-day?date=2026-11-04"
```

```json
{
  "date": "2026-11-09",
  "day": "Monday",
  "is_tomorrow": false,
  "days_away": 5
}
```

Here, Nov 5–6 are holidays and Nov 7–8 are a weekend, so the next school day is Monday, 5 days away.

## Errors

Errors return JSON with an `error` message.

| Status | When | Example response |
|--------|------|------------------|
| 400 | `at` isn't in `YYYY-MM-DDTHH:MM` format | `{ "error": "Invalid \"at\" parameter. Use YYYY-MM-DDTHH:MM, e.g. 2025-10-30T10:15" }` |
| 400 | `at` has the right format but isn't a real date or time (`2026-02-30T10:00`, `2026-11-03T24:00`) | `{ "error": "\"2026-02-30T10:00\" is not a real date and time. Use YYYY-MM-DDTHH:MM, e.g. 2025-10-30T10:15" }` |
| 400 | `date` isn't in `YYYY-MM-DD` format | `{ "error": "Invalid \"date\" parameter. Use YYYY-MM-DD, e.g. 2025-10-30" }` |
| 400 | `date` has the right format but isn't a real date (`2026-02-30`) | `{ "error": "\"2026-02-30\" is not a real date. Use YYYY-MM-DD, e.g. 2025-10-30" }` |
| 404 | `/api/next-school-day` finds no school day in the next 90 days | `{ "error": "Next school day not found." }` |

A path that doesn't exist gets Express's default 404 page, which is HTML, not JSON.

## How it works

- **Weekends and holidays** are checked first. Either one returns `no_school` without looking at period times.
- **Special schedules:** a date can override the normal period times (half days, extended homeroom, events).
- **Config-driven:** all school-specific data lives in `scheduleData.json`: period times, holidays, and special schedules. Nothing school-specific is hardcoded.

## Design decisions

- **Logic is separate from the server.** `lib/` contains plain functions that take the schedule data and a date/time as arguments, with no globals and no I/O. `server.js` only turns HTTP requests into function calls and the results back into JSON.
- **Timezones are explicit.** Servers usually run in UTC, so "now" is converted to `Europe/Madrid` using `Intl.DateTimeFormat` instead of `Date` local-time methods. Otherwise, between roughly 23:00 and 01:00 local time, the server would compute the wrong date and could mistake a school day for a weekend.
- **Dates are passed around as `YYYY-MM-DD` strings.** Calendar maths (day of week, adding days) is done at UTC midnight, so the server's own time zone never shifts the date.
- **Time can be injected.** The functions take the date and time as input instead of calling `new Date()` themselves, which is what makes the `?at=` and `?date=` parameters possible.

## Project structure

```
├── server.js              # Express routes and input validation
├── lib/
│   ├── schedule-logic.js  # Periods, holidays, special schedules, next school day
│   └── time.js            # Madrid time, day of week, date maths, date/time validation
├── scheduleData.json      # School calendar and period times
└── package.json
```

## Tech

Node.js, Express.

## License

MIT
