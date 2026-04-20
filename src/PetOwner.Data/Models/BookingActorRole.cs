namespace PetOwner.Data.Models;

/// <summary>
/// Identifies which side of a booking transaction performed an action
/// (e.g., who cancelled a booking).
/// </summary>
public enum BookingActorRole
{
    Owner,
    Provider,
    System,
}
