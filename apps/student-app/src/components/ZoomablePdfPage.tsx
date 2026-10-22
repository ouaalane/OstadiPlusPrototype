import React, { useLayoutEffect, useState } from 'react';
import {
  Image,
  PanResponder,
  Platform,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type PanResponderGestureState,
} from 'react-native';
import { clampPdfTransform, scalePdfTransform, type PdfFrame, type PdfTransform } from '../lib/pdf-zoom';
import { colors, radius, spacing } from '../theme';

type PageState = {
  transform: PdfTransform;
  frame: PdfFrame;
  onTransform: (value: PdfTransform) => void;
};
type GestureStart = {
  transform: PdfTransform;
  distance: number;
  midpoint: { x: number; y: number };
  focal: { x: number; y: number };
  dx: number;
  dy: number;
  pinch: boolean;
};

/** One responder per page; prop updates must not recreate a gesture in flight. */
function createPageController(initial: PageState) {
  let live = initial;
  let gesture: GestureStart | null = null;
  const start = (event: GestureResponderEvent, state: PanResponderGestureState) => {
    const { transform, frame } = live;
    const [a, b] = event.nativeEvent.touches;
    if (!a) return;
    gesture = {
      transform,
      pinch: !!b,
      distance: b ? Math.hypot(b.pageX - a.pageX, b.pageY - a.pageY) : 0,
      midpoint: { x: b ? (a.pageX + b.pageX) / 2 : a.pageX, y: b ? (a.pageY + b.pageY) / 2 : a.pageY },
      // box-only keeps touch coordinates relative to the untransformed frame.
      focal: { x: b ? (a.locationX + b.locationX) / 2 - frame.width / 2 : 0, y: b ? (a.locationY + b.locationY) / 2 - frame.height / 2 : 0 },
      dx: state.dx,
      dy: state.dy,
    };
  };
  const wantsGesture = (event: GestureResponderEvent) =>
    event.nativeEvent.touches.length > 1 || live.transform.scale > 1;
  const responder = PanResponder.create({
    onStartShouldSetPanResponder: wantsGesture,
    onMoveShouldSetPanResponder: wantsGesture,
    onMoveShouldSetPanResponderCapture: wantsGesture,
    onPanResponderGrant: start,
    onPanResponderMove: (event, state) => {
      const { onTransform, frame } = live;
      const [a, b] = event.nativeEvent.touches;
      if (!a) return;
      if (!gesture || gesture.pinch !== !!b) {
        start(event, state);
        return;
      }
      const base = gesture;
      if (b && base.distance > 0) {
        const distance = Math.hypot(b.pageX - a.pageX, b.pageY - a.pageY);
        onTransform(scalePdfTransform(base.transform, base.transform.scale * distance / base.distance, frame, base.focal, {
          x: (a.pageX + b.pageX) / 2 - base.midpoint.x,
          y: (a.pageY + b.pageY) / 2 - base.midpoint.y,
        }));
      } else {
        onTransform(clampPdfTransform({
          ...base.transform,
          x: base.transform.x + state.dx - base.dx,
          y: base.transform.y + state.dy - base.dy,
        }, frame));
      }
    },
    onPanResponderRelease: () => { gesture = null; },
    onPanResponderTerminate: () => { gesture = null; },
    onPanResponderTerminationRequest: () => false,
  });
  return { panHandlers: responder.panHandlers, update: (value: PageState) => { live = value; } };
}

export default function ZoomablePdfPage({
  source, width, height, transform, onTransform,
}: {
  source: number;
  width: number;
  height: number;
  transform: PdfTransform;
  onTransform: (value: PdfTransform) => void;
}) {
  const pageHeight = Math.max(0, height - spacing.md * 2);
  const [controller] = useState(() => createPageController({ transform, onTransform, frame: { width, height: pageHeight } }));
  useLayoutEffect(() => {
    controller.update({ transform, onTransform, frame: { width, height: pageHeight } });
  }, [controller, transform, onTransform, width, pageHeight]);
  // Web must zoom the document, rather than the entire browser viewport.
  const frameStyle = {
    width,
    height: pageHeight,
    ...(Platform.OS === 'web' ? { touchAction: transform.scale > 1 ? 'none' : 'pan-x' } : {}),
  };
  return (
    <View style={{ width, height, paddingHorizontal: spacing.lg }}>
      <View {...controller.panHandlers} pointerEvents="box-only" testID="pdf-zoom-page" style={[styles.frame, frameStyle]}>
        <Image
          source={source}
          resizeMode="contain"
          style={[
            styles.image,
            { transform: [{ translateX: transform.x }, { translateY: transform.y }, { scale: transform.scale }] },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { overflow: 'hidden', borderRadius: radius.sm, backgroundColor: colors.white, marginVertical: spacing.md },
  image: { width: '100%', height: '100%' },
});
