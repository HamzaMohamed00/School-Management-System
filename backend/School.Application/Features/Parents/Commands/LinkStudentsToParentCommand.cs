using System;
using System.Linq;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using School.Application.Interfaces;
using School.Domain.Entities;
using School.Application.Specifications;

namespace School.Application.Features.Parents.Commands
{
    public class LinkStudentsToParentCommand : IRequest<bool>
    {
        public int ParentId { get; set; }
        public List<int> StudentIds { get; set; } = new();
    }

    public class LinkStudentsToParentCommandHandler : IRequestHandler<LinkStudentsToParentCommand, bool>
    {
        private readonly IUnitOfWork _unitOfWork;

        public LinkStudentsToParentCommandHandler(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }

        public async Task<bool> Handle(LinkStudentsToParentCommand request, CancellationToken cancellationToken)
        {
            var parent = await _unitOfWork.Repository<Parent>().GetByIdAsync(request.ParentId);
            if (parent == null) return false;

            var studentRepo = _unitOfWork.Repository<Student>();

            // 1. Clear current links for this parent (students who currently point to this parent)
            var currentChildrenSpec = new BaseSpecification<Student>(s => s.ParentId == request.ParentId);
            var currentChildren = await studentRepo.ListAsync(currentChildrenSpec);

            foreach (var child in currentChildren)
            {
                child.ParentId = null;
                studentRepo.Update(child);
            }

            // 2. Link new students
            if (request.StudentIds != null && request.StudentIds.Any())
            {
                var newChildrenSpec = new BaseSpecification<Student>(s => request.StudentIds.Contains(s.Id));
                var newChildren = await studentRepo.ListAsync(newChildrenSpec);

                foreach (var child in newChildren)
                {
                    child.ParentId = request.ParentId;
                    studentRepo.Update(child);
                }
            }

            // Save changes
            await _unitOfWork.CompleteAsync();
            return true;
        }
    }
}
