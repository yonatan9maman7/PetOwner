import { useEffect, useRef } from "react";
import { View, Text, Platform } from "react-native";
import { PlatformPressable } from "@react-navigation/elements";
import {
  createBottomTabNavigator,
  BottomTabBar,
  type BottomTabBarButtonProps,
  type BottomTabBarProps,
} from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { getFocusedRouteNameFromRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../store/authStore";
import { useNotificationStore } from "../store/notificationStore";
import { useChatStore } from "../store/chatStore";
import { useTranslation } from "../i18n";
import { useTheme } from "../theme/ThemeContext";
import { GlobalSosFab } from "../components/GlobalSosFab";
import { tabBarRowHeight } from "./tabBarLayout";
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
import { whenNavigationReady } from "./rootNavigation";

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

/**
 * Thin wrapper: provides navigation context for GlobalSosFab (useNavigationState),
 * but does NOT override BottomTabBar's internal layout — tabBarStyle in screenOptions
 * controls all sizing/colors.
 */
function TabBarWithSos(props: BottomTabBarProps) {
  return (
    <>
      <BottomTabBar {...props} />
      <GlobalSosFab />
    </>
  );
}

function useTabBarStyle() {
  const { colors } = useTheme();
  const height = tabBarRowHeight();
  const isAndroid = Platform.OS === "android";
  return {
    backgroundColor: colors.tabBar,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingTop: isAndroid ? 8 : 6,
    // iOS: let React Navigation manage height + safe-area padding naturally.
    // Android: fix height and strip bottom padding (safe area handled by system nav bar).
    ...(isAndroid && {
      height,
      paddingBottom: 0,
      elevation: 48,
    }),
  };
}

/**
 * Tab press targets centered on icon+label.
 * Do NOT extend hitSlop into the wrapper's paddingBottom (system nav zone) — that
 * shifted Android taps ~48px below the visible icons.
 */
function LooseTabBarButton({ style, ...rest }: BottomTabBarButtonProps) {
  return (
    <PlatformPressable
      {...rest}
      style={[style, { flex: 1, justifyContent: "center", alignItems: "center" }]}
    />
  );
}

const TAB_BAR_HIDDEN = { display: "none" as const };

const Tab = createBottomTabNavigator();
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

export function AppNavigator() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const requiresPhone = useAuthStore((s) => s.requiresPhone);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const { t } = useTranslation();
  const { colors } = useTheme();
  const tabBarStyle = useTabBarStyle();

  useNavigateToExploreAfterLogin(isLoggedIn, requiresPhone);

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
      tabBar={(tabProps) => <TabBarWithSos {...tabProps} />}
      screenOptions={{
        headerShown: false,
        /** Inactive tabs skip re-renders while off-screen (saves CPU when switching tabs). */
        freezeOnBlur: true,
        /** Mount tab stacks on first visit (default in v7; explicit for clarity). */
        lazy: true,
        tabBarShowLabel: true,
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "700",
          marginTop: Platform.OS === "android" ? 2 : -2,
        },
        tabBarIconStyle: {
          marginBottom: Platform.OS === "android" ? 0 : -2,
        },
        tabBarItemStyle: {
          justifyContent: "center",
          alignItems: "center",
          paddingTop: 0,
          paddingBottom: 0,
        },
        tabBarButton: (btnProps) => <LooseTabBarButton {...btnProps} />,
        tabBarStyle,
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
          tabBarStyle: shouldHideTabBar(route) ? TAB_BAR_HIDDEN : tabBarStyle,
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
          tabBarStyle: shouldHideTabBar(route) ? TAB_BAR_HIDDEN : tabBarStyle,
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
          tabBarStyle: shouldHideTabBar(route) ? TAB_BAR_HIDDEN : tabBarStyle,
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
              tabBarStyle: shouldHideTabBar(route) ? TAB_BAR_HIDDEN : tabBarStyle,
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
              tabBarBadgeStyle: {
                backgroundColor: colors.danger,
                fontSize: 10,
                fontWeight: "700" as const,
                minWidth: 18,
                height: 18,
                borderRadius: 9,
                lineHeight: 18,
              },
              tabBarStyle: shouldHideTabBar(route) ? TAB_BAR_HIDDEN : tabBarStyle,
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
    </>
  );
}
