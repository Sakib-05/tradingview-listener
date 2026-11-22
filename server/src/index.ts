import express, { Request, Response } from "express";
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { Server } from "socket.io";

const app = express();
const port = process.env.PORT || 3001;
const clientOrigin = process.env.CORS || "http://localhost:3000";

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", clientOrigin);
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");

  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }

  next();
});

app.use(express.json());
app.use("/audio", express.static(path.resolve(__dirname, "../../audio")));

// prints in the terminal the method and path of each request
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

app.get("/", (req: Request, res: Response) => {
  res.json({
    message: "Hello from the backend!",
  });
});

app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
  });
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: clientOrigin,
  },
});

const supportedTopics = new Set([
  "timeframe:1m",
  "timeframe:5m",
  "timeframe:15m",
  "timeframe:1h",
  "timeframe:4h",
]);

io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on("disconnect", (reason) => {
    console.log(`Socket disconnected: ${socket.id} (${reason})`);
  });

  socket.on("subscribe", (topic: string) => {
    if (!supportedTopics.has(topic)) {
      return;
    }

    socket.join(topic);

    const timeframe = topic.replace("timeframe:", "");
    const audioPath = `/audio/wav/${timeframe}/current_msb/green_above.wav`;

    socket.emit("timeframe:update", {
      eventId: randomUUID(),
      topic,
      timeframe,
      eventType: "current_msb",
      msbColor: "green",
      candleClose: "above",
      message: "Current MSB - MSB: Green | Candle close: Above",
      audioPath,
      timestamp: new Date().toISOString(),
    });
  });

  socket.on("unsubscribe", (topic: string) => {
    socket.leave(topic);
  });
});

const testAlerts = new Map([
  [
    "1m",
    {
      topic: "timeframe:1m",
      audioPath: "/audio/wav/1m/new_msb/green_below.wav",
      eventType: "new_msb",
      msbColor: "green",
      candleClose: "below",
      message: "New MSB - MSB: Green | Candle close: Below",
    },
  ],
  [
    "5m",
    {
      topic: "timeframe:5m",
      audioPath: "/audio/wav/5m/new_msb/red_above.wav",
      eventType: "new_msb",
      msbColor: "red",
      candleClose: "above",
      message: "New MSB - MSB: Red | Candle close: Above",
    },
  ],
  [
    "15m",
    {
      topic: "timeframe:15m",
      audioPath: "/audio/wav/15m/price_cross/green_above.wav",
      eventType: "price_cross",
      msbColor: "green",
      candleClose: "above",
      message: "Price cross - MSB: Green | Candle close: Above",
    },
  ],
  [
    "1h",
    {
      topic: "timeframe:1h",
      audioPath: "/audio/wav/1h/price_cross/red_below.wav",
      eventType: "price_cross",
      msbColor: "red",
      candleClose: "below",
      message: "Price cross - MSB: Red | Candle close: Below",
    },
  ],
]);

for (const [timeframe, alert] of testAlerts) {
  app.post(`/test/${timeframe}`, (_req: Request, res: Response) => {
    io.to(alert.topic).emit("timeframe:update", {
      eventId: randomUUID(),
      topic: alert.topic,
      timeframe,
      eventType: alert.eventType,
      msbColor: alert.msbColor,
      candleClose: alert.candleClose,
      message: alert.message,
      audioPath: alert.audioPath,
      timestamp: new Date().toISOString(),
    });

    res.json({
      sent: true,
      topic: alert.topic,
      audioPath: alert.audioPath,
    });
  });
}

httpServer.listen(port, () => {
  console.log(`Backend running at http://localhost:${port}`);
});
