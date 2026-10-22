import React from 'react';
import { Platform } from 'react-native';
import { WebView } from 'react-native-webview';
export default function RemotePdf({ uri }: { uri: string }) {
  if (Platform.OS === 'web')
    return React.createElement('iframe', {
      src: uri,
      title: 'PDF',
      style: {
        width: '100%',
        height: '100%',
        border: 0,
        background: 'transparent',
      },
    });
  return (
    <WebView
      source={{ uri }}
      style={{ flex: 1 }}
      originWhitelist={['http://*', 'https://*']}
      javaScriptEnabled
      setSupportMultipleWindows={false}
    />
  );
}
