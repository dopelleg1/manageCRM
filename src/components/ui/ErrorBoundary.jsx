import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <Card className="w-full max-w-md shadow-lg border-red-100">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto bg-red-100 p-3 rounded-full w-16 h-16 flex items-center justify-center mb-4">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <CardTitle className="text-xl text-red-700">Qualcosa è andato storto</CardTitle>
            </CardHeader>
            <CardContent className="text-center text-gray-600">
              <p className="mb-4">
                Si è verificato un errore imprevisto nell'applicazione.
              </p>
              {this.state.error && (
                <div className="bg-gray-100 p-3 rounded text-xs text-left overflow-auto max-h-32 font-mono mb-4">
                  {this.state.error.toString()}
                </div>
              )}
              <p className="text-sm">
                Verifica la tua connessione internet o prova a ricaricare la pagina.
              </p>
            </CardContent>
            <CardFooter className="justify-center">
              <Button onClick={this.handleRetry} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Ricarica Pagina
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;