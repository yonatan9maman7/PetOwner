export type AppLanguage = 'he' | 'en';

export function buildFoundPetPostContent(
  lang: AppLanguage,
  contactPhone: string,
  description?: string,
): string {
  const phone = contactPhone.trim();
  const desc = description?.trim() ? `\n📝 ${description.trim()}` : '';

  if (lang === 'he') {
    return `🐾 נמצאה חיה!\n\n📞 יצירת קשר: ${phone}${desc}\n\nמזהים את החיה? צרו קשר עם המוצא/ת.`;
  }

  return `🐾 Found Pet!\n\n📞 Contact: ${phone}${desc}\n\nIf you recognize this pet, please contact the finder.`;
}

export function buildLostPetPostContent(
  lang: AppLanguage,
  petName: string,
  lastSeenLocation: string,
  contactPhone: string,
  description?: string,
): string {
  const desc = description?.trim() ? `\n📝 ${description.trim()}` : '';
  const phone = contactPhone.trim();
  const location = lastSeenLocation.trim();

  if (lang === 'he') {
    return `🆘 SOS: ${petName} אבד/ה!\n\n📍 נראה לאחרונה: ${location}\n📞 יצירת קשר: ${phone}${desc}\n\nעזרו לנו למצוא את ${petName}! אם ראיתם את החיה, צרו קשר עם הבעלים מיד.`;
  }

  return `🆘 SOS: ${petName} is lost!\n\n📍 Last seen: ${location}\n📞 Contact: ${phone}${desc}\n\nPlease help us find ${petName}! If you see this pet, contact the owner immediately.`;
}

export function isFoundPetCategory(category: string | null | undefined): boolean {
  return (category ?? '').toLowerCase() === 'found_pet';
}
