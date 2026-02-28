import { Link } from 'react-router-dom';
import { Home, Terminal } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-4">
        <Terminal size={32} className="text-muted-foreground" />
      </div>
      <h1 className="text-4xl font-bold text-foreground font-heading mb-2">404</h1>
      <p className="text-muted-foreground mb-6">Page not found</p>
      <Link
        to="/"
        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-blue-700"
      >
        <Home size={16} />
        Back to Dashboard
      </Link>
    </div>
  );
}
