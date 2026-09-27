import React from 'react';

const mockComponent = (name: string) => {
  const Component: React.FC<any> = (props: any) =>
    React.createElement(name, props, props.children);
  Component.displayName = name;
  return Component;
};

export const View = mockComponent('View');
export const Text = mockComponent('Text');
export const TouchableOpacity = mockComponent('TouchableOpacity');
export const TextInput = mockComponent('TextInput');
export const ScrollView = mockComponent('ScrollView');
export const RefreshControl = mockComponent('RefreshControl');
export const ActivityIndicator = mockComponent('ActivityIndicator');
export const SafeAreaView = mockComponent('SafeAreaView');
export const StatusBar = mockComponent('StatusBar');

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
