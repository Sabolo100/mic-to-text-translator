import { createRoot } from "react-dom/client";
import { initLogger } from "./utils/debugLogger";
import App from "./App.tsx";
import "./index.css";

initLogger();
const root = document.getElementById("root");
if (!root) throw new Error("Application root is missing");
createRoot(root).render(<App />);
