import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import { storage, newId, type StoredProfile, type StoredSession } from "../storage/db.js";

export interface ProfileDraft {
  id: string;
  name: string;
  sourceType: "d6" | "coin" | "custom";
  alphabetSize: number;
  labels: string[];
  collectionMethod: string;
  targetBits: number;
  notes: string;
}

interface State {
  profile: ProfileDraft | null;
  observations: number[];
  /** Where the current observations came from, for the report's dataset field. */
  datasetSource: string;
  /** When true, nothing is written to storage for the rest of the visit. */
  privateSession: boolean;
  savedProfiles: StoredProfile[];
  savedSessions: StoredSession[];
  storageAvailable: boolean;
}

type Action =
  | { type: "set-profile"; profile: ProfileDraft }
  | { type: "set-observations"; observations: number[]; source: string }
  | { type: "append-observation"; symbol: number }
  | { type: "undo-observation" }
  | { type: "clear-observations" }
  | { type: "set-private"; value: boolean }
  | { type: "loaded"; profiles: StoredProfile[]; sessions: StoredSession[]; available: boolean }
  | { type: "reset" };

const initialState: State = {
  profile: null,
  observations: [],
  datasetSource: "manual entry",
  privateSession: false,
  savedProfiles: [],
  savedSessions: [],
  storageAvailable: true,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "set-profile":
      return { ...state, profile: action.profile };
    case "set-observations":
      return { ...state, observations: action.observations, datasetSource: action.source };
    case "append-observation":
      return {
        ...state,
        observations: [...state.observations, action.symbol],
        datasetSource: "manual entry",
      };
    case "undo-observation":
      return { ...state, observations: state.observations.slice(0, -1) };
    case "clear-observations":
      return { ...state, observations: [], datasetSource: "manual entry" };
    case "set-private":
      return { ...state, privateSession: action.value };
    case "loaded":
      return {
        ...state,
        savedProfiles: action.profiles,
        savedSessions: action.sessions,
        storageAvailable: action.available,
      };
    case "reset":
      return { ...state, profile: null, observations: [], datasetSource: "manual entry" };
    default:
      return state;
  }
}

interface StoreValue extends State {
  setProfile: (profile: ProfileDraft) => void;
  setObservations: (observations: number[], source: string) => void;
  appendObservation: (symbol: number) => void;
  undoObservation: () => void;
  clearObservations: () => void;
  setPrivateSession: (value: boolean) => void;
  saveCurrent: () => Promise<void>;
  loadProfile: (id: string) => Promise<void>;
  deleteProfile: (id: string) => Promise<void>;
  forgetEverything: () => Promise<void>;
  reset: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }): JSX.Element {
  const [state, dispatch] = useReducer(reducer, initialState);

  const refresh = useCallback(async () => {
    const [profiles, sessions] = await Promise.all([
      storage.listProfiles(),
      storage.listSessions(),
    ]);
    dispatch({ type: "loaded", profiles, sessions, available: storage.isAvailable() });
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const saveCurrent = useCallback(async () => {
    // A private session must leave nothing behind, so the guard is here at the
    // single write path rather than at each call site.
    if (state.privateSession || !state.profile) return;
    await storage.saveProfile({ ...state.profile, createdAt: Date.now() });
    if (state.observations.length > 0) {
      await storage.saveSession({
        id: newId(),
        profileId: state.profile.id,
        observations: state.observations,
        source: state.datasetSource,
        createdAt: Date.now(),
      });
    }
    await refresh();
  }, [state.privateSession, state.profile, state.observations, state.datasetSource, refresh]);

  const loadProfile = useCallback(
    async (id: string) => {
      const profile = state.savedProfiles.find((p) => p.id === id);
      if (!profile) return;
      dispatch({ type: "set-profile", profile });
      const sessions = await storage.listSessions(id);
      const latest = sessions[0];
      if (latest) {
        dispatch({
          type: "set-observations",
          observations: latest.observations,
          source: latest.source,
        });
      }
    },
    [state.savedProfiles],
  );

  const deleteProfile = useCallback(
    async (id: string) => {
      await storage.deleteProfile(id);
      await refresh();
    },
    [refresh],
  );

  const forgetEverything = useCallback(async () => {
    await storage.clearAll();
    dispatch({ type: "reset" });
    await refresh();
  }, [refresh]);

  const value = useMemo<StoreValue>(
    () => ({
      ...state,
      setProfile: (profile) => dispatch({ type: "set-profile", profile }),
      setObservations: (observations, source) =>
        dispatch({ type: "set-observations", observations, source }),
      appendObservation: (symbol) => dispatch({ type: "append-observation", symbol }),
      undoObservation: () => dispatch({ type: "undo-observation" }),
      clearObservations: () => dispatch({ type: "clear-observations" }),
      setPrivateSession: (v) => dispatch({ type: "set-private", value: v }),
      saveCurrent,
      loadProfile,
      deleteProfile,
      forgetEverything,
      reset: () => dispatch({ type: "reset" }),
    }),
    [state, saveCurrent, loadProfile, deleteProfile, forgetEverything],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const value = useContext(StoreContext);
  if (!value) throw new Error("useStore must be used inside StoreProvider");
  return value;
}

export function makeProfile(partial: Partial<ProfileDraft> = {}): ProfileDraft {
  return {
    id: newId(),
    name: "",
    sourceType: "d6",
    alphabetSize: 6,
    labels: ["1", "2", "3", "4", "5", "6"],
    collectionMethod: "",
    targetBits: 128,
    notes: "",
    ...partial,
  };
}
