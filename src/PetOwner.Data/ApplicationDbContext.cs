using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
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
    public DbSet<PostCommentLike> PostCommentLikes => Set<PostCommentLike>();
    public DbSet<Conversation> Conversations => Set<Conversation>();
    public DbSet<Message> Messages => Set<Message>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<ProviderServiceRate> ProviderServiceRates => Set<ProviderServiceRate>();
    public DbSet<Booking> Bookings => Set<Booking>();
    public DbSet<CommunityGroup> CommunityGroups => Set<CommunityGroup>();
    public DbSet<GroupPost> GroupPosts => Set<GroupPost>();
    public DbSet<GroupPostLike> GroupPostLikes => Set<GroupPostLike>();
    public DbSet<GroupPostComment> GroupPostComments => Set<GroupPostComment>();
    public DbSet<FavoriteProvider> FavoriteProviders => Set<FavoriteProvider>();
    public DbSet<Vaccination> Vaccinations => Set<Vaccination>();
    public DbSet<WeightLog> WeightLogs => Set<WeightLog>();
    public DbSet<ServicePackage> ServicePackages => Set<ServicePackage>();
    public DbSet<PetHealthShare> PetHealthShares => Set<PetHealthShare>();
    public DbSet<ContactInquiry> ContactInquiries => Set<ContactInquiry>();
    public DbSet<UserPushToken> UserPushTokens => Set<UserPushToken>();
    public DbSet<UserNotificationPrefs> UserNotificationPrefs => Set<UserNotificationPrefs>();
    public DbSet<AchievementUnlocked> AchievementsUnlocked => Set<AchievementUnlocked>();
    public DbSet<PlaydatePrefs> PlaydatePrefs => Set<PlaydatePrefs>();
    public DbSet<PlaydateEvent> PlaydateEvents => Set<PlaydateEvent>();
    public DbSet<PlaydateRsvp> PlaydateRsvps => Set<PlaydateRsvp>();
    public DbSet<PlaydateEventComment> PlaydateEventComments => Set<PlaydateEventComment>();
    public DbSet<PlaydateBeacon> PlaydateBeacons => Set<PlaydateBeacon>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        ConfigureUser(modelBuilder, Database.IsSqlServer());
        ConfigureProviderProfile(modelBuilder);
        ConfigureLocation(modelBuilder);
        ConfigureService(modelBuilder);
        ConfigureProviderService(modelBuilder);
        ConfigureProviderServiceRate(modelBuilder);
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
        ConfigureBooking(modelBuilder);
        ConfigureCommunityGroup(modelBuilder);
        ConfigureGroupPost(modelBuilder);
        ConfigureFavoriteProvider(modelBuilder);
        ConfigureVaccination(modelBuilder);
        ConfigureWeightLog(modelBuilder);
        ConfigureServicePackage(modelBuilder);
        ConfigurePetHealthShare(modelBuilder);
        ConfigureContactInquiry(modelBuilder);
        ConfigureUserPushToken(modelBuilder);
        ConfigureUserNotificationPrefs(modelBuilder);
        ConfigureAchievementUnlocked(modelBuilder);
        ConfigurePlaydatePrefs(modelBuilder);
        ConfigurePlaydateEvent(modelBuilder);
        ConfigurePlaydateBeacon(modelBuilder);
    }

    private static void ConfigureUser(ModelBuilder modelBuilder, bool isSqlServer)
    {
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(u => u.Id);

            entity.Property(u => u.Id)
                .HasDefaultValueSql("NEWSEQUENTIALID()");

            entity.Property(u => u.Phone)
                .HasMaxLength(15);

            entity.Property(u => u.GoogleId)
                .HasMaxLength(200);

            entity.Property(u => u.AppleId)
                .HasMaxLength(200);

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

            entity.Property(u => u.IsActive)
                .HasDefaultValue(true);

            if (isSqlServer)
            {
                entity.HasIndex(u => u.Phone).IsUnique().HasFilter("[Phone] IS NOT NULL");
                entity.HasIndex(u => u.GoogleId).IsUnique().HasFilter("[GoogleId] IS NOT NULL");
                entity.HasIndex(u => u.AppleId).IsUnique().HasFilter("[AppleId] IS NOT NULL");
            }
            else
            {
                entity.HasIndex(u => u.Phone);
            }
        });
    }

    private static void ConfigureProviderProfile(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ProviderProfile>(entity =>
        {
            entity.HasKey(p => p.UserId);

            entity.Ignore(p => p.IsApproved);

            entity.Property(p => p.Type)
                .IsRequired()
                .HasConversion<string>()
                .HasMaxLength(20)
                .HasDefaultValue(ProviderType.Individual);

            entity.Property(p => p.BusinessName)
                .HasMaxLength(200);

            entity.Property(p => p.ServiceType)
                .HasConversion<string>()
                .HasMaxLength(50);

            entity.Property(p => p.PhoneNumber)
                .HasMaxLength(20);

            entity.Property(p => p.WhatsAppNumber)
                .HasMaxLength(20);

            entity.Property(p => p.WebsiteUrl)
                .HasMaxLength(500);

            entity.Property(p => p.OpeningHours)
                .HasMaxLength(2000);

            entity.Property(p => p.IsEmergencyService)
                .HasDefaultValue(false);

            entity.Property(p => p.Description)
                .HasMaxLength(2000);

            entity.Property(p => p.Status)
                .IsRequired()
                .HasConversion<string>()
                .HasMaxLength(20)
                .HasDefaultValue(ProviderStatus.Pending);

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

            entity.Property(p => p.ReferenceName)
                .HasMaxLength(200);

            entity.Property(p => p.ReferenceContact)
                .HasMaxLength(200);

            entity.Property(p => p.City)
                .IsRequired()
                .HasMaxLength(100);

            entity.Property(p => p.Street)
                .IsRequired()
                .HasMaxLength(200);

            entity.Property(p => p.BuildingNumber)
                .IsRequired()
                .HasMaxLength(50);

            entity.Property(p => p.ApartmentNumber)
                .HasMaxLength(50);

            entity.Property(p => p.AcceptedDogSizes)
                .HasConversion(
                    (List<DogSize> v) => string.Join(',', v.Select(x => x.ToString())),
                    v => ParseDogSizesFromColumn(v))
                .HasMaxLength(500)
                .Metadata.SetValueComparer(new ValueComparer<List<DogSize>>(
                    (a, b) => ReferenceEquals(a, b) || (a != null && b != null && a.SequenceEqual(b)),
                    v => v.Aggregate(0, (h, e) => HashCode.Combine(h, e.GetHashCode())),
                    v => v.ToList()));

            entity.Property(p => p.MaxDogsCapacity);

            entity.Property(p => p.ProfileViewCount).HasDefaultValue(0);
            entity.Property(p => p.SearchAppearanceCount).HasDefaultValue(0);

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

    private static void ConfigureProviderServiceRate(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ProviderServiceRate>(entity =>
        {
            entity.HasKey(r => r.Id);

            entity.Property(r => r.Id)
                .HasDefaultValueSql("NEWSEQUENTIALID()");

            entity.Property(r => r.Service)
                .IsRequired()
                .HasConversion<string>()
                .HasMaxLength(50);

            entity.Property(r => r.Rate)
                .HasColumnType("decimal(18,2)")
                .IsRequired();

            entity.Property(r => r.Unit)
                .IsRequired()
                .HasConversion<string>()
                .HasMaxLength(20);

            entity.HasIndex(r => new { r.ProviderProfileId, r.Service })
                .IsUnique();

            entity.HasOne(r => r.ProviderProfile)
                .WithMany(p => p.ServiceRates)
                .HasForeignKey(r => r.ProviderProfileId)
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
                .HasConversion<int>();

            entity.Property(p => p.IsNeutered)
                .HasDefaultValue(false);

            entity.Property(p => p.Notes)
                .HasMaxLength(500);

            entity.Property(p => p.MedicalNotes)
                .HasMaxLength(2000);

            entity.Property(p => p.FeedingSchedule)
                .HasMaxLength(1000);

            entity.Property(p => p.MicrochipNumber)
                .HasMaxLength(50);

            entity.Property(p => p.VetName)
                .HasMaxLength(200);

            entity.Property(p => p.VetPhone)
                .HasMaxLength(30);

            entity.Property(p => p.IsLost)
                .HasDefaultValue(false);

            entity.Property(p => p.LastSeenLocation)
                .HasMaxLength(500);

            entity.Property(p => p.ContactPhone)
                .HasMaxLength(30);

            entity.Property(p => p.CommunityPostId);

            entity.Property(p => p.DogSize)
                .HasConversion<string>()
                .HasMaxLength(10);

            entity.Property(p => p.TagsCsv)
                .HasMaxLength(500)
                .HasDefaultValue("");

            entity.Property(p => p.Sterilization)
                .HasConversion<int>()
                .HasDefaultValue(SterilizationStatus.Unknown);

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
                .IsUnique()
                .HasFilter("[ServiceRequestId] IS NOT NULL");

            entity.HasIndex(r => r.BookingId)
                .IsUnique()
                .HasFilter("[BookingId] IS NOT NULL");

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

            entity.HasOne(r => r.Booking)
                .WithOne(b => b.Review)
                .HasForeignKey<Review>(r => r.BookingId)
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

            // NO ACTION: SQL Server rejects multiple cascade paths (Pet→MedicalRecords + Pet→Vaccinations
            // + MedicalRecords→Vaccinations). SET NULL still participates in cascade graph.
            entity.HasOne(m => m.Vaccination)
                .WithOne(v => v.LinkedRecord)
                .HasForeignKey<MedicalRecord>(m => m.VaccinationId)
                .OnDelete(DeleteBehavior.NoAction);

            entity.HasOne(m => m.WeightLog)
                .WithOne(w => w.LinkedRecord)
                .HasForeignKey<MedicalRecord>(m => m.WeightLogId)
                .OnDelete(DeleteBehavior.NoAction);

            entity.HasIndex(m => m.VaccinationId)
                .IsUnique()
                .HasFilter("[VaccinationId] IS NOT NULL");

            entity.HasIndex(m => m.WeightLogId)
                .IsUnique()
                .HasFilter("[WeightLogId] IS NOT NULL");
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

            entity.Property(p => p.City).HasMaxLength(100);
            entity.Property(p => p.Category).HasMaxLength(50);

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
            entity.Property(c => c.LikeCount).HasDefaultValue(0);
            entity.Property(c => c.CreatedAt).HasDefaultValueSql("GETUTCDATE()");

            entity.HasOne(c => c.Post)
                .WithMany(p => p.Comments)
                .HasForeignKey(c => c.PostId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(c => c.User)
                .WithMany()
                .HasForeignKey(c => c.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(c => c.ParentComment)
                .WithMany(c => c.Replies)
                .HasForeignKey(c => c.ParentCommentId)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<PostCommentLike>(entity =>
        {
            entity.HasKey(cl => new { cl.CommentId, cl.UserId });
            entity.Property(cl => cl.CreatedAt).HasDefaultValueSql("GETUTCDATE()");

            entity.HasOne(cl => cl.Comment)
                .WithMany(c => c.Likes)
                .HasForeignKey(cl => cl.CommentId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(cl => cl.User)
                .WithMany()
                .HasForeignKey(cl => cl.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(cl => cl.CommentId);
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
            entity.Property(n => n.Message).IsRequired().HasMaxLength(1000);
            entity.Property(n => n.IsRead).HasDefaultValue(false);
            entity.Property(n => n.CreatedAt)
                .HasDefaultValueSql("GETUTCDATE()")
                .HasConversion(
                    v => v.Kind == DateTimeKind.Utc ? v : v.ToUniversalTime(),
                    v => DateTime.SpecifyKind(v, DateTimeKind.Utc));

            entity.HasIndex(n => new { n.UserId, n.IsRead, n.CreatedAt });

            entity.HasOne(n => n.User)
                .WithMany(u => u.Notifications)
                .HasForeignKey(n => n.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }

    private static void ConfigureBooking(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Booking>(entity =>
        {
            entity.HasKey(b => b.Id);

            entity.Property(b => b.Id)
                .HasDefaultValueSql("NEWSEQUENTIALID()");

            entity.Property(b => b.Service)
                .IsRequired()
                .HasConversion<string>()
                .HasMaxLength(50);

            entity.Property(b => b.TotalPrice)
                .HasColumnType("decimal(18,2)")
                .IsRequired();

            entity.Property(b => b.Status)
                .IsRequired()
                .HasConversion<string>()
                .HasMaxLength(20)
                .HasDefaultValue(BookingStatus.Pending);

            entity.Property(b => b.CreatedAt)
                .HasDefaultValueSql("GETUTCDATE()");

            entity.Property(b => b.PaymentStatus)
                .IsRequired()
                .HasConversion<string>()
                .HasMaxLength(20)
                .HasDefaultValue(PaymentStatus.Pending);

            entity.Property(b => b.PaymentUrl)
                .HasMaxLength(500);

            entity.Property(b => b.TransactionId)
                .HasMaxLength(200);

            entity.Property(b => b.Notes)
                .HasMaxLength(500);

            entity.Property(b => b.CancelledByRole)
                .HasConversion<string>()
                .HasMaxLength(20);

            entity.HasIndex(b => new { b.OwnerId, b.Status });
            entity.HasIndex(b => new { b.ProviderProfileId, b.Status });

            entity.HasOne(b => b.Owner)
                .WithMany(u => u.Bookings)
                .HasForeignKey(b => b.OwnerId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(b => b.ProviderProfile)
                .WithMany()
                .HasForeignKey(b => b.ProviderProfileId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }

    private static void ConfigureCommunityGroup(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<CommunityGroup>(entity =>
        {
            entity.HasKey(g => g.Id);

            entity.Property(g => g.Id)
                .HasDefaultValueSql("NEWSEQUENTIALID()");

            entity.Property(g => g.Name)
                .IsRequired()
                .HasMaxLength(200);

            entity.Property(g => g.Description)
                .HasMaxLength(2000);

            entity.Property(g => g.Icon)
                .HasMaxLength(500);

            entity.Property(g => g.IsActive)
                .HasDefaultValue(true);

            entity.Property(g => g.CreatedAt)
                .HasDefaultValueSql("GETUTCDATE()");

            entity.Property(g => g.TargetCountry)
                .HasMaxLength(100);

            entity.Property(g => g.TargetCity)
                .HasMaxLength(100);

            entity.HasIndex(g => new { g.TargetCountry, g.TargetCity });
        });
    }

    private static void ConfigureGroupPost(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<GroupPost>(entity =>
        {
            entity.HasKey(p => p.Id);

            entity.Property(p => p.Id)
                .HasDefaultValueSql("NEWSEQUENTIALID()");

            entity.Property(p => p.Content)
                .IsRequired()
                .HasMaxLength(4000);

            entity.Property(p => p.CreatedAt)
                .HasDefaultValueSql("GETUTCDATE()");

            entity.Property(p => p.City)
                .HasMaxLength(100);

            entity.Property(p => p.Country)
                .HasMaxLength(100);

            entity.HasIndex(p => new { p.GroupId, p.CreatedAt });

            entity.HasOne(p => p.Group)
                .WithMany(g => g.Posts)
                .HasForeignKey(p => p.GroupId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(p => p.Author)
                .WithMany(u => u.GroupPosts)
                .HasForeignKey(p => p.AuthorId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<GroupPostLike>(entity =>
        {
            entity.HasKey(l => l.Id);
            entity.Property(l => l.Id).HasDefaultValueSql("NEWSEQUENTIALID()");
            entity.Property(l => l.CreatedAt).HasDefaultValueSql("GETUTCDATE()");

            entity.HasIndex(l => new { l.PostId, l.UserId }).IsUnique();

            entity.HasOne(l => l.Post)
                .WithMany(p => p.Likes)
                .HasForeignKey(l => l.PostId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(l => l.User)
                .WithMany()
                .HasForeignKey(l => l.UserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<GroupPostComment>(entity =>
        {
            entity.HasKey(c => c.Id);
            entity.Property(c => c.Id).HasDefaultValueSql("NEWSEQUENTIALID()");
            entity.Property(c => c.Content).IsRequired().HasMaxLength(1000);
            entity.Property(c => c.CreatedAt).HasDefaultValueSql("GETUTCDATE()");

            entity.HasIndex(c => new { c.PostId, c.CreatedAt });

            entity.HasOne(c => c.Post)
                .WithMany(p => p.Comments)
                .HasForeignKey(c => c.PostId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(c => c.Author)
                .WithMany()
                .HasForeignKey(c => c.AuthorId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }

    private static void ConfigureFavoriteProvider(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<FavoriteProvider>(entity =>
        {
            entity.HasKey(f => f.Id);

            entity.Property(f => f.Id)
                .HasDefaultValueSql("NEWSEQUENTIALID()");

            entity.Property(f => f.CreatedAt)
                .HasDefaultValueSql("GETUTCDATE()");

            entity.HasIndex(f => new { f.UserId, f.ProviderProfileId })
                .IsUnique();

            entity.HasOne(f => f.User)
                .WithMany()
                .HasForeignKey(f => f.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(f => f.ProviderProfile)
                .WithMany()
                .HasForeignKey(f => f.ProviderProfileId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }

    private static void ConfigureVaccination(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Vaccination>(entity =>
        {
            entity.HasKey(v => v.Id);

            entity.Property(v => v.Id)
                .HasDefaultValueSql("NEWSEQUENTIALID()");

            entity.Property(v => v.VaccineName)
                .IsRequired()
                .HasConversion<string>()
                .HasMaxLength(30);

            entity.Property(v => v.DateAdministered)
                .IsRequired();

            entity.Property(v => v.Notes)
                .HasMaxLength(1000);

            entity.Property(v => v.DocumentUrl)
                .HasMaxLength(500);

            entity.Property(v => v.CreatedAt)
                .HasDefaultValueSql("GETUTCDATE()");

            entity.HasIndex(v => new { v.PetId, v.VaccineName });

            entity.HasOne(v => v.Pet)
                .WithMany(p => p.Vaccinations)
                .HasForeignKey(v => v.PetId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }

    private static void ConfigureWeightLog(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<WeightLog>(entity =>
        {
            entity.HasKey(w => w.Id);

            entity.Property(w => w.Id)
                .HasDefaultValueSql("NEWSEQUENTIALID()");

            entity.Property(w => w.Weight)
                .HasColumnType("decimal(10,2)")
                .IsRequired();

            entity.Property(w => w.DateRecorded)
                .IsRequired();

            entity.Property(w => w.CreatedAt)
                .HasDefaultValueSql("GETUTCDATE()");

            entity.HasIndex(w => new { w.PetId, w.DateRecorded });

            entity.HasOne(w => w.Pet)
                .WithMany(p => p.WeightLogs)
                .HasForeignKey(w => w.PetId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }

    private static void ConfigureServicePackage(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ServicePackage>(entity =>
        {
            entity.HasKey(sp => sp.Id);

            entity.Property(sp => sp.Id)
                .HasDefaultValueSql("NEWSEQUENTIALID()");

            entity.Property(sp => sp.Title)
                .IsRequired()
                .HasMaxLength(200);

            entity.Property(sp => sp.Price)
                .HasColumnType("decimal(18,2)")
                .IsRequired();

            entity.Property(sp => sp.Description)
                .HasMaxLength(1000);

            entity.HasOne(sp => sp.ProviderServiceRate)
                .WithMany(r => r.Packages)
                .HasForeignKey(sp => sp.ProviderServiceRateId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }

    private static void ConfigurePetHealthShare(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<PetHealthShare>(entity =>
        {
            entity.HasKey(s => s.Id);

            entity.Property(s => s.Id)
                .HasDefaultValueSql("NEWSEQUENTIALID()");

            entity.Property(s => s.Token)
                .IsRequired()
                .HasMaxLength(64);

            entity.HasIndex(s => s.Token)
                .IsUnique();

            entity.Property(s => s.ExpiresAt)
                .IsRequired();

            entity.Property(s => s.CreatedAt)
                .HasDefaultValueSql("GETUTCDATE()");

            entity.HasOne(s => s.Pet)
                .WithMany()
                .HasForeignKey(s => s.PetId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }

    private static void ConfigureContactInquiry(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ContactInquiry>(entity =>
        {
            entity.HasKey(c => c.Id);
            entity.Property(c => c.Id).HasDefaultValueSql("NEWSEQUENTIALID()");
            entity.Property(c => c.Topic).IsRequired().HasMaxLength(32);
            entity.Property(c => c.Subject).HasMaxLength(200);
            entity.Property(c => c.Message).IsRequired().HasMaxLength(4000);
            entity.Property(c => c.AppVersion).HasMaxLength(32);
            entity.Property(c => c.Platform).HasMaxLength(32);
            entity.Property(c => c.CreatedAt).HasDefaultValueSql("GETUTCDATE()");

            entity.HasIndex(c => new { c.ReadAt, c.CreatedAt });

            entity.HasOne(c => c.User)
                .WithMany()
                .HasForeignKey(c => c.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }

    private static void ConfigureUserPushToken(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<UserPushToken>(entity =>
        {
            entity.HasKey(t => t.Id);

            entity.Property(t => t.Id)
                .HasDefaultValueSql("NEWSEQUENTIALID()");

            entity.Property(t => t.Token)
                .IsRequired()
                .HasMaxLength(500);

            entity.HasIndex(t => t.Token)
                .IsUnique();

            entity.Property(t => t.Platform)
                .IsRequired()
                .HasMaxLength(10);

            entity.Property(t => t.CreatedAt)
                .HasDefaultValueSql("GETUTCDATE()");

            entity.Property(t => t.LastUsedAt)
                .HasDefaultValueSql("GETUTCDATE()");

            entity.HasIndex(t => t.UserId);

            entity.HasOne(t => t.User)
                .WithMany(u => u.PushTokens)
                .HasForeignKey(t => t.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }

    private static void ConfigureUserNotificationPrefs(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<UserNotificationPrefs>(entity =>
        {
            entity.HasKey(p => p.UserId);

            entity.Property(p => p.PushEnabled).HasDefaultValue(true);
            entity.Property(p => p.Messages).HasDefaultValue(true);
            entity.Property(p => p.Bookings).HasDefaultValue(true);
            entity.Property(p => p.Community).HasDefaultValue(true);
            entity.Property(p => p.Triage).HasDefaultValue(true);
            entity.Property(p => p.Marketing).HasDefaultValue(true);
            entity.Property(p => p.Achievements).HasDefaultValue(true);

            entity.Property(p => p.UpdatedAt)
                .HasDefaultValueSql("GETUTCDATE()");

            entity.HasOne(p => p.User)
                .WithOne(u => u.NotificationPrefs)
                .HasForeignKey<UserNotificationPrefs>(p => p.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }

    private static void ConfigureAchievementUnlocked(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<AchievementUnlocked>(entity =>
        {
            entity.HasKey(a => a.Id);

            entity.Property(a => a.Id)
                .HasDefaultValueSql("NEWSEQUENTIALID()");

            entity.Property(a => a.Code)
                .IsRequired()
                .HasMaxLength(50);

            entity.Property(a => a.Scope)
                .IsRequired()
                .HasMaxLength(20);

            entity.Property(a => a.UnlockedAt)
                .HasDefaultValueSql("GETUTCDATE()");

            // Unique per (UserId, Code) — guarantees idempotent unlock.
            entity.HasIndex(a => new { a.UserId, a.Code })
                .IsUnique();

            entity.HasOne(a => a.User)
                .WithMany()
                .HasForeignKey(a => a.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }

    private static void ConfigurePlaydatePrefs(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<PlaydatePrefs>(entity =>
        {
            entity.HasKey(p => p.UserId);

            entity.Property(p => p.OptedIn).HasDefaultValue(false);
            entity.Property(p => p.MaxDistanceKm).HasDefaultValue(5);
            entity.Property(p => p.Bio).HasMaxLength(280);
            entity.Property(p => p.PreferredSpeciesCsv).HasMaxLength(200).HasDefaultValue("");
            entity.Property(p => p.PreferredDogSizesCsv).HasMaxLength(100).HasDefaultValue("");
            entity.Property(p => p.IncludeAsProvider).HasDefaultValue(false);
            entity.Property(p => p.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
            entity.Property(p => p.UpdatedAt).HasDefaultValueSql("GETUTCDATE()");
            entity.Property(p => p.LastActiveAt).HasDefaultValueSql("GETUTCDATE()");

            entity.HasIndex(p => new { p.OptedIn, p.LastActiveAt });

            entity.HasOne(p => p.User)
                .WithOne(u => u.PlaydatePrefs)
                .HasForeignKey<PlaydatePrefs>(p => p.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }

    private static void ConfigurePlaydateEvent(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<PlaydateEvent>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasDefaultValueSql("NEWSEQUENTIALID()");
            entity.Property(e => e.Title).IsRequired().HasMaxLength(120);
            entity.Property(e => e.Description).HasMaxLength(1000);
            entity.Property(e => e.LocationName).IsRequired().HasMaxLength(200);
            entity.Property(e => e.City).HasMaxLength(100);
            entity.Property(e => e.AllowedSpeciesCsv).HasMaxLength(200).HasDefaultValue("DOG");
            entity.Property(e => e.CancellationReason).HasMaxLength(500);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("GETUTCDATE()");

            entity.HasIndex(e => new { e.ScheduledFor, e.CancelledAt });
            entity.HasIndex(e => new { e.Latitude, e.Longitude });

            entity.HasOne(e => e.Host)
                .WithMany()
                .HasForeignKey(e => e.HostUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<PlaydateRsvp>(entity =>
        {
            entity.HasKey(r => new { r.EventId, r.UserId });
            entity.Property(r => r.Status).HasConversion<int>().IsRequired();
            entity.Property(r => r.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
            entity.Property(r => r.UpdatedAt).HasDefaultValueSql("GETUTCDATE()");

            entity.HasOne(r => r.Event)
                .WithMany(e => e.Rsvps)
                .HasForeignKey(r => r.EventId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(r => r.User)
                .WithMany()
                .HasForeignKey(r => r.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(r => r.Pet)
                .WithMany()
                .HasForeignKey(r => r.PetId)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<PlaydateEventComment>(entity =>
        {
            entity.HasKey(c => c.Id);
            entity.Property(c => c.Id).HasDefaultValueSql("NEWSEQUENTIALID()");
            entity.Property(c => c.Content).IsRequired().HasMaxLength(1000);
            entity.Property(c => c.CreatedAt).HasDefaultValueSql("GETUTCDATE()");

            entity.HasIndex(c => new { c.EventId, c.CreatedAt });

            entity.HasOne(c => c.Event)
                .WithMany(e => e.Comments)
                .HasForeignKey(c => c.EventId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(c => c.User)
                .WithMany()
                .HasForeignKey(c => c.UserId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }

    private static void ConfigurePlaydateBeacon(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<PlaydateBeacon>(entity =>
        {
            entity.HasKey(b => b.Id);
            entity.Property(b => b.Id).HasDefaultValueSql("NEWSEQUENTIALID()");
            entity.Property(b => b.PlaceName).IsRequired().HasMaxLength(120);
            entity.Property(b => b.City).HasMaxLength(100);
            entity.Property(b => b.PetIdsCsv).HasMaxLength(500).HasDefaultValue("");
            entity.Property(b => b.Species).IsRequired().HasMaxLength(20).HasDefaultValue("DOG");
            entity.Property(b => b.CreatedAt).HasDefaultValueSql("GETUTCDATE()");

            entity.HasIndex(b => new { b.UserId, b.ExpiresAt });
            entity.HasIndex(b => b.ExpiresAt);
            entity.HasIndex(b => new { b.Latitude, b.Longitude });

            entity.HasOne(b => b.User)
                .WithMany()
                .HasForeignKey(b => b.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }

    private static List<DogSize> ParseDogSizesFromColumn(string v)
    {
        if (string.IsNullOrWhiteSpace(v)) return new List<DogSize>();
        var list = new List<DogSize>();
        foreach (var part in v.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            if (Enum.TryParse<DogSize>(part, ignoreCase: true, out var e))
                list.Add(e);
        }
        return list;
    }
}
