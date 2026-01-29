// src/App.jsx
import "./App.css";
import { BrowserRouter } from "react-router-dom";
import AuthRoutes from "./routes/AuthRoutes";
import "bootstrap/dist/css/bootstrap.min.css";
import { ThemeProvider } from "./constants/theme";
function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthRoutes />
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
