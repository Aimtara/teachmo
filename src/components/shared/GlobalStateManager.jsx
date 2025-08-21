import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { User } from '@/api/entities';

const GlobalStateContext = createContext();
const GlobalDispatchContext = createContext();

const initialState = {
  // Authentication & User Data
  isAuthenticated: false,
  user: null,
  userChildren: [],
  
  // UI State
  isLoading: true,
  isSidebarOpen: false,
  activeModal: null, // e.g., { name: 'addChild', props: {} }
  
  // Cache & Data
  cache: {}, // For useCacheManager
  
  // Offline & Sync Status
  isOnline: true,
  lastSync: null,
  syncQueue: [],
};

function globalReducer(state, action) {
  switch (action.type) {
    // --- AUTH & USER ---
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload.user,
        userChildren: action.payload.children,
        isLoading: false,
      };
    case 'LOGOUT':
      return {
        ...initialState,
        isLoading: false,
        isOnline: state.isOnline,
      };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'UPDATE_USER_DATA':
      return {
        ...state,
        user: { ...state.user, ...action.payload },
      };
    case 'SET_CHILDREN':
      return { ...state, userChildren: action.payload };

    // --- UI ---
    case 'TOGGLE_SIDEBAR':
      return { ...state, isSidebarOpen: !state.isSidebarOpen };
    case 'OPEN_MODAL':
      return { ...state, activeModal: action.payload };
    case 'CLOSE_MODAL':
      return { ...state, activeModal: null };

    // --- CACHE ---
    case 'CACHE_SET':
      return {
        ...state,
        cache: {
          ...state.cache,
          [action.payload.key]: {
            data: action.payload.data,
            timestamp: Date.now(),
            ttl: action.payload.ttl,
          },
        },
      };
    case 'CACHE_INVALIDATE':
      const newCache = { ...state.cache };
      delete newCache[action.payload];
      return { ...state, cache: newCache };
      
    // --- OFFLINE/SYNC ---
    case 'SET_ONLINE_STATUS':
      return { ...state, isOnline: action.payload };
    case 'ADD_TO_SYNC_QUEUE':
      return { ...state, syncQueue: [...state.syncQueue, action.payload] };
    case 'CLEAR_SYNC_QUEUE':
      return { ...state, syncQueue: [] };
    case 'SET_LAST_SYNC':
      return { ...state, lastSync: action.payload };
      
    default:
      throw new Error(`Unhandled action type: ${action.type}`);
  }
}

export const GlobalStateProvider = ({ children }) => {
  const [state, dispatch] = useReducer(globalReducer, initialState);

  // Effect to check initial auth status
  useEffect(() => {
    const checkUser = async () => {
      try {
        const user = await User.me();
        if (user) {
          // In a real app, you'd fetch children here too
          dispatch({ type: 'LOGIN_SUCCESS', payload: { user, children: [] } });
        } else {
          dispatch({ type: 'LOGOUT' });
        }
      } catch (error) {
        dispatch({ type: 'LOGOUT' });
      }
    };
    checkUser();
  }, []);

  return (
    <GlobalStateContext.Provider value={state}>
      <GlobalDispatchContext.Provider value={dispatch}>
        {children}
      </GlobalDispatchContext.Provider>
    </GlobalStateContext.Provider>
  );
};

// --- Custom Hooks ---
export const useGlobalState = () => {
  const context = useContext(GlobalStateContext);
  if (context === undefined) {
    throw new Error('useGlobalState must be used within a GlobalStateProvider');
  }
  return context;
};

export const useGlobalDispatch = () => {
  const context = useContext(GlobalDispatchContext);
  if (context === undefined) {
    throw new Error('useGlobalDispatch must be used within a GlobalStateProvider');
  }
  return context;
};

// --- Action Creators ---
export const useGlobalActions = () => {
    const dispatch = useGlobalDispatch();
  
    const login = useCallback(async (credentials) => {
        // Mock login logic
        dispatch({ type: 'SET_LOADING', payload: true });
        try {
            // Replace with actual API call
            const user = await User.login(credentials); 
            // const children = await Child.list();
            dispatch({ type: 'LOGIN_SUCCESS', payload: { user, children: [] } });
        } catch (error) {
            dispatch({ type: 'LOGOUT' });
            throw error;
        }
    }, [dispatch]);

    const logout = useCallback(async () => {
        await User.logout();
        dispatch({ type: 'LOGOUT' });
    }, [dispatch]);
  
    const openModal = useCallback((name, props = {}) => {
      dispatch({ type: 'OPEN_MODAL', payload: { name, props } });
    }, [dispatch]);
  
    const closeModal = useCallback(() => {
      dispatch({ type: 'CLOSE_MODAL' });
    }, [dispatch]);

    const cacheSet = useCallback((key, data, ttl) => {
      dispatch({ type: 'CACHE_SET', payload: { key, data, ttl } });
    }, [dispatch]);

    const cacheInvalidate = useCallback((key) => {
      dispatch({ type: 'CACHE_INVALIDATE', payload: key });
    }, [dispatch]);
  
    return {
        login,
        logout,
        openModal,
        closeModal,
        cacheSet,
        cacheInvalidate,
    };
};