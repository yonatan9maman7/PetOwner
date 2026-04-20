namespace PetOwner.Data.Models;

public class PlaydateEvent
{
    public Guid Id { get; set; }
    public Guid HostUserId { get; set; }
    public string Title { get; set; } = null!;
    public string? Description { get; set; }
    public string LocationName { get; set; } = null!;
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public string? City { get; set; }
    public DateTime ScheduledFor { get; set; }
    public DateTime? EndsAt { get; set; }
    public string AllowedSpeciesCsv { get; set; } = "DOG";
    public int? MaxPets { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? CancelledAt { get; set; }
    public string? CancellationReason { get; set; }

    public User Host { get; set; } = null!;
    public ICollection<PlaydateRsvp> Rsvps { get; set; } = new List<PlaydateRsvp>();
    public ICollection<PlaydateEventComment> Comments { get; set; } = new List<PlaydateEventComment>();
}
