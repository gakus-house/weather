import axios from "axios";
import ical from "ical-generator";
import fs from "fs";

const LAT = 38.312592140840714;
const LON = 140.840717;

const WEATHER_URL =
  `https://api.open-meteo.com/v1/forecast` +
  `?latitude=${LAT}` +
  `&longitude=${LON}` +
  `&hourly=temperature_2m,precipitation,precipitation_probability,rain,snowfall,showers,wind_speed_10m` +
  `&current=temperature_2m,wind_speed_10m,precipitation,rain,showers,snowfall,is_day` +
  `&timezone=Asia%2FTokyo`;

const response = await axios.get(WEATHER_URL);

const data = response.data;

const cal = ical({
  name: "Weather Forecast",
  timezone: "Asia/Tokyo",
  prodId: {
    company: "gaku",
    product: "weather-calendar",
    language: "JA",
  },
  method: "PUBLISH",
});

const weatherEmoji = (rain, snow, prob) => {
  if (snow > 0) return "❄️";
  if (rain > 5) return "⛈";
  if (rain > 0) return "🌧";
  if (prob > 60) return "☔";
  return "☀️";
};

const hours = data.hourly.time;

for (let i = 0; i < hours.length; i++) {
  const time = hours[i];

  const temp = data.hourly.temperature_2m[i];
  const rain = data.hourly.rain[i];
  const snow = data.hourly.snowfall[i];
  const precipitation = data.hourly.precipitation[i];
  const probability =
    data.hourly.precipitation_probability[i];
  const wind = data.hourly.wind_speed_10m[i];

  const emoji = weatherEmoji(
    rain,
    snow,
    probability
  );

  const start = new Date(time);

  const end = new Date(start);
  end.setHours(end.getHours() + 1);

  const summary =
    `${emoji} ${temp}°C ` +
    `☔${probability}%`;

  const description = [
    `Temperature: ${temp}°C`,
    `Precipitation: ${precipitation} mm`,
    `Rain: ${rain} mm`,
    `Snowfall: ${snow} cm`,
    `Rain Probability: ${probability}%`,
    `Wind Speed: ${wind} km/h`,
  ].join("\\n");

  cal.createEvent({
    id: `weather-${time}`,
    start,
    end,
    summary,
    description,
    location: "Japan",
    floating: false,
    timezone: "Asia/Tokyo",

    // Apple Calendar 最適化
    busystatus: "FREE",
    transparency: "TRANSPARENT",

    alarms: [
      {
        type: "display",
        trigger: 0,
      },
    ],
  });
}

fs.mkdirSync("docs", { recursive: true });

fs.writeFileSync(
  "docs/weather.ics",
  cal.toString()
);

console.log("generated docs/weather.ics");
