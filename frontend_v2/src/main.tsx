import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { VizShowroom } from "./VizShowroom.tsx";
import { ToastProvider } from "./components/toast.tsx";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <ToastProvider>
    {/* étape 6 : banc d'essai des graphiques — à remplacer par <App /> ensuite */}
    <VizShowroom />
  </ToastProvider>
);