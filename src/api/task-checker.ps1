# task-checker.ps1
$logPath = "C:\GTS\logs\task-checker.log"

# Log dizinini oluştur
if (-not (Test-Path "C:\GTS\logs")) {
    New-Item -ItemType Directory -Path "C:\GTS\logs" -Force
}

# Log başlat
$logMessage = "Görev tetikleme başlatılıyor: $(Get-Date)"
Add-Content -Path $logPath -Value $logMessage

try {
    # Selenium assembly'lerini yükle
    $seleniumPath = "C:\Program Files\WindowsPowerShell\Modules\Selenium\3.0.1\assemblies"
    $webDriverPath = Join-Path $seleniumPath "WebDriver.dll"
    $webDriverSupportPath = Join-Path $seleniumPath "WebDriver.Support.dll"

    if (-not (Test-Path $webDriverPath) -or -not (Test-Path $webDriverSupportPath)) {
        throw "Selenium assembly'leri bulunamadı. Lütfen önce install-selenium.ps1 scriptini çalıştırın."
    }

    Add-Type -Path $webDriverPath
    Add-Type -Path $webDriverSupportPath

    # Edge WebDriver'ı başlat
    $edgeOptions = New-Object OpenQA.Selenium.Edge.EdgeOptions
    $edgeOptions.AddAdditionalCapability("ms:edgeOptions", @{
        args = @("--headless")
    })
    
    # WebDriver yolunu belirt
    $edgeDriverPath = "C:\Selenium\WebDriver"
    if (-not (Test-Path "$edgeDriverPath\MicrosoftWebDriver.exe")) {
        throw "Edge WebDriver bulunamadı. Lütfen önce install-selenium.ps1 scriptini çalıştırın."
    }
    
    # Edge WebDriver'ı başlat
    $driver = New-Object OpenQA.Selenium.Edge.EdgeDriver($edgeDriverPath, $edgeOptions)
    
    try {
        # API endpoint'ine git
        $url = "https://gts.mt-teknoloji.com/api/run-task-checker?key=gts_secure_task_key_2023"
        $driver.Navigate().GoToUrl($url)
        
        # WebDriverWait oluştur
        $wait = New-Object OpenQA.Selenium.Support.UI.WebDriverWait($driver, [System.TimeSpan]::FromSeconds(30))
        
        # API yanıtının gelmesini bekle
        $wait.Until([OpenQA.Selenium.Support.UI.ExpectedConditions]::ElementExists(
            [OpenQA.Selenium.By]::XPath("//pre[contains(text(), 'success')]")
        ))
        
        # Sayfa içeriğini al
        $pageSource = $driver.PageSource
        
        # JSON yanıtını parse et
        if ($pageSource -match '{"success":true') {
            $logMessage = "Görev tetikleme başarılı. $(Get-Date)"
            Add-Content -Path $logPath -Value $logMessage
            Add-Content -Path $logPath -Value "Yanıt: $pageSource"
        } else {
            throw "API yanıtı başarısız: $pageSource"
        }
    } finally {
        # Tarayıcıyı kapat
        $driver.Quit()
    }
} catch {
    $logMessage = "HATA: Görev tetikleme başarısız. $(Get-Date)"
    Add-Content -Path $logPath -Value $logMessage
    Add-Content -Path $logPath -Value "Hata: $($_.Exception.Message)"
}

Add-Content -Path $logPath -Value "-------------------------------------------"