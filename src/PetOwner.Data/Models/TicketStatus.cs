namespace PetOwner.Data.Models;

public enum TicketStatus
{
    Open,
    WaitingForCustomer,
    WaitingForProvider,
    UnderReview,
    Escalated,
    RefundPending,
    Resolved,
    Closed,
    Reopened
}
