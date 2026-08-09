using AutoMapper;
using CodeMind.Domain.DTOs.Auth.Requests;
using CodeMind.Domain.Entities;

namespace CodeMind.Domain.Mappings;

public class MappingProfile : Profile
{
    public MappingProfile()
    {
        // RegisterRequestDto -> Tenant (TenantName özelliğini Name özelliğine eşle)
        CreateMap<RegisterRequestDto, Tenant>()
            .ForMember(dest => dest.Name, opt => opt.MapFrom(src => src.TenantName));

        // RegisterRequestDto -> User (Manuel eklenecek alanları görmezden gel)
        CreateMap<RegisterRequestDto, User>()
            .ForMember(dest => dest.PasswordHash, opt => opt.Ignore())
            .ForMember(dest => dest.TenantId, opt => opt.Ignore())
            .ForMember(dest => dest.Role, opt => opt.Ignore());
    }
}
