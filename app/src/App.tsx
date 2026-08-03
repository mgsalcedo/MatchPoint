import { useEffect } from "react";
import { Route, Routes } from "react-router-dom";
import { MatchSessionProvider } from "./context/MatchSessionContext";
import { AuthCallback } from "./pages/AuthCallback";
import { ContactSuccess } from "./pages/ContactSuccess";
import { Login } from "./pages/Login";
import { OrganizationProfile } from "./pages/OrganizationProfile";
import { Results } from "./pages/Results";
import { SportMatch } from "./pages/SportMatch";
import { Welcome } from "./pages/Welcome";
import { track } from "./lib/analytics";

function App() {
  // Fires on every mount, including the real document-navigation remount after the OAuth
  // redirect lands back on /auth/callback — intentional, not deduplicated (spec Edge Cases,
  // research.md R9, 005-analytics-funnel).
  useEffect(() => {
    track({ name: "app_opened" });
  }, []);

  return (
    <MatchSessionProvider>
      <div className="app-shell">
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
