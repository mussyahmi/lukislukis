'use client';

import { useRef, useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pencil, PaintBucket, Undo2, Trash2 } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

export interface Stroke {
  id: string;
  points: [number, number][];
  color: string;
  width: number;
  tool: 'pen' | 'fill';
  fillX?: number;
  fillY?: number;
}

interface CanvasProps {
  isDrawer: boolean;
  onStrokeComplete: (stroke: Stroke) => void;
  onClear: () => void;
  onUndo: () => void;
  strokes: Stroke[];
}

export function Canvas({ isDrawer, onStrokeComplete, onClear, onUndo, strokes }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<[number, number][]>([]);
  const [color, setColor] = useState('#000000');
  const [penSize, setPenSize] = useState(4);
  const [tool, setTool] = useState<'pen' | 'fill'>('pen');
  const [canvasReady, setCanvasReady] = useState(false);
  const [cursorStyle, setCursorStyle] = useState('');
  const [lastStrokeCount, setLastStrokeCount] = useState(0);

  // Fixed canvas dimensions - 4:3 aspect ratio (works well for all screens)
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 600;

  const colors = [
    '#000000', // Black
    '#FF0000', // Red
    '#FF8800', // Orange
    '#FFD700', // Gold
    '#00FF00', // Green
    '#00CED1', // Turquoise
    '#0000FF', // Blue
    '#8B00FF', // Purple
    '#FF69B4', // Pink
    '#FFFFFF', // White
  ];

  // Generate custom cursor based on tool and pen size
  useEffect(() => {
    if (!isDrawer) {
      setCursorStyle('not-allowed');
      return;
    }

    if (tool === 'fill') {
      // Paint bucket cursor with current color
      const size = 32;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        // Draw shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2 - 1, 0, 2 * Math.PI);
        ctx.fill();

        // Draw white background
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2 - 2, 0, 2 * Math.PI);
        ctx.fill();

        // Draw border
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw paint bucket icon (simplified version)
        const iconSize = 18;
        const offsetX = (size - iconSize) / 2;
        const offsetY = (size - iconSize) / 2;

        // Bucket body with current color
        ctx.fillStyle = color;
        ctx.fillRect(offsetX + 3, offsetY + 8, 12, 7);

        // Bucket outline
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(offsetX + 3, offsetY + 8, 12, 7);

        // Handle
        ctx.beginPath();
        ctx.arc(offsetX + 9, offsetY + 6, 4, Math.PI, 0, false);
        ctx.stroke();

        // Paint drip with current color
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(offsetX + 7, offsetY + 15);
        ctx.lineTo(offsetX + 9, offsetY + 21);
        ctx.lineTo(offsetX + 11, offsetY + 15);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        const url = canvas.toDataURL();
        setCursorStyle(`url(${url}) ${size / 2} ${size / 2}, auto`);
      }
    } else {
      // Pen cursor - circular dot matching pen size
      const size = penSize;
      const canvas = document.createElement('canvas');
      canvas.width = size + 4;
      canvas.height = size + 4;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        // Draw outer circle (border)
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2, size / 2 + 1, 0, 2 * Math.PI);
        ctx.fill();

        // Draw inner circle (white center)
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2, size / 2, 0, 2 * Math.PI);
        ctx.fill();

        // Draw center dot
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2, Math.max(1, size / 4), 0, 2 * Math.PI);
        ctx.fill();

        const url = canvas.toDataURL();
        setCursorStyle(`url(${url}) ${canvas.width / 2} ${canvas.height / 2}, crosshair`);
      }
    }
  }, [tool, penSize, color, isDrawer]);

  // Setup canvas with fixed dimensions
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;

    // Set fixed internal resolution
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    setCanvasReady(true);
  }, []);

  // Flood fill helper functions
  const hexToRgb = (hex: string): [number, number, number] => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
      : [0, 0, 0];
  };

  const getColorAtPixel = (
    data: Uint8ClampedArray,
    x: number,
    y: number,
    width: number
  ): [number, number, number] => {
    const index = (y * width + x) * 4;
    return [data[index], data[index + 1], data[index + 2]];
  };

  const setPixelColor = (
    data: Uint8ClampedArray,
    x: number,
    y: number,
    width: number,
    color: [number, number, number]
  ) => {
    const index = (y * width + x) * 4;
    data[index] = color[0];
    data[index + 1] = color[1];
    data[index + 2] = color[2];
    data[index + 3] = 255;
  };

  const colorsMatch = (
    a: [number, number, number],
    b: [number, number, number],
    tolerance = 10
  ): boolean => {
    return (
      Math.abs(a[0] - b[0]) <= tolerance &&
      Math.abs(a[1] - b[1]) <= tolerance &&
      Math.abs(a[2] - b[2]) <= tolerance
    );
  };

  // Optimized scanline flood fill algorithm
  const floodFill = (
    ctx: CanvasRenderingContext2D,
    startX: number,
    startY: number,
    fillColor: string
  ) => {
    const canvas = ctx.canvas;

    // Safety check: ensure canvas has valid dimensions
    if (canvas.width === 0 || canvas.height === 0) {
      console.warn('Canvas not ready for flood fill');
      return;
    }

    // Clamp coordinates to canvas bounds
    startX = Math.floor(Math.max(0, Math.min(startX, canvas.width - 1)));
    startY = Math.floor(Math.max(0, Math.min(startY, canvas.height - 1)));

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    const targetColor = getColorAtPixel(data, startX, startY, canvas.width);
    const fillRGB = hexToRgb(fillColor);

    // Don't fill if clicking on the same color
    if (colorsMatch(targetColor, fillRGB, 5)) {
      return;
    }

    // Use scanline flood fill algorithm (much faster)
    const width = canvas.width;
    const height = canvas.height;
    const pixelStack: [number, number][] = [[startX, startY]];
    const visited = new Uint8Array(width * height); // Use typed array for faster access

    while (pixelStack.length > 0) {
      const [x, y] = pixelStack.pop()!;

      // Skip if out of bounds or already visited
      if (x < 0 || x >= width || y < 0 || y >= height) continue;

      const pixelIndex = y * width + x;
      if (visited[pixelIndex]) continue;

      const currentColor = getColorAtPixel(data, x, y, width);
      if (!colorsMatch(currentColor, targetColor, 10)) continue;

      // Find the left and right extent of this scanline
      let left = x;
      let right = x;

      // Go left
      while (left > 0) {
        const leftColor = getColorAtPixel(data, left - 1, y, width);
        if (!colorsMatch(leftColor, targetColor, 10)) break;
        left--;
      }

      // Go right
      while (right < width - 1) {
        const rightColor = getColorAtPixel(data, right + 1, y, width);
        if (!colorsMatch(rightColor, targetColor, 10)) break;
        right++;
      }

      // Fill the scanline and mark as visited
      for (let i = left; i <= right; i++) {
        const idx = y * width + i;
        visited[idx] = 1;
        setPixelColor(data, i, y, width, fillRGB);

        // Check pixels above and below
        if (y > 0) {
          const aboveColor = getColorAtPixel(data, i, y - 1, width);
          const aboveIdx = (y - 1) * width + i;
          if (!visited[aboveIdx] && colorsMatch(aboveColor, targetColor, 10)) {
            pixelStack.push([i, y - 1]);
          }
        }
        if (y < height - 1) {
          const belowColor = getColorAtPixel(data, i, y + 1, width);
          const belowIdx = (y + 1) * width + i;
          if (!visited[belowIdx] && colorsMatch(belowColor, targetColor, 10)) {
            pixelStack.push([i, y + 1]);
          }
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
  };

  // Optimized incremental stroke replay
  useEffect(() => {
    if (!canvasRef.current || !canvasReady) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx || canvas.width === 0 || canvas.height === 0) return;

    // If strokes array is smaller, it was cleared - redraw everything
    if (strokes.length < lastStrokeCount) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      strokes.forEach((stroke) => {
        if (stroke.tool === 'fill' && stroke.fillX !== undefined && stroke.fillY !== undefined) {
          floodFill(ctx, stroke.fillX, stroke.fillY, stroke.color);
        } else {
          ctx.strokeStyle = stroke.color;
          ctx.lineWidth = stroke.width;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          ctx.beginPath();
          stroke.points.forEach((point, index) => {
            const [x, y] = point;
            if (index === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          });
          ctx.stroke();
        }
      });
      setLastStrokeCount(strokes.length);
    } else if (strokes.length > lastStrokeCount) {
      // Only render new strokes (incremental)
      const newStrokes = strokes.slice(lastStrokeCount);
      newStrokes.forEach((stroke) => {
        if (stroke.tool === 'fill' && stroke.fillX !== undefined && stroke.fillY !== undefined) {
          floodFill(ctx, stroke.fillX, stroke.fillY, stroke.color);
        } else {
          ctx.strokeStyle = stroke.color;
          ctx.lineWidth = stroke.width;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          ctx.beginPath();
          stroke.points.forEach((point, index) => {
            const [x, y] = point;
            if (index === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          });
          ctx.stroke();
        }
      });
      setLastStrokeCount(strokes.length);
    }
  }, [strokes, canvasReady, lastStrokeCount]);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent): [number, number] | null => {
    if (!canvasRef.current) return null;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    let clientX: number, clientY: number;

    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    // Convert screen coordinates to canvas coordinates
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    return [x, y];
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawer || !canvasReady) return;

    const coords = getCoordinates(e);
    if (!coords) return;

    const [x, y] = coords;

    if (tool === 'fill') {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!ctx || !canvas) return;

      // Safety check before flood fill
      if (canvas.width === 0 || canvas.height === 0) {
        console.warn('Canvas not ready');
        return;
      }

      floodFill(ctx, Math.floor(x), Math.floor(y), color);

      const fillStroke: Stroke = {
        id: `${Date.now()}-${Math.random()}`,
        points: [],
        color,
        width: penSize,
        tool: 'fill',
        fillX: Math.floor(x),
        fillY: Math.floor(y),
      };

      onStrokeComplete(fillStroke);
    } else {
      setIsDrawing(true);
      setCurrentStroke([[x, y]]);
    }
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !isDrawer || tool === 'fill' || !canvasReady) return;

    const coords = getCoordinates(e);
    if (!coords) return;

    const newStroke = [...currentStroke, coords];
    setCurrentStroke(newStroke);

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = color;
    ctx.lineWidth = penSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    const prevPoint = currentStroke[currentStroke.length - 1];
    ctx.moveTo(prevPoint[0], prevPoint[1]);
    ctx.lineTo(coords[0], coords[1]);
    ctx.stroke();
  };

  const handleEnd = () => {
    if (!isDrawing || tool === 'fill') return;

    setIsDrawing(false);

    if (currentStroke.length > 0) {
      const stroke: Stroke = {
        id: `${Date.now()}-${Math.random()}`,
        points: currentStroke,
        color,
        width: penSize,
        tool: 'pen',
      };

      onStrokeComplete(stroke);
    }

    setCurrentStroke([]);
  };

  return (
    <Card className="h-full flex flex-col shadow-sm border p-0">
      <CardContent className="flex-1 flex flex-col p-2 md:p-4 gap-2 min-h-0">
        {/* Canvas Area - Fixed aspect ratio container with visible border */}
        <div
          ref={containerRef}
          className="flex-1 bg-muted rounded-lg overflow-hidden relative min-h-0 flex items-center justify-center p-2 md:p-4"
        >
          <div className="relative w-full h-full flex items-center justify-center">
            <canvas
              ref={canvasRef}
              onMouseDown={handleStart}
              onMouseMove={handleMove}
              onMouseUp={handleEnd}
              onMouseLeave={handleEnd}
              onTouchStart={handleStart}
              onTouchMove={handleMove}
              onTouchEnd={handleEnd}
              className="max-w-full max-h-full touch-none bg-white rounded-lg shadow-2xl border-4 border-gray-300 dark:border-gray-600"
              style={{
                touchAction: 'none',
                cursor: cursorStyle,
                aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}`,
              }}
            />
            {!canvasReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Loading canvas...</p>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons, Color Palette, Pen Slider — drawer only */}
        {isDrawer && (
          <div className="flex flex-col gap-2 md:gap-3">
            <div className="grid grid-cols-4 gap-1 md:gap-2">
              <Button
                variant={tool === 'pen' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTool('pen')}
                className="h-8 md:h-10"
                aria-label="Pen tool"
              >
                <Pencil className="w-3 h-3 md:w-4 md:h-4" />
              </Button>
              <Button
                variant={tool === 'fill' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTool('fill')}
                className="h-8 md:h-10"
                aria-label="Fill tool"
              >
                <PaintBucket className="w-3 h-3 md:w-4 md:h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onUndo}
                disabled={strokes.length === 0}
                className="h-8 md:h-10"
                aria-label="Undo"
              >
                <Undo2 className="w-3 h-3 md:w-4 md:h-4" />
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={onClear}
                className="h-8 md:h-10"
                aria-label="Clear canvas"
              >
                <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
              </Button>
            </div>

            <div className="flex gap-1 md:gap-2 justify-center flex-wrap">
              {colors.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 md:w-8 md:h-8 rounded-full border-2 transition-all hover:scale-110 ${color === c
                    ? 'border-primary scale-110 ring-2 ring-primary ring-offset-2'
                    : 'border-gray-300'
                    } ${c === '#FFFFFF' ? 'ring-1 ring-gray-300' : ''}`}
                  style={{ backgroundColor: c }}
                  aria-label={`Select ${c} color`}
                />
              ))}
            </div>

            {tool === 'pen' && (
              <div className="space-y-1">
                <span className="text-xs md:text-sm font-medium">Saiz Pen: {penSize}px</span>
                <Slider
                  value={[penSize]}
                  onValueChange={(value) => setPenSize(value[0])}
                  min={2}
                  max={16}
                  step={2}
                  className="w-full"
                />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}