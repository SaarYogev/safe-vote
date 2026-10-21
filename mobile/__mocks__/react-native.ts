import React from 'react';

const mockComponent = (name: string) => {
  const Component: React.FC<any> = (props: any) =>
    React.createElement(name, props, props.children);
  Component.displayName = name;
  return Component;
};

export const View = mockComponent('View');
export const Text = mockComponent('Text');
export const Image = mockComponent('Image');
export const TouchableOpacity = mockComponent('TouchableOpacity');
export const TextInput = mockComponent('TextInput');
export const ScrollView = mockComponent('ScrollView');
export const RefreshControl = mockComponent('RefreshControl');
export const ActivityIndicator = mockComponent('ActivityIndicator');
export const SafeAreaView = mockComponent('SafeAreaView');
export const StatusBar = Object.assign(mockComponent('StatusBar'), {
  currentHeight: 24,
});

export const Platform = {
  OS: 'ios',
  select: <T>(specifics: { ios?: T; android?: T; default?: T }): T => {
    return (specifics as any)[Platform.OS] ?? specifics.default;
  },
};

export const FlatList = (props: any) => {
  const items = props.data || [];
  const renderedItems = items.map((item: any, index: number) =>
    props.renderItem ? props.renderItem({ item, index }) : null
  );

  return React.createElement(
    'FlatList',
    props,
    items.length === 0 && props.ListEmptyComponent
      ? React.isValidElement(props.ListEmptyComponent)
        ? props.ListEmptyComponent
        : React.createElement(props.ListEmptyComponent)
      : renderedItems
  );
};

export const Alert = {
  alert: jest.fn(),
};

export const StyleSheet = {
  create: <T extends Record<string, any>>(styles: T): T => styles,
};

let currentColorScheme: 'light' | 'dark' = 'light';
const listeners = new Set<(pref: { colorScheme?: 'light' | 'dark' }) => void>();

export const Appearance = {
  getColorScheme: () => currentColorScheme,
  setColorScheme: (scheme: 'light' | 'dark') => {
    currentColorScheme = scheme;
    for (const listener of listeners) {
      listener({ colorScheme: scheme });
    }
  },
  addChangeListener: (listener: (pref: { colorScheme?: 'light' | 'dark' }) => void) => {
    listeners.add(listener);
    return {
      remove: () => listeners.delete(listener),
    };
  },
};

export const useColorScheme = () => currentColorScheme;

