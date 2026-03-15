using Microsoft.EntityFrameworkCore;
using PetOwner.Data.Models;

namespace PetOwner.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<ProviderProfile> ProviderProfiles => Set<ProviderProfile>();
    public DbSet<Location> Locations => Set<Location>();
    public DbSet<Service> Services => Set<Service>();
    public DbSet<ProviderService> ProviderServices => Set<ProviderService>();
    public DbSet<Pet> Pets => Set<Pet>();
    public DbSet<ServiceRequest> ServiceRequests => Set<ServiceRequest>();
    public DbSet<Review> Reviews => Set<Review>();
    public DbSet<AvailabilitySlot> AvailabilitySlots => Set<AvailabilitySlot>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<MedicalRecord> MedicalRecords => Set<MedicalRecord>();
    public DbSet<TeletriageSession> TeletriageSessions => Set<TeletriageSession>();
    public DbSet<Activity> Activities => Set<Activity>();
    public DbSet<Post> Posts => Set<Post>();
    public DbSet<PostLike> PostLikes => Set<PostLike>();
    public DbSet<PostComment> PostComments => Set<PostComment>();
    public DbSet<Conversation> Conversations => Set<Conversation>();
    public DbSet<Message> Messages => Set<Message>();
    public DbSet<Notification> Notifications => Set<Notification>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        ConfigureUser(modelBuilder);
        ConfigureProviderProfile(modelBuilder);
        ConfigureLocation(modelBuilder);
        ConfigureService(modelBuilder);
        ConfigureProviderService(modelBuilder);
        ConfigurePet(modelBuilder);
        ConfigureServiceRequest(modelBuilder);
        ConfigureReview(modelBuilder);
        ConfigureAvailabilitySlot(modelBuilder);
        ConfigurePayment(modelBuilder);
        ConfigureMedicalRecord(modelBuilder);
        ConfigureTeletriageSession(modelBuilder);
        ConfigureActivity(modelBuilder);
        ConfigurePost(modelBuilder);
        ConfigureConversation(modelBuilder);
        ConfigureNotification(modelBuilder);
    }

    private static void ConfigureUser(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(u => u.Id);

            entity.Property(u => u.Id)
                .HasDefaultValueSql("NEWSEQUENTIALID()");

            entity.Property(u => u.Phone)
                .IsRequired()
                .HasMaxLength(15);

            entity.HasIndex(u => u.Phone)
                .IsUnique();

            entity.Property(u => u.Email)
                .IsRequired()
                .HasMaxLength(200);

            entity.HasIndex(u => u.Email)
                .IsUnique();

            entity.Property(u => u.Name)
                .IsRequired()
                .HasMaxLength(100);

            entity.Property(u => u.Role)
                .IsRequired()
                .HasMaxLength(20);

            entity.Property(u => u.PreferredLanguage)
                .HasMaxLength(10)
                .HasDefaultValue("he-IL");

            entity.Property(u => u.CreatedAt)
                .HasDefaultValueSql("GETUTCDATE()");

            entity.Property(u => u.ResetPasswordToken)
                .HasMaxLength(200);

            entity.Property(u => u.ResetPasswordTokenExpiry);
        });
    }

    private static void ConfigureProviderProfile(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ProviderProfile>(entity =>
        {
            entity.HasKey(p => p.UserId);

            entity.Property(p => p.HourlyRate)
                .HasColumnType("decimal(18,2)")
                .IsRequired();

            entity.Property(p => p.Status)
                .HasMaxLength(20)
                .HasDefaultValue("Pending");

            entity.Property(p => p.IsAvailableNow)
                .HasDefaultValue(false);

            entity.Property(p => p.AverageRating)
                .HasColumnType("decimal(3,2)");

            entity.Property(p => p.ReviewCount)
                .HasDefaultValue(0);

            entity.Property(p => p.StripeConnectAccountId)
                .HasMaxLength(100);

            entity.Property(p => p.AcceptsOffHoursRequests)
                .HasDefaultValue(true);

            entity.HasOne(p => p.User)
                .WithOne(u => u.ProviderProfile)
                .HasForeignKey<ProviderProfile>(p => p.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }

    private static void ConfigureLocation(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Location>(entity =>
        {
            entity.HasKey(l => l.UserId);

            entity.Property(l => l.GeoLocation)
                .HasColumnType("geography");

            entity.Property(l => l.Address)
                .HasMaxLength(200);

            entity.HasOne(l => l.User)
                .WithOne(u => u.Location)
                .HasForeignKey<Location>(l => l.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }

    private static void ConfigureService(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Service>(entity =>
        {
            entity.HasKey(s => s.Id);

            entity.Property(s => s.Id)
                .UseIdentityColumn();

            entity.Property(s => s.Name)
                .IsRequired()
                .HasMaxLength(100);

            entity.Property(s => s.Category)
                .IsRequired()
                .HasMaxLength(100);
        });
    }

    private static void ConfigureProviderService(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ProviderService>(entity =>
        {
            entity.HasKey(ps => new { ps.ProviderId, ps.ServiceId });

            entity.HasOne(ps => ps.ProviderProfile)
                .WithMany(p => p.ProviderServices)
                .HasForeignKey(ps => ps.ProviderId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(ps => ps.Service)
                .WithMany(s => s.ProviderServices)
                .HasForeignKey(ps => ps.ServiceId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }

    private static void ConfigurePet(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Pet>(entity =>
        {
            entity.HasKey(p => p.Id);

            entity.Property(p => p.Id)
                .HasDefaultValueSql("NEWSEQUENTIALID()");

            entity.Property(p => p.Name)
                .IsRequired()
                .HasMaxLength(100);

            entity.Property(p => p.Species)
                .IsRequired()
                .HasMaxLength(50);

            entity.Property(p => p.Notes)
                .HasMaxLength(500);

            entity.HasOne(p => p.User)
                .WithMany(u => u.Pets)
                .HasForeignKey(p => p.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }

    private static void ConfigureServiceRequest(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ServiceRequest>(entity =>
        {
            entity.HasKey(sr => sr.Id);

            entity.Property(sr => sr.Id)
                .HasDefaultValueSql("NEWSEQUENTIALID()");

            entity.Property(sr => sr.Status)
                .IsRequired()
                .HasMaxLength(20)
                .HasDefaultValue("Pending");

            entity.Property(sr => sr.CreatedAt)
                .HasDefaultValueSql("GETUTCDATE()");

            entity.HasOne(sr => sr.PetOwner)
                .WithMany(u => u.ServiceRequestsAsOwner)
                .HasForeignKey(sr => sr.PetOwnerId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(sr => sr.Provider)
                .WithMany(u => u.ServiceRequestsAsProvider)
                .HasForeignKey(sr => sr.ProviderId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(sr => sr.Pet)
                .WithMany()
                .HasForeignKey(sr => sr.PetId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(sr => sr.Service)
                .WithMany(s => s.ServiceRequests)
                .HasForeignKey(sr => sr.ServiceId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.Property(sr => sr.TotalPrice)
                .HasColumnType("decimal(18,2)");

            entity.Property(sr => sr.Notes)
                .HasMaxLength(500);

            entity.Property(sr => sr.CancellationReason)
                .HasMaxLength(500);

            entity.Property(sr => sr.ShareMedicalRecords)
                .HasDefaultValue(false);
        });
    }

    private static void ConfigureReview(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Review>(entity =>
        {
            entity.HasKey(r => r.Id);

            entity.Property(r => r.Id)
                .HasDefaultValueSql("NEWSEQUENTIALID()");

            entity.HasIndex(r => r.ServiceRequestId)
                .IsUnique();

            entity.Property(r => r.Rating)
                .IsRequired();

            entity.Property(r => r.Comment)
                .HasMaxLength(1000);

            entity.Property(r => r.IsVerified)
                .HasDefaultValue(false);

            entity.Property(r => r.PhotoUrl)
                .HasMaxLength(500);

            entity.Property(r => r.CreatedAt)
                .HasDefaultValueSql("GETUTCDATE()");

            entity.HasOne(r => r.ServiceRequest)
                .WithOne(sr => sr.Review)
                .HasForeignKey<Review>(r => r.ServiceRequestId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(r => r.Reviewer)
                .WithMany(u => u.ReviewsGiven)
                .HasForeignKey(r => r.ReviewerId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(r => r.Reviewee)
                .WithMany(u => u.ReviewsReceived)
                .HasForeignKey(r => r.RevieweeId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }

    private static void ConfigureAvailabilitySlot(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<AvailabilitySlot>(entity =>
        {
            entity.HasKey(a => a.Id);

            entity.Property(a => a.Id)
                .HasDefaultValueSql("NEWSEQUENTIALID()");

            entity.Property(a => a.DayOfWeek)
                .IsRequired();

            entity.Property(a => a.StartTime)
                .IsRequired()
                .HasColumnType("time");

            entity.Property(a => a.EndTime)
                .IsRequired()
                .HasColumnType("time");

            entity.HasIndex(a => new { a.ProviderId, a.DayOfWeek });

            entity.HasOne(a => a.Provider)
                .WithMany(p => p.AvailabilitySlots)
                .HasForeignKey(a => a.ProviderId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }

    private static void ConfigurePayment(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Payment>(entity =>
        {
            entity.HasKey(p => p.Id);

            entity.Property(p => p.Id)
                .HasDefaultValueSql("NEWSEQUENTIALID()");

            entity.Property(p => p.StripePaymentIntentId)
                .HasMaxLength(200)
                .IsRequired();

            entity.HasIndex(p => p.StripePaymentIntentId)
                .IsUnique();

            entity.Property(p => p.Amount)
                .HasColumnType("decimal(18,2)")
                .IsRequired();

            entity.Property(p => p.PlatformFee)
                .HasColumnType("decimal(18,2)")
                .IsRequired();

            entity.Property(p => p.Currency)
                .HasMaxLength(3)
                .HasDefaultValue("ILS");

            entity.Property(p => p.Status)
                .HasMaxLength(30)
                .HasDefaultValue("Created");

            entity.Property(p => p.CreatedAt)
                .HasDefaultValueSql("GETUTCDATE()");

            entity.Property(p => p.RefundAmount)
                .HasColumnType("decimal(18,2)");

            entity.HasIndex(p => p.ServiceRequestId)
                .IsUnique();

            entity.HasOne(p => p.ServiceRequest)
                .WithOne(sr => sr.Payment)
                .HasForeignKey<Payment>(p => p.ServiceRequestId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }

    private static void ConfigureMedicalRecord(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<MedicalRecord>(entity =>
        {
            entity.HasKey(m => m.Id);

            entity.Property(m => m.Id)
                .HasDefaultValueSql("NEWSEQUENTIALID()");

            entity.Property(m => m.Type)
                .IsRequired()
                .HasMaxLength(30);

            entity.Property(m => m.Title)
                .IsRequired()
                .HasMaxLength(200);

            entity.Property(m => m.Description)
                .HasMaxLength(2000);

            entity.Property(m => m.Date)
                .IsRequired();

            entity.Property(m => m.DocumentUrl)
                .HasMaxLength(500);

            entity.Property(m => m.CreatedAt)
                .HasDefaultValueSql("GETUTCDATE()");

            entity.HasOne(m => m.Pet)
                .WithMany(p => p.MedicalRecords)
                .HasForeignKey(m => m.PetId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }

    private static void ConfigureTeletriageSession(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<TeletriageSession>(entity =>
        {
            entity.HasKey(t => t.Id);

            entity.Property(t => t.Id)
                .HasDefaultValueSql("NEWSEQUENTIALID()");

            entity.Property(t => t.Symptoms)
                .IsRequired()
                .HasMaxLength(2000);

            entity.Property(t => t.PetContext)
                .HasMaxLength(1000);

            entity.Property(t => t.Severity)
                .IsRequired()
                .HasMaxLength(20);

            entity.Property(t => t.Assessment)
                .IsRequired()
                .HasMaxLength(4000);

            entity.Property(t => t.Recommendations)
                .HasMaxLength(4000);

            entity.Property(t => t.CreatedAt)
                .HasDefaultValueSql("GETUTCDATE()");

            entity.HasOne(t => t.Pet)
                .WithMany(p => p.TeletriageSessions)
                .HasForeignKey(t => t.PetId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(t => t.User)
                .WithMany()
                .HasForeignKey(t => t.UserId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }

    private static void ConfigureActivity(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Activity>(entity =>
        {
            entity.HasKey(a => a.Id);

            entity.Property(a => a.Id)
                .HasDefaultValueSql("NEWSEQUENTIALID()");

            entity.Property(a => a.Type)
                .IsRequired()
                .HasMaxLength(30);

            entity.Property(a => a.Value)
                .HasColumnType("decimal(10,2)");

            entity.Property(a => a.Notes)
                .HasMaxLength(500);

            entity.Property(a => a.Date)
                .IsRequired();

            entity.Property(a => a.CreatedAt)
                .HasDefaultValueSql("GETUTCDATE()");

            entity.HasIndex(a => new { a.PetId, a.Date });

            entity.HasOne(a => a.Pet)
                .WithMany(p => p.Activities)
                .HasForeignKey(a => a.PetId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(a => a.User)
                .WithMany()
                .HasForeignKey(a => a.UserId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }

    private static void ConfigurePost(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Post>(entity =>
        {
            entity.HasKey(p => p.Id);
            entity.Property(p => p.Id).HasDefaultValueSql("NEWSEQUENTIALID()");
            entity.Property(p => p.Content).IsRequired().HasMaxLength(2000);
            entity.Property(p => p.ImageUrl).HasMaxLength(500);
            entity.Property(p => p.LikeCount).HasDefaultValue(0);
            entity.Property(p => p.CommentCount).HasDefaultValue(0);
            entity.Property(p => p.CreatedAt).HasDefaultValueSql("GETUTCDATE()");

            entity.HasOne(p => p.User)
                .WithMany(u => u.Posts)
                .HasForeignKey(p => p.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<PostLike>(entity =>
        {
            entity.HasKey(pl => new { pl.PostId, pl.UserId });
            entity.Property(pl => pl.CreatedAt).HasDefaultValueSql("GETUTCDATE()");

            entity.HasOne(pl => pl.Post)
                .WithMany(p => p.Likes)
                .HasForeignKey(pl => pl.PostId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(pl => pl.User)
                .WithMany()
                .HasForeignKey(pl => pl.UserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<PostComment>(entity =>
        {
            entity.HasKey(c => c.Id);
            entity.Property(c => c.Id).HasDefaultValueSql("NEWSEQUENTIALID()");
            entity.Property(c => c.Content).IsRequired().HasMaxLength(1000);
            entity.Property(c => c.CreatedAt).HasDefaultValueSql("GETUTCDATE()");

            entity.HasOne(c => c.Post)
                .WithMany(p => p.Comments)
                .HasForeignKey(c => c.PostId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(c => c.User)
                .WithMany()
                .HasForeignKey(c => c.UserId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }

    private static void ConfigureConversation(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Conversation>(entity =>
        {
            entity.HasKey(c => c.Id);
            entity.Property(c => c.Id).HasDefaultValueSql("NEWSEQUENTIALID()");
            entity.Property(c => c.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
            entity.Property(c => c.LastMessageAt).HasDefaultValueSql("GETUTCDATE()");

            entity.HasIndex(c => new { c.User1Id, c.User2Id }).IsUnique();

            entity.HasOne(c => c.User1)
                .WithMany()
                .HasForeignKey(c => c.User1Id)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(c => c.User2)
                .WithMany()
                .HasForeignKey(c => c.User2Id)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Message>(entity =>
        {
            entity.HasKey(m => m.Id);
            entity.Property(m => m.Id).HasDefaultValueSql("NEWSEQUENTIALID()");
            entity.Property(m => m.Content).IsRequired().HasMaxLength(2000);
            entity.Property(m => m.IsRead).HasDefaultValue(false);
            entity.Property(m => m.CreatedAt).HasDefaultValueSql("GETUTCDATE()");

            entity.HasIndex(m => new { m.ConversationId, m.CreatedAt });

            entity.HasOne(m => m.Conversation)
                .WithMany(c => c.Messages)
                .HasForeignKey(m => m.ConversationId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(m => m.Sender)
                .WithMany()
                .HasForeignKey(m => m.SenderId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }

    private static void ConfigureNotification(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Notification>(entity =>
        {
            entity.HasKey(n => n.Id);
            entity.Property(n => n.Id).HasDefaultValueSql("NEWSEQUENTIALID()");
            entity.Property(n => n.Type).IsRequired().HasMaxLength(50);
            entity.Property(n => n.Title).IsRequired().HasMaxLength(200);
            entity.Property(n => n.Body).IsRequired().HasMaxLength(1000);
            entity.Property(n => n.ReferenceId).HasMaxLength(200);
            entity.Property(n => n.IsRead).HasDefaultValue(false);
            entity.Property(n => n.CreatedAt).HasDefaultValueSql("GETUTCDATE()");

            entity.HasIndex(n => new { n.UserId, n.IsRead, n.CreatedAt });

            entity.HasOne(n => n.User)
                .WithMany(u => u.Notifications)
                .HasForeignKey(n => n.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
