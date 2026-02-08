# 递归处理所有txt文件，将\n替换为实际换行符
function Fix-NewlinesInFiles {
    param (
        [string]$Directory
    )
    
    # 获取目录中的所有txt文件
    $txtFiles = Get-ChildItem -Path $Directory -Filter "*.txt" -Recurse
    
    foreach ($file in $txtFiles) {
        Write-Host "Processing file: $($file.FullName)"
        
        # 读取文件内容
        $content = Get-Content -Path $file.FullName -Raw
        
        # 将\n替换为实际换行符
        $fixedContent = $content -replace '\\n', "`n"
        
        # 写回文件
        Set-Content -Path $file.FullName -Value $fixedContent -Encoding UTF8
        
        Write-Host "Fixed newlines in: $($file.FullName)"
    }
    
    Write-Host "All files processed."
}

# 调用函数处理practice_articles目录
Fix-NewlinesInFiles -Directory "d:\Proj\Trea\dazi\typing_practice\practice_articles"
