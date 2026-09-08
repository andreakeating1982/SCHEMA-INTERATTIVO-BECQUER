import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { AccessibilityProvider } from "./contexts/AccessibilityContext";
import { AccessibilityToolbar } from "./components/AccessibilityToolbar";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import TeacherPage from "./pages/TeacherPage";
import StudentSchema from "./pages/StudentSchema";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/docente"} component={TeacherPage} />
      <Route path={"/schema"} component={StudentSchema} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AccessibilityProvider>
        <ThemeProvider defaultTheme="light">
          <TooltipProvider>
            <AccessibilityToolbar />
            <Toaster />
            <Router />
          </TooltipProvider>
        </ThemeProvider>
      </AccessibilityProvider>
    </ErrorBoundary>
  );
}

export default App;
