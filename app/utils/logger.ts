import winston from "winston";
import SlackHook from "winston-slack-webhook-transport";

// Single format function to handle all argument types
const formatArgs = (args: any[]): string => {
  return args
    .map((arg) => {
      if (typeof arg === "object") {
        return JSON.stringify(arg, null, 2);
      }
      if (typeof arg === "string" && (arg.startsWith("{") || arg.startsWith("["))) {
        try {
          return JSON.stringify(JSON.parse(arg), null, 2);
        } catch {
          return arg;
        }
      }
      return String(arg);
    })
    .join("\n");
};

// Single custom format for all transports
const customFormat = winston.format((info) => {
  const splat = info[Symbol.for("splat")];
  if (Array.isArray(splat) && splat.length) {
    info.message += "\n" + formatArgs(splat);
  }
  return info;
});

// Base format components
const timestamp = winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" });
const errorFormat = winston.format((info) => {
  if (info instanceof Error) {
    Object.assign(info, { message: info.stack });
  }
  return info;
});

// Console format
const consoleFormat = winston.format.combine(
  errorFormat(),
  timestamp,
  winston.format.colorize(),
  customFormat(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    return `${timestamp} [${level}]: ${message}${metaStr}`;
  }),
);

// File format
const fileFormat = winston.format.combine(
  errorFormat(),
  timestamp,
  winston.format.uncolorize(),
  customFormat(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    return `${timestamp} [${level}]: ${message}${metaStr}`;
  }),
);

// Slack format
const slackFormat = winston.format.combine(
  errorFormat(),
  customFormat(),
  winston.format.uncolorize(),
  winston.format.printf(({ level, message }) => `[${level}]: ${message}`),
);

// Transports
const transports = [
  new winston.transports.Console({
    stderrLevels: ["error"],
    format: consoleFormat,
  }),
  new SlackHook({
    webhookUrl: process.env.SLACK_WEBHOOK_URL || "",
    format: slackFormat,
  }),
];

// Add file transports in non-production
if (process.env.NODE_ENV !== "production") {
  transports.push(
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
      format: fileFormat,
    }),
    new winston.transports.File({
      filename: "logs/combined.log",
      format: fileFormat,
    }),
  );
}

const logger = winston.createLogger({
  level: "debug",
  transports,
});

export default logger;
