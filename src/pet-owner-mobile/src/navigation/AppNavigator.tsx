    import { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator, InteractionManager } from "react-native";
    import {
      createBottomTabNavigator,
      type BottomTabBarProps,
    } from "@react-navigation/bottom-tabs";
    import Animated, {
      useSharedValue,
      useAnimatedStyle,
      withTiming,
      Easing,
    } from "react-native-reanimated";
    import { BlurView } from "expo-blur";
    import { useSafeAreaInsets } from "react-native-safe-area-context";
    import { createNativeStackNavigator } from "@react-navigation/native-stack";
    import { getFocusedRouteNameFromRoute } from "@react-navigation/native";
    import { Ionicons } from "@expo/vector-icons";
    import { useAuthStore } from "../store/authStore";
    import { useNotificationStore } from "../store/notificationStore";
    import { useChatStore } from "../store/chatStore";
    import { useTranslation } from "../i18n";
    import { useTheme } from "../theme/ThemeContext";
    import { GlobalSosFab } from "../components/GlobalSosFab";
    import { NotificationToast } from "../components/NotificationToast";
    import { DiscoverScreen } from "../screens/explore/DiscoverScreen";
    import { ExploreScreen } from "../screens/explore/ExploreScreen";
    import { ProviderProfileScreen } from "../screens/explore/ProviderProfileScreen";
    import { AllReviewsScreen } from "../screens/explore/AllReviewsScreen";
    import { WriteReviewScreen } from "../screens/explore/WriteReviewScreen";
    import { NotificationSettingsScreen } from "../screens/profile/NotificationSettingsScreen";
    import { MyPetsScreen } from "../screens/pets/MyPets";
    import { ActivityLogScreen } from "../screens/pets/ActivityLogScreen";
    import { AddPetScreen } from "../screens/pets/AddPetScreen";
    import { CommunityScreen } from "../screens/community/CommunityScreen";
    import { GroupDetailScreen } from "../screens/community/GroupDetailScreen";
    import { PalProfileScreen } from "../screens/community/pals/PalProfileScreen";
    import { PlaydatePrefsScreen } from "../screens/community/pals/PlaydatePrefsScreen";
    import { LiveBeaconDetailScreen } from "../screens/community/pals/LiveBeaconDetailScreen";
    import { PlaydateEventDetailScreen } from "../screens/community/pals/PlaydateEventDetailScreen";
    import { CreatePlaydateEventScreen } from "../screens/community/pals/CreatePlaydateEventScreen";
    import { LoginScreen } from "../screens/auth/LoginScreen";
    import { RegisterScreen } from "../screens/auth/RegisterScreen";
    import { ForgotPasswordScreen } from "../screens/auth/ForgotPasswordScreen";
    import { CompleteProfileScreen } from "../screens/auth/CompleteProfileScreen";
    import { ProfileScreen } from "../screens/profile/ProfileScreen";
    import { ProviderEditScreen } from "../screens/profile/ProviderEditScreen";
    import { ProviderDashboardScreen } from "../screens/profile/ProviderDashboardScreen";
    import { AdminDashboardScreen } from "../screens/profile/AdminDashboardScreen";
    import { MessagesScreen } from "../screens/messages/MessagesScreen";
    import { ChatRoomScreen } from "../screens/messages/ChatRoomScreen";
    import { TriageScreen } from "../screens/pets/TriageScreen";
    import { EmergencyVetsScreen } from "../screens/pets/EmergencyVetsScreen";
    import { ReportLostScreen } from "../screens/pets/ReportLostScreen";
    import { NotificationsScreen } from "../screens/profile/NotificationsScreen";
    import { AccountSettingsScreen } from "../screens/profile/AccountSettingsScreen";
    import { AccountEditScreen } from "../screens/profile/AccountEditScreen";
    import { SecurityScreen } from "../screens/profile/SecurityScreen";
    import { ChangePasswordScreen } from "../screens/profile/ChangePasswordScreen";
    import { LanguageScreen } from "../screens/profile/LanguageScreen";
    import { PrivacyScreen } from "../screens/profile/PrivacyScreen";
    import { HelpCenterScreen } from "../screens/profile/HelpCenterScreen";
    import { ContactUsScreen } from "../screens/profile/ContactUsScreen";
    import { TermsScreen } from "../screens/profile/TermsScreen";
    import { ProviderOnboardingScreen } from "../features/provider-onboarding/ProviderOnboardingScreen";
    import { BookingScreen } from "../screens/explore/BookingScreen";
    import { MyBookingsScreen } from "../screens/profile/MyBookingsScreen";
    import { MyStatsScreen } from "../screens/profile/MyStatsScreen";
    import { PaymentCheckoutScreen } from "../screens/profile/PaymentCheckoutScreen";
    import { FavoritesScreen } from "../screens/profile/FavoritesScreen";
    import { navigationRef } from "./navigationRef";
    import { rootNavigate, whenNavigationReady } from "./rootNavigation";

    export { navigationRef };

    const HIDDEN_TAB_SCREENS = new Set([
      "AddPet",
      "ReportLost",
      "Triage",
      "ActivityLog",
      "EmergencyVets",
      "Discover",
      "ProviderProfile",
      "ChatRoom",
      "ProviderEdit",
      "AdminDashboard",
      "Notifications",
      "NotificationSettings",
      "AccountSettings",
      "AccountEdit",
      "Security",
      "ChangePassword",
      "LanguageSelect",
      "Privacy",
      "HelpCenter",
      "ContactUs",
      "Terms",
      "GroupDetail",
      "PalProfile",
      "PlaydatePrefs",
      "LiveBeaconDetail",
      "PlaydateEventDetail",
      "CreatePlaydateEvent",
      "ProviderOnboarding",
      "Booking",
      "MyBookings",
      "MyStats",
      "Favorites",
      "AllReviews",
      "WriteReview",
      "PaymentCheckout",
    ]);

    function shouldHideTabBar(route: any): boolean {
      const routeName = getFocusedRouteNameFromRoute(route);
      return routeName != null && HIDDEN_TAB_SCREENS.has(routeName);
    }

    const TAB_BAR_HIDDEN = { display: "none" as const };

    // ─── Glassmorphism tab bar ────────────────────────────────────────────────────

    /**
    * Set to true temporarily to paint each layer a vivid colour so you can
    * see exactly what area each view occupies on screen (Android debug aid).
    * Flip back to false before committing.
    */
    const DEBUG_TAB_BAR = false;

    const GLASS_PILL_H_MARGIN = 6;

    // Apple-style "ease" curve: fast departure, smooth deceleration into place.
    // withTiming at 250 ms gives a silky glide with zero bounce — no wobble possible.
    const PILL_TIMING = {
      duration: 250,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    };

    function GlassTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
      const insets = useSafeAreaInsets();
      const { colors, isDark } = useTheme();

      // Exact physical position + width of each tab button, populated by onLayout.
      // Using physical coordinates (not computed from container width) makes this
      // intrinsically RTL-safe: onLayout always returns the real pixel x position.
      const tabLayouts = useRef<Record<number, { x: number; width: number }>>({});
      const hasInitialized = useRef(false);
      // Set to true in onPress so the subsequent useEffect doesn't double-fire.
      const pressDidAnimateRef = useRef(false);

      // Reanimated shared values that drive the floating pill.
      const pillX = useSharedValue(0);
      const pillWidth = useSharedValue(0);

      const pillStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: pillX.value }],
        width: pillWidth.value,
      }));

      // ① Safety-net: keep the pill in sync after programmatic navigation
      //    (deep links, back gestures, navigation.navigate() from code, etc.).
      //    When the user taps a tab, onPress already fired the animation, so we
      //    skip this to avoid restarting it mid-flight.
      useEffect(() => {
        if (pressDidAnimateRef.current) {
          pressDidAnimateRef.current = false;
          return;
        }
        const layout = tabLayouts.current[state.index];
        if (!layout) return;
        const targetX = layout.x + GLASS_PILL_H_MARGIN;
        const targetW = layout.width - GLASS_PILL_H_MARGIN * 2;
        if (!hasInitialized.current) {
          // First active-tab layout: snap without animation so there's no slide-in on mount.
          pillX.value = targetX;
          pillWidth.value = targetW;
          hasInitialized.current = true;
        } else {
          pillX.value = withTiming(targetX, PILL_TIMING);
          pillWidth.value = withTiming(targetW, PILL_TIMING);
        }
      }, [state.index]);

      const focusedRoute = state.routes[state.index];
      const focusedTabBarStyle = (descriptors[focusedRoute.key].options as any).tabBarStyle;
      if (focusedTabBarStyle?.display === "none") return null;

      const overlayColor = isDark ? "rgba(26,34,54,0.90)" : "rgba(0,26,90,0.85)";

      return (
        <View
          collapsable={false}
          style={[
            glassStyles.barContainer,
            {
              shadowColor: colors.shadow,
              bottom: Math.max(insets.bottom, 16),
            },
          ]}
        >
          {/* Blur layer — purely visual, must never intercept touches */}
          <BlurView
            intensity={70}
            tint="dark"
            style={[
              StyleSheet.absoluteFill,
              { borderRadius: 28 },
              DEBUG_TAB_BAR && { backgroundColor: "rgba(255,0,0,0.35)" },
            ]}
            pointerEvents="none"
          />
          {/* Brand-colour tint + opaque fallback for Android / no-blur devices — purely visual */}
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: overlayColor, borderRadius: 28 },
              DEBUG_TAB_BAR && { backgroundColor: "rgba(0,0,255,0.25)" },
            ]}
            pointerEvents="none"
          />

          {/* Icon row */}
          <View
            collapsable={false}
            style={[
              glassStyles.contentRow,
              DEBUG_TAB_BAR && { backgroundColor: "rgba(0,255,0,0.25)" },
            ]}
          >
            {/* Pill — purely decorative, must never intercept touches */}
            <Animated.View pointerEvents="none" style={[glassStyles.pill, pillStyle]} />

            {state.routes.map((route, index) => {
              const { options } = descriptors[route.key];
              const isFocused = state.index === index;
              const color = isFocused ? colors.tabBarActive : colors.tabBarInactive;
              const label =
                typeof options.tabBarLabel === "function"
                  ? options.tabBarLabel({
                      focused: isFocused,
                      color,
                      children: route.name,
                      position: "below-icon",
                    })
                  : (options.tabBarLabel ?? options.title ?? route.name);
              const badge = options.tabBarBadge;

              // ② Pre-emptive animation on press: moves the pill BEFORE React Navigation
              //    updates state.index, giving the same frame-zero response as a native control.
              const onPress = () => {
                if (!isFocused) {
                  const layout = tabLayouts.current[index];
                  if (layout) {
                    pressDidAnimateRef.current = true;
                    pillX.value = withTiming(layout.x + GLASS_PILL_H_MARGIN, PILL_TIMING);
                    pillWidth.value = withTiming(
                      layout.width - GLASS_PILL_H_MARGIN * 2,
                      PILL_TIMING,
                    );
                  }
                }
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(route.name, route.params as any);
                }
              };

              const onLongPress = () => {
                navigation.emit({ type: "tabLongPress", target: route.key });
              };

              // ③ onLayout gives the physical pixel position of each tab button.
              //    This is intrinsically RTL-correct: x is always the real left edge.
              const onLayout = ({
                nativeEvent: { layout },
              }: {
                nativeEvent: { layout: { x: number; width: number } };
              }) => {
                tabLayouts.current[index] = { x: layout.x, width: layout.width };
                // Snap the pill to the initially-active tab as soon as its layout arrives.
                if (index === state.index && !hasInitialized.current) {
                  pillX.value = layout.x + GLASS_PILL_H_MARGIN;
                  pillWidth.value = layout.width - GLASS_PILL_H_MARGIN * 2;
                  hasInitialized.current = true;
                }
              };

              return (
                <Pressable
                  key={route.key}
                  accessibilityRole="button"
                  accessibilityState={isFocused ? { selected: true } : {}}
                  accessibilityLabel={options.tabBarAccessibilityLabel}
                  testID={options.tabBarButtonTestID}
                  onPress={onPress}
                  onLongPress={onLongPress}
                  onLayout={onLayout}
                  style={[
                    glassStyles.tabItem,
                    DEBUG_TAB_BAR && { backgroundColor: `rgba(${index * 60},200,${255 - index * 60},0.4)` },
                  ]}
                >
                  <View style={glassStyles.iconContainer}>
                    {options.tabBarIcon?.({ focused: isFocused, color, size: 24 })}
                    {badge != null && (
                      <View style={[glassStyles.badge, { backgroundColor: colors.danger }]}>
                        <Text style={glassStyles.badgeText}>
                          {typeof badge === "number" && badge > 99 ? "99+" : badge}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={[glassStyles.label, { color }]} numberOfLines={1}>
                    {label as string}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      );
    }

    const glassStyles = StyleSheet.create({
      barContainer: {
        marginHorizontal: 16,
        marginBottom: 6,
        borderRadius: 28,
    overflow: "hidden",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.15)",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 20,
        elevation: 20,
      },
      contentRow: {
        flexDirection: "row",
        height: 64,
      },
      pill: {
        position: "absolute",
        // top + bottom instead of a fixed height: the pill auto-sizes to the row
        // height minus 6 px on each edge, giving it a slender, tightly-fitted look.
        top: 6,
        bottom: 6,
        left: 0,
        borderRadius: 18,
        backgroundColor: "rgba(255,255,255,0.18)",
      },
      tabItem: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.01)",
    gap: 2,
  },
      iconContainer: {
        width: 28,
        height: 28,
        alignItems: "center",
        justifyContent: "center",
      },
      label: {
        fontSize: 10,
        fontWeight: "700",
        letterSpacing: 0.2,
      },
      badge: {
        position: "absolute",
        top: -4,
        right: -10,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 4,
      },
      badgeText: {
        color: "#fff",
        fontSize: 10,
        fontWeight: "700",
        lineHeight: 18,
      },
    });


    const Tab = createBottomTabNavigator();
    const AuthStack = createNativeStackNavigator();
    const CompleteProfileStack = createNativeStackNavigator();
    const ExploreStack = createNativeStackNavigator();
    const CommunityStack = createNativeStackNavigator();
    const PetsStack = createNativeStackNavigator();
    const MessagesStack = createNativeStackNavigator();
    const ProfileStack = createNativeStackNavigator();

    // ─── Tab first-load overlay ───────────────────────────────────────────────────

    /**
    * Returns `true` only after all queued navigation interactions (tab animation,
    * gesture recognisers, etc.) have settled.  Used to defer heavy screen content
    * so the pill glide is never competing with a JS-thread render burst.
    */
    function useDeferredReady(): boolean {
      const [ready, setReady] = useState(false);
      useEffect(() => {
        const task = InteractionManager.runAfterInteractions(() => setReady(true));
        return () => task.cancel();
      }, []);
      return ready;
    }

    /**
    * Full-screen themed placeholder shown while a heavy tab screen first mounts.
    * Sits on top of the real content (which is already rendering behind it) so the
    * user always sees a polished, branded loading state instead of a blank white flash.
    */
    function TabFirstLoadOverlay() {
      const { colors, isDark } = useTheme();
      return (
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: isDark ? "#1a2236" : "#ffffff",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 999,
            },
          ]}
        >
          <Ionicons name="paw-outline" size={56} color={colors.tabBarActive} style={{ opacity: 0.8 }} />
          <ActivityIndicator
            color={colors.tabBarActive}
            size="large"
            style={{ marginTop: 16 }}
          />
        </View>
      );
    }

    // ─── Stack screen functions ───────────────────────────────────────────────────

    function ExploreStackScreen() {
      return (
        <ExploreStack.Navigator screenOptions={{ headerShown: false, freezeOnBlur: true }}>
          <ExploreStack.Screen name="ExploreMain" component={ExploreScreen} />
          <ExploreStack.Screen name="Discover" component={DiscoverScreen} />
          <ExploreStack.Screen name="ProviderProfile" component={ProviderProfileScreen} />
          <ExploreStack.Screen name="Booking" component={BookingScreen} />
          <ExploreStack.Screen name="AllReviews" component={AllReviewsScreen} />
          <ExploreStack.Screen name="WriteReview" component={WriteReviewScreen} />
          <ExploreStack.Screen name="PaymentCheckout" component={PaymentCheckoutScreen} />
          <ExploreStack.Screen name="ChatRoom" component={ChatRoomScreen} />
        </ExploreStack.Navigator>
      );
    }

    function CommunityStackScreen() {
      // Community is the heaviest tab screen (~3k-line component with maps, stores,
      // real-time listeners).  We let it render normally behind the overlay so React
      // Navigation's state is never disrupted, but we keep the overlay visible until
      // all navigation animations have settled — that way the JS-thread burst from
      // mounting the screen never competes with the pill glide animation.
      const isReady = useDeferredReady();

      return (
        <View style={{ flex: 1 }}>
          <CommunityStack.Navigator screenOptions={{ headerShown: false, freezeOnBlur: true }}>
            <CommunityStack.Screen name="CommunityMain" component={CommunityScreen} />
            <CommunityStack.Screen name="GroupDetail" component={GroupDetailScreen} />
            <CommunityStack.Screen name="PalProfile" component={PalProfileScreen} />
            <CommunityStack.Screen name="PlaydatePrefs" component={PlaydatePrefsScreen} />
            <CommunityStack.Screen name="LiveBeaconDetail" component={LiveBeaconDetailScreen} />
            <CommunityStack.Screen name="PlaydateEventDetail" component={PlaydateEventDetailScreen} />
            <CommunityStack.Screen name="CreatePlaydateEvent" component={CreatePlaydateEventScreen} />
          </CommunityStack.Navigator>
          {!isReady && <TabFirstLoadOverlay />}
        </View>
      );
    }

    function AuthStackScreen() {
      return (
        <AuthStack.Navigator screenOptions={{ headerShown: false, freezeOnBlur: true }}>
          <AuthStack.Screen name="LoginScreen" component={LoginScreen} />
          <AuthStack.Screen name="RegisterScreen" component={RegisterScreen} />
          <AuthStack.Screen
            name="ForgotPasswordScreen"
            component={ForgotPasswordScreen}
          />
        </AuthStack.Navigator>
      );
    }

    function PetsStackScreen() {
      return (
        <PetsStack.Navigator screenOptions={{ headerShown: false, freezeOnBlur: true }}>
          <PetsStack.Screen name="MyPetsMain" component={MyPetsScreen} />
          <PetsStack.Screen name="AddPet" component={AddPetScreen} />
          <PetsStack.Screen name="ReportLost" component={ReportLostScreen} />
          <PetsStack.Screen name="EmergencyVets" component={EmergencyVetsScreen} />
          <PetsStack.Screen name="ProviderProfile" component={ProviderProfileScreen} />
          <PetsStack.Screen name="Booking" component={BookingScreen} />
          <PetsStack.Screen name="Triage" component={TriageScreen} />
          <PetsStack.Screen name="ActivityLog" component={ActivityLogScreen} />
          <PetsStack.Screen name="AllReviews" component={AllReviewsScreen} />
          <PetsStack.Screen name="WriteReview" component={WriteReviewScreen} />
          <PetsStack.Screen name="PaymentCheckout" component={PaymentCheckoutScreen} />
        </PetsStack.Navigator>
      );
    }

    function MessagesStackScreen() {
      return (
        <MessagesStack.Navigator screenOptions={{ headerShown: false, freezeOnBlur: true }}>
          <MessagesStack.Screen name="MessagesMain" component={MessagesScreen} />
          <MessagesStack.Screen name="ChatRoom" component={ChatRoomScreen} />
        </MessagesStack.Navigator>
      );
    }

    function ProfileStackScreen() {
      return (
        <ProfileStack.Navigator screenOptions={{ headerShown: false, freezeOnBlur: true }}>
          <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} />
          <ProfileStack.Screen name="ProviderEdit" component={ProviderEditScreen} />
          <ProfileStack.Screen name="ProviderDashboard" component={ProviderDashboardScreen} />
          <ProfileStack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
          <ProfileStack.Screen name="EmergencyVets" component={EmergencyVetsScreen} />
          <ProfileStack.Screen name="ProviderProfile" component={ProviderProfileScreen} />
          <ProfileStack.Screen name="Booking" component={BookingScreen} />
          <ProfileStack.Screen name="MyBookings" component={MyBookingsScreen} />
          <ProfileStack.Screen name="MyStats" component={MyStatsScreen} />
          <ProfileStack.Screen name="Triage" component={TriageScreen} />
          <ProfileStack.Screen name="Notifications" component={NotificationsScreen} />
          <ProfileStack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
          <ProfileStack.Screen name="AccountSettings" component={AccountSettingsScreen} />
          <ProfileStack.Screen name="AccountEdit" component={AccountEditScreen} />
          <ProfileStack.Screen name="Security" component={SecurityScreen} />
          <ProfileStack.Screen name="ChangePassword" component={ChangePasswordScreen} />
          <ProfileStack.Screen name="LanguageSelect" component={LanguageScreen} />
          <ProfileStack.Screen name="Privacy" component={PrivacyScreen} />
          <ProfileStack.Screen name="HelpCenter" component={HelpCenterScreen} />
          <ProfileStack.Screen name="ContactUs" component={ContactUsScreen} />
          <ProfileStack.Screen name="Terms" component={TermsScreen} />
          <ProfileStack.Screen name="ProviderOnboarding" component={ProviderOnboardingScreen} />
          <ProfileStack.Screen name="Favorites" component={FavoritesScreen} />
          <ProfileStack.Screen name="AllReviews" component={AllReviewsScreen} />
          <ProfileStack.Screen name="WriteReview" component={WriteReviewScreen} />
          <ProfileStack.Screen name="PaymentCheckout" component={PaymentCheckoutScreen} />
        </ProfileStack.Navigator>
      );
    }

    /**
    * Isolated component so chat-unread state changes only re-render the icon,
    * not the entire Tab.Navigator tree.
    */
    function MessagesTabIcon({ focused, color }: { focused: boolean; color: string }) {
      const { colors } = useTheme();
      const chatUnreadTotal = useChatStore((s) =>
        s.conversations.reduce((acc, c) => acc + Math.max(0, c.unreadCount), 0),
      );

      return (
        <View style={{ width: 28, height: 28, alignItems: "center", justifyContent: "center" }}>
          <Ionicons
            name={focused ? "chatbubble" : "chatbubble-outline"}
            size={24}
            color={color}
          />
          {chatUnreadTotal > 0 && (
            <View
              style={{
                position: "absolute",
                top: -4,
                right: -10,
                backgroundColor: colors.primary,
                minWidth: 18,
                height: 18,
                borderRadius: 9,
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: 4,
              }}
            >
              <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700", lineHeight: 18 }}>
                {chatUnreadTotal > 99 ? "99+" : chatUnreadTotal}
              </Text>
            </View>
          )}
        </View>
      );
    }

    /** After login the tab tree remounts; route from the root ref once it is ready. */
    function useNavigateToExploreAfterLogin(isLoggedIn: boolean, requiresPhone: boolean): void {
      const wasLoggedInRef = useRef(isLoggedIn);

      useEffect(() => {
        const justLoggedIn = !wasLoggedInRef.current && isLoggedIn && !requiresPhone;
        wasLoggedInRef.current = isLoggedIn;

        if (!justLoggedIn) return;

        return whenNavigationReady(() => {
          if (!navigationRef.isReady()) return;
          navigationRef.dispatch({
            type: "NAVIGATE",
            payload: { name: "Explore" },
          });
        });
      }, [isLoggedIn, requiresPhone]);
    }

    /** After logout the Login tab replaces Messages/Profile; switch once the tree is ready. */
    function useNavigateToLoginAfterLogout(isLoggedIn: boolean, requiresPhone: boolean): void {
      const wasLoggedInRef = useRef(isLoggedIn);

      useEffect(() => {
        const justLoggedOut = wasLoggedInRef.current && !isLoggedIn && !requiresPhone;
        wasLoggedInRef.current = isLoggedIn;

        if (!justLoggedOut) return;

        return whenNavigationReady(() => {
          rootNavigate("Login", { screen: "LoginScreen" });
        });
      }, [isLoggedIn, requiresPhone]);
    }

    export function AppNavigator() {
      const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
      const requiresPhone = useAuthStore((s) => s.requiresPhone);
      const unreadCount = useNotificationStore((s) => s.unreadCount);
      const { t } = useTranslation();

      useNavigateToExploreAfterLogin(isLoggedIn, requiresPhone);
      useNavigateToLoginAfterLogout(isLoggedIn, requiresPhone);

      // Social login users must complete phone before accessing any tab
      if (isLoggedIn && requiresPhone) {
        return (
          <>
            <NotificationToast />
            <CompleteProfileStack.Navigator
              screenOptions={{ headerShown: false, gestureEnabled: false }}
            >
              <CompleteProfileStack.Screen
                name="CompleteProfile"
                component={CompleteProfileScreen}
              />
            </CompleteProfileStack.Navigator>
          </>
        );
      }

      return (
        <>
        <NotificationToast />
        <Tab.Navigator
          key={isLoggedIn ? "authenticated" : "guest"}
          tabBar={(tabProps) => <GlassTabBar {...tabProps} />}
          screenOptions={{
            headerShown: false,
            freezeOnBlur: true,
            lazy: true,
          }}
        >
          <Tab.Screen
            name="Explore"
            component={ExploreStackScreen}
            options={({ route }) => ({
              tabBarButtonTestID: "tab-explore",
              tabBarLabel: t("tabExplore"),
              tabBarIcon: ({ focused, color }) => (
                <Ionicons
                  name={focused ? "compass" : "compass-outline"}
                  size={24}
                  color={color}
                />
              ),
              tabBarStyle: shouldHideTabBar(route) ? TAB_BAR_HIDDEN : undefined,
            })}
          />
          <Tab.Screen
            name="Community"
            component={CommunityStackScreen}
            options={({ route }) => ({
              tabBarButtonTestID: "tab-community",
              tabBarLabel: t("tabCommunity"),
              tabBarIcon: ({ focused, color }) => (
                <Ionicons
                  name={focused ? "people" : "people-outline"}
                  size={24}
                  color={color}
                />
              ),
              tabBarStyle: shouldHideTabBar(route) ? TAB_BAR_HIDDEN : undefined,
            })}
          />
          <Tab.Screen
            name="MyPets"
            component={PetsStackScreen}
            options={({ route }) => ({
              tabBarButtonTestID: "tab-mypets",
              tabBarLabel: t("tabMyPets"),
              tabBarIcon: ({ focused, color }) => (
                <Ionicons
                  name={focused ? "paw" : "paw-outline"}
                  size={24}
                  color={color}
                />
              ),
              tabBarStyle: shouldHideTabBar(route) ? TAB_BAR_HIDDEN : undefined,
            })}
          />

          {isLoggedIn ? (
            <>
              <Tab.Screen
                name="Messages"
                component={MessagesStackScreen}
                options={({ route }) => ({
                  tabBarButtonTestID: "tab-messages",
                  tabBarLabel: t("tabMessages"),
                  tabBarIcon: ({ focused, color }) => (
                    <MessagesTabIcon focused={focused} color={color} />
                  ),
                  tabBarStyle: shouldHideTabBar(route) ? TAB_BAR_HIDDEN : undefined,
                })}
              />
              <Tab.Screen
                name="Profile"
                component={ProfileStackScreen}
                listeners={({ navigation }) => ({
                  tabPress: (e) => {
                    e.preventDefault();
                    navigation.navigate("Profile", {
                      screen: "ProfileMain",
                    });
                  },
                })}
                options={({ route }) => ({
                  tabBarButtonTestID: "tab-profile",
                  tabBarLabel: t("tabProfile"),
                  tabBarIcon: ({ focused, color }) => (
                    <Ionicons
                      name={focused ? "person" : "person-outline"}
                      size={24}
                      color={color}
                    />
                  ),
                  tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
                  tabBarStyle: shouldHideTabBar(route) ? TAB_BAR_HIDDEN : undefined,
                })}
              />
            </>
          ) : (
            <Tab.Screen
              name="Login"
              component={AuthStackScreen}
              options={{
                tabBarButtonTestID: "tab-login",
                tabBarLabel: t("tabLogin"),
                tabBarIcon: ({ focused, color }) => (
                  <Ionicons
                    name={focused ? "log-in" : "log-in-outline"}
                    size={24}
                    color={color}
                  />
                ),
              }}
            />
          )}
        </Tab.Navigator>
        <GlobalSosFab />
        </>
      );
    }
