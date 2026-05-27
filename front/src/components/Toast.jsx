import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            onClick={() => removeToast(toast.id)}
            className={`pointer-events-auto flex items-center justify-between p-4 rounded bg-surface border border-outline-variant animate-slide-in cursor-pointer ${
              toast.type === 'success'
                ? 'border-primary border-l-4 border-l-primary'
                : toast.type === 'error'
                ? 'border-error border-l-4 border-l-error'
                : 'border-outline border-l-4 border-l-secondary'
            }`}
          >
            <div className="flex items-center gap-3">
              <span
                className={`material-symbols-outlined ${
                  toast.type === 'success'
                    ? 'text-primary'
                    : toast.type === 'error'
                    ? 'text-error'
                    : 'text-secondary'
                }`}
              >
                {toast.type === 'success'
                  ? 'check_circle'
                  : toast.type === 'error'
                  ? 'error'
                  : 'info'}
              </span>
              <p className="font-body-md text-on-surface text-sm leading-relaxed">{toast.message}</p>
            </div>
            <button className="text-secondary hover:text-on-surface ml-4">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
