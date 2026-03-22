namespace PetOwner.Data.Models;

public class User
{
    public Guid Id { get; set; }
    public string Phone { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string Name { get; set; } = null!;
    public string Role { get; set; } = null!;
    public string PasswordHash { get; set; } = string.Empty;
    public string PreferredLanguage { get; set; } = "he-IL";
    public DateTime CreatedAt { get; set; }
    public string? ResetPasswordToken { get; set; }
    public DateTime? ResetPasswordTokenExpiry { get; set; }
    public bool IsActive { get; set; } = true;

    public ProviderProfile? ProviderProfile { get; set; }
    public Location? Location { get; set; }
    public ICollection<Pet> Pets { get; set; } = [];
    public ICollection<ServiceRequest> ServiceRequestsAsOwner { get; set; } = [];
    public ICollection<ServiceRequest> ServiceRequestsAsProvider { get; set; } = [];
    public ICollection<Review> ReviewsGiven { get; set; } = [];
    public ICollection<Review> ReviewsReceived { get; set; } = [];
    public ICollection<Post> Posts { get; set; } = [];
    public ICollection<Notification> Notifications { get; set; } = [];
    public ICollection<Booking> Bookings { get; set; } = [];
    public ICollection<GroupPost> GroupPosts { get; set; } = [];
}
