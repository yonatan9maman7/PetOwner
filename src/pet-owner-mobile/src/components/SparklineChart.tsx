import React, { useMemo } from "react";
import { View, Text } from "react-native";
import Svg, { Path, Circle, Line } from "react-native-svg";
import { useTheme } from "../theme/ThemeContext";

interface SparklineChartProps {
  data: number[];
  width?: number;
  height?: number;
  strokeColor?: string;
  fillColor?: string;
  showLastDot?: boolean;
  /** Optional caption rendered under the chart (e.g. "Last 12 weeks"). */
  caption?: string;
}

/**
 * Lightweight area sparkline built on react-native-svg. Avoids pulling in a full charting
 * library (Victory, gifted-charts) since the dashboard only needs one line per screen.
 */
export function SparklineChart({
  data,
  width = 280,
  height = 80,
  strokeColor,
  fillColor,
  showLastDot = true,
  caption,
}: SparklineChartProps) {
  const { colors } = useTheme();

  const stroke = strokeColor ?? colors.primary;
  const fill = fillColor ?? `${stroke}22`;

  const { linePath, areaPath, lastPoint, hasRange } = useMemo(() => {
    if (!data || data.length === 0) {
      return { linePath: "", areaPath: "", lastPoint: null, hasRange: false };
    }

    const padding = 4;
    const w = width - padding * 2;
    const h = height - padding * 2;
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min;
    // When all values are equal, draw a flat line in the vertical center.
    const safeRange = range === 0 ? 1 : range;

    const stepX = data.length === 1 ? 0 : w / (data.length - 1);
    const points = data.map((v, i) => ({
      x: padding + i * stepX,
      y: padding + h - ((v - min) / safeRange) * h,
    }));

    const line = points
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
      .join(" ");

    const area =
      `${line} ` +
      `L ${points[points.length - 1].x.toFixed(2)} ${(padding + h).toFixed(2)} ` +
      `L ${points[0].x.toFixed(2)} ${(padding + h).toFixed(2)} Z`;

    return {
      linePath: line,
      areaPath: area,
      lastPoint: points[points.length - 1],
      hasRange: range !== 0,
    };
  }, [data, width, height]);

  if (!data || data.length === 0) {
    return null;
  }

  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={width} height={height}>
        {/* Baseline guide */}
        <Line
          x1={4}
          y1={height - 4}
          x2={width - 4}
          y2={height - 4}
          stroke={colors.borderLight}
          strokeWidth={1}
        />
        <Path d={areaPath} fill={fill} />
        <Path d={linePath} stroke={stroke} strokeWidth={2} fill="none" />
        {showLastDot && lastPoint && hasRange && (
          <Circle
            cx={lastPoint.x}
            cy={lastPoint.y}
            r={3}
            fill={stroke}
            stroke={colors.surface}
            strokeWidth={1.5}
          />
        )}
      </Svg>
      {caption ? (
        <Text style={{ marginTop: 6, fontSize: 11, color: colors.textMuted }}>
          {caption}
        </Text>
      ) : null}
    </View>
  );
}
