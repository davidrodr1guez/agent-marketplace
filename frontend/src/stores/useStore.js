import { create } from 'zustand';

export const useStore = create((set, get) => ({
  // Active tasks being processed
  activeTasks: [],
  addActiveTask: (task) => set((state) => ({
    activeTasks: [...state.activeTasks, task]
  })),
  updateActiveTask: (taskId, updates) => set((state) => ({
    activeTasks: state.activeTasks.map(t =>
      t.id === taskId ? { ...t, ...updates } : t
    )
  })),
  removeActiveTask: (taskId) => set((state) => ({
    activeTasks: state.activeTasks.filter(t => t.id !== taskId)
  })),

  // Payment flow events
  paymentEvents: [],
  addPaymentEvent: (event) => set((state) => ({
    paymentEvents: [event, ...state.paymentEvents].slice(0, 50) // Keep last 50
  })),
  clearPaymentEvents: () => set({ paymentEvents: [] }),

  // WebSocket connection status
  wsConnected: false,
  setWsConnected: (connected) => set({ wsConnected: connected }),

  // UI State
  selectedAgentType: null,
  setSelectedAgentType: (type) => set({ selectedAgentType: type }),

  // Notifications
  notifications: [],
  addNotification: (notification) => {
    const id = Date.now();
    set((state) => ({
      notifications: [...state.notifications, { ...notification, id }]
    }));
    // Auto remove after 5s
    setTimeout(() => {
      set((state) => ({
        notifications: state.notifications.filter(n => n.id !== id)
      }));
    }, 5000);
  },
}));
