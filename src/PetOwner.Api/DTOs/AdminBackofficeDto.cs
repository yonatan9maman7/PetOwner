namespace PetOwner.Api.DTOs;

public class AdminStatsDto
{
    public int TotalUsers { get; set; }
    public int TotalPets { get; set; }
    public int TotalProviders { get; set; }
    public int TotalBookings { get; set; }
    public int ActiveSOSReports { get; set; }
    public int PendingProviders { get; set; }
    public decimal TotalPlatformRevenue { get; set; }
}

public class AdminUserDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string Phone { get; set; } = null!;
    public string Role { get; set; } = null!;
    public DateTime CreatedAt { get; set; }
    public bool IsActive { get; set; }
    public string? ProviderStatus { get; set; }
    public string? ProviderType { get; set; }
    public string? WhatsAppNumber { get; set; }
    public string? WebsiteUrl { get; set; }
}

public class AdminBookingDto
{
    public Guid Id { get; set; }
    public string OwnerName { get; set; } = null!;
    public string ProviderName { get; set; } = null!;
    public string Service { get; set; } = null!;
    public string Status { get; set; } = null!;
    public decimal TotalPrice { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class AdminPetDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = null!;
    public string? Breed { get; set; }
    public string Species { get; set; } = null!;
    public int Age { get; set; }
    public string? ImageUrl { get; set; }
    public string OwnerName { get; set; } = null!;
    public string OwnerEmail { get; set; } = null!;
    public Guid OwnerId { get; set; }
}

public class UpdateRoleRequest
{
    public string Role { get; set; } = null!;
}

public class SuspendProviderRequest
{
    public string? Reason { get; set; }
}
