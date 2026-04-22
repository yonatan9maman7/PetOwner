import React, { memo } from "react";
import { Platform, StyleSheet, type ColorValue } from "react-native";
import type { Region } from "react-native-maps";
import { MapViewWrapper, MarkerWrapper } from "../../components/MapViewWrapper";
import { ExploreMapMarkers } from "./ExploreMapMarkers";
import type { ExploreMapMarkerItem } from "./mapCollision";
import type { MapPinDto } from "../../types/api";
import { EXPLORE_MAP_PADDING, EXPLORE_USER_MARKER_ANCHOR } from "./exploreMapLayoutConstants";

const MAP_LAYER_STYLE = StyleSheet.absoluteFillObject;

/** iOS: disable pitch to cut GPU / Metal work during dense annotations + gestures. */
const IOS_MAP_VIEW_PROPS = Platform.OS === "ios" ? { pitchEnabled: false } : {};

const ANDROID_MAP_TYPE =
  Platform.OS === "android" ? { mapType: "standard" as const } : {};

export type ExploreMapViewLayerProps = {
  mapRef: React.RefObject<unknown | null>;
  initialRegion: Region;
  onRegionChangeComplete: (region: any) => void;
  onMapPress: () => void;
  userLocationCoordinate: { latitude: number; longitude: number } | null;
  userPinColor: ColorValue;
  mapMarkerItems: ExploreMapMarkerItem[];
  selectedProviderId: string | null;
  onPressProviderId: (providerId: string) => void;
  onPressClusterPins: (pins: MapPinDto[]) => void;
};

/**
 * Isolated from ExploreScreen (search, filters, modals) so those re-renders do not
 * re-run MapView and stress MapKit when `pins` / selection are unchanged.
 */
const ExploreMapViewLayerComponent = (props: ExploreMapViewLayerProps) => {
  return (
    <MapViewWrapper
      ref={props.mapRef as any}
      style={MAP_LAYER_STYLE}
      initialRegion={props.initialRegion}
      fallbackLabel="Explore Map"
      showsMyLocationButton={false}
      showsCompass={false}
      toolbarEnabled={false}
      mapPadding={EXPLORE_MAP_PADDING}
      onRegionChangeComplete={props.onRegionChangeComplete}
      onPress={props.onMapPress}
      {...IOS_MAP_VIEW_PROPS}
      {...ANDROID_MAP_TYPE}
    >
      {props.userLocationCoordinate != null && (
        <MarkerWrapper
          coordinate={props.userLocationCoordinate}
          anchor={EXPLORE_USER_MARKER_ANCHOR}
          pinColor={props.userPinColor as string}
          tracksViewChanges={false}
        />
      )}
      <ExploreMapMarkers
        items={props.mapMarkerItems}
        selectedProviderId={props.selectedProviderId}
        onPressProviderId={props.onPressProviderId}
        onPressClusterPins={props.onPressClusterPins}
      />
    </MapViewWrapper>
  );
};

function propsAreEqual(
  a: ExploreMapViewLayerProps,
  b: ExploreMapViewLayerProps,
): boolean {
  return (
    a.mapRef === b.mapRef &&
    a.initialRegion === b.initialRegion &&
    a.onRegionChangeComplete === b.onRegionChangeComplete &&
    a.onMapPress === b.onMapPress &&
    a.userLocationCoordinate === b.userLocationCoordinate &&
    a.userPinColor === b.userPinColor &&
    a.mapMarkerItems === b.mapMarkerItems &&
    a.selectedProviderId === b.selectedProviderId &&
    a.onPressProviderId === b.onPressProviderId &&
    a.onPressClusterPins === b.onPressClusterPins
  );
}

export const ExploreMapViewLayer = memo(ExploreMapViewLayerComponent, propsAreEqual);
