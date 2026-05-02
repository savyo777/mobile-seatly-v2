const remove = jest.fn();

module.exports = {
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn(() => ({ remove })),
  },
  Linking: {
    openSettings: jest.fn(async () => {}),
  },
  Platform: {
    OS: 'ios',
    select: (values) => values.ios ?? values.default,
  },
  StyleSheet: {
    create: (styles) => styles,
    flatten: (style) => style,
  },
};
