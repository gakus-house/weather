    import axios from "axios";
import ical from "ical-generator";
import fs from "fs";

  // 多地域対応
const locations = [
  {
    id: "sendai",
    name: "仙台駅",
    lat: 38.2601,
    lon: 140.8824,
  },
  {
    id: "izumi",
    name: "泉中央",
    lat: 38.3237,
    lon: 140.8816,
  },
  {
    id: "nagamachi",
    name: "長町",
    lat: 38.2245,
    lon: 140.8796,
  },
  {
    id: "chomeigaoka",
    name: "長命ケ丘",
    lat: 38.3346,
    lon: 140.8213,
  },
  {
    id: "yagiyama",
    name: "八木山",
    lat: 38.2332,
    lon: 140.8577,
  },
  {
    id: "akita",
    name: "秋田",
    lat: 39.7200,
    lon: 140.1025,
  },
  {
    id: "akihabara",
    name: "秋葉原",
    lat: 35.6984,
    lon: 139.7730,
  },
  {
    id: "aobadori",
    name: "青葉通",
    lat: 38.2597,
    lon: 140.8694,
  },
  {
    id: "kokubuncho",
    name: "国分町",
    lat: 38.2645,
    lon: 140.8696,
  },
  {
    id: "aramachi",
    name: "荒町",
    lat: 38.2462,
    lon: 140.8804,
  },
  {
    id: "tomiya",
    name: "富谷",
    lat: 38.3931,
    lon: 140.8861,
  },
  {
    id: "tagajo",
    name: "多賀城",
    lat: 38.2938,
    lon: 141.0046,
  },
  {
    id: "shiogama",
    name: "塩釜",
    lat: 38.3147,
    lon: 141.0228,
  },
  {
    id: "iwanuma",
    name: "岩沼",
    lat: 38.1047,
    lon: 140.8595,
  },
  {
    id: "akiu",
    name: "秋保",
    lat: 38.2265,
    lon: 140.7223,
  },
];
function emoji(code, rain, snow) {
  if (snow > 0) return "❄️";
  if (rain > 5) return "⛈";
  if (rain > 0) return "🌧";
  if (code === 0) return "☀️";
  if (code <= 3) return "☁️";
  return "🌤";
}

function heatLevel(temp, humidity) {
  const wbgt =
    temp * 0.7 +
    (humidity / 100) * temp * 0.3;

  if (wbgt >= 31) {
    return {
      level: "危険",
      icon: "🚨"
    };
  }

  if (wbgt >= 28) {
    return {
      level: "厳重警戒",
      icon: "⚠️"
    };
  }

  if (wbgt >= 25) {
    return {
      level: "警戒",
      icon: "🥵"
    };
  }

  return null;
}

for (const loc of locations) {

  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${loc.lat}` +
    `&longitude=${loc.lon}` +
    `&hourly=` +
    [
      "temperature_2m",
      "relative_humidity_2m",
      "precipitation_probability",
      "rain",
      "snowfall",
      "weathercode"
    ].join(",") +
    `&timezone=Asia/Tokyo` +
    `&forecast_days=7`;

  const response = await axios.get(url);

  const data = response.data;

  const cal = ical({
    name: `${loc.name} 天気`,
    timezone: "Asia/Tokyo",
    method: "PUBLISH",

    x: [
      ["X-WR-CALNAME", `${loc.name} 天気`],
      ["X-WR-TIMEZONE", "Asia/Tokyo"],
      ["REFRESH-INTERVAL;VALUE=DURATION", "PT1H"],
      ["X-PUBLISHED-TTL", "PT1H"]
    ]
  });

  const times = data.hourly.time;

  for (let i = 0; i < times.length; i++) {

    const time =
      times[i];

    const temp =
      data.hourly.temperature_2m[i];

    const humidity =
      data.hourly.relative_humidity_2m[i];

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

    const start =
      new Date(time);

    const end =
      new Date(start);

    end.setHours(
      end.getHours() + 1
    );

    cal.createEvent({
      id: `${loc.id}-${time}`,

      start,
      end,

      summary:
        `${icon} ${temp}°C ☔${probability}%`,

      description:
        `${loc.name}\n` +
        `気温: ${temp}°C\n` +
        `湿度: ${humidity}%\n` +
        `降水確率: ${probability}%\n` +
        `雨量: ${rain}mm`,

      location: loc.name,

      busystatus: "FREE",
      transparency: "TRANSPARENT"
    });

    if (
      probability >= 70 ||
      rain > 0
    ) {
      cal.createEvent({
        id:
          `rain-${loc.id}-${time}`,

        start,
        end,

        summary:
          `☔ ${loc.name} 雨予報 ${probability}%`,

        description:
          `${loc.name}で雨予報\n` +
          `雨量: ${rain}mm`,

        location: loc.name,

        alarms: [
          {
            type: "display",
            trigger: -1800
          }
        ],

        busystatus: "FREE",
        transparency: "TRANSPARENT"
      });
    }

    const heat =
      heatLevel(
        temp,
        humidity
      );

    if (heat) {

      cal.createEvent({
        id:
          `heat-${loc.id}-${time}`,

        start,
        end,

        summary:
          `${heat.icon} 熱中症${heat.level}`,

        description:
          `${loc.name}\n` +
          `気温: ${temp}°C\n` +
          `湿度: ${humidity}%\n` +
          `熱中症リスク: ${heat.level}`,

        location: loc.name,

        alarms: [
          {
            type: "display",
            trigger: -3600
          }
        ],

        busystatus: "FREE",
        transparency: "TRANSPARENT"
      });
    }
  }

  fs.mkdirSync(
    loc.id,
    {
      recursive: true
    }
  );

  fs.writeFileSync(
    `${loc.id}/weather.ics`,
    cal.toString(),
    "utf8"
  );

  console.log(
    `generated ${loc.id}`
  );
}
