namespace PetOwner.Api.Services;

/// <summary>Localized templates for auto-generated SOS / found-pet community posts.</summary>
public static class SosPostContentFormatter
{
    public static bool IsHebrew(string? preferredLanguage) =>
        preferredLanguage?.Trim().StartsWith("he", StringComparison.OrdinalIgnoreCase) == true;

    public static string BuildFoundPetContent(
        string contactPhone,
        string? description,
        string? preferredLanguage)
    {
        var phone = contactPhone.Trim();
        var desc = !string.IsNullOrWhiteSpace(description)
            ? $"\n📝 {description.Trim()}"
            : string.Empty;

        if (IsHebrew(preferredLanguage))
        {
            return $"🐾 נמצאה חיה!\n\n📞 יצירת קשר: {phone}{desc}\n\nמזהים את החיה? צרו קשר עם המוצא/ת.";
        }

        return $"🐾 Found Pet!\n\n📞 Contact: {phone}{desc}\n\nIf you recognize this pet, please contact the finder.";
    }

    public static string BuildLostPetContent(
        string petName,
        string lastSeenLocation,
        string contactPhone,
        string? description,
        string? preferredLanguage)
    {
        var desc = !string.IsNullOrWhiteSpace(description)
            ? $"\n📝 {description.Trim()}"
            : string.Empty;
        var phone = contactPhone.Trim();
        var location = lastSeenLocation.Trim();

        if (IsHebrew(preferredLanguage))
        {
            return
                $"🆘 SOS: {petName} אבד/ה!\n\n📍 נראה לאחרונה: {location}\n📞 יצירת קשר: {phone}{desc}\n\nעזרו לנו למצוא את {petName}! אם ראיתם את החיה, צרו קשר עם הבעלים מיד.";
        }

        return
            $"🆘 SOS: {petName} is lost!\n\n📍 Last seen: {location}\n📞 Contact: {phone}{desc}\n\nPlease help us find {petName}! If you see this pet, contact the owner immediately.";
    }
}
