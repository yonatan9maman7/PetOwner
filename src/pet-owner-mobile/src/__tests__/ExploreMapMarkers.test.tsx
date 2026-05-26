import React from "react";
import renderer, { act } from "react-test-renderer";
import { Pressable } from "react-native";
import type { MapPinDto } from "../types/api";
import { ProviderType } from "../types/api";
import {
  ExploreMapMarkers,
  ExploreSelectedMarkerOverlay,
  OFFSCREEN_COORDINATE,
  type MarkerPoolSlot,
} from "../screens/explore/ExploreMapMarkers";

let mockProviderUri: string | null = "file://provider.png";
let mockSelectedUri: string | null = "file://selected.png";
let mockClusterUris = new Map<number, string>();
const mockGetClusterUri = jest.fn((count: number) => mockClusterUris.get(count) ?? null);

jest.mock("../components/MapViewWrapper", () => {
  const React = require("react");
  const { Pressable } = require("react-native");
  return {
    MarkerWrapper: (props: {
      identifier: string;
      onPress?: () => void;
      children?: React.ReactNode;
      [key: string]: unknown;
    }) => (
      <Pressable
        testID={`marker-${props.identifier}`}
        onPress={props.onPress}
        accessibilityState={{
          expanded: props.tracksViewChanges as boolean | undefined,
        }}
        accessibilityLabel={JSON.stringify({
          coordinate: props.coordinate,
          image: props.image,
          zIndex: props.zIndex,
          tracksViewChanges: props.tracksViewChanges,
        })}
      >
        {props.children}
      </Pressable>
    ),
  };
});

jest.mock("../screens/explore/markerBitmapCache", () => ({
  useMarkerBitmapUris: () => ({
    providerUri: mockProviderUri,
    selectedUri: mockSelectedUri,
    getClusterUri: mockGetClusterUri,
  }),
}));

function renderComponent(element: React.ReactElement) {
  let tree!: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(element);
  });
  return tree;
}

function makePin(overrides: Partial<MapPinDto> = {}): MapPinDto {
  return {
    providerId: "provider-1",
    name: "Test Provider",
    latitude: 32.0853,
    longitude: 34.7818,
    minRate: 50,
    services: "Dog walking",
    reviewCount: 0,
    acceptsOffHoursRequests: false,
    providerType: ProviderType.Individual,
    isEmergencyService: false,
    ...overrides,
  };
}

function singleSlot(
  overrides: Partial<MarkerPoolSlot> = {},
): MarkerPoolSlot {
  return {
    kind: "single",
    coordinate: { latitude: 32.1, longitude: 34.8 },
    providerId: "provider-1",
    clusterKey: null,
    clusterCount: 0,
    clusterPins: null,
    ...overrides,
  };
}

function clusterSlot(
  overrides: Partial<MarkerPoolSlot> = {},
): MarkerPoolSlot {
  const pins = [makePin({ providerId: "p-a" }), makePin({ providerId: "p-b" })];
  return {
    kind: "cluster",
    coordinate: { latitude: 32.2, longitude: 34.9 },
    providerId: null,
    clusterKey: "c-1",
    clusterCount: 2,
    clusterPins: pins,
    ...overrides,
  };
}

function offscreenSlot(): MarkerPoolSlot {
  return {
    kind: "offscreen",
    coordinate: OFFSCREEN_COORDINATE,
    providerId: null,
    clusterKey: null,
    clusterCount: 0,
    clusterPins: null,
  };
}

function getMarker(tree: renderer.ReactTestRenderer, id: string) {
  return tree.root.findByProps({ testID: `marker-${id}` });
}

function parseMarkerLabel(node: renderer.ReactTestInstance) {
  return JSON.parse(node.props.accessibilityLabel as string) as {
    coordinate: { latitude: number; longitude: number };
    image?: { uri: string };
    zIndex?: number;
    tracksViewChanges?: boolean;
  };
}

