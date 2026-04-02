import "react-native-gesture-handler";
import { I18nManager } from "react-native";
import { registerRootComponent } from "expo";
import App from "./App";

I18nManager.allowRTL(true);

registerRootComponent(App);
