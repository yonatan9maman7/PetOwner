using PetOwner.Data.Models;

namespace PetOwner.Api.Helpers;

public static class PetAgeHelper
{
    public static int CalculateAge(DateTime? birthDate, int fallbackAge = 0)
    {
        if (!birthDate.HasValue)
            return fallbackAge;

        return (int)((DateTime.UtcNow - birthDate.Value).TotalDays / 365.2425);
    }

    public static int CalculateAge(Pet pet) => CalculateAge(pet.BirthDate, pet.Age);

    public static DateTime? ResolveBirthDate(DateTime? requestBirthDate, int requestAge)
    {
        if (requestBirthDate.HasValue)
            return requestBirthDate.Value.Date;

        if (requestAge > 0)
            return DateTime.UtcNow.Date.AddYears(-requestAge);

        return null;
    }

    public static void ApplyBirthDate(Pet pet, DateTime? requestBirthDate, int requestAge)
    {
        pet.BirthDate = ResolveBirthDate(requestBirthDate, requestAge);
        pet.Age = CalculateAge(pet.BirthDate, requestAge);
    }
}
