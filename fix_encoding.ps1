# 递归处理所有txt文件，修复编码问题并确保正确的换行符
function Fix-FileEncoding {
    param (
        [string]$Directory
    )
    
    # 获取目录中的所有txt文件
    $txtFiles = Get-ChildItem -Path $Directory -Filter "*.txt" -Recurse
    
    foreach ($file in $txtFiles) {
        Write-Host "Processing file: $($file.FullName)"
        
        try {
            # 尝试以UTF-8编码读取文件
            $content = Get-Content -Path $file.FullName -Encoding UTF8 -Raw -ErrorAction Stop
        } catch {
            try {
                # 如果UTF-8失败，尝试以默认编码读取
                $content = Get-Content -Path $file.FullName -Raw -ErrorAction Stop
            } catch {
                Write-Host "Error reading file $($file.FullName): $($_.Exception.Message)"
                continue
            }
        }
        
        # 处理内容：修复换行符，确保使用正确的UTF-8编码
        $fixedContent = $content -replace '\\n', "`n" | Out-String
        
        # 以UTF-8编码写回文件
        try {
            Set-Content -Path $file.FullName -Value $fixedContent -Encoding UTF8 -ErrorAction Stop
            Write-Host "Fixed encoding in: $($file.FullName)"
        } catch {
            Write-Host "Error writing file $($file.FullName): $($_.Exception.Message)"
        }
    }
    
    Write-Host "All files processed."
}

# 调用函数处理practice_articles目录
Fix-FileEncoding -Directory "d:\Proj\Trea\dazi\typing_practice\practice_articles"
