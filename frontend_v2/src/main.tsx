import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { Showroom } from "./Showroom.tsx";
import { ToastProvider } from "./components/toast.tsx";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <ToastProvider>
    {/* étape 5 : banc d'essai — à remplacer par <App /> ensuite */}
    <Showroom />
  </ToastProvider>
);