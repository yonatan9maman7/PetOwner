# Build stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY PetOwner.sln ./
COPY src/PetOwner.Api/PetOwner.Api.csproj ./src/PetOwner.Api/
COPY src/PetOwner.Data/PetOwner.Data.csproj ./src/PetOwner.Data/
COPY src/PetOwner.Api.Tests/PetOwner.Api.Tests.csproj ./src/PetOwner.Api.Tests/

RUN dotnet restore PetOwner.sln

COPY . .
RUN dotnet publish src/PetOwner.Api/PetOwner.Api.csproj -c Release -o /app/publish

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080

COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "PetOwner.Api.dll"]
