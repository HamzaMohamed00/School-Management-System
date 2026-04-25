using MediatR;
using School.Application.Interfaces;
using School.Domain.Entities;

namespace School.Application.Features.ClassRooms.Commands;

public class UpdateClassRoomCommand : IRequest<bool>
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int GradeLevelId { get; set; }
    public int Capacity { get; set; }
    public int? TeacherId { get; set; }
}

public class UpdateClassRoomCommandHandler : IRequestHandler<UpdateClassRoomCommand, bool>
{
    private readonly IUnitOfWork _unitOfWork;

    public UpdateClassRoomCommandHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<bool> Handle(UpdateClassRoomCommand request, CancellationToken cancellationToken)
    {
        var classroom = await _unitOfWork.Repository<ClassRoom>().GetByIdAsync(request.Id);
        if (classroom == null) return false;

        classroom.Name = request.Name;
        classroom.GradeLevelId = request.GradeLevelId;
        classroom.Capacity = request.Capacity;
        classroom.TeacherId = request.TeacherId;
        
        // Ensure required fields are set if they were somehow null
        if (string.IsNullOrEmpty(classroom.Location)) classroom.Location = "Main Building";
        if (string.IsNullOrEmpty(classroom.AcademicYear)) classroom.AcademicYear = DateTime.Now.Year + "-" + (DateTime.Now.Year + 1);

        _unitOfWork.Repository<ClassRoom>().Update(classroom);
        var result = await _unitOfWork.CompleteAsync();
        return result > 0;
    }
}
