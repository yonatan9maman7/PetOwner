using NetTopologySuite.Geometries;

namespace PetOwner.Data.Models;

public class PlaydateEvent
{
    public Guid Id { get; set; }
    public Guid HostUserId { get; set; }
    public string Title { get; set; } = null!;
    public string? Description { get; set; }
    public string LocationName { get; set; } = null!;
    public Point GeoLocation { get; set; } = null!;
    public string? City { get; set; }
    public DateTime ScheduledFor { get; set; }
    public DateTime? EndsAt { get; set; }
    public string AllowedSpeciesCsv { get; set; } = "DOG";
    public int? MaxPets { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? CancelledAt { get; set; }
    public string? CancellationReason { get; set; }

    public string? MeetupType { get; set; }
    public int? DurationMinutes { get; set; }
    public string? DogSizeCsv { get; set; }
    public string? AgeFilterCsv { get; set; }
    public string? EnergyLevel { get; set; }
    public bool VaccinatedOnly { get; set; }
    /// <summary>Public or GroupOnly</summary>
    public string MeetupVisibility { get; set; } = "Public";
    public Guid? LinkedCommunityGroupId { get; set; }
    public CommunityGroup? LinkedCommunityGroup { get; set; }

    public User Host { get; set; } = null!;
    public ICollection<PlaydateRsvp> Rsvps { get; set; } = new List<PlaydateRsvp>();
    public ICollection<PlaydateEventComment> Comments { get; set; } = new List<PlaydateEventComment>();
}
