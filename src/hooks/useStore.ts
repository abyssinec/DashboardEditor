import { useSyncExternalStore } from "react";

import { getState, subscribe } from "../store";

export function useStore<T>(selector: (s: ReturnType<typeof getState>) => T): T {
  return useSyncExternalStore(subscribe, () => selector(getState()));
}


