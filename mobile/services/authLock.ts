type AccountLockPayload = {
  message: string;
};

type Listener = (payload: AccountLockPayload) => void;

const listeners = new Set<Listener>();

export const notifyAccountLocked = (payload: AccountLockPayload) => {
  for (const listener of listeners) {
    listener(payload);
  }
};

export const subscribeToAccountLock = (listener: Listener) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};
