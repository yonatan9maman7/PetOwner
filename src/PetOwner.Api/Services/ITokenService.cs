using PetOwner.Data.Models;

namespace PetOwner.Api.Services;

public interface ITokenService
{
    string GenerateAccessToken(User user);
}
