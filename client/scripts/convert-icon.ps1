Add-Type -AssemblyName System.Drawing

$src = "C:\Users\Star\.gemini\antigravity\brain\a9d3e351-751c-48db-8da6-a730487f6cbe\solli_app_icon_1794197147463.jpg"
$dest1 = "C:\Users\Star\developer\SOLLI\solli-icon.png"
$dest2 = "C:\Users\Star\developer\SOLLI\client\public\icon-512.png"
$dest3 = "C:\Users\Star\developer\SOLLI\docs\screenshots\solli-icon.png"

$img = [System.Drawing.Image]::FromFile($src)
Write-Host "Source image dimensions: $($img.Width) x $($img.Height)"

# Save full-res PNG
$img.Save($dest1, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "Saved: $dest1"

# Save copy to docs/screenshots
$img.Save($dest3, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "Saved: $dest3"

# Also resize to 512x512 for client/public/icon-512.png
$bmp512 = New-Object System.Drawing.Bitmap(512, 512)
$graph = [System.Drawing.Graphics]::FromImage($bmp512)
$graph.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graph.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$graph.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$graph.DrawImage($img, 0, 0, 512, 512)
$graph.Dispose()

$bmp512.Save($dest2, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "Saved: $dest2"

# Also resize to 192x192 for client/public/icon-192.png
$dest4 = "C:\Users\Star\developer\SOLLI\client\public\icon-192.png"
$bmp192 = New-Object System.Drawing.Bitmap(192, 192)
$graph192 = [System.Drawing.Graphics]::FromImage($bmp192)
$graph192.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graph192.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$graph192.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$graph192.DrawImage($img, 0, 0, 192, 192)
$graph192.Dispose()

$bmp192.Save($dest4, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "Saved: $dest4"
$bmp192.Dispose()

$bmp512.Dispose()
$img.Dispose()
