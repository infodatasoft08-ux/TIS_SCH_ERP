const timeToMinutes = (t) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

const isWithinSchoolHours = (start, end) => {
  const { START_TIME, END_TIME } = require("../config/schoolHours");

  const s = timeToMinutes(start.slice(11, 16));
  const e = timeToMinutes(end.slice(11, 16));
  const schoolStart = timeToMinutes(START_TIME);
  const schoolEnd = timeToMinutes(END_TIME);

  return s >= schoolStart && e <= schoolEnd && e > s;
};

module.exports = {
    isWithinSchoolHours
}