using MediatR;
using School.Application.Interfaces;
using School.Domain.Entities;

namespace School.Application.Features.ClassRooms.Commands;

public class CreateClassRoomCommand : IRequest<int>
{
    public string Name { get; set; } = string.Empty;
    public int GradeLevelId { get; set; }
    public int Capacity { get; set; }
    public int? TeacherId { get; set; }
}

public class CreateClassRoomCommandHandler : IRequestHandler<CreateClassRoomCommand, int>
{
    private readonly IUnitOfWork _unitOfWork;

    public CreateClassRoomCommandHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<int> Handle(CreateClassRoomCommand request, CancellationToken cancellationToken)
    {
        var classRoom = new ClassRoom
        {
            Name = request.Name,
            GradeLevelId = request.GradeLevelId,
            Capacity = request.Capacity,
            TeacherId = request.TeacherId,
            Location = "Main Building", // Default value to prevent DB error
            AcademicYear = DateTime.Now.Year + "-" + (DateTime.Now.Year + 1) // Default value
        };

        await _unitOfWork.Repository<ClassRoom>().AddAsync(classRoom);
        await _unitOfWork.CompleteAsync();

        return classRoom.Id;
    }
}
