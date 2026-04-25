namespace School.Domain.Entities;

public class Subject : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int CreditHours { get; set; }

    public int? TeacherId { get; set; }
    public Teacher? Teacher { get; set; }
    
    public int? ClassRoomId { get; set; }
    public ClassRoom? ClassRoom { get; set; }
    
    public ICollection<Session> Sessions { get; set; } = new List<Session>();
    public ICollection<Exam> Exams { get; set; } = new List<Exam>();
    public ICollection<Assignment> Assignments { get; set; } = new List<Assignment>();
}
