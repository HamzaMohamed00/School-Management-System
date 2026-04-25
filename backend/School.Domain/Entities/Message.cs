namespace School.Domain.Entities;

public class Message : BaseEntity
{
    public string SenderId { get; set; } // ApplicationUserId
    public string ReceiverId { get; set; } // ApplicationUserId
    public string Content { get; set; }
    public DateTime SentAt { get; set; }
    public bool IsRead { get; set; }
}
