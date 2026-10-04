import { StatusBar } from 'expo-status-bar';
import { useRef } from 'react';
import { Linking, StyleSheet, useColorScheme } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import type { ShouldStartLoadRequest, WebViewOpenWindowEvent } from 'react-native-webview/lib/WebViewTypes';

const HOME_URL = 'https://www.instagram.com/';

// Pages on these sites stay inside the app (Facebook is needed for "Log in with Facebook").
// Everything else opens in Safari.
const INTERNAL_HOSTS = ['instagram.com', 'facebook.com'];

function hostOf(url: string): string | null {
  const match = /^https?:\/\/([^/?#:]+)/i.exec(url);
  return match ? match[1].toLowerCase() : null;
}

function isInternal(url: string): boolean {
  if (/^(about|blob|data):/i.test(url)) return true;
  const host = hostOf(url);
  return host !== null && INTERNAL_HOSTS.some((h) => host === h || host.endsWith('.' + h));
}

function openInSafari(url: string) {
  Linking.openURL(url).catch(() => {});
}

export default function App() {
  const webView = useRef<WebView>(null);
  const background = useColorScheme() === 'dark' ? '#000' : '#fff';

  const handleNavigation = ({ url, isTopFrame }: ShouldStartLoadRequest): boolean => {
    // Never hand the user over to the official Instagram app.
    if (/^instagram:/i.test(url)) return false;
    // Embedded frames are part of the current page.
    if (!isTopFrame) return true;
    if (isInternal(url)) return true;
    openInSafari(url);
    return false;
  };

  const handleOpenWindow = ({ nativeEvent: { targetUrl } }: WebViewOpenWindowEvent) => {
    if (isInternal(targetUrl)) {
      webView.current?.injectJavaScript(`window.location.href = ${JSON.stringify(targetUrl)}; true;`);
    } else {
      openInSafari(targetUrl);
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={[styles.container, { backgroundColor: background }]} edges={['top', 'bottom']}>
        <WebView
          ref={webView}
          source={{ uri: HOME_URL }}
          style={{ backgroundColor: background }}
          allowsInlineMediaPlayback
          allowsBackForwardNavigationGestures
          pullToRefreshEnabled
          onShouldStartLoadWithRequest={handleNavigation}
          onOpenWindow={handleOpenWindow}
        />
      </SafeAreaView>
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
