import React, { useMemo } from 'react';
import { AppController, AppConfig } from './controllers/AppController';
import { DefaultMemoryStorage } from './services/DefaultMemoryStorage';
import { DefaultHttpTransport } from './services/DefaultHttpTransport';
import { AppNavigator } from './navigation/AppNavigator';

export { DefaultMemoryStorage, DefaultHttpTransport };

export interface AppRootProps {
  controller?: AppController;
  config?: Partial<AppConfig>;
}

export const App: React.FC<AppRootProps> = ({ controller: propController, config }) => {
  const controller = useMemo(() => {
    if (propController) {
      return propController;
    }

    const resolvedConfig: AppConfig = {
      baseUrl: config?.baseUrl ?? 'http://localhost:8001',
      storage: config?.storage ?? new DefaultMemoryStorage(),
      transport: config?.transport ?? new DefaultHttpTransport(),
    };

    return new AppController(resolvedConfig);
  }, [propController, config]);

  return <AppNavigator controller={controller} />;
};

export default App;
