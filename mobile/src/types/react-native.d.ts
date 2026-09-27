import React from 'react';

declare module 'react-native' {
  export type FlexAlignType = 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline';

  export interface ViewStyle {
    flex?: number;
    flexDirection?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
    justifyContent?: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly';
    alignItems?: FlexAlignType;
    alignSelf?: 'auto' | FlexAlignType;
    margin?: number | string;
    marginVertical?: number | string;
    marginHorizontal?: number | string;
    marginTop?: number | string;
    marginBottom?: number | string;
    marginLeft?: number | string;
    marginRight?: number | string;
    padding?: number | string;
    paddingVertical?: number | string;
    paddingHorizontal?: number | string;
    paddingTop?: number | string;
    paddingBottom?: number | string;
    paddingLeft?: number | string;
    paddingRight?: number | string;
    backgroundColor?: string;
    borderWidth?: number;
    borderColor?: string;
    borderRadius?: number;
    borderTopWidth?: number;
    borderBottomWidth?: number;
    borderLeftWidth?: number;
    borderRightWidth?: number;
    borderTopLeftRadius?: number;
    borderTopRightRadius?: number;
    borderBottomLeftRadius?: number;
    borderBottomRightRadius?: number;
    width?: number | string;
    height?: number | string;
    minWidth?: number | string;
    minHeight?: number | string;
    maxWidth?: number | string;
    maxHeight?: number | string;
    opacity?: number;
    overflow?: 'visible' | 'hidden' | 'scroll';
    position?: 'absolute' | 'relative';
    top?: number | string;
    bottom?: number | string;
    left?: number | string;
    right?: number | string;
    zIndex?: number;
    elevation?: number;
    shadowColor?: string;
    shadowOffset?: { width: number; height: number };
    shadowOpacity?: number;
    shadowRadius?: number;
  }

  export interface TextStyle extends ViewStyle {
    color?: string;
    fontFamily?: string;
    fontSize?: number;
    fontStyle?: 'normal' | 'italic';
    fontWeight?: 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
    letterSpacing?: number;
    lineHeight?: number;
    textAlign?: 'auto' | 'left' | 'right' | 'center' | 'justify';
    textDecorationLine?: 'none' | 'underline' | 'line-through' | 'underline line-through';
    textTransform?: 'none' | 'capitalize' | 'uppercase' | 'lowercase';
  }

  export type StyleProp<T> = T | Array<T | undefined | null | false> | undefined | null | false;

  export interface ViewProps {
    style?: StyleProp<ViewStyle>;
    children?: React.ReactNode;
    testID?: string;
    key?: React.Key;
  }

  export interface TextProps {
    style?: StyleProp<TextStyle>;
    children?: React.ReactNode;
    numberOfLines?: number;
    ellipsizeMode?: 'head' | 'middle' | 'tail' | 'clip';
    testID?: string;
    key?: React.Key;
  }

  export interface TouchableOpacityProps extends ViewProps {
    onPress?: () => void;
    activeOpacity?: number;
    disabled?: boolean;
  }

  export interface TextInputProps extends ViewProps {
    value?: string;
    onChangeText?: (text: string) => void;
    placeholder?: string;
    placeholderTextColor?: string;
    editable?: boolean;
    autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
    autoCorrect?: boolean;
    keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
    multiline?: boolean;
    style?: StyleProp<TextStyle>;
  }

  export interface ScrollViewProps extends ViewProps {
    contentContainerStyle?: StyleProp<ViewStyle>;
    refreshControl?: React.ReactElement;
    horizontal?: boolean;
    showsHorizontalScrollIndicator?: boolean;
    showsVerticalScrollIndicator?: boolean;
  }

  export interface RefreshControlProps {
    refreshing: boolean;
    onRefresh?: () => void;
    tintColor?: string;
    colors?: string[];
  }

  export interface ListRenderItemInfo<ItemT> {
    item: ItemT;
    index: number;
  }

  export type ListRenderItem<ItemT> = (info: ListRenderItemInfo<ItemT>) => React.ReactElement | null;

  export interface FlatListProps<ItemT> extends ViewProps {
    data: readonly ItemT[] | null | undefined;
    renderItem: ListRenderItem<ItemT> | null | undefined;
    keyExtractor?: (item: ItemT, index: number) => string;
    refreshControl?: React.ReactElement;
    ListEmptyComponent?: React.ComponentType<any> | React.ReactElement | null;
    contentContainerStyle?: StyleProp<ViewStyle>;
    horizontal?: boolean;
    showsHorizontalScrollIndicator?: boolean;
    showsVerticalScrollIndicator?: boolean;
  }

  export interface ActivityIndicatorProps extends ViewProps {
    animating?: boolean;
    color?: string;
    size?: 'small' | 'large' | number;
  }

  export interface StatusBarProps {
    barStyle?: 'default' | 'light-content' | 'dark-content';
    backgroundColor?: string;
    hidden?: boolean;
    translucent?: boolean;
  }

  export const View: React.FC<ViewProps>;
  export const Text: React.FC<TextProps>;
  export const TouchableOpacity: React.FC<TouchableOpacityProps>;
  export const TextInput: React.FC<TextInputProps>;
  export const ScrollView: React.FC<ScrollViewProps>;
  export const RefreshControl: React.FC<RefreshControlProps>;
  export function FlatList<ItemT>(props: FlatListProps<ItemT>): React.ReactElement;
  export const ActivityIndicator: React.FC<ActivityIndicatorProps>;
  export const SafeAreaView: React.FC<ViewProps>;
  export const StatusBar: React.FC<StatusBarProps>;

  export interface AlertButton {
    text?: string;
    onPress?: () => void;
    style?: 'default' | 'cancel' | 'destructive';
  }

  export interface AlertOptions {
    cancelable?: boolean;
  }

  export const Alert: {
    alert(title: string, message?: string, buttons?: AlertButton[], options?: AlertOptions): void;
  };

  export type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle };

  export const StyleSheet: {
    create<T extends NamedStyles<T> | NamedStyles<any>>(styles: T | NamedStyles<T>): T;
  };
}
