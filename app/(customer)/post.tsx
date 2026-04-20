import { Redirect } from 'expo-router';

// This screen is never rendered — the center + tab button navigates directly
// to the post-review flow via router.push.
export default function PostPlaceholder() {
  return <Redirect href="/(customer)/discover/post-review/camera" />;
}
