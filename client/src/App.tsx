import { Switch, Route, Link, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import SearchPage from "@/pages/search";
import BatchDownload from "@/pages/batch-download";
import MassAnalysis from "@/pages/mass-analysis";
import KeywordSearch from "@/pages/keyword-search";
import Chat from "@/pages/chat";
import { Home as HomeIcon, Search, Download, BarChart3, Hash, MessageCircle } from "lucide-react";

function Router() {
  const [location] = useLocation();
  
  return (
    <>
      <nav className="relative z-20 bg-black/50 backdrop-blur-md border-b border-cyan-500/20">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center gap-2 md:gap-4 py-4 overflow-x-auto">
            <Link 
              href="/"
              className={`flex items-center gap-2 px-4 md:px-6 py-2.5 rounded-lg transition-all whitespace-nowrap ${
                location === "/" 
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/50" 
                  : "text-cyan-400/60 hover:text-cyan-300 hover:bg-cyan-500/10"
              }`}
              data-testid="nav-home"
            >
              <HomeIcon className="h-5 w-5" />
              <span className="font-semibold hidden md:inline">Inicio</span>
            </Link>
            <Link 
              href="/search"
              className={`flex items-center gap-2 px-4 md:px-6 py-2.5 rounded-lg transition-all whitespace-nowrap ${
                location === "/search" 
                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/50" 
                  : "text-purple-400/60 hover:text-purple-300 hover:bg-purple-500/10"
              }`}
              data-testid="nav-search"
            >
              <Search className="h-5 w-5" />
              <span className="font-semibold hidden md:inline">Buscar</span>
            </Link>
            <Link 
              href="/batch"
              className={`flex items-center gap-2 px-4 md:px-6 py-2.5 rounded-lg transition-all whitespace-nowrap ${
                location === "/batch" 
                  ? "bg-green-500/20 text-green-300 border border-green-500/50" 
                  : "text-green-400/60 hover:text-green-300 hover:bg-green-500/10"
              }`}
              data-testid="nav-batch"
            >
              <Download className="h-5 w-5" />
              <span className="font-semibold hidden md:inline">Descarga Múltiple</span>
            </Link>
            <Link 
              href="/keyword"
              className={`flex items-center gap-2 px-4 md:px-6 py-2.5 rounded-lg transition-all whitespace-nowrap ${
                location === "/keyword" 
                  ? "bg-pink-500/20 text-pink-300 border border-pink-500/50" 
                  : "text-pink-400/60 hover:text-pink-300 hover:bg-pink-500/10"
              }`}
              data-testid="nav-keyword"
            >
              <Hash className="h-5 w-5" />
              <span className="font-semibold hidden md:inline">Palabras Clave</span>
            </Link>
            <Link 
              href="/analysis"
              className={`flex items-center gap-2 px-4 md:px-6 py-2.5 rounded-lg transition-all whitespace-nowrap ${
                location === "/analysis" 
                  ? "bg-orange-500/20 text-orange-300 border border-orange-500/50" 
                  : "text-orange-400/60 hover:text-orange-300 hover:bg-orange-500/10"
              }`}
              data-testid="nav-analysis"
            >
              <BarChart3 className="h-5 w-5" />
              <span className="font-semibold hidden md:inline">Análisis</span>
            </Link>
            <Link 
              href="/chat"
              className={`flex items-center gap-2 px-4 md:px-6 py-2.5 rounded-lg transition-all whitespace-nowrap ${
                location === "/chat" 
                  ? "bg-blue-500/20 text-blue-300 border border-blue-500/50" 
                  : "text-blue-400/60 hover:text-blue-300 hover:bg-blue-500/10"
              }`}
              data-testid="nav-chat"
            >
              <MessageCircle className="h-5 w-5" />
              <span className="font-semibold hidden md:inline">Chat Global</span>
            </Link>
          </div>
        </div>
      </nav>
      
      <Switch>
        <Route path="/" component={Home}/>
        <Route path="/search" component={SearchPage}/>
        <Route path="/batch" component={BatchDownload}/>
        <Route path="/keyword" component={KeywordSearch}/>
        <Route path="/analysis" component={MassAnalysis}/>
        <Route path="/chat" component={Chat}/>
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
