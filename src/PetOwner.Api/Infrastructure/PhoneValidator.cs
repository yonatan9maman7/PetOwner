using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using PetOwner.Data;

namespace PetOwner.Api.Infrastructure;

public static partial class PhoneValidator
{
    [GeneratedRegex(@"^0(5[0-9])\d{7}$")]
    private static partial Regex IsraeliMobileRegex();

    public static bool IsValidFormat(string phone) =>
        IsraeliMobileRegex().IsMatch(phone);

    public static async Task<bool> IsTakenAsync(ApplicationDbContext db, string phone, Guid? excludeUserId = null)
    {
        return await db.Users.AnyAsync(u =>
            u.Phone == phone && (excludeUserId == null || u.Id != excludeUserId));
    }
}
