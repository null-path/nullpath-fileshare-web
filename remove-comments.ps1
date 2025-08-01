# PowerShell script to remove comments from Svelte files
# Usage: .\remove-comments.ps1 [filepath]
# If no filepath is provided, it will process all .svelte files in the current directory

param(
    [string]$FilePath = ""
)

function Remove-Comments {
    param([string]$Content)
    
    $lines = $Content -split "`n"
    $result = @()
    $inMultiLineComment = $false
    $inScriptBlock = $false
    
    foreach ($line in $lines) {
        $originalLine = $line
        $processedLine = ""
        $i = 0
        $inString = $false
        $stringChar = ""
        
        # Check if we're entering or leaving a script block
        if ($line -match '<script.*?>') {
            $inScriptBlock = $true
        }
        if ($line -match '</script>') {
            $inScriptBlock = $false
        }
        
        while ($i -lt $line.Length) {
            $char = $line[$i]
            $nextChar = if ($i + 1 -lt $line.Length) { $line[$i + 1] } else { "" }
            $prevChar = if ($i -gt 0) { $line[$i - 1] } else { "" }
            
            # Handle string literals (don't remove comments inside strings)
            if (($char -eq '"' -or $char -eq "'") -and $prevChar -ne '\') {
                if (-not $inString) {
                    $inString = $true
                    $stringChar = $char
                } elseif ($char -eq $stringChar) {
                    $inString = $false
                    $stringChar = ""
                }
                $processedLine += $char
                $i++
                continue
            }
            
            # Skip processing if we're inside a string
            if ($inString) {
                $processedLine += $char
                $i++
                continue
            }
            
            # Handle multi-line comments /* */
            if ($inMultiLineComment) {
                if ($char -eq '*' -and $nextChar -eq '/') {
                    $inMultiLineComment = $false
                    $i += 2
                    continue
                } else {
                    $i++
                    continue
                }
            }
            
            # Check for start of multi-line comment
            if ($char -eq '/' -and $nextChar -eq '*') {
                $inMultiLineComment = $true
                $i += 2
                continue
            }
            
            # Handle single-line comments //
            if ($char -eq '/' -and $nextChar -eq '/' -and $inScriptBlock) {
                # Remove everything from // to end of line
                break
            }
            
            # Handle HTML comments <!-- -->
            if ($char -eq '<' -and $line.Substring($i).StartsWith('<!--')) {
                $commentEnd = $line.IndexOf('-->', $i)
                if ($commentEnd -ne -1) {
                    # Single line HTML comment
                    $i = $commentEnd + 3
                    continue
                } else {
                    # Multi-line HTML comment start
                    break
                }
            }
            
            # Check for HTML comment end on a line by itself
            if ($line.Trim().StartsWith('-->')) {
                # Skip this entire line
                $processedLine = ""
                break
            }
            
            $processedLine += $char
            $i++
        }
        
        # Only add non-empty lines or lines that aren't just whitespace
        $trimmedLine = $processedLine.Trim()
        if ($trimmedLine -ne "" -or $processedLine -eq "") {
            $result += $processedLine.TrimEnd()
        }
    }
    
    return $result -join "`n"
}

function Process-SvelteFile {
    param([string]$Path)
    
    if (-not (Test-Path $Path)) {
        Write-Host "File not found: $Path" -ForegroundColor Red
        return
    }
    
    Write-Host "Processing: $Path" -ForegroundColor Green
    
    # Read the file content
    $content = Get-Content -Path $Path -Raw -Encoding UTF8
    
    # Create backup
    $backupPath = $Path + ".backup"
    Copy-Item -Path $Path -Destination $backupPath
    Write-Host "Backup created: $backupPath" -ForegroundColor Yellow
    
    # Remove comments
    $cleanedContent = Remove-Comments -Content $content
    
    # Write back to file
    Set-Content -Path $Path -Value $cleanedContent -Encoding UTF8 -NoNewline
    
    Write-Host "Comments removed from: $Path" -ForegroundColor Green
}

# Main execution
if ($FilePath -ne "") {
    # Process single file
    Process-SvelteFile -Path $FilePath
} else {
    # Process all .svelte files in current directory
    $svelteFiles = Get-ChildItem -Path "." -Filter "*.svelte" -Recurse
    
    if ($svelteFiles.Count -eq 0) {
        Write-Host "No .svelte files found in current directory" -ForegroundColor Yellow
        exit
    }
    
    Write-Host "Found $($svelteFiles.Count) .svelte file(s)" -ForegroundColor Cyan
    
    foreach ($file in $svelteFiles) {
        Process-SvelteFile -Path $file.FullName
    }
}

Write-Host "Done!" -ForegroundColor Green
