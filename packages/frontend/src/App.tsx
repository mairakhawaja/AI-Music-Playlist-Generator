import { Routes, Route } from "react-router-dom";
import { AuthGuard } from "./features/auth/AuthGuard";
import { AuthCallback } from "./features/auth/AuthCallback";
import { ConnectPage } from "./features/auth/ConnectPage";
import { GeneratorPage } from "./features/generator/GeneratorPage";
import { ResultsPage } from "./features/playlist/ResultsPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<ConnectPage />} />
      <Route path="/callback" element={<AuthCallback />} />
      <Route element={<AuthGuard />}>
        <Route path="/generate" element={<GeneratorPage />} />
        <Route path="/results" element={<ResultsPage />} />
      </Route>
    </Routes>
  );
}

export default App;
