$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut('d:\Proj\Trea\dazi\typing_practice\打字练习.lnk')
$shortcut.TargetPath = 'd:\Proj\Trea\dazi\typing_practice\dazi.bat'
$shortcut.WorkingDirectory = 'd:\Proj\Trea\dazi\typing_practice'
$shortcut.IconLocation = 'd:\Proj\Trea\dazi\typing_practice\favicon.ico'
$shortcut.Save()
Write-Host 'Shortcut created successfully!'
