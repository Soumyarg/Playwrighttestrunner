import { useSelector, useDispatch } from 'react-redux';
import { useEffect } from 'react';
import { clearNotification } from '../store/uiSlice';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const icons = {
  success: <CheckCircle size={18} className="text-green-500" />,
  error: <XCircle size={18} className="text-red-500" />,
  warning: <AlertCircle size={18} className="text-yellow-500" />,
  info: <Info size={18} className="text-blue-500" />,
};

const bgColors = {
  success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
  error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
  warning: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
  info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
};

export default function Notification() {
  const dispatch = useDispatch();
  const notification = useSelector(state => state.ui.notification);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => dispatch(clearNotification()), notification.duration || 3000);
      return () => clearTimeout(timer);
    }
  }, [notification, dispatch]);

  return (
    <div className="fixed bottom-4 right-4 z-notification">
      <AnimatePresence>
        {notification && (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`flex items-start gap-3 px-4 py-3 rounded-lg border shadow-elevation-lg max-w-sm ${bgColors[notification.type] || bgColors.info}`}
          >
            {icons[notification.type] || icons.info}
            <p className="text-sm text-foreground flex-1">{notification.message}</p>
            <button
              onClick={() => dispatch(clearNotification())}
              className="text-muted-foreground hover:text-foreground mt-0.5"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
