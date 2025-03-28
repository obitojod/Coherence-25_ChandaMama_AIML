// This should be in app/index.js
import { Redirect } from 'expo-router';

export default function Index() {
  // Redirect to the login page by default
  return <Redirect href="/login" />;
}