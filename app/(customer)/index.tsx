import React from 'react';
import { Redirect } from 'expo-router';

/** Default customer entry: main discovery experience. */
export default function CustomerIndex() {
  return <Redirect href="/(customer)/discover" />;
}
