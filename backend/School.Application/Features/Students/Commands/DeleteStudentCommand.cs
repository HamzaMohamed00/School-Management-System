using MediatR;
using School.Application.Interfaces;
using School.Domain.Entities;

namespace School.Application.Features.Students.Commands;

public class DeleteStudentCommand : IRequest<bool>
{
    public int Id { get; set; }
}

public class DeleteStudentCommandHandler : IRequestHandler<DeleteStudentCommand, bool>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IAuthService _authService;

    public DeleteStudentCommandHandler(IUnitOfWork unitOfWork, IAuthService authService)
    {
        _unitOfWork = unitOfWork;
        _authService = authService;
    }

    public async Task<bool> Handle(DeleteStudentCommand request, CancellationToken cancellationToken)
    {
        var student = await _unitOfWork.Repository<Student>().GetByIdAsync(request.Id);
        if (student == null) return false;

        // 1. Manually delete associated records to avoid FK constraints
        var attendances = await _unitOfWork.Repository<School.Domain.Entities.Attendance>().ListAsync(new Specifications.BaseSpecification<School.Domain.Entities.Attendance>(a => a.StudentId == student.Id));
        foreach (var att in attendances) _unitOfWork.Repository<School.Domain.Entities.Attendance>().Delete(att);

        var results = await _unitOfWork.Repository<ExamResult>().ListAsync(new Specifications.BaseSpecification<ExamResult>(er => er.StudentId == student.Id));
        foreach (var res in results) _unitOfWork.Repository<ExamResult>().Delete(res);

        var grades = await _unitOfWork.Repository<GradeRecord>().ListAsync(new Specifications.BaseSpecification<GradeRecord>(gr => gr.StudentId == student.Id));
        foreach (var grade in grades) _unitOfWork.Repository<GradeRecord>().Delete(grade);

        // Clear Messages (Manual to be safe)
        var messages = await _unitOfWork.Repository<Message>().ListAsync(new Specifications.BaseSpecification<Message>(m => m.SenderId == student.UserId || m.ReceiverId == student.UserId));
        foreach (var msg in messages) _unitOfWork.Repository<Message>().Delete(msg);

        // Assignment Submissions
        var submissions = await _unitOfWork.Repository<AssignmentSubmission>().ListAsync(new Specifications.BaseSpecification<AssignmentSubmission>(s => s.StudentId == student.Id));
        foreach (var sub in submissions) _unitOfWork.Repository<AssignmentSubmission>().Delete(sub);

        // 2. Delete Identity User first to clear FKs pointing to Student
        var userDeleted = await _authService.DeleteUserAsync(student.UserId);

        // 3. Delete Student Profile
        _unitOfWork.Repository<Student>().Delete(student);
        var dbResult = await _unitOfWork.CompleteAsync();

        return dbResult > 0;
    }
}
