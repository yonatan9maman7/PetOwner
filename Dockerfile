# Build stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY src/PetOwner.Api/PetOwner.Api.csproj src/PetOwner.Api/
COPY src/PetOwner.Data/PetOwner.Data.csproj src/PetOwner.Data/
RUN dotnet restore src/PetOwner.Api/PetOwner.Api.csproj

COPY src/ src/
WORKDIR /src/PetOwner.Api
RUN dotnet publish -c Release -o /app/publish --no-restore

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080

COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "PetOwner.Api.dll"]
