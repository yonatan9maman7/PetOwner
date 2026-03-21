using PetOwner.Data.Models;

namespace PetOwner.Api.Infrastructure;

/// <summary>
/// Display names for <see cref="ServiceType"/> (filter dropdown, map pins, onboarding).
/// Kept in sync with per-service pricing and the <c>ProviderServiceRates</c> model.
/// </summary>
public static class ServiceTypeCatalog
{
    private static readonly Dictionary<ServiceType, string> DisplayNames = new()
    {
        [ServiceType.DogWalking] = "Dog Walker",
        [ServiceType.PetSitting] = "Pet Sitter",
        [ServiceType.Boarding] = "Boarding",
        [ServiceType.DropInVisit] = "Drop-in Visit",
    };

    public static string ToDisplayName(ServiceType serviceType) =>
        DisplayNames.TryGetValue(serviceType, out var name) ? name : serviceType.ToString();

    public static bool TryGetDisplayName(ServiceType serviceType, out string displayName) =>
        DisplayNames.TryGetValue(serviceType, out displayName!);

    /// <summary>Ordered labels for map filter UI (same strings as historical <c>Services</c> table).</summary>
    public static IReadOnlyList<string> AllDisplayNamesOrdered { get; } =
        DisplayNames.Values.OrderBy(v => v, StringComparer.OrdinalIgnoreCase).ToList();

    /// <summary>Parses filter values from the client (display name or enum name).</summary>
    public static ServiceType? TryParseDisplayName(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var trimmed = value.Trim();
        foreach (var kv in DisplayNames)
        {
            if (string.Equals(kv.Value, trimmed, StringComparison.OrdinalIgnoreCase))
                return kv.Key;
        }

        return Enum.TryParse<ServiceType>(trimmed, ignoreCase: true, out var parsed) ? parsed : null;
    }

    /// <summary>Service types whose display label contains <paramref name="term"/> (map search).</summary>
    public static List<ServiceType> ServiceTypesWithDisplayNameContaining(string term)
    {
        if (string.IsNullOrWhiteSpace(term)) return [];
        var t = term.Trim();
        return DisplayNames
            .Where(kv => kv.Value.Contains(t, StringComparison.OrdinalIgnoreCase))
            .Select(kv => kv.Key)
            .ToList();
    }
}
