import React from "react";
import renderer, { act } from "react-test-renderer";
import { Platform, Pressable, Text } from "react-native";
import type { MapPinDto } from "../types/api";
import { ProviderType } from "../types/api";
import { mapDiag } from "../screens/explore/exploreMapDiag";
import {
  ExploreMapMarkers,
  ExploreSelectedMarkerOverlay,
  OFFSCREEN_COORDINATE,
  type MarkerPoolSlot,
} from "../screens/explore/ExploreMapMarkers";

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

jest.mock("../screens/explore/exploreMapDiag", () => ({
  mapDiag: jest.fn(),
}));

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

const mapDiagMock = mapDiag as jest.MockedFunction<typeof mapDiag>;

const originalPlatformOs = Platform.OS;

function setPlatform(os: "ios" | "android") {
  Object.defineProperty(Platform, "OS", { value: os, writable: true, configurable: true });
}

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
    image?: number;
    zIndex?: number;
    tracksViewChanges?: boolean;
  };
}

describe("ExploreMapMarkers", () => {
  beforeEach(() => {
    setPlatform("android");
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.clearAllTimers();
    jest.useRealTimers();
    setPlatform(originalPlatformOs as "ios" | "android");
  });

  it("exports OFFSCREEN_COORDINATE", () => {
    expect(OFFSCREEN_COORDINATE).toEqual({ latitude: -90, longitude: 0 });
  });

  describe("ExploreMapMarkers container", () => {
    it("renders one marker per pool slot and reports active count to mapDiag", () => {
      const pool: MarkerPoolSlot[] = [
        singleSlot(),
        clusterSlot(),
        offscreenSlot(),
      ];
      const onPressProviderId = jest.fn();
      const onPressClusterPins = jest.fn();

      renderComponent(
        <ExploreMapMarkers
          pool={pool}
          onPressProviderId={onPressProviderId}
          onPressClusterPins={onPressClusterPins}
        />,
      );

      expect(mapDiagMock).toHaveBeenCalledWith("markers.render", {
        poolSize: 3,
        active: 2,
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

      act(() => {
        getMarker(tree, "pool-0").props.onPress();
      });

      expect(onPressProviderId).not.toHaveBeenCalled();
      expect(onPressClusterPins).not.toHaveBeenCalled();
    });
  });

  describe("cluster badge", () => {
    it("shows the count when count is 99 or less", () => {
      const tree = renderComponent(
        <ExploreMapMarkers
          pool={[clusterSlot({ clusterCount: 42 })]}
          onPressProviderId={jest.fn()}
          onPressClusterPins={jest.fn()}
        />,
      );

      const badge = tree.root
        .findAllByType(Text)
        .find((n) => n.props.children === 42);
      expect(badge).toBeDefined();
    });

    it('shows "99+" when count exceeds 99', () => {
      const tree = renderComponent(
        <ExploreMapMarkers
          pool={[clusterSlot({ clusterCount: 150 })]}
          onPressProviderId={jest.fn()}
          onPressClusterPins={jest.fn()}
        />,
      );

      const badge = tree.root
        .findAllByType(Text)
        .find((n) => n.props.children === "99+");
      expect(badge).toBeDefined();
    });
  });

  describe("Android tracksViewChanges", () => {
    beforeEach(() => setPlatform("android"));

    it("keeps tracksViewChanges false on a single paw marker", () => {
      const tree = renderComponent(
        <ExploreMapMarkers
          pool={[singleSlot()]}
          onPressProviderId={jest.fn()}
          onPressClusterPins={jest.fn()}
        />,
      );

      expect(getMarker(tree, "pool-0").props.accessibilityState?.expanded).toBe(
        false,
      );

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(getMarker(tree, "pool-0").props.accessibilityState?.expanded).toBe(
        false,
      );
    });

    it("disables tracksViewChanges on cluster layout before the timeout", () => {
      const tree = renderComponent(
        <ExploreMapMarkers
          pool={[clusterSlot()]}
          onPressProviderId={jest.fn()}
          onPressClusterPins={jest.fn()}
        />,
      );

      expect(getMarker(tree, "pool-0").props.accessibilityState?.expanded).toBe(
        true,
      );

      const layoutHost = tree.root.findAll(
        (node) => typeof node.props.onLayout === "function",
      )[0];

      act(() => {
        layoutHost.props.onLayout();
        jest.advanceTimersByTime(350);
      });

      expect(getMarker(tree, "pool-0").props.accessibilityState?.expanded).toBe(
        false,
      );
    });
  });

  describe("iOS PawMarker", () => {
    beforeEach(() => setPlatform("ios"));

    it("passes native image to MarkerWrapper with tracksViewChanges false", () => {
      const tree = renderComponent(
        <ExploreMapMarkers
          pool={[singleSlot()]}
          onPressProviderId={jest.fn()}
          onPressClusterPins={jest.fn()}
        />,
      );

      const label = parseMarkerLabel(getMarker(tree, "pool-0"));
      expect(label.image).toBeDefined();
      expect(label.tracksViewChanges).toBe(false);
    });
  });

  describe("ExploreSelectedMarkerOverlay", () => {
    it("uses OFFSCREEN_COORDINATE and deactivates when props are incomplete", () => {
      renderComponent(
        <ExploreSelectedMarkerOverlay
          providerId={null}
          latitude={null}
          longitude={null}
        />,
      );

      expect(mapDiagMock).toHaveBeenCalledWith("overlay.deactivate");
    });

    it("positions at provider coordinates and activates when props are complete", () => {
      const tree = renderComponent(
        <ExploreSelectedMarkerOverlay
          providerId="sel-1"
          latitude={32.5}
          longitude={34.2}
        />,
      );

      expect(mapDiagMock).toHaveBeenCalledWith("overlay.activate", {
        providerId: "sel-1",
      });

      const label = parseMarkerLabel(getMarker(tree, "selected-overlay"));
      expect(label.coordinate).toEqual({ latitude: 32.5, longitude: 34.2 });
      expect(label.zIndex).toBe(1000);
    });

    it("keeps tracksViewChanges false when providerId changes while active", () => {
      setPlatform("android");

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
  });
});
