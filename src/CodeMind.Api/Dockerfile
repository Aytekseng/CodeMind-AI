# Stage 1: Build & Publish
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Proje dosyalarını kopyala ve restore et (Docker cache avantajı için önce csproj'lar)
COPY src/CodeMind.Domain/CodeMind.Domain.csproj src/CodeMind.Domain/
COPY src/CodeMind.Application/CodeMind.Application.csproj src/CodeMind.Application/
COPY src/CodeMind.Infrastructure/CodeMind.Infrastructure.csproj src/CodeMind.Infrastructure/
COPY src/CodeMind.Api/CodeMind.Api.csproj src/CodeMind.Api/

RUN dotnet restore src/CodeMind.Api/CodeMind.Api.csproj

# Tüm kaynak kodları kopyala ve Release modunda publish et
COPY src/CodeMind.Domain/ src/CodeMind.Domain/
COPY src/CodeMind.Application/ src/CodeMind.Application/
COPY src/CodeMind.Infrastructure/ src/CodeMind.Infrastructure/
COPY src/CodeMind.Api/ src/CodeMind.Api/

WORKDIR /src/src/CodeMind.Api
RUN dotnet publish CodeMind.Api.csproj -c Release -o /app/publish /p:UseAppHost=false

# Stage 2: Runtime
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

# QuestPDF Linux Skia gereksinimleri (libfontconfig1 & libfreetype6)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libfontconfig1 \
    libfreetype6 \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:5083
ENV ASPNETCORE_ENVIRONMENT=Production
EXPOSE 5083

ENTRYPOINT ["dotnet", "CodeMind.Api.dll"]
