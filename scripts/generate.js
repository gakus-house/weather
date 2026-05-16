import axios from "axios";
import ical from "ical-generator";
import fs from "fs";

// 仙台市泉区
const LAT = 38.312592140840714;
const LON = 140.840717;

const url =
  `https://api.open-meteo.com/v1/forecast` +
  `?latitude=${LAT}` +
  `&longitude=${LON}` +
  `&hourly=` +
  [
    "temperature_2m",
    "precipitation_probability",
    "rain",
    "snowfall",
    "weathercode"
  ].join(",") +
  `&timezone=Asia/Tokyo` +
  `&forecast_days=3`;

const response = await axios.get(url);

const data = response.data;

const cal = ical({
  name: "仙台市泉区 天気",
  timezone: "Asia/Tokyo",
  method: "PUBLISH",
  prodId: {
    company: "gaku",
    product: "weather-calendar",
    language: "JA",
  },

  x: [
    ["X-WR-CALNAME", "仙台市泉区 天気"],
    ["X-WR-TIMEZONE", "Asia/Tokyo"],
    ["REFRESH-INTERVAL;VALUE=DURATION", "PT1H"],
    ["X-PUBLISHED-TTL", "PT1H"],
  ],
});

function emoji(code, rain, snow) {
  if (snow > 0) return "❄️";
  if (rain > 5) return "⛈";
  if (rain > 0) return "🌧";
  if (code === 0) return "☀️";
  if (code <= 3) return "☁️";
  return "🌤";
}

const times = data.hourly.time;

for (let i = 0; i < times.length; i++) {
  const time = times[i];

  const temp =
    data.hourly.temperature_2m[i];

  const rain =
    data.hourly.rain[i];

  const snow =
    data.hourly.snowfall[i];

  const probability =
    data.hourly.precipitation_probability[i];

  const code =
    data.hourly.weathercode[i];

  const icon =
    emoji(code, rain, snow);

  const start = new Date(time);

  const end = new Date(start);
  end.setHours(end.getHours() + 1);

  // 通常イベント
  cal.createEvent({
    id: `weather-${time}`,

    start,
    end,

    summary:
      `${icon} ${temp}°C ☔${probability}%`,

    description:
      `仙台市泉区\n` +
      `気温: ${temp}°C\n` +
      `降水確率: ${probability}%\n` +
      `雨量: ${rain}mm\n` +
      `積雪: ${snow}cm`,

    location: "仙台市泉区",

    busystatus: "FREE",
    transparency: "TRANSPARENT",
  });

  // 雨通知
  if (
    probability >= 70 ||
    rain > 0
  ) {
    cal.createEvent({
      id: `rain-alert-${time}`,

      start,
      end,

      summary:
        `☔ 雨予報 ${probability}%`,

      description:
        `仙台市泉区で雨予報\n` +
        `雨量: ${rain}mm`,

      location: "仙台市泉区",

      alarms: [
        {
          type: "display",
          trigger: -1800,
        },
      ],

      busystatus: "FREE",
      transparency: "TRANSPARENT",
    });
  }
}

// docs フォルダ作成
fs.mkdirSync("docs", {
  recursive: true,
});

// ICS保存
fs.writeFileSync(
  "docs/weather.ics",
  cal.toString(),
  "utf8"
);

console.log("generated docs/weather.ics");
