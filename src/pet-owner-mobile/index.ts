import "react-native-gesture-handler";
import { initSentry } from "./src/services/sentry";

initSentry();

import { enableScreens } from "react-native-screens";
import { I18nManager } from "react-native";

enableScreens(true);
import { registerRootComponent } from "expo";
import App from "./App";

I18nManager.allowRTL(true);

registerRootComponent(App);
