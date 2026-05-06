import ReactDOM from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App";
import "./firebase";   // ← ADD THIS LINE

const CLIENT_ID =
  "367749750782-bcoq8s623nvttkblm2i71qg8rtt0nv56.apps.googleusercontent.com";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
    <GoogleOAuthProvider clientId={CLIENT_ID}>
      <App /> {/* ✅ No BrowserRouter here */}
    </GoogleOAuthProvider>
);
