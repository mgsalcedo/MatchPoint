import { Route, Routes } from "react-router-dom";
import { MatchSessionProvider } from "./context/MatchSessionContext";
import { AuthCallback } from "./pages/AuthCallback";
import { ContactSuccess } from "./pages/ContactSuccess";
import { Login } from "./pages/Login";
import { OrganizationProfile } from "./pages/OrganizationProfile";
import { Results } from "./pages/Results";
import { SportMatch } from "./pages/SportMatch";
import { Welcome } from "./pages/Welcome";

function App() {
  return (
    <MatchSessionProvider>
      <div className="app-shell">
        <div className="wip-banner">
          Carcasa PMV — sin data model, diseño final ni microcopy final. Solo flujo navegable.
        </div>
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/match" element={<SportMatch />} />
          <Route path="/match/results" element={<Results />} />
          <Route path="/organizations/:id" element={<OrganizationProfile />} />
          <Route path="/login" element={<Login />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/contact/success" element={<ContactSuccess />} />
        </Routes>
      </div>
    </MatchSessionProvider>
  );
}

export default App;
