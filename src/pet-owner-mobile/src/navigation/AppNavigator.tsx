import { useEffect, useRef, useState, useMemo } from "react";
import { View, Text, Pressable, StyleSheet, Animated, Dimensions } from "react-native";
import {
  createMaterialTopTabNavigator,
  type MaterialTopTabBarProps,
} from "@react-navigation/material-top-tabs";
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

const GLASS_PILL_H_MARGIN = 6;
// Seed the layout with an accurate initial estimate so the pill renders correctly
// on the very first frame before the onLayout measurement fires.
// The bar has marginHorizontal: 16 on each side → subtract 32 from screen width.
const INITIAL_CONTAINER_WIDTH = Dimensions.get("window").width - 32;

function GlassTabBar({ state, descriptors, navigation, position }: MaterialTopTabBarProps) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  // Exact inner width of the icon row, updated after the first layout pass.
  const [containerWidth, setContainerWidth] = useState(INITIAL_CONTAINER_WIDTH);

  const numTabs = state.routes.length;
  const tabW = containerWidth / numTabs; // Each tab item width — equal because flex:1
  const pillW = Math.max(0, tabW - GLASS_PILL_H_MARGIN * 2);

  // Map the pager's continuous Animated position value → pill translateX.
  //
  // • On swipe: position updates 60 fps, in lock-step with the user's finger.
  // • On tap:   the pager animates the transition; position follows, so the pill
  //             glides smoothly without any extra spring logic here.
  //
  // The Animated driver runs on the UI thread — zero JS-thread lag.
  const translateX = useMemo(
    () =>
      position.interpolate({
        inputRange: state.routes.map((_, i) => i),
        outputRange: state.routes.map((_, i) => i * tabW + GLASS_PILL_H_MARGIN),
        extrapolate: "clamp",
      }),
    // position is a stable reference that never changes for the life of this navigator.
    // tabW / numTabs only change when key= forces a full remount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [position, tabW, numTabs],
  );

  const focusedRoute = state.routes[state.index];
  const focusedTabBarStyle = (descriptors[focusedRoute.key].options as any).tabBarStyle;
  if (focusedTabBarStyle?.display === "none") return null;

  const overlayColor = isDark ? "rgba(26,34,54,0.90)" : "rgba(0,26,90,0.85)";

  return (
    <View
      style={[
        glassStyles.barContainer,
        {
          shadowColor: colors.shadow,
          paddingBottom: Math.max(insets.bottom, 8),
        },
      ]}
    >
      {/* Blur layer — frosted-glass texture */}
      <BlurView intensity={70} tint="dark" style={StyleSheet.absoluteFill} />
      {/* Brand-colour tint + opaque fallback for Android / no-blur devices */}
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: overlayColor, borderRadius: 28 },
        ]}
      />

      {/* Icon row — also the measurement surface for the interpolation */}
      <View
        style={glassStyles.contentRow}
        onLayout={({ nativeEvent: { layout } }) => setContainerWidth(layout.width)}
      >
        {/* Pill — driven by the pager's Animated position: finger-synced on swipe,
            smoothly animated on tap, zero JS-thread involvement. */}
        <Animated.View
          style={[
            glassStyles.pill,
            { width: pillW, transform: [{ translateX }] },
          ]}
        />

        {state.routes.map((route, index) => {
          // Cast so we can read bottom-tab-style extras (tabBarBadge, tabBarButtonTestID)
          // that are not in MaterialTopTabNavigationOptions but work fine at runtime.
          const options = descriptors[route.key].options as any;
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

          const onPress = () => {
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

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={options.tabBarButtonTestID ?? options.tabBarTestID}
              onPress={onPress}
              onLongPress={onLongPress}
              style={glassStyles.tabItem}
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
    paddingTop: 8,      // intentional breathing room above the icon row
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
    alignItems: "center",
    // No hardcoded height — wraps naturally to tabItem content + paddingVertical.
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
    alignItems: "center",
    paddingVertical: 7,   // content-height driver: icon(24) + gap(2) + label(~12) + 7+7 = ~52 px
    // No hardcoded height. justifyContent not needed — paddingVertical centres naturally.
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

function TabBarWithSos(props: MaterialTopTabBarProps) {
  return (
    <>
      <GlassTabBar {...props} />
      <GlobalSosFab />
    </>
  );
}

const Tab = createMaterialTopTabNavigator();
const AuthStack = createNativeStackNavigator();
const CompleteProfileStack = createNativeStackNavigator();
const ExploreStack = createNativeStackNavigator();
const CommunityStack = createNativeStackNavigator();
const PetsStack = createNativeStackNavigator();
const MessagesStack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();

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
  return (
    <CommunityStack.Navigator screenOptions={{ headerShown: false, freezeOnBlur: true }}>
      <CommunityStack.Screen name="CommunityMain" component={CommunityScreen} />
      <CommunityStack.Screen name="GroupDetail" component={GroupDetailScreen} />
      <CommunityStack.Screen name="PalProfile" component={PalProfileScreen} />
      <CommunityStack.Screen name="PlaydatePrefs" component={PlaydatePrefsScreen} />
      <CommunityStack.Screen name="LiveBeaconDetail" component={LiveBeaconDetailScreen} />
      <CommunityStack.Screen name="PlaydateEventDetail" component={PlaydateEventDetailScreen} />
      <CommunityStack.Screen name="CreatePlaydateEvent" component={CreatePlaydateEventScreen} />
    </CommunityStack.Navigator>
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
      tabBar={(tabProps) => <TabBarWithSos {...tabProps} />}
      tabBarPosition="bottom"
      screenOptions={{
        /** Lazy-mount tabs on first visit to avoid rendering off-screen stacks. */
        lazy: true,
        /** Allow horizontal swipe to switch tabs.
         *  NOTE: The Explore tab opts out below because its MapView uses the same
         *  gesture axis and would conflict with full-screen horizontal pans. */
        swipeEnabled: true,
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
          // Disable swipe on Explore — the MapView handles horizontal pans natively
          // and would fight with the pager view for the same gesture axis.
          swipeEnabled: false,
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
              tabBarIcon: ({ focused, color }: { focused: boolean; color: string }) => (
                <Ionicons
                  name={focused ? "person" : "person-outline"}
                  size={24}
                  color={color}
                />
              ),
              // tabBarBadge in material-top-tabs expects () => ReactNode; we pass a
              // plain number because our custom GlassTabBar reads it via (options as any).
              tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
              tabBarStyle: shouldHideTabBar(route) ? TAB_BAR_HIDDEN : undefined,
            } as any)}
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
    </>
  );
}
