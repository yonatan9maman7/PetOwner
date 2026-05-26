import "react-native-gesture-handler";
import "./src/api/client";

import { enableScreens } from "react-native-screens";
import { I18nManager } from "react-native";

enableScreens(true);
import { registerRootComponent } from "expo";
import App from "./App";

// App language controls layout direction in JS; keep native mirroring disabled
// so Android/iOS system language cannot fight the in-app language setting.
I18nManager.allowRTL(false);
I18nManager.forceRTL(false);
I18nManager.swapLeftAndRightInRTL(false);

registerRootComponent(App);
