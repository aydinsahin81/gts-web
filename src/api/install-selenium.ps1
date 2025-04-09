# Selenium kurulum scripti
# NuGet paket yöneticisini yükle
Install-PackageProvider -Name NuGet -MinimumVersion 2.8.5.201 -Force

# PowerShell Gallery'yi güvenilir olarak işaretle
Set-PSRepository -Name PSGallery -InstallationPolicy Trusted

# Selenium modülünü yükle
Install-Module -Name Selenium -Force

# Edge WebDriver'ı indir
$edgeDriverPath = "C:\Selenium\WebDriver"
if (-not (Test-Path $edgeDriverPath)) {
    New-Item -ItemType Directory -Path $edgeDriverPath -Force
}

# Edge sürümünü al
$edgeVersion = (Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\msedge.exe").'(default)'
$edgeVersion = [System.Diagnostics.FileVersionInfo]::GetVersionInfo($edgeVersion).FileVersion

# WebDriver'ı indir
$webDriverUrl = "https://msedgedriver.azureedge.net/$edgeVersion/edgedriver_win64.zip"
$webDriverZip = "$edgeDriverPath\edgedriver.zip"
Invoke-WebRequest -Uri $webDriverUrl -OutFile $webDriverZip
Expand-Archive -Path $webDriverZip -DestinationPath $edgeDriverPath -Force
Remove-Item $webDriverZip

# WebDriver'ın doğru indiğini kontrol et
if (-not (Test-Path "$edgeDriverPath\msedgedriver.exe")) {
    throw "Edge WebDriver indirilemedi. Lütfen manuel olarak indirin: https://developer.microsoft.com/en-us/microsoft-edge/tools/webdriver/"
}

# WebDriver'ı PATH'e ekle
$env:Path += ";$edgeDriverPath"
[Environment]::SetEnvironmentVariable("Path", $env:Path, [EnvironmentVariableTarget]::Machine)

# WebDriver'ı MicrosoftWebDriver.exe olarak kopyala
Copy-Item "$edgeDriverPath\msedgedriver.exe" "$edgeDriverPath\MicrosoftWebDriver.exe" -Force