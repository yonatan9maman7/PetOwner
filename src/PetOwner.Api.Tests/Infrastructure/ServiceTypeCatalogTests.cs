using PetOwner.Api.Infrastructure;
using PetOwner.Data.Models;
using Xunit;

namespace PetOwner.Api.Tests.Infrastructure;

public class ServiceTypeCatalogTests
{
    [Fact]
    public void ToDisplayName_WhenKnownServiceType_ReturnsDisplayLabel()
    {
        // Arrange
        const ServiceType serviceType = ServiceType.DogWalking;

        // Act
        var result = ServiceTypeCatalog.ToDisplayName(serviceType);

        // Assert
        Assert.Equal("Dog Walker", result);
    }

    [Fact]
    public void ToDisplayName_WhenUnknownEnumValue_ReturnsEnumString()
    {
        // Arrange
        const ServiceType serviceType = (ServiceType)999;

        // Act
        var result = ServiceTypeCatalog.ToDisplayName(serviceType);

        // Assert
        Assert.Equal("999", result);
    }

    [Fact]
    public void TryGetDisplayName_WhenKnownServiceType_ReturnsTrueAndLabel()
    {
        // Arrange
        const ServiceType serviceType = ServiceType.Boarding;

        // Act
        var found = ServiceTypeCatalog.TryGetDisplayName(serviceType, out var displayName);

        // Assert
        Assert.True(found);
        Assert.Equal("Boarding", displayName);
    }

    [Fact]
    public void TryParseDisplayName_WhenDisplayLabel_ReturnsServiceType()
    {
        // Act
        var result = ServiceTypeCatalog.TryParseDisplayName("Dog Walker");

        // Assert
        Assert.Equal(ServiceType.DogWalking, result);
    }

    [Fact]
    public void TryParseDisplayName_WhenEnumName_ReturnsServiceType()
    {
        // Act
        var result = ServiceTypeCatalog.TryParseDisplayName("PetSitting");

        // Assert
        Assert.Equal(ServiceType.PetSitting, result);
    }

    [Fact]
    public void TryParseDisplayName_WhenNull_ReturnsNull()
    {
        // Act
        var result = ServiceTypeCatalog.TryParseDisplayName(null);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public void TryParseDisplayName_WhenWhitespace_ReturnsNull()
    {
        // Act
        var result = ServiceTypeCatalog.TryParseDisplayName("   ");

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public void TryParseDisplayName_WhenUnknownString_ReturnsNull()
    {
        // Act
        var result = ServiceTypeCatalog.TryParseDisplayName("NotARealService");

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public void ServiceTypesWithDisplayNameContaining_WhenWalker_ReturnsDogWalking()
    {
        // Act
        var result = ServiceTypeCatalog.ServiceTypesWithDisplayNameContaining("Walker");

        // Assert
        Assert.Contains(ServiceType.DogWalking, result);
    }

    [Fact]
    public void ServiceTypesWithDisplayNameContaining_WhenEmptyTerm_ReturnsEmptyList()
    {
        // Act
        var result = ServiceTypeCatalog.ServiceTypesWithDisplayNameContaining("");

        // Assert
        Assert.Empty(result);
    }

    [Fact]
    public void ServiceTypesWithDisplayNameContaining_WhenWhitespaceTerm_ReturnsEmptyList()
    {
        // Act
        var result = ServiceTypeCatalog.ServiceTypesWithDisplayNameContaining("   ");

        // Assert
        Assert.Empty(result);
    }

    [Fact]
    public void AllDisplayNamesOrdered_IsNonEmptyAndSorted()
    {
        // Act
        var names = ServiceTypeCatalog.AllDisplayNamesOrdered;

        // Assert
        Assert.NotEmpty(names);
        Assert.Equal(names.OrderBy(n => n, StringComparer.OrdinalIgnoreCase).ToList(), names.ToList());
    }
}
