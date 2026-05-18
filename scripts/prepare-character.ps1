param(
  [Parameter(Mandatory = $true)]
  [string]$InputPath,

  [Parameter(Mandatory = $true)]
  [string]$OutputPath,

  [int]$CanvasWidth = 96,
  [int]$CanvasHeight = 128,
  [int]$MaxVisibleWidth = 76,
  [int]$MaxVisibleHeight = 104,
  [int]$FootY = 116,
  [int]$BackgroundMin = 225,
  [int]$BackgroundVariance = 10,
  [switch]$CleanInteriorBackground,
  [int]$InteriorCleanupStartY = 64
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

function Test-BackgroundPixel {
  param(
    [System.Drawing.Color]$Color,
    [int]$Min,
    [int]$Variance
  )

  if ($Color.A -le 0) {
    return $true
  }

  return (
    $Color.R -ge $Min -and
    $Color.G -ge $Min -and
    $Color.B -ge $Min -and
    [Math]::Abs($Color.R - $Color.G) -le $Variance -and
    [Math]::Abs($Color.R - $Color.B) -le $Variance -and
    [Math]::Abs($Color.G - $Color.B) -le $Variance
  )
}

$resolvedInput = (Resolve-Path -LiteralPath $InputPath).Path
$resolvedOutput = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($OutputPath)
$outputDir = Split-Path -Parent $resolvedOutput
if ($outputDir -and -not (Test-Path -LiteralPath $outputDir)) {
  New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
}

$source = [System.Drawing.Bitmap]::FromFile($resolvedInput)

try {
  $width = $source.Width
  $height = $source.Height
  $visited = New-Object 'bool[,]' $width, $height
  $queue = [System.Collections.Generic.Queue[System.Drawing.Point]]::new()

  function Add-Point {
    param([int]$X, [int]$Y)

    if ($X -lt 0 -or $X -ge $width -or $Y -lt 0 -or $Y -ge $height) {
      return
    }
    if ($visited[$X, $Y]) {
      return
    }

    $color = $source.GetPixel($X, $Y)
    if (Test-BackgroundPixel -Color $color -Min $BackgroundMin -Variance $BackgroundVariance) {
      $visited[$X, $Y] = $true
      $queue.Enqueue([System.Drawing.Point]::new($X, $Y))
    }
  }

  for ($x = 0; $x -lt $width; $x += 1) {
    Add-Point -X $x -Y 0
    Add-Point -X $x -Y ($height - 1)
  }
  for ($y = 0; $y -lt $height; $y += 1) {
    Add-Point -X 0 -Y $y
    Add-Point -X ($width - 1) -Y $y
  }

  while ($queue.Count -gt 0) {
    $point = $queue.Dequeue()
    $source.SetPixel($point.X, $point.Y, [System.Drawing.Color]::FromArgb(0, 255, 255, 255))
    Add-Point -X ($point.X + 1) -Y $point.Y
    Add-Point -X ($point.X - 1) -Y $point.Y
    Add-Point -X $point.X -Y ($point.Y + 1)
    Add-Point -X $point.X -Y ($point.Y - 1)
  }

  $minX = $width
  $minY = $height
  $maxX = -1
  $maxY = -1

  for ($y = 0; $y -lt $height; $y += 1) {
    for ($x = 0; $x -lt $width; $x += 1) {
      if ($source.GetPixel($x, $y).A -gt 8) {
        if ($x -lt $minX) { $minX = $x }
        if ($x -gt $maxX) { $maxX = $x }
        if ($y -lt $minY) { $minY = $y }
        if ($y -gt $maxY) { $maxY = $y }
      }
    }
  }

  if ($maxX -lt $minX -or $maxY -lt $minY) {
    throw "No non-transparent character pixels were found after background removal."
  }

  $contentWidth = $maxX - $minX + 1
  $contentHeight = $maxY - $minY + 1
  $scale = [Math]::Min($MaxVisibleWidth / $contentWidth, $MaxVisibleHeight / $contentHeight)
  $drawWidth = [int][Math]::Round($contentWidth * $scale)
  $drawHeight = [int][Math]::Round($contentHeight * $scale)
  $drawX = [int][Math]::Round(($CanvasWidth - $drawWidth) / 2)
  $drawY = $FootY - $drawHeight

  if ($drawY -lt 0) {
    throw "Computed draw area starts above the canvas. Increase CanvasHeight or FootY, or reduce MaxVisibleHeight."
  }

  $target = [System.Drawing.Bitmap]::new(
    $CanvasWidth,
    $CanvasHeight,
    [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
  )

  try {
    $graphics = [System.Drawing.Graphics]::FromImage($target)
    try {
      $graphics.Clear([System.Drawing.Color]::Transparent)
      $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
      $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

      $sourceRect = [System.Drawing.Rectangle]::new($minX, $minY, $contentWidth, $contentHeight)
      $targetRect = [System.Drawing.Rectangle]::new($drawX, $drawY, $drawWidth, $drawHeight)
      $graphics.DrawImage($source, $targetRect, $sourceRect, [System.Drawing.GraphicsUnit]::Pixel)
    } finally {
      $graphics.Dispose()
    }

    if ($CleanInteriorBackground) {
      $cleanupStart = [Math]::Max(0, [Math]::Min($CanvasHeight - 1, $InteriorCleanupStartY))
      for ($y = $cleanupStart; $y -lt $CanvasHeight; $y += 1) {
        for ($x = 0; $x -lt $CanvasWidth; $x += 1) {
          $color = $target.GetPixel($x, $y)
          if (Test-BackgroundPixel -Color $color -Min $BackgroundMin -Variance $BackgroundVariance) {
            $target.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 255, 255, 255))
          }
        }
      }
    }

    $target.Save($resolvedOutput, [System.Drawing.Imaging.ImageFormat]::Png)
  } finally {
    $target.Dispose()
  }

  [pscustomobject]@{
    Output = $resolvedOutput
    SourceBounds = "x=$minX..$maxX y=$minY..$maxY"
    DrawSize = "${drawWidth}x${drawHeight}"
    Canvas = "${CanvasWidth}x${CanvasHeight}"
    FootY = $FootY
    CleanInteriorBackground = [bool]$CleanInteriorBackground
    InteriorCleanupStartY = if ($CleanInteriorBackground) { $InteriorCleanupStartY } else { $null }
  } | Format-List
} finally {
  $source.Dispose()
}
