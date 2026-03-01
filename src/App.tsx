import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import Home from "./pages/Home";
import Investigation from "./pages/Investigation";
import Report from "./pages/Report";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

export default function App() {
  return (
    <ConvexProvider client={convex}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/investigate/:id" element={<Investigation />} />
          <Route path="/report/:id" element={<Report />} />
        </Routes>
      </BrowserRouter>
    </ConvexProvider>
  );
}
