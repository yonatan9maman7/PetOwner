import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../store/authStore";
import { useTranslation } from "../i18n";
import { ExploreScreen } from "../screens/explore/ExploreScreen";
import { MyPetsScreen } from "../screens/pets/MyPetsScreen";
import { CommunityScreen } from "../screens/community/CommunityScreen";
import { LoginScreen } from "../screens/auth/LoginScreen";
import { RegisterScreen } from "../screens/auth/RegisterScreen";
import { ForgotPasswordScreen } from "../screens/auth/ForgotPasswordScreen";
import { ProfileScreen } from "../screens/profile/ProfileScreen";
import { ProviderEditScreen } from "../screens/profile/ProviderEditScreen";
import { MessagesScreen } from "../screens/messages/MessagesScreen";

const Tab = createBottomTabNavigator();
const AuthStack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();

function AuthStackScreen() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="LoginScreen" component={LoginScreen} />
      <AuthStack.Screen name="RegisterScreen" component={RegisterScreen} />
      <AuthStack.Screen
        name="ForgotPasswordScreen"
        component={ForgotPasswordScreen}
      />
    </AuthStack.Navigator>
  );
}

function ProfileStackScreen() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} />
      <ProfileStack.Screen name="ProviderEdit" component={ProviderEditScreen} />
    </ProfileStack.Navigator>
  );
}

export function AppNavigator() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: "#ffffff",
        tabBarInactiveTintColor: "rgba(255,255,255,0.5)",
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
          marginTop: -2,
        },
        tabBarIconStyle: {
          marginBottom: -2,
        },
        tabBarStyle: {
          position: "absolute",
          bottom: 30,
          left: 20,
          right: 20,
          height: 70,
          borderRadius: 35,
          borderTopWidth: 0,
          backgroundColor: "#001a5a",
          paddingTop: 8,
          paddingBottom: 8,
          zIndex: 9999,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.3,
          shadowRadius: 15,
          elevation: 25,
        },
      }}
    >
      <Tab.Screen
        name="Explore"
        component={ExploreScreen}
        options={{
          tabBarLabel: t("tabExplore"),
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? "compass" : "compass-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Community"
        component={CommunityScreen}
        options={{
          tabBarLabel: t("tabCommunity"),
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? "people" : "people-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="MyPets"
        component={MyPetsScreen}
        options={{
          tabBarLabel: t("tabMyPets"),
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? "paw" : "paw-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />

      {isLoggedIn ? (
        <>
          <Tab.Screen
            name="Messages"
            component={MessagesScreen}
            options={{
              tabBarLabel: t("tabMessages"),
              tabBarIcon: ({ focused, color }) => (
                <Ionicons
                  name={focused ? "chatbubble" : "chatbubble-outline"}
                  size={24}
                  color={color}
                />
              ),
            }}
          />
          <Tab.Screen
            name="Profile"
            component={ProfileStackScreen}
            options={{
              tabBarLabel: t("tabProfile"),
              tabBarIcon: ({ focused, color }) => (
                <Ionicons
                  name={focused ? "person" : "person-outline"}
                  size={24}
                  color={color}
                />
              ),
            }}
          />
        </>
      ) : (
        <Tab.Screen
          name="Login"
          component={AuthStackScreen}
          options={{
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
  );
}
