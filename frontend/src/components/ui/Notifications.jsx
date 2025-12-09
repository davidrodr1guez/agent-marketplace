import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';
import { useStore } from '../../stores/useStore';

const icons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: AlertCircle,
};

const colors = {
  success: 'border-neon-green/30 bg-neon-green/5',
  error: 'border-neon-pink/30 bg-neon-pink/5',
  warning: 'border-neon-yellow/30 bg-neon-yellow/5',
  info: 'border-neon-blue/30 bg-neon-blue/5',
};

const iconColors = {
  success: 'text-neon-green',
  error: 'text-neon-pink',
  warning: 'text-neon-yellow',
  info: 'text-neon-blue',
};

export function Notifications() {
  const notifications = useStore((s) => s.notifications);

  return (
    <div className="fixed bottom-6 right-6 z-50 space-y-2">
      <AnimatePresence>
        {notifications.map((notification) => (
          <NotificationCard key={notification.id} notification={notification} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function NotificationCard({ notification }) {
  const Icon = icons[notification.type] || AlertCircle;
  const colorClass = colors[notification.type] || colors.info;
  const iconColor = iconColors[notification.type] || iconColors.info;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`p-4 rounded-xl border backdrop-blur-xl ${colorClass} min-w-[300px] max-w-[400px]`}
    >
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 mt-0.5 ${iconColor}`} />
        <div className="flex-1">
          <h4 className="font-medium text-white">{notification.title}</h4>
          {notification.message && (
            <p className="text-sm text-white/60 mt-0.5">{notification.message}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
