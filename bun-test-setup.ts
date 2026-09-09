import { mock } from 'bun:test';

mock.module('react-native', () => ({
  StyleSheet: { create: (styles: any) => styles },
  Text: (props: any) => props.children,
  View: (props: any) => props.children,
}));

mock.module('@testing-library/react-native', () => ({
  render: (component: any) => ({
    getByText: (text: string) => text,
  }),
}));
