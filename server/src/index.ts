import "dotenv/config";
import express, { Request, Response } from "express";
import reviewRoutes from "./routes/reviewRoutes";

const app = express();
const PORT = 3000;

app.use(express.json());
app.use("/api", reviewRoutes);

app.get("/health", (req: Request, res: Response) => {
    res.json({
        status: "ok",
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});