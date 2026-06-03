namespace PetOwner.Data.Models;

public enum PaymentStatus
{
    Pending,    // 0 – payment not yet initiated
    Paid,       // 1 – funds fully captured (booking complete)
    Failed,     // 2 – authorization or capture rejected
    Refunded,   // 3 – captured funds returned
    Authorized, // 4 – funds on hold (J5); awaiting capture on completion
    Voided,     // 5 – authorization released (booking cancelled before capture)
}
