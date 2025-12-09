import { Header } from './Header';
import { PaymentFeed } from '../ui/PaymentFeed';
import { Notifications } from '../ui/Notifications';

export function Layout({ children }) {
  return (
    <div className="min-h-screen bg-dark-900">
      {/* Background effects */}
      <div className="fixed inset-0 bg-grid-pattern bg-grid opacity-30 pointer-events-none" />
      <div className="fixed inset-0 bg-gradient-radial from-neon-blue/5 via-transparent to-transparent pointer-events-none" />

      <Header />

      <main className="pt-24 pb-12 px-6">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      {/* Live payment feed sidebar */}
      <PaymentFeed />

      {/* Notifications */}
      <Notifications />
    </div>
  );
}