describe("ExploreMapMarkers", () => {
  beforeEach(() => {
    mockProviderUri = "file://provider.png";
    mockSelectedUri = "file://selected.png";
    mockClusterUris = new Map([[2, "file://cluster-2.png"]]);
    jest.clearAllMocks();
  });

  it("exports OFFSCREEN_COORDINATE", () => {
    expect(OFFSCREEN_COORDINATE).toEqual({ latitude: -90, longitude: 0 });
  });

  describe("ExploreMapMarkers container", () => {
    it("renders one bitmap marker per pool slot when bitmap URIs are ready", () => {
      const pool: MarkerPoolSlot[] = [
        singleSlot(),
        clusterSlot(),
        offscreenSlot(),
      ];
      const onPressProviderId = jest.fn();
      const onPressClusterPins = jest.fn();

      const tree = renderComponent(
        <ExploreMapMarkers
          pool={pool}
          onPressProviderId={onPressProviderId}
          onPressClusterPins={onPressClusterPins}
        />,
      );

      const single = parseMarkerLabel(getMarker(tree, "pool-0"));
      const cluster = parseMarkerLabel(getMarker(tree, "pool-1"));
      const offscreen = parseMarkerLabel(getMarker(tree, "pool-2"));

      expect(single).toMatchObject({
        coordinate: { latitude: 32.1, longitude: 34.8 },
        image: { uri: "file://provider.png" },
        zIndex: 1,
        tracksViewChanges: false,
      });
      expect(cluster).toMatchObject({
        coordinate: { latitude: 32.2, longitude: 34.9 },
        image: { uri: "file://cluster-2.png" },
        zIndex: 1,
        tracksViewChanges: false,
      });
      expect(offscreen).toMatchObject({
        coordinate: OFFSCREEN_COORDINATE,
        image: { uri: "file://provider.png" },
      });
    });

    it("calls onPressProviderId when a single marker is pressed", () => {
      const onPressProviderId = jest.fn();
      const onPressClusterPins = jest.fn();
      const tree = renderComponent(
        <ExploreMapMarkers
          pool={[singleSlot({ providerId: "prov-99" })]}
          onPressProviderId={onPressProviderId}
          onPressClusterPins={onPressClusterPins}
        />,
      );

      act(() => {
        getMarker(tree, "pool-0").props.onPress();
      });

      expect(onPressProviderId).toHaveBeenCalledWith("prov-99");
      expect(onPressClusterPins).not.toHaveBeenCalled();
    });

    it("calls onPressClusterPins when a cluster marker is pressed", () => {
      const pins = [makePin({ providerId: "p-a" })];
      const coord = { latitude: 32.2, longitude: 34.9 };
      const onPressProviderId = jest.fn();
      const onPressClusterPins = jest.fn();
      const tree = renderComponent(
        <ExploreMapMarkers
          pool={[
            clusterSlot({
              clusterPins: pins,
              clusterCount: 1,
              coordinate: coord,
            }),
          ]}
          onPressProviderId={onPressProviderId}
          onPressClusterPins={onPressClusterPins}
        />,
      );

      act(() => {
        getMarker(tree, "pool-0").props.onPress();
      });

      expect(onPressClusterPins).toHaveBeenCalledWith(pins, coord);
      expect(onPressProviderId).not.toHaveBeenCalled();
    });

    it("does not invoke callbacks when an offscreen slot is pressed", () => {
      const onPressProviderId = jest.fn();
      const onPressClusterPins = jest.fn();
      const tree = renderComponent(
        <ExploreMapMarkers
          pool={[offscreenSlot()]}
          onPressProviderId={onPressProviderId}
          onPressClusterPins={onPressClusterPins}
        />,
      );

      expect(getMarker(tree, "pool-0").props.onPress).toBeUndefined();

      expect(onPressProviderId).not.toHaveBeenCalled();
      expect(onPressClusterPins).not.toHaveBeenCalled();
    });

    it("does not render provider/offscreen markers until the provider bitmap is ready", () => {
      mockProviderUri = null;
      const tree = renderComponent(
        <ExploreMapMarkers
          pool={[singleSlot(), offscreenSlot()]}
          onPressProviderId={jest.fn()}
          onPressClusterPins={jest.fn()}
        />,
      );

      expect(tree.root.findAllByType(Pressable)).toHaveLength(0);
    });
  });

  describe("cluster bitmap behavior", () => {
    it("uses the cached cluster bitmap for the requested count", () => {
      const tree = renderComponent(
        <ExploreMapMarkers
          pool={[clusterSlot({ clusterCount: 2 })]}
          onPressProviderId={jest.fn()}
          onPressClusterPins={jest.fn()}
        />,
      );

      const label = parseMarkerLabel(getMarker(tree, "pool-0"));
      expect(mockGetClusterUri).toHaveBeenCalledWith(2);
      expect(label.image).toEqual({ uri: "file://cluster-2.png" });
      expect(label.tracksViewChanges).toBe(false);
    });

    it("falls back to the provider bitmap while a new cluster count is pending", () => {
      const tree = renderComponent(
        <ExploreMapMarkers
          pool={[clusterSlot({ clusterCount: 42 })]}
          onPressProviderId={jest.fn()}
          onPressClusterPins={jest.fn()}
        />,
      );

      const label = parseMarkerLabel(getMarker(tree, "pool-0"));
      expect(mockGetClusterUri).toHaveBeenCalledWith(42);
      expect(label.image).toEqual({ uri: "file://provider.png" });
    });

    it("does not render a cluster when neither cluster nor provider bitmap is ready", () => {
      mockProviderUri = null;
      mockClusterUris = new Map();
      const tree = renderComponent(
        <ExploreMapMarkers
          pool={[clusterSlot({ clusterCount: 42 })]}
          onPressProviderId={jest.fn()}
          onPressClusterPins={jest.fn()}
        />,
      );

      expect(tree.root.findAllByType(Pressable)).toHaveLength(0);
    });
  });

  describe("ExploreSelectedMarkerOverlay", () => {
    it("uses OFFSCREEN_COORDINATE when props are incomplete", () => {
      const tree = renderComponent(
        <ExploreSelectedMarkerOverlay
          providerId={null}
          latitude={null}
          longitude={null}
        />,
      );

      const label = parseMarkerLabel(getMarker(tree, "selected-overlay"));
      expect(label).toMatchObject({
        coordinate: OFFSCREEN_COORDINATE,
        image: { uri: "file://selected.png" },
        zIndex: 1000,
        tracksViewChanges: false,
      });
    });

    it("positions at provider coordinates when props are complete", () => {
      const tree = renderComponent(
        <ExploreSelectedMarkerOverlay
          providerId="sel-1"
          latitude={32.5}
          longitude={34.2}
        />,
      );

      const label = parseMarkerLabel(getMarker(tree, "selected-overlay"));
      expect(label.coordinate).toEqual({ latitude: 32.5, longitude: 34.2 });
      expect(label.zIndex).toBe(1000);
    });

    it("keeps tracksViewChanges false when providerId changes while active", () => {
      const tree = renderComponent(
        <ExploreSelectedMarkerOverlay
          providerId="sel-1"
          latitude={32.5}
          longitude={34.2}
        />,
      );

      expect(
        getMarker(tree, "selected-overlay").props.accessibilityState?.expanded,
      ).toBe(false);

      act(() => {
        tree.update(
          <ExploreSelectedMarkerOverlay
            providerId="sel-2"
            latitude={32.6}
            longitude={34.3}
          />,
        );
      });

      expect(
        getMarker(tree, "selected-overlay").props.accessibilityState?.expanded,
      ).toBe(false);
    });

    it("does not render until the selected bitmap is ready", () => {
      mockSelectedUri = null;
      const tree = renderComponent(
        <ExploreSelectedMarkerOverlay
          providerId="sel-1"
          latitude={32.5}
          longitude={34.2}
        />,
      );

      expect(tree.root.findAllByType(Pressable)).toHaveLength(0);
    });
  });
});
