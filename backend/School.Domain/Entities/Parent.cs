namespace School.Domain.Entities;

public class Parent : BaseEntity
{
    public string UserId { get; set; } = string.Empty; // Link to AspNetUsers
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;

    public ICollection<Student> Children { get; set; } = new List<Student>();
}
