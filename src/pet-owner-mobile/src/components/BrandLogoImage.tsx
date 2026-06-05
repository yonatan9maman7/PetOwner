import { Image, type ImageProps, type ImageStyle, type StyleProp } from "react-native";
import {
  LOGO_HEADER,
  LOGO_HERO,
  headerLogoStyle,
  heroLogoStyle,
} from "../branding/logos";

type Variant = "hero" | "header";

type Props = Omit<ImageProps, "source"> & {
  variant: Variant;
  headerHeight?: number;
  style?: StyleProp<ImageStyle>;
};

export function BrandLogoImage({ variant, headerHeight, style, ...rest }: Props) {
  return (
    <Image
      source={variant === "hero" ? LOGO_HERO : LOGO_HEADER}
      style={[
        variant === "hero" ? heroLogoStyle() : headerLogoStyle(headerHeight),
        style,
      ]}
      accessibilityLabel="PetCare"
      {...rest}
    />
  );
}
