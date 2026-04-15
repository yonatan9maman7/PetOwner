import { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  FlatList,
  TextInput,
  Alert,
  ScrollView,
  Image,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { adminApi } from "../../api/client";
import { useTranslation } from "../../i18n";
import { useTheme } from "../../theme/ThemeContext";
import type {
  AdminStatsDto,
  AdminUserDto,
  AdminPetDto,
  PendingProviderDto,
  ContactInquiryAdminDto,
} from "../../types/api";

type Tab = "overview" | "users" | "pets" | "providers" | "inquiries";

/* ──────────────────── Stat Card ──────────────────── */

function StatCard({
  icon,
  label,
  value,
  color,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number | string;
  color: string;
  colors: ReturnType<typeof useTheme>["colors"];
}) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 16,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: color + "15",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 10,
        }}
      >
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={{ fontSize: 24, fontWeight: "800", color: colors.text }}>
        {value}
      </Text>
      <Text
        style={{
          fontSize: 11,
          color: colors.textSecondary,
          fontWeight: "600",
          marginTop: 2,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

/* ──────────────────── Badge ──────────────────── */

function Badge({ text, bg, fg }: { text: string; bg: string; fg: string }) {
  return (
    <View
      style={{
        backgroundColor: bg,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
      }}
    >
      <Text style={{ fontSize: 11, fontWeight: "700", color: fg }}>
        {text}
      </Text>
    </View>
  );
}

/* ──────────────────── Role color map ──────────────────── */

function roleBadge(
  role: string,
  colors: ReturnType<typeof useTheme>["colors"],
) {
  switch (role) {
    case "Admin":
      return { bg: "#fef3c7", fg: "#92400e" };
    case "Provider":
      return { bg: "#dbeafe", fg: "#1e40af" };
    default:
      return { bg: colors.surfaceSecondary, fg: colors.textSecondary };
  }
}

/* ──────────────────── Main Screen ──────────────────── */

export function AdminDashboardScreen() {
  const navigation = useNavigation<any>();
  const { t, isRTL } = useTranslation();
  const { colors } = useTheme();

  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [stats, setStats] = useState<AdminStatsDto | null>(null);
  const [users, setUsers] = useState<AdminUserDto[]>([]);
  const [pets, setPets] = useState<AdminPetDto[]>([]);
  const [pending, setPending] = useState<PendingProviderDto[]>([]);
  const [inquiries, setInquiries] = useState<ContactInquiryAdminDto[]>([]);

  const [userSearch, setUserSearch] = useState("");
  const [petSearch, setPetSearch] = useState("");
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<AdminUserDto | null>(null);
  const [suspendReason, setSuspendReason] = useState("");

  /* ─── Load helpers ─── */

  const loadStats = useCallback(async () => {
    try {
      setStats(await adminApi.getStats());
    } catch {}
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      setUsers(await adminApi.getUsers());
    } catch {}
  }, []);

  const loadPets = useCallback(async () => {
    try {
      setPets(await adminApi.getPets());
    } catch {}
  }, []);

  const loadPending = useCallback(async () => {
    try {
      setPending(await adminApi.getPending());
    } catch {}
  }, []);

  const loadInquiries = useCallback(async () => {
    try {
      setInquiries(await adminApi.getInquiries());
    } catch {}
  }, []);

  const reloadAll = useCallback(async () => {
    await Promise.all([loadStats(), loadUsers(), loadPets(), loadPending(), loadInquiries()]);
  }, [loadStats, loadUsers, loadPets, loadPending, loadInquiries]);

  useEffect(() => {
    setLoading(true);
    reloadAll().finally(() => setLoading(false));
  }, [reloadAll]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await reloadAll();
    setRefreshing(false);
  }, [reloadAll]);

  /* ─── Filtered lists ─── */

  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return users;
    const q = userSearch.toLowerCase();
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q),
    );
  }, [users, userSearch]);

  const filteredPets = useMemo(() => {
    if (!petSearch.trim()) return pets;
    const q = petSearch.toLowerCase();
    return pets.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.ownerName.toLowerCase().includes(q) ||
        p.species.toLowerCase().includes(q) ||
        (p.breed ?? "").toLowerCase().includes(q),
    );
  }, [pets, petSearch]);

  /* ─── User actions ─── */

  const changeRole = async (user: AdminUserDto, newRole: string) => {
    setActionLoading(user.id);
    try {
      await adminApi.changeRole(user.id, newRole);
      await loadUsers();
      await loadStats();
    } catch {
      Alert.alert("Error", "Failed to change role");
    }
    setActionLoading(null);
  };

  const toggleStatus = async (user: AdminUserDto) => {
    setActionLoading(user.id);
    try {
      await adminApi.toggleUserStatus(user.id);
      await loadUsers();
    } catch {
      Alert.alert("Error", "Failed to toggle status");
    }
    setActionLoading(null);
  };

  const confirmSuspend = async () => {
    if (!suspendTarget) return;
    setActionLoading(suspendTarget.id);
    try {
      await adminApi.suspendProvider(
        suspendTarget.id,
        suspendReason || undefined,
      );
      await loadUsers();
    } catch {
      Alert.alert("Error", "Failed to suspend provider");
    }
    setActionLoading(null);
    setSuspendTarget(null);
    setSuspendReason("");
  };

  const banProvider = (user: AdminUserDto) => {
    Alert.alert(t("ban"), t("deleteConfirm"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("ban"),
        style: "destructive",
        onPress: async () => {
          setActionLoading(user.id);
          try {
            await adminApi.banProvider(user.id);
            await loadUsers();
          } catch {
            Alert.alert("Error", "Failed to ban");
          }
          setActionLoading(null);
        },
      },
    ]);
  };

  const reactivateProvider = async (user: AdminUserDto) => {
    setActionLoading(user.id);
    try {
      await adminApi.reactivateProvider(user.id);
      await loadUsers();
    } catch {
      Alert.alert("Error", "Failed to reactivate");
    }
    setActionLoading(null);
  };

  /* ─── Pet actions ─── */

  const deletePet = (pet: AdminPetDto) => {
    Alert.alert(t("deleteConfirm"), pet.name, [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("delete"),
        style: "destructive",
        onPress: async () => {
          setActionLoading(pet.id);
          try {
            await adminApi.deletePet(pet.id);
            setPets((prev) => prev.filter((p) => p.id !== pet.id));
            await loadStats();
          } catch {
            Alert.alert("Error", "Failed to delete pet");
          }
          setActionLoading(null);
        },
      },
    ]);
  };

  /* ─── Provider actions ─── */

  const approveProvider = async (userId: string) => {
    setActionLoading(userId);
    try {
      await adminApi.approveProvider(userId);
      setPending((prev) => prev.filter((p) => p.userId !== userId));
      await loadStats();
    } catch {
      Alert.alert("Error", "Failed to approve");
    }
    setActionLoading(null);
  };

  /* ─── Dev tools ─── */

  const seedDemo = async () => {
    setActionLoading("seed");
    try {
      await adminApi.seedDemoData();
      await reloadAll();
      Alert.alert("Done", "Demo data seeded");
    } catch {
      Alert.alert("Error", "Seed failed");
    }
    setActionLoading(null);
  };

  const seedPets = async () => {
    setActionLoading("seedPets");
    try {
      const res = await adminApi.seedBogusPets();
      await loadPets();
      await loadStats();
      Alert.alert("Done", (res as any)?.message || "Pets seeded");
    } catch {
      Alert.alert("Error", "Seed failed");
    }
    setActionLoading(null);
  };

  const clearSos = async () => {
    setActionLoading("sos");
    try {
      await adminApi.clearSos();
      await loadStats();
      Alert.alert("Done", "SOS cleared");
    } catch {
      Alert.alert("Error", "Clear failed");
    }
    setActionLoading(null);
  };

  /* ─── Tab bar data ─── */

  const tabs: { key: Tab; icon: keyof typeof Ionicons.glyphMap; label: string; badge?: number }[] = [
    { key: "overview", icon: "grid", label: t("adminOverview") },
    { key: "users", icon: "people", label: t("adminUsersTab") },
    { key: "pets", icon: "paw", label: t("adminPetsTab") },
    {
      key: "providers",
      icon: "briefcase",
      label: t("adminProvidersTab"),
      badge: stats?.pendingProviders,
    },
    {
      key: "inquiries",
      icon: "chatbubbles",
      label: t("adminInquiriesTab"),
      badge: stats?.unreadContactInquiries,
    },
  ];

  /* ─────────── RENDER ─────────── */

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, marginTop: -8 }} edges={["top"]}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, marginTop: -8 }} edges={["top"]}>
      {/* ─── Header ─── */}
      <View
        style={{
          flexDirection: isRTL ? "row-reverse" : "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 20,
          paddingVertical: 14,
          backgroundColor: colors.surface,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.04,
          shadowRadius: 8,
          elevation: 2,
        }}
      >
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons
            name={isRTL ? "arrow-forward" : "arrow-back"}
            size={24}
            color={colors.primary}
          />
        </Pressable>
        <Text style={{ fontSize: 17, fontWeight: "700", color: colors.primary }}>
          {t("adminDashboard")}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* ─── Tab bar ─── */}
      <View style={{ height: 52, flexShrink: 0 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
            alignItems: "center",
            height: 52,
            gap: 8,
            flexDirection: isRTL ? "row-reverse" : "row",
          }}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={{
                  flexDirection: isRTL ? "row-reverse" : "row",
                  alignItems: "center",
                  gap: 6,
                  height: 36,
                  paddingHorizontal: 14,
                  borderRadius: 18,
                  backgroundColor: isActive ? colors.primary : colors.surface,
                  shadowColor: colors.shadow,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.04,
                  shadowRadius: 8,
                  elevation: 2,
                }}
              >
                <Ionicons
                  name={tab.icon}
                  size={15}
                  color={isActive ? colors.textInverse : colors.textSecondary}
                />
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: isActive ? colors.textInverse : colors.textSecondary,
                  }}
                  numberOfLines={1}
                >
                  {tab.label}
                </Text>
                {(tab.badge ?? 0) > 0 && (
                  <View
                    style={{
                      backgroundColor: "#ef4444",
                      minWidth: 18,
                      height: 18,
                      borderRadius: 9,
                      alignItems: "center",
                      justifyContent: "center",
                      paddingHorizontal: 4,
                    }}
                  >
                    <Text
                      style={{ fontSize: 10, fontWeight: "800", color: "#fff" }}
                    >
                      {tab.badge}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ─── Content ─── */}
      {activeTab === "overview" && renderOverview()}
      {activeTab === "users" && renderUsers()}
      {activeTab === "pets" && renderPets()}
      {activeTab === "providers" && renderProviders()}
      {activeTab === "inquiries" && renderInquiries()}

      {/* ─── Suspend modal ─── */}
      {suspendTarget && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: colors.overlay,
            justifyContent: "center",
            alignItems: "center",
            zIndex: 2000,
          }}
        >
          <Pressable
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
            onPress={() => {
              setSuspendTarget(null);
              setSuspendReason("");
            }}
          />
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 20,
              padding: 24,
              width: "85%",
              gap: 16,
            }}
          >
            <Text
              style={{ fontSize: 17, fontWeight: "700", color: colors.text, textAlign: "center" }}
            >
              {t("suspend")} — {suspendTarget.name}
            </Text>
            <TextInput
              placeholder={t("suspendReason")}
              placeholderTextColor={colors.textMuted}
              value={suspendReason}
              onChangeText={setSuspendReason}
              multiline
              style={{
                backgroundColor: colors.inputBg,
                borderRadius: 12,
                padding: 14,
                fontSize: 14,
                color: colors.text,
                borderWidth: 1,
                borderColor: colors.border,
                minHeight: 80,
                textAlign: isRTL ? "right" : "left",
              }}
            />
            <View style={{ flexDirection: "row", gap: 12 }}>
              <Pressable
                onPress={() => {
                  setSuspendTarget(null);
                  setSuspendReason("");
                }}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: colors.surfaceSecondary,
                  alignItems: "center",
                }}
              >
                <Text style={{ fontWeight: "600", color: colors.textSecondary }}>
                  {t("cancel")}
                </Text>
              </Pressable>
              <Pressable
                onPress={confirmSuspend}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: "#f59e0b",
                  alignItems: "center",
                }}
              >
                {actionLoading === suspendTarget.id ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={{ fontWeight: "700", color: "#fff" }}>
                    {t("confirmAction")}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );

  /* ═════════════════════ TAB RENDERERS ═════════════════════ */

  function renderOverview() {
    if (!stats) return null;
    return (
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 140, gap: 12 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Revenue banner */}
        <View
          style={{
            backgroundColor: colors.primary,
            borderRadius: 16,
            padding: 20,
            flexDirection: isRTL ? "row-reverse" : "row",
            alignItems: "center",
            gap: 14,
            marginBottom: 4,
          }}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: "rgba(255,255,255,0.15)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="cash" size={24} color="#fbbf24" />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 12,
                color: "rgba(255,255,255,0.7)",
                fontWeight: "600",
                textAlign: isRTL ? "right" : "left",
              }}
            >
              {t("adminRevenue")}
            </Text>
            <Text
              style={{
                fontSize: 26,
                fontWeight: "800",
                color: colors.textInverse,
                textAlign: isRTL ? "right" : "left",
              }}
            >
              ₪{stats.totalPlatformRevenue.toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Stat grid */}
        <View style={{ flexDirection: "row", gap: 12 }}>
          <StatCard
            icon="people"
            label={t("totalUsers")}
            value={stats.totalUsers}
            color="#6366f1"
            colors={colors}
          />
          <StatCard
            icon="paw"
            label={t("totalPets")}
            value={stats.totalPets}
            color="#10b981"
            colors={colors}
          />
        </View>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <StatCard
            icon="briefcase"
            label={t("totalProviders")}
            value={stats.totalProviders}
            color="#f59e0b"
            colors={colors}
          />
          <StatCard
            icon="calendar"
            label={t("totalBookings")}
            value={stats.totalBookings}
            color="#3b82f6"
            colors={colors}
          />
        </View>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <StatCard
            icon="alert-circle"
            label={t("activeSOSReports")}
            value={stats.activeSOSReports}
            color="#ef4444"
            colors={colors}
          />
          <StatCard
            icon="time"
            label={t("pendingProviders")}
            value={stats.pendingProviders}
            color="#8b5cf6"
            colors={colors}
          />
        </View>

        {/* Developer tools */}
        <View style={{ marginTop: 16 }}>
          <Text
            style={{
              fontSize: 13,
              fontWeight: "700",
              color: colors.textMuted,
              textTransform: "uppercase",
              letterSpacing: 1,
              marginBottom: 10,
              textAlign: isRTL ? "right" : "left",
            }}
          >
            {t("devTools")}
          </Text>
          <View style={{ gap: 8 }}>
            {[
              { key: "seed", label: t("seedDemo"), icon: "flask" as const, fn: seedDemo, color: "#6366f1" },
              { key: "seedPets", label: t("seedPets"), icon: "paw" as const, fn: seedPets, color: "#10b981" },
              { key: "sos", label: t("clearSos"), icon: "close-circle" as const, fn: clearSos, color: "#ef4444" },
            ].map((item) => (
              <Pressable
                key={item.key}
                onPress={item.fn}
                disabled={actionLoading === item.key}
                style={{
                  flexDirection: isRTL ? "row-reverse" : "row",
                  alignItems: "center",
                  gap: 12,
                  backgroundColor: colors.surface,
                  padding: 14,
                  borderRadius: 12,
                  shadowColor: colors.shadow,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.04,
                  shadowRadius: 8,
                  elevation: 2,
                }}
              >
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    backgroundColor: item.color + "15",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {actionLoading === item.key ? (
                    <ActivityIndicator size="small" color={item.color} />
                  ) : (
                    <Ionicons name={item.icon} size={18} color={item.color} />
                  )}
                </View>
                <Text style={{ fontSize: 14, fontWeight: "600", color: colors.text }}>
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    );
  }

  /* ═══════════════════ USERS TAB ═══════════════════ */

  function renderUsers() {
    return (
      <View style={{ flex: 1 }}>
        {/* Search */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
          <View
            style={{
              flexDirection: isRTL ? "row-reverse" : "row",
              alignItems: "center",
              backgroundColor: colors.surface,
              borderRadius: 12,
              paddingHorizontal: 14,
              gap: 8,
              shadowColor: colors.shadow,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.04,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <TextInput
              placeholder={t("searchUsers")}
              value={userSearch}
              onChangeText={setUserSearch}
              style={{
                flex: 1,
                paddingVertical: 12,
                fontSize: 14,
                textAlign: isRTL ? "right" : "left",
                color: colors.text,
              }}
              placeholderTextColor={colors.textMuted}
            />
          </View>
        </View>

        {filteredUsers.length === 0 ? (
          <View
            style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
          >
            <Ionicons name="people-outline" size={48} color={colors.borderLight} />
            <Text style={{ color: colors.textMuted, marginTop: 8, fontWeight: "600" }}>
              {t("noUsersFound")}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredUsers}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 140, gap: 10 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            renderItem={({ item }) => <UserCard user={item} />}
          />
        )}
      </View>
    );
  }

  function UserCard({ user }: { user: AdminUserDto }) {
    const isAdmin = user.role === "Admin";
    const isProvider = user.role === "Provider";
    const isSuspended = user.providerStatus === "Suspended";
    const isProcessing = actionLoading === user.id;
    const rb = roleBadge(user.role, colors);

    return (
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: 14,
          padding: 14,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.04,
          shadowRadius: 8,
          elevation: 2,
        }}
      >
        {/* Top row: avatar + info + badges */}
        <View
          style={{
            flexDirection: isRTL ? "row-reverse" : "row",
            alignItems: "center",
            gap: 10,
          }}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: colors.primaryLight,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="person" size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <View
              style={{
                flexDirection: isRTL ? "row-reverse" : "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "700",
                  color: colors.text,
                  textAlign: isRTL ? "right" : "left",
                  flexShrink: 1,
                }}
                numberOfLines={1}
              >
                {user.name}
              </Text>
              <View
                style={{
                  flexDirection: isRTL ? "row-reverse" : "row",
                  gap: 4,
                  marginStart: 8,
                }}
              >
                <Badge text={user.role} bg={rb.bg} fg={rb.fg} />
                <Badge
                  text={user.isActive ? t("active") : t("blocked")}
                  bg={user.isActive ? "#dcfce7" : "#fee2e2"}
                  fg={user.isActive ? "#166534" : "#991b1b"}
                />
              </View>
            </View>
            <Text
              style={{
                fontSize: 12,
                color: colors.textSecondary,
                textAlign: isRTL ? "right" : "left",
                marginTop: 1,
              }}
              numberOfLines={1}
            >
              {user.email}
            </Text>
          </View>
        </View>

        {/* Info row */}
        <View
          style={{
            flexDirection: isRTL ? "row-reverse" : "row",
            alignItems: "center",
            gap: 12,
            marginTop: 8,
            paddingStart: 50,
          }}
        >
          {user.phone ? (
            <View
              style={{
                flexDirection: isRTL ? "row-reverse" : "row",
                alignItems: "center",
                gap: 3,
              }}
            >
              <Ionicons name="call-outline" size={11} color={colors.textMuted} />
              <Text style={{ fontSize: 11, color: colors.textMuted }}>
                {user.phone}
              </Text>
            </View>
          ) : null}
          <View
            style={{
              flexDirection: isRTL ? "row-reverse" : "row",
              alignItems: "center",
              gap: 3,
            }}
          >
            <Ionicons name="calendar-outline" size={11} color={colors.textMuted} />
            <Text style={{ fontSize: 11, color: colors.textMuted }}>
              {new Date(user.createdAt).toLocaleDateString()}
            </Text>
          </View>
          {isSuspended && (
            <Badge text="Suspended" bg="#fef3c7" fg="#92400e" />
          )}
        </View>

        {/* Actions */}
        {isAdmin ? (
          <Text
            style={{
              fontSize: 11,
              color: colors.textMuted,
              fontStyle: "italic",
              textAlign: isRTL ? "right" : "left",
              marginTop: 6,
              paddingStart: 50,
            }}
          >
            {t("protected")}
          </Text>
        ) : (
          <View
            style={{
              flexDirection: isRTL ? "row-reverse" : "row",
              flexWrap: "wrap",
              gap: 6,
              marginTop: 10,
              paddingTop: 10,
              borderTopWidth: 1,
              borderTopColor: colors.borderLight,
            }}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                <ActionChip
                  label={t("makeAdmin")}
                  icon="shield"
                  color="#f59e0b"
                  onPress={() => changeRole(user, "Admin")}
                />
                {user.role !== "Provider" && (
                  <ActionChip
                    label={t("makeProvider")}
                    icon="briefcase"
                    color="#3b82f6"
                    onPress={() => changeRole(user, "Provider")}
                  />
                )}

                <ActionChip
                  label={user.isActive ? t("deactivate") : t("activate")}
                  icon={user.isActive ? "close-circle" : "checkmark-circle"}
                  color={user.isActive ? "#ef4444" : "#10b981"}
                  onPress={() => toggleStatus(user)}
                />

                {isProvider && (
                  <>
                    <ActionChip
                      label={t("suspend")}
                      icon="snow"
                      color="#f59e0b"
                      onPress={() => setSuspendTarget(user)}
                    />
                    <ActionChip
                      label={t("ban")}
                      icon="ban"
                      color="#ef4444"
                      onPress={() => banProvider(user)}
                    />
                  </>
                )}

                {isSuspended && (
                  <ActionChip
                    label={t("reactivateProvider")}
                    icon="refresh"
                    color="#10b981"
                    onPress={() => reactivateProvider(user)}
                  />
                )}
              </>
            )}
          </View>
        )}
      </View>
    );
  }

  /* ═══════════════════ PETS TAB ═══════════════════ */

  function renderPets() {
    return (
      <View style={{ flex: 1 }}>
        {/* Search */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
          <View
            style={{
              flexDirection: isRTL ? "row-reverse" : "row",
              alignItems: "center",
              backgroundColor: colors.surface,
              borderRadius: 12,
              paddingHorizontal: 14,
              gap: 8,
              shadowColor: colors.shadow,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.04,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <TextInput
              placeholder={t("searchPets")}
              value={petSearch}
              onChangeText={setPetSearch}
              style={{
                flex: 1,
                paddingVertical: 12,
                fontSize: 14,
                textAlign: isRTL ? "right" : "left",
                color: colors.text,
              }}
              placeholderTextColor={colors.textMuted}
            />
          </View>
        </View>

        {filteredPets.length === 0 ? (
          <View
            style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
          >
            <Ionicons name="paw-outline" size={48} color={colors.borderLight} />
            <Text style={{ color: colors.textMuted, marginTop: 8, fontWeight: "600" }}>
              {t("noPetsFound")}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredPets}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={{ gap: 10, paddingHorizontal: 16 }}
            contentContainerStyle={{ paddingBottom: 140, gap: 10 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            renderItem={({ item }) => <PetCard pet={item} />}
          />
        )}
      </View>
    );
  }

  function PetCard({ pet }: { pet: AdminPetDto }) {
    const speciesEmoji =
      pet.species === "Dog"
        ? "🐕"
        : pet.species === "Cat"
          ? "🐈"
          : pet.species === "Bird"
            ? "🦜"
            : "🐾";

    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.surface,
          borderRadius: 14,
          overflow: "hidden",
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.04,
          shadowRadius: 8,
          elevation: 2,
        }}
      >
        {/* Image / placeholder */}
        {pet.imageUrl ? (
          <Image
            source={{ uri: pet.imageUrl }}
            style={{ width: "100%", height: 110 }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={{
              width: "100%",
              height: 110,
              backgroundColor: colors.surfaceSecondary,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 36 }}>{speciesEmoji}</Text>
          </View>
        )}

        {/* Species badge */}
        <View
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            backgroundColor: colors.primary + "E0",
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 8,
          }}
        >
          <Text style={{ fontSize: 10, fontWeight: "700", color: colors.textInverse }}>
            {pet.species}
          </Text>
        </View>

        <View style={{ padding: 12 }}>
          <Text
            style={{ fontSize: 14, fontWeight: "700", color: colors.text }}
            numberOfLines={1}
          >
            {pet.name}
          </Text>
          <Text
            style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}
            numberOfLines={1}
          >
            {pet.breed ?? pet.species} · {pet.age}y
          </Text>
          <Text
            style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}
            numberOfLines={1}
          >
            {t("owner")}: {pet.ownerName}
          </Text>

          {/* Delete */}
          <Pressable
            onPress={() => deletePet(pet)}
            disabled={actionLoading === pet.id}
            style={{
              marginTop: 8,
              backgroundColor: "#fee2e2",
              paddingVertical: 7,
              borderRadius: 8,
              alignItems: "center",
            }}
          >
            {actionLoading === pet.id ? (
              <ActivityIndicator size="small" color="#ef4444" />
            ) : (
              <Text style={{ fontSize: 12, fontWeight: "600", color: "#ef4444" }}>
                {t("delete")}
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    );
  }

  /* ═══════════════════ PROVIDERS TAB ═══════════════════ */

  function renderProviders() {
    if (pending.length === 0) {
      return (
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <Ionicons name="checkmark-circle" size={56} color="#10b981" />
          <Text
            style={{
              color: colors.textMuted,
              marginTop: 10,
              fontWeight: "600",
              fontSize: 15,
            }}
          >
            {t("noPendingProviders")}
          </Text>
        </View>
      );
    }

    return (
      <FlatList
        data={pending}
        keyExtractor={(item) => item.userId}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 140, gap: 10 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        renderItem={({ item }) => <ProviderCard provider={item} />}
      />
    );
  }

  function ProviderCard({ provider }: { provider: PendingProviderDto }) {
    const isExpanded = expandedProvider === provider.userId;
    const isProcessing = actionLoading === provider.userId;

    return (
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: 14,
          overflow: "hidden",
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.04,
          shadowRadius: 8,
          elevation: 2,
        }}
      >
        {/* Header (tap to expand) */}
        <Pressable
          onPress={() =>
            setExpandedProvider(isExpanded ? null : provider.userId)
          }
          style={{
            flexDirection: isRTL ? "row-reverse" : "row",
            alignItems: "center",
            padding: 14,
            gap: 12,
          }}
        >
          {provider.profileImageUrl ? (
            <Image
              source={{ uri: provider.profileImageUrl }}
              style={{ width: 44, height: 44, borderRadius: 14 }}
            />
          ) : (
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                backgroundColor: colors.primaryLight,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="person" size={22} color={colors.primary} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 15,
                fontWeight: "700",
                color: colors.text,
                textAlign: isRTL ? "right" : "left",
              }}
            >
              {provider.name}
            </Text>
            {provider.phone ? (
              <Text
                style={{
                  fontSize: 12,
                  color: colors.textSecondary,
                  textAlign: isRTL ? "right" : "left",
                }}
              >
                {provider.phone}
              </Text>
            ) : null}
          </View>
          <View
            style={{
              flexDirection: isRTL ? "row-reverse" : "row",
              flexWrap: "wrap",
              gap: 4,
              maxWidth: 120,
            }}
          >
            {provider.services.slice(0, 3).map((s) => (
              <View
                key={s}
                style={{
                  backgroundColor: "#eff6ff",
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 6,
                }}
              >
                <Text style={{ fontSize: 9, fontWeight: "600", color: "#3b82f6" }}>
                  {s}
                </Text>
              </View>
            ))}
          </View>
          <Ionicons
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={18}
            color={colors.textMuted}
          />
        </Pressable>

        {/* Expanded details */}
        {isExpanded && (
          <View
            style={{
              paddingHorizontal: 14,
              paddingBottom: 14,
              borderTopWidth: 1,
              borderTopColor: colors.borderLight,
              gap: 8,
            }}
          >
            {provider.bio ? (
              <Text
                style={{
                  fontSize: 13,
                  color: colors.textSecondary,
                  marginTop: 10,
                  textAlign: isRTL ? "right" : "left",
                  lineHeight: 20,
                }}
              >
                {provider.bio}
              </Text>
            ) : (
              <Text
                style={{
                  fontSize: 12,
                  color: colors.textMuted,
                  fontStyle: "italic",
                  marginTop: 10,
                }}
              >
                No bio provided
              </Text>
            )}

            <InfoRow
              icon="calendar-outline"
              label={t("registered")}
              value={new Date(provider.createdAt).toLocaleDateString()}
            />
            {provider.address && (
              <InfoRow
                icon="location-outline"
                label=""
                value={provider.address}
              />
            )}
            {provider.referenceName && (
              <InfoRow
                icon="people-outline"
                label={t("reference")}
                value={`${provider.referenceName}${provider.referenceContact ? ` · ${provider.referenceContact}` : ""}`}
              />
            )}

            {/* Approve button */}
            <Pressable
              onPress={() => approveProvider(provider.userId)}
              disabled={isProcessing}
              style={{
                backgroundColor: "#10b981",
                paddingVertical: 12,
                borderRadius: 12,
                alignItems: "center",
                marginTop: 4,
              }}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={{ fontSize: 14, fontWeight: "700", color: "#fff" }}>
                  {t("approve")}
                </Text>
              )}
            </Pressable>
          </View>
        )}
      </View>
    );
  }

  /* ─── Inquiries tab ─── */

  function renderInquiries() {
    if (inquiries.length === 0) {
      return (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="chatbubbles-outline" size={56} color={colors.textMuted} />
          <Text style={{ color: colors.textMuted, marginTop: 10, fontWeight: "600", fontSize: 15 }}>
            {t("adminNoInquiries")}
          </Text>
        </View>
      );
    }

    return (
      <FlatList
        data={inquiries}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 140, gap: 10 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => <InquiryCard inquiry={item} />}
      />
    );
  }

  function InquiryCard({ inquiry }: { inquiry: ContactInquiryAdminDto }) {
    const isRead = !!inquiry.readAt;
    const isProcessing = actionLoading === inquiry.id;

    const topicColor: Record<string, string> = {
      general: "#6366f1",
      account: "#0891b2",
      bug: "#dc2626",
      billing: "#ea580c",
    };

    const markRead = async () => {
      setActionLoading(inquiry.id);
      try {
        await adminApi.markInquiryRead(inquiry.id);
        setInquiries((prev) =>
          prev.map((i) =>
            i.id === inquiry.id ? { ...i, readAt: new Date().toISOString() } : i,
          ),
        );
        await loadStats();
      } catch {
        Alert.alert("Error", "Failed to mark as read");
      }
      setActionLoading(null);
    };

    return (
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: 14,
          overflow: "hidden",
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.04,
          shadowRadius: 8,
          elevation: 2,
          borderLeftWidth: isRead ? 0 : 3,
          borderLeftColor: colors.primary,
        }}
      >
        <View style={{ padding: 14, gap: 8 }}>
          <View
            style={{
              flexDirection: isRTL ? "row-reverse" : "row",
              alignItems: "center",
              gap: 8,
            }}
          >
            <View
              style={{
                backgroundColor: (topicColor[inquiry.topic] ?? "#64748b") + "15",
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 8,
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "700",
                  color: topicColor[inquiry.topic] ?? "#64748b",
                }}
              >
                {inquiry.topic.toUpperCase()}
              </Text>
            </View>
            {isRead && (
              <View
                style={{
                  backgroundColor: colors.successLight,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 8,
                }}
              >
                <Text style={{ fontSize: 10, fontWeight: "700", color: colors.success }}>
                  {t("adminInquiryRead")}
                </Text>
              </View>
            )}
            <View style={{ flex: 1 }} />
            <Text style={{ fontSize: 11, color: colors.textMuted }}>
              {new Date(inquiry.createdAt).toLocaleDateString()}
            </Text>
          </View>

          <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 6, alignItems: "center" }}>
            <Ionicons name="person-outline" size={14} color={colors.textMuted} />
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: colors.text,
                textAlign: isRTL ? "right" : "left",
              }}
              numberOfLines={1}
            >
              {inquiry.userName}
            </Text>
            <Text style={{ fontSize: 12, color: colors.textSecondary }} numberOfLines={1}>
              {inquiry.userEmail}
            </Text>
          </View>

          {inquiry.subject ? (
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: colors.text,
                textAlign: isRTL ? "right" : "left",
              }}
              numberOfLines={2}
            >
              {inquiry.subject}
            </Text>
          ) : null}

          <Text
            style={{
              fontSize: 13,
              color: colors.textSecondary,
              lineHeight: 20,
              textAlign: isRTL ? "right" : "left",
            }}
            numberOfLines={4}
          >
            {inquiry.message}
          </Text>

          {inquiry.appVersion || inquiry.platform ? (
            <Text style={{ fontSize: 10, color: colors.textMuted }}>
              {[inquiry.platform, inquiry.appVersion ? `v${inquiry.appVersion}` : ""]
                .filter(Boolean)
                .join(" · ")}
            </Text>
          ) : null}

          {!isRead && (
            <Pressable
              onPress={markRead}
              disabled={isProcessing}
              style={{
                backgroundColor: colors.primary,
                paddingVertical: 10,
                borderRadius: 10,
                alignItems: "center",
                marginTop: 4,
              }}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={{ fontSize: 13, fontWeight: "700", color: "#fff" }}>
                  {t("adminMarkRead")}
                </Text>
              )}
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  /* ─── Helper sub-components ─── */

  function InfoRow({
    icon,
    label,
    value,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value: string;
  }) {
    return (
      <View
        style={{
          flexDirection: isRTL ? "row-reverse" : "row",
          alignItems: "center",
          gap: 8,
        }}
      >
        <Ionicons name={icon} size={14} color={colors.textMuted} />
        {label ? (
          <Text style={{ fontSize: 12, color: colors.textMuted, fontWeight: "600" }}>
            {label}:
          </Text>
        ) : null}
        <Text
          style={{
            fontSize: 12,
            color: colors.textSecondary,
            flex: 1,
            textAlign: isRTL ? "right" : "left",
          }}
          numberOfLines={2}
        >
          {value}
        </Text>
      </View>
    );
  }

  function ActionChip({
    label,
    icon,
    color,
    onPress,
  }: {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    onPress: () => void;
  }) {
    return (
      <Pressable
        onPress={onPress}
        style={{
          flexDirection: isRTL ? "row-reverse" : "row",
          alignItems: "center",
          gap: 4,
          backgroundColor: color + "12",
          paddingHorizontal: 10,
          paddingVertical: 6,
          borderRadius: 8,
        }}
      >
        <Ionicons name={icon} size={12} color={color} />
        <Text style={{ fontSize: 11, fontWeight: "600", color }}>{label}</Text>
      </Pressable>
    );
  }
}
