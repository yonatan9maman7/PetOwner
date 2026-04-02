import { useAuthStore } from "../store/authStore";

export type Language = "he" | "en";

const he = {
  welcomeTitle: "ברוכים השבים",
  welcomeSubtitle:
    "גישה למקלט שלך וללוח הבקרה המותאם אישית לחיות המחמד שלך.",
  emailLabel: "כתובת אימייל",
  emailPlaceholder: "name@premium.com",
  passwordLabel: "סיסמה",
  passwordPlaceholder: "••••••••",
  loginButton: "התחברות",
  forgotPassword: "שכחת סיסמה?",
  socialDivider: "או המשך עם",
  newToCommunity: "חדש בקהילה?",
  createAccount: "יצירת חשבון",
  myProfile: "הפרופיל שלי",
  logoutButton: "התנתקות",
  tabExplore: "גלה",
  tabMyPets: "החיות שלי",
  tabCommunity: "קהילה",
  tabLogin: "התחברות",
  tabProfile: "פרופיל",
  exploreTitle: "גלה את הסביבה",
  exploreSubtitle: "המפה תהיה זמינה בקרוב",
  myPetsTitle: "החיות שלי",
  myPetsSubtitle:
    "התחבר כדי לנהל את בעלי החיים שלך ולעקוב אחר הבריאות שלהם",
  communityTitle: "הקהילה שלנו",
  communitySubtitle: "התחבר כדי להצטרף לקהילת בעלי החיים ולשתף חוויות",
  comingSoon: "בקרוב",
  myPetsComingSoon: "ניהול חיות מחמד בקרוב",
  communityComingSoon: "הקהילה תהיה זמינה בקרוב",
  errorTitle: "שגיאה",
  fillAllFields: "נא למלא את כל השדות",
  loginError: "שגיאה בהתחברות, נסה שנית",
  registerTitle: "יצירת חשבון",
  registerSubtitle: "הירשם כדי להתחיל",
  fullNameLabel: "שם מלא",
  fullNamePlaceholder: "השם שלך",
  phoneLabel: "טלפון",
  phonePlaceholder: "05XXXXXXXX",
  registerButton: "יצירת חשבון",
  termsAgree: "אני מסכים/ה ל",
  termsOfService: "תנאי השימוש",
  acceptTermsError: "יש לאשר את תנאי השימוש",
  alreadyHaveAccount: "כבר יש לך חשבון?",
  signIn: "התחברות",
  forgotTitle: "שכחת סיסמה?",
  forgotSubtitle: "הזן את האימייל שלך ונשלח לך קישור לאיפוס הסיסמה.",
  forgotEmailLabel: "אימייל",
  forgotEmailPlaceholder: "you@example.com",
  sendResetLink: "שלח קישור לאיפוס",
  backToLogin: "חזרה להתחברות",
  registerError: "שגיאה בהרשמה, נסה שנית",
  resetSentTitle: "נשלח!",
  resetSentMessage: "אם האימייל קיים במערכת, נשלח קישור לאיפוס הסיסמה.",
  forgotError: "שגיאה בשליחת הקישור, נסה שנית",
} as const;

const en: Record<keyof typeof he, string> = {
  welcomeTitle: "Welcome Back",
  welcomeSubtitle:
    "Access your sanctuary and personalized pet care dashboard.",
  emailLabel: "Email Address",
  emailPlaceholder: "name@premium.com",
  passwordLabel: "Password",
  passwordPlaceholder: "••••••••",
  loginButton: "Log in",
  forgotPassword: "Forgot Password?",
  socialDivider: "Or continue with",
  newToCommunity: "New to the community?",
  createAccount: "Create Account",
  myProfile: "My Profile",
  logoutButton: "Log out",
  tabExplore: "Explore",
  tabMyPets: "My Pets",
  tabCommunity: "Community",
  tabLogin: "Log in",
  tabProfile: "Profile",
  exploreTitle: "Explore Nearby",
  exploreSubtitle: "Map coming soon",
  myPetsTitle: "My Pets",
  myPetsSubtitle: "Log in to manage your pets and track their health",
  communityTitle: "Our Community",
  communitySubtitle:
    "Log in to join the pet community and share experiences",
  comingSoon: "Coming Soon",
  myPetsComingSoon: "Pet management coming soon",
  communityComingSoon: "Community coming soon",
  errorTitle: "Error",
  fillAllFields: "Please fill in all fields",
  loginError: "Login failed, please try again",
  registerTitle: "Create Account",
  registerSubtitle: "Sign up to get started",
  fullNameLabel: "Full Name",
  fullNamePlaceholder: "Your name",
  phoneLabel: "Phone",
  phonePlaceholder: "Phone number",
  registerButton: "Create Account",
  termsAgree: "I agree to the",
  termsOfService: "Terms of Service",
  acceptTermsError: "You must accept the Terms of Service",
  alreadyHaveAccount: "Already have an account?",
  signIn: "Sign In",
  forgotTitle: "Forgot Password?",
  forgotSubtitle:
    "Enter your email and we'll send you a link to reset your password.",
  forgotEmailLabel: "Email",
  forgotEmailPlaceholder: "you@example.com",
  sendResetLink: "Send Reset Link",
  backToLogin: "Back to Login",
  registerError: "Registration failed, please try again",
  resetSentTitle: "Sent!",
  resetSentMessage:
    "If the email exists in our system, a reset link has been sent.",
  forgotError: "Failed to send reset link, please try again",
};

const translations = { he, en };

export type TranslationKey = keyof typeof he;

export function useTranslation() {
  const language = useAuthStore((s) => s.language);
  const isHebrew = language === "he";

  return {
    t: (key: TranslationKey): string => translations[language][key],
    language,
    isHebrew,
    isRTL: isHebrew,
    /** Apply to Text with explicit start-aligned text (labels, headings). */
    rtlText: {
      textAlign: (isHebrew ? "right" : "left") as "right" | "left",
      writingDirection: (isHebrew ? "rtl" : "ltr") as "rtl" | "ltr",
    },
    /** Apply to Text that uses `text-center` — sets writingDirection only. */
    rtlStyle: {
      writingDirection: (isHebrew ? "rtl" : "ltr") as "rtl" | "ltr",
    },
    /** Apply to flex-row containers (input rows) so icons flip sides. */
    rtlRow: {
      flexDirection: (isHebrew ? "row-reverse" : "row") as
        | "row"
        | "row-reverse",
    },
    /** Apply to TextInput for correct cursor/text alignment. */
    rtlInput: {
      textAlign: (isHebrew ? "right" : "left") as "right" | "left",
      writingDirection: (isHebrew ? "rtl" : "ltr") as "rtl" | "ltr",
    },
    /** Tailwind class for label alignment. */
    alignCls: isHebrew ? "text-right" : "text-left",
  };
}
