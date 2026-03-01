import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import Home from "./pages/Home";
import Runs from "./pages/Runs";
import Investigation from "./pages/Investigation";
import Report from "./pages/Report";
import IntegrationTests from "./pages/IntegrationTests";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

export default function App() {
  return (
    <ConvexProvider client={convex}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/runs" element={<Runs />} />
          <Route path="/investigate/:id" element={<Investigation />} />
          <Route path="/report/:id" element={<Report />} />
          <Route path="/tests" element={<IntegrationTests />} />
        </Routes>
      </BrowserRouter>
    </ConvexProvider>
  );
}
