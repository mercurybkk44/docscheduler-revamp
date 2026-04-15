import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/lib/i18n";
import AppLayout from "@/components/AppLayout";
import DoctorsPage from "./pages/DoctorsPage";
import UnavailablePage from "./pages/UnavailablePage";
import HolidaysPage from "./pages/HolidaysPage";
import SchedulePage from "./pages/SchedulePage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <I18nProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppLayout>
            <Routes>
              <Route path="/" element={<DoctorsPage />} />
              <Route path="/availability" element={<UnavailablePage />} />
              <Route path="/holidays" element={<HolidaysPage />} />
              <Route path="/schedule" element={<SchedulePage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppLayout>
        </BrowserRouter>
      </I18nProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
