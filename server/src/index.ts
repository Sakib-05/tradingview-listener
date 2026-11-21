import express, { Request, response, Response } from "express";

const app = express();
const port = process.env.PORT || 3001;
const CORS = process.env.CORS ? require("cors") : null;
if (CORS) {
  app.use(CORS({ origin: "http://localhost:3000" }));
}

app.use(express.json());

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

app.listen(port, () => {
  console.log(`Backend running at http://localhost:${port}`);
});