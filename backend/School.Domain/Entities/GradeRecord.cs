namespace School.Domain.Entities;

public class GradeRecord : BaseEntity
{
    public double Score { get; set; }
    public string GradeType { get; set; } = string.Empty; // e.g., Homework, Assignment, Participation
    public string Notes { get; set; } = string.Empty;
    public DateTime Date { get; set; }

    public int StudentId { get; set; }
    public Student? Student { get; set; }

    public int SubjectId { get; set; }
    public Subject? Subject { get; set; }
}
